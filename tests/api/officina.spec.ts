/* L'Officina dalla parte delle API e delle pagine: il docente crea la classe, l'allievo
 * entra con l'account della scuola scegliendo la classe, percorre i compiti uno sbloccato
 * alla volta, chiede al tutor (finto); la dashboard del docente guarda; e i rifiuti:
 * dominio sbagliato, compito bloccato, fase sbagliata. */
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { AUTH_EMULATOR_HOST, TEACHER_EMAIL } from './ambiente';

type Esercizio = { tipo: string; soluzione: string; outputAtteso: string[] };

/** Scambia un custom token con un ID token sull'emulatore Authentication. */
async function idToken(request: APIRequestContext, customToken: string): Promise<string> {
  const r = await request.post(`http://${AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=finta`, {
    data: { token: customToken, returnSecureToken: true },
  });
  const d = (await r.json()) as { idToken?: string };
  expect(d.idToken, "id token dall'emulatore").toBeTruthy();
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

/** Le fasi di un progetto per questo allievo, con le soluzioni: dal seme, come le genera il server. */
async function fasiDi(request: APIRequestContext, uid: string, progetto: string): Promise<Esercizio[]> {
  const r = await request.post('/api/giro/test-setup', { data: { azione: 'fasiOfficina', uid, progetto } });
  return (await r.json()).fasi as Esercizio[];
}

const email = (nome: string) => `${nome}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@scuola.it`;

/** Una classe nuova con un allievo dentro. */
async function scenario(request: APIRequestContext) {
  const fabio = await docente(request);
  const nomeClasse = `2A-${Date.now() % 100000}`;
  const classe = (await prof(request, fabio, 'creaClasse', { nome: nomeClasse })).corpo as { classeId: string };
  const luca = await allievo(request, email('luca'), 'Luca Rossi');
  const entrato = await officina(request, luca, 'entra', { classeId: classe.classeId });
  expect(entrato.stato, JSON.stringify(entrato.corpo)).toBe(200);
  const fasi = await fasiDi(request, luca.uid, 'salvadanaio');
  return { fabio, classeId: classe.classeId, nomeClasse, luca, fasi };
}

async function finisci(request: APIRequestContext, u: Utente, classeId: string, progetto: string) {
  const fasi = await fasiDi(request, u.uid, progetto);
  for (let k = 0; k < 5; k++) {
    const r = await officina(request, u, 'consegna', { classeId, compitoId: progetto, fase: k, codice: fasi[k].soluzione });
    expect(r.corpo.promosso, `${progetto} fase ${k + 1}: ${JSON.stringify(r.corpo)}`).toBe(true);
  }
}

test.describe("l'Officina", () => {
  test('la classe si sceglie da un elenco; il percorso è sbloccato un compito alla volta', async ({ request }) => {
    const { classeId, nomeClasse, luca } = await scenario(request);
    const io = (await officina(request, luca, 'io')).corpo;
    expect(io.nome).toBe('Luca Rossi');
    expect(io.classi).toEqual([{ id: classeId, nome: nomeClasse, chiusa: false }]);
    const elenco = (await officina(request, luca, 'classi')).corpo.classi as Array<{ id: string; nome: string }>;
    expect(elenco.some((c) => c.id === classeId)).toBe(true);

    const p = (await officina(request, luca, 'compiti', { classeId })).corpo;
    expect(p.media).toBeNull();
    expect(p.compiti.map((c: { id: string; stato: string }) => [c.id, c.stato])).toEqual([
      ['salvadanaio', 'da-cominciare'],
      ['allenamento', 'bloccato'],
      ['scontrino', 'bloccato'],
    ]);
    expect(p.compiti[0]).toMatchObject({ titolo: 'Il salvadanaio', fasi: 0, fasiTotali: 5, consigli: 0, voto: null, votoSeFinisci: 10 });

    const bloccato = await officina(request, luca, 'compito', { classeId, compitoId: 'allenamento' });
    expect(bloccato.stato).toBe(403);
    expect(bloccato.corpo.error).toBe('BLOCCATO');
    const inesistente = await officina(request, luca, 'compito', { classeId, compitoId: 'quiz' });
    expect(inesistente.stato).toBe(404);

    const c = (await officina(request, luca, 'compito', { classeId, compitoId: 'salvadanaio' })).corpo;
    expect(c.scheda.titolo).toBe('Il salvadanaio');
    expect(c.esercizio.tipo).toBe('progetto');
    expect(c.esercizio.codiceIniziale).toBeUndefined();
    expect(JSON.stringify(c)).not.toContain('soluzione');
    // Entrare due volte non duplica niente.
    await officina(request, luca, 'entra', { classeId });
    expect((await officina(request, luca, 'io')).corpo.classi).toHaveLength(1);
  });

  test("i parametri sono dell'allievo: due allievi, due schede diverse", async ({ request }) => {
    const { classeId, luca } = await scenario(request);
    const sara = await allievo(request, email('sara'), 'Sara');
    await officina(request, sara, 'entra', { classeId });
    const a = (await officina(request, luca, 'compito', { classeId, compitoId: 'salvadanaio' })).corpo;
    const b = (await officina(request, sara, 'compito', { classeId, compitoId: 'salvadanaio' })).corpo;
    expect(a.scheda.dati).not.toEqual(b.scheda.dati);
    const ancora = (await officina(request, luca, 'compito', { classeId, compitoId: 'salvadanaio' })).corpo;
    expect(ancora.scheda).toEqual(a.scheda);
  });

  test('fase per fase: bozza salvata, tutor che costa fino a 5, voto a fine, media, compito dopo sbloccato', async ({ request }) => {
    const { classeId, luca, fasi } = await scenario(request);
    const dati = { classeId, compitoId: 'salvadanaio' };

    const sbagliata = await officina(request, luca, 'consegna', { ...dati, fase: 0, codice: 'for i in range(3):\n    print(i)' });
    expect(sbagliata.corpo.promosso).toBe(false);
    expect(sbagliata.corpo.hint).toBeTruthy();
    const riaperto = (await officina(request, luca, 'compito', dati)).corpo;
    expect(riaperto.esercizio.codiceIniziale).toBe('for i in range(3):\n    print(i)');

    // Sette domande: il voto scende fino a 5 e poi si ferma, ma il tutor risponde ancora.
    const lunga = 'Non capisco: ' + 'perché il ciclo non stampa le settimane? '.repeat(30);
    for (let i = 1; i <= 7; i++) {
      const t = await officina(request, luca, 'tutor', { ...dati, domanda: i === 1 ? lunga : 'ancora', codice: '' });
      expect(t.stato, JSON.stringify(t.corpo)).toBe(200);
      expect(t.corpo.risposta).toBeTruthy();
      expect(t.corpo).toMatchObject({ consigli: i, votoSeFinisci: Math.max(5, 10 - i) });
    }
    const conTutor = (await officina(request, luca, 'compito', dati)).corpo;
    expect(conTutor.tutor).toHaveLength(7);
    expect(conTutor.tutor[0]).toMatchObject({ fase: 1, domanda: lunga.trim() });

    const giusta = await officina(request, luca, 'consegna', { ...dati, fase: 0, codice: fasi[0].soluzione });
    expect(giusta.corpo.promosso, JSON.stringify(giusta.corpo)).toBe(true);
    expect(giusta.corpo).toMatchObject({ fasi: 1, finito: false, voto: null, votoSeFinisci: 5 });
    expect(giusta.corpo.esercizio.codiceIniziale).toBe(fasi[0].soluzione);
    const fuori = await officina(request, luca, 'consegna', { ...dati, fase: 0, codice: fasi[0].soluzione });
    expect(fuori.stato).toBe(409);
    expect(fuori.corpo.error).toBe('FASE_SBAGLIATA');

    for (let k = 1; k < 5; k++) {
      const r = await officina(request, luca, 'consegna', { ...dati, fase: k, codice: fasi[k].soluzione });
      expect(r.corpo.promosso, `fase ${k + 1}: ${JSON.stringify(r.corpo)}`).toBe(true);
      if (k === 4) expect(r.corpo).toMatchObject({ finito: true, voto: 5 });
    }
    const p = (await officina(request, luca, 'compiti', { classeId })).corpo;
    expect(p.media).toBe(5);
    expect(p.compiti[0]).toMatchObject({ stato: 'finito', voto: 5, consigli: 7 });
    expect(p.compiti[1].stato).toBe('da-cominciare');
    expect(p.compiti[2].stato).toBe('bloccato');
    const dopo = await officina(request, luca, 'tutor', { ...dati, domanda: 'e ora?', codice: '' });
    expect(dopo.stato).toBe(403);
    expect(dopo.corpo.error).toBe('FINITO');

    // Il secondo compito, senza domande: la media sale.
    await finisci(request, luca, classeId, 'allenamento');
    const p2 = (await officina(request, luca, 'compiti', { classeId })).corpo;
    expect(p2.media).toBe(7.5);
    expect(p2.compiti[2].stato).toBe('da-cominciare');
  });

  test('il tutor non consegna mai codice', async ({ request }) => {
    const { classeId, luca } = await scenario(request);
    const r = await officina(request, luca, 'tutor', { classeId, compitoId: 'salvadanaio', domanda: 'FINTO: scrivi `print(f"Settimana {i}")`', codice: '' });
    expect(r.stato).toBe(503);
    expect(r.corpo.error).toBe('TUTOR_NON_DISPONIBILE');
    expect((await officina(request, luca, 'compito', { classeId, compitoId: 'salvadanaio' })).corpo.consigli).toBe(0);
  });

  test('solo gli account della scuola, solo nelle proprie classi', async ({ request }) => {
    const { classeId } = await scenario(request);
    const esterno = await allievo(request, `qualcuno.${Date.now()}@gmail.com`, 'Esterno');
    const no = await officina(request, esterno, 'io');
    expect(no.stato).toBe(403);
    expect(no.corpo.error).toBe('DOMINIO_NON_AMMESSO');

    const altra = await allievo(request, email('altra'), 'Altra');
    expect((await officina(request, altra, 'compito', { classeId, compitoId: 'salvadanaio' })).stato).toBe(404);
    expect((await officina(request, altra, 'entra', { classeId: 'inesistente' })).stato).toBe(404);
    expect((await request.post('/api/officina', { data: { azione: 'io' } })).status()).toBe(401);
    expect((await api(request, '/api/docente/officina', altra, { azione: 'creaClasse', nome: 'X' })).stato).toBe(403);
  });

  test('il docente toglie un allievo e chiude la classe', async ({ request }) => {
    const { classeId, luca, fabio } = await scenario(request);
    await prof(request, fabio, 'rimuoviAllievo', { classeId, uid: luca.uid });
    expect((await officina(request, luca, 'io')).corpo.classi).toHaveLength(0);
    await prof(request, fabio, 'chiudiClasse', { classeId });
    expect((await officina(request, luca, 'entra', { classeId })).stato).toBe(404);
  });
});

/* ------------------------------------------------------------ la pagina dell'allievo */

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
  test('sceglie la classe, vede il percorso, lavora, chiede al tutor, riprende da dove era', async ({ page, request }) => {
    const { classeId, nomeClasse, fasi, luca } = await scenario(request);

    // Un'allieva nuova sceglie la classe dall'elenco.
    await accedi(page, email('nadia'));
    await page.getByLabel('Per cominciare, dimmi in che classe sei:').selectOption(classeId);
    await page.getByRole('button', { name: 'Entra' }).click();
    await expect(page.getByText(`Classe ${nomeClasse}`)).toBeVisible();
    const percorso = page.getByRole('list', { name: `percorso di ${nomeClasse}` }).locator('li');
    await expect(percorso).toHaveCount(3);
    await expect(percorso.nth(0)).toContainText('Comincia');
    await expect(percorso.nth(1)).toContainText('si sblocca');
    await expect(page.getByLabel('media')).toHaveText('–');

    // Luca, che era già dentro, apre il compito.
    await page.getByRole('button', { name: 'esci' }).click();
    await expect(page.getByRole('button', { name: 'Accedi con Google' })).toBeVisible();
    await accedi(page, luca.email);
    await page.getByRole('link', { name: /Il salvadanaio/ }).click();
    await expect(page.getByText('Fase 1 di 5', { exact: true })).toBeVisible();
    await expect(page.getByLabel('voto')).toHaveText('10');

    await digita(page, 'for i in range(3):\n    print(i)');
    await page.getByRole('button', { name: 'Esegui ▶' }).click();
    await expect(page.getByRole('status')).toBeVisible();

    await page.getByLabel('domanda al tutor').fill('Non capisco perché stampa dei numeri invece delle settimane, puoi spiegarmelo bene?');
    await page.getByRole('button', { name: 'Chiedi al tutor' }).click();
    await expect(page.getByText('il voto passa da 10 a 9')).toBeVisible();
    await page.getByRole('button', { name: /Sì, manda/ }).click();
    await expect(page.getByLabel('conversazione con il tutor').locator('li')).toHaveCount(1);
    await expect(page.getByLabel('voto')).toHaveText('9');

    await digita(page, fasi[0].soluzione);
    await page.getByRole('button', { name: 'Esegui ▶' }).click();
    await expect(page.getByText('Fase 2 di 5', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText('Fase 2 di 5', { exact: true })).toBeVisible();
    await expect(page.locator('.cm-content')).toContainText('Settimana');
    await expect(page.getByLabel('conversazione con il tutor').locator('li')).toHaveCount(1);

    await page.getByRole('link', { name: '← i miei compiti' }).click();
    await expect(page.getByRole('link', { name: /Il salvadanaio/ })).toContainText('Fase 2 di 5');
  });
});

