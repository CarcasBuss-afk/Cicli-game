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

describe('if, elif, else (le condizioni, PERCORSO.md §17)', () => {
  it('if dentro il ciclo: una riga in più a un giro solo', () => {
    expect(out('for i in range(1, 5):\n    print(i)\n    if i == 3:\n        print("omaggio")')).toEqual(['1', '2', '3', 'omaggio', '4']);
  });

  it('if/else dentro il ciclo', () => {
    expect(out('for i in range(1, 4):\n    if i == 2:\n        print("omaggio")\n    else:\n        print(i, "€")')).toEqual(['1 €', 'omaggio', '3 €']);
  });

  it('elif: un ramo solo viene eseguito', () => {
    const codice = 'for i in range(3):\n    if i == 0:\n        print("zero")\n    elif i == 1:\n        print("uno")\n    else:\n        print("altro")';
    expect(out(codice)).toEqual(['zero', 'uno', 'altro']);
  });

  it('if dopo il ciclo, sul totale, con tutti i confronti', () => {
    expect(out('t = 10\nif t >= 10:\n    print("sconto")\nif t < 10:\n    print("no")\nif t != 3:\n    print("ok")\nif t <= 10:\n    print("si")\nif t > 10:\n    print("no")')).toEqual([
      'sconto',
      'ok',
      'si',
    ]);
  });

  it('corpo in linea e accumulo dentro un ramo', () => {
    expect(out('t = 0\nfor i in range(1, 6):\n    if i == 3: print("gratis")\n    else: t += 2\nprint(t)')).toEqual(['gratis', '8']);
  });

  it('confronto fra testi e con una variabile', () => {
    expect(out('n = "Luca"\nif n == "Luca":\n    print("ciao")\nelse:\n    print("chi sei?")')).toEqual(['ciao']);
  });

  it('la condizione può usare un calcolo', () => {
    expect(out('x = 4\nif x * 2 == 8:\n    print("otto")')).toEqual(['otto']);
  });

  it('= al posto di ==', () => {
    expect(errore('x = 3\nif x = 3:\n    print("a")').messaggio).toContain('`==`');
  });

  it('if senza confronto', () => {
    expect(errore('x = 3\nif x:\n    print("a")').messaggio).toContain('confronto');
    expect(errore('if :\n    print("a")').messaggio).toContain('condizione');
  });

  it('due punti mancanti dopo if e dopo else', () => {
    expect(errore('x = 3\nif x == 3\n    print("a")').messaggio).toContain('due punti');
    expect(errore('x = 3\nif x == 3:\n    print("a")\nelse\n    print("b")').messaggio).toContain('due punti');
  });

  it('else if invece di elif', () => {
    expect(errore('x = 3\nif x == 3:\n    print("a")\nelse if x == 4:\n    print("b")').messaggio).toContain('`elif`');
  });

  it('else senza if, elif senza if', () => {
    expect(errore('else:\n    print("a")').messaggio).toContain('`if`');
    expect(errore('x = 1\nelif x == 1:\n    print("a")').messaggio).toContain('`if`');
  });

  it('corpo dell\'if non indentato', () => {
    const e = errore('x = 3\nif x == 3:\nprint("a")');
    expect(e.messaggio).toContain('spostata a destra');
    expect(e.riga).toBe(3);
  });

  it('and, or e not non ammessi', () => {
    expect(errore('x = 3\nif x > 1 and x < 5:\n    print("a")').tipo).toBe('nonAmmesso');
    expect(errore('x = 3\nif not x == 3:\n    print("a")').tipo).toBe('nonAmmesso');
  });

  it('numero confrontato con un testo: suggerisce int()', () => {
    const esito = esegui('n = input("Quanti? ")\nif n == 3:\n    print("tre")', { risposte: ['3'] });
    expect(esito.ok).toBe(false);
    if (!esito.ok) expect(esito.errore.messaggio).toContain('`int()`');
  });

  it('un confronto fuori da un if non si usa', () => {
    expect(errore('x = 3\nprint(x == 3)').messaggio).toContain('`if`');
    expect(errore('x == 3').messaggio).toContain('`==`');
  });

  it('if in linea sulla riga del for non si può', () => {
    expect(errore('for i in range(3): if i == 1: print(i)').messaggio).toContain('riga sua');
  });

  it('i fatti per il giudice contano gli if', () => {
    const esito = esegui('t = 0\nfor i in range(4):\n    if i == 2:\n        print("x")\n    else:\n        t += 1\nif t > 2:\n    print(t)');
    if (!esito.ok) throw new Error(esito.errore.messaggio);
    expect(esito.struttura).toMatchObject({ numIf: 2, ifNelCiclo: 1, accumuliNelCiclo: 1, numFor: 1, printFuoriCiclo: 1 });
    expect(esito.output).toEqual(['x', '3']);
  });
});

