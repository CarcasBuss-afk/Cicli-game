/* Test della parte docente: creazione e via dalla dashboard, vista LIM che si aggiorna in
 * tempo reale mentre un allievo corre, correzioni sul singolo allievo, e il muro di
 * protezione delle API senza accesso. */
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

type Tappa = { risposta: 'codice' | 'output'; soluzione: string };

/** Entra nell'area docente con l'accesso di prova (attivo solo con gli emulatori). */
async function accediDocente(page: Page, dove = '/docente') {
  await page.goto(dove);
  await page.getByRole('button', { name: 'Accesso di prova (emulatori)' }).click();
}

async function creaGara(request: APIRequestContext, numTappe: number, avvia = false) {
  const r = await request.post('/api/giro/test-setup', {
    data: { azione: 'crea', classLabel: '3C', numTappe, avvia },
  });
  return (await r.json()) as { sessionId: string; code: string; numTappe: number; tappe: Tappa[] };
}

/** Fa correre un allievo via API, senza passare dall'interfaccia. */
async function corri(request: APIRequestContext, code: string, nome: string, tappe: Tappa[], fino: number) {
  const ingresso = await request.post('/api/giro/join', { data: { code, name: nome } });
  const p = (await ingresso.json()) as { playerId: string; token: string };
  for (let n = 0; n < fino; n++) {
    const r = await request.post('/api/giro/submit', {
      data: { playerId: p.playerId, token: p.token, tappa: n, risposta: tappe[n].soluzione },
    });
    const esito = await r.json();
    expect(esito.promosso, `tappa ${n}: ${esito.hint ?? esito.message}`).toBe(true);
  }
  return p;
}

test.describe('dashboard', () => {
  test('crea una gara, la avvia e la chiude', async ({ page }) => {
    await accediDocente(page);
    await expect(page.getByRole('heading', { name: /gare/ })).toBeVisible();

    await page.getByPlaceholder('2A').fill('5F');
    await page.getByRole('button', { name: 'Nuova gara' }).click();

    const riga = page.locator('article').filter({ hasText: 'classe 5F' }).first();
    await expect(riga).toBeVisible();
    await expect(riga.getByText('in attesa del via')).toBeVisible();
    // Il codice proiettabile è di 4 caratteri, senza 0/O/1/I
    await expect(riga.locator('span').first()).toHaveText(/^[2-9A-HJ-NP-Z]{4}$/);

    await riga.getByRole('button', { name: 'Via!' }).click();
    await expect(riga.getByText('in corso')).toBeVisible();

    await riga.getByRole('button', { name: 'Chiudi' }).click();
    await expect(riga.getByText('chiusa')).toBeVisible();
  });
});

