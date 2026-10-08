/* Test delle API della gara contro l'emulatore Firestore: la gara singola dall'ingresso al
 * traguardo, il Giro a tappe con punti e classifica generale, il tempo che scade, il
 * rientro col numero di corsa, e tutti i rifiuti previsti. */
import { expect, test, type APIRequestContext } from '@playwright/test';

type Esercizio = {
  tipo: string;
  risposta: 'codice' | 'output';
  soluzione: string;
  mostraOutput: boolean;
  outputAtteso: string[];
};

type Allievo = { playerId: string; token: string; name: string; numero: number };

async function chiama(request: APIRequestContext, rotta: string, dati: unknown) {
  const risposta = await request.post(`/api/giro/${rotta}`, { data: dati });
  return { stato: risposta.status(), corpo: await risposta.json() };
}

/** Gara singola (una tappa mista). Con `apri` la tappa parte subito e tornano gli esercizi. */
async function creaGara(request: APIRequestContext, opzioni: { km?: number; apri?: boolean; minuti?: number } = {}) {
  const { corpo } = await chiama(request, 'test-setup', {
    azione: 'crea',
    classLabel: '2A',
    km: opzioni.km ?? 6,
    apri: opzioni.apri ?? false,
    minuti: opzioni.minuti,
  });
  return corpo as { sessionId: string; code: string; numTappe: number; esercizi: Esercizio[] };
}

/** Giro a tappe tematiche, ancora da aprire. */
async function creaGiro(request: APIRequestContext, temi: string[], migliori?: number) {
  const { corpo } = await chiama(request, 'test-setup', { azione: 'crea', tipo: 'giro', classLabel: '2A', temi, migliori });
  return corpo as { sessionId: string; code: string; numTappe: number };
}

async function apri(request: APIRequestContext, sessionId: string, tappa: number, minuti?: number) {
  const { corpo } = await chiama(request, 'test-setup', { azione: 'apri', sessionId, tappa, minuti });
  return corpo.esercizi as Esercizio[];
}

async function entra(request: APIRequestContext, code: string, name: string): Promise<Allievo> {
  const { stato, corpo } = await chiama(request, 'join', { code, name });
  expect(stato, JSON.stringify(corpo)).toBe(200);
  return corpo;
}

const stato = (request: APIRequestContext, p: Allievo) => chiama(request, 'status', { playerId: p.playerId, token: p.token });

/** Consegna le soluzioni dei chilometri da `da` (incluso) a `fino` (escluso). */
async function corri(request: APIRequestContext, p: Allievo, tappa: number, esercizi: Esercizio[], da: number, fino: number) {
  for (let k = da; k < fino; k++) {
    const esito = await chiama(request, 'submit', {
      playerId: p.playerId,
      token: p.token,
      tappa,
      km: k,
      risposta: esercizi[k].soluzione,
    });
    expect(esito.corpo.promosso, `km ${k}: ${JSON.stringify(esito.corpo)}`).toBe(true);
  }
}