describe('costrutti fuori dal gioco', () => {
  it('while True e break', () => {
    const e = errore('while True:\n    print("ciao")');
    expect(e.tipo).toBe('nonAmmesso');
    expect(e.messaggio).toContain('`while True`');
    const b = errore('n = 0\nwhile n < 5:\n    n += 1\n    break');
    expect(b.tipo).toBe('nonAmmesso');
    expect(b.messaggio).toContain('`break`');
  });

  it('import di moduli che non siano random, e from import', () => {
    expect(errore('import math\nprint(1)').messaggio).toContain('`random`');
    expect(errore('from random import randint').messaggio).toContain('`import random`');
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

  it('la divisione non è ammessa', () => {
    expect(errore('x = 1\nx /= 2').tipo).toBe('nonAmmesso');
  });
});

describe('while (la seconda sezione dell\'Officina)', () => {
  it('il conto alla rovescia: i tre gesti', () => {
    expect(out('n = 3\nwhile n > 0:\n    print(n)\n    n -= 1\nprint("Via!")')).toEqual(['3', '2', '1', 'Via!']);
  });

  it('il salvadanaio: gira finché il totale non arriva all\'obiettivo, i giri sono il risultato', () => {
    const codice = 'totale = 0\nsettimane = 0\nwhile totale < 50:\n    totale += 15\n    settimane += 1\nprint(f"{settimane} settimane")';
    expect(out(codice)).toEqual(['4 settimane']);
    const esito = esegui(codice);
    if (esito.ok) expect(esito.giri).toBe(4);
  });

  it('il pettegolezzo: *= raddoppia', () => {
    expect(out('sanno = 1\nore = 0\nwhile sanno < 20:\n    sanno *= 2\n    ore += 1\nprint(ore)')).toEqual(['5']);
  });

  it('la condizione falsa da subito: il corpo non gira mai', () => {
    expect(out('n = 0\nwhile n > 0:\n    print(n)\nprint("fine")')).toEqual(['fine']);
  });

  it('corpo in linea, while dentro un for e if dentro il while', () => {
    expect(out('n = 0\nwhile n < 3: n += 1\nprint(n)')).toEqual(['3']);
    expect(out('for i in range(2):\n    n = 0\n    while n < 2:\n        n += 1\n        if n == 2:\n            print(i)')).toEqual(['0', '1']);
  });

  it('la sentinella: chiede finché non arriva 0, con la domanda ripetuta in fondo', () => {
    const codice = 'totale = 0\nprezzo = int(input("Prezzo? "))\nwhile prezzo != 0:\n    totale += prezzo\n    prezzo = int(input("Prezzo? "))\nprint(f"Totale: {totale}")';
    const esito = esegui(codice, { risposte: ['3', '5', '0'] });
    expect(esito.ok).toBe(true);
    if (esito.ok) {
      expect(esito.output).toEqual(['Totale: 8']);
      expect(esito.struttura).toMatchObject({ numWhile: 1, whileAggiornati: 1, inputNelCiclo: 1, numInput: 2 });
    }
  });

  it('la parola d\'ordine: richiedi finché non è giusta', () => {
    const codice = 'parola = input("Parola? ")\ntentativi = 1\nwhile parola != "ciclo":\n    print("Sbagliata")\n    parola = input("Parola? ")\n    tentativi += 1\nprint(f"Entrato al tentativo {tentativi}")';
    const esito = esegui(codice, { risposte: ['for', 'range', 'ciclo'] });
    expect(esito.ok).toBe(true);
    if (esito.ok) expect(esito.output).toEqual(['Sbagliata', 'Sbagliata', 'Entrato al tentativo 3']);
  });

  it('il ciclo infinito: il tetto diventa l\'hint', () => {
    const e = errore('n = 0\nwhile n < 5:\n    print("ciao")');
    expect(e.tipo).toBe('limite');
    expect(e.messaggio).toContain('non si ferma mai');
    expect(e.riga).toBe(2);
  });

  it('il ciclo infinito che non stampa: lo ferma il tetto delle iterazioni, non quello delle righe', () => {
    const e = errore('n = 0\nwhile n >= 0:\n    n += 1');
    expect(e.tipo).toBe('limite');
    expect(e.messaggio).toContain('non si ferma mai');
  });

  it('chi dimentica di ripetere la domanda finisce le risposte: il messaggio dice dove doveva fermarsi', () => {
    const esito = esegui('p = int(input())\nwhile p != 0:\n    print(p)', { risposte: ['3', '0'] });
    // la prima risposta è 3 e p non cambia mai: gira all'infinito stampando 3
    expect(esito.ok).toBe(false);
    if (!esito.ok) expect(esito.errore.tipo).toBe('limite');
    const altro = esegui('t = 0\nfor i in range(3):\n    t += int(input())\nprint(t)', { risposte: ['1', '2'] });
    expect(altro.ok).toBe(false);
    if (!altro.ok) expect(altro.errore.messaggio).toContain('Dopo l\'ultima risposta («2»)');
  });

  it('errori di scrittura del while', () => {
    expect(errore('while:\n    print(1)').messaggio).toContain('condizione');
    expect(errore('n = 1\nwhile n\n    print(1)').messaggio).toContain('confronto');
    expect(errore('n = 1\nwhile n > 0\n    n -= 1').messaggio).toContain('due punti');
    expect(errore('n = 1\nwhile n = 0:\n    n -= 1').messaggio).toContain('`==`');
    expect(errore('n = 1\nWhile n > 0:\n    n -= 1').messaggio).toContain('minuscolo');
    expect(errore('n = 1\nwhile n > 0 and n < 5:\n    n -= 1').tipo).toBe('nonAmmesso');
    expect(errore('n = 1\nwhile n > 0:\nprint(n)').messaggio).toContain('spostata a destra');
  });

  it('-= e *= vogliono numeri e una variabile che esiste', () => {
    expect(errore('s = "a"\ns -= 1').tipo).toBe('tipo');
    expect(errore('n -= 1').messaggio).toContain('`n -= ...`');
    expect(out('s = "ab"\ns *= 2\nprint(s)')).toEqual(['abab']);
  });

  it('i fatti per il giudice: while, aggiornamenti e condizione che cambia', () => {
    const fermo = esegui('n = 0\nk = 0\nwhile n < 2:\n    k += 1\n    if k == 2: n = 5\nprint(k)');
    if (!fermo.ok) throw new Error(fermo.errore.messaggio);
    // `n = 5` nel ramo dell'if è un'assegnazione, non un accumulo; ma cambia la variabile della condizione
    expect(fermo.struttura).toMatchObject({ numWhile: 1, whileAggiornati: 1, accumuliNelCiclo: 1, numFor: 0 });
    const scende = esegui('n = 3\nwhile n > 0:\n    n -= 1\n    print(n)');
    if (!scende.ok) throw new Error(scende.errore.messaggio);
    expect(scende.struttura).toMatchObject({ numWhile: 1, whileAggiornati: 1, accumuliNelCiclo: 1, printFuoriCiclo: 0 });
    expect(scende.giri).toBe(3);
  });
});

describe('random.randint, con i numeri forniti dalle opzioni', () => {
  const con = (codice: string, casuali: number[], risposte?: string[]) => {
    const esito = esegui(codice, risposte ? { casuali, risposte } : { casuali });
    if (!esito.ok) throw new Error(esito.errore.messaggio);
    return esito;
  };

  it('il numero segreto arriva dalla prova', () => {
    expect(con('import random\nsegreto = random.randint(1, 10)\nprint(segreto)', [7]).output).toEqual(['7']);
  });

  it('indovina il numero: randint, while, if dentro e tentativi', () => {
    const codice = [
      'import random',
      'segreto = random.randint(1, 10)',
      'tentativi = 0',
      'numero = int(input("Numero? "))',
      'tentativi += 1',
      'while numero != segreto:',
      '    if numero < segreto:',
      '        print("Più alto")',
      '    else:',
      '        print("Più basso")',
      '    numero = int(input("Numero? "))',
      '    tentativi += 1',
      'print(f"Indovinato in {tentativi} tentativi")',
    ].join('\n');
    const esito = con(codice, [7], ['5', '9', '7']);
    expect(esito.output).toEqual(['Più alto', 'Più basso', 'Indovinato in 3 tentativi']);
    expect(esito.struttura).toMatchObject({ numCasuali: 1, casualiNelCiclo: 0, numWhile: 1, whileAggiornati: 1, ifNelCiclo: 1 });
  });

  it('il dado: randint dentro il ciclo, un numero per lancio', () => {
    const codice = 'import random\nlanci = 1\ndado = random.randint(1, 6)\nwhile dado != 6:\n    dado = random.randint(1, 6)\n    lanci += 1\nprint(lanci)';
    const esito = con(codice, [2, 5, 6]);
    expect(esito.output).toEqual(['3']);
    expect(esito.struttura).toMatchObject({ numCasuali: 2, casualiNelCiclo: 1 });
    expect(esito.giri).toBe(2);
  });

  it('randint nella condizione del while conta come dentro il ciclo', () => {
    const esito = con('import random\nn = 0\nwhile random.randint(1, 6) != 6:\n    n += 1\nprint(n)', [3, 6]);
    expect(esito.output).toEqual(['1']);
    expect(esito.struttura).toMatchObject({ numCasuali: 1, casualiNelCiclo: 1 });
  });

  it('senza import random non esiste', () => {
    const esito = esegui('x = random.randint(1, 6)\nprint(x)', { casuali: [3] });
    expect(esito.ok).toBe(false);
    if (!esito.ok) {
      expect(esito.errore.tipo).toBe('nome');
      expect(esito.errore.messaggio).toContain('`import random`');
      expect(esito.errore.riga).toBe(1);
    }
  });

  it('senza numeri nelle opzioni randint resta vietato (le tappe del Giro)', () => {
    expect(errore('import random\nprint(random.randint(1, 6))').tipo).toBe('nonAmmesso');
  });

  it('il numero di prova fuori dai limiti scritti dall\'allievo: controlla la consegna', () => {
    const esito = esegui('import random\nprint(random.randint(1, 5))', { casuali: [8] });
    expect(esito.ok).toBe(false);
    if (!esito.ok) {
      expect(esito.errore.tipo).toBe('limite');
      expect(esito.errore.messaggio).toContain('8');
    }
  });

  it('più randint di quelli previsti, e limiti al contrario', () => {
    const pochi = esegui('import random\na = random.randint(1, 6)\nb = random.randint(1, 6)', { casuali: [3] });
    expect(pochi.ok).toBe(false);
    if (!pochi.ok) expect(pochi.errore.messaggio).toContain('più numeri casuali');
    const rovescio = esegui('import random\nprint(random.randint(6, 1))', { casuali: [3] });
    expect(rovescio.ok).toBe(false);
    if (!rovescio.ok) expect(rovescio.errore.messaggio).toContain('più piccolo');
  });

  it('errori di scrittura di randint', () => {
    expect(errore('import random\nx = randint(1, 6)').messaggio).toContain('`random.randint(...)`');
    expect(errore('import random\nx = random.randint(6)').messaggio).toContain('due numeri');
    expect(errore('import random\nx = random.randint()').messaggio).toContain('due numeri');
    expect(errore('import random\nx = random.choice(1)').tipo).toBe('nonAmmesso');
    expect(errore('import random\nx = random').messaggio).toContain('`random.randint(a, b)`');
    expect(errore('import random\nx = random.randint("a", 6)').tipo).toBe('tipo');
    expect(errore('random = 5').tipo).toBe('nonAmmesso');
  });

  it('import random non conta come riga per il giudice e si può ripetere', () => {
    const esito = con('import random\nimport random\nprint(random.randint(1, 1))', [1]);
    expect(esito.struttura.numRighe).toBe(1);
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

describe('struttura del codice (i fatti per il giudice)', () => {
  it('conta i for, le righe del corpo e i print fuori dal ciclo', () => {
    const esito = esegui('for i in range(2):\n    print(i)\n    print("x")\nprint("fine")');
    if (!esito.ok) throw new Error(esito.errore.messaggio);
    expect(esito.struttura).toMatchObject({
      numFor: 1,
      righeCorpoMax: 2,
      numPrint: 3,
      printFuoriCiclo: 1,
    });
    expect(esito.giri).toBe(2);
  });

  it('conta i giri fatti davvero: un ciclo da un giro con tre print ne fa uno', () => {
    const esito = esegui('for i in range(1):\n    print(1)\n    print(2)\n    print(3)');
    if (!esito.ok) throw new Error(esito.errore.messaggio);
    expect(esito.output).toEqual(['1', '2', '3']);
    expect(esito.giri).toBe(1);
    const annidato = esegui('for i in range(3):\n    for j in range(2):\n        print(i, j)');
    if (!annidato.ok) throw new Error(annidato.errore.messaggio);
    expect(annidato.giri).toBe(9);
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

describe('accumuli nel ciclo (per le tappe della somma)', () => {
  const accumuli = (codice: string) => {
    const esito = esegui(codice);
    if (!esito.ok) throw new Error(esito.errore.messaggio);
    return esito.struttura.accumuliNelCiclo;
  };

  it('riconosce += dentro il ciclo', () => {
    expect(accumuli('t = 0\nfor i in range(3):\n    t += i')).toBe(1);
  });

  it('riconosce anche la forma lunga t = t + i', () => {
    expect(accumuli('t = 0\nfor i in range(3):\n    t = t + i')).toBe(1);
  });

  it('un\'assegnazione semplice non è un accumulo', () => {
    expect(accumuli('for i in range(3):\n    t = i')).toBe(0);
  });

  it('un += fuori dal ciclo non conta', () => {
    expect(accumuli('t = 0\nt += 5\nfor i in range(3):\n    print(i)')).toBe(0);
  });
});

describe('input() e int(), con le risposte fornite dalle opzioni', () => {
  const con = (codice: string, risposte: string[]) => {
    const esito = esegui(codice, { risposte });
    if (!esito.ok) throw new Error(`atteso successo, ricevuto errore: ${esito.errore.messaggio}`);
    return esito;
  };

  it('la risposta entra nella variabile e la domanda va sullo schermo, non nell\'output', () => {
    const e = con('nome = input("Come ti chiami? ")\nprint(f"Ciao {nome}!")', ['Luca']);
    expect(e.output).toEqual(['Ciao Luca!']);
    expect(e.interazioni).toEqual([{ domanda: 'Come ti chiami? ', risposta: 'Luca' }]);
    expect(e.schermo).toEqual([
      { k: 'in', domanda: 'Come ti chiami? ', risposta: 'Luca' },
      { k: 'out', v: 'Ciao Luca!' },
    ]);
    expect(e.struttura.numInput).toBe(1);
  });

  it('input() senza domanda, e dentro int()', () => {
    const e = con('n = int(input())\nfor i in range(n): print(i)', ['3']);
    expect(e.output).toEqual(['0', '1', '2']);
    expect(e.interazioni[0].domanda).toBe('');
    expect(e.struttura.numInput).toBe(1);
  });

  it('le risposte si consumano in ordine', () => {
    const e = con('a = input("a? ")\nb = input("b? ")\nprint(a + b)', ['x', 'y']);
    expect(e.output).toEqual(['xy']);
  });

  it('input() dà un testo: sommarlo a un numero spiega int()', () => {
    const esito = esegui('n = input("quanti? ")\nprint(n + 1)', ['3'].length ? { risposte: ['3'] } : {});
    expect(esito.ok).toBe(false);
    if (!esito.ok) expect(esito.errore.messaggio).toContain('int()');
  });

  it('int() su un testo che non è un numero', () => {
    const esito = esegui('n = int(input())\nprint(n)', { risposte: ['tre'] });
    expect(esito.ok).toBe(false);
    if (!esito.ok) expect(esito.errore.messaggio).toContain('«tre»');
  });

  it('troppe domande rispetto alle risposte', () => {
    const esito = esegui('a = input()\nb = input()', { risposte: ['x'] });
    expect(esito.ok).toBe(false);
    if (!esito.ok) expect(esito.errore.tipo).toBe('limite');
  });

  it('senza risposte nelle opzioni input() resta vietato (le tappe del Giro)', () => {
    expect(errore('x = input()').tipo).toBe('nonAmmesso');
  });

  it('input e int senza parentesi, e int vuoto', () => {
    expect(errore('x = input').messaggio).toContain('parentesi');
    expect(errore('x = int()').messaggio).toContain('vuoto');
  });

  it('input() non si può usare come nome di variabile', () => {
    expect(errore('input = 3').tipo).toBe('nonAmmesso');
  });
});

describe('modalità interattiva (la «Prova» dell\'allievo con i suoi input)', () => {
  const scontrino = ['nome = input("Nome? ")', 'panini = int(input("Panini? "))', 'for i in range(panini):', '    print(f"Panino {i + 1}")', 'print(f"Grazie {nome}")'].join('\n');

  it('senza risposte si ferma alla prima domanda, con lo schermo fin lì', () => {
    const esito = esegui('print("Benvenuto")\n' + scontrino, { risposte: [], interattivo: true });
    expect(esito.ok).toBe(false);
    if (esito.ok) return;
    expect(esito.errore.tipo).toBe('input');
    expect(esito.attesaInput).toBe('Nome? ');
    expect(esito.schermo).toEqual([{ k: 'out', v: 'Benvenuto' }]);
  });

  it('con una risposta si ferma alla seconda domanda, e la prima resta sullo schermo', () => {
    const esito = esegui(scontrino, { risposte: ['Luca'], interattivo: true });
    expect(esito.ok).toBe(false);
    if (esito.ok) return;
    expect(esito.attesaInput).toBe('Panini? ');
    expect(esito.schermo).toEqual([{ k: 'in', domanda: 'Nome? ', risposta: 'Luca' }]);
  });

  it('con tutte le risposte arriva in fondo', () => {
    const esito = esegui(scontrino, { risposte: ['Luca', '2'], interattivo: true });
    expect(esito.ok).toBe(true);
    if (!esito.ok) return;
    expect(esito.output).toEqual(['Panino 1', 'Panino 2', 'Grazie Luca']);
  });

  it('un errore dopo una risposta porta con sé lo schermo fino a lì', () => {
    const esito = esegui('nome = input("Nome? ")\nprint(nomee)', { risposte: ['Luca'], interattivo: true });
    expect(esito.ok).toBe(false);
    if (esito.ok) return;
    expect(esito.errore.tipo).toBe('nome');
    expect(esito.attesaInput).toBeUndefined();
    expect(esito.schermo).toEqual([{ k: 'in', domanda: 'Nome? ', risposta: 'Luca' }]);
  });

  it('senza numeri di prova randint dà un numero vero fra i limiti', () => {
    for (let k = 0; k < 20; k++) {
      const esito = esegui('import random\nn = random.randint(3, 5)\nprint(n)', { interattivo: true });
      expect(esito.ok).toBe(true);
      if (!esito.ok) return;
      expect([3, 4, 5]).toContain(Number(esito.output[0]));
    }
  });

  it('fuori dalla modalità interattiva le risposte finite restano un errore di limite', () => {
    const esito = esegui(scontrino, { risposte: ['Luca'] });
    expect(esito.ok).toBe(false);
    if (esito.ok) return;
    expect(esito.errore.tipo).toBe('limite');
    expect(esito.attesaInput).toBeUndefined();
  });
});

describe('diagnosi mirate sugli errori visti in classe (PERCORSO.md §23)', () => {
  it('il testo senza virgolette dentro print() o input() dice che mancano le virgolette, non «il carattere € non si può usare»', () => {
    const e = errore('nome = input("Nome? ")\ninput(Hai dato 50 €, resto 25 €. Grazie Pietro!)');
    expect(e.messaggio).toContain('va fra virgolette');
    expect(e.messaggio).toContain('`input(...)`');
    expect(e.riga).toBe(2);
    expect(errore('print(Settimana i)').messaggio).toContain('va fra virgolette');
    // Le variabili e i calcoli dentro print() non c'entrano.
    expect(out('a = 3\nprint(a)')).toEqual(['3']);
    expect(out('a = 3\nb = 4\nprint(a, b)')).toEqual(['3 4']);
    expect(out('a = 3\nprint(a + 5)')).toEqual(['8']);
  });

  it('il carattere fuori dalle virgolette suggerisce le virgolette', () => {
    expect(errore('print("ciao") €').messaggio).toContain('il testo va fra virgolette');
  });

  it('il codice JavaScript viene riconosciuto', () => {
    const e = errore('console.log("Bar Stazione")');
    expect(e.messaggio).toContain('JavaScript');
    expect(e.messaggio).toContain('`print(...)`');
    expect(errore('let x = 3\nprint(x)').messaggio).toContain('JavaScript');
    expect(errore('const totale = 0').messaggio).toContain('JavaScript');
  });

  it('un confronto da solo su una riga dice che va dopo if', () => {
    const codice = 'panini = 4\nfor i in range(1, panini + 1):\n    print(f"Panino {i}")\n    (i == 3)\n    print("omaggio")';
    const e = errore(codice);
    expect(e.messaggio).toContain('Un confronto da solo non fa niente');
    expect(e.messaggio).toContain('`if`');
    expect(e.riga).toBe(4);
  });

  it('le stesse virgolette dentro le graffe della f-string: il messaggio lo dice', () => {
    const e = errore('for i in range(1, 4):\n    print(f"Settimana {i}: {"*" * i}")');
    expect(e.messaggio).toContain('stesse virgolette');
    expect(e.messaggio).toContain('apici singoli');
    expect(e.riga).toBe(2);
    // Le graffe fuori da una f-string: stesso indizio.
    const g = errore('n = 3\nprint(f"Totale: " + {n})');
    expect(g.messaggio).toContain('Le graffe `{}` si usano solo dentro una f-string');
    // La graffa aperta con del testo dopo resta l'errore di prima.
    expect(errore('print(f"Totale {n euro")').messaggio).toContain("non l'hai chiusa");
  });

  it('i cicli for che non girano mai vengono registrati, con i numeri di range', () => {
    const esito = esegui('for i in range(6, 0):\n    print(i)\nprint("Partenza!")');
    expect(esito.ok).toBe(true);
    if (!esito.ok) return;
    expect(esito.output).toEqual(['Partenza!']);
    expect(esito.cicliVuoti).toEqual([{ riga: 1, inizio: 6, fine: 0, passo: 1 }]);
    // range(0) in un ciclo annidato è legittimo e non è un errore.
    const scala = esegui('for i in range(3):\n    for j in range(i):\n        print("*")\n    print("-")');
    expect(scala.ok).toBe(true);
    if (scala.ok) expect(scala.cicliVuoti).toEqual([]);
  });
});

describe('altre diagnosi dalla classe: parentesi attorno alla condizione, virgolette nella f-string', () => {
  it('if (x <= 5): con le parentesi attorno alla condizione va bene, come in Python', () => {
    expect(out('x = 3\nif (x <= 5):\n    print("ok")')).toEqual(['ok']);
    expect(out('x = 3\nif(x == 3):\n    print("tre")\nelse:\n    print("altro")')).toEqual(['tre']);
    expect(out('n = 3\nwhile (n > 0):\n    print(n)\n    n -= 1')).toEqual(['3', '2', '1']);
    // Le parentesi che non avvolgono tutta la condizione restano un calcolo.
    expect(out('x = 3\nif (x + 1) == 4:\n    print("quattro")')).toEqual(['quattro']);
  });

  it('le stesse virgolette dentro le graffe con il resto della riga dopo: il messaggio indica la causa', () => {
    const e = errore('a = 2\nfor i in range(1, 4):\n    print(f"Settimana {i}: {a} € (f"\'*\'* {i}"")")');
    expect(e.messaggio).toContain('stesse virgolette');
    expect(e.riga).toBe(3);
    // Senza f-string sulla riga, le virgolette mai chiuse restano il messaggio di prima.
    expect(errore('print("ciao)').messaggio).toContain('Virgolette aperte e mai chiuse');
  });
});
