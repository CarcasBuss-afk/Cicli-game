/* Test delle API della gara contro l'emulatore Firestore: il flusso completo di un
 * allievo (ingresso, attesa del via, errore con hint, tappa superata, traguardo), l'ordine
 * d'arrivo fra due allievi e tutti i rifiuti previsti. */
import { expect, test, type APIRequestContext } from '@playwright/test';

type Tappa = {
  tipo: string;
  risposta: 'codice' | 'output';
  soluzione: string;
  consegna: string;
  mostraOutput: boolean;
  outputAtteso: string[];
};

async function chiama(request: APIRequestContext, rotta: string, dati: unknown) {
  const risposta = await request.post(`/api/giro/${rotta}`, { data: dati });
  return { stato: risposta.status(), corpo: await risposta.json() };
}

/** Prepara una gara nuova. Restituisce anche le tappe con le soluzioni (rotta di test). */
async function creaGara(request: APIRequestContext, opzioni: { numTappe?: number; avvia?: boolean } = {}) {
  const { corpo } = await chiama(request, 'test-setup', {
    azione: 'crea',
    classLabel: '2A',
    numTappe: opzioni.numTappe ?? 6,
    avvia: opzioni.avvia ?? false,
  });
  return corpo as { sessionId: string; code: string; numTappe: number; tappe: Tappa[] };
}

async function entra(request: APIRequestContext, code: string, name: string) {
  const { stato, corpo } = await chiama(request, 'join', { code, name });
  expect(stato, JSON.stringify(corpo)).toBe(200);
  return corpo as { playerId: string; token: string; name: string; numTappe: number };
}

