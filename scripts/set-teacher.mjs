/* Assegna (o revoca) il ruolo docente: custom claim { teacher: true } sull'utente Firebase Auth
 * con l'email indicata. L'email deve comparire in TEACHER_EMAILS. Le credenziali dell'Admin SDK
 * arrivano da .env.local (o dalle variabili d'ambiente FIREBASE_*).
 *
 *   npm run set-teacher -- prof@scuola.it            assegna il ruolo
 *   npm run set-teacher -- prof@scuola.it --revoke   lo revoca
 *
 * Se l'utente non esiste ancora in Authentication viene creato con l'email verificata: al primo
 * accesso con Google l'account viene collegato. Il claim vale dal prossimo accesso.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const radice = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(radice, '.env.local');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const [email, ...flag] = process.argv.slice(2);
const revoca = flag.includes('--revoke');
if (!email || !email.includes('@')) {
  console.error('Uso: npm run set-teacher -- <email> [--revoke]');
  process.exit(2);
}
const target = email.trim().toLowerCase();

const autorizzate = (process.env.TEACHER_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
if (!autorizzate.includes(target)) {
  console.error(`ERRORE: ${target} non è in TEACHER_EMAILS (${autorizzate.join(', ') || 'vuota'}). Aggiungila prima lì.`);
  process.exit(1);
}

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
if (!projectId || !clientEmail || !privateKey) {
  console.error('ERRORE: mancano FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL o FIREBASE_PRIVATE_KEY (vedi .env.example)');
  process.exit(1);
}

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const auth = getAuth();

let utente;
try {
  utente = await auth.getUserByEmail(target);
} catch (e) {
  if (e.code !== 'auth/user-not-found') throw e;
  if (revoca) {
    console.log(`Nessun utente con email ${target}: niente da revocare.`);
    process.exit(0);
  }
  utente = await auth.createUser({ email: target, emailVerified: true });
  console.log(`Utente creato in Authentication (uid ${utente.uid}): al primo accesso con Google verrà collegato.`);
}

const claims = { ...(utente.customClaims ?? {}) };
if (revoca) delete claims.teacher;
else claims.teacher = true;
await auth.setCustomUserClaims(utente.uid, claims);

console.log(`${revoca ? 'Revocato' : 'Assegnato'} il ruolo docente a ${target} (uid ${utente.uid}). Claims: ${JSON.stringify(claims)}`);
console.log('Vale dal prossimo accesso: se il docente è già collegato deve uscire e rientrare.');
