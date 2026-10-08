/* Test del micro-interprete. È il cuore della validazione: se sbaglia qui, il gioco
 * promuove soluzioni sbagliate o boccia soluzioni giuste. Copre i casi validi, le
 * equivalenze, tutti gli errori con messaggio didattico, i tetti e i tentativi furbi. */
import { describe, expect, it } from 'vitest';
import { esegui, MAX_ITERAZIONI, MAX_RIGHE_OUTPUT } from './interprete';

/** Scorciatoia: esegue e pretende successo, restituendo l'output. */
function out(codice: string): string[] {
  const esito = esegui(codice);
  if (!esito.ok) throw new Error(`atteso successo, ricevuto errore: ${esito.errore.messaggio}`);
  return esito.output;
}

/** Scorciatoia: esegue e pretende errore, restituendolo. */
function errore(codice: string) {
  const esito = esegui(codice);
  if (esito.ok) throw new Error(`atteso errore, ricevuto output: ${JSON.stringify(esito.output)}`);
  return esito.errore;
}

describe('cicli for con range', () => {
  it('range con un solo numero parte da 0', () => {
    expect(out('for i in range(5):\n    print(i)')).toEqual(['0', '1', '2', '3', '4']);
  });

  it('il corpo può stare sulla stessa riga', () => {
    expect(out('for i in range(3): print(i)')).toEqual(['0', '1', '2']);
  });

  it('range(5), range(0,5) e range(0,5,1) sono equivalenti', () => {
    const atteso = ['0', '1', '2', '3', '4'];
    expect(out('for i in range(5): print(i)')).toEqual(atteso);
    expect(out('for i in range(0, 5): print(i)')).toEqual(atteso);
    expect(out('for i in range(0, 5, 1): print(i)')).toEqual(atteso);
  });

  it('il nome della variabile è libero', () => {
    expect(out('for numero in range(3): print(numero)')).toEqual(out('for i in range(3): print(i)'));
  });

  it('range con inizio e fine', () => {
    expect(out('for i in range(3, 7): print(i)')).toEqual(['3', '4', '5', '6']);
  });

  it('range con passo', () => {
    expect(out('for i in range(0, 9, 2): print(i)')).toEqual(['0', '2', '4', '6', '8']);
  });

  it('conto alla rovescia con passo negativo', () => {
    expect(out('for i in range(5, 0, -1): print(i)')).toEqual(['5', '4', '3', '2', '1']);
  });

  it('range vuoto non stampa niente', () => {
    expect(out('for i in range(0): print(i)')).toEqual([]);
    expect(out('for i in range(5, 2): print(i)')).toEqual([]);
    expect(out('for i in range(0, 5, -1): print(i)')).toEqual([]);
  });

  it('ripete un testo fisso senza usare la variabile', () => {
    expect(out('for i in range(3):\n    print("Evviva")')).toEqual(['Evviva', 'Evviva', 'Evviva']);
  });

  it('i numeri di range possono essere espressioni e variabili', () => {
    expect(out('n = 3\nfor i in range(n + 1): print(i)')).toEqual(['0', '1', '2', '3']);
  });

  it('cicli annidati', () => {
    expect(out('for i in range(2):\n    for j in range(2):\n        print(i * 10 + j)')).toEqual([
      '0',
      '1',
      '10',
      '11',
    ]);
  });

  it('corpo con più righe', () => {
    expect(out('for i in range(2):\n    print(i)\n    print("---")')).toEqual(['0', '---', '1', '---']);
  });

  it('istruzioni dopo il ciclo tornano al livello esterno', () => {
    expect(out('for i in range(2):\n    print(i)\nprint("fine")')).toEqual(['0', '1', 'fine']);
  });
});

describe('cicli for su una stringa', () => {
  it('scorre le lettere', () => {
    expect(out('for lettera in "ciao":\n    print(lettera)')).toEqual(['c', 'i', 'a', 'o']);
  });

  it('scorre una stringa in una variabile', () => {
    expect(out('parola = "sì"\nfor c in parola: print(c)')).toEqual(['s', 'ì']);
  });

  it('un numero non si può scorrere', () => {
    const e = errore('for i in 5: print(i)');
    expect(e.tipo).toBe('tipo');
    expect(e.messaggio).toContain('range(5)');
  });
});

describe('print', () => {
  it('più argomenti separati da uno spazio', () => {
    expect(out('print("Totale:", 10)')).toEqual(['Totale: 10']);
  });

  it('print vuoto stampa una riga vuota', () => {
    expect(out('print()')).toEqual(['']);
  });

  it('virgolette singole o doppie, indifferente', () => {
    expect(out("print('ciao')")).toEqual(['ciao']);
    expect(out('print("ciao")')).toEqual(['ciao']);
  });

  it('un apostrofo richiede le virgolette doppie', () => {
    expect(out('print("C\'è il sole")')).toEqual(["C'è il sole"]);
  });

  it('\\n dentro il testo produce due righe di output', () => {
    expect(out('print("a\\nb")')).toEqual(['a', 'b']);
  });

  it('virgola finale ammessa', () => {
    expect(out('print("a",)')).toEqual(['a']);
  });
});

