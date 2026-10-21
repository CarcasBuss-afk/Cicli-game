/* Le azioni del docente nell'Officina: creare e chiudere le classi, togliere un allievo.
 * Tutto il resto è monitoraggio, e lo fa la dashboard con onSnapshot. Il docente è quello
 * di TEACHER_EMAILS (lib/giro/docenteAuth.ts). */
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

export async function chiudiClasse(body: Record<string, unknown>) {
  await classiRef().doc(idClasse(body)).update({ chiusa: true });
  return { ok: true };
}

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
