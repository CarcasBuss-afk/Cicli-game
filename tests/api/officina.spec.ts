/* L'Officina dalla parte delle API: il docente crea la classe e assegna i compiti,
 * l'allievo entra con l'account della scuola, lavora fase per fase, chiede al tutor
 * (finto), e tutti i rifiuti: dominio sbagliato, compito scaduto, fase sbagliata. */
import { expect, test, type APIRequestContext } from '@playwright/test';
import { AUTH_EMULATOR_HOST, TEACHER_EMAIL } from './ambiente';

type Esercizio = { tipo: string; soluzione: string; outputAtteso: string[] };

/** Scambia un custom token con un ID token sull'emulatore Authentication. */
async function idToken(request: APIRequestContext, customToken: string): Promise<string> {
  const r = await request.post(`http://${AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=finta`, {
    data: { token: customToken, returnSecureToken: true },
  });
  const d = (await r.json()) as { idToken?: string };
  expect(d.idToken, 'id token dall\'emulatore').toBeTruthy();
  return d.idToken!;
}

type Utente = { token: string; uid: string; email: string };

async function allievo(request: APIRequestContext, email: string, nome: string): Promise<Utente> {
  const r = await request.post('/api/officina/test-login', { data: { email, nome } });
  const d = (await r.json()) as { token: string; uid: string };
  return { token: await idToken(request, d.token), uid: d.uid, email };
}

async function docente(request: APIRequestContext): Promise<Utente> {
  const r = await request.post('/api/docente/test-login');
  const d = (await r.json()) as { token: string };
  const token = await idToken(request, d.token);
  // Il primo accesso assegna il claim teacher.
  await request.post('/api/docente/accesso', { headers: { Authorization: `Bearer ${token}` } });
  return { token, uid: '', email: TEACHER_EMAIL };
}

async function api(request: APIRequestContext, rotta: string, u: Utente, dati: Record<string, unknown>) {
  const r = await request.post(rotta, { data: dati, headers: { Authorization: `Bearer ${u.token}` } });
  return { stato: r.status(), corpo: await r.json() };
}

const officina = (request: APIRequestContext, u: Utente, azione: string, dati: Record<string, unknown> = {}) =>
  api(request, '/api/officina', u, { azione, ...dati });
const prof = (request: APIRequestContext, u: Utente, azione: string, dati: Record<string, unknown> = {}) =>
  api(request, '/api/docente/officina', u, { azione, ...dati });

/** Le fasi del compito per questo allievo, con le soluzioni: dal seme, come le genera il server. */
async function fasiDi(request: APIRequestContext, uid: string, compitoId: string, progetto: string): Promise<Esercizio[]> {
  const r = await request.post('/api/giro/test-setup', { data: { azione: 'fasiOfficina', uid, compitoId, progetto } });
  return (await r.json()).fasi as Esercizio[];
}

/** Una classe nuova con un compito assegnato e un allievo dentro. */
async function scenario(request: APIRequestContext, opzioni: { scadenza?: string | null; progetto?: string } = {}) {
  const fabio = await docente(request);
  const classe = (await prof(request, fabio, 'creaClasse', { nome: '2A' })).corpo as { classeId: string; codice: string };
  const compito = (await prof(request, fabio, 'assegna', { classeId: classe.classeId, progetto: opzioni.progetto ?? 'salvadanaio', scadenza: opzioni.scadenza ?? null })).corpo as { compitoId: string };
  const email = `luca.${Date.now()}.${Math.floor(Math.random() * 1e6)}@scuola.it`;
  const luca = await allievo(request, email, 'Luca Rossi');
  const entrato = await officina(request, luca, 'entra', { codice: classe.codice });
  expect(entrato.stato, JSON.stringify(entrato.corpo)).toBe(200);
  const fasi = await fasiDi(request, luca.uid, compito.compitoId, opzioni.progetto ?? 'salvadanaio');
  return { fabio, classe, compitoId: compito.compitoId, luca, fasi };
}