test.describe('gara singola', () => {
  test('dall\'ingresso al traguardo', async ({ request }) => {
    const gara = await creaGara(request, { km: 6 });
    const luca = await entra(request, gara.code, '  luca  ');
    expect(luca.name).toBe('Luca');

    // In attesa del via: lo stato si legge, la tappa non c'è
    const attesa = await stato(request, luca);
    expect(attesa.corpo.sessionStatus).toBe('waiting');
    expect(attesa.corpo.tappa).toBeNull();
    expect(attesa.corpo.singola).toBe(true);

    const presto = await chiama(request, 'submit', { playerId: luca.playerId, token: luca.token, tappa: 0, km: 0, risposta: 'x' });
    expect(presto.stato).toBe(403);
    expect(presto.corpo.error).toBe('SESSION_NOT_RUNNING');

    // Via!
    const esercizi = await apri(request, gara.sessionId, 0);
    const inGara = await stato(request, luca);
    expect(inGara.corpo.sessionStatus).toBe('running');
    expect(inGara.corpo.tappa).toMatchObject({ indice: 0, km: 6, kmFatti: 0, finita: false, scaduta: false });
    expect(inGara.corpo.tappa.secondiRimasti).toBeNull(); // la gara singola non ha limite
    expect(JSON.stringify(inGara.corpo.tappa.esercizio)).not.toContain('soluzione');

    // Risposta sbagliata: 200 con l'hint, il chilometro non cambia
    const sbagliata = await chiama(request, 'submit', {
      playerId: luca.playerId,
      token: luca.token,
      tappa: 0,
      km: 0,
      risposta: 'print("sbagliato")',
    });
    expect(sbagliata.stato).toBe(200);
    expect(sbagliata.corpo.promosso).toBe(false);
    expect(sbagliata.corpo.hint).toBeTruthy();
    expect((await stato(request, luca)).corpo.tappa.kmFatti).toBe(0);

    // Giusta: avanza e arriva il chilometro dopo
    const giusta = await chiama(request, 'submit', {
      playerId: luca.playerId,
      token: luca.token,
      tappa: 0,
      km: 0,
      risposta: esercizi[0].soluzione,
    });
    expect(giusta.corpo).toMatchObject({ promosso: true, kmFatti: 1, finita: false });
    expect(giusta.corpo.esercizio.consegna).toBeTruthy();

    // Riconsegnare un chilometro già fatto viene rifiutato
    const ripetuto = await chiama(request, 'submit', {
      playerId: luca.playerId,
      token: luca.token,
      tappa: 0,
      km: 0,
      risposta: esercizi[0].soluzione,
    });
    expect(ripetuto.stato).toBe(409);
    expect(ripetuto.corpo.error).toBe('INVALID_KM');

    await corri(request, luca, 0, esercizi, 1, 6);
    const fine = await stato(request, luca);
    expect(fine.corpo.tappa).toMatchObject({ finita: true, ordineArrivo: 1, kmFatti: 6, esercizio: null });
    expect(fine.corpo.erroriTotali).toBe(1);

    const dopo = await chiama(request, 'submit', { playerId: luca.playerId, token: luca.token, tappa: 0, km: 5, risposta: 'x' });
    expect(dopo.stato).toBe(403);
    expect(dopo.corpo.error).toBe('TAPPA_FINITA');
  });

  test('il secondo che finisce è secondo, anche se ha cominciato prima', async ({ request }) => {
    const gara = await creaGara(request, { km: 4, apri: true });
    const sara = await entra(request, gara.code, 'Sara');
    const marco = await entra(request, gara.code, 'Marco');
    await corri(request, sara, 0, gara.esercizi, 0, 2);
    await corri(request, marco, 0, gara.esercizi, 0, 4);
    await corri(request, sara, 0, gara.esercizi, 2, 4);
    expect((await stato(request, marco)).corpo.tappa.ordineArrivo).toBe(1);
    expect((await stato(request, sara)).corpo.tappa.ordineArrivo).toBe(2);
  });
});