describe('f-string', () => {
  it('interpola una variabile', () => {
    expect(out('for i in range(2):\n    print(f"Giro {i}")')).toEqual(['Giro 0', 'Giro 1']);
  });

  it('interpola un calcolo', () => {
    expect(out('for i in range(2): print(f"{i + 1} di 2")')).toEqual(['1 di 2', '2 di 2']);
  });

  it('graffe doppie per stampare una graffa', () => {
    expect(out('print(f"{{ok}}")')).toEqual(['{ok}']);
  });

  it('graffe vuote: errore chiaro', () => {
    expect(errore('print(f"vuoto {}")').messaggio).toContain('graffe');
  });

  it('formati con i due punti non ammessi', () => {
    const e = errore('x = 1\nprint(f"{x:.2f}")');
    expect(e.tipo).toBe('nonAmmesso');
  });
});

describe('variabili e accumulatore', () => {
  it('somma dei numeri da 1 a 5 con +=', () => {
    expect(out('totale = 0\nfor i in range(1, 6):\n    totale += i\nprint(totale)')).toEqual(['15']);
  });

  it('somma anche scritta come totale = totale + i', () => {
    expect(out('totale = 0\nfor i in range(1, 6):\n    totale = totale + i\nprint(totale)')).toEqual(['15']);
  });

  it('concatenazione di testo con + e ripetizione con *', () => {
    expect(out('print("ci" + "ao")')).toEqual(['ciao']);
    expect(out('print("-" * 5)')).toEqual(['-----']);
    expect(out('print(3 * "ab")')).toEqual(['ababab']);
  });

  it('variabile mai definita', () => {
    const e = errore('print(x)');
    expect(e.tipo).toBe('nome');
    expect(e.messaggio).toContain('`x`');
  });

  it('+= su una variabile che non esiste suggerisce di inizializzarla', () => {
    const e = errore('for i in range(3):\n    totale += i');
    expect(e.tipo).toBe('nome');
    expect(e.messaggio).toContain('totale = 0');
  });

  it('numero + testo: suggerisce la f-string', () => {
    const e = errore('print("Totale: " + 5)');
    expect(e.tipo).toBe('tipo');
    expect(e.messaggio).toContain('f-string');
  });
});

describe('errori di sintassi con messaggio didattico', () => {
  it('due punti mancanti', () => {
    const e = errore('for i in range(5)\n    print(i)');
    expect(e.tipo).toBe('sintassi');
    expect(e.messaggio).toContain('due punti');
  });

  it('corpo non indentato', () => {
    const e = errore('for i in range(5):\nprint(i)');
    expect(e.messaggio).toContain('indentazione');
    expect(e.riga).toBe(2);
  });

  it('niente dopo i due punti', () => {
    expect(errore('for i in range(5):').messaggio).toContain('almeno una riga');
  });

  it('Print con la maiuscola', () => {
    expect(errore('Print("ciao")').messaggio).toContain('minuscolo');
  });

  it('For con la maiuscola', () => {
    expect(errore('For i in range(3): print(i)').messaggio).toContain('minuscolo');
  });

  it('in mancante', () => {
    expect(errore('for i range(3): print(i)').messaggio).toContain('`in`');
  });

  it('parentesi di print non chiusa', () => {
    expect(errore('print("ciao"').messaggio).toContain(')');
  });

  it('virgolette non chiuse', () => {
    expect(errore('print("ciao)').messaggio).toContain('Virgolette');
  });

  it('range senza numeri', () => {
    expect(errore('for i in range(): print(i)').messaggio).toContain('range(5)');
  });

  it('range con quattro numeri', () => {
    expect(errore('for i in range(1, 2, 3, 4): print(i)').messaggio).toContain('tre numeri');
  });

  it('prima riga indentata', () => {
    expect(errore('    print("ciao")').messaggio).toContain('spostata a destra');
  });

  it('riga indentata di troppo in mezzo al blocco', () => {
    expect(errore('print("a")\n    print("b")').tipo).toBe('sintassi');
  });

  it('variabile da sola su una riga', () => {
    expect(errore('x = 1\nx').messaggio).toContain('print(x)');
  });

  it('roba di troppo dopo l\'istruzione', () => {
    expect(errore('print("a") print("b")').tipo).toBe('sintassi');
  });
});

