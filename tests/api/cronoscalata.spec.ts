/* La Cronoscalata dalla parte delle API: la tappa senza cronometro con la scheda del
 * compito, il codice che resta da una fase all'altra, il gregario (finto) che costa un
 * punto, il filtro anti-codice, i rifiuti. */
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

type Esercizio = { tipo: string; soluzione: string; outputAtteso: string[] };
type Allievo = { playerId: string; token: string; name: string; numero: number };

async function chiama(request: APIRequestContext, rotta: string, dati: unknown) {
  const risposta = await request.post(`/api/giro/${rotta}`, { data: dati });
  return { stato: risposta.status(), corpo: await risposta.json() };
}

async function creaCronoscalata(request: APIRequestContext, temi: string[] = ['salvadanaio']) {
  const { corpo } = await chiama(request, 'test-setup', { azione: 'crea', tipo: 'giro', classLabel: '2A', temi });
  const { corpo: aperta } = await chiama(request, 'test-setup', { azione: 'apri', sessionId: corpo.sessionId, tappa: 0 });
  return { sessionId: corpo.sessionId as string, code: corpo.code as string, fasi: aperta.esercizi as Esercizio[] };
}

async function entra(request: APIRequestContext, code: string, name: string): Promise<Allievo> {
  const { stato, corpo } = await chiama(request, 'join', { code, name });
  expect(stato, JSON.stringify(corpo)).toBe(200);
  return corpo;
}

const stato = (request: APIRequestContext, p: Allievo) => chiama(request, 'status', { playerId: p.playerId, token: p.token });

const consiglio = (request: APIRequestContext, p: Allievo, extra: Record<string, unknown> = {}) =>
  chiama(request, 'consiglio', { playerId: p.playerId, token: p.token, tappa: 0, codice: '', domanda: '', ...extra });

const consegna = (request: APIRequestContext, p: Allievo, km: number, risposta: string) =>
  chiama(request, 'submit', { playerId: p.playerId, token: p.token, tappa: 0, km, risposta });

