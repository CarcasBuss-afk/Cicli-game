import { describe, expect, it } from 'vitest';
import { idValido, nomeSfondo, scegliSfondo, tipoDaiByte } from './formato';

const byte = (...parti: Array<string | number[]>) =>
  new Uint8Array(parti.flatMap((p) => (typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p)));

describe('gli sfondi', () => {
  it('riconosce webp, jpeg e png dai primi byte, e nient altro', () => {
    expect(tipoDaiByte(byte('RIFF', [0, 0, 0, 0], 'WEBPVP8 '))).toBe('image/webp');
    expect(tipoDaiByte(byte([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(tipoDaiByte(byte([0x89], 'PNG', [0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
    expect(tipoDaiByte(byte('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull();
    expect(tipoDaiByte(byte('GIF89a'))).toBeNull();
    expect(tipoDaiByte(new Uint8Array())).toBeNull();
  });

  it('il nome è ripulito e mai vuoto', () => {
    expect(nomeSfondo('  Natale   sulla neve ')).toBe('Natale sulla neve');
    expect(nomeSfondo('')).toBe('Sfondo senza nome');
    expect(nomeSfondo(42)).toBe('Sfondo senza nome');
    expect(nomeSfondo('x'.repeat(100))).toHaveLength(60);
  });

  it('accetta come id solo lettere e cifre', () => {
    expect(idValido('aB3xYz')).toBe(true);
    expect(idValido('')).toBe(false);
    expect(idValido('../giroSessions')).toBe(false);
    expect(idValido(7)).toBe(false);
  });

  it('ne sceglie uno a caso fra gli accesi, e tiene quello già scelto se è ancora acceso', () => {
    expect(scegliSfondo([], 'a')).toBeNull();
    expect(scegliSfondo(['a', 'b', 'c'], 'b', 0)).toBe('b');
    expect(scegliSfondo(['a', 'b', 'c'], 'spento', 0)).toBe('a');
    expect(scegliSfondo(['a', 'b', 'c'], null, 0.99)).toBe('c');
    expect(scegliSfondo(['a', 'b', 'c'], null, 0.5)).toBe('b');
    expect(scegliSfondo(['a'], null, 1)).toBe('a');
  });
});
