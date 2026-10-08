/* Test dei generatori di tappe. La proprietà che conta: la soluzione di riferimento di
 * ogni tappa generata deve passare la validazione. Se cade, il gioco boccia soluzioni
 * giuste in classe. Si verifica su molti semi, non su un caso scelto a mano. */
import { describe, expect, it } from 'vitest';
import { esegui } from './interprete';
import { valutaRisposta } from './hint';
import {
  generaPercorso,
  generaTappa,
  NUM_TAPPE_DEFAULT,
  NUM_TAPPE_MAX,
  NUM_TAPPE_MIN,
  tappaPerAllievo,
  type TipoTappa,
} from './tappe';

const TIPI: TipoTappa[] = [
  'ripeti-n',
  'output-range',
  'completa-range',
  'ciclo-output',
  'ciclo-stringa',
  'accumulatore',
  'riga-ripetuta',
  'scala',
  'caccia-errore',
  'quante-righe',
  'accumulatore-visibile',
  'conta-giri',
];

describe('la soluzione di riferimento passa sempre', () => {
  for (const tipo of TIPI) {
    for (const difficolta of [1, 2, 3] as const) {
      it(`${tipo} (difficoltà ${difficolta}) su 40 semi`, () => {
        for (let seme = 1; seme <= 40; seme++) {
          const tappa = generaTappa(tipo, difficolta, seme * 1013);
          const esito = valutaRisposta(tappa, tappa.soluzione);
          expect(esito.hint, `seme ${seme}: ${tappa.consegna}`).toBeNull();
          expect(esito.promosso).toBe(true);
        }
      });
    }
  }

  it('tutte le tappe di un percorso completo', () => {
    for (let seme = 1; seme <= 25; seme++) {
      for (const tappa of generaPercorso(NUM_TAPPE_DEFAULT, seme * 31)) {
        const esito = valutaRisposta(tappa, tappa.soluzione);
        expect(esito.hint, `${tappa.tipo}: ${tappa.consegna}`).toBeNull();
      }
    }
  });
});

describe('le tappe sono sensate da mostrare in classe', () => {
  it('l\'output non è mai vuoto né troppo lungo', () => {
    for (let seme = 1; seme <= 30; seme++) {
      for (const tappa of generaPercorso(NUM_TAPPE_DEFAULT, seme * 77)) {
        expect(tappa.outputAtteso.length, tappa.consegna).toBeGreaterThanOrEqual(1);
        expect(tappa.outputAtteso.length, tappa.consegna).toBeLessThanOrEqual(12);
      }
    }
  });

  it('il ciclo mostrato nelle tappe di inversione stampa davvero l\'output atteso', () => {
    for (let seme = 1; seme <= 40; seme++) {
      for (const difficolta of [1, 2, 3] as const) {
        const tappa = generaTappa('ciclo-output', difficolta, seme * 601);
        const esito = esegui(tappa.codiceMostrato!);
        if (!esito.ok) throw new Error(`codice mostrato non eseguibile: ${esito.errore.messaggio}`);
        expect(esito.output).toEqual(tappa.outputAtteso);
      }
    }
  });

  it('la tappa da completare ha i trattini nell\'editor e il ciclo già impostato', () => {
    const tappa = generaTappa('completa-range', 2, 5);
    expect(tappa.codiceIniziale).toContain('__');
    expect(tappa.codiceIniziale).toContain('for i in range(');
    expect(tappa.codiceIniziale).toContain('print(i)');
  });

  it('solo le tappe con output in chiaro lo dichiarano', () => {
    expect(generaTappa('output-range', 1, 1).mostraOutput).toBe(true);
    expect(generaTappa('completa-range', 1, 1).mostraOutput).toBe(true);
    expect(generaTappa('ciclo-stringa', 1, 1).mostraOutput).toBe(true);
    // Qui l'output è il segreto della tappa: va indovinato, non mostrato.
    expect(generaTappa('ciclo-output', 1, 1).mostraOutput).toBe(false);
    expect(generaTappa('accumulatore', 3, 1).mostraOutput).toBe(false);
    expect(generaTappa('ripeti-n', 1, 1).mostraOutput).toBe(false);
  });

  it('le tappe difficili di ripeti-n usano frasi con l\'apostrofo', () => {
    const tappa = generaTappa('ripeti-n', 2, 3);
    expect(tappa.outputAtteso[0]).toContain("'");
    // La soluzione usa le virgolette doppie: con le singole Python darebbe errore.
    expect(tappa.soluzione).toContain('"');
  });
});