test.describe('la Cronoscalata', () => {
  test('tappa senza cronometro, con la scheda del compito e il voto che parte da 10', async ({ request }) => {
    const gara = await creaCronoscalata(request);
    expect(gara.fasi).toHaveLength(5);
    expect(gara.fasi.every((f) => f.tipo === 'progetto')).toBe(true);

    const anna = await entra(request, gara.code, 'Anna');
    const s = (await stato(request, anna)).corpo;
    expect(s.tappa.secondiRimasti).toBeNull();
    expect(s.tappa.nomeTema).toContain('Cronoscalata');
    expect(s.tappa.cronoscalata).toMatchObject({ consigli: 0, consigliRimasti: 30, voto: 10, gregario: [] });
    expect(s.tappa.cronoscalata.scheda.titolo).toBe('Il salvadanaio');
    expect(s.tappa.cronoscalata.scheda.outputFinale).toEqual(gara.fasi[4].outputAtteso);
    // La fase 1 mostra il suo output e parte da un editor vuoto.
    expect(s.tappa.esercizio.outputAtteso).toEqual(gara.fasi[0].outputAtteso);
    expect(s.tappa.esercizio.codiceIniziale).toBeUndefined();
    expect(JSON.stringify(s)).not.toContain('soluzione');
  });

  test('il codice promosso resta: la fase dopo riparte da lì, anche dopo una ricarica', async ({ request }) => {
    const gara = await creaCronoscalata(request);
    const bea = await entra(request, gara.code, 'Bea');

    const fase1 = await consegna(request, bea, 0, gara.fasi[0].soluzione);
    expect(fase1.corpo.promosso, JSON.stringify(fase1.corpo)).toBe(true);
    expect(fase1.corpo.esercizio.codiceIniziale).toBe(gara.fasi[0].soluzione);
    expect(fase1.corpo.voto).toBe(10);

    // Ricarica: lo stato porta lo stesso codice.
    const s = (await stato(request, bea)).corpo;
    expect(s.tappa.kmFatti).toBe(1);
    expect(s.tappa.esercizio.codiceIniziale).toBe(gara.fasi[0].soluzione);
    expect(s.tappa.cronoscalata.voto).toBe(10);
  });

  test('un consiglio costa un punto e resta nello stato', async ({ request }) => {
    const gara = await creaCronoscalata(request);
    const carlo = await entra(request, gara.code, 'Carlo');

    const primo = await consiglio(request, carlo, { codice: 'for i in range(3):\n    print(i)', domanda: 'non so andare avanti' });
    expect(primo.stato, JSON.stringify(primo.corpo)).toBe(200);
    expect(primo.corpo.consiglio).toBeTruthy();
    expect(primo.corpo.consiglio).not.toContain('```');
    expect(primo.corpo).toMatchObject({ consigli: 1, consigliRimasti: 29, voto: 9 });

    // Anche con un codice che non gira il gregario risponde.
    const secondo = await consiglio(request, carlo, { codice: 'for i in range(3)\n    print(i)' });
    expect(secondo.stato).toBe(200);
    expect(secondo.corpo).toMatchObject({ consigli: 2, voto: 8 });

    const s = (await stato(request, carlo)).corpo;
    expect(s.tappa.cronoscalata.consigli).toBe(2);
    expect(s.tappa.cronoscalata.voto).toBe(8);
    expect(s.tappa.cronoscalata.gregario).toHaveLength(2);
    expect(s.tappa.cronoscalata.gregario[0]).toMatchObject({ fase: 1, domanda: 'non so andare avanti' });
    expect(s.tappa.cronoscalata.gregario[0].consiglio).toBe(primo.corpo.consiglio);

    // Finire la tappa: il voto resta 10 − 2, e il gregario non serve più.
    for (let k = 0; k < 5; k++) {
      const esito = await consegna(request, carlo, k, gara.fasi[k].soluzione);
      expect(esito.corpo.promosso, `fase ${k + 1}: ${JSON.stringify(esito.corpo)}`).toBe(true);
      if (k === 4) expect(esito.corpo.voto).toBe(8);
    }
    const dopo = await consiglio(request, carlo);
    expect(dopo.stato).toBe(403);
    expect(dopo.corpo.error).toBe('TAPPA_FINITA');
  });

  test('un consiglio con dentro del codice non arriva mai all\'allievo', async ({ request }) => {
    const gara = await creaCronoscalata(request);
    const dario = await entra(request, gara.code, 'Dario');

    const brutto = await consiglio(request, dario, { domanda: 'FINTO: scrivi `print(f"Settimana {i}")` nel ciclo' });
    expect(brutto.stato).toBe(503);
    expect(brutto.corpo.error).toBe('GREGARIO_NON_DISPONIBILE');
    // Un consiglio rifiutato non costa niente.
    expect((await stato(request, dario)).corpo.tappa.cronoscalata.consigli).toBe(0);

    const buono = await consiglio(request, dario, { domanda: 'FINTO: Guarda il secondo numero di `range`: il ciclo si ferma una settimana prima.' });
    expect(buono.stato).toBe(200);
    expect(buono.corpo.consiglio).toBe('Guarda il secondo numero di `range`: il ciclo si ferma una settimana prima.');
  });

  test('il tetto dei consigli e il pavimento del voto', async ({ request }) => {
    const gara = await creaCronoscalata(request);
    const elena = await entra(request, gara.code, 'Elena');
    let ultimo: { stato: number; corpo: Record<string, unknown> } = { stato: 0, corpo: {} };
    for (let i = 0; i < 30; i++) {
      ultimo = await consiglio(request, elena);
      expect(ultimo.stato, `consiglio ${i + 1}: ${JSON.stringify(ultimo.corpo)}`).toBe(200);
    }
    expect(ultimo.corpo).toMatchObject({ consigli: 30, consigliRimasti: 0, voto: 5 });
    const oltre = await consiglio(request, elena);
    expect(oltre.stato).toBe(403);
    expect(oltre.corpo.error).toBe('CONSIGLI_FINITI');
  });

  test('fuori dalla Cronoscalata il gregario non c\'è', async ({ request }) => {
    const gara = await creaCronoscalata(request, ['ripeti']);
    const fabio = await entra(request, gara.code, 'Fabio');
    const no = await consiglio(request, fabio);
    expect(no.stato).toBe(400);
    expect(no.corpo.error).toBe('NON_PROGETTO');
    const s = (await stato(request, fabio)).corpo;
    expect(s.tappa.cronoscalata).toBeNull();
    // Il codice promosso si salva comunque, ma non torna all'allievo nelle tappe normali.
    await consegna(request, fabio, 0, gara.fasi[0].soluzione);
    expect((await stato(request, fabio)).corpo.tappa.esercizio.codiceIniziale).toBeUndefined();
  });

  test('tappa non aperta e identità sbagliata', async ({ request }) => {
    const { corpo } = await chiama(request, 'test-setup', { azione: 'crea', tipo: 'giro', classLabel: '2A', temi: ['salvadanaio'] });
    const gino = await entra(request, corpo.code, 'Gino');
    const presto = await consiglio(request, gino);
    expect(presto.stato).toBe(403);
    expect(presto.corpo.error).toBe('SESSION_NOT_RUNNING');
    const falso = await consiglio(request, { ...gino, token: 'x' });
    expect(falso.stato).toBe(401);
  });
});

