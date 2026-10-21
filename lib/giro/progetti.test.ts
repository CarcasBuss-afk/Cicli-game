/* Test della Cronoscalata: le fasi del progetto, la scheda, il voto. La proprietà che
 * conta è la stessa dei generatori: la soluzione di riferimento passa sempre, e ogni fase
 * è la precedente più un pezzo. */
import { describe, expect, it } from 'vitest';
import { valutaRisposta } from './hint';
import { esegui } from './interprete';
import { ELENCO_PROGETTI, generaCronoscalata, schedaProgetto, votoProposto, votoSeFinisce } from './progetti';
import { generaTappa, infoTema, TEMI_DEL_GIRO } from './giro';

const SEMI = Array.from({ length: 40 }, (_, i) => (i + 1) * 1013);

describe.each(ELENCO_PROGETTI)('ogni progetto: %s', (progetto) => {
  it('ha cinque fasi e la soluzione di riferimento passa ognuna, su molti semi', () => {
    for (const seme of SEMI) {
      const fasi = generaCronoscalata(progetto, seme);
      expect(fasi).toHaveLength(5);
      fasi.forEach((fase, i) => {
        const esito = valutaRisposta(fase, fase.soluzione);
        expect(esito.hint, `seme ${seme}, fase ${i + 1}: ${esito.hint}`).toBeNull();
        expect(esito.promosso).toBe(true);
      });
    }
  });

  it('è riproducibile dal seme e cambia con il seme', () => {
    expect(generaCronoscalata(progetto, 7)).toEqual(generaCronoscalata(progetto, 7));
    const diverse = new Set(SEMI.map((s) => generaCronoscalata(progetto, s)[4].outputAtteso.join('\n')));
    expect(diverse.size).toBeGreaterThan(5);
  });

  it('ogni fase mostra il suo output: in un compito di realtà il bersaglio si vede', () => {
    for (const fase of generaCronoscalata(progetto, 42)) {
      expect(fase.mostraOutput).toBe(true);
      expect(fase.tipo).toBe('progetto');
      expect(fase.risposta).toBe('codice');
    }
  });

  it("l'output resta leggibile: al massimo 11 righe", () => {
    for (const seme of SEMI) {
      for (const fase of generaCronoscalata(progetto, seme)) {
        expect(fase.outputAtteso.length).toBeLessThanOrEqual(11);
        expect(fase.outputAtteso.length).toBeGreaterThanOrEqual(6);
      }
    }
  });

  it('la soluzione di una fase non passa la fase dopo: ogni fase aggiunge un pezzo', () => {
    for (const seme of SEMI.slice(0, 10)) {
      const fasi = generaCronoscalata(progetto, seme);
      for (let i = 1; i < fasi.length; i++) {
        expect(valutaRisposta(fasi[i], fasi[i - 1].soluzione).promosso, `seme ${seme}, fase ${i + 1}`).toBe(false);
      }
    }
  });

  it('la scheda mostra per intero il prodotto finale, che è l\'output della fase 5', () => {
    const scheda = schedaProgetto(progetto, 99);
    const fasi = generaCronoscalata(progetto, 99);
    expect(scheda.id).toBe(progetto);
    expect(scheda.outputFinale).toEqual(fasi[4].outputAtteso);
    expect(scheda.committente.length).toBeGreaterThan(40);
  });

  it('è un tema del Giro senza cronometro', () => {
    const tema = TEMI_DEL_GIRO.find((t) => t.progetto === progetto);
    expect(tema).toBeDefined();
    expect(tema!.durataMinuti).toBeNull();
    expect(generaTappa(tema!.id, 3)).toEqual(generaCronoscalata(progetto, 3));
  });
});

