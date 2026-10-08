import { describe, expect, it } from 'vitest';
import { chiaveNome, normalizzaNome, validaNome, NOME_MAX } from './nomi';

describe('normalizzaNome', () => {
  it('toglie gli spazi di troppo e mette l\'iniziale maiuscola', () => {
    expect(normalizzaNome('  luca  ')).toBe('Luca');
    expect(normalizzaNome('MARIA')).toBe('Maria');
    expect(normalizzaNome('maria   teresa')).toBe('Maria Teresa');
  });

  it('gestisce apostrofi e trattini', () => {
    expect(normalizzaNome("d'angelo")).toBe("D'Angelo");
    expect(normalizzaNome('jean-luc')).toBe('Jean-Luc');
  });

  it('tiene l\'iniziale del cognome', () => {
    expect(normalizzaNome('luca b.')).toBe('Luca B.');
  });

  it('non è un nome se non è una stringa', () => {
    expect(normalizzaNome(undefined)).toBe('');
    expect(normalizzaNome(42)).toBe('');
  });
});

describe('validaNome', () => {
  it('accetta i nomi normali', () => {
    for (const nome of ['Luca', 'Maria Teresa', "D'Angelo", 'Jean-Luc', 'Luca B.', 'Chloé']) {
      expect(validaNome(nome), nome).toBeNull();
    }
  });

  it('rifiuta vuoto, numeri, simboli e nomi troppo lunghi', () => {
    expect(validaNome('')).toContain('vuoto');
    expect(validaNome('Luca123')).toBeTruthy();
    expect(validaNome('luca@scuola.it')).toBeTruthy();
    expect(validaNome('x'.repeat(NOME_MAX + 1))).toContain('troppo lungo');
    expect(validaNome('...')).toContain('almeno una lettera');
  });
});

describe('chiaveNome', () => {
  it('ignora maiuscole, spazi e punti: i doppioni si riconoscono', () => {
    expect(chiaveNome('Luca')).toBe(chiaveNome('luca'));
    expect(chiaveNome('Luca B.')).toBe(chiaveNome('luca b'));
  });

  it('due allievi diversi hanno chiavi diverse', () => {
    expect(chiaveNome('Luca B.')).not.toBe(chiaveNome('Luca C.'));
    expect(chiaveNome('Luca')).not.toBe(chiaveNome('Luca B.'));
  });
});
