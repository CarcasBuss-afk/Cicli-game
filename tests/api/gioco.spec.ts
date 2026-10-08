/* Test del gioco come lo vive l'allievo: dall'ingresso al traguardo passando dal
 * mini-editor, con la tastiera, come in laboratorio. Poi il Giro: cronometro, tempo
 * scaduto, risultati fra una tappa e l'altra.
 *
 * Il codice si scrive davvero premendo i tasti: così si verifica anche che le parentesi e
 * le virgolette che si chiudono da sole, l'indentazione automatica e il menu dei
 * suggerimenti non rovinino quello che l'allievo digita. */
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

type Esercizio = { tipo: string; risposta: 'codice' | 'output'; soluzione: string; outputAtteso: string[] };

async function setup(request: APIRequestContext, dati: Record<string, unknown>) {
  return (await (await request.post('/api/giro/test-setup', { data: dati })).json()) as {
    sessionId: string;
    code: string;
    esercizi: Esercizio[];
  };
}

/** Gara singola già partita. */
const creaGara = (request: APIRequestContext, km: number) =>
  setup(request, { azione: 'crea', classLabel: '2A', km, apri: true });

/**
 * Riscrive la soluzione in una forma che si può digitare di seguito senza combattere con
 * l'indentazione automatica: il corpo del ciclo va sulla riga del `for`.
 */
function daDigitare(soluzione: string): string {
  const righe: string[] = [];
  for (const riga of soluzione.split('\n')) {
    if (/^\s+/.test(riga) && righe.length > 0) righe[righe.length - 1] += ` ${riga.trim()}`;
    else righe.push(riga.trim());
  }
  return righe.join('\n');
}

async function consegna(page: Page, testo: string, modo: 'codice' | 'output') {
  if (modo === 'output') {
    await page.locator('textarea').fill(testo);
  } else {
    await page.locator('.cm-content').click();
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await page.keyboard.type(daDigitare(testo), { delay: 8 });
  }
  await page.getByRole('button', { name: /Esegui|Controlla/ }).click();
}

/** Compila l'ingresso. Aspetta `data-pronto`: prima dell'idratazione il pulsante non fa niente. */
async function registrati(page: Page, code: string, nome: string) {
  await page.goto('/');
  await page.locator('form[data-pronto="1"]').waitFor();
  await page.getByPlaceholder('K7QX').fill(code);
  await page.getByPlaceholder('Luca').fill(nome);
  await page.getByRole('button', { name: 'Al via!' }).click();
}

async function entra(page: Page, code: string, nome: string) {
  await registrati(page, code, nome);
  await expect(page.getByText(/Km 1\b/)).toBeVisible();
}

test.describe('la gara dalla parte dell\'allievo', () => {
  test('ingresso, errore con suggerimento, chilometri e traguardo', async ({ page, request }) => {
    const gara = await creaGara(request, 5);
    await entra(page, gara.code, 'Luca');
    await expect(page.getByText('di 5')).toBeVisible();

    await consegna(page, 'print("sbagliato")', gara.esercizi[0].risposta);
    await expect(page.getByRole('status')).toBeVisible();
    await expect(page.getByText(/Km 1\b/)).toBeVisible();

    await consegna(page, gara.esercizi[0].soluzione, gara.esercizi[0].risposta);
    await expect(page.getByText(/Km 2\b/)).toBeVisible();

    for (let k = 1; k < gara.esercizi.length; k++) {
      await consegna(page, gara.esercizi[k].soluzione, gara.esercizi[k].risposta);
      if (k + 1 < gara.esercizi.length) await expect(page.getByText(new RegExp(`Km ${k + 2}\\b`))).toBeVisible();
    }

    await expect(page.getByText('Hai finito la gara!')).toBeVisible();
    await expect(page.getByText(/Sei arrivato 1°/)).toBeVisible();
    await expect(page.getByText(/1 errore/)).toBeVisible();
  });

  test('quello che si digita nell\'editor arriva intatto al server', async ({ page, request }) => {
    const gara = await creaGara(request, 4);
    test.skip(gara.esercizi[0].risposta !== 'codice', 'il primo esercizio non si scrive in codice');
    await entra(page, gara.code, 'Sara');
    await consegna(page, gara.esercizi[0].soluzione, 'codice');
    await expect(page.getByText(/Km 2\b/)).toBeVisible();
    await expect(page.getByRole('status')).toHaveCount(0);
  });

  test('il codice da completare arriva già scritto nell\'editor', async ({ page, request }) => {
    const gara = await creaGara(request, 12);
    const indice = gara.esercizi.findIndex((e) => e.tipo === 'completa-range');
    test.skip(indice < 0, 'questo percorso non ha esercizi da completare');
    await entra(page, gara.code, 'Marco');
    for (let k = 0; k < indice; k++) {
      await consegna(page, gara.esercizi[k].soluzione, gara.esercizi[k].risposta);
      await expect(page.getByText(new RegExp(`Km ${k + 2}\\b`))).toBeVisible();
    }
    await expect(page.locator('.cm-content')).toContainText('range(__');
  });
});

