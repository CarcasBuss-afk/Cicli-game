/* Le azioni del docente nell'Officina: classi, compiti assegnati, correzioni. Il docente
 * è quello di TEACHER_EMAILS (lib/giro/docenteAuth.ts); le classi sono di tutti i
 * docenti autorizzati (ce n'è uno). La lettura in tempo reale la fa la dashboard con
 * onSnapshot; qui solo scritture. */
import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebaseAdmin';
import type { Docente } from '@/lib/giro/docenteAuth';
import { ApiError } from '@/lib/giro/http';
import { eProgetto } from '@/lib/giro/progetti';
import { ALFABETO_CODICE } from './regole';
import { allieviRef, appartenenzeRef, classiRef, type ClasseDoc, type CompitoDoc } from './store';

function codiceCasuale(): string {
  let s = '';
  for (let i = 0; i < 4; i++) s += ALFABETO_CODICE[Math.floor(Math.random() * ALFABETO_CODICE.length)];
  return s;
}

async function codiceLibero(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const codice = codiceCasuale();
    const snap = await classiRef().where('codice', '==', codice).get();
    if (snap.docs.every((d) => (d.data() as ClasseDoc).chiusa)) return codice;
  }
  throw new ApiError(500, 'INTERNAL', 'Non trovo un codice libero: riprova');
}

const testo = (v: unknown, max = 64) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function idClasse(body: Record<string, unknown>): string {
  const id = testo(body.classeId);
  if (!id) throw new ApiError(400, 'INVALID_BODY', 'Manca la classe');
  return id;
}

async function leggiClasse(tx: FirebaseFirestore.Transaction, classeId: string) {
  const ref = classiRef().doc(classeId);
  const snap = await tx.get(ref);
  const classe = snap.data() as ClasseDoc | undefined;
  if (!classe) throw new ApiError(404, 'CLASSE_NON_TROVATA', 'Classe inesistente');
  return { ref, classe };
}

/** Una data di scadenza dal client: ISO, oppure null/vuoto = senza scadenza. */
function validaScadenza(valore: unknown): Timestamp | null {
  if (valore === null || valore === undefined || valore === '') return null;
  const d = new Date(String(valore));
  if (Number.isNaN(d.getTime())) throw new ApiError(400, 'INVALID_BODY', 'Scadenza non valida');
  return Timestamp.fromDate(d);
}

export async function creaClasse(body: Record<string, unknown>, docente: Docente) {
  const nome = testo(body.nome, 40);
  if (!nome) throw new ApiError(400, 'INVALID_BODY', 'Manca il nome della classe');
  const codice = await codiceLibero();
  const ref = await classiRef().add({
    nome,
    codice,
    docenteUid: docente.uid,
    docenteEmail: docente.email,
    createdAt: FieldValue.serverTimestamp(),
    chiusa: false,
    compiti: [],
  });
  return { classeId: ref.id, codice };
}

export async function chiudiClasse(body: Record<string, unknown>) {
  await classiRef().doc(idClasse(body)).update({ chiusa: true });
  return { ok: true };
}

export async function assegnaCompito(body: Record<string, unknown>) {
  const progetto = body.progetto;
  if (!eProgetto(progetto)) throw new ApiError(400, 'INVALID_BODY', 'Compito sconosciuto');
  const scadenzaAt = validaScadenza(body.scadenza);
  const classeId = idClasse(body);
  const id = classiRef().doc().id;
  await getDb().runTransaction(async (tx) => {
    const { ref, classe } = await leggiClasse(tx, classeId);
    if (classe.chiusa) throw new ApiError(409, 'CLASSE_CHIUSA', 'La classe è chiusa');
    const compito: CompitoDoc = { id, progetto, assegnatoAt: Timestamp.now(), scadenzaAt, ritirato: false };
    tx.update(ref, { compiti: [...classe.compiti, compito] });
  });
  return { compitoId: id };
}

/** Cambia un compito assegnato: la scadenza, oppure lo ritira. */
export async function modificaCompito(body: Record<string, unknown>) {
  const classeId = idClasse(body);
  const compitoId = testo(body.compitoId);
  await getDb().runTransaction(async (tx) => {
    const { ref, classe } = await leggiClasse(tx, classeId);
    const i = classe.compiti.findIndex((c) => c.id === compitoId);
    if (i < 0) throw new ApiError(404, 'COMPITO_NON_TROVATO', 'Compito inesistente');
    const compiti = [...classe.compiti];
    if (body.ritira === true) compiti[i] = { ...compiti[i], ritirato: true };
    else if ('scadenza' in body) compiti[i] = { ...compiti[i], scadenzaAt: validaScadenza(body.scadenza) };
    else throw new ApiError(400, 'INVALID_BODY', 'Niente da cambiare');
    tx.update(ref, { compiti });
  });
  return { ok: true };
}

/** Il voto scritto a mano dal docente su un lavoro (null = torna a quello calcolato). */
export async function correggiVoto(body: Record<string, unknown>) {
  const classeId = idClasse(body);
  const compitoId = testo(body.compitoId);
  const uid = testo(body.uid, 128);
  if (!compitoId || !uid) throw new ApiError(400, 'INVALID_BODY', 'Mancano compito o allievo');
  const voto = body.voto === null || body.voto === '' ? null : Number(body.voto);
  if (voto !== null && (!Number.isInteger(voto) || voto < 1 || voto > 10)) {
    throw new ApiError(400, 'INVALID_BODY', 'Il voto è un intero da 1 a 10, oppure vuoto');
  }
  await allieviRef(classeId).doc(uid).set({ lavori: { [compitoId]: { votoDocente: voto } } }, { merge: true });
  return { ok: true };
}

export async function rimuoviAllievo(body: Record<string, unknown>) {
  const classeId = idClasse(body);
  const uid = testo(body.uid, 128);
  if (!uid) throw new ApiError(400, 'INVALID_BODY', 'Manca l\'allievo');
  const batch = getDb().batch();
  batch.delete(allieviRef(classeId).doc(uid));
  batch.set(appartenenzeRef().doc(uid), { classi: FieldValue.arrayRemove(classeId) }, { merge: true });
  await batch.commit();
  return { ok: true };
}
