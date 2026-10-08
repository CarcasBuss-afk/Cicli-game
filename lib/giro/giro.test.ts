/* Test del Giro: temi, punti, classifica di tappa e generale con le migliori N tappe. */
import { describe, expect, it } from 'vitest';
import { valutaRisposta } from './hint';
import {
  classificaGenerale,
  classificaTappa,
  generaTappa,
  infoTema,
  KM_PER_TAPPA,
  PUNTI,
  puntiPerPosizione,
  rinumeraDopoCancellazione,
  TEMI,
  TEMI_DEL_GIRO,
  type CorridoreGenerale,
  type CorridoreTappa,
} from './giro';

describe('temi delle tappe', () => {
  it('ogni tappa tematica ha 5 chilometri', () => {
    for (const tema of TEMI_DEL_GIRO) {
      expect(tema.piano, tema.id).toHaveLength(KM_PER_TAPPA);
      expect(generaTappa(tema.id, 1)).toHaveLength(KM_PER_TAPPA);
    }
  });

  it('la soluzione di riferimento di ogni chilometro passa, per ogni tema', () => {
    for (const tema of TEMI) {
      for (let seme = 1; seme <= 15; seme++) {
        for (const es of generaTappa(tema.id, seme * 97)) {
          const esito = valutaRisposta(es, es.soluzione);
          expect(esito.hint, `${tema.id} / ${es.tipo}: ${es.consegna}`).toBeNull();
        }
      }
    }
  });

  it('dentro una tappa la difficoltà non scende', () => {
    for (const tema of TEMI_DEL_GIRO) {
      const d = tema.piano.map((p) => p.difficolta);
      for (let i = 1; i < d.length; i++) expect(d[i], tema.id).toBeGreaterThanOrEqual(d[i - 1]);
    }
  });

  it('ogni tema resta sul suo argomento', () => {
    expect(new Set(infoTema('scala').piano.map((p) => p.tipo))).toEqual(new Set(['scala']));
    expect(new Set(infoTema('caccia').piano.map((p) => p.tipo))).toEqual(new Set(['caccia-errore']));
    // La tappa sul contare non deve mai chiedere il passo, che è la tappa dopo.
    expect(infoTema('contare').piano.every((p) => p.difficolta <= 2)).toBe(true);
  });

  it('stesso seme, stessa tappa: tutti gli allievi corrono gli stessi chilometri', () => {
    expect(generaTappa('passo', 42)).toEqual(generaTappa('passo', 42));
    expect(generaTappa('passo', 42)).not.toEqual(generaTappa('passo', 43));
  });

  it('la gara mista ha i chilometri richiesti', () => {
    expect(generaTappa('misto', 5, 8)).toHaveLength(8);
  });

  it('la cronometro è più corta', () => {
    expect(infoTema('cronometro').durataMinuti).toBeLessThan(infoTema('passo').durataMinuti);
  });
});

describe('punti per posizione', () => {
  it('scalano come nel ciclismo', () => {
    expect(puntiPerPosizione(1, 5)).toBe(PUNTI[0]);
    expect(puntiPerPosizione(2, 5)).toBeLessThan(puntiPerPosizione(1, 5));
  });

  it('chi ha fatto almeno un chilometro prende almeno 1 punto, anche se è ventesimo', () => {
    expect(puntiPerPosizione(20, 1)).toBe(1);
  });

  it('chi non ha fatto niente prende zero', () => {
    expect(puntiPerPosizione(3, 0)).toBe(0);
  });
});

const corridore = (name: string, km: number, ultimoAt: number | null, errori = 0): CorridoreTappa => ({
  id: name.toLowerCase(),
  name,
  numero: null,
  progresso: { km, ultimoAt, errori },
});

