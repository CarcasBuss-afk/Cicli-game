/* Test del Gregario: il filtro anti-codice è la regola che il docente ha dato ("i
 * consigli non sono mai la scrittura del codice"), e deve reggere anche quando il modello
 * sbaglia. */
import { describe, expect, it } from 'vitest';
import { consiglioFinto, contieneCodice, messaggioConsiglio, normalizzaDomanda, pulisciConsiglio, type ContestoConsiglio } from './gregario';
import { generaCronoscalata, schedaProgetto } from './progetti';

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
});

describe('il messaggio al modello', () => {
  const scheda = schedaProgetto('salvadanaio', 3);
  const fasi = generaCronoscalata('salvadanaio', 3);
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

describe('il gregario finto', () => {
  const scheda = schedaProgetto('salvadanaio', 1);
  const fasi = generaCronoscalata('salvadanaio', 1);
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
