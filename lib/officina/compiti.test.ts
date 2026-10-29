/* Test dei compiti di realtà: le fasi, la scheda, il voto. La proprietà che
 * conta è la stessa dei generatori: la soluzione di riferimento passa sempre, e ogni fase
 * è la precedente più un pezzo. */
import { describe, expect, it } from 'vitest';
import { valutaRisposta } from '../giro/hint';
import { esegui } from '../giro/interprete';
import { eEsame, ELENCO_COMPITI, generaCompito, schedaCompito, SEZIONI, sezioneDi, votoSeFinisce } from './compiti';
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

/** I km del mese mostrato, letti dalle risposte della fase 2 (la prima è quante uscite). */
function kmDi(fase: ReturnType<typeof generaCompito>[number]): number[] {
  return fase.prove![0].risposte.slice(1).map(Number);
}

describe('il diario delle uscite (input dentro il ciclo)', () => {
  const fasi = generaCompito('diario', 23);
  const scheda = schedaCompito('diario', 23);
  const obiettivo = Number(scheda.dati[0].match(/(\d+) km/)![1]);
  const km = kmDi(fasi[1]);

  it('ogni fase ha tre mesi di prova: quello mostrato (3-5 uscite), uno da due uscite, uno da sei', () => {
    for (const f of fasi) {
      expect(f.prove).toHaveLength(3);
      expect(f.prove!.map((p) => Number(p.risposte[0]))).toEqual([km.length, 2, 6]);
      expect(f.prove![0].output).toEqual(f.outputAtteso);
    }
    // Alla fase 1 si risponde solo quante uscite; dalla 2 anche i km, uno per uscita.
    expect(fasi[0].prove![0].risposte).toHaveLength(1);
    expect(fasi[1].prove![0].risposte).toHaveLength(km.length + 1);
    expect(km.length).toBeGreaterThanOrEqual(3);
    expect(km.length).toBeLessThanOrEqual(5);
  });

  it("il mese mostrato raggiunge l'obiettivo, quello corto no: l'else si vede solo sulla prova nascosta", () => {
    const [mostrato, corto] = fasi[4].prove!;
    expect(mostrato.output[mostrato.output.length - 1]).toBe(`Obiettivo di ${obiettivo} km raggiunto!`);
    expect(corto.output[corto.output.length - 1]).toMatch(/^Mancano \d+ km all'obiettivo/);
    expect(obiettivo % 10).toBe(0);
  });

  it('la domanda sui km fuori dal ciclo stampa gli stessi km a ogni riga: cade già sulla prova mostrata', () => {
    const fuori = 'uscite = int(input("Quante uscite? "))\nkm = int(input("Km? "))\nfor i in range(1, uscite + 1):\n    print(f"Uscita {i}: {km} km")';
    const esito = valutaRisposta(fasi[1], fuori);
    expect(esito.promosso).toBe(false);
  });

  it('i km scritti nel programma passano la prova mostrata ma cadono su quella nascosta', () => {
    const aMano = ['uscite = int(input("Quante uscite? "))', 'for i in range(1, uscite + 1):', '    km = int(input("Km? "))', ...km.map((k, i) => `    if i == ${i + 1}:\n        print("Uscita ${i + 1}: ${k} km")`)].join('\n');
    expect(esegui(aMano, { risposte: fasi[1].prove![0].risposte })).toMatchObject({ ok: true, output: fasi[1].outputAtteso });
    const esito = valutaRisposta(fasi[1], aMano);
    expect(esito.promosso).toBe(false);
    expect(esito.hint).toMatch(/altre risposte|rispondendo/);
  });

  it("l'interprete conta le input() dentro il ciclo: un fatto in più per il giudice", () => {
    const esito = esegui(fasi[1].soluzione, { risposte: fasi[1].prove![0].risposte });
    if (!esito.ok) throw new Error(esito.errore.messaggio);
    expect(esito.struttura).toMatchObject({ numInput: 2, inputNelCiclo: 1 });
    expect(fasi[0].regola).not.toMatch(/dentro il ciclo/);
    expect(fasi[1].regola).toMatch(/dentro il ciclo/);
    expect(fasi[2].regola).toMatch(/cresce a ogni giro dei km risposti/);
    expect(fasi[4].regola).toMatch(/`else`/);
  });

  it('alla fase 4 il totale si aggiorna prima della riga: aggiornarlo dopo sbaglia la prima riga', () => {
    const dopo = 'uscite = int(input("Quante uscite? "))\ntotale = 0\nfor i in range(1, uscite + 1):\n    km = int(input("Km? "))\n    print(f"Uscita {i}: {km} km (finora {totale} km)")\n    totale += km\nprint(f"Totale: {totale} km")';
    const esito = valutaRisposta(fasi[3], dopo);
    expect(esito.promosso).toBe(false);
    expect(esito.hint).toContain('riga 1');
  });

  it('la scheda dice la differenza con lo scontrino e mostra il mese di prova', () => {
    expect(scheda.committente).toContain('scontrino');
    expect(scheda.dati[1]).toBe(`Risposte di prova: ${km.length} uscite · ${km.join(', ')} km`);
    expect(scheda.outputFinale).toEqual(fasi[4].outputAtteso);
  });
});

describe('il record del mese (la variabile che ricorda il migliore)', () => {
  const fasi = generaCompito('record', 23);
  const km = kmDi(fasi[0]);
  const record = Math.max(...km);

  it('riparte dal diario già scritto, e consegnarlo tale e quale non vale', () => {
    expect(fasi[0].codiceIniziale).toContain('totale += km');
    expect(fasi[0].codiceIniziale).toContain('km = int(input(');
    expect(fasi.slice(1).every((f) => f.codiceIniziale === undefined)).toBe(true);
    const esito = valutaRisposta(fasi[0], fasi[0].codiceIniziale!);
    expect(esito.promosso).toBe(false);
    expect(esito.hint).toMatch(/Non hai cambiato niente/);
  });

  it('nel mese mostrato la più lunga non è la prima; in quello nascosto da sei uscite lo è; i km sono tutti diversi', () => {
    for (let seme = 1; seme <= 30; seme++) {
      const [mostrato, corto, lungo] = generaCompito('record', seme)[0].prove!.map((p) => p.risposte.slice(1).map(Number));
      expect(mostrato.indexOf(Math.max(...mostrato))).toBeGreaterThan(0);
      expect(lungo.indexOf(Math.max(...lungo))).toBe(0);
      expect(corto).toHaveLength(2);
      for (const m of [mostrato, corto, lungo]) expect(new Set(m).size).toBe(m.length);
    }
  });

  it('il record scritto a mano passa la prova mostrata ma cade su quella nascosta', () => {
    const aMano = `${fasi[0].codiceIniziale}\nprint("Uscita più lunga: ${record} km")`;
    expect(esegui(aMano, { risposte: fasi[0].prove![0].risposte })).toMatchObject({ ok: true, output: fasi[0].outputAtteso });
    expect(valutaRisposta(fasi[0], aMano).promosso).toBe(false);
  });

  it('`>=` al posto di `>` va bene: i km sono tutti diversi', () => {
    expect(valutaRisposta(fasi[0], fasi[0].soluzione.replace('if km > record:', 'if km >= record:')).promosso).toBe(true);
  });

  it("alla fase 3 l'ordine conta: aggiornare il record prima del confronto non trova mai il nuovo record", () => {
    const invertito = fasi[2].soluzione.replace('    if km > record:\n        record = km\n', '    record = km\n    if km > record:\n');
    expect(invertito).not.toBe(fasi[2].soluzione);
    expect(valutaRisposta(fasi[2], invertito).promosso).toBe(false);
  });

  it('la fase 4 vuole la più corta da un numero grande, la 5 la differenza calcolata', () => {
    expect(fasi[3].outputAtteso).toContain(`Uscita più corta: la ${km.indexOf(Math.min(...km)) + 1} (${Math.min(...km)} km)`);
    expect(fasi[4].outputAtteso[fasi[4].outputAtteso.length - 1]).toBe(`Fra la più corta e la più lunga: ${record - Math.min(...km)} km di differenza`);
    expect(fasi[3].regola).toMatch(/più grande di qualunque uscita/);
    expect(fasi[0].regola).toMatch(/sostituisce/);
  });
});

describe('le uscite che contano (il contatore in un ramo)', () => {
  const fasi = generaCompito('conteggio', 23);
  const scheda = schedaCompito('conteggio', 23);
  const soglia = Number(scheda.dati[0].match(/da (\d+) km/)![1]);
  const obiettivo = Number(scheda.dati[1].match(/almeno (\d+)/)![1]);
  const km = kmDi(fasi[0]);
  const lunghe = km.filter((k) => k >= soglia).length;

  it("il mese mostrato raggiunge l'obiettivo e ha almeno una corta; quello da due non ha lunghe; quello da sei ne ha una in meno", () => {
    expect(lunghe).toBeGreaterThanOrEqual(obiettivo);
    expect(lunghe).toBeLessThan(km.length);
    const [mostrato, corto, lungo] = fasi[4].prove!;
    expect(mostrato.output).toContain(`Obiettivo raggiunto: ${lunghe} uscite lunghe`);
    expect(corto.output).toContain('Uscite lunghe: 0');
    expect(corto.output).toContain('Km nelle uscite lunghe: 0');
    expect(corto.output).toContain(`Uscite lunghe mancanti: ${obiettivo}`);
    expect(lungo.output).toContain('Uscite lunghe mancanti: 1');
  });

  it('riparte dal diario e la scritta «lunga!» sta nelle righe giuste', () => {
    expect(fasi[0].codiceIniziale).toContain('totale += km');
    km.forEach((k, i) => {
      expect(fasi[0].outputAtteso[i]).toBe(`Uscita ${i + 1}: ${k} km${k >= soglia ? ' - lunga!' : ''}`);
    });
  });

  it('il contatore che cresce a ogni giro, fuori dall\'if, conta tutte le uscite: cade sulla prova mostrata', () => {
    const sempre = fasi[1].soluzione.replace('        lunghe += 1\n', '').replace('    totale += km\n', '    totale += km\n    lunghe += 1\n');
    expect(sempre).not.toBe(fasi[1].soluzione);
    expect(valutaRisposta(fasi[1], sempre).promosso).toBe(false);
  });

  it('le corte come `uscite - lunghe` passano l\'interprete: la regola per il giudice chiede il contatore nell\'else', () => {
    const calcolate = fasi[1].soluzione + '\nprint(f"Uscite corte: {uscite - lunghe}")';
    expect(valutaRisposta(fasi[2], calcolate).promosso).toBe(true);
    expect(fasi[2].regola).toMatch(/ramo `else`/);
    expect(fasi[3].regola).toMatch(/separata dal totale/);
  });

  it('la scheda ha soglia, obiettivo e mese di prova, e il prodotto finale è la fase 5', () => {
    expect(scheda.dati).toHaveLength(3);
    expect(scheda.outputFinale).toEqual(fasi[4].outputAtteso);
    expect(scheda.outputFinale.length).toBeLessThanOrEqual(12);
  });
});

describe('le sezioni del percorso', () => {
  it('il percorso è le sezioni una dopo l\'altra; il for finisce col patentino, il while comincia dal timer', () => {
    expect(SEZIONI.map((s) => s.id)).toEqual(['for', 'while']);
    expect(ELENCO_COMPITI).toEqual(SEZIONI.flatMap((s) => s.compiti));
    const [perFor, perWhile] = SEZIONI;
    expect(perFor.compiti[perFor.compiti.length - 1]).toBe('patentino');
    expect(perWhile.compiti[0]).toBe('timer');
    expect(sezioneDi('cartello').id).toBe('for');
    expect(sezioneDi('patentino').id).toBe('for');
    expect(sezioneDi('timer').id).toBe('while');
  });

  it('il patentino è l\'unico esame', () => {
    expect(ELENCO_COMPITI.filter(eEsame)).toEqual(['patentino']);
  });
});

describe('il patentino dei cicli for (l\'esame)', () => {
  const fasi = generaCompito('patentino', 23);
  const scheda = schedaCompito('patentino', 23);
  const giri = Number(scheda.dati[0].match(/(\d+)/)![1]);
  const lunghezza = Number(scheda.dati[1].match(/(\d+) km/)![1]);
  const tempi = fasi[2].prove![0].risposte.map(Number);

  it('le prime due fasi non chiedono niente, dalla terza tre gare di prova con i tempi (stessi giri: il numero è nel codice)', () => {
    expect(fasi[0].prove).toBeUndefined();
    expect(fasi[1].prove).toBeUndefined();
    for (const f of fasi.slice(2)) {
      expect(f.prove).toHaveLength(3);
      expect(f.prove!.map((p) => p.risposte.length)).toEqual([giri, giri, giri]);
    }
    expect(giri).toBeGreaterThanOrEqual(4);
    expect(giri).toBeLessThanOrEqual(6);
  });

  it('ogni fase ripassa un\'idea: ripetere, il calcolo, input nel ciclo, accumulo, il migliore', () => {
    expect(fasi[0].outputAtteso).toEqual(Array.from({ length: giri }, (_, i) => `Giro ${i + 1}`));
    expect(fasi[1].outputAtteso[1]).toBe(`Giro 2: ${2 * lunghezza} km`);
    expect(fasi[2].outputAtteso[0]).toBe(`Giro 1: ${lunghezza} km in ${tempi[0]} min`);
    expect(fasi[3].outputAtteso[giri]).toBe(`Tempo totale: ${tempi.reduce((a, b) => a + b, 0)} min`);
    const minimo = Math.min(...tempi);
    expect(fasi[4].outputAtteso[giri + 1]).toBe(`Giro più veloce: il ${tempi.indexOf(minimo) + 1} (${minimo} min)`);
    expect(fasi[0].regola).toMatch(/ciclo `for`/);
    expect(fasi[2].regola).toMatch(/dentro il ciclo/);
    expect(fasi[4].regola).toMatch(/numero grande/);
  });

  it('il giro più veloce sta in mezzo nella gara mostrata, per primo e per ultimo in quelle nascoste; i tempi sono tutti diversi', () => {
    for (let seme = 1; seme <= 30; seme++) {
      const [mostrata, primo, ultimo] = generaCompito('patentino', seme)[4].prove!.map((p) => p.risposte.map(Number));
      const dove = mostrata.indexOf(Math.min(...mostrata));
      expect(dove).toBeGreaterThan(0);
      expect(dove).toBeLessThan(mostrata.length - 1);
      expect(primo.indexOf(Math.min(...primo))).toBe(0);
      expect(ultimo.indexOf(Math.min(...ultimo))).toBe(ultimo.length - 1);
      for (const g of [mostrata, primo, ultimo]) expect(new Set(g).size).toBe(g.length);
    }
  });

  it('i giri scritti a mano passano l\'interprete: li ferma la regola; i tempi a mano cadono sulla prova nascosta', () => {
    const aMano = fasi[0].outputAtteso.map((r) => `print("${r}")`).join('\n');
    expect(valutaRisposta(fasi[0], aMano).promosso).toBe(true);
    const tempiAMano = `for i in range(1, ${giri + 1}):\n    tempo = int(input("Tempo? "))\n` + tempi.map((t, i) => `    if i == ${i + 1}:\n        print(f"Giro {i}: {i * ${lunghezza}} km in ${t} min")`).join('\n');
    expect(esegui(tempiAMano, { risposte: fasi[2].prove![0].risposte })).toMatchObject({ ok: true, output: fasi[2].outputAtteso });
    expect(valutaRisposta(fasi[2], tempiAMano).promosso).toBe(false);
  });

  it('la scheda è un esame e lo dice', () => {
    expect(scheda.esame).toBe(true);
    expect(scheda.committente).toContain('tutor è spento');
    expect(scheda.outputFinale).toEqual(fasi[4].outputAtteso);
  });
});

describe('il timer del forno (i tre gesti del while)', () => {
  const fasi = generaCompito('timer', 21);
  const minuti = Number(fasi[0].outputAtteso[0]);

  it('la fase 1 è guidata: il while è già scritto, manca la riga che fa scendere i minuti, e consegnarlo tale e quale non vale', () => {
    expect(fasi[0].codiceIniziale).toContain('while minuti > 0:');
    expect(fasi[0].codiceIniziale).toContain('# qui manca');
    expect(fasi.slice(1).every((f) => f.codiceIniziale === undefined)).toBe(true);
    const uguale = valutaRisposta(fasi[0], fasi[0].codiceIniziale!);
    expect(uguale.promosso).toBe(false);
    expect(uguale.hint).toContain('Non hai cambiato niente');
  });

  it("senza la riga che fa scendere i minuti il ciclo non si ferma mai: lo dice l'hint", () => {
    const senza = fasi[0].codiceIniziale!.split('\n').slice(0, 3).join('\n');
    const esito = valutaRisposta(fasi[0], senza);
    expect(esito.promosso).toBe(false);
    expect(esito.hint).toContain('non si ferma mai');
  });

  it('la forma lunga `minuti = minuti - 1` vale quanto `-=`; i minuti sono fra 5 e 9', () => {
    const lunga = fasi[0].soluzione.replace('minuti -= 1', 'minuti = minuti - 1');
    expect(valutaRisposta(fasi[0], lunga).promosso).toBe(true);
    for (const seme of SEMI) {
      const m = Number(generaCompito('timer', seme)[0].outputAtteso[0]);
      expect(m).toBeGreaterThanOrEqual(5);
      expect(m).toBeLessThanOrEqual(9);
    }
  });

  it('dalla fase 4 i minuti arrivano da input(): tre prove, quella mostrata e due nascoste (3 e 10 minuti)', () => {
    for (const fase of fasi.slice(3)) {
      expect(fase.prove).toHaveLength(3);
      expect(fase.prove![0].risposte).toEqual([String(minuti)]);
      expect(fase.prove!.slice(1).map((p) => p.risposte)).toEqual([['3'], ['10']]);
      expect(fase.prove![0].output).toEqual(fase.outputAtteso);
    }
    expect(fasi[0].prove).toBeUndefined();
    expect(esercizioPerAllievo(fasi[3]).risposte).toEqual([String(minuti)]);
  });

  it('i minuti scritti nel programma passano la prova mostrata ma cadono su quella nascosta', () => {
    const aMano = fasi[3].soluzione.replace('int(input("Quanti minuti? "))', String(minuti));
    const esito = valutaRisposta(fasi[3], aMano);
    expect(esito.promosso).toBe(false);
    expect(esito.hint).toMatch(/rispondendo «3»/);
  });

  it("alla fase 5 l'ultimo minuto è al singolare, su tutte le prove; senza if cade già sulla prova mostrata", () => {
    for (const prova of fasi[4].prove!) {
      expect(prova.output[prova.output.length - 2]).toBe('Manca 1 minuto');
      expect(prova.output[0]).toMatch(/^Mancano \d+ minuti$/);
    }
    expect(valutaRisposta(fasi[4], fasi[3].soluzione).promosso).toBe(false);
    const dueIf = fasi[4].soluzione.replace('    else:\n        print(f"Mancano {minuti} minuti")', '    if minuti > 1:\n        print(f"Mancano {minuti} minuti")');
    expect(valutaRisposta(fasi[4], dueIf).promosso).toBe(true);
  });

  it("il for al posto del while passa l'interprete: lo ferma la regola per il giudice, che la nomina", () => {
    const conFor = `for minuti in range(${minuti}, 0, -1):\n    print(minuti)`;
    expect(valutaRisposta(fasi[0], conFor).promosso).toBe(true);
    expect(fasi[0].regola).toContain('`while`');
    expect(fasi[0].regola).toContain('`for`');
    const esito = esegui(conFor);
    if (esito.ok) expect(esito.struttura).toMatchObject({ numWhile: 0, numFor: 1 });
  });

  it("la scheda racconta il forno e mostra il prodotto finale con l'avviso", () => {
    const scheda = schedaCompito('timer', 21);
    expect(scheda.titolo).toBe('Il timer del forno');
    expect(scheda.committente).toContain('`while`');
    expect(scheda.outputFinale[scheda.outputFinale.length - 1]).toMatch(/pront/);
    expect(scheda.dati).toContain(`Minuti di prova: ${minuti}`);
  });
});
