/* Le azioni del docente nell'Officina: creare le classi, aprirle e chiuderle, togliere un
 * allievo. Tutto il resto è monitoraggio, e lo fa la dashboard con onSnapshot. Il docente
 * è quello di TEACHER_EMAILS (lib/giro/docenteAuth.ts).
 *
 * Aprire e chiudere è un interruttore, non una fine: il docente chiude l'Officina a fine
 * lezione (così da casa nessuno si fa fare i compiti dal tutor) e la riapre la volta dopo.
 * A classe chiusa gli allievi vedono tutto ma non consegnano e non chiedono. */
import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebaseAdmin';
import type { Docente } from '@/lib/giro/docenteAuth';
import { ApiError } from '@/lib/giro/http';
import { allieviRef, appartenenzeRef, classiRef } from './store';

const testo = (v: unknown, max = 64) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function idClasse(body: Record<string, unknown>): string {
  const id = testo(body.classeId);
  if (!id) throw new ApiError(400, 'INVALID_BODY', 'Manca la classe');
  return id;
}

export async function creaClasse(body: Record<string, unknown>, docente: Docente) {
  const nome = testo(body.nome, 40);
  if (!nome) throw new ApiError(400, 'INVALID_BODY', 'Manca il nome della classe');
  const ref = await classiRef().add({
    nome,
    docenteUid: docente.uid,
    docenteEmail: docente.email,
    createdAt: FieldValue.serverTimestamp(),
    chiusa: false,
  });
  return { classeId: ref.id };
}

async function impostaChiusa(body: Record<string, unknown>, chiusa: boolean) {
  const ref = classiRef().doc(idClasse(body));
  if (!(await ref.get()).exists) throw new ApiError(404, 'CLASSE_NON_TROVATA', 'Classe inesistente');
  await ref.update({ chiusa });
  return { ok: true, chiusa };
}

/** Fine lezione: niente consegne né tutor finché il docente non riapre. */
export const chiudiClasse = (body: Record<string, unknown>) => impostaChiusa(body, true);
/** Si ricomincia: tutto riprende da dove era. */
export const apriClasse = (body: Record<string, unknown>) => impostaChiusa(body, false);

export async function rimuoviAllievo(body: Record<string, unknown>) {
  const classeId = idClasse(body);
  const uid = testo(body.uid, 128);
  if (!uid) throw new ApiError(400, 'INVALID_BODY', "Manca l'allievo");
  const batch = getDb().batch();
  batch.delete(allieviRef(classeId).doc(uid));
  batch.set(appartenenzeRef().doc(uid), { classi: FieldValue.arrayRemove(classeId) }, { merge: true });
  await batch.commit();
  return { ok: true };
}