test.describe('attesa e ripresa', () => {
  test('prima del via si aspetta, poi la pagina parte da sola', async ({ page, request }) => {
    const gara = await setup(request, { azione: 'crea', classLabel: '2B', km: 4 });
    await registrati(page, gara.code, 'Nadia');
    await expect(page.getByText('Aspetta che il prof apra la prima tappa.')).toBeVisible();
    await expect(page.getByText('Il tuo numero di corsa')).toBeVisible();

    await setup(request, { azione: 'apri', sessionId: gara.sessionId, tappa: 0 });
    await expect(page.getByText(/Km 1\b/)).toBeVisible({ timeout: 20_000 });
  });

  test('ricaricando la pagina si riprende dal chilometro giusto', async ({ page, request }) => {
    const gara = await creaGara(request, 5);
    await entra(page, gara.code, 'Omar');
    await consegna(page, gara.esercizi[0].soluzione, gara.esercizi[0].risposta);
    await expect(page.getByText(/Km 2\b/)).toBeVisible();
    await page.reload();
    await expect(page.getByText(/Km 2\b/)).toBeVisible();
  });

  test('cambiando PC si rientra con il numero di corsa', async ({ page, browser, request }) => {
    const gara = await creaGara(request, 5);
    await entra(page, gara.code, 'Rino');
    const numero = (await page.getByText(/n\. \d+/).first().innerText()).replace(/\D/g, '');
    await consegna(page, gara.esercizi[0].soluzione, gara.esercizi[0].risposta);
    await expect(page.getByText(/Km 2\b/)).toBeVisible();

    const altroPc = await browser.newContext();
    const altra = await altroPc.newPage();
    await altra.goto('/');
    await altra.locator('form[data-pronto="1"]').waitFor();
    await altra.getByPlaceholder('K7QX').fill(gara.code);
    await altra.getByRole('tab', { name: 'Ho già un numero' }).click();
    await altra.getByRole('spinbutton').fill(numero);
    await altra.getByRole('button', { name: 'Torna in gara' }).click();
    await expect(altra.getByText(/Km 2\b/)).toBeVisible();
    await expect(altra.getByText('Rino')).toBeVisible();
    await altroPc.close();
  });

  test('un numero che non esiste lo dice', async ({ page, request }) => {
    const gara = await creaGara(request, 4);
    await page.goto('/');
    await page.locator('form[data-pronto="1"]').waitFor();
    await page.getByPlaceholder('K7QX').fill(gara.code);
    await page.getByRole('tab', { name: 'Ho già un numero' }).click();
    await page.getByRole('spinbutton').fill('42');
    await page.getByRole('button', { name: 'Torna in gara' }).click();
    await expect(page.getByText(/Nessun corridore con il numero 42/)).toBeVisible();
  });

  test('senza registrazione la gara rimanda all\'ingresso', async ({ page }) => {
    await page.goto('/gara');
    await expect(page.getByRole('button', { name: 'Al via!' })).toBeVisible();
  });

  test('chi è già entrato trova il pulsante per riprendere', async ({ page, request }) => {
    const gara = await creaGara(request, 4);
    await entra(page, gara.code, 'Elsa');
    await page.goto('/');
    await expect(page.getByText('Su questo computer stava correndo')).toBeVisible();
    await page.getByRole('button', { name: 'Sono io, riprendi' }).click();
    await expect(page.getByText(/Km 1\b/)).toBeVisible();
  });
});

test.describe('il Giro dalla parte dell\'allievo', () => {
  test('cronometro, tempo scaduto e risultato della tappa', async ({ page, request }) => {
    const giro = await setup(request, { azione: 'crea', tipo: 'giro', classLabel: '2C', temi: ['ripeti', 'contare'] });
    const { esercizi } = await setup(request, { azione: 'apri', sessionId: giro.sessionId, tappa: 0, minuti: 10 });
    await entra(page, giro.code, 'Teo');

    // La tappa tematica ha nome, 5 km e il cronometro
    await expect(page.getByText('Tappa 1 · Ripetere')).toBeVisible();
    await expect(page.getByText('di 5')).toBeVisible();
    await expect(page.getByLabel('tempo rimasto')).toContainText(/\d:\d\d/);

    await consegna(page, esercizi[0].soluzione, esercizi[0].risposta);
    await expect(page.getByText(/Km 2\b/)).toBeVisible();

    // Il tempo scade: la pagina se ne accorge da sola
    await setup(request, { azione: 'scadi', sessionId: giro.sessionId });
    await expect(page.getByText('Tempo scaduto!')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Hai percorso 1 km su 5')).toBeVisible();

    // Il prof chiude la tappa: arrivano posizione, punti e classifica generale
    await setup(request, { azione: 'chiudiTappa', sessionId: giro.sessionId, tappa: 0 });
    await expect(page.getByText('Tappa chiusa')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('1° posto')).toBeVisible();
    await expect(page.getByText('Classifica generale')).toBeVisible();
    await expect(page.getByText('Aspetta la prossima tappa.')).toBeVisible();

    // E quando apre la seconda, si riparte
    await setup(request, { azione: 'apri', sessionId: giro.sessionId, tappa: 1, minuti: 10 });
    await expect(page.getByText('Tappa 2 · Contare con range')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Km 1\b/)).toBeVisible();
  });
});

test.describe('errori mostrati bene', () => {
  test('il codice scritto male riceve il messaggio del micro-interprete', async ({ page, request }) => {
    const gara = await creaGara(request, 4);
    test.skip(gara.esercizi[0].risposta !== 'codice', 'il primo esercizio non si scrive in codice');
    await entra(page, gara.code, 'Ivan');
    await consegna(page, 'for i in range(3) print(i)', 'codice');
    await expect(page.getByRole('status')).toContainText('due punti');
    await expect(page.getByRole('status')).not.toContainText('`');
  });

  test('output giusto ma ottenuto con i print a mano', async ({ page, request }) => {
    const gara = await creaGara(request, 5);
    await entra(page, gara.code, 'Petra');
    const aMano = gara.esercizi[0].outputAtteso.map((riga) => `print("${riga}")`).join('\n');
    await consegna(page, aMano, 'codice');
    await expect(page.getByRole('status')).toContainText('ciclo');
    await expect(page.getByText(/Km 1\b/)).toBeVisible();
  });
});