/* ------------------------------------------------------------- la dashboard del docente */

test.describe("l'Officina nella dashboard del docente", () => {
  test('classi, tabella in tempo reale con la media, lavoro dell\'allievo, CSV', async ({ page, request }) => {
    const { classeId, nomeClasse, luca } = await scenario(request);
    await finisci(request, luca, classeId, 'salvadanaio');
    const fasi2 = await fasiDi(request, luca.uid, 'allenamento');
    for (let k = 0; k < 2; k++) await officina(request, luca, 'consegna', { classeId, compitoId: 'allenamento', fase: k, codice: fasi2[k].soluzione });
    await officina(request, luca, 'tutor', { classeId, compitoId: 'allenamento', domanda: 'come si fa il totale?', codice: '' });

    await page.goto('/docente/officina');
    await page.getByRole('button', { name: 'Accesso di prova (emulatori)' }).click();
    await page.getByRole('article').filter({ hasText: `classe ${nomeClasse}` }).getByRole('link', { name: 'Apri' }).click();

    const riga = page.getByRole('table', { name: 'tabella della classe' }).locator('tbody tr').filter({ hasText: 'Luca Rossi' });
    await expect(riga).toContainText('5/5');
    await expect(riga).toContainText('2/5');
    await expect(riga).toContainText('🧑‍🏫 1');
    await expect(riga).toContainText('🔒');
    await expect(riga.locator('td').nth(4)).toHaveText('10'); // la media: un solo compito finito, senza domande

    await riga.getByRole('button', { name: `Luca Rossi: allenamento` }).click();
    const lavoro = page.getByRole('region', { name: "lavoro dell'allievo" });
    await expect(lavoro).toContainText('2/5 fasi');
    await expect(lavoro.getByText('Fase 2', { exact: true })).toBeVisible();
    await expect(lavoro.getByRole('list', { name: 'conversazione' }).locator('li')).toHaveCount(1);
    await expect(lavoro).toContainText('come si fa il totale?');

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Scarica CSV' }).click();
    const file = await download;
    const testo = await (await import('node:fs/promises')).readFile(await file.path(), 'utf-8');
    expect(testo).toContain('Nome;Email;Il salvadanaio · fasi;Il salvadanaio · domande;Il salvadanaio · voto;');
    expect(testo).toContain(`Luca Rossi;${luca.email};5;0;10;2;1;;0;0;;10`);
  });
});
