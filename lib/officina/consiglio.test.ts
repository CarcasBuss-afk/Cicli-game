/* Test del consiglio a parole: il filtro anti-codice è la regola che il docente ha dato ("i
 * consigli non sono mai la scrittura del codice"), e deve reggere anche quando il modello
 * sbaglia. */
import { describe, expect, it } from 'vitest';
import { consiglioFinto, contieneCodice, messaggioConsiglio, normalizzaDomanda, provaCheCade, pulisciConsiglio, type ContestoConsiglio } from './consiglio';
import { generaCompito, schedaCompito } from './compiti';

describe('contieneCodice', () => {
  it('lascia passare i consigli a parole, anche con nomi fra apici', () => {
    for (const ok of [
      'Il totale non cresce perché lo azzeri a ogni giro: la riga che lo mette a 0 deve stare prima del ciclo.',
      'Guarda il secondo numero di `range`: il ciclo si ferma una settimana prima.',
      'Dentro il `print` ti serve anche la variabile `totale`, non solo il numero della settimana.',
      'La f-string vuole la `f` prima delle virgolette, altrimenti le graffe restano testo.',
      'Ricorda che `"*" * 3` fa tre asterischi: usa la settimana al posto del 3.',
      'Hai chiuso la riga del `for` con i due punti?',
    ]) {
      expect(contieneCodice(ok), ok).toBe(false);
    }
  });

  it('ferma blocchi, righe intere di codice e istruzioni fra apici', () => {
    for (const no of [
      'Prova così:\n```python\nfor i in range(1, 9):\n    print(i)\n```',
      'Scrivi questa riga:\nfor i in range(1, 9):',
      'Ti basta `print(f"Settimana {i}: {totale} €")` dentro il ciclo.',
      'Aggiungi `totale += 15` dentro il ciclo.',
      'Prima del ciclo metti\ntotale = 0\ne poi vai avanti.',
      '- print("Settimana", i)',
      'Scrivi `totale = totale + 15`.',
    ]) {
      expect(contieneCodice(no), no).toBe(true);
    }
  });

  it("lascia citare le righe che l'allievo ha scritto, non quelle che dovrebbe scrivere", () => {
    const suo = 'for i in range(1, 9):\n    totale = 0\n    totale += 15\n    print(f"Settimana {i}: {totale} €")';
    expect(contieneCodice('Guarda la riga `totale = 0`: è dentro il ciclo, quindi riparte da zero a ogni giro.', suo)).toBe(false);
    expect(contieneCodice('Il numero in `totale += 15` non è la quota della consegna.', suo)).toBe(false);
    // Spazi diversi non cambiano la citazione.
    expect(contieneCodice('La riga `totale=0` va spostata.', suo)).toBe(false);
    // La riga giusta, che lui non ha scritto, resta vietata; i blocchi sempre.
    expect(contieneCodice('Scrivi `totale += 20` al posto di quella riga.', suo)).toBe(true);
    expect(contieneCodice('Il tuo codice:\n```\ntotale = 0\n```', suo)).toBe(true);
    expect(contieneCodice('Guarda la riga `totale = 0`.', '')).toBe(true);
  });
});

