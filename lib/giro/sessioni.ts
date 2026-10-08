/* Ciclo di vita di un Giro: creazione, apertura e chiusura delle tappe, punti, classifica
 * generale, chiusura del Giro. Le azioni del docente passano da qui. */
import 'server-only';
import { FieldValue, Timestamp, type DocumentReference, type Transaction } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebaseAdmin';
import { KM_MISTO_DEFAULT, KM_MISTO_MAX, KM_MISTO_MIN } from './esercizi';
import {
  classificaGenerale,
  classificaTappa,
  eTema,
  generaTappa,
  infoTema,
  KM_PER_TAPPA,
  type Tema,
} from './giro';
import { ApiError } from './http';
import {
  allieviRef,
  ms,
  sessioniRef,
  trovaSessioneAttiva,
  type AllievoDoc,
  type RigaGeneraleDoc,
  type SessioneDoc,
  type TappaDoc,
} from './store';

/** Caratteri del codice: senza 0/O/1/I, che alla LIM si confondono. */
const ALFABETO = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const LUNGHEZZA_CODICE = 4;
const TENTATIVI_CODICE = 20;

export const CLASSE_MAX = 20;
export const DURATA_MIN_MINUTI = 1;
export const DURATA_MAX_MINUTI = 120;
export const TAPPE_MAX = 30;

function codiceCasuale(): string {
  let out = '';
  for (let i = 0; i < LUNGHEZZA_CODICE; i++) out += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  return out;
}

/** Codice breve non usato da nessuna gara attiva. */
async function codiceLibero(): Promise<string> {
  for (let i = 0; i < TENTATIVI_CODICE; i++) {
    const code = codiceCasuale();
    if (!(await trovaSessioneAttiva(code))) return code;
  }
  throw new ApiError(500, 'INTERNAL', 'Non riesco a generare un codice: riprova');
}

const semeCasuale = () => Math.floor(Math.random() * 2 ** 31);

/** Firestore rifiuta i campi `undefined`: gli esercizi hanno campi opzionali. */
function senzaUndefined<T extends object>(oggetto: T): T {
  return Object.fromEntries(Object.entries(oggetto).filter(([, v]) => v !== undefined)) as T;
}

/* ---------------------------------------------------------------------- validazioni */

export function validaClasse(valore: unknown): string {
  const classe = typeof valore === 'string' ? valore.replace(/\s+/g, ' ').trim() : '';
  if (!classe) throw new ApiError(400, 'INVALID_BODY', 'Manca la classe');
  if (classe.length > CLASSE_MAX) {
    throw new ApiError(400, 'INVALID_BODY', `Nome della classe troppo lungo (massimo ${CLASSE_MAX} caratteri)`);
  }
  return classe;
}

export function validaKmMisto(valore: unknown): number {
  const n = typeof valore === 'number' ? valore : Number(valore);
  if (!Number.isFinite(n)) return KM_MISTO_DEFAULT;
  const arrotondato = Math.round(n);
  if (arrotondato < KM_MISTO_MIN || arrotondato > KM_MISTO_MAX) {
    throw new ApiError(400, 'INVALID_BODY', `Gli esercizi devono essere fra ${KM_MISTO_MIN} e ${KM_MISTO_MAX}`);
  }
  return arrotondato;
}

function validaTemi(valore: unknown): Tema[] {
  if (!Array.isArray(valore) || valore.length === 0) {
    throw new ApiError(400, 'INVALID_BODY', 'Scegli almeno una tappa per il Giro');
  }
  if (valore.length > TAPPE_MAX) throw new ApiError(400, 'INVALID_BODY', `Al massimo ${TAPPE_MAX} tappe`);
  for (const t of valore) {
    if (!eTema(t) || t === 'misto') throw new ApiError(400, 'INVALID_BODY', `Tappa sconosciuta: ${String(t)}`);
  }
  return valore as Tema[];
}

export function validaMigliori(valore: unknown): number | null {
  if (valore === null || valore === undefined || valore === '' || valore === 0) return null;
  const n = typeof valore === 'number' ? valore : Number(valore);
  if (!Number.isInteger(n) || n < 1 || n > TAPPE_MAX) {
    throw new ApiError(400, 'INVALID_BODY', 'Il numero di tappe migliori deve essere un intero positivo');
  }
  return n;
}

