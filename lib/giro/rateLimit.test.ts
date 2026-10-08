import { afterEach, describe, expect, it } from 'vitest';
import { limitePerMinuto, richiestaAmmessa } from './rateLimit';

const originale = process.env.GIRO_RATE_LIMIT_PER_MINUTE;

afterEach(() => {
  if (originale === undefined) delete process.env.GIRO_RATE_LIMIT_PER_MINUTE;
  else process.env.GIRO_RATE_LIMIT_PER_MINUTE = originale;
});

describe('rate limiting', () => {
  it('il limite di default è 30 al minuto', () => {
    delete process.env.GIRO_RATE_LIMIT_PER_MINUTE;
    expect(limitePerMinuto()).toBe(30);
  });

  it('un valore non valido ricade sul default', () => {
    process.env.GIRO_RATE_LIMIT_PER_MINUTE = 'tanto';
    expect(limitePerMinuto()).toBe(30);
    process.env.GIRO_RATE_LIMIT_PER_MINUTE = '-5';
    expect(limitePerMinuto()).toBe(30);
  });

  it('ammette fino al limite e poi blocca', () => {
    process.env.GIRO_RATE_LIMIT_PER_MINUTE = '3';
    const ora = 1_000_000;
    expect(richiestaAmmessa('player:a', ora)).toBe(true);
    expect(richiestaAmmessa('player:a', ora)).toBe(true);
    expect(richiestaAmmessa('player:a', ora)).toBe(true);
    expect(richiestaAmmessa('player:a', ora)).toBe(false);
  });

  it('ogni allievo ha il suo contatore', () => {
    process.env.GIRO_RATE_LIMIT_PER_MINUTE = '1';
    const ora = 2_000_000;
    expect(richiestaAmmessa('player:b', ora)).toBe(true);
    expect(richiestaAmmessa('player:b', ora)).toBe(false);
    expect(richiestaAmmessa('player:c', ora)).toBe(true);
  });

  it('passato il minuto la finestra riparte', () => {
    process.env.GIRO_RATE_LIMIT_PER_MINUTE = '1';
    const ora = 3_000_000;
    expect(richiestaAmmessa('player:d', ora)).toBe(true);
    expect(richiestaAmmessa('player:d', ora + 59_000)).toBe(false);
    expect(richiestaAmmessa('player:d', ora + 60_001)).toBe(true);
  });
});
