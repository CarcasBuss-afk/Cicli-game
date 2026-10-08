/* Test della parte docente: comporre un Giro dalla dashboard, guidarlo dalla LIM (via,
 * tappa dal vivo, chiusura, risultati, classifica generale, migliori N, tappe aggiunte),
 * le correzioni sul singolo allievo, la fine del Giro, e il muro delle API senza accesso. */
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

type Esercizio = { soluzione: string };

async function accediDocente(page: Page, dove = '/docente') {
  await page.goto(dove);
  await page.getByRole('button', { name: 'Accesso di prova (emulatori)' }).click();
}

async function setup(request: APIRequestContext, dati: Record<string, unknown>) {
  return (await (await request.post('/api/giro/test-setup', { data: dati })).json()) as {
    sessionId: string;
    code: string;
    esercizi: Esercizio[];
  };
}

const creaGiro = (request: APIRequestContext, temi: string[]) =>
  setup(request, { azione: 'crea', tipo: 'giro', classLabel: '3C', temi });

async function entra(request: APIRequestContext, code: string, name: string) {
  const r = await request.post('/api/giro/join', { data: { code, name } });
  return (await r.json()) as { playerId: string; token: string; numero: number };
}

async function corri(
  request: APIRequestContext,
  p: { playerId: string; token: string },
  tappa: number,
  esercizi: Esercizio[],
  fino: number,
) {
  for (let k = 0; k < fino; k++) {
    const r = await request.post('/api/giro/submit', {
      data: { playerId: p.playerId, token: p.token, tappa, km: k, risposta: esercizi[k].soluzione },
    });
    const esito = await r.json();
    expect(esito.promosso, JSON.stringify(esito)).toBe(true);
  }
}

const classifica = (page: Page) => page.getByRole('list', { name: 'classifica' }).locator('li');

test.describe('dashboard', () => {
  test('compone un Giro con le tappe proposte e lo chiude', async ({ page }) => {
    await accediDocente(page);
    await expect(page.getByRole('heading', { name: /gare/ })).toBeVisible();

    // Di partenza sono spuntate le prime quattro tappe del programma
    await expect(page.getByRole('checkbox', { checked: true })).toHaveCount(4);
    await page.getByLabel(/La scala/).check();

    await page.getByPlaceholder('2A').fill('5F');
    await page.getByRole('button', { name: 'Crea il Giro' }).click();

    const riga = page.locator('article').filter({ hasText: 'classe 5F' }).first();
    await expect(riga).toContainText('Giro · 0/5 tappe corse');
    await expect(riga).toContainText('non ancora partito');
    await expect(riga.locator('span').first()).toHaveText(/^[2-9A-HJ-NP-Z]{4}$/);

    page.on('dialog', (d) => d.accept());
    await riga.getByRole('button', { name: 'Chiudi' }).click();
    await expect(riga).toContainText('chiuso');
  });

  test('crea una gara singola', async ({ page }) => {
    await accediDocente(page);
    await page.getByRole('tab', { name: 'Gara singola' }).click();
    await page.getByPlaceholder('2A').fill('1G');
    await page.getByLabel('esercizi').fill('8');
    await page.getByRole('button', { name: 'Crea la gara' }).click();
    await expect(page.locator('article').filter({ hasText: 'classe 1G' }).first()).toContainText('gara singola');
  });
});

