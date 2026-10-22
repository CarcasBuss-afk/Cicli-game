/* Test dei compiti di realtà: le fasi, la scheda, il voto. La proprietà che
 * conta è la stessa dei generatori: la soluzione di riferimento passa sempre, e ogni fase
 * è la precedente più un pezzo. */
import { describe, expect, it } from 'vitest';
import { valutaRisposta } from '../giro/hint';
import { esegui } from '../giro/interprete';
import { ELENCO_COMPITI, generaCompito, schedaCompito, votoSeFinisce } from './compiti';
import { esercizioPerAllievo } from '../giro/esercizi';

const SEMI = Array.from({ length: 40 }, (_, i) => (i + 1) * 1013);

describe.each(ELENCO_COMPITI)('ogni progetto: %s', (progetto) => {
  it('ha cinque fasi e la soluzione di riferimento passa ognuna, su molti semi', () => {
    for (const seme of SEMI) {
      const fasi = generaCompito(progetto, seme);
      expect(fasi).toHaveLength(5);
      fasi.forEach((fase, i) => {
        const esito = valutaRisposta(fase, fase.soluzione);
        expect(esito.hint, `seme ${seme}, fase ${i + 1}: ${esito.hint}`).toBeNull();
        expect(esito.promosso).toBe(true);
      });
    }
  });

  it('è riproducibile dal seme e cambia con il seme', () => {
    expect(generaCompito(progetto, 7)).toEqual(generaCompito(progetto, 7));
    const diverse = new Set(SEMI.map((s) => generaCompito(progetto, s)[4].outputAtteso.join('\n')));
    expect(diverse.size).toBeGreaterThan(5);
  });

  it('ogni fase mostra il suo output: in un compito di realtà il bersaglio si vede', () => {
    for (const fase of generaCompito(progetto, 42)) {
      expect(fase.mostraOutput).toBe(true);
      expect(fase.tipo).toBe('progetto');
      expect(fase.risposta).toBe('codice');
    }
  });

  it("l'output resta leggibile: al massimo 11 righe", () => {
    for (const seme of SEMI) {
      for (const fase of generaCompito(progetto, seme)) {
        expect(fase.outputAtteso.length).toBeLessThanOrEqual(12);
        expect(fase.outputAtteso.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('la soluzione di una fase non passa la fase dopo: ogni fase aggiunge un pezzo', () => {
    for (const seme of SEMI.slice(0, 10)) {
      const fasi = generaCompito(progetto, seme);
      for (let i = 1; i < fasi.length; i++) {
        expect(valutaRisposta(fasi[i], fasi[i - 1].soluzione).promosso, `seme ${seme}, fase ${i + 1}`).toBe(false);
      }
    }
  });

  it('la scheda mostra per intero il prodotto finale, che è l\'output della fase 5', () => {
    const scheda = schedaCompito(progetto, 99);
    const fasi = generaCompito(progetto, 99);
    expect(scheda.id).toBe(progetto);
    expect(scheda.outputFinale).toEqual(fasi[4].outputAtteso);
    expect(scheda.committente.length).toBeGreaterThan(40);
  });

});

describe('il salvadanaio', () => {

  it('la fase 2 si passa anche senza f-string, con print a più argomenti? no: lo spazio prima dei due punti tradisce', () => {
    const [, fase2] = generaCompito('salvadanaio', 5);
    const quota = fase2.outputAtteso[0].match(/: (\d+) €/)![1];
    const n = fase2.outputAtteso.length;
    const esito = valutaRisposta(fase2, `for i in range(1, ${n + 1}):\n    print("Settimana", i, ": ${quota} €")`);
    expect(esito.promosso).toBe(false);
    expect(esito.hint).toMatch(/spazi/);
  });

  it('dalla fase 3 il totale deve nascere da un accumulo, non da quota * i: lo dice la regola per il giudice', () => {
    const fasi = generaCompito('salvadanaio', 11);
    const fase3 = fasi[2];
    const quota = Number(fase3.outputAtteso[0].match(/: (\d+) €/)![1]);
    const n = fase3.outputAtteso.length;
    const furbo = `for i in range(1, ${n + 1}):\n    print(f"Settimana {i}: {${quota} * i} €")`;
    expect(esegui(furbo)).toMatchObject({ ok: true, output: fase3.outputAtteso });
    // L'interprete promuove (l'output è giusto): la formula al posto dell'accumulo la vede il giudice.
    expect(valutaRisposta(fase3, furbo).promosso).toBe(true);
    expect(fasi[1].regola).not.toMatch(/accumulo/);
    expect(fase3.regola).toMatch(/accumulo/);
    expect(fase3.regola).toContain('`quota * i`');
    expect(fasi[4].regola).toMatch(/riga finale/);
  });

  it('la riga finale si può scrivere con il numero a mano: il micro-interprete non lo distingue, e va bene', () => {
    const fasi = generaCompito('salvadanaio', 11);
    const fase5 = fasi[4];
    const finale = fase5.outputAtteso[fase5.outputAtteso.length - 1];
    const codice = fasi[3].soluzione + `\nprint("${finale}")`;
    expect(valutaRisposta(fase5, codice).promosso).toBe(true);
  });

  it('la scheda racconta il compito e mostra per intero il prodotto finale', () => {
    const scheda = schedaCompito('salvadanaio', 99);
    const fasi = generaCompito('salvadanaio', 99);
    expect(scheda.outputFinale).toEqual(fasi[4].outputAtteso);
    expect(scheda.dati).toHaveLength(3);
    expect(scheda.committente).toContain('€');
    // I dati della scheda sono quelli delle fasi: stesso seme, stessi numeri.
    const quota = scheda.dati[1].match(/(\d+) €/)![1];
    expect(fasi[1].outputAtteso[0]).toContain(`: ${quota} €`);
  });
});

describe("la tabella d'allenamento", () => {
  const fasi = generaCompito('allenamento', 17);
  const scheda = schedaCompito('allenamento', 17);
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
    // L'interprete promuove: la formula al posto della variabile che cresce la vede il giudice, con la regola.
    expect(valutaRisposta(fasi[1], calcolo).promosso).toBe(true);
    expect(fasi[1].regola).toMatch(/accumulo/);
  });

  it("le righe del corpo sono libere: la variabile d'appoggio per la barra va bene (il caso visto in classe)", () => {
    const inClasse = [
      `km = ${partenza}`,
      'totale = 0',
      `for settimane in range(1, ${n + 1}):`,
      '    totale += km',
      '    barra = "=" * settimane',
      '    print(f"Settimana {settimane}: {km} km (totale {totale}) {barra}")',
      `    km += ${incremento}`,
    ].join('\n');
    const esito = valutaRisposta(fasi[3], inClasse);
    expect(esito.hint).toBeNull();
    expect(esito.promosso).toBe(true);
  });

  it('otto print a mano in un ciclo che gira una volta sola passano l\'interprete: li ferma il giudice, con i giri contati', () => {
    const furbo = ['totale = 0', 'for i in range(1):', '    totale += 1', ...fasi[0].outputAtteso.map((r) => `    print("${r}")`)].join('\n');
    expect(valutaRisposta(fasi[0], furbo).promosso).toBe(true);
    const esito = esegui(furbo);
    if (!esito.ok) throw new Error(esito.errore.messaggio);
    expect(esito.giri).toBe(1);
    expect(fasi[0].regola).toMatch(/giro solo/);
  });

});

describe('il voto', () => {
  it('mentre lavora, l\'allievo vede il voto che prende se finisce: 10 meno le domande, mai sotto 5', () => {
    expect(votoSeFinisce(0)).toBe(10);
    expect(votoSeFinisce(3)).toBe(7);
    expect(votoSeFinisce(30)).toBe(5);
  });

});

describe('lo scontrino del bar (input e int)', () => {
  const fasi = generaCompito('scontrino', 23);
  const scheda = schedaCompito('scontrino', 23);
  const prezzo = Number(scheda.dati[0].match(/(\d+) €/)![1]);
  const [nome, panini] = fasi[1].prove![0].risposte;

  it('ogni fase ha due prove: la prima mostrata (il suo output è quello atteso), la seconda nascosta e diversa', () => {
    for (const f of fasi) {
      expect(f.prove).toHaveLength(2);
      expect(f.prove![0].output).toEqual(f.outputAtteso);
      expect(f.prove![1].risposte).not.toEqual(f.prove![0].risposte);
      expect(f.prove![1].output).not.toEqual(f.prove![0].output);
    }
    expect(fasi[0].prove![0].risposte).toHaveLength(1);
    expect(fasi[4].prove![0].risposte).toHaveLength(3);
  });

  it("all'allievo arrivano le risposte della prova mostrata, non quella nascosta", () => {
    const pubblico = esercizioPerAllievo(fasi[1]);
    expect(pubblico.risposte).toEqual([nome, panini]);
    expect('prove' in pubblico).toBe(false);
    expect(JSON.stringify(pubblico)).not.toContain(fasi[1].prove![1].risposte[0]);
  });

  it('i valori scritti a mano passano la prova mostrata ma cadono su quella nascosta', () => {
    const aMano = `nome = input("Nome? ")\nprint(f"Scontrino di ${nome}")`;
    const esito = valutaRisposta(fasi[0], aMano);
    expect(esito.promosso).toBe(false);
    expect(esito.hint).toMatch(/altre risposte|rispondendo/);
  });

  it('senza input() non si passa, anche se l\'output torna', () => {
    const senza = `print("Scontrino di ${nome}")`;
    const esito = valutaRisposta(fasi[0], senza);
    expect(esito.promosso).toBe(false);
    expect(esito.hint).toContain('`input()`');
  });

  it('dimenticare int() dà un errore che spiega int()', () => {
    const senzaInt = `nome = input("Nome? ")\nprint(f"Scontrino di {nome}")\npanini = input("Quanti? ")\nprint(f"Panini: {panini}")\nfor i in range(1, panini + 1):\n    print(f"Panino {i}: ${prezzo} €")`;
    const esito = valutaRisposta(fasi[2], senzaInt);
    expect(esito.promosso).toBe(false);
    expect(esito.hint).toContain('int()');
  });

  it('la validazione restituisce lo schermo con le domande e le risposte', () => {
    const esito = valutaRisposta(fasi[0], fasi[0].soluzione);
    expect(esito.promosso).toBe(true);
    expect(esito.schermo?.[0]).toEqual({ k: 'in', domanda: 'Come ti chiami? ', risposta: nome });
    expect(esito.schermo?.[1]).toEqual({ k: 'out', v: `Scontrino di ${nome}` });
  });

  it('il testo della domanda è libero', () => {
    const altra = fasi[0].soluzione.replace('Come ti chiami? ', 'nome: ');
    expect(valutaRisposta(fasi[0], altra).promosso).toBe(true);
  });

  it('il resto torna: paga con una banconota che copre il totale', () => {
    for (let seme = 1; seme <= 30; seme++) {
      for (const prova of generaCompito('scontrino', seme)[4].prove!) {
        const m = prova.output[prova.output.length - 1].match(/Hai dato (\d+) €, resto (\d+) €/)!;
        expect(Number(m[2])).toBeGreaterThanOrEqual(0);
        expect(Number(m[1]) - Number(m[2])).toBe(Number(prova.risposte[1]) * prezzoDi(seme));
      }
    }
  });
});

function prezzoDi(seme: number): number {
  return Number(schedaCompito('scontrino', seme).dati[0].match(/(\d+) €/)![1]);
}

describe('la promozione del bar (decidere con un if)', () => {
  const fasi = generaCompito('promozione', 23);
  const scheda = schedaCompito('promozione', 23);
  const prezzo = Number(scheda.dati[0].match(/(\d+) €/)![1]);
  const [, sconto, soglia] = scheda.dati[2].match(/(\d+) € da (\d+) €/)!.map(Number);

  it('la fase 1 riparte dallo scontrino già scritto, e consegnarlo tale e quale non vale', () => {
    expect(fasi[0].codiceIniziale).toContain('for i in range(1, panini + 1):');
    expect(fasi[0].codiceIniziale).toContain(`totale += ${prezzo}`);
    expect(fasi.slice(1).every((f) => f.codiceIniziale === undefined)).toBe(true);
    const esito = valutaRisposta(fasi[0], fasi[0].codiceIniziale!);
    expect(esito.promosso).toBe(false);
    expect(esito.hint).toMatch(/Non hai cambiato niente/);
  });

  it('ogni fase ha tre clienti di prova: con omaggio e sconto, senza niente, con il solo omaggio', () => {
    for (const fase of fasi) {
      expect(fase.prove).toHaveLength(3);
      const panini = fase.prove!.map((p) => Number(p.risposte[1]));
      expect(panini[0]).toBeGreaterThanOrEqual(5);
      expect(panini[1]).toBe(2);
      expect(panini[2]).toBe(4);
    }
    const [conTutto, senza, soloOmaggio] = fasi[4].prove!;
    expect(conTutto.output).toContain(`Sconto fedeltà: -${sconto} €`);
    expect(senza.output.join('\n')).not.toContain('omaggio');
    expect(senza.output.join('\n')).toContain('Ti mancano');
    expect(soloOmaggio.output).toContain('Panino 3: omaggio');
    expect(soloOmaggio.output.join('\n')).not.toContain('Sconto');
    expect(soloOmaggio.output).toContain(`Ti mancano ${soglia - 3 * prezzo} € per lo sconto`);
  });

  it("l'omaggio scritto a mano, senza if, passa la prova mostrata ma cade su quella nascosta", () => {
    // Il ciclo spezzato in due attorno al terzo panino: con 5 panini l'output è giusto.
    const furbo = [
      'nome = input("Come ti chiami? ")',
      'print(f"Scontrino di {nome}")',
      'panini = int(input("Quanti panini? "))',
      'print(f"Panini: {panini}")',
      `totale = ${3 * prezzo}`,
      `for i in range(1, 3):\n    print(f"Panino {i}: ${prezzo} €")`,
      `print("Panino 3: ${prezzo} €")\nprint("Il panino 3 è in omaggio!")`,
      `for i in range(4, panini + 1):\n    totale += ${prezzo}\n    print(f"Panino {i}: ${prezzo} €")`,
      'print(f"Totale: {totale} €")',
    ].join('\n');
    expect(esegui(furbo, { risposte: fasi[0].prove![0].risposte })).toMatchObject({ ok: true, output: fasi[0].outputAtteso });
    // Con due panini la riga dell'omaggio non deve comparire: lo scopre la prova nascosta.
    const esito = valutaRisposta(fasi[0], furbo);
    expect(esito.promosso).toBe(false);
    expect(esito.hint).toMatch(/stampa un'altra cosa|rispondendo/);
  });

  it('lo sconto stampato sempre, senza if sul totale, cade sui clienti sotto soglia', () => {
    const sempre = fasi[2].soluzione + `\nprint("Sconto fedeltà: -${sconto} €")\nprint(f"Da pagare: {totale - ${sconto}} €")`;
    const esito = valutaRisposta(fasi[3], sempre);
    expect(esito.promosso).toBe(false);
  });

  it('il totale calcolato con una formula passa il micro-interprete: lo ferma la regola del giudice', () => {
    expect(fasi[2].regola).toContain('`(panini - 1) * prezzo`');
    expect(fasi[0].regola).toMatch(/`if` dentro il ciclo/);
    expect(fasi[3].regola).toMatch(/sul totale, dopo il ciclo/);
    expect(fasi[4].regola).toMatch(/`else`/);
  });

  it('la scheda mostra la promozione e il prodotto finale con il saluto', () => {
    expect(scheda.committente).toContain('omaggio');
    expect(scheda.outputFinale[scheda.outputFinale.length - 1]).toMatch(/^Grazie, \w+!$/);
    expect(scheda.outputFinale).toContain('Panino 3: omaggio');
    expect(scheda.outputFinale.length).toBeLessThanOrEqual(12);
  });
});