/** Durata in secondi dai minuti chiesti dal docente; null = senza limite. */
function validaDurata(minuti: unknown, predefinita: number | null): number | null {
  if (minuti === undefined) return predefinita;
  if (minuti === null || minuti === 0 || minuti === '') return null;
  const n = typeof minuti === 'number' ? minuti : Number(minuti);
  if (!Number.isFinite(n) || n < DURATA_MIN_MINUTI || n > DURATA_MAX_MINUTI) {
    throw new ApiError(
      400,
      'INVALID_BODY',
      `La durata deve stare fra ${DURATA_MIN_MINUTI} e ${DURATA_MAX_MINUTI} minuti (oppure senza limite)`,
    );
  }
  return Math.round(n * 60);
}

/* ------------------------------------------------------------------------ creazione */

function tappaDaCorrere(tema: Tema, km: number, durataSec: number | null): TappaDoc {
  return {
    tema,
    km,
    stato: 'da-correre',
    durataSec,
    apertaAt: null,
    scadenzaAt: null,
    chiusaAt: null,
    esercizi: [],
    seme: 0,
  };
}

export type OpzioniGiro = { tipo: 'giro'; temi: unknown; migliori?: unknown } | { tipo: 'singola'; km?: unknown };

/**
 * Crea un Giro in attesa. Due forme:
 * - **giro**: le tappe tematiche scelte dal docente, nell'ordine dato (se ne possono
 *   aggiungere altre dopo, settimana per settimana);
 * - **singola**: una tappa sola, mista, senza limite di tempo: la gara di sempre.
 * Gli esercizi si generano all'apertura di ciascuna tappa, non adesso.
 */
export async function creaGiro(
  classLabel: unknown,
  opzioni: OpzioniGiro,
): Promise<{ id: string; code: string; numTappe: number }> {
  const classe = validaClasse(classLabel);
  const tappe =
    opzioni.tipo === 'singola'
      ? [tappaDaCorrere('misto', validaKmMisto(opzioni.km), null)]
      : validaTemi(opzioni.temi).map((t) => tappaDaCorrere(t, KM_PER_TAPPA, infoTema(t).durataMinuti * 60));
  const migliori = opzioni.tipo === 'giro' ? validaMigliori(opzioni.migliori) : null;
  const code = await codiceLibero();

  const ref = sessioniRef().doc();
  await ref.set({
    code,
    classLabel: classe,
    status: 'waiting',
    createdAt: FieldValue.serverTimestamp(),
    startedAt: null,
    endedAt: null,
    prossimoNumero: 1,
    migliori,
    tappe,
    tappaAperta: null,
    arrivati: {},
    generale: [],
  });
  return { id: ref.id, code, numTappe: tappe.length };
}

/* ------------------------------------------------------------- lettura in transazione */

type AllievoLetto = { id: string; ref: DocumentReference; dati: AllievoDoc };

async function leggiGiro(tx: Transaction, sessionId: string) {
  const ref = sessioniRef().doc(sessionId);
  const snap = await tx.get(ref);
  const sessione = snap.data() as SessioneDoc | undefined;
  if (!sessione) throw new ApiError(404, 'SESSION_NOT_FOUND', 'Gara inesistente');
  return { ref, sessione };
}

async function leggiAllievi(tx: Transaction, sessionId: string): Promise<AllievoLetto[]> {
  const snap = await tx.get(allieviRef(sessionId));
  return snap.docs.map((d) => ({ id: d.id, ref: d.ref, dati: d.data() as AllievoDoc }));
}

export function indiceTappa(valore: unknown, sessione: SessioneDoc): number {
  const n =
    typeof valore === 'number' ? valore : typeof valore === 'string' && valore.trim() ? Number(valore) : Number.NaN;
  if (!Number.isInteger(n) || n < 0 || n >= sessione.tappe.length) {
    throw new ApiError(400, 'INVALID_TAPPA', 'Tappa inesistente');
  }
  return n;
}

/* ------------------------------------------------------------ punti alla chiusura */

