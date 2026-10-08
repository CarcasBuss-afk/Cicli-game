/* Test del gioco come lo vive l'allievo: dall'ingresso al traguardo passando dal
 * mini-editor, con la tastiera, come in laboratorio.
 *
 * Il codice si scrive davvero premendo i tasti: così si verifica anche che le parentesi e
 * le virgolette che si chiudono da sole, l'indentazione automatica e il menu dei
 * suggerimenti non rovinino quello che l'allievo digita. */
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

type Tappa = { tipo: string; risposta: 'codice' | 'output'; soluzione: string; outputAtteso: string[] };

async function creaGara(request: APIRequestContext, numTappe: number) {
  const risposta = await request.post('/api/giro/test-setup', {
    data: { azione: 'crea', classLabel: '2A', numTappe, avvia: true },
  });
  return (await risposta.json()) as { sessionId: string; code: string; numTappe: number; tappe: Tappa[] };
}

/**
 * Riscrive la soluzione in una forma che si può digitare di seguito senza combattere con
 * l'indentazione automatica: il corpo del ciclo va sulla riga del `for`, che il
 * micro-interprete accetta (`for i in range(3): print(i)`).
 */
function daDigitare(soluzione: string): string {
  const righe: string[] = [];
  for (const riga of soluzione.split('\n')) {
    if (/^\s+/.test(riga) && righe.length > 0) righe[righe.length - 1] += ` ${riga.trim()}`;
    else righe.push(riga.trim());
  }
  return righe.join('\n');
}

/** Scrive nell'editor (o nella casella dell'output) e consegna. */
async function consegna(page: Page, testo: string, modo: 'codice' | 'output') {
  if (modo === 'output') {
    await page.locator('textarea').fill(testo);
  } else {
    const editor = page.locator('.cm-content');
    await editor.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await page.keyboard.type(daDigitare(testo), { delay: 8 });
  }
  await page.getByRole('button', { name: /Esegui|Controlla/ }).click();
}

/** Compila il modulo d'ingresso. Aspetta `data-pronto`: finché il JavaScript della pagina
 *  non è idratato il pulsante non farebbe niente. */
async function registrati(page: Page, code: string, nome: string) {
  await page.goto('/');
  await page.locator('form[data-pronto="1"]').waitFor();
  await page.getByPlaceholder('K7QX').fill(code);
  await page.getByPlaceholder('Luca').fill(nome);
  await page.getByRole('button', { name: 'Al via!' }).click();
}

async function entra(page: Page, code: string, nome: string) {
  await registrati(page, code, nome);
  await expect(page.getByText(/Tappa 1\b/)).toBeVisible();
}

test.describe('la gara dalla parte dell\'allievo', () => {
  test('ingresso, errore con suggerimento, tappe e traguardo', async ({ page, request }) => {
    const gara = await creaGara(request, 5);
    await entra(page, gara.code, 'Luca');

    // --- La prima tappa è in pagina, con la consegna
    await expect(page.getByText(`di ${gara.numTappe}`)).toBeVisible();

    // --- Risposta sbagliata: arriva il suggerimento, la tappa non cambia
    await consegna(page, 'print("sbagliato")', gara.tappe[0].risposta);
    await expect(page.getByRole('status')).toBeVisible();
    await expect(page.getByText(/Tappa 1\b/)).toBeVisible();

    // --- Risposta giusta: si passa alla tappa 2
    await consegna(page, gara.tappe[0].soluzione, gara.tappe[0].risposta);
    await expect(page.getByText(/Tappa 2\b/)).toBeVisible();

    // --- Tutte le altre tappe
    for (let n = 1; n < gara.numTappe; n++) {
      await consegna(page, gara.tappe[n].soluzione, gara.tappe[n].risposta);
      if (n + 1 < gara.numTappe) {
        await expect(page.getByText(new RegExp(`Tappa ${n + 2}\\b`))).toBeVisible();
      }
    }

    // --- Traguardo
    await expect(page.getByText('Hai finito il Giro!')).toBeVisible();
    await expect(page.getByText(/Sei arrivato 1°/)).toBeVisible();
    await expect(page.getByText(/1 errore/)).toBeVisible();
  });

  test('quello che si digita nell\'editor arriva intatto al server', async ({ page, request }) => {
    // Le parentesi e le virgolette che si chiudono da sole potrebbero raddoppiarsi: se
    // succedesse, questa tappa non passerebbe.
    const gara = await creaGara(request, 4);
    const primaTappa = gara.tappe[0];
    test.skip(primaTappa.risposta !== 'codice', 'la prima tappa non si scrive in codice');

    await entra(page, gara.code, 'Sara');
    await consegna(page, primaTappa.soluzione, 'codice');
    await expect(page.getByText(/Tappa 2\b/)).toBeVisible();
    // Nessun suggerimento: era giusta al primo colpo
    await expect(page.getByRole('status')).toHaveCount(0);
  });

  test('il codice da completare arriva già scritto nell\'editor', async ({ page, request }) => {
    const gara = await creaGara(request, 12);
    const indice = gara.tappe.findIndex((t) => t.tipo === 'completa-range');
    test.skip(indice < 0, 'questo percorso non ha tappe da completare');

    await entra(page, gara.code, 'Marco');
    for (let n = 0; n < indice; n++) {
      await consegna(page, gara.tappe[n].soluzione, gara.tappe[n].risposta);
      await expect(page.getByText(new RegExp(`Tappa ${n + 2}\\b`))).toBeVisible();
    }
    // L'editor contiene il ciclo con i trattini da sostituire
    await expect(page.locator('.cm-content')).toContainText('range(__');
  });
});