test.describe('flusso completo di un allievo', () => {
  test('dall\'ingresso al traguardo', async ({ request }) => {
    const gara = await creaGara(request, { numTappe: 6 });

    // --- Ingresso prima del via
    const luca = await entra(request, gara.code, '  luca  ');
    expect(luca.name).toBe('Luca'); // nome normalizzato dal server
    expect(luca.numTappe).toBe(6);

    // --- In attesa del via: lo stato si legge, la tappa non arriva
    const attesa = await chiama(request, 'status', { playerId: luca.playerId, token: luca.token });
    expect(attesa.corpo.sessionStatus).toBe('waiting');
    expect(attesa.corpo.tappa).toBeNull();
    expect(attesa.corpo.tappaCorrente).toBe(0);

    // --- Consegnare prima del via non si può
    const presto = await chiama(request, 'submit', {
      playerId: luca.playerId,
      token: luca.token,
      tappa: 0,
      risposta: gara.tappe[0].soluzione,
    });
    expect(presto.stato).toBe(403);
    expect(presto.corpo.error).toBe('SESSION_NOT_RUNNING');
    expect(presto.corpo.message).toContain('via del prof');

    // --- Via!
    await chiama(request, 'test-setup', { azione: 'avvia', sessionId: gara.sessionId });

    const inGara = await chiama(request, 'status', { playerId: luca.playerId, token: luca.token });
    expect(inGara.corpo.sessionStatus).toBe('running');
    expect(inGara.corpo.tappa).not.toBeNull();
    expect(inGara.corpo.tappa.consegna).toBeTruthy();

    // --- La tappa che arriva al client non contiene la soluzione
    expect(JSON.stringify(inGara.corpo.tappa)).not.toContain('soluzione');

    // --- Risposta sbagliata: non è un errore HTTP, torna l'hint
    const sbagliata = await chiama(request, 'submit', {
      playerId: luca.playerId,
      token: luca.token,
      tappa: 0,
      risposta: 'print("qualcosa di sbagliato")',
    });
    expect(sbagliata.stato).toBe(200);
    expect(sbagliata.corpo.promosso).toBe(false);
    expect(sbagliata.corpo.hint).toBeTruthy();

    // L'errore non fa avanzare, ma viene contato
    const dopoErrore = await chiama(request, 'status', { playerId: luca.playerId, token: luca.token });
    expect(dopoErrore.corpo.tappaCorrente).toBe(0);
    expect(dopoErrore.corpo.erroriTotali).toBe(1);

    // --- Risposta giusta: avanza e arriva la tappa successiva
    const giusta = await chiama(request, 'submit', {
      playerId: luca.playerId,
      token: luca.token,
      tappa: 0,
      risposta: gara.tappe[0].soluzione,
    });
    expect(giusta.stato).toBe(200);
    expect(giusta.corpo.promosso).toBe(true);
    expect(giusta.corpo.tappaCorrente).toBe(1);
    expect(giusta.corpo.arrivato).toBe(false);
    expect(giusta.corpo.tappa.consegna).toBeTruthy();

    // --- Riconsegnare una tappa già fatta viene rifiutato
    const ripetuta = await chiama(request, 'submit', {
      playerId: luca.playerId,
      token: luca.token,
      tappa: 0,
      risposta: gara.tappe[0].soluzione,
    });
    expect(ripetuta.stato).toBe(409);
    expect(ripetuta.corpo.error).toBe('INVALID_TAPPA');

    // --- Tutte le altre tappe con le soluzioni di riferimento
    for (let n = 1; n < gara.numTappe; n++) {
      const esito = await chiama(request, 'submit', {
        playerId: luca.playerId,
        token: luca.token,
        tappa: n,
        risposta: gara.tappe[n].soluzione,
      });
      expect(esito.stato, `tappa ${n}: ${JSON.stringify(esito.corpo)}`).toBe(200);
      expect(esito.corpo.promosso, `tappa ${n} (${gara.tappe[n].tipo}): ${esito.corpo.hint}`).toBe(true);
    }

    // --- Traguardo
    const traguardo = await chiama(request, 'status', { playerId: luca.playerId, token: luca.token });
    expect(traguardo.corpo.arrivato).toBe(true);
    expect(traguardo.corpo.posizione).toBe(1);
    expect(traguardo.corpo.tappa).toBeNull();

    // --- Chi è arrivato non consegna più
    const dopoTraguardo = await chiama(request, 'submit', {
      playerId: luca.playerId,
      token: luca.token,
      tappa: 0,
      risposta: 'print(1)',
    });
    expect(dopoTraguardo.stato).toBe(403);
    expect(dopoTraguardo.corpo.error).toBe('ALREADY_FINISHED');

    // --- Lo stato salvato in Firestore rispecchia la gara
    const { corpo: stato } = await chiama(request, 'test-setup', { azione: 'leggi', sessionId: gara.sessionId });
    const salvato = stato.allievi.find((a: { name: string }) => a.name === 'Luca');
    expect(salvato.tappaCorrente).toBe(6);
    expect(salvato.erroriTotali).toBe(1);
    expect(salvato.ordineArrivo).toBe(1);
    expect(salvato.tappe['0'].errori).toBe(1);
    expect(salvato.tappe['5'].completata).toBe(true);
    expect(stato.sessione.arrivati).toBe(1);
  });
});

test.describe('ordine d\'arrivo', () => {
  test('il secondo che taglia prende la posizione 2', async ({ request }) => {
    const gara = await creaGara(request, { numTappe: 4, avvia: true });
    const sara = await entra(request, gara.code, 'Sara');
    const marco = await entra(request, gara.code, 'Marco');

    /** Consegna le soluzioni delle tappe da `da` (inclusa) a `fino` (esclusa). */
    const completa = async (p: { playerId: string; token: string }, da: number, fino: number) => {
      for (let n = da; n < fino; n++) {
        const esito = await chiama(request, 'submit', {
          playerId: p.playerId,
          token: p.token,
          tappa: n,
          risposta: gara.tappe[n].soluzione,
        });
        expect(esito.corpo.promosso, JSON.stringify(esito.corpo)).toBe(true);
      }
    };

    // Marco finisce la gara, Sara si ferma a metà
    await completa(sara, 0, 2);
    await completa(marco, 0, 4);

    const statoMarco = await chiama(request, 'status', { playerId: marco.playerId, token: marco.token });
    expect(statoMarco.corpo.posizione).toBe(1);

    // Poi arriva anche Sara, che riprende dalla tappa dove si era fermata
    await completa(sara, 2, 4);
    const statoSara = await chiama(request, 'status', { playerId: sara.playerId, token: sara.token });
    expect(statoSara.corpo.posizione).toBe(2);
  });
});

