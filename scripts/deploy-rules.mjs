/* Pubblica firestore.rules (radice del repository) sul progetto Firebase vero, usando l'account
 * di servizio di .env.local e l'API REST Firebase Rules: niente login interattivo di firebase-tools.
 *
 *   npm run deploy-rules
 *
 * ATTENZIONE: il progetto Firebase è condiviso con html-escape-room e ha UN SOLO file di
 * regole. Il firestore.rules di questo repository contiene anche il blocco escapeSessions:
 * pubblicando da qui si sovrascrivono anche le regole dell'escape room. Prima di pubblicare,
 * controlla che i due file siano allineati.
 *
 * Passi: crea un ruleset con il contenuto del file, lo collega alla release "cloud.firestore",
 * poi rilegge la release per confermare.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cert } from 'firebase-admin/app';

const radice = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(radice, '.env.local');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const fileRegole = path.resolve(radice, 'firestore.rules');
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
if (!projectId || !clientEmail || !privateKey) {
  console.error('ERRORE: mancano FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL o FIREBASE_PRIVATE_KEY (vedi .env.example)');
  process.exit(1);
}

const { access_token: token } = await cert({ projectId, clientEmail, privateKey }).getAccessToken();
const API = 'https://firebaserules.googleapis.com/v1';
const intestazioni = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

async function chiama(metodo, url, body) {
  const r = await fetch(url, { method: metodo, headers: intestazioni, body: body ? JSON.stringify(body) : undefined });
  const testo = await r.text();
  if (!r.ok) throw new Error(`${metodo} ${url} -> ${r.status}: ${testo}`);
  return testo ? JSON.parse(testo) : {};
}

const contenuto = fs.readFileSync(fileRegole, 'utf8');
const ruleset = await chiama('POST', `${API}/projects/${projectId}/rulesets`, {
  source: { files: [{ name: 'firestore.rules', content: contenuto }] },
});
console.log('Ruleset creato:', ruleset.name);

const nomeRelease = `projects/${projectId}/releases/cloud.firestore`;
let release;
try {
  release = await chiama('PATCH', `${API}/${nomeRelease}`, {
    release: { name: nomeRelease, rulesetName: ruleset.name },
    updateMask: 'rulesetName',
  });
} catch (e) {
  if (!String(e.message).includes('404')) throw e;
  release = await chiama('POST', `${API}/projects/${projectId}/releases`, { name: nomeRelease, rulesetName: ruleset.name });
}
console.log('Release aggiornata:', release.name, '->', release.rulesetName);

const verifica = await chiama('GET', `${API}/${nomeRelease}`);
if (verifica.rulesetName !== ruleset.name) {
  console.error('ERRORE: la release non punta al ruleset appena creato:', verifica.rulesetName);
  process.exit(1);
}
console.log(`OK: firestore.rules pubblicato sul progetto ${projectId} (${contenuto.split('\n').length} righe).`);
