/* Modello dati Firestore del Giro dei Cicli (vedi CLAUDE.md) e accesso a gare e allievi.
 * Le collezioni hanno il prefisso `giro`: il progetto Firebase è condiviso con l'escape
 * room, che usa `escapeSessions`.
 *
 * Un documento `giroSessions/{id}` è un **Giro**: una successione di tappe che si aprono e
 * si chiudono una alla volta, anche a settimane di distanza. Una gara singola è un Giro di
 * una tappa sola, con il tema "misto". */
import 'server-only';
import type { DocumentReference, Timestamp, Transaction } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebaseAdmin';
import { ApiError } from './http';
import type { Esercizio } from './esercizi';
import type { Tema } from './giro';
import { tokenValido } from './token';

/** waiting: creato, nessuna tappa ancora aperta · running: il Giro è in corso · closed: finito. */
export type StatoSessione = 'waiting' | 'running' | 'closed';

export type StatoTappa = 'da-correre' | 'in-corso' | 'chiusa';

/** Una tappa del Giro: una gara breve su un argomento solo. */
export type TappaDoc = {
  tema: Tema;
  /** Chilometri, cioè esercizi: 5 per le tappe tematiche, a scelta per la gara mista. */
  km: number;
  stato: StatoTappa;
  /** Durata in secondi; null = senza limite di tempo (la gara mista di sempre). */
  durataSec: number | null;
  apertaAt: Timestamp | null;
  /** Oltre questo istante non si consegna più. null = senza limite. */
  scadenzaAt: Timestamp | null;
  chiusaAt: Timestamp | null;
  /** Generati all'apertura, uguali per tutti. Prima dell'apertura la lista è vuota. */
  esercizi: Esercizio[];
  seme: number;
};

/** Una riga della classifica generale, fotografata alla chiusura di ogni tappa. */
export type RigaGeneraleDoc = {
  id: string;
  name: string;
  numero: number | null;
  punti: number;
  tappeContate: number;
  posizione: number;
};

export type SessioneDoc = {
  code: string;
  classLabel: string;
  status: StatoSessione;
  createdAt: Timestamp;
  startedAt: Timestamp | null;
  endedAt: Timestamp | null;
  /** Prossimo numero di corsa da assegnare a chi si iscrive. Parte da 1. */
  prossimoNumero: number;
  /** Nella generale contano le migliori N tappe di ciascuno; null = tutte. */
  migliori: number | null;
  tappe: TappaDoc[];
  /** Indice della tappa in corso, oppure null fra una tappa e l'altra. */
  tappaAperta: number | null;
  /** Quanti hanno finito tutti i chilometri, per tappa: dà l'ordine d'arrivo sul momento. */
  arrivati: Record<string, number>;
  /**
   * Classifica generale calcolata dal server alla chiusura di ogni tappa (e quando il
   * docente cambia N). Serve alla pagina dell'allievo: leggere tutti gli allievi a ogni
   * richiesta di stato costerebbe una lettura per allievo, ogni dieci secondi.
   */
  generale: RigaGeneraleDoc[];
};

/** Come è andato un allievo in una tappa. */
export type ProgressoDoc = {
  /** Chilometri completati. */
  km: number;
  /** Istante di completamento di ciascun chilometro (chiave = indice 0-based). */
  kmAt: Record<string, Timestamp>;
  /** Errori per chilometro: alimentano il riepilogo "Da rispiegare". */
  erroriKm: Record<string, number>;
  errori: number;
  ultimoAt: Timestamp | null;
  /** Ordine con cui ha finito tutti i chilometri (1 = primo ad arrivare); assente se non ha finito. */
  ordineArrivo?: number;
  /** Fissati alla chiusura della tappa. */
  posizione?: number;
  punti?: number;
};

export type AllievoDoc = {
  name: string;
  /** Nome normalizzato per riconoscere i doppioni nella gara. */
  nameKey: string;
  /**
   * Numero di corsa, come il dorsale dei ciclisti: assegnato all'iscrizione e unico
   * nella gara. Serve a rientrare da un altro PC, dove il browser non ha memoria.
   */
  numero: number;
  tokenHash: string;
  createdAt: Timestamp;
  /** Progressi per tappa (chiave = indice della tappa). Manca se non ha mai consegnato. */
  tappe: Record<string, ProgressoDoc>;
  erroriTotali: number;
};

export const SESSIONI = 'giroSessions';
export const ALLIEVI = 'players';

export const sessioniRef = () => getDb().collection(SESSIONI);
export const allieviRef = (sessionId: string) => sessioniRef().doc(sessionId).collection(ALLIEVI);

/** playerId pubblico = "<sessionId>.<allievoDocId>": ogni chiamata ritrova l'allievo
 *  con una lettura diretta, senza query né indici. */
export function componiPlayerId(sessionId: string, allievoDocId: string): string {
  return `${sessionId}.${allievoDocId}`;
}

export function scomponiPlayerId(playerId: unknown): { sessionId: string; allievoDocId: string } | null {
  if (typeof playerId !== 'string') return null;
  const m = playerId.match(/^([A-Za-z0-9_-]{1,64})\.([A-Za-z0-9_-]{1,64})$/);
  return m ? { sessionId: m[1], allievoDocId: m[2] } : null;
}

export type Contesto = {
  sessionId: string;
  allievoDocId: string;
  sessioneRef: DocumentReference;
  allievoRef: DocumentReference;
  sessione: SessioneDoc;
  allievo: AllievoDoc;
};

/** Carica gara e allievo da {playerId, token} verificando il token; dentro la
 *  transazione se fornita. */
export async function caricaContesto(body: Record<string, unknown>, tx?: Transaction): Promise<Contesto> {
  const ids = scomponiPlayerId(body.playerId);
  if (!ids) throw new ApiError(401, 'UNAUTHORIZED', 'Non ti riconosco: rientra dalla pagina iniziale');
  const sessioneRef = sessioniRef().doc(ids.sessionId);
  const allievoRef = sessioneRef.collection(ALLIEVI).doc(ids.allievoDocId);
  const [s, a] = tx ? await tx.getAll(sessioneRef, allievoRef) : await getDb().getAll(sessioneRef, allievoRef);
  const sessione = s.data() as SessioneDoc | undefined;
  const allievo = a.data() as AllievoDoc | undefined;
  if (!sessione || !allievo || !tokenValido(body.token, allievo.tokenHash)) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Non ti riconosco: rientra dalla pagina iniziale');
  }
  return { ...ids, sessioneRef, allievoRef, sessione, allievo };
}

/** Gara attiva (waiting o running) con quel codice, oppure null. */
export async function trovaSessioneAttiva(code: string): Promise<{ id: string; data: SessioneDoc } | null> {
  const snap = await sessioniRef().where('code', '==', code).limit(10).get();
  const attiva = snap.docs.find((d) => ['waiting', 'running'].includes((d.data() as SessioneDoc).status));
  return attiva ? { id: attiva.id, data: attiva.data() as SessioneDoc } : null;
}

/** Millisecondi da un Timestamp Firestore (o null). */
export const ms = (t: Timestamp | null | undefined): number | null => (t ? t.toMillis() : null);

/** La tappa è scaduta? (Senza limite di tempo non scade mai.) */
export function scaduta(tappa: TappaDoc, ora = Date.now()): boolean {
  const fine = ms(tappa.scadenzaAt);
  return fine !== null && ora >= fine;
}