test.describe('ingresso', () => {
  test('codice inesistente', async ({ request }) => {
    const esito = await chiama(request, 'join', { code: 'ZZZZ', name: 'Luca' });
    expect(esito.stato).toBe(404);
    expect(esito.corpo.error).toBe('SESSION_NOT_FOUND');
  });

  test('nome doppio: suggerisce l\'iniziale del cognome', async ({ request }) => {
    const gara = await creaGara(request);
    await entra(request, gara.code, 'Giulia');
    const secondo = await chiama(request, 'join', { code: gara.code, name: 'giulia' });
    expect(secondo.stato).toBe(409);
    expect(secondo.corpo.error).toBe('DUPLICATE_PLAYER');
    expect(secondo.corpo.message).toContain('Giulia B.');
    // Con l'iniziale entra
    const terzo = await chiama(request, 'join', { code: gara.code, name: 'Giulia B.' });
    expect(terzo.stato).toBe(200);
    expect(terzo.corpo.name).toBe('Giulia B.');
  });

  test('nomi non validi', async ({ request }) => {
    const gara = await creaGara(request);
    for (const name of ['', '   ', 'Luca123', 'x'.repeat(30), '@@@']) {
      const esito = await chiama(request, 'join', { code: gara.code, name });
      expect(esito.stato, `nome «${name}»`).toBe(400);
      expect(esito.corpo.error).toBe('INVALID_NAME');
    }
  });

  test('codice mancante', async ({ request }) => {
    const esito = await chiama(request, 'join', { name: 'Luca' });
    expect(esito.stato).toBe(400);
    expect(esito.corpo.error).toBe('INVALID_BODY');
  });

  test('il codice si può scrivere in minuscolo', async ({ request }) => {
    const gara = await creaGara(request);
    const esito = await chiama(request, 'join', { code: gara.code.toLowerCase(), name: 'Dario' });
    expect(esito.stato).toBe(200);
  });
});

