/* Test degli hint: sugli errori tipici il suggerimento deve dire che cosa guardare,
 * senza regalare la soluzione. Le tappe sono costruite a mano per fissare l'output
 * atteso: così i casi sono quelli veri di laboratorio. */
import { describe, expect, it } from 'vitest';
import { valutaRisposta } from './hint';
import type { Tappa } from './tappe';

/** Tappa "scrivi il ciclo che stampa 0 1 2 3 4". */
const contaFinoA5: Tappa = {
  tipo: 'output-range',
  terreno: 'pianura',
  consegna: 'Scrivi un ciclo che stampa questi numeri, uno per riga:',
  outputAtteso: ['0', '1', '2', '3', '4'],
  mostraOutput: true,
  risposta: 'codice',
  soluzione: 'for i in range(5):\n    print(i)',
  vincoli: { forRichiesti: 1, righeCorpoMax: 1, printFuoriCicloMax: 0 },
};

/** Tappa con conto alla rovescia: 5 4 3 2 1. */
const rovescia: Tappa = {
  ...contaFinoA5,
  terreno: 'montagna',
  outputAtteso: ['5', '4', '3', '2', '1'],
  soluzione: 'for i in range(5, 0, -1):\n    print(i)',
};

/** Tappa "stampa 3 volte Evviva". */
const ripetiEvviva: Tappa = {
  tipo: 'ripeti-n',
  terreno: 'pianura',
  consegna: 'Stampa 3 volte la frase: Evviva',
  outputAtteso: ['Evviva', 'Evviva', 'Evviva'],
  mostraOutput: false,
  risposta: 'codice',
  soluzione: 'for i in range(3):\n    print("Evviva")',
  vincoli: { forRichiesti: 1, righeCorpoMax: 1, printFuoriCicloMax: 0 },
};

/** Tappa dell'accumulatore: somma da 1 a 5 = 15. */
const somma: Tappa = {
  tipo: 'accumulatore',
  terreno: 'montagna',
  consegna: 'Somma i numeri da 1 a 5 e stampa solo il risultato.',
  outputAtteso: ['15'],
  mostraOutput: false,
  risposta: 'codice',
  soluzione: 'totale = 0\nfor i in range(1, 6):\n    totale += i\nprint(totale)',
  vincoli: { forRichiesti: 1, righeCorpoMax: 2, printFuoriCicloMax: 1 },
};

/** Tappa di inversione: si consegna l'output, non il codice. */
const inversione: Tappa = {
  tipo: 'ciclo-output',
  terreno: 'collina',
  consegna: 'Leggi il ciclo: che cosa stampa? Scrivi le righe esatte, una per riga.',
  outputAtteso: ['Giro 1', 'Giro 2', 'Giro 3'],
  mostraOutput: false,
  codiceMostrato: 'for i in range(1, 4):\n    print(f"Giro {i}")',
  risposta: 'output',
  soluzione: 'Giro 1\nGiro 2\nGiro 3',
  vincoli: { forRichiesti: null, righeCorpoMax: null, printFuoriCicloMax: null },
};

/** Scorciatoia: valuta e pretende la bocciatura, restituendo l'hint. */
function hint(tappa: Tappa, risposta: string): string {
  const esito = valutaRisposta(tappa, risposta);
  if (esito.promosso) throw new Error('attesa bocciatura, invece è stato promosso');
  if (!esito.hint) throw new Error('bocciato senza hint');
  return esito.hint;
}

describe('soluzioni giuste, in tutte le forme equivalenti', () => {
  it('range(5), range(0,5) e range(0,5,1)', () => {
    for (const r of ['range(5)', 'range(0, 5)', 'range(0, 5, 1)']) {
      expect(valutaRisposta(contaFinoA5, `for i in ${r}:\n    print(i)`).promosso).toBe(true);
    }
  });

  it('nome della variabile libero e corpo sulla stessa riga', () => {
    expect(valutaRisposta(contaFinoA5, 'for numero in range(5): print(numero)').promosso).toBe(true);
  });

  it('somma scritta con += o con totale = totale + i', () => {
    expect(valutaRisposta(somma, somma.soluzione).promosso).toBe(true);
    expect(
      valutaRisposta(somma, 'totale = 0\nfor i in range(1, 6):\n    totale = totale + i\nprint(totale)').promosso,
    ).toBe(true);
  });

  it('spazi e righe vuote in più non disturbano', () => {
    expect(valutaRisposta(contaFinoA5, '\nfor i in range(5):\n    print(i)   \n\n').promosso).toBe(true);
  });
});

describe('errori sui numeri di range', () => {
  it('una ripetizione di troppo', () => {
    expect(hint(contaFinoA5, 'for i in range(6): print(i)')).toContain('di troppo');
  });

  it('una ripetizione di meno', () => {
    expect(hint(contaFinoA5, 'for i in range(4): print(i)')).toContain('di meno');
  });

  it('parte dal numero sbagliato', () => {
    const h = hint(contaFinoA5, 'for i in range(1, 6): print(i)');
    expect(h).toContain('Parti da 1');
    expect(h).toContain('primo numero');
  });

  it('passo sbagliato', () => {
    const h = hint(contaFinoA5, 'for i in range(0, 10, 2): print(i)');
    expect(h).toContain('di 2 in 2');
    expect(h).toContain('passo');
  });

  it('conto alla rovescia fatto in salita', () => {
    const h = hint(rovescia, 'for i in range(1, 6): print(i)');
    expect(h).toContain('scendono');
    expect(h).toContain('negativo');
  });

  it('molte ripetizioni di differenza', () => {
    expect(hint(contaFinoA5, 'for i in range(10): print(i)')).toContain('secondo numero');
  });

  it('print fuori dal ciclo: stampa una riga sola', () => {
    const h = hint(contaFinoA5, 'for i in range(5):\n    print("")\nprint(4)');
    expect(h).toBeTruthy();
  });
});

