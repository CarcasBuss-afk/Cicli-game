/* La Cronoscalata dalla parte delle API: la tappa senza cronometro con la scheda del
 * compito, il codice che resta da una fase all'altra, il gregario (finto) che costa un
 * punto, il filtro anti-codice, i rifiuti. */
import { expect, test, type APIRequestContext } from '@playwright/test';

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
