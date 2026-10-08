/* Test delle regole Firestore (firestore.rules) sull'emulatore.
 *
 * La promessa del progetto è che i dati di gara non siano raggiungibili dai client: le
 * pagine degli allievi parlano solo con le API, e l'unica lettura concessa è quella del
 * docente con il claim `teacher`, che serve alla LIM. Qui si verifica che sia vero.
 *
 * L'emulatore è avviato da playwright.api.config.ts; i dati di prova hanno id unici e non
 * vengono cancellati, perché gli altri test girano in parallelo sullo stesso emulatore.
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { setLogLevel } from 'firebase/firestore';
import { EMULATOR_HOST, PROJECT_ID } from './ambiente';

// I rifiuti sono attesi: niente log PERMISSION_DENIED del client Firestore.
setLogLevel('silent');

const ROOT = path.resolve(__dirname, '..', '..');
const [host, porta] = EMULATOR_HOST.split(':');

let env: RulesTestEnvironment;
let sessionId: string;

test.beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host, port: Number(porta), rules: fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8') },
  });
  sessionId = `regole-${Date.now()}-${process.pid}`;
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.doc(`giroSessions/${sessionId}`).set({ code: 'RTST', status: 'running', numTappe: 4 });
    await db.doc(`giroSessions/${sessionId}/players/p1`).set({ name: 'Luca', tokenHash: 'segreto' });
    await db.doc(`altro/${sessionId}`).set({ riservato: true });
  });
});

test.afterAll(async () => {
  await env?.cleanup();
});

const docente = () => env.authenticatedContext('docente', { email: 'prof@scuola.it', teacher: true }).firestore();
const utente = () => env.authenticatedContext('utente', { email: 'altro@scuola.it' }).firestore();
const anonimo = () => env.unauthenticatedContext().firestore();

test('anonimo: niente letture, niente scritture', async () => {
  const db = anonimo();
  await assertFails(db.doc(`giroSessions/${sessionId}`).get());
  await assertFails(db.collection('giroSessions').get());
  await assertFails(db.doc(`giroSessions/${sessionId}/players/p1`).get());
  await assertFails(db.collection(`giroSessions/${sessionId}/players`).get());
});

test('un allievo non può barare scrivendo in Firestore', async () => {
  const db = anonimo();
  await assertFails(db.doc(`giroSessions/${sessionId}/players/p1`).update({ tappaCorrente: 99 }));
  await assertFails(db.collection(`giroSessions/${sessionId}/players`).add({ name: 'Finto' }));
  await assertFails(db.doc(`giroSessions/${sessionId}`).update({ status: 'closed' }));
  await assertFails(db.doc(`giroSessions/${sessionId}`).delete());
});

test('autenticato senza claim teacher: niente letture né scritture', async () => {
  const db = utente();
  await assertFails(db.doc(`giroSessions/${sessionId}`).get());
  await assertFails(db.collection(`giroSessions/${sessionId}/players`).get());
  await assertFails(db.doc(`giroSessions/${sessionId}/players/p1`).update({ tappaCorrente: 99 }));
});

test('docente: legge gara e allievi, singoli e in lista', async () => {
  const db = docente();
  const gara = await assertSucceeds(db.doc(`giroSessions/${sessionId}`).get());
  expect(gara.data()?.code).toBe('RTST');
  const allievi = await assertSucceeds(db.collection(`giroSessions/${sessionId}/players`).get());
  expect(allievi.size).toBe(1);
});

test('docente: può leggere ma non scrivere (le scritture passano dalle API)', async () => {
  const db = docente();
  await assertFails(db.doc(`giroSessions/${sessionId}`).update({ status: 'closed' }));
  await assertFails(db.doc(`giroSessions/${sessionId}/players/p1`).update({ name: 'Altro' }));
  await assertFails(db.doc(`giroSessions/${sessionId}/players/p1`).delete());
});

test('tutto il resto del database resta chiuso anche al docente', async () => {
  await assertFails(docente().doc(`altro/${sessionId}`).get());
  await assertFails(anonimo().doc(`altro/${sessionId}`).get());
});

test('le regole dell\'escape room restano in piedi (file condiviso)', async () => {
  // Il progetto Firebase è lo stesso: pubblicare da qui sovrascrive anche le sue regole.
  await env.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().doc(`escapeSessions/${sessionId}`).set({ code: 'ESC1', status: 'running' });
  });
  await assertFails(anonimo().doc(`escapeSessions/${sessionId}`).get());
  const letta = await assertSucceeds(docente().doc(`escapeSessions/${sessionId}`).get());
  expect(letta.data()?.code).toBe('ESC1');
});
