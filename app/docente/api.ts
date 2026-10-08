'use client';
/* Chiamate alle API /api/docente/* dal browser, con l'ID token Firebase del docente. */
import { getClientAuth } from '@/lib/firebaseClient';

export async function chiamaDocente<T = Record<string, unknown>>(route: string, body: unknown = {}): Promise<T> {
  const utente = getClientAuth().currentUser;
  if (!utente) throw new Error('Accesso richiesto');
  const token = await utente.getIdToken();
  const r = await fetch(`/api/docente/${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const dati = (await r.json().catch(() => ({}))) as { message?: string };
  if (!r.ok) throw new Error(dati.message || `Errore del server (${r.status})`);
  return dati as T;
}