test.describe("l'Officina", () => {
  test('la classe, il codice, i compiti assegnati e lo stato iniziale', async ({ request }) => {
    const { classe, compitoId, luca } = await scenario(request);
    const io = (await officina(request, luca, 'io')).corpo;
    expect(io.nome).toBe('Luca Rossi');
    expect(io.classi).toEqual([{ id: classe.classeId, nome: '2A', chiusa: false }]);

    const lista = (await officina(request, luca, 'compiti', { classeId: classe.classeId })).corpo;
    expect(lista.classe.nome).toBe('2A');
    expect(lista.compiti).toHaveLength(1);
    expect(lista.compiti[0]).toMatchObject({ id: compitoId, progetto: 'salvadanaio', titolo: 'Il salvadanaio', fasi: 0, fasiTotali: 5, consigli: 0, finito: false, scaduto: false, voto: null, votoSeFinisci: 10 });

    const c = (await officina(request, luca, 'compito', { classeId: classe.classeId, compitoId })).corpo;
    expect(c.scheda.titolo).toBe('Il salvadanaio');
    expect(c.esercizio.tipo).toBe('progetto');
    expect(c.esercizio.codiceIniziale).toBeUndefined();
    expect(JSON.stringify(c)).not.toContain('soluzione');
    // Entrare due volte non duplica niente.
    await officina(request, luca, 'entra', { codice: classe.codice });
    expect((await officina(request, luca, 'io')).corpo.classi).toHaveLength(1);
  });

  test('i parametri sono dell\'allievo: due allievi, due schede diverse', async ({ request }) => {
    const { classe, compitoId, luca } = await scenario(request);
    const sara = await allievo(request, `sara.${Date.now()}@scuola.it`, 'Sara');
    await officina(request, sara, 'entra', { codice: classe.codice });
    const a = (await officina(request, luca, 'compito', { classeId: classe.classeId, compitoId })).corpo;
    const b = (await officina(request, sara, 'compito', { classeId: classe.classeId, compitoId })).corpo;
    expect(a.scheda.dati).not.toEqual(b.scheda.dati);
    // E restano gli stessi a ogni apertura.
    const ancora = (await officina(request, luca, 'compito', { classeId: classe.classeId, compitoId })).corpo;
    expect(ancora.scheda).toEqual(a.scheda);
  });

  test('si lavora fase per fase: bozza salvata, codice che resta, tutor che costa, voto finale', async ({ request }) => {
    const { classe, compitoId, luca, fasi } = await scenario(request);
    const dati = { classeId: classe.classeId, compitoId };

    // Sbagliata: hint, bozza salvata.
    const sbagliata = await officina(request, luca, 'consegna', { ...dati, fase: 0, codice: 'for i in range(3):\n    print(i)' });
    expect(sbagliata.stato).toBe(200);
    expect(sbagliata.corpo.promosso).toBe(false);
    expect(sbagliata.corpo.hint).toBeTruthy();
    const riaperto = (await officina(request, luca, 'compito', dati)).corpo;
    expect(riaperto.esercizio.codiceIniziale).toBe('for i in range(3):\n    print(i)');
    expect(riaperto.errori).toBe(1);

    // Il tutor: una domanda lunga, costa un punto, resta nella conversazione.
    const lunga = 'Non capisco: ' + 'perché il ciclo non stampa le settimane? '.repeat(30);
    const t = await officina(request, luca, 'tutor', { ...dati, domanda: lunga, codice: 'for i in range(3):\n    print(i)' });
    expect(t.stato, JSON.stringify(t.corpo)).toBe(200);
    expect(t.corpo.risposta).toBeTruthy();
    expect(t.corpo).toMatchObject({ consigli: 1, votoSeFinisci: 9, fase: 1 });
    const conTutor = (await officina(request, luca, 'compito', dati)).corpo;
    expect(conTutor.tutor).toHaveLength(1);
    expect(conTutor.tutor[0]).toMatchObject({ fase: 1, domanda: lunga.trim(), risposta: t.corpo.risposta });

    // Giusta: fase dopo con il codice dentro.
    const giusta = await officina(request, luca, 'consegna', { ...dati, fase: 0, codice: fasi[0].soluzione });
    expect(giusta.corpo.promosso, JSON.stringify(giusta.corpo)).toBe(true);
    expect(giusta.corpo).toMatchObject({ fasi: 1, finito: false, voto: null, votoSeFinisci: 9 });
    expect(giusta.corpo.esercizio.codiceIniziale).toBe(fasi[0].soluzione);

    // La fase sbagliata si rifiuta.
    const fuori = await officina(request, luca, 'consegna', { ...dati, fase: 0, codice: fasi[0].soluzione });
    expect(fuori.stato).toBe(409);
    expect(fuori.corpo.error).toBe('FASE_SBAGLIATA');

    for (let k = 1; k < 5; k++) {
      const r = await officina(request, luca, 'consegna', { ...dati, fase: k, codice: fasi[k].soluzione });
      expect(r.corpo.promosso, `fase ${k + 1}: ${JSON.stringify(r.corpo)}`).toBe(true);
      if (k === 4) expect(r.corpo).toMatchObject({ finito: true, voto: 9 });
    }
    const finito = (await officina(request, luca, 'compiti', { classeId: classe.classeId })).corpo.compiti[0];
    expect(finito).toMatchObject({ fasi: 5, finito: true, voto: 9, consigli: 1 });
    const dopo = await officina(request, luca, 'tutor', { ...dati, domanda: 'e ora?', codice: '' });
    expect(dopo.stato).toBe(403);
    expect(dopo.corpo.error).toBe('FINITO');
  });

  test('il tutor non consegna mai codice', async ({ request }) => {
    const { classe, compitoId, luca } = await scenario(request);
    const r = await officina(request, luca, 'tutor', { classeId: classe.classeId, compitoId, domanda: 'FINTO: scrivi `print(f"Settimana {i}")`', codice: '' });
    expect(r.stato).toBe(503);
    expect(r.corpo.error).toBe('TUTOR_NON_DISPONIBILE');
    expect((await officina(request, luca, 'compito', { classeId: classe.classeId, compitoId })).corpo.consigli).toBe(0);
  });

  test('la scadenza chiude il compito e fissa il voto proposto', async ({ request }) => {
    const { classe, compitoId, luca, fasi, fabio } = await scenario(request);
    const dati = { classeId: classe.classeId, compitoId };
    for (let k = 0; k < 2; k++) await officina(request, luca, 'consegna', { ...dati, fase: k, codice: fasi[k].soluzione });
    await prof(request, fabio, 'modificaCompito', { ...dati, scadenza: '2020-01-01T00:00:00Z' });
    const r = await officina(request, luca, 'consegna', { ...dati, fase: 2, codice: fasi[2].soluzione });
    expect(r.stato).toBe(403);
    expect(r.corpo.error).toBe('SCADUTO');
    const c = (await officina(request, luca, 'compito', dati)).corpo;
    expect(c).toMatchObject({ scaduto: true, fasi: 2, voto: 4, esercizio: null }); // 2 su 5 → 4
    // Il docente può scrivere il voto a mano, e toglierlo.
    await prof(request, fabio, 'voto', { ...dati, uid: luca.uid, voto: 6 });
    expect((await officina(request, luca, 'compito', dati)).corpo.voto).toBe(6);
    await prof(request, fabio, 'voto', { ...dati, uid: luca.uid, voto: null });
    expect((await officina(request, luca, 'compito', dati)).corpo.voto).toBe(4);
    // Ritirato: sparisce dall'elenco.
    await prof(request, fabio, 'modificaCompito', { ...dati, ritira: true });
    expect((await officina(request, luca, 'compiti', { classeId: classe.classeId })).corpo.compiti).toHaveLength(0);
  });

  test('solo gli account della scuola, solo nelle proprie classi', async ({ request }) => {
    const { classe, compitoId } = await scenario(request);
    const esterno = await allievo(request, `qualcuno.${Date.now()}@gmail.com`, 'Esterno');
    const no = await officina(request, esterno, 'io');
    expect(no.stato).toBe(403);
    expect(no.corpo.error).toBe('DOMINIO_NON_AMMESSO');

    const altra = await allievo(request, `altra.${Date.now()}@scuola.it`, 'Altra');
    const fuori = await officina(request, altra, 'compito', { classeId: classe.classeId, compitoId });
    expect(fuori.stato).toBe(404);
    const codiceFinto = await officina(request, altra, 'entra', { codice: 'ZZZZ' });
    expect(codiceFinto.stato).toBe(404);

    const senza = await request.post('/api/officina', { data: { azione: 'io' } });
    expect(senza.status()).toBe(401);
    const nonProf = await api(request, '/api/docente/officina', altra, { azione: 'creaClasse', nome: 'X' });
    expect(nonProf.stato).toBe(403);
  });

  test('il docente toglie un allievo e chiude la classe', async ({ request }) => {
    const { classe, luca, fabio } = await scenario(request);
    await prof(request, fabio, 'rimuoviAllievo', { classeId: classe.classeId, uid: luca.uid });
    expect((await officina(request, luca, 'io')).corpo.classi).toHaveLength(0);
    await prof(request, fabio, 'chiudiClasse', { classeId: classe.classeId });
    const r = await officina(request, luca, 'entra', { codice: classe.codice });
    expect(r.stato).toBe(404);
  });
});

