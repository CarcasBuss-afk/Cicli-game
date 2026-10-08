/* Modello dati Firestore del Giro dei Cicli (vedi CLAUDE.md) e accesso a sessioni e
 * allievi. Le collezioni hanno il prefisso `giro`: il progetto Firebase è condiviso con
 * l'escape room, che usa `escapeSessions`. */
import 'server-only';
import type { DocumentReference, Timestamp, Transaction } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebaseAdmin';
import { ApiError } from './http';
import type { Tappa } from './tappe';
import { tokenValido } from './token';

export type StatoSessione = 'waiting' | 'running' | 'closed';

export type SessioneDoc = {
  code: string;
  classLabel: string;
  status: StatoSessione;
  createdAt: Timestamp;
  startedAt: Timestamp | null;
  endedAt: Timestamp | null;
  numTappe: number;
  /** Il percorso, uguale per tutti gli allievi della sessione. Resta sul server. */
  tappe: Tappa[];
  /** Quanti allievi hanno già tagliato il traguardo: dà l'ordine d'arrivo. */
  arrivati: number;
  /** Seme usato per generare il percorso: serve a rigenerarlo identico se serve. */
  seme: number;
};

export type AllievoDoc = {
  name: string;
  /** Nome normalizzato per riconoscere i doppioni nella sessione. */
  nameKey: string;
  tokenHash: string;
  createdAt: Timestamp;
  /** Indice (0-based) della tappa da fare adesso; == numTappe significa arrivato. */
  tappaCorrente: number;
  /** Tappe completate: chiave = indice della tappa. */
  tappe: Record<string, { completedAt: Timestamp; errori: number }>;
  erroriTotali: number;
  finishedAt: Timestamp | null;
  /** Posizione d'arrivo assegnata dal server, null se non è ancora arrivato. */
  ordineArrivo: number | null;
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

/** Carica sessione e allievo da {playerId, token} verificando il token; dentro la
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

/** Sessione attiva (waiting o running) con quel codice, oppure null. */
export async function trovaSessioneAttiva(code: string): Promise<{ id: string; data: SessioneDoc } | null> {
  const snap = await sessioniRef().where('code', '==', code).limit(10).get();
  const attiva = snap.docs.find((d) => ['waiting', 'running'].includes((d.data() as SessioneDoc).status));
  return attiva ? { id: attiva.id, data: attiva.data() as SessioneDoc } : null;
}
