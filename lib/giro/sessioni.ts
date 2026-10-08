/* Ciclo di vita di una sessione di gara: creazione (con generazione del percorso),
 * via e chiusura. Le azioni del docente (Task 6) passano da qui. */
import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { ApiError } from './http';
import { sessioniRef, trovaSessioneAttiva, type SessioneDoc, type StatoSessione } from './store';
import { generaPercorso, NUM_TAPPE_DEFAULT, NUM_TAPPE_MAX, NUM_TAPPE_MIN, type Tappa } from './tappe';

/** Caratteri del codice: senza 0/O/1/I, che alla LIM si confondono. */
const ALFABETO = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const LUNGHEZZA_CODICE = 4;
const TENTATIVI_CODICE = 20;

export const CLASSE_MAX = 20;

function codiceCasuale(): string {
  let out = '';
  for (let i = 0; i < LUNGHEZZA_CODICE; i++) {
    out += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  }
  return out;
}

/** Codice breve non usato da nessuna sessione attiva. */
async function codiceLibero(): Promise<string> {
  for (let i = 0; i < TENTATIVI_CODICE; i++) {
    const code = codiceCasuale();
    if (!(await trovaSessioneAttiva(code))) return code;
  }
  throw new ApiError(500, 'INTERNAL', 'Non riesco a generare un codice sessione: riprova');
}

/** Firestore rifiuta i campi `undefined`: le tappe hanno campi opzionali. */
function senzaUndefined(tappa: Tappa): Record<string, unknown> {
  return Object.fromEntries(Object.entries(tappa).filter(([, v]) => v !== undefined));
}

export function validaNumTappe(valore: unknown): number {
  const n = typeof valore === 'number' ? valore : Number(valore);
  if (!Number.isFinite(n)) return NUM_TAPPE_DEFAULT;
  const arrotondato = Math.round(n);
  if (arrotondato < NUM_TAPPE_MIN || arrotondato > NUM_TAPPE_MAX) {
    throw new ApiError(400, 'INVALID_BODY', `Il numero di tappe deve stare fra ${NUM_TAPPE_MIN} e ${NUM_TAPPE_MAX}`);
  }
  return arrotondato;
}

export function validaClasse(valore: unknown): string {
  const classe = typeof valore === 'string' ? valore.replace(/\s+/g, ' ').trim() : '';
  if (!classe) throw new ApiError(400, 'INVALID_BODY', 'Manca la classe');
  if (classe.length > CLASSE_MAX) {
    throw new ApiError(400, 'INVALID_BODY', `Nome della classe troppo lungo (massimo ${CLASSE_MAX} caratteri)`);
  }
  return classe;
}

/** Crea una sessione in attesa del via, generando il percorso di gara. */
export async function creaSessione(
  classLabel: unknown,
  numTappe: unknown = NUM_TAPPE_DEFAULT,
): Promise<{ id: string; code: string; numTappe: number }> {
  const classe = validaClasse(classLabel);
  const quante = validaNumTappe(numTappe);
  const code = await codiceLibero();
  const seme = Math.floor(Math.random() * 2 ** 31);
  const percorso = generaPercorso(quante, seme);

  const ref = sessioniRef().doc();
  await ref.set({
    code,
    classLabel: classe,
    status: 'waiting' satisfies StatoSessione,
    createdAt: FieldValue.serverTimestamp(),
    startedAt: null,
    endedAt: null,
    numTappe: percorso.length,
    tappe: percorso.map(senzaUndefined),
    arrivati: 0,
    seme,
  });
  return { id: ref.id, code, numTappe: percorso.length };
}

/** Dà il via: la gara passa da `waiting` a `running`. */
export async function avviaSessione(sessionId: string): Promise<void> {
  const ref = sessioniRef().doc(sessionId);
  const snap = await ref.get();
  const sessione = snap.data() as SessioneDoc | undefined;
  if (!sessione) throw new ApiError(404, 'SESSION_NOT_FOUND', 'Sessione inesistente');
  if (sessione.status === 'closed') throw new ApiError(409, 'SESSION_CLOSED', 'La sessione è già chiusa');
  if (sessione.status === 'running') return;
  await ref.update({ status: 'running', startedAt: FieldValue.serverTimestamp() });
}

/** Chiude la gara: nessuno può più entrare né consegnare. */
export async function chiudiSessione(sessionId: string): Promise<void> {
  const ref = sessioniRef().doc(sessionId);
  const snap = await ref.get();
  const sessione = snap.data() as SessioneDoc | undefined;
  if (!sessione) throw new ApiError(404, 'SESSION_NOT_FOUND', 'Sessione inesistente');
  if (sessione.status === 'closed') return;
  await ref.update({ status: 'closed', endedAt: FieldValue.serverTimestamp() });
}