/** Classifica generale dai punti salvati, con in più quelli appena calcolati per una tappa. */
function calcolaGenerale(
  migliori: number | null,
  allievi: AllievoLetto[],
  appena?: { indice: number; punti: Map<string, number> },
): RigaGeneraleDoc[] {
  const righe = classificaGenerale(
    allievi.map((a) => {
      const punti: Record<string, number> = {};
      for (const [t, p] of Object.entries(a.dati.tappe ?? {})) {
        if (typeof p.punti === 'number') punti[t] = p.punti;
      }
      if (appena && a.dati.tappe?.[String(appena.indice)]) {
        punti[String(appena.indice)] = appena.punti.get(a.id) ?? 0;
      }
      return { id: a.id, name: a.dati.name, numero: a.dati.numero ?? null, punti };
    }),
    migliori,
  );
  return righe.map((r) => ({
    id: r.id,
    name: r.name,
    numero: r.numero,
    punti: r.punti,
    tappeContate: r.tappeContate,
    posizione: r.posizione,
  }));
}

/**
 * Fissa posizioni e punti di una tappa sui documenti degli allievi e restituisce la
 * generale aggiornata. Va chiamata dentro una transazione che ha già letto la gara e
 * tutti gli allievi: in Firestore le scritture vengono dopo tutte le letture.
 */
function fissaPunti(tx: Transaction, sessione: SessioneDoc, indice: number, allievi: AllievoLetto[]): RigaGeneraleDoc[] {
  const righe = classificaTappa(
    allievi.map((a) => {
      const p = a.dati.tappe?.[String(indice)];
      return {
        id: a.id,
        name: a.dati.name,
        numero: a.dati.numero ?? null,
        progresso: p ? { km: p.km ?? 0, ultimoAt: ms(p.ultimoAt), errori: p.errori ?? 0 } : null,
      };
    }),
  );
  const perId = new Map(righe.map((r) => [r.id, r]));

  // Ricevono posizione e punti solo quelli che hanno corso questa tappa: l'assente non
  // ha la voce, ed è proprio questo che le "migliori N tappe" compensano.
  for (const a of allievi) {
    if (!a.dati.tappe?.[String(indice)]) continue;
    const riga = perId.get(a.id)!;
    tx.update(a.ref, {
      [`tappe.${indice}.posizione`]: riga.posizione,
      [`tappe.${indice}.punti`]: riga.punti,
    });
  }
  return calcolaGenerale(sessione.migliori, allievi, {
    indice,
    punti: new Map(righe.map((r) => [r.id, r.punti])),
  });
}

/* ------------------------------------------------------------- apertura e chiusura */

/**
 * Apre una tappa: genera i suoi esercizi (uguali per tutti) e fa partire il cronometro.
 * Se un'altra tappa era ancora aperta la chiude prima, fissandone i punti: aperta ce ne
 * può essere una sola. La prima apertura è il "via" del Giro.
 */
export async function apriTappa(sessionId: string, indiceGrezzo: unknown, minuti?: unknown): Promise<void> {
  await getDb().runTransaction(async (tx) => {
    const { ref, sessione } = await leggiGiro(tx, sessionId);
    if (sessione.status === 'closed') throw new ApiError(409, 'SESSION_CLOSED', 'Il Giro è chiuso');
    const indice = indiceTappa(indiceGrezzo, sessione);
    const tappa = sessione.tappe[indice];
    if (tappa.stato === 'in-corso') return;
    if (tappa.stato === 'chiusa') throw new ApiError(409, 'TAPPA_CHIUSA', 'Questa tappa è già stata corsa');
    const durataSec = validaDurata(minuti, tappa.durataSec);
    const allievi = await leggiAllievi(tx, sessionId);

    const tappe = [...sessione.tappe];
    let generale = sessione.generale ?? [];
    const precedente = sessione.tappaAperta;
    if (precedente !== null && precedente !== undefined && tappe[precedente]?.stato === 'in-corso') {
      generale = fissaPunti(tx, sessione, precedente, allievi);
      tappe[precedente] = { ...tappe[precedente], stato: 'chiusa', chiusaAt: Timestamp.now() };
    }

    const seme = semeCasuale();
    const ora = Timestamp.now();
    tappe[indice] = {
      ...tappa,
      stato: 'in-corso',
      durataSec,
      apertaAt: ora,
      scadenzaAt: durataSec === null ? null : Timestamp.fromMillis(ora.toMillis() + durataSec * 1000),
      chiusaAt: null,
      seme,
      esercizi: generaTappa(tappa.tema, seme, tappa.km).map((e) => senzaUndefined(e)),
    };

    tx.update(ref, {
      tappe,
      tappaAperta: indice,
      generale,
      status: 'running',
      ...(sessione.startedAt ? {} : { startedAt: ora }),
    });
  });
}