test.describe('vista LIM', () => {
  test('partenza: codice grande, corridori con il numero, poi il via', async ({ page, request }) => {
    const giro = await creaGiro(request, ['ripeti', 'contare']);
    await accediDocente(page, `/docente/sessione/${giro.sessionId}`);

    await expect(page.getByText(giro.code)).toBeVisible();
    await expect(page.getByText('Nessuno in griglia di partenza')).toBeVisible();

    await entra(request, giro.code, 'Rosa');
    const lista = page.getByRole('list', { name: 'corridori' });
    await expect(lista.locator('li').filter({ hasText: 'Rosa' })).toContainText('1');

    await page.getByRole('button', { name: /VIA! Tappa 1 · Ripetere/ }).click();
    await expect(page.getByText('Tappa 1 · Ripetere')).toBeVisible();
    await expect(page.getByLabel('tempo rimasto')).toContainText(/\d+:\d\d/);
    await expect(classifica(page).filter({ hasText: 'Rosa' })).toContainText('0/5 km');
  });

  test('la tappa si aggiorna entro due secondi dalla consegna', async ({ page, request }) => {
    const giro = await creaGiro(request, ['ripeti']);
    const { esercizi } = await setup(request, { azione: 'apri', sessionId: giro.sessionId, tappa: 0, minuti: 10 });
    await accediDocente(page, `/docente/sessione/${giro.sessionId}`);
    const gino = await entra(request, giro.code, 'Gino');

    const riga = classifica(page).filter({ hasText: 'Gino' });
    await corri(request, gino, 0, esercizi, 1);
    await expect(riga).toContainText('1/5 km', { timeout: 2000 });

    await request.post('/api/giro/submit', {
      data: { playerId: gino.playerId, token: gino.token, tappa: 0, km: 1, risposta: 'print("no")' },
    });
    await expect(riga).toContainText('1 errore', { timeout: 2000 });
  });

  test('chiusa la tappa: ordine d\'arrivo, punti, generale e prossima tappa', async ({ page, request }) => {
    const giro = await creaGiro(request, ['ripeti', 'contare']);
    const { esercizi } = await setup(request, { azione: 'apri', sessionId: giro.sessionId, tappa: 0, minuti: 10 });
    const ada = await entra(request, giro.code, 'Ada');
    const bea = await entra(request, giro.code, 'Bea');
    await corri(request, ada, 0, esercizi, 5);
    await corri(request, bea, 0, esercizi, 2);

    await accediDocente(page, `/docente/sessione/${giro.sessionId}`);
    await page.getByRole('button', { name: 'Chiudi la tappa' }).click();

    await expect(page.getByText(/Tappa 1 · Ripetere: ordine d'arrivo/)).toBeVisible();
    const arrivo = page.getByRole('list', { name: "ordine d'arrivo" });
    await expect(arrivo.locator('li').first()).toContainText('Ada');
    await expect(arrivo.locator('li').first()).toContainText('25 pt');

    const generale = page.getByRole('list', { name: 'classifica generale' });
    await expect(generale.locator('li').first()).toContainText('Ada');
    await expect(generale.locator('li').first()).toContainText('maglia rosa');

    await expect(page.getByRole('button', { name: /VIA! Tappa 2 · Contare con range/ })).toBeVisible();
  });

  test('migliori N e tappa aggiunta dalla LIM', async ({ page, request }) => {
    const giro = await creaGiro(request, ['ripeti']);
    const { esercizi } = await setup(request, { azione: 'apri', sessionId: giro.sessionId, tappa: 0, minuti: 10 });
    const ugo = await entra(request, giro.code, 'Ugo');
    await corri(request, ugo, 0, esercizi, 1);
    await setup(request, { azione: 'chiudiTappa', sessionId: giro.sessionId, tappa: 0 });

    await accediDocente(page, `/docente/sessione/${giro.sessionId}`);
    await page.getByLabel('tappe migliori').fill('3');
    await page.getByRole('button', { name: 'Applica' }).click();
    await expect.poll(async () => (await setup(request, { azione: 'leggi', sessionId: giro.sessionId })) as unknown as {
      sessione: { migliori: number };
    }).toMatchObject({ sessione: { migliori: 3 } });

    await page.getByLabel('tappa da aggiungere').selectOption('scala');
    await page.getByRole('button', { name: 'Aggiungi tappa' }).click();
    await expect(page.getByRole('list', { name: 'piano del giro' })).toContainText('Tappa 2 · La scala');
    await expect(page.getByRole('button', { name: /VIA! Tappa 2 · La scala/ })).toBeVisible();
  });

  test('fine del Giro: podio e che cosa rispiegare', async ({ page, request }) => {
    const giro = await creaGiro(request, ['ripeti']);
    const { esercizi } = await setup(request, { azione: 'apri', sessionId: giro.sessionId, tappa: 0, minuti: 10 });
    const bea = await entra(request, giro.code, 'Bea');
    await corri(request, bea, 0, esercizi, 2);
    for (let i = 0; i < 3; i++) {
      await request.post('/api/giro/submit', {
        data: { playerId: bea.playerId, token: bea.token, tappa: 0, km: 2, risposta: 'print("sbagliato")' },
      });
    }
    await setup(request, { azione: 'chiudi', sessionId: giro.sessionId });

    await accediDocente(page, `/docente/sessione/${giro.sessionId}`);
    await expect(page.getByText('Il podio del Giro')).toBeVisible();
    await expect(page.getByText('🥇')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Da rispiegare' })).toBeVisible();
  });
});

test.describe('correzioni sull\'allievo', () => {
  test('corregge il nome, lo rimanda indietro e lo elimina', async ({ page, request }) => {
    const giro = await creaGiro(request, ['ripeti']);
    const { esercizi } = await setup(request, { azione: 'apri', sessionId: giro.sessionId, tappa: 0, minuti: 10 });
    const mirko = await entra(request, giro.code, 'Mirko');
    await corri(request, mirko, 0, esercizi, 3);
    await accediDocente(page, `/docente/sessione/${giro.sessionId}`);

    const riga = classifica(page).filter({ hasText: 'Mirko' });
    await expect(riga).toContainText('3/5 km');

    await riga.click();
    await riga.getByRole('textbox').fill('Mirco');
    await riga.getByRole('button', { name: 'Salva' }).click();
    const corretta = classifica(page).filter({ hasText: 'Mirco' });
    await expect(corretta).toBeVisible();

    await corretta.getByRole('spinbutton').fill('2');
    await corretta.getByRole('button', { name: 'Rimanda' }).click();
    await expect(corretta).toContainText('1/5 km');

    page.on('dialog', (d) => d.accept());
    await corretta.getByRole('button', { name: 'Elimina' }).click();
    await expect(classifica(page).filter({ hasText: 'Mirco' })).toHaveCount(0);
  });
});

test.describe('gare create prima del Giro a tappe', () => {
  test('la dashboard le segnala e la LIM spiega invece di rompersi', async ({ page, request }) => {
    const { sessionId } = await setup(request, { azione: 'creaVecchia' });
    await accediDocente(page);
    await expect(page.locator('article').filter({ hasText: 'classe 1Z' }).first()).toContainText('versione precedente');

    await page.goto(`/docente/sessione/${sessionId}`);
    await expect(page.getByText(/versione di prima del Giro a tappe/)).toBeVisible();
  });
});

test.describe('protezione delle API', () => {
  test('senza accesso le rotte del docente rispondono 401', async ({ request }) => {
    for (const rotta of ['accesso', 'sessioni', 'allievi', 'tappe']) {
      const r = await request.post(`/api/docente/${rotta}`, { data: {} });
      expect(r.status(), rotta).toBe(401);
      expect((await r.json()).error).toBe('UNAUTHENTICATED');
    }
  });

  test('con un token inventato rispondono 401', async ({ request }) => {
    const r = await request.post('/api/docente/tappe', { headers: { Authorization: 'Bearer non-è-un-token' }, data: {} });
    expect(r.status()).toBe(401);
    expect((await r.json()).error).toBe('INVALID_TOKEN');
  });
});
