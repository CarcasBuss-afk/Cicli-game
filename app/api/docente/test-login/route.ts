/* Accesso di prova per i test automatici: esiste SOLO quando il server usa l'emulatore
 * Authentication (FIREBASE_AUTH_EMULATOR_HOST). In produzione risponde 404.
 * Restituisce un custom token per la prima email di TEACHER_EMAILS. */
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp, teacherEmails } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST() {
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) return new Response('Not found', { status: 404 });
  const email = teacherEmails()[0];
  if (!email) return Response.json({ error: 'NO_TEACHER', message: 'TEACHER_EMAILS è vuota' }, { status: 400 });

  const auth = getAuth(getAdminApp());
  try {
    let utente;
    try {
      utente = await auth.getUserByEmail(email);
    } catch {
      try {
        utente = await auth.createUser({ email, emailVerified: true, displayName: 'Docente di prova' });
      } catch {
        // Due test in parallelo possono creare l'utente nello stesso istante: il secondo
        // riceve "email già esistente" e deve limitarsi a rileggerlo.
        utente = await auth.getUserByEmail(email);
      }
    }
    const token = await auth.createCustomToken(utente.uid);
    return Response.json({ token, email });
  } catch (e) {
    // Senza questo un errore qui tornerebbe con il corpo vuoto, e il client fallirebbe
    // nel JSON.parse con un messaggio incomprensibile.
    console.error('[test-login] errore', e);
    return Response.json({ error: 'INTERNAL', message: `Accesso di prova non riuscito: ${e}` }, { status: 500 });
  }
}