describe('il messaggio al modello', () => {
  const scheda = schedaCompito('salvadanaio', 3);
  const fasi = generaCompito('salvadanaio', 3);
  const base: ContestoConsiglio = {
    scheda,
    fase: 3,
    fasiTotali: 5,
    esercizio: fasi[2],
    codice: 'for i in range(1, 9):\n    print(f"Settimana {i}: 15 €")',
    esito: { output: ['Settimana 1: 15 €'] },
    hint: 'Alla riga 2 stampi «Settimana 2: 15 €», invece ci vuole «Settimana 2: 30 €»',
    domanda: 'perché non cresce?',
    precedenti: [{ fase: 2, consiglio: 'Guarda i due punti.' }],
  };

  it('contiene consegna, output atteso, codice, esito, hint, domanda e consigli già dati', () => {
    const m = messaggioConsiglio(base);
    expect(m).toContain('FASE 3 di 5');
    expect(m).toContain(fasi[2].outputAtteso[0]);
    expect(m).toContain('print(f"Settimana {i}: 15 €")');
    expect(m).toContain('OUTPUT CHE PRODUCE IL SUO CODICE');
    expect(m).toContain('Hint automatico');
    expect(m).toContain('perché non cresce?');
    expect(m).toContain('Guarda i due punti.');
    expect(m).not.toContain('**');
  });

  it('non contiene la soluzione di riferimento', () => {
    const m = messaggioConsiglio(base);
    expect(m).not.toContain(fasi[2].soluzione);
  });

  it("segnala l'errore quando il codice non gira, e la domanda assente", () => {
    const m = messaggioConsiglio({ ...base, esito: { errore: 'Manca il `:`' }, domanda: '' });
    expect(m).toContain('NON GIRA');
    expect(m).toContain('non ha scritto una domanda');
  });

  it('porta la regola del compito, quella che applica il giudice', () => {
    const m = messaggioConsiglio(base);
    expect(fasi[2].regola).toBeTruthy();
    expect(m).toContain('REGOLA DEL COMPITO');
    expect(m).toContain(fasi[2].regola!);
    expect(messaggioConsiglio({ ...base, esercizio: { ...fasi[2], regola: undefined } })).not.toContain('REGOLA DEL COMPITO');
  });

  it('racconta la prova nascosta su cui cade, con risposte, atteso e prodotto', () => {
    const m = messaggioConsiglio({ ...base, provaNascosta: { risposte: ['2', '7', '9'], atteso: ['Totale: 16 km'], prodotto: ['Totale: 38 km'] } });
    expect(m).toContain('CADE SU UN\'ALTRA PROVA');
    expect(m).toContain('«2», «7», «9»');
    expect(m).toContain('deve stampare:\nTotale: 16 km');
    expect(m).toContain('invece stampa:\nTotale: 38 km');
    const errore = messaggioConsiglio({ ...base, provaNascosta: { risposte: ['2'], atteso: ['x'], prodotto: null, errore: 'chiede più cose' } });
    expect(errore).toContain("si ferma con l'errore: chiede più cose");
    expect(messaggioConsiglio({ ...base, provaNascosta: null })).not.toContain('ALTRA PROVA');
  });
});

describe('provaCheCade', () => {
  const fasi = generaCompito('diario', 7);
  const fase3 = fasi[2]; // il totale: input() nel ciclo e tre mesi di prova
  const prove = fase3.prove!;

  it('trova la prova nascosta che il codice con il totale scritto a mano non passa', () => {
    const km = prove[0].risposte.slice(1);
    const aMano = [
      'uscite = int(input("Quante uscite? "))',
      'for i in range(1, uscite + 1):',
      '    km = int(input("Km? "))',
      '    print(f"Uscita {i}: {km} km")',
      `print("Totale: ${km.reduce((a, b) => a + Number(b), 0)} km")`,
    ].join('\n');
    const caduta = provaCheCade(fase3, aMano);
    expect(caduta).not.toBeNull();
    expect(caduta!.risposte).toEqual(prove[1].risposte);
    expect(caduta!.atteso).toEqual(prove[1].output);
    expect(caduta!.prodotto).not.toBeNull();
    expect(caduta!.prodotto!.at(-1)).not.toBe(prove[1].output.at(-1));
  });

  it('non segnala niente se la soluzione passa, se cade già sulla prova mostrata, o senza prove', () => {
    expect(provaCheCade(fase3, fase3.soluzione)).toBeNull();
    expect(provaCheCade(fase3, 'print("Totale: 0 km")')).toBeNull();
    expect(provaCheCade(fase3, '')).toBeNull();
    const senza = generaCompito('cartello', 7)[0];
    expect(provaCheCade(senza, senza.soluzione)).toBeNull();
  });

  it("riporta l'errore quando con altre risposte il programma si ferma", () => {
    // Il numero di uscite scritto a mano: con la prova mostrata passa, con il mese corto chiede più km di quelli che ci sono.
    const [n, ...km] = prove[0].risposte;
    const fisso = [
      'uscite = int(input("Quante uscite? "))',
      'totale = 0',
      `for i in range(1, ${n} + 1):`,
      '    km = int(input("Km? "))',
      '    totale += km',
      '    print(f"Uscita {i}: {km} km")',
      'print(f"Totale: {totale} km")',
    ].join('\n');
    expect(prove[1].risposte.length).toBeLessThan(km.length + 1);
    const caduta = provaCheCade(fase3, fisso);
    expect(caduta).not.toBeNull();
    expect(caduta!.prodotto).toBeNull();
    expect(caduta!.errore).toContain('chiede più cose');
  });
});

