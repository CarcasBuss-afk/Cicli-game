/* Firebase SDK client, solo per le pagine del docente (login Google e lettura in tempo
 * reale della vista LIM). Le pagine degli allievi NON usano questo modulo: parlano solo
 * con le API via fetch.
 * Con NEXT_PUBLIC_FIREBASE_EMULATORS=1 (test) si collega agli emulatori locali.
 */
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';

export const EMULATORI = process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === '1';

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

export function getClientApp(): FirebaseApp {
  if (!app) {
    app =
      getApps()[0] ??
      initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      });
  }
  return app;
}

export function getClientAuth(): Auth {
  if (!auth) {
    auth = getAuth(getClientApp());
    if (EMULATORI) connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
  return auth;
}

export function getClientDb(): Firestore {
  if (!db) {
    db = getFirestore(getClientApp());
    if (EMULATORI) connectFirestoreEmulator(db, '127.0.0.1', 8089);
  }
  return db;
}

export function providerGoogle(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}