test.describe('numero di corsa e rientro', () => {
  test('i numeri si assegnano in ordine di iscrizione', async ({ request }) => {
    const gara = await creaGara(request);
    const primo = await entra(request, gara.code, 'Ada');
    const secondo = await entra(request, gara.code, 'Bruno');
    const terzo = await entra(request, gara.code, 'Carla');
    expect([primo, secondo, terzo].map((p) => (p as unknown as { numero: number }).numero)).toEqual([1, 2, 3]);
  });

  test('col numero si rientra da un altro PC e si riprende da dove si era', async ({ request }) => {
    const gara = await creaGara(request, { numTappe: 5, avvia: true });
    const p = (await entra(request, gara.code, 'Dino')) as unknown as { playerId: string; token: string; numero: number };

    // Fa due tappe, poi "cambia computer": il browser nuovo non sa niente di lui
    for (let n = 0; n < 2; n++) {
      await chiama(request, 'submit', { playerId: p.playerId, token: p.token, tappa: n, risposta: gara.tappe[n].soluzione });
    }

    const nuovo = await chiama(request, 'rientro', { code: gara.code, numero: p.numero });
    expect(nuovo.stato, JSON.stringify(nuovo.corpo)).toBe(200);
    expect(nuovo.corpo.name).toBe('Dino');
    expect(nuovo.corpo.playerId).toBe(p.playerId);
    expect(nuovo.corpo.token).not.toBe(p.token); // token nuovo per la postazione nuova

    const stato = await chiama(request, 'status', { playerId: nuovo.corpo.playerId, token: nuovo.corpo.token });
    expect(stato.corpo.tappaCorrente).toBe(2);
    expect(stato.corpo.numero).toBe(p.numero);
  });

  test('il rientro invalida la sessione sul PC di prima', async ({ request }) => {
    const gara = await creaGara(request, { avvia: true });
    const p = (await entra(request, gara.code, 'Ennio')) as unknown as { playerId: string; token: string; numero: number };
    await chiama(request, 'rientro', { code: gara.code, numero: p.numero });

    const vecchio = await chiama(request, 'status', { playerId: p.playerId, token: p.token });
    expect(vecchio.stato).toBe(401);
  });

  test('numero inesistente o non valido', async ({ request }) => {
    const gara = await creaGara(request);
    await entra(request, gara.code, 'Fabio');

    const inesistente = await chiama(request, 'rientro', { code: gara.code, numero: 99 });
    expect(inesistente.stato).toBe(404);
    expect(inesistente.corpo.error).toBe('PLAYER_NOT_FOUND');

    for (const numero of [0, -3, 'sette', null, undefined]) {
      const esito = await chiama(request, 'rientro', { code: gara.code, numero });
      expect(esito.stato, `numero ${numero}`).toBe(400);
    }
  });

  test('rientro con un codice gara sbagliato', async ({ request }) => {
    const esito = await chiama(request, 'rientro', { code: 'ZZZZ', numero: 1 });
    expect(esito.stato).toBe(404);
    expect(esito.corpo.error).toBe('SESSION_NOT_FOUND');
  });

  test('i numeri di gare diverse non si confondono', async ({ request }) => {
    const unaGara = await creaGara(request);
    const altraGara = await creaGara(request);
    await entra(request, unaGara.code, 'Gino');
    await entra(request, altraGara.code, 'Gino'); // stesso nome, gara diversa: si può

    const rientroUno = await chiama(request, 'rientro', { code: unaGara.code, numero: 1 });
    const rientroDue = await chiama(request, 'rientro', { code: altraGara.code, numero: 1 });
    expect(rientroUno.corpo.playerId).not.toBe(rientroDue.corpo.playerId);
  });
});

test.describe('autenticazione', () => {
  test('token sbagliato', async ({ request }) => {
    const gara = await creaGara(request, { avvia: true });
    const p = await entra(request, gara.code, 'Nadia');
    for (const token of ['', 'a'.repeat(64), undefined]) {
      const esito = await chiama(request, 'status', { playerId: p.playerId, token });
      expect(esito.stato).toBe(401);
      expect(esito.corpo.error).toBe('UNAUTHORIZED');
    }
  });

  test('playerId inventato', async ({ request }) => {
    const esito = await chiama(request, 'status', { playerId: 'finta.finta', token: 'x' });
    expect(esito.stato).toBe(401);
  });

  test('playerId malformato', async ({ request }) => {
    const esito = await chiama(request, 'status', { playerId: 'senza-punto', token: 'x' });
    expect(esito.stato).toBe(401);
  });
});

test.describe('gara chiusa', () => {
  test('non si entra e non si consegna', async ({ request }) => {
    const gara = await creaGara(request, { avvia: true });
    const p = await entra(request, gara.code, 'Omar');
    await chiama(request, 'test-setup', { azione: 'chiudi', sessionId: gara.sessionId });

    const ingresso = await chiama(request, 'join', { code: gara.code, name: 'Rita' });
    expect(ingresso.stato).toBe(404);

    const consegna = await chiama(request, 'submit', {
      playerId: p.playerId,
      token: p.token,
      tappa: 0,
      risposta: gara.tappe[0].soluzione,
    });
    expect(consegna.stato).toBe(403);
    expect(consegna.corpo.message).toContain('chiusa');

    // Lo stato si legge ancora: la pagina deve poter mostrare "gara chiusa"
    const stato = await chiama(request, 'status', { playerId: p.playerId, token: p.token });
    expect(stato.stato).toBe(200);
    expect(stato.corpo.sessionStatus).toBe('closed');
  });
});