describe('costrutti fuori dal gioco', () => {
  it('while', () => {
    const e = errore('while True:\n    print("ciao")');
    expect(e.tipo).toBe('nonAmmesso');
    expect(e.messaggio).toContain('`for`');
  });

  it('if', () => {
    expect(errore('if 1:\n    print("a")').tipo).toBe('nonAmmesso');
  });

  it('input', () => {
    expect(errore('x = input()').tipo).toBe('nonAmmesso');
  });

  it('liste', () => {
    const e = errore('for x in [1, 2, 3]: print(x)');
    expect(e.tipo).toBe('nonAmmesso');
    expect(e.messaggio).toContain('range');
  });

  it('funzioni non previste', () => {
    expect(errore('print(len("ciao"))').messaggio).toContain('len()');
  });

  it('numeri con la virgola', () => {
    expect(errore('print(1.5)').tipo).toBe('nonAmmesso');
  });

  it('print con end=', () => {
    const e = errore('for i in range(3): print(i, end=" ")');
    expect(e.tipo).toBe('nonAmmesso');
    expect(e.messaggio).toContain('end=');
  });

  it('print dentro un calcolo', () => {
    expect(errore('x = print("a") + 1').tipo).toBe('nonAmmesso');
  });

  it('parole riservate come nome di variabile', () => {
    expect(errore('print = 5').tipo).toBe('nonAmmesso');
    expect(errore('for print in range(3): print(1)').tipo).toBe('nonAmmesso');
  });

  it('operatori non ammessi', () => {
    expect(errore('x = 1\nx -= 1').messaggio).toContain('`+=`');
  });
});

describe('tetti di sicurezza', () => {
  it('ciclo troppo lungo bloccato prima di partire', () => {
    const e = errore('for i in range(100000): print(i)');
    expect(e.tipo).toBe('limite');
    expect(e.messaggio).toContain(String(MAX_ITERAZIONI));
  });

  it('cicli annidati che insieme superano il tetto', () => {
    const e = errore('for i in range(40):\n    for j in range(40):\n        print(i)');
    expect(e.tipo).toBe('limite');
  });

  it('troppe righe stampate', () => {
    const e = errore('for i in range(300):\n    print(i)');
    expect(e.tipo).toBe('limite');
    // 300 iterazioni stanno sotto il tetto delle iterazioni: a fermarlo è l'output
    expect(e.messaggio).toContain(String(MAX_RIGHE_OUTPUT));
  });

  it('passo 0', () => {
    const e = errore('for i in range(0, 5, 0): print(i)');
    expect(e.tipo).toBe('limite');
    expect(e.messaggio).toContain('0');
  });
});

describe('righe vuote, commenti e tabulazioni', () => {
  it('righe vuote e commenti si ignorano', () => {
    expect(out('# conto fino a 2\n\nfor i in range(2):\n\n    print(i)  # stampa\n')).toEqual(['0', '1']);
  });

  it('l\'indentazione con Tab funziona come con gli spazi', () => {
    expect(out('for i in range(2):\n\tprint(i)')).toEqual(['0', '1']);
  });

  it('codice vuoto', () => {
    expect(errore('   \n\n').messaggio).toContain('Non hai scritto niente');
  });

  it('due istruzioni sulla stessa riga separate da ; valgono entrambe', () => {
    expect(out('print("a"); print("b")')).toEqual(['a', 'b']);
    expect(out('for i in range(2): print(i); print("-")')).toEqual(['0', '-', '1', '-']);
  });
});

describe('struttura del codice (controlli anti-furbo)', () => {
  it('conta i for, le righe del corpo e i print fuori dal ciclo', () => {
    const esito = esegui('for i in range(2):\n    print(i)\n    print("x")\nprint("fine")');
    if (!esito.ok) throw new Error(esito.errore.messaggio);
    expect(esito.struttura).toMatchObject({
      numFor: 1,
      righeCorpoMax: 2,
      numPrint: 3,
      printFuoriCiclo: 1,
    });
  });

  it('riconosce i print ripetuti a mano senza ciclo', () => {
    const esito = esegui('print("Evviva")\nprint("Evviva")\nprint("Evviva")');
    if (!esito.ok) throw new Error(esito.errore.messaggio);
    // Output giusto per la tappa "ripeti 3 volte", ma nessun for: lo scopre la struttura.
    expect(esito.output).toEqual(['Evviva', 'Evviva', 'Evviva']);
    expect(esito.struttura.numFor).toBe(0);
    expect(esito.struttura.printFuoriCiclo).toBe(3);
  });

  it('riconosce il ciclo accorciato più print a mano', () => {
    const esito = esegui('for i in range(3): print(i)\nprint(3)\nprint(4)');
    if (!esito.ok) throw new Error(esito.errore.messaggio);
    expect(esito.output).toEqual(['0', '1', '2', '3', '4']);
    expect(esito.struttura).toMatchObject({ numFor: 1, printFuoriCiclo: 2 });
  });

  it('conta i cicli annidati', () => {
    const esito = esegui('for i in range(2):\n    for j in range(2):\n        print(j)');
    if (!esito.ok) throw new Error(esito.errore.messaggio);
    expect(esito.struttura.numFor).toBe(2);
  });
});