describe('classifica di tappa', () => {
  it('davanti chi ha fatto più chilometri', () => {
    const c = classificaTappa([corridore('Sara', 3, 100), corridore('Luca', 5, 900), corridore('Omar', 4, 50)]);
    expect(c.map((r) => r.name)).toEqual(['Luca', 'Omar', 'Sara']);
    expect(c[0].punti).toBe(PUNTI[0]);
  });

  it('a parità di chilometri, chi ci è arrivato prima', () => {
    const c = classificaTappa([corridore('Tardi', 5, 900), corridore('Presto', 5, 300)]);
    expect(c.map((r) => r.name)).toEqual(['Presto', 'Tardi']);
  });

  it('gli errori non spostano la classifica', () => {
    const c = classificaTappa([corridore('Preciso', 5, 500, 0), corridore('Sbaglione', 5, 400, 12)]);
    expect(c[0].name).toBe('Sbaglione');
  });

  it('chi non ha cominciato sta in fondo con zero punti', () => {
    const fermo: CorridoreTappa = { id: 'f', name: 'Fermo', numero: null, progresso: null };
    const c = classificaTappa([fermo, corridore('Chi parte', 1, 100)]);
    expect(c.map((r) => r.name)).toEqual(['Chi parte', 'Fermo']);
    expect(c[1].punti).toBe(0);
  });
});

const generale = (name: string, punti: number[]): CorridoreGenerale => ({
  id: name.toLowerCase(),
  name,
  numero: null,
  punti: Object.fromEntries(punti.map((p, i) => [String(i), p])),
});

describe('classifica generale', () => {
  it('somma i punti di tutte le tappe se N non è impostato', () => {
    const c = classificaGenerale([generale('Ada', [25, 20]), generale('Bea', [16, 16])], null);
    expect(c[0]).toMatchObject({ name: 'Ada', punti: 45 });
  });

  it('con le migliori N, chi è stato assente non resta indietro', () => {
    // Bea ha saltato una tappa (non c'è il suo punteggio), Ada ne ha una andata male.
    const ada = generale('Ada', [20, 20, 2]);
    const bea = generale('Bea', [25, 16]);
    // Contando tutto, Ada è davanti solo perché ha corso una tappa in più: 42 a 41.
    expect(classificaGenerale([ada, bea], null)[0].name).toBe('Ada');
    // Con le migliori 2 si confrontano alla pari, e Bea passa davanti: 41 a 40.
    const migliori2 = classificaGenerale([ada, bea], 2);
    expect(migliori2[0].name).toBe('Bea');
    expect(migliori2.find((r) => r.name === 'Ada')!.punti).toBe(40);
    expect(migliori2.find((r) => r.name === 'Ada')!.tappeContate).toBe(2);
  });

  it('a parità di punti vince chi ha vinto più tappe', () => {
    const regolare = generale('Regolare', [16, 16, 13]); // 45
    const vincente = generale('Vincente', [25, 20]); // 45, una vittoria
    expect(classificaGenerale([regolare, vincente], null)[0].name).toBe('Vincente');
  });

  it('chi non ha ancora punti sta in fondo', () => {
    const c = classificaGenerale([generale('Nuovo', []), generale('Ada', [5])], null);
    expect(c.map((r) => r.name)).toEqual(['Ada', 'Nuovo']);
    expect(c[1].punti).toBe(0);
  });
});

describe('cancellare una tappa', () => {
  it('la voce della tappa tolta sparisce e quelle dopo scalano di uno', () => {
    const progressi = { '0': 'prima', '1': 'seconda', '2': 'terza', '3': 'quarta' };
    expect(rinumeraDopoCancellazione(progressi, 1)).toEqual({ '0': 'prima', '1': 'terza', '2': 'quarta' });
  });

  it('chi era assente nella tappa tolta non perde niente', () => {
    expect(rinumeraDopoCancellazione({ '0': 'a', '2': 'c' }, 1)).toEqual({ '0': 'a', '1': 'c' });
  });

  it('togliere l\'ultima tappa lascia le altre come sono', () => {
    expect(rinumeraDopoCancellazione({ '0': 'a', '1': 'b' }, 1)).toEqual({ '0': 'a' });
  });

  it('una mappa vuota resta vuota', () => {
    expect(rinumeraDopoCancellazione({}, 0)).toEqual({});
  });
});