test.describe('consegne non valide', () => {
  test('numero di tappa fuori dal percorso', async ({ request }) => {
    const gara = await creaGara(request, { numTappe: 4, avvia: true });
    const p = await entra(request, gara.code, 'Ivan');
    for (const tappa of [-1, 4, 99, 'due', null]) {
      const esito = await chiama(request, 'submit', { playerId: p.playerId, token: p.token, tappa, risposta: 'print(1)' });
      expect(esito.stato, `tappa ${tappa}`).toBe(400);
      expect(esito.corpo.error).toBe('INVALID_TAPPA');
    }
  });

  test('tappa successiva saltata', async ({ request }) => {
    const gara = await creaGara(request, { numTappe: 4, avvia: true });
    const p = await entra(request, gara.code, 'Elsa');
    const esito = await chiama(request, 'submit', {
      playerId: p.playerId,
      token: p.token,
      tappa: 2,
      risposta: gara.tappe[2].soluzione,
    });
    expect(esito.stato).toBe(409);
    expect(esito.corpo.message).toContain('sei alla 1');
  });

  test('risposta vuota o assente', async ({ request }) => {
    const gara = await creaGara(request, { avvia: true });
    const p = await entra(request, gara.code, 'Bruno');
    for (const risposta of ['', '   ', undefined]) {
      const esito = await chiama(request, 'submit', { playerId: p.playerId, token: p.token, tappa: 0, risposta });
      expect(esito.stato).toBe(200);
      expect(esito.corpo.promosso).toBe(false);
      expect(esito.corpo.hint).toBeTruthy();
    }
  });

  test('corpo della richiesta non JSON', async ({ request }) => {
    const risposta = await request.post('/api/giro/submit', {
      headers: { 'Content-Type': 'application/json' },
      data: 'questo non è json',
    });
    expect(risposta.status()).toBe(400);
    expect((await risposta.json()).error).toBe('INVALID_BODY');
  });
});

test.describe('segreti', () => {
  test('le tappe a output nascosto non lo rivelano al client', async ({ request }) => {
    // Percorso lungo: contiene per certo tappe di inversione e l'accumulatore.
    const gara = await creaGara(request, { numTappe: 12, avvia: true });
    const p = await entra(request, gara.code, 'Petra');

    for (let n = 0; n < gara.numTappe; n++) {
      const stato = await chiama(request, 'status', { playerId: p.playerId, token: p.token });
      const tappa = stato.corpo.tappa;
      expect(tappa).not.toBeNull();
      expect('soluzione' in tappa).toBe(false);
      if (!gara.tappe[n].mostraOutput) {
        expect(tappa.outputAtteso, `tappa ${n} (${gara.tappe[n].tipo})`).toBeUndefined();
        // E nemmeno di straforo dentro gli altri campi
        for (const riga of gara.tappe[n].outputAtteso) {
          if (gara.tappe[n].tipo === 'accumulatore') {
            expect(JSON.stringify(tappa)).not.toContain(riga);
          }
        }
      }
      const esito = await chiama(request, 'submit', {
        playerId: p.playerId,
        token: p.token,
        tappa: n,
        risposta: gara.tappe[n].soluzione,
      });
      expect(esito.corpo.promosso, `tappa ${n}: ${esito.corpo.hint}`).toBe(true);
    }
  });
});

test.describe('rotta di test', () => {
  test('la gara creata parte in attesa con il codice di 4 caratteri', async ({ request }) => {
    const gara = await creaGara(request, { numTappe: 8 });
    expect(gara.code).toMatch(/^[2-9A-HJ-NP-Z]{4}$/);
    expect(gara.numTappe).toBe(8);
    const { corpo } = await chiama(request, 'test-setup', { azione: 'leggi', sessionId: gara.sessionId });
    expect(corpo.sessione.status).toBe('waiting');
    expect(corpo.sessione.arrivati).toBe(0);
    expect(corpo.allievi).toEqual([]);
  });
});