/* ------------------------------------------------------------ la pagina dell'allievo */

import type { Page } from '@playwright/test';

/** Digita il codice riga per riga seguendo l'indentazione automatica dell'editor. */
async function digita(page: Page, codice: string) {
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  let rientro = 0;
  for (const riga of codice.split('\n')) {
    const spazi = riga.match(/^\s*/)![0].length;
    if (spazi < rientro) await page.keyboard.press('Backspace');
    await page.keyboard.type(riga.trim(), { delay: 8 });
    await page.keyboard.press('Enter');
    rientro = riga.trim().endsWith(':') ? spazi + 4 : spazi;
  }
}

async function accedi(page: Page, email: string) {
  await page.goto('/officina');
  await page.getByLabel('email di prova').fill(email);
  await page.getByRole('button', { name: 'Accesso di prova (emulatori)' }).click();
}

test.describe("l'Officina nella pagina dell'allievo", () => {
  test('entra con il codice, apre il compito, lavora, chiede al tutor, riprende da dove era', async ({ page, request }) => {
    const { classe, fasi, luca } = await scenario(request);
    const nuova = `nadia.${Date.now()}@scuola.it`;

    // Un'allieva nuova entra con il codice.
    await accedi(page, nuova);
    await expect(page.getByText('Per cominciare, il codice della classe')).toBeVisible();
    await page.getByPlaceholder('K7QX').fill(classe.codice);
    await page.getByRole('button', { name: 'Entra' }).click();
    await expect(page.getByText('Classe 2A')).toBeVisible();
    await expect(page.getByRole('link', { name: /Il salvadanaio/ })).toContainText('Da cominciare');

    // Luca, che era già dentro, apre il compito.
    await page.getByRole('button', { name: 'esci' }).click();
    await accedi(page, luca.email);
    await page.getByRole('link', { name: /Il salvadanaio/ }).click();
    await expect(page.getByText('Fase 1 di 5', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Compito di realtà/ })).toBeVisible();
    await expect(page.getByLabel('voto')).toHaveText('10');

    // Una consegna sbagliata: hint, niente punti persi.
    await digita(page, 'for i in range(3):\n    print(i)');
    await page.getByRole('button', { name: 'Esegui ▶' }).click();
    await expect(page.getByRole('status')).toBeVisible();

    // Il tutor, con conferma del costo.
    await page.getByLabel('domanda al tutor').fill('Non capisco perché stampa dei numeri invece delle settimane, puoi spiegarmelo bene?');
    await page.getByRole('button', { name: 'Chiedi al tutor' }).click();
    await expect(page.getByText('il voto passa da 10 a 9')).toBeVisible();
    await page.getByRole('button', { name: /Sì, manda/ }).click();
    await expect(page.getByLabel('conversazione con il tutor').locator('li')).toHaveCount(1);
    await expect(page.getByLabel('voto')).toHaveText('9');

    // La fase 1 giusta, poi si ricarica: si riparte dalla fase 2 con il codice e la conversazione.
    await digita(page, fasi[0].soluzione);
    await page.getByRole('button', { name: 'Esegui ▶' }).click();
    await expect(page.getByText('Fase 2 di 5', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText('Fase 2 di 5', { exact: true })).toBeVisible();
    await expect(page.locator('.cm-content')).toContainText('Settimana');
    await expect(page.getByLabel('conversazione con il tutor').locator('li')).toHaveCount(1);

    // Nell'elenco lo stato è aggiornato.
    await page.getByRole('link', { name: '← i miei compiti' }).click();
    await expect(page.getByRole('link', { name: /Il salvadanaio/ })).toContainText('Fase 2 di 5');
  });
});