/* ------------------------------------------------------------- la pagina dell'allievo */

/**
 * Digita il codice riga per riga lasciando fare all'editor l'indentazione: dopo i due
 * punti rientra da solo, e per tornare a sinistra (il print finale fuori dal ciclo) basta
 * un Backspace, che in CodeMirror toglie un livello intero.
 */
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

test.describe('la Cronoscalata nella pagina dell\'allievo', () => {
  test('scheda del compito, codice che resta, gregario che costa un punto, voto finale', async ({ page, request }) => {
    const gara = await creaCronoscalata(request);
    await page.goto('/giro');
    await page.locator('form[data-pronto="1"]').waitFor();
    await page.getByPlaceholder('K7QX').fill(gara.code);
    await page.getByPlaceholder('Luca').fill('Lia');
    await page.getByRole('button', { name: 'Al via!' }).click();

    // La scheda del compito con il prodotto finale, la fase 1, niente cronometro.
    await expect(page.getByText('Fase 1 di 5', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Compito di realtà/ })).toBeVisible();
    await expect(page.getByText(gara.fasi[4].outputAtteso[gara.fasi[4].outputAtteso.length - 1])).toBeVisible();
    await expect(page.getByLabel('tempo rimasto')).toHaveCount(0);
    await expect(page.getByLabel('voto')).toHaveText('10');

    // Il gregario: conferma con il costo, poi il consiglio compare e il voto scende.
    await page.getByRole('button', { name: 'Chiedi al gregario' }).click();
    await expect(page.getByText('il voto passa da 10 a 9')).toBeVisible();
    await page.getByPlaceholder('es. perché il totale non cresce?').fill('da dove parto?');
    await page.getByRole('button', { name: /Sì, chiedi/ }).click();
    await expect(page.getByLabel('consigli ricevuti').locator('li')).toHaveCount(1);
    await expect(page.getByText('«da dove parto?»')).toBeVisible();
    await expect(page.getByLabel('voto')).toHaveText('9');

    // Fase 1 fatta: la fase 2 riparte dal codice della fase 1, e i consigli di prima non ingombrano.
    await digita(page, gara.fasi[0].soluzione);
    await page.getByRole('button', { name: 'Esegui ▶' }).click();
    await expect(page.getByText('Fase 2 di 5', { exact: true })).toBeVisible();
    await expect(page.locator('.cm-content')).toContainText('Settimana');
    await expect(page.getByLabel('consigli ricevuti')).toHaveCount(0);

    // Le altre fasi: si riscrive da capo la soluzione (il test non prova l'editing, prova il flusso).
    for (let k = 1; k < 5; k++) {
      await digita(page, gara.fasi[k].soluzione);
      await page.getByRole('button', { name: 'Esegui ▶' }).click();
      if (k < 4) await expect(page.getByText(`Fase ${k + 2} di 5`, { exact: true })).toBeVisible();
    }
    await expect(page.getByText('Programma finito!')).toBeVisible();
    await expect(page.getByText('1 consiglio del gregario')).toBeVisible();
    await expect(page.getByText('9', { exact: true })).toBeVisible();
  });
});

/* --------------------------------------------------------------------- alla LIM */