test.describe('attesa e ripresa', () => {
  test('prima del via si vede la griglia di partenza', async ({ page, request }) => {
    const risposta = await request.post('/api/giro/test-setup', {
      data: { azione: 'crea', classLabel: '2B', numTappe: 4, avvia: false },
    });
    const gara = (await risposta.json()) as { sessionId: string; code: string };

    await registrati(page, gara.code, 'Nadia');

    await expect(page.getByText('Aspetta il via del prof.')).toBeVisible();
    await expect(page.getByText(/classe 2B/)).toBeVisible();

    // Il prof dà il via: la pagina riparte da sola (ricontrolla ogni 10 secondi)
    await request.post('/api/giro/test-setup', { data: { azione: 'avvia', sessionId: gara.sessionId } });
    await expect(page.getByText(/Tappa 1\b/)).toBeVisible({ timeout: 20_000 });
  });

  test('ricaricando la pagina si riprende dalla tappa giusta', async ({ page, request }) => {
    const gara = await creaGara(request, 5);
    await entra(page, gara.code, 'Omar');
    await consegna(page, gara.tappe[0].soluzione, gara.tappe[0].risposta);
    await expect(page.getByText(/Tappa 2\b/)).toBeVisible();

    await page.reload();
    await expect(page.getByText(/Tappa 2\b/)).toBeVisible();
    await expect(page.getByText('Omar')).toBeVisible();
  });

  test('cambiando PC si rientra con il numero di corsa', async ({ page, browser, request }) => {
    const gara = await creaGara(request, 5);
    await entra(page, gara.code, 'Rino');

    // Il numero è scritto in pagina: è quello che l'allievo legge dalla LIM
    const numero = (await page.getByText(/n\. \d+/).first().innerText()).replace(/\D/g, '');
    expect(numero).not.toBe('');

    await consegna(page, gara.tappe[0].soluzione, gara.tappe[0].risposta);
    await expect(page.getByText(/Tappa 2\b/)).toBeVisible();

    // Un altro PC: browser nuovo, nessuna memoria di questo allievo
    const altroPc = await browser.newContext();
    const altraPagina = await altroPc.newPage();
    await altraPagina.goto('/');
    await altraPagina.locator('form[data-pronto="1"]').waitFor();
    await altraPagina.getByPlaceholder('K7QX').fill(gara.code);
    await altraPagina.getByRole('tab', { name: 'Ho già un numero' }).click();
    await altraPagina.getByRole('spinbutton').fill(numero);
    await altraPagina.getByRole('button', { name: 'Torna in gara' }).click();

    // Riprende dalla tappa dov'era, con il suo nome
    await expect(altraPagina.getByText(/Tappa 2\b/)).toBeVisible();
    await expect(altraPagina.getByText('Rino')).toBeVisible();
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
    await expect(page.getByText(/Tappa 1\b/)).toBeVisible();
  });
});

test.describe('errori mostrati bene', () => {
  test('il codice scritto male riceve il messaggio del micro-interprete', async ({ page, request }) => {
    const gara = await creaGara(request, 4);
    test.skip(gara.tappe[0].risposta !== 'codice', 'la prima tappa non si scrive in codice');
    await entra(page, gara.code, 'Ivan');

    // Due punti dimenticati
    await consegna(page, 'for i in range(3) print(i)', 'codice');
    await expect(page.getByRole('status')).toContainText('due punti');

    // Gli apici inversi dei messaggi non si vedono a schermo: li rende il componente Testo
    await expect(page.getByRole('status')).not.toContainText('`');
  });

  test('output giusto ma ottenuto con i print a mano', async ({ page, request }) => {
    const gara = await creaGara(request, 5);
    const prima = gara.tappe[0];
    await entra(page, gara.code, 'Petra');

    // Le righe giuste, ripetute a mano senza ciclo: l'output coincide, la tappa no.
    const aMano = prima.outputAtteso.map((riga) => `print("${riga}")`).join('\n');
    await consegna(page, aMano, 'codice');
    await expect(page.getByRole('status')).toContainText('ciclo');
    await expect(page.getByText(/Tappa 1\b/)).toBeVisible();
  });
});