/* ------------------------------------------------------------- la dashboard del docente */

test.describe("l'Officina nella dashboard del docente", () => {
  test('classi, tabella in tempo reale, lavoro dell\'allievo, voto a mano, compito nuovo, CSV', async ({ page, request }) => {
    const { classe, compitoId, luca, fasi } = await scenario(request);
    const dati = { classeId: classe.classeId, compitoId };
    for (let k = 0; k < 2; k++) await officina(request, luca, 'consegna', { ...dati, fase: k, codice: fasi[k].soluzione });
    await officina(request, luca, 'tutor', { ...dati, domanda: 'come si fa il totale?', codice: '' });

    await page.goto('/docente/officina');
    await page.getByRole('button', { name: 'Accesso di prova (emulatori)' }).click();
    const scheda = page.getByRole('article').filter({ hasText: classe.codice });
    await expect(scheda).toContainText('1 compito assegnato');
    await scheda.getByRole('link', { name: 'Apri' }).click();

    // La tabella: fasi, domande, e il voto proposto in corso d'opera.
    await expect(page.getByText(classe.codice)).toBeVisible();
    const riga = page.getByRole('table', { name: 'tabella della classe' }).locator('tbody tr').filter({ hasText: 'Luca Rossi' });
    await expect(riga).toContainText('2/5');
    await expect(riga).toContainText('🧑‍🏫 1');

    // Il lavoro: codice fase per fase e la conversazione; poi il voto a mano.
    await riga.getByRole('button').first().click();
    const lavoro = page.getByRole('region', { name: "lavoro dell'allievo" });
    await expect(lavoro).toContainText('2/5 fasi');
    await expect(lavoro.getByText('Fase 2', { exact: true })).toBeVisible();
    await expect(lavoro.getByRole('list', { name: 'conversazione' }).locator('li')).toHaveCount(1);
    await expect(lavoro).toContainText('come si fa il totale?');
    await lavoro.getByLabel('voto del docente').fill('7');
    await lavoro.getByRole('button', { name: 'Salva' }).click();
    await expect(riga).toContainText('7*');
    // E l'allievo lo vede.
    expect((await officina(request, luca, 'compiti', { classeId: classe.classeId })).corpo.compiti[0].voto).toBe(7);

    // Un compito nuovo con scadenza: in tempo reale compare nell'elenco e nella tabella.
    await page.getByLabel('compito da assegnare').selectOption('allenamento');
    await page.getByLabel('scadenza', { exact: true }).fill('2030-06-30T23:59');
    await page.getByRole('button', { name: 'Assegna' }).click();
    await expect(page.getByRole('list', { name: 'compiti assegnati' }).locator('li')).toHaveCount(2);
    await expect(page.getByRole('columnheader', { name: "La tabella d'allenamento" })).toBeVisible();
    const elenco = (await officina(request, luca, 'compiti', { classeId: classe.classeId })).corpo.compiti;
    expect(elenco).toHaveLength(2);
    expect(elenco[1].scadenzaAt).not.toBeNull();

    // Il CSV.
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Scarica CSV' }).click();
    const file = await download;
    const testo = await (await import('node:fs/promises')).readFile(await file.path(), 'utf-8');
    expect(testo).toContain('Nome;Email;Il salvadanaio · fasi;Il salvadanaio · domande;Il salvadanaio · voto');
    expect(testo).toContain(`Luca Rossi;${luca.email};2;1;7;0;0;`);
  });
});
