/* SOLO PER I TEST: un allievo di prova nell'emulatore Authentication, con l'email e il
 * nome richiesti. Risponde 404 senza FIREBASE_AUTH_EMULATOR_HOST. Restituisce un custom
 * token, che i test scambiano con un ID token sull'emulatore. */
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) return new Response('Not found', { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { email?: string; nome?: string };
  const email = (body.email ?? '').toLowerCase();
  if (!email) return Response.json({ error: 'INVALID_BODY', message: 'Manca email' }, { status: 400 });
  const auth = getAuth(getAdminApp());
  let utente;
  try {
    utente = await auth.getUserByEmail(email);
  } catch {
    try {
      utente = await auth.createUser({ email, emailVerified: true, displayName: body.nome ?? email });
    } catch {
      utente = await auth.getUserByEmail(email);
    }
  }
  const token = await auth.createCustomToken(utente.uid);
  return Response.json({ token, uid: utente.uid });
}