test.describe('Giro a tappe', () => {
  test('punti alla chiusura della tappa e classifica generale', async ({ request }) => {
    const giro = await creaGiro(request, ['ripeti', 'contare']);
    expect(giro.numTappe).toBe(2);
    const ada = await entra(request, giro.code, 'Ada');
    const bea = await entra(request, giro.code, 'Bea');

    // Tappa 1: 5 chilometri, a tempo
    const tappa1 = await apri(request, giro.sessionId, 0, 10);
    expect(tappa1).toHaveLength(5);
    const s = await stato(request, ada);
    expect(s.corpo.tappa).toMatchObject({ indice: 0, tema: 'ripeti', km: 5 });
    expect(s.corpo.tappa.secondiRimasti).toBeGreaterThan(500);
    expect(s.corpo.tappa.secondiRimasti).toBeLessThanOrEqual(600);

    await corri(request, ada, 0, tappa1, 0, 5); // finisce
    await corri(request, bea, 0, tappa1, 0, 3); // si ferma al terzo

    // Chiusa la tappa, punti e posizioni sono fissati
    await chiama(request, 'test-setup', { azione: 'chiudiTappa', sessionId: giro.sessionId, tappa: 0 });
    const fraLeTappe = await stato(request, bea);
    expect(fraLeTappe.corpo.tappa).toBeNull();
    expect(fraLeTappe.corpo.ultimaTappa).toMatchObject({ indice: 0, posizione: 2, kmFatti: 3 });
    expect(fraLeTappe.corpo.generale).toMatchObject({ posizione: 2, corridori: 2 });

    const { corpo: letto } = await chiama(request, 'test-setup', { azione: 'leggi', sessionId: giro.sessionId });
    expect(letto.sessione.generale[0]).toMatchObject({ name: 'Ada', posizione: 1, punti: 25 });
    expect(letto.sessione.generale[1]).toMatchObject({ name: 'Bea', punti: 20 });

    // Consegnare nella tappa chiusa non si può
    const chiusa = await chiama(request, 'submit', { playerId: bea.playerId, token: bea.token, tappa: 0, km: 3, risposta: 'x' });
    expect(chiusa.stato).toBe(409);
    expect(chiusa.corpo.error).toBe('TAPPA_NON_APERTA');

    // Tappa 2: esercizi nuovi, si riparte da zero
    const tappa2 = await apri(request, giro.sessionId, 1, 10);
    expect((await stato(request, bea)).corpo.tappa).toMatchObject({ indice: 1, tema: 'contare', kmFatti: 0 });
    await corri(request, bea, 1, tappa2, 0, 5);
    await corri(request, ada, 1, tappa2, 0, 1);
    await chiama(request, 'test-setup', { azione: 'chiudiTappa', sessionId: giro.sessionId, tappa: 1 });

    // Generale: Ada 25 + 20 = 45, Bea 20 + 25 = 45; a parità vince... chi ha più vittorie (1 a 1), poi il nome
    const { corpo: dopo } = await chiama(request, 'test-setup', { azione: 'leggi', sessionId: giro.sessionId });
    expect(dopo.sessione.generale.map((r: { punti: number }) => r.punti)).toEqual([45, 45]);
  });

  test('con le migliori N, chi salta una tappa non resta indietro', async ({ request }) => {
    const giro = await creaGiro(request, ['ripeti', 'contare', 'passo'], 2);
    const ada = await entra(request, giro.code, 'Ada');
    const bea = await entra(request, giro.code, 'Bea');
    const eva = await entra(request, giro.code, 'Eva');

    // Tappa 1: Bea vince, Ada seconda, Eva terza
    const t1 = await apri(request, giro.sessionId, 0, 10);
    await corri(request, bea, 0, t1, 0, 5);
    await corri(request, ada, 0, t1, 0, 4);
    await corri(request, eva, 0, t1, 0, 3);
    // Tappa 2: Bea assente; Ada vince, Eva seconda
    const t2 = await apri(request, giro.sessionId, 1, 10); // apre la 2 e chiude la 1
    await corri(request, ada, 1, t2, 0, 5);
    await corri(request, eva, 1, t2, 0, 4);
    // Tappa 3: Bea vince, Eva seconda, Ada terza
    const t3 = await apri(request, giro.sessionId, 2, 10);
    await corri(request, bea, 2, t3, 0, 5);
    await corri(request, eva, 2, t3, 0, 4);
    await corri(request, ada, 2, t3, 0, 3);
    await chiama(request, 'test-setup', { azione: 'chiudiTappa', sessionId: giro.sessionId, tappa: 2 });

    const { corpo } = await chiama(request, 'test-setup', { azione: 'leggi', sessionId: giro.sessionId });
    const punti = Object.fromEntries(corpo.sessione.generale.map((r: { name: string; punti: number }) => [r.name, r.punti]));
    // Bea: 25 + 25 (due tappe, la terza non c'è); Ada: migliori 2 fra 20, 25, 16 = 45; Eva: 20 + 20 = 40
    expect(punti).toEqual({ Bea: 50, Ada: 45, Eva: 40 });
    expect(corpo.sessione.generale[0].name).toBe('Bea');
  });

  test('tempo scaduto: non si consegna più e lo stato lo dice', async ({ request }) => {
    const giro = await creaGiro(request, ['ripeti']);
    const ivo = await entra(request, giro.code, 'Ivo');
    const esercizi = await apri(request, giro.sessionId, 0, 10);
    await corri(request, ivo, 0, esercizi, 0, 2);
    await chiama(request, 'test-setup', { azione: 'scadi', sessionId: giro.sessionId });

    const s = await stato(request, ivo);
    expect(s.corpo.tappa).toMatchObject({ scaduta: true, kmFatti: 2, esercizio: null, secondiRimasti: 0 });

    const tardi = await chiama(request, 'submit', {
      playerId: ivo.playerId,
      token: ivo.token,
      tappa: 0,
      km: 2,
      risposta: esercizi[2].soluzione,
    });
    expect(tardi.stato).toBe(403);
    expect(tardi.corpo.error).toBe('TEMPO_SCADUTO');
  });

  test('aprire la tappa successiva chiude la precedente e ne fissa i punti', async ({ request }) => {
    const giro = await creaGiro(request, ['ripeti', 'contare']);
    const ugo = await entra(request, giro.code, 'Ugo');
    const t1 = await apri(request, giro.sessionId, 0, 10);
    await corri(request, ugo, 0, t1, 0, 2);
    await apri(request, giro.sessionId, 1, 10);

    const { corpo } = await chiama(request, 'test-setup', { azione: 'leggi', sessionId: giro.sessionId });
    expect(corpo.sessione.tappe.map((t: { stato: string }) => t.stato)).toEqual(['chiusa', 'in-corso']);
    expect(corpo.allievi[0].tappe['0']).toMatchObject({ km: 2, posizione: 1, punti: 25 });
  });

  test('chi non ha consegnato niente in una tappa non prende punti né posizione', async ({ request }) => {
    const giro = await creaGiro(request, ['ripeti']);
    const fermo = await entra(request, giro.code, 'Fermo');
    const attivo = await entra(request, giro.code, 'Attivo');
    const t1 = await apri(request, giro.sessionId, 0, 10);
    await corri(request, attivo, 0, t1, 0, 1);
    await chiama(request, 'test-setup', { azione: 'chiudiTappa', sessionId: giro.sessionId, tappa: 0 });

    const s = await stato(request, fermo);
    expect(s.corpo.ultimaTappa).toBeNull();
    const { corpo } = await chiama(request, 'test-setup', { azione: 'leggi', sessionId: giro.sessionId });
    const riga = corpo.sessione.generale.find((r: { name: string }) => r.name === 'Fermo');
    expect(riga.punti).toBe(0);
  });
});