describe('pulizia', () => {
  it('taglia i consigli lunghi a una frase intera', () => {
    const lungo = Array.from({ length: 40 }, (_, i) => `Frase numero ${i} abbastanza lunga.`).join(' ');
    const corto = pulisciConsiglio(lungo);
    expect(corto.length).toBeLessThanOrEqual(600);
    expect(corto.endsWith('.')).toBe(true);
  });

  it('normalizza la domanda', () => {
    expect(normalizzaDomanda('  come   faccio?\n ')).toBe('come faccio?');
    expect(normalizzaDomanda(42)).toBe('');
    expect(normalizzaDomanda('x'.repeat(500))).toHaveLength(300);
  });
});

describe('il consiglio finto', () => {
  const scheda = schedaCompito('salvadanaio', 1);
  const fasi = generaCompito('salvadanaio', 1);
  const ctx = (domanda: string): ContestoConsiglio => ({
    scheda,
    fase: 1,
    fasiTotali: 5,
    esercizio: fasi[0],
    codice: '',
    esito: { output: [] },
    hint: null,
    domanda,
    precedenti: [],
  });

  it('risponde a parole, e ripete il testo dopo FINTO: per i test del filtro', () => {
    expect(contieneCodice(consiglioFinto(ctx('aiuto')))).toBe(false);
    expect(consiglioFinto(ctx('FINTO: scrivi `print(i)`'))).toBe('scrivi `print(i)`');
  });
});

describe('il contesto dopo la prima settimana in classe (PERCORSO.md §23)', () => {
  const scheda = schedaCompito('promozione', 3);
  const fasi = generaCompito('promozione', 3);
  const base: ContestoConsiglio = {
    scheda,
    fase: 5,
    fasiTotali: 5,
    esercizio: fasi[4],
    codice: fasi[4].soluzione,
    esito: {
      output: fasi[4].outputAtteso,
      struttura: {
        numFor: 1,
        righeCorpoMax: 2,
        numPrint: 8,
        printFuoriCiclo: 6,
        numRighe: 20,
        numInput: 2,
        inputNelCiclo: 0,
        accumuliNelCiclo: 1,
        numIf: 2,
        ifNelCiclo: 1,
        numWhile: 0,
        whileAggiornati: 0,
        numCasuali: 0,
        casualiNelCiclo: 0,
      },
      giri: 6,
    },
    erroriFase: 16,
    hint: null,
    domanda: 'Cosa devo cambiare?',
    precedenti: [],
  };

  it("porta la nota dell'autore per il tutor, dicendo che l'allievo non la vede", () => {
    const m = messaggioConsiglio(base);
    expect(fasi[4].nota).toBeTruthy();
    expect(m).toContain("NOTA DELL'AUTORE DEL COMPITO PER TE");
    expect(m).toContain(fasi[4].nota!);
    expect(messaggioConsiglio({ ...base, esercizio: { ...fasi[4], nota: undefined } })).not.toContain("NOTA DELL'AUTORE");
  });

  it('porta i fatti misurati dall\'interprete, come al giudice', () => {
    const m = messaggioConsiglio(base);
    expect(m).toContain('FATTI MISURATI SUL SUO CODICE');
    expect(m).toContain('- cicli for: 1');
    expect(m).toContain('- if: 2 (di cui dentro un ciclo: 1)');
    expect(m).toContain('- giri fatti in tutto: 6');
    expect(messaggioConsiglio({ ...base, esito: { output: [] } })).not.toContain('FATTI MISURATI');
    expect(messaggioConsiglio({ ...base, esito: { errore: 'manca :' } })).not.toContain('FATTI MISURATI');
  });

  it('dice quante volte ha già sbagliato la fase, e con tante chiede il passo più piccolo', () => {
    expect(messaggioConsiglio(base)).toContain('ha già consegnato 16 volte senza passare. È fermo da un pezzo');
    const poche = messaggioConsiglio({ ...base, erroriFase: 2 });
    expect(poche).toContain('ha già consegnato 2 volte senza passare.');
    expect(poche).not.toContain('fermo da un pezzo');
    expect(messaggioConsiglio({ ...base, erroriFase: 1 })).toContain('1 volta senza passare');
    expect(messaggioConsiglio({ ...base, erroriFase: 0 })).not.toContain('senza passare');
    expect(messaggioConsiglio({ ...base, erroriFase: undefined })).not.toContain('senza passare');
  });
});
