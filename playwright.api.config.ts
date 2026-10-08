/* Test delle API e del flusso di gioco (tests/api): avvia da solo l'emulatore Firestore e
 * il server Next in modalità sviluppo, collegato all'emulatore con il progetto fittizio
 * demo-giro. Serve Java per gli emulatori.
 */
import { defineConfig, devices } from '@playwright/test';
import { API_BASE, AUTH_EMULATOR_HOST, EMULATOR_HOST, PORTA_WEB, PROJECT_ID, RATE_LIMIT, TEACHER_EMAIL } from './tests/api/ambiente';

export default defineConfig({
  testDir: 'tests/api',
  fullyParallel: true,
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 90_000,
  // Il server di sviluppo compila ogni rotta al primo accesso: le attese devono assorbirlo.
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? 'github' : 'list',
  projects: [{ name: 'api', use: { ...devices['Desktop Chrome'], baseURL: API_BASE } }],
  webServer: [
    {
      command: `npx firebase emulators:start --only firestore,auth --project ${PROJECT_ID}`,
      url: `http://${EMULATOR_HOST}/`,
      reuseExistingServer: !process.env.CI,
      // Al primo avvio firebase-tools scarica i jar degli emulatori: può volerci qualche minuto.
      timeout: 300_000,
    },
    {
      command: `npm run dev -- -p ${PORTA_WEB}`,
      url: `${API_BASE}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        FIRESTORE_EMULATOR_HOST: EMULATOR_HOST,
        FIREBASE_AUTH_EMULATOR_HOST: AUTH_EMULATOR_HOST,
        FIREBASE_PROJECT_ID: PROJECT_ID,
        TEACHER_EMAILS: TEACHER_EMAIL,
        GIRO_RATE_LIMIT_PER_MINUTE: String(RATE_LIMIT),
        NEXT_PUBLIC_FIREBASE_EMULATORS: '1',
        NEXT_PUBLIC_FIREBASE_API_KEY: 'chiave-finta',
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `${PROJECT_ID}.firebaseapp.com`,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: PROJECT_ID,
        NEXT_PUBLIC_FIREBASE_APP_ID: '1:1:web:1',
        // Senza credenziali l'SDK cercherebbe il server dei metadati di Google (timeout lento).
        METADATA_SERVER_DETECTION: 'none',
      },
    },
  ],
});