/** Chiude la tappa in corso (anche prima del tempo) e fissa i punti. */
export async function chiudiTappa(sessionId: string, indiceGrezzo: unknown): Promise<void> {
  await getDb().runTransaction(async (tx) => {
    const { ref, sessione } = await leggiGiro(tx, sessionId);
    const indice = indiceTappa(indiceGrezzo, sessione);
    const tappa = sessione.tappe[indice];
    if (tappa.stato !== 'in-corso') return;
    const allievi = await leggiAllievi(tx, sessionId);
    const generale = fissaPunti(tx, sessione, indice, allievi);
    const tappe = [...sessione.tappe];
    tappe[indice] = { ...tappa, stato: 'chiusa', chiusaAt: Timestamp.now() };
    tx.update(ref, { tappe, tappaAperta: null, generale });
  });
}

/** Aggiunge una tappa in fondo al Giro: il programma va avanti e il Giro con lui. */
export async function aggiungiTappa(sessionId: string, tema: unknown): Promise<void> {
  if (!eTema(tema) || tema === 'misto') throw new ApiError(400, 'INVALID_BODY', 'Tappa sconosciuta');
  await getDb().runTransaction(async (tx) => {
    const { ref, sessione } = await leggiGiro(tx, sessionId);
    if (sessione.status === 'closed') throw new ApiError(409, 'SESSION_CLOSED', 'Il Giro è chiuso');
    if (sessione.tappe.length >= TAPPE_MAX) throw new ApiError(400, 'INVALID_BODY', `Al massimo ${TAPPE_MAX} tappe`);
    tx.update(ref, {
      tappe: [...sessione.tappe, tappaDaCorrere(tema, KM_PER_TAPPA, infoTema(tema).durataMinuti * 60)],
    });
  });
}

/** Cambia N (le migliori tappe che contano nella generale) e ricalcola la classifica. */
export async function impostaMigliori(sessionId: string, valore: unknown): Promise<void> {
  const migliori = validaMigliori(valore);
  await getDb().runTransaction(async (tx) => {
    const { ref } = await leggiGiro(tx, sessionId);
    const allievi = await leggiAllievi(tx, sessionId);
    tx.update(ref, { migliori, generale: calcolaGenerale(migliori, allievi) });
  });
}

/**
 * Ricalcola posizioni e punti di una tappa già chiusa (dopo una correzione del docente)
 * e la generale. Su una tappa ancora aperta ricalcola solo la generale.
 */
export async function ricalcola(sessionId: string, indice: number | null): Promise<void> {
  await getDb().runTransaction(async (tx) => {
    const { ref, sessione } = await leggiGiro(tx, sessionId);
    const allievi = await leggiAllievi(tx, sessionId);
    const generale =
      indice !== null && sessione.tappe[indice]?.stato === 'chiusa'
        ? fissaPunti(tx, sessione, indice, allievi)
        : calcolaGenerale(sessione.migliori, allievi);
    tx.update(ref, { generale });
  });
}

/** Chiude il Giro: se c'è una tappa aperta la chiude, poi nessuno entra né consegna più. */
export async function chiudiGiro(sessionId: string): Promise<void> {
  await getDb().runTransaction(async (tx) => {
    const { ref, sessione } = await leggiGiro(tx, sessionId);
    if (sessione.status === 'closed') return;
    const tappe = [...sessione.tappe];
    let generale = sessione.generale ?? [];
    const aperta = sessione.tappaAperta;
    if (aperta !== null && aperta !== undefined && tappe[aperta]?.stato === 'in-corso') {
      const allievi = await leggiAllievi(tx, sessionId);
      generale = fissaPunti(tx, sessione, aperta, allievi);
      tappe[aperta] = { ...tappe[aperta], stato: 'chiusa', chiusaAt: Timestamp.now() };
    }
    tx.update(ref, { tappe, tappaAperta: null, generale, status: 'closed', endedAt: FieldValue.serverTimestamp() });
  });
}