describe('percorso', () => {
  it('lo stesso seme dà lo stesso percorso', () => {
    expect(generaPercorso(12, 42)).toEqual(generaPercorso(12, 42));
  });

  it('semi diversi danno percorsi diversi', () => {
    expect(generaPercorso(12, 42)).not.toEqual(generaPercorso(12, 43));
  });

  it('rispetta il numero di tappe richiesto', () => {
    expect(generaPercorso(8, 1)).toHaveLength(8);
    expect(generaPercorso(20, 1)).toHaveLength(20);
  });

  it('il numero di tappe resta nei limiti', () => {
    expect(generaPercorso(1, 1)).toHaveLength(NUM_TAPPE_MIN);
    expect(generaPercorso(500, 1)).toHaveLength(NUM_TAPPE_MAX);
  });

  it('parte in pianura e arriva in montagna col tappone', () => {
    const percorso = generaPercorso(12, 7);
    expect(percorso[0].tipo).toBe('ripeti-n');
    expect(percorso[0].terreno).toBe('pianura');
    expect(percorso[percorso.length - 1].tipo).toBe('accumulatore');
    expect(percorso[percorso.length - 1].terreno).toBe('montagna');
  });

  it('la difficoltà non scende mai lungo il percorso', () => {
    const ordine = { pianura: 1, collina: 2, montagna: 3 };
    for (let seme = 1; seme <= 10; seme++) {
      const percorso = generaPercorso(14, seme * 11);
      // L'accumulatore finale è sempre un tappone, anche se la posizione direbbe altro.
      const terreni = percorso.map((t) => ordine[t.terreno]);
      for (let i = 1; i < terreni.length; i++) {
        expect(terreni[i]).toBeGreaterThanOrEqual(terreni[i - 1]);
      }
    }
  });

  it('mescola i tipi di tappa', () => {
    const tipi = new Set(generaPercorso(12, 9).map((t) => t.tipo));
    expect(tipi.size).toBeGreaterThanOrEqual(4);
  });
});

describe('tappaPerAllievo', () => {
  it('non lascia uscire la soluzione', () => {
    const pubblica = tappaPerAllievo(generaTappa('output-range', 1, 1));
    expect(JSON.stringify(pubblica)).not.toContain('soluzione');
    expect('soluzione' in pubblica).toBe(false);
  });

  it('nasconde l\'output quando è il segreto della tappa', () => {
    const inversione = tappaPerAllievo(generaTappa('ciclo-output', 1, 1));
    expect(inversione.outputAtteso).toBeUndefined();
    const conOutput = tappaPerAllievo(generaTappa('output-range', 1, 1));
    expect(conOutput.outputAtteso).toBeDefined();
  });

  it('nasconde il risultato della somma', () => {
    const tappa = generaTappa('accumulatore', 2, 1);
    const pubblica = tappaPerAllievo(tappa);
    expect(pubblica.outputAtteso).toBeUndefined();
    expect(JSON.stringify(pubblica)).not.toContain(tappa.outputAtteso[0]);
  });
});

describe('i generatori del catalogo esteso', () => {
  it('caccia all\'errore: il codice di partenza gira ma stampa altro', () => {
    for (let seme = 1; seme <= 40; seme++) {
      for (const difficolta of [1, 2, 3] as const) {
        const tappa = generaTappa('caccia-errore', difficolta, seme * 131);
        const esito = esegui(tappa.codiceIniziale!);
        if (!esito.ok) throw new Error(`il codice sbagliato non gira: ${esito.errore.messaggio}`);
        // Mostriamo all'allievo quello che stampa davvero, non una nostra supposizione.
        expect(tappa.outputSbagliato).toEqual(esito.output);
        // E deve essere davvero sbagliato, altrimenti non c'è niente da correggere.
        expect(esito.output, tappa.codiceIniziale).not.toEqual(tappa.outputAtteso);
      }
    }
  });

  it('caccia all\'errore: consegnare il codice così com\'è non passa', () => {
    const tappa = generaTappa('caccia-errore', 2, 7);
    const esito = valutaRisposta(tappa, tappa.codiceIniziale!);
    expect(esito.promosso).toBe(false);
    expect(esito.hint).toContain('Non hai cambiato niente');
  });

  it('quante righe: la risposta è davvero il numero di righe del ciclo mostrato', () => {
    for (let seme = 1; seme <= 40; seme++) {
      for (const difficolta of [1, 2, 3] as const) {
        const tappa = generaTappa('quante-righe', difficolta, seme * 211);
        const esito = esegui(tappa.codiceMostrato!);
        if (!esito.ok) throw new Error(esito.errore.messaggio);
        expect(tappa.outputAtteso).toEqual([String(esito.output.length)]);
      }
    }
  });

  it('scala: le righe si allungano o si accorciano di un asterisco alla volta', () => {
    const sale = generaTappa('scala', 2, 3).outputAtteso.map((r) => r.length);
    const scende = generaTappa('scala', 3, 3).outputAtteso.map((r) => r.length);
    sale.forEach((l, i) => expect(l).toBe(i + 1));
    scende.forEach((l, i) => i > 0 && expect(l).toBe(scende[i - 1] - 1));
    // Il rettangolo, primo scalino, ha righe tutte uguali.
    expect(new Set(generaTappa('scala', 1, 3).outputAtteso).size).toBe(1);
  });

  it('somma che cresce: non è una progressione, quindi non si fa col solo range', () => {
    for (let seme = 1; seme <= 20; seme++) {
      const numeri = generaTappa('accumulatore-visibile', 2, seme).outputAtteso.map(Number);
      const differenze = numeri.slice(1).map((n, i) => n - numeri[i]);
      expect(new Set(differenze).size, numeri.join(' ')).toBeGreaterThan(1);
    }
  });

  it('nelle tappe dove il risultato è il segreto, l\'allievo non lo riceve', () => {
    for (const tipo of ['quante-righe', 'conta-giri'] as const) {
      const tappa = generaTappa(tipo, 2, 5);
      const pubblica = tappaPerAllievo(tappa);
      expect(pubblica.outputAtteso, tipo).toBeUndefined();
      expect('soluzione' in pubblica).toBe(false);
    }
  });
});
