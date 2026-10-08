import { describe, expect, it } from 'vitest';
import {
  classifica,
  cronaca,
  erroriPerTappa,
  formattaDurata,
  riepilogoPerTipo,
  ultimoArrivoMs,
  type AllievoLim,
} from './classifica';
import type { TipoTappa } from './tappe';

const t = (minuti: number) => new Date(2026, 0, 1, 10, minuti, 0);

function allievo(parziale: Partial<AllievoLim> & { name: string }): AllievoLim {
  return {
    id: parziale.name.toLowerCase(),
    tappaCorrente: 0,
    tappe: {},
    erroriTotali: 0,
    finishedAt: null,
    ordineArrivo: null,
    ...parziale,
  };
}

/** Allievo che ha completato le tappe 0..n-1, l'ultima all'istante dato. */
function conTappe(name: string, quante: number, ultimoMinuto: number, extra: Partial<AllievoLim> = {}) {
  const tappe: AllievoLim['tappe'] = {};
  for (let i = 0; i < quante; i++) {
    tappe[String(i)] = { completedAt: t(ultimoMinuto - (quante - 1 - i)), errori: 0 };
  }
  return allievo({ name, tappaCorrente: quante, tappe, ...extra });
}

describe('classifica', () => {
  it('davanti chi ha fatto più tappe', () => {
    const ordine = classifica([conTappe('Sara', 3, 20), conTappe('Luca', 7, 25), conTappe('Omar', 5, 12)]);
    expect(ordine.map((a) => a.name)).toEqual(['Luca', 'Omar', 'Sara']);
  });

  it('a parità di tappe davanti chi è arrivato prima a quella tappa', () => {
    const ordine = classifica([conTappe('Tardi', 4, 30), conTappe('Presto', 4, 12)]);
    expect(ordine.map((a) => a.name)).toEqual(['Presto', 'Tardi']);
  });

  it('fra due arrivati conta l\'ordine d\'arrivo del server', () => {
    const primo = conTappe('Primo', 6, 30, { finishedAt: t(30), ordineArrivo: 1 });
    const secondo = conTappe('Secondo', 6, 29, { finishedAt: t(29), ordineArrivo: 2 });
    // Secondo ha l'ultimo completamento più vecchio, ma il server lo ha registrato dopo:
    // comanda l'ordine d'arrivo.
    expect(classifica([secondo, primo]).map((a) => a.name)).toEqual(['Primo', 'Secondo']);
  });

  it('chi non ha ancora completato niente sta in fondo, non in testa', () => {
    const fermo = allievo({ name: 'Fermo' });
    const ordine = classifica([fermo, conTappe('Chi parte', 1, 5)]);
    expect(ordine.map((a) => a.name)).toEqual(['Chi parte', 'Fermo']);
  });

  it('due allievi fermi al palo si ordinano per nome', () => {
    const ordine = classifica([allievo({ name: 'Zoe' }), allievo({ name: 'Ada' })]);
    expect(ordine.map((a) => a.name)).toEqual(['Ada', 'Zoe']);
  });

  it('gli errori non spostano la classifica', () => {
    const preciso = conTappe('Preciso', 4, 20);
    const sbagliona = conTappe('Sbagliona', 4, 15, { erroriTotali: 12 });
    // Sbagliona ha sbagliato molto ma è arrivata prima a quella tappa: sta davanti.
    expect(classifica([preciso, sbagliona]).map((a) => a.name)).toEqual(['Sbagliona', 'Preciso']);
  });

  it('non modifica l\'elenco che riceve', () => {
    const elenco = [conTappe('B', 1, 5), conTappe('A', 9, 5)];
    classifica(elenco);
    expect(elenco.map((a) => a.name)).toEqual(['B', 'A']);
  });
});

describe('ultimoArrivoMs', () => {
  it('è l\'istante della tappa più recente', () => {
    expect(ultimoArrivoMs(conTappe('Luca', 3, 20))).toBe(t(20).getTime());
  });

  it('è 0 per chi non ha completato niente', () => {
    expect(ultimoArrivoMs(allievo({ name: 'Fermo' }))).toBe(0);
  });
});

describe('cronaca', () => {
  it('le tappe chiuse più di recente, in cima', () => {
    const eventi = cronaca([conTappe('Luca', 2, 10), conTappe('Sara', 3, 12)]);
    expect(eventi[0]).toMatchObject({ nome: 'Sara', tappa: 3 });
    expect(eventi).toHaveLength(5);
  });

  it('si ferma al numero richiesto', () => {
    expect(cronaca([conTappe('Luca', 9, 30)], 3)).toHaveLength(3);
  });

  it('senza tappe chiuse non c\'è cronaca', () => {
    expect(cronaca([allievo({ name: 'Fermo' })])).toEqual([]);
  });
});

describe('errori e riepilogo', () => {
  const conErrori = (name: string, errori: number[]) =>
    allievo({
      name,
      tappaCorrente: errori.length,
      tappe: Object.fromEntries(errori.map((e, i) => [String(i), { completedAt: t(i), errori: e }])),
    });

  it('somma gli errori di tutta la classe tappa per tappa', () => {
    expect(erroriPerTappa([conErrori('A', [1, 0, 3]), conErrori('B', [2, 0, 1])], 3)).toEqual([3, 0, 4]);
  });

  it('ignora le tappe fuori dal percorso', () => {
    expect(erroriPerTappa([conErrori('A', [1, 5])], 1)).toEqual([1]);
  });

  it('raggruppa per tipo, dal più ostico', () => {
    const tipi: TipoTappa[] = ['ripeti-n', 'output-range', 'accumulatore'];
    const riepilogo = riepilogoPerTipo([conErrori('A', [0, 1, 9]), conErrori('B', [1, 0, 7])], tipi);
    expect(riepilogo[0].tipo).toBe('accumulatore');
    expect(riepilogo[0].errori).toBe(16);
    expect(riepilogo[riepilogo.length - 1].errori).toBeLessThan(riepilogo[0].errori);
  });

  it('con due tappe dello stesso tipo conta la media per tappa', () => {
    const tipi: TipoTappa[] = ['output-range', 'output-range', 'accumulatore'];
    // output-range: 10 errori su 2 tappe = 5; accumulatore: 6 su 1 = 6, quindi davanti.
    const riepilogo = riepilogoPerTipo([conErrori('A', [5, 5, 6])], tipi);
    expect(riepilogo[0].tipo).toBe('accumulatore');
    expect(riepilogo[1]).toMatchObject({ tipo: 'output-range', errori: 10, tappe: 2 });
  });
});

describe('formattaDurata', () => {
  it('mm:ss sotto l\'ora', () => {
    expect(formattaDurata(0)).toBe('00:00');
    expect(formattaDurata(65_000)).toBe('01:05');
  });

  it('h:mm:ss sopra l\'ora', () => {
    expect(formattaDurata(3_725_000)).toBe('1:02:05');
  });

  it('niente da mostrare', () => {
    expect(formattaDurata(null)).toBe('–');
    expect(formattaDurata(Number.NaN)).toBe('–');
  });
});
