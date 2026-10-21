import { describe, expect, it } from 'vitest';
import { dominiAmmessi, emailAmmessa, semeDa, votoLavoro } from './regole';

describe('il seme per allievo', () => {
  it('è stabile e cambia con uid e compito', () => {
    expect(semeDa('uid1|c1')).toBe(semeDa('uid1|c1'));
    expect(semeDa('uid1|c1')).not.toBe(semeDa('uid2|c1'));
    expect(semeDa('uid1|c1')).not.toBe(semeDa('uid1|c2'));
    expect(semeDa('')).toBeGreaterThan(0);
  });
});

describe('il voto del compito', () => {
  it('finito: 10 meno le domande, pavimento 5', () => {
    expect(votoLavoro({ fasi: 5, consigli: 0, finito: true })).toBe(10);
    expect(votoLavoro({ fasi: 5, consigli: 7, finito: true })).toBe(5);
  });
  it('non finito: proporzionale alle fasi', () => {
    expect(votoLavoro({ fasi: 3, consigli: 1, finito: false })).toBe(5);
  });
  it('il voto del docente vince', () => {
    expect(votoLavoro({ fasi: 2, consigli: 4, finito: false, votoDocente: 8 })).toBe(8);
    expect(votoLavoro({ fasi: 5, consigli: 0, finito: true, votoDocente: null })).toBe(10);
  });
});

describe('il dominio della scuola', () => {
  it('senza dominio configurato entrano tutti', () => {
    expect(dominiAmmessi(undefined)).toEqual([]);
    expect(emailAmmessa('chiunque@gmail.com', [])).toBe(true);
  });
  it('con il dominio entra solo la scuola, anche con più domini e la chiocciola', () => {
    const domini = dominiAmmessi(' @scuola.it, Alunni.Scuola.it ');
    expect(domini).toEqual(['scuola.it', 'alunni.scuola.it']);
    expect(emailAmmessa('Luca.Rossi@Scuola.it', domini)).toBe(true);
    expect(emailAmmessa('luca@alunni.scuola.it', domini)).toBe(true);
    expect(emailAmmessa('luca@gmail.com', domini)).toBe(false);
  });
});