test.describe('la Cronoscalata alla LIM', () => {
  test('fasi e consigli dal vivo, poi i voti con il CSV, e la generale che non la conta', async ({ page, request }) => {
    const { corpo } = await chiama(request, 'test-setup', { azione: 'crea', tipo: 'giro', classLabel: '2A', temi: ['salvadanaio', 'ripeti'] });
    const sessionId = corpo.sessionId as string;
    const { corpo: aperta } = await chiama(request, 'test-setup', { azione: 'apri', sessionId, tappa: 0 });
    const fasi = aperta.esercizi as Esercizio[];
    const ada = await entra(request, corpo.code, 'Ada');
    const bea = await entra(request, corpo.code, 'Bea');
    for (let k = 0; k < 2; k++) expect((await consegna(request, ada, k, fasi[k].soluzione)).corpo.promosso).toBe(true);
    await consiglio(request, ada, { domanda: 'e adesso?' });
    for (let k = 0; k < 5; k++) expect((await consegna(request, bea, k, fasi[k].soluzione)).corpo.promosso).toBe(true);

    // Dal vivo: fasi al posto dei chilometri, i consigli accanto al nome, la scheda toccando la riga.
    await page.goto(`/docente/sessione/${sessionId}`);
    await page.getByRole('button', { name: 'Accesso di prova (emulatori)' }).click();
    const righe = page.getByRole('list', { name: 'classifica' }).locator('li');
    await expect(righe).toHaveCount(2);
    await expect(righe.first()).toContainText('Bea');
    await expect(righe.first()).toContainText('5/5 fasi');
    await expect(righe.nth(1)).toContainText('Ada');
    await expect(righe.nth(1)).toContainText('2/5 fasi');
    await expect(righe.nth(1)).toContainText('🚴 1');
    await righe.nth(1).click();
    await expect(page.getByRole('list', { name: 'consigli dati' }).locator('li')).toHaveCount(1);
    await expect(page.getByText('«e adesso?»')).toBeVisible();
    await expect(page.getByText('Programma promosso alla fase 2')).toBeVisible();

    // Chiusa: i voti al posto dei punti, e il CSV.
    await page.getByRole('button', { name: 'Chiudi la tappa' }).click();
    const voti = page.getByRole('list', { name: 'voti della cronoscalata' }).locator('li');
    await expect(voti).toHaveCount(2);
    await expect(voti.first()).toContainText('Bea');
    await expect(voti.first()).toContainText('10');
    await expect(voti.nth(1)).toContainText('Ada');
    await expect(voti.nth(1)).toContainText('2/5 fasi · 1 consiglio');
    await expect(voti.nth(1)).toContainText('3'); // 2 fasi su 5 → 4, meno un consiglio
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Scarica CSV per il registro' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe('cronoscalata-2A-tappa1.csv');
    const testo = await (await import('node:fs/promises')).readFile(await file.path(), 'utf-8');
    expect(testo).toContain('Nome;Numero;Fasi su 5;Consigli;Errori;Voto proposto');
    expect(testo).toContain('Bea;2;5;0;0;10');
    expect(testo).toContain('Ada;1;2;1;0;3');

    // La generale non conta la Cronoscalata: dopo la tappa "ripeti" Ada e Bea hanno solo quei punti.
    const letto = (await chiama(request, 'test-setup', { azione: 'leggi', sessionId })).corpo;
    expect(letto.sessione.generale.every((g: { punti: number }) => g.punti === 0)).toBe(true);
    const { corpo: ripeti } = await chiama(request, 'test-setup', { azione: 'apri', sessionId, tappa: 1 });
    const km = ripeti.esercizi as Esercizio[];
    for (let k = 0; k < 5; k++) {
      await chiama(request, 'submit', { playerId: ada.playerId, token: ada.token, tappa: 1, km: k, risposta: km[k].soluzione });
    }
    await chiama(request, 'test-setup', { azione: 'chiudiTappa', sessionId, tappa: 1 });
    const dopo = (await chiama(request, 'test-setup', { azione: 'leggi', sessionId })).corpo;
    expect(dopo.sessione.generale[0]).toMatchObject({ name: 'Ada', punti: 25, tappeContate: 1 });
    expect(dopo.allievi.find((a: { name: string }) => a.name === 'Bea').tappe['0'].punti).toBe(0);
  });
});