test.describe('numero di corsa e rientro', () => {
  test('i numeri si assegnano in ordine di iscrizione', async ({ request }) => {
    const gara = await creaGara(request);
    const numeri = [];
    for (const nome of ['Ada', 'Bruno', 'Carla']) numeri.push((await entra(request, gara.code, nome)).numero);
    expect(numeri).toEqual([1, 2, 3]);
  });

  test('col numero si rientra da un altro PC e si riprende da dove si era', async ({ request }) => {
    const gara = await creaGara(request, { km: 5, apri: true });
    const p = await entra(request, gara.code, 'Dino');
    await corri(request, p, 0, gara.esercizi, 0, 2);

    const nuovo = await chiama(request, 'rientro', { code: gara.code, numero: p.numero });
    expect(nuovo.stato, JSON.stringify(nuovo.corpo)).toBe(200);
    expect(nuovo.corpo).toMatchObject({ name: 'Dino', playerId: p.playerId });
    expect(nuovo.corpo.token).not.toBe(p.token);

    const s = await chiama(request, 'status', { playerId: nuovo.corpo.playerId, token: nuovo.corpo.token });
    expect(s.corpo.tappa.kmFatti).toBe(2);
    expect(s.corpo.numero).toBe(p.numero);
  });

  test('il rientro invalida la sessione sul PC di prima', async ({ request }) => {
    const gara = await creaGara(request, { apri: true });
    const p = await entra(request, gara.code, 'Ennio');
    await chiama(request, 'rientro', { code: gara.code, numero: p.numero });
    expect((await stato(request, p)).stato).toBe(401);
  });

  test('numero inesistente o non valido', async ({ request }) => {
    const gara = await creaGara(request);
    await entra(request, gara.code, 'Fabio');
    const inesistente = await chiama(request, 'rientro', { code: gara.code, numero: 99 });
    expect(inesistente.stato).toBe(404);
    expect(inesistente.corpo.error).toBe('PLAYER_NOT_FOUND');
    for (const numero of [0, -3, 'sette', null, undefined]) {
      expect((await chiama(request, 'rientro', { code: gara.code, numero })).stato, `numero ${numero}`).toBe(400);
    }
  });

  test('i numeri di gare diverse non si confondono', async ({ request }) => {
    const una = await creaGara(request);
    const altra = await creaGara(request);
    await entra(request, una.code, 'Gino');
    await entra(request, altra.code, 'Gino');
    const r1 = await chiama(request, 'rientro', { code: una.code, numero: 1 });
    const r2 = await chiama(request, 'rientro', { code: altra.code, numero: 1 });
    expect(r1.corpo.playerId).not.toBe(r2.corpo.playerId);
  });
});

