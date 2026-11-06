import { describe, expect, it } from 'vitest';
import { esercizioPerAllievo, numeroEsempi, opzioniDiProva, type Esercizio } from '../giro/esercizi';
import { valutaRisposta } from '../giro/hint';
import { esegui } from '../giro/interprete';
import { ELENCO_COMPITI, generaCompito } from './compiti';
import { provaCheCade, messaggioConsiglio } from './consiglio';
import { conEsempiNecessari } from './esempi';

const uguali = (a: string[], b: string[]) => JSON.stringify(a) === JSON.stringify(b);

/** Le righe print nuove della fase che non stampano niente su nessuno degli esempi mostrati. */
function righeMute(fase: Esercizio, prima: string): string[] {
  const vecchie = new Set(prima.split('\n').map((r) => r.trim()));
  const righe = fase.soluzione.split('\n');
  // Senza input() non ci sono prove: l'esempio è l'output atteso.
  const mostrate = fase.prove?.length ? fase.prove.slice(0, numeroEsempi(fase)) : [{ risposte: [], output: fase.outputAtteso }];
  return righe.filter((r, i) => {
    if (!/^\s*print\(/.test(r) || vecchie.has(r.trim())) return false;
    const muta = righe.map((x, j) => (j === i ? `${r.match(/^\s*/)?.[0]}x_ = 0` : x)).join('\n');
    return mostrate.every((p) => {
      const e = esegui(muta, opzioniDiProva(p));
      return e.ok && uguali(e.output, p.output);
    });
  });
}

describe('gli esempi mostrati (PERCORSO.md §24)', () => {
  it('in ogni fase di ogni compito le righe nuove compaiono in un esempio mostrato, e una prova resta nascosta', () => {
    const problemi: string[] = [];
    for (const id of ELENCO_COMPITI) {
      for (let s = 1; s <= 80; s++) {
        const fasi = generaCompito(id, s * 7919 + 13);
        fasi.forEach((f, k) => {
          const mute = righeMute(f, k > 0 ? fasi[k - 1].soluzione : (f.codiceIniziale ?? ''));
          if (mute.length) problemi.push(`${id} seme ${s} fase ${k + 1}: ${mute.join(' | ')}`);
          const n = f.prove?.length ?? 0;
          if (n >= 2 && numeroEsempi(f) >= n) problemi.push(`${id} seme ${s} fase ${k + 1}: nessuna prova nascosta`);
          // La soluzione di riferimento passa sempre, anche con le prove riordinate.
          if (!valutaRisposta(f, f.soluzione).promosso) problemi.push(`${id} seme ${s} fase ${k + 1}: la soluzione non passa`);
        });
      }
    }
    expect(problemi.slice(0, 10)).toEqual([]);
  });

  it('la promozione, fase 5: il secondo esempio è il cliente sotto la soglia, con la riga di quanto manca', () => {
    const f = generaCompito('promozione', 4242)[4];
    expect(f.esempi).toBe(2);
    expect(f.prove?.[1].output.some((r) => r.startsWith('Ti mancano'))).toBe(true);
    expect(f.outputAtteso).toEqual(f.prove?.[0].output);
    const pubblico = esercizioPerAllievo(f);
    expect(pubblico.altriEsempi).toHaveLength(1);
    expect(pubblico.altriEsempi?.[0].outputAtteso.some((r) => r.startsWith('Ti mancano'))).toBe(true);
    expect(pubblico.altriEsempi?.[0].schermoAtteso?.some((r) => r.k === 'in')).toBe(true);
    // Il resto resta nascosto: due esempi su tre prove.
    expect(JSON.stringify(pubblico)).not.toContain(f.prove?.[2].output.join('\n'));
  });

  it('chi dimentica l\'else cade sul secondo esempio, con un confronto aperto: è lì da vedere', () => {
    const f = generaCompito('promozione', 4242)[4];
    const senzaElse = f.soluzione.replace(/\nelse:\n[^\n]*/, '');
    expect(senzaElse).not.toContain('else:\n    print(f"Ti mancano');
    const v = valutaRisposta(f, senzaElse);
    expect(v.promosso).toBe(false);
    expect(v.hint).toMatch(/^Con il primo esempio funziona, ma con il secondo \(rispondendo/);
    // Il tutor sa che quell'esempio l'allievo lo vede.
    const caduta = provaCheCade(f, senzaElse);
    expect(caduta?.esempio).toBe(true);
    const msg = messaggioConsiglio({
      scheda: { id: 'promozione', titolo: 'x', committente: '', prodotto: '', dati: [], outputFinale: [] },
      fase: 5,
      fasiTotali: 5,
      esercizio: f,
      codice: senzaElse,
      esito: { output: [] },
      hint: v.hint,
      provaNascosta: caduta,
      domanda: '',
      precedenti: [],
    });
    expect(msg).toContain('CADE SUL SECONDO');
    expect(msg).toContain("L'allievo vede anche un secondo esempio");
  });

  it('una fase senza righe mute resta con un esempio solo', () => {
    const f = generaCompito('promozione', 4242)[3];
    expect(f.esempi).toBeUndefined();
    expect(esercizioPerAllievo(f).altriEsempi).toBeUndefined();
    // E senza prove (o con due sole) non cambia niente.
    const senza = { ...f, prove: undefined };
    expect(conEsempiNecessari(senza, '')).toBe(senza);
  });
});