test.describe('vista LIM', () => {
  test('mostra il codice grande prima del via e poi la corsa', async ({ page, request }) => {
    const gara = await creaGara(request, 5);
    await accediDocente(page, `/docente/sessione/${gara.sessionId}`);

    await expect(page.getByText(gara.code)).toBeVisible();
    await expect(page.getByText('Nessuno in griglia di partenza')).toBeVisible();

    // Un allievo entra: compare in griglia senza ricaricare
    await request.post('/api/giro/join', { data: { code: gara.code, name: 'Rosa' } });
    await expect(page.getByText(/1 in griglia: Rosa/)).toBeVisible();

    await page.getByRole('button', { name: 'VIA!' }).click();
    await expect(page.getByText('Rosa')).toBeVisible();
    await expect(page.getByText(gara.code)).toHaveCount(0);
  });

  test('la corsa si aggiorna entro due secondi dalla consegna', async ({ page, request }) => {
    const gara = await creaGara(request, 6, true);
    await accediDocente(page, `/docente/sessione/${gara.sessionId}`);
    const p = await corri(request, gara.code, 'Gino', gara.tappe, 1);

    const riga = page.getByRole('list', { name: 'classifica' }).locator('li').filter({ hasText: 'Gino' });
    await expect(riga.getByText(`1/${gara.numTappe}`)).toBeVisible({ timeout: 2000 });

    // Avanza ancora: la LIM segue
    await request.post('/api/giro/submit', {
      data: { playerId: p.playerId, token: p.token, tappa: 1, risposta: gara.tappe[1].soluzione },
    });
    await expect(riga.getByText(`2/${gara.numTappe}`)).toBeVisible({ timeout: 2000 });

    // Un errore compare nel conteggio
    await request.post('/api/giro/submit', {
      data: { playerId: p.playerId, token: p.token, tappa: 2, risposta: 'print("no")' },
    });
    await expect(riga.getByText('1 errore')).toBeVisible({ timeout: 2000 });
  });

  test('ordina la classifica e mette la maglia rosa al primo', async ({ page, request }) => {
    const gara = await creaGara(request, 6, true);
    await corri(request, gara.code, 'Ultimo', gara.tappe, 1);
    await corri(request, gara.code, 'Primo', gara.tappe, 4);

    await accediDocente(page, `/docente/sessione/${gara.sessionId}`);
    const righe = page.getByRole('list', { name: 'classifica' }).locator('li');
    await expect(righe.first()).toContainText('Primo');
    await expect(righe.first()).toContainText('👕');
    await expect(righe.last()).toContainText('Ultimo');
  });

  test('a gara chiusa mostra il podio e che cosa rispiegare', async ({ page, request }) => {
    const gara = await creaGara(request, 6, true);
    const p = await corri(request, gara.code, 'Bea', gara.tappe, 2);
    // Qualche errore, così il riepilogo ha di che parlare
    for (let i = 0; i < 3; i++) {
      await request.post('/api/giro/submit', {
        data: { playerId: p.playerId, token: p.token, tappa: 2, risposta: 'print("sbagliato")' },
      });
    }
    await request.post('/api/giro/test-setup', { data: { azione: 'chiudi', sessionId: gara.sessionId } });

    await accediDocente(page, `/docente/sessione/${gara.sessionId}`);
    await expect(page.getByText('🥇')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Da rispiegare' })).toBeVisible();
  });
});

test.describe('correzioni sull\'allievo', () => {
  test('corregge il nome, lo rimanda indietro e lo elimina', async ({ page, request }) => {
    const gara = await creaGara(request, 6, true);
    await corri(request, gara.code, 'Mirko', gara.tappe, 3);
    await accediDocente(page, `/docente/sessione/${gara.sessionId}`);

    const riga = page.getByRole('list', { name: 'classifica' }).locator('li').filter({ hasText: 'Mirko' });
    await expect(riga.getByText(`3/${gara.numTappe}`)).toBeVisible();

    // Nome scritto male all'ingresso
    await riga.click();
    await riga.getByRole('textbox').fill('Mirco');
    await riga.getByRole('button', { name: 'Salva' }).click();
    await expect(page.getByRole('list', { name: 'classifica' }).locator('li').filter({ hasText: 'Mirco' })).toBeVisible();

    // Rimandato alla tappa 2: perde la terza
    const rigaCorretta = page.getByRole('list', { name: 'classifica' }).locator('li').filter({ hasText: 'Mirco' });
    await rigaCorretta.getByRole('spinbutton').fill('2');
    await rigaCorretta.getByRole('button', { name: 'Rimanda' }).click();
    await expect(rigaCorretta.getByText(`1/${gara.numTappe}`)).toBeVisible();

    // Eliminato dalla gara
    page.on('dialog', (d) => d.accept());
    await rigaCorretta.getByRole('button', { name: 'Elimina' }).click();
    await expect(page.getByRole('list', { name: 'classifica' }).locator('li').filter({ hasText: 'Mirco' })).toHaveCount(0);
  });
});

test.describe('protezione delle API', () => {
  test('senza accesso le rotte del docente rispondono 401', async ({ request }) => {
    for (const rotta of ['accesso', 'sessioni', 'allievi']) {
      const r = await request.post(`/api/docente/${rotta}`, { data: {} });
      expect(r.status(), rotta).toBe(401);
      expect((await r.json()).error).toBe('UNAUTHENTICATED');
    }
  });

  test('con un token inventato rispondono 401', async ({ request }) => {
    const r = await request.post('/api/docente/sessioni', {
      headers: { Authorization: 'Bearer non-è-un-token' },
      data: {},
    });
    expect(r.status()).toBe(401);
    expect((await r.json()).error).toBe('INVALID_TOKEN');
  });
});