test.describe('ingresso', () => {
  test('codice inesistente', async ({ request }) => {
    const esito = await chiama(request, 'join', { code: 'ZZZZ', name: 'Luca' });
    expect(esito.stato).toBe(404);
    expect(esito.corpo.error).toBe('SESSION_NOT_FOUND');
  });

  test('nome doppio: suggerisce l\'iniziale e il rientro col numero', async ({ request }) => {
    const gara = await creaGara(request);
    await entra(request, gara.code, 'Giulia');
    const secondo = await chiama(request, 'join', { code: gara.code, name: 'giulia' });
    expect(secondo.stato).toBe(409);
    expect(secondo.corpo.message).toContain('Giulia B.');
    expect(secondo.corpo.message).toContain('numero di corsa');
    expect((await chiama(request, 'join', { code: gara.code, name: 'Giulia B.' })).stato).toBe(200);
  });

  test('nomi non validi', async ({ request }) => {
    const gara = await creaGara(request);
    for (const name of ['', '   ', 'Luca123', 'x'.repeat(30), '@@@']) {
      const esito = await chiama(request, 'join', { code: gara.code, name });
      expect(esito.stato, `nome «${name}»`).toBe(400);
    }
  });

  test('il codice si può scrivere in minuscolo', async ({ request }) => {
    const gara = await creaGara(request);
    expect((await chiama(request, 'join', { code: gara.code.toLowerCase(), name: 'Dario' })).stato).toBe(200);
  });
});

test.describe('autenticazione', () => {
  test('token sbagliato o playerId inventato', async ({ request }) => {
    const gara = await creaGara(request);
    const p = await entra(request, gara.code, 'Nadia');
    for (const token of ['', 'a'.repeat(64), undefined]) {
      expect((await chiama(request, 'status', { playerId: p.playerId, token })).stato).toBe(401);
    }
    expect((await chiama(request, 'status', { playerId: 'finta.finta', token: 'x' })).stato).toBe(401);
    expect((await chiama(request, 'status', { playerId: 'senza-punto', token: 'x' })).stato).toBe(401);
  });
});

