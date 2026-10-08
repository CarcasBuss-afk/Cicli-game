import { describe, expect, it } from 'vitest';
import { cronaca, formattaSecondi, riepilogoErrori, type AllievoLim, type ProgressoLim } from './classifica';

const t = (minuti: number) => new Date(2026, 0, 1, 10, minuti, 0);

function progresso(km: number, ultimoMinuto: number, erroriKm: Record<string, number> = {}): ProgressoLim {
  const kmAt: Record<string, Date> = {};
  for (let i = 0; i < km; i++) kmAt[String(i)] = t(ultimoMinuto - (km - 1 - i));
  const errori = Object.values(erroriKm).reduce((s, v) => s + v, 0);
  return { km, kmAt, errori, erroriKm, ultimoAt: km > 0 ? t(ultimoMinuto) : null, ordineArrivo: null, posizione: null, punti: null };
}

function allievo(name: string, tappe: Record<string, ProgressoLim>): AllievoLim {
  return { id: name.toLowerCase(), name, numero: null, erroriTotali: 0, tappe };
}

describe('cronaca della tappa', () => {
  it('i chilometri chiusi più di recente in cima', () => {
    const eventi = cronaca([allievo('Luca', { '0': progresso(2, 10) }), allievo('Sara', { '0': progresso(3, 12) })], 0);
    expect(eventi[0]).toMatchObject({ nome: 'Sara', km: 3 });
    expect(eventi).toHaveLength(5);
  });

  it('guarda solo la tappa richiesta', () => {
    const a = allievo('Luca', { '0': progresso(5, 10), '1': progresso(1, 30) });
    expect(cronaca([a], 1)).toHaveLength(1);
  });

  it('si ferma al numero richiesto', () => {
    expect(cronaca([allievo('Luca', { '0': progresso(5, 30) })], 0, 3)).toHaveLength(3);
  });

  it('senza chilometri chiusi non c\'è cronaca', () => {
    expect(cronaca([allievo('Fermo', {})], 0)).toEqual([]);
  });
});

describe('riepilogo degli errori per tipo', () => {
  it('somma gli errori di tutta la classe su tutte le tappe e ordina dal più ostico', () => {
    const tipi = [
      ['ripeti-n', 'ripeti-n'],
      ['scala', 'scala'],
    ] as const;
    const classe = [
      allievo('A', { '0': progresso(2, 5, { '0': 1 }), '1': progresso(2, 20, { '0': 4, '1': 2 }) }),
      allievo('B', { '1': progresso(1, 25, { '0': 3 }) }),
    ];
    const r = riepilogoErrori(tipi.map((x) => [...x]), classe);
    expect(r[0]).toMatchObject({ tipo: 'scala', errori: 9, km: 2 });
    expect(r[1]).toMatchObject({ tipo: 'ripeti-n', errori: 1, km: 2 });
  });

  it('a parità di errori conta la media per chilometro', () => {
    // output-range: 6 errori su 3 km = 2; scala: 4 su 1 km = 4, quindi davanti.
    const tipi = [['output-range', 'output-range', 'output-range', 'scala']] as const;
    const classe = [allievo('A', { '0': progresso(4, 9, { '0': 2, '1': 2, '2': 2, '3': 4 }) })];
    expect(riepilogoErrori([[...tipi[0]]], classe)[0].tipo).toBe('scala');
  });
});

describe('formattaSecondi', () => {
  it('minuti e secondi', () => {
    expect(formattaSecondi(0)).toBe('0:00');
    expect(formattaSecondi(65)).toBe('1:05');
    expect(formattaSecondi(600)).toBe('10:00');
  });

  it('niente da mostrare', () => {
    expect(formattaSecondi(null)).toBe('–');
  });
});