describe('errori sul testo', () => {
  it('numero di ripetizioni sbagliato', () => {
    const h = hint(ripetiEvviva, 'for i in range(5):\n    print("Evviva")');
    expect(h).toContain('5 volte invece di 3');
  });

  it('maiuscole e minuscole', () => {
    expect(hint(ripetiEvviva, 'for i in range(3):\n    print("evviva")')).toContain('maiuscole');
  });

  it('spazi di troppo nel testo', () => {
    expect(hint(ripetiEvviva, 'for i in range(3):\n    print("Ev  viva")')).toContain('Ev  viva');
  });

  it('frase diversa: mostra quella giusta', () => {
    const h = hint(ripetiEvviva, 'for i in range(3):\n    print("Forza")');
    expect(h).toContain('Evviva');
  });

  it('stampa il numero invece della frase', () => {
    expect(hint(ripetiEvviva, 'for i in range(3):\n    print(i)')).toBeTruthy();
  });
});

describe('controlli anti-furbo', () => {
  it('print ripetuti a mano senza ciclo', () => {
    const h = hint(contaFinoA5, 'print(0)\nprint(1)\nprint(2)\nprint(3)\nprint(4)');
    expect(h).toContain('ciclo `for`');
    expect(h).toContain('a mano');
  });

  it('ciclo accorciato più print aggiunti a mano', () => {
    const h = hint(contaFinoA5, 'for i in range(3):\n    print(i)\nprint(3)\nprint(4)');
    expect(h).toContain('dentro il ciclo');
  });

  it('più cicli del necessario', () => {
    const h = hint(
      contaFinoA5,
      'for i in range(3):\n    print(i)\nfor i in range(3, 5):\n    print(i)',
    );
    expect(h).toContain('un solo ciclo');
  });

  it('il risultato della somma scritto a mano', () => {
    expect(hint(somma, 'print(15)')).toContain('ciclo `for`');
  });

  it('dentro il ciclo ci sono troppe righe', () => {
    const h = hint(contaFinoA5, 'for i in range(5):\n    x = i\n    y = x\n    print(y)');
    expect(h).toContain('una riga sola');
  });
});

describe('tappa dell\'accumulatore', () => {
  it('print dentro il ciclo invece che dopo', () => {
    const h = hint(somma, 'totale = 0\nfor i in range(1, 6):\n    totale += i\n    print(totale)');
    expect(h).toContain('fuori dal ciclo');
  });

  it('risultato sbagliato', () => {
    const h = hint(somma, 'totale = 0\nfor i in range(5):\n    totale += i\nprint(totale)');
    expect(h).toContain('10');
    expect(h).toContain('15');
  });
});

describe('errori di scrittura: parla il micro-interprete', () => {
  it('due punti dimenticati', () => {
    expect(hint(contaFinoA5, 'for i in range(5)\n    print(i)')).toContain('due punti');
  });

  it('corpo non indentato', () => {
    expect(hint(contaFinoA5, 'for i in range(5):\nprint(i)')).toContain('indentazione');
  });

  it('print con la maiuscola', () => {
    expect(hint(contaFinoA5, 'for i in range(5):\n    Print(i)')).toContain('minuscolo');
  });

  it('variabile sbagliata nel print', () => {
    expect(hint(contaFinoA5, 'for i in range(5):\n    print(x)')).toContain('`x`');
  });

  it('ciclo infinito o enorme fermato dai tetti', () => {
    expect(hint(contaFinoA5, 'for i in range(100000):\n    print(i)')).toContain('range');
  });
});

describe('casi di contorno', () => {
  it('risposta vuota', () => {
    expect(hint(contaFinoA5, '   ')).toContain('Non hai scritto niente');
  });

  it('i trattini del codice da completare', () => {
    const daCompletare: Tappa = { ...contaFinoA5, tipo: 'completa-range', codiceIniziale: 'for i in range(__, __):\n    print(i)' };
    expect(hint(daCompletare, 'for i in range(__, __):\n    print(i)')).toContain('trattini');
  });

  it('l\'output prodotto torna indietro per mostrarlo nel pannello', () => {
    const esito = valutaRisposta(contaFinoA5, 'for i in range(3): print(i)');
    expect(esito.output).toEqual(['0', '1', '2']);
  });
});

describe('tappe di inversione (si consegna l\'output)', () => {
  it('righe giuste', () => {
    expect(valutaRisposta(inversione, 'Giro 1\nGiro 2\nGiro 3').promosso).toBe(true);
  });

  it('righe vuote in fondo tollerate', () => {
    expect(valutaRisposta(inversione, 'Giro 1\nGiro 2\nGiro 3\n\n').promosso).toBe(true);
  });

  it('una riga di meno', () => {
    expect(hint(inversione, 'Giro 1\nGiro 2')).toContain('2 righe invece di 3');
  });

  it('parte da 0 invece che da 1', () => {
    const h = hint(inversione, 'Giro 0\nGiro 1\nGiro 2');
    expect(h).toContain('Giro 1');
  });

  it('scrive il codice invece dell\'output', () => {
    const h = hint(inversione, 'for i in range(1, 4):\n    print(f"Giro {i}")');
    expect(h).toContain('non va il codice');
  });

  it('risposta vuota', () => {
    expect(hint(inversione, '')).toContain('Scrivi le righe');
  });
});