test.describe('gara chiusa', () => {
  test('non si entra e non si consegna, ma lo stato si legge', async ({ request }) => {
    const gara = await creaGara(request, { apri: true });
    const p = await entra(request, gara.code, 'Omar');
    await chiama(request, 'test-setup', { azione: 'chiudi', sessionId: gara.sessionId });

    expect((await chiama(request, 'join', { code: gara.code, name: 'Rita' })).stato).toBe(404);
    const consegna = await chiama(request, 'submit', {
      playerId: p.playerId,
      token: p.token,
      tappa: 0,
      km: 0,
      risposta: gara.esercizi[0].soluzione,
    });
    expect(consegna.stato).toBe(403);
    const s = await stato(request, p);
    expect(s.stato).toBe(200);
    expect(s.corpo.sessionStatus).toBe('closed');
  });
});

test.describe('consegne non valide', () => {
  test('tappa o chilometro fuori posto', async ({ request }) => {
    const gara = await creaGara(request, { km: 4, apri: true });
    const p = await entra(request, gara.code, 'Ivan');
    for (const tappa of [-1, 4, 'due', null]) {
      const e = await chiama(request, 'submit', { playerId: p.playerId, token: p.token, tappa, km: 0, risposta: 'x' });
      expect(e.stato, `tappa ${tappa}`).toBe(400);
      expect(e.corpo.error).toBe('INVALID_TAPPA');
    }
    for (const km of [-1, 4, 99, 'due', null]) {
      const e = await chiama(request, 'submit', { playerId: p.playerId, token: p.token, tappa: 0, km, risposta: 'x' });
      expect(e.stato, `km ${km}`).toBe(400);
      expect(e.corpo.error).toBe('INVALID_KM');
    }
    const saltato = await chiama(request, 'submit', {
      playerId: p.playerId,
      token: p.token,
      tappa: 0,
      km: 2,
      risposta: gara.esercizi[2].soluzione,
    });
    expect(saltato.stato).toBe(409);
    expect(saltato.corpo.message).toContain('sei al km 1');
  });

  test('risposta vuota o assente', async ({ request }) => {
    const gara = await creaGara(request, { apri: true });
    const p = await entra(request, gara.code, 'Bruno');
    for (const risposta of ['', '   ', undefined]) {
      const e = await chiama(request, 'submit', { playerId: p.playerId, token: p.token, tappa: 0, km: 0, risposta });
      expect(e.stato).toBe(200);
      expect(e.corpo.promosso).toBe(false);
    }
  });

  test('corpo della richiesta non JSON', async ({ request }) => {
    const r = await request.post('/api/giro/submit', { headers: { 'Content-Type': 'application/json' }, data: 'non json' });
    expect(r.status()).toBe(400);
  });
});

test.describe('segreti', () => {
  test('gli esercizi a output nascosto non lo rivelano al client', async ({ request }) => {
    // La tappa "leggere" è fatta tutta di esercizi a output segreto.
    const giro = await creaGiro(request, ['leggere', 'accumulatore']);
    const p = await entra(request, giro.code, 'Petra');
    for (const indice of [0, 1]) {
      const esercizi = await apri(request, giro.sessionId, indice, 10);
      for (let k = 0; k < esercizi.length; k++) {
        const s = await stato(request, p);
        const es = s.corpo.tappa.esercizio;
        expect('soluzione' in es).toBe(false);
        if (!esercizi[k].mostraOutput) {
          expect(es.outputAtteso, `${esercizi[k].tipo}`).toBeUndefined();
        }
        await corri(request, p, indice, esercizi, k, k + 1);
      }
    }
  });
});