describe('il salvadanaio', () => {

  it('la fase 2 si passa anche senza f-string, con print a più argomenti? no: lo spazio prima dei due punti tradisce', () => {
    const [, fase2] = generaCronoscalata('salvadanaio', 5);
    const quota = fase2.outputAtteso[0].match(/: (\d+) €/)![1];
    const n = fase2.outputAtteso.length;
    const esito = valutaRisposta(fase2, `for i in range(1, ${n + 1}):\n    print("Settimana", i, ": ${quota} €")`);
    expect(esito.promosso).toBe(false);
    expect(esito.hint).toMatch(/spazi/);
  });

  it('dalla fase 3 il totale deve nascere da un accumulo, non da quota * i', () => {
    const fasi = generaCronoscalata('salvadanaio', 11);
    const fase3 = fasi[2];
    const quota = Number(fase3.outputAtteso[0].match(/: (\d+) €/)![1]);
    const n = fase3.outputAtteso.length;
    const furbo = `for i in range(1, ${n + 1}):\n    print(f"Settimana {i}: {${quota} * i} €")`;
    expect(esegui(furbo)).toMatchObject({ ok: true, output: fase3.outputAtteso });
    const esito = valutaRisposta(fase3, furbo);
    expect(esito.promosso).toBe(false);
    expect(esito.hint).toMatch(/accumula/);
  });

  it('la riga finale si può scrivere con il numero a mano: il micro-interprete non lo distingue, e va bene', () => {
    const fasi = generaCronoscalata('salvadanaio', 11);
    const fase5 = fasi[4];
    const finale = fase5.outputAtteso[fase5.outputAtteso.length - 1];
    const codice = fasi[3].soluzione + `\nprint("${finale}")`;
    expect(valutaRisposta(fase5, codice).promosso).toBe(true);
  });

  it('la scheda racconta il compito e mostra per intero il prodotto finale', () => {
    const scheda = schedaProgetto('salvadanaio', 99);
    const fasi = generaCronoscalata('salvadanaio', 99);
    expect(scheda.outputFinale).toEqual(fasi[4].outputAtteso);
    expect(scheda.dati).toHaveLength(3);
    expect(scheda.committente).toContain('€');
    // I dati della scheda sono quelli delle fasi: stesso seme, stessi numeri.
    const quota = scheda.dati[1].match(/(\d+) €/)![1];
    expect(fasi[1].outputAtteso[0]).toContain(`: ${quota} €`);
  });
});

describe("la tabella d'allenamento", () => {
  const fasi = generaCronoscalata('allenamento', 17);
  const scheda = schedaProgetto('allenamento', 17);
  const partenza = Number(scheda.dati[0].match(/(\d+) km/)![1]);
  const incremento = Number(scheda.dati[1].match(/\+(\d+) km/)![1]);
  const n = fasi[0].outputAtteso.length;

  it('i km crescono di settimana in settimana e il totale li somma', () => {
    expect(fasi[1].outputAtteso[0]).toBe(`Settimana 1: ${partenza} km`);
    expect(fasi[1].outputAtteso[1]).toBe(`Settimana 2: ${partenza + incremento} km`);
    expect(fasi[2].outputAtteso[1]).toBe(`Settimana 2: ${partenza + incremento} km (totale ${2 * partenza + incremento})`);
    const totale = Number(scheda.dati[3].match(/(\d+) km/)![1]);
    expect(fasi[4].outputAtteso[n]).toBe(`In ${n} settimane hai pedalato ${totale} km`);
  });

  it("aumentare i km prima di stamparli sbaglia la prima riga: l'ordine nel corpo conta", () => {
    const invertito = `km = ${partenza}\nfor i in range(1, ${n + 1}):\n    km += ${incremento}\n    print(f"Settimana {i}: {km} km")`;
    const esito = valutaRisposta(fasi[1], invertito);
    expect(esito.promosso).toBe(false);
    expect(esito.hint).toContain('riga 1');
  });

  it('alla fase 2 i km si possono anche calcolare, ma la consegna vuole la variabile che cresce', () => {
    const calcolo = `for i in range(1, ${n + 1}):\n    print(f"Settimana {i}: {${partenza} + ${incremento} * i - ${incremento}} km")`;
    expect(esegui(calcolo)).toMatchObject({ ok: true, output: fasi[1].outputAtteso });
    expect(valutaRisposta(fasi[1], calcolo).hint).toMatch(/accumula/);
  });

  it('il corpo del ciclo può avere tre righe: totale, stampa, aumento', () => {
    expect(fasi[2].vincoli.righeCorpoMax).toBe(3);
    expect(valutaRisposta(fasi[2], fasi[2].soluzione).promosso).toBe(true);
  });

  it('i due temi Cronoscalata sono nell\'elenco del docente', () => {
    expect(infoTema('allenamento').progetto).toBe('allenamento');
    expect(TEMI_DEL_GIRO.filter((t) => t.progetto)).toHaveLength(2);
  });
});

describe('il voto proposto', () => {
  it('mentre corre, l\'allievo vede il voto che prende se finisce: 10 meno i consigli, mai sotto 5', () => {
    expect(votoSeFinisce(0)).toBe(10);
    expect(votoSeFinisce(3)).toBe(7);
    expect(votoSeFinisce(30)).toBe(5);
  });

  it('parte da 10 e scende di uno a consiglio, fino a 5, per chi finisce', () => {
    expect(votoProposto(5, 5, 0)).toBe(10);
    expect(votoProposto(5, 5, 3)).toBe(7);
    expect(votoProposto(5, 5, 8)).toBe(5);
  });

  it('per chi non finisce è proporzionale alle fasi, meno i consigli, pavimento 2', () => {
    expect(votoProposto(3, 5, 0)).toBe(6);
    expect(votoProposto(3, 5, 2)).toBe(4);
    expect(votoProposto(0, 5, 0)).toBe(2);
    expect(votoProposto(1, 5, 4)).toBe(2);
  });
});
