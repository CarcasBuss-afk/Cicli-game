/* Firebase Admin SDK, solo lato server. Credenziali dalle variabili d'ambiente
 * (vedi .env.example): mai file di service account nel repository.
 * L'inizializzazione è pigra: `next build` e le pagine che non toccano Firestore
 * funzionano anche senza variabili.
 * Con FIRESTORE_EMULATOR_HOST impostato (test) si usa l'emulatore senza credenziali.
 */
import 'server-only';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

function credenziali() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Su Vercel la chiave viene incollata con "\n" letterali: li ripristiniamo.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Configurazione Firebase mancante: servono FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY (vedi .env.example)',
    );
  }
  return { projectId, clientEmail, privateKey };
}

/** Project id da usare con l'emulatore, oppure null se non siamo in emulazione. */
function progettoEmulato(): string | null {
  if (!process.env.FIRESTORE_EMULATOR_HOST) return null;
  return process.env.FIREBASE_PROJECT_ID || 'demo-attivita';
}

let app: App | undefined;

export function getAdminApp(): App {
  if (!app) {
    const esistente = getApps()[0];
    if (esistente) {
      app = esistente;
    } else {
      const emulato = progettoEmulato();
      app = emulato ? initializeApp({ projectId: emulato }) : initializeApp({ credential: cert(credenziali()) });
    }
  }
  return app;
}

export function getDb(): Firestore {
  return getFirestore(getAdminApp());
}

/** Email dei docenti autorizzati (TEACHER_EMAILS, separate da virgola), normalizzate. */
export function teacherEmails(): string[] {
  return (process.env.TEACHER_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
