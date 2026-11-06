/* Gli esempi mostrati di ogni fase (PERCORSO.md §24). Il riquadro «Sullo schermo deve
 * comparire» è quello che l'allievo confronta con il suo programma: se la fase aggiunge un
 * ramo che il primo esempio non percorre, la riga nuova lì non compare, e chi la dimentica
 * vede il suo output identico all'atteso e crede di avere finito (è successo a Maruf con la
 * promozione, novembre 2026). Qui, per ogni fase, si guarda quali righe `print` nuove (che la
 * fase prima non aveva) restano mute sul primo esempio, e si mostra anche la prova nascosta
 * che le fa parlare. Una prova resta sempre nascosta: contro i valori scritti a mano.
 *
 * Modulo puro: solo l'interprete.
 */
import { opzioniDiProva, type Esercizio, type Prova } from '../giro/esercizi';
import { esegui } from '../giro/interprete';

const uguali = (a: string[], b: string[]) => a.length === b.length && a.every((r, i) => r === b[i]);

/**
 * Le righe `print` nuove della soluzione (assenti da quella della fase prima), con le prove su
 * cui stampano qualcosa: togliendo la riga, l'output di quella prova cambia.
 */
function righeNuove(fase: Esercizio, prima: string): Array<{ riga: number; parla: Set<number> }> {
  const vecchie = new Set(prima.split('\n').map((r) => r.trim()));
  const righe = fase.soluzione.split('\n');
  const prove = fase.prove ?? [];
  const risultato: Array<{ riga: number; parla: Set<number> }> = [];
  righe.forEach((r, i) => {
    if (!/^\s*print\(/.test(r) || vecchie.has(r.trim())) return;
    // Al posto del print un'assegnazione innocua, allo stesso rientro: il programma resta valido.
    const muta = righe.map((x, j) => (j === i ? `${r.match(/^\s*/)?.[0] ?? ''}riga_tolta_ = 0` : x)).join('\n');
    const parla = new Set<number>();
    prove.forEach((p: Prova, k) => {
      const esito = esegui(muta, opzioniDiProva(p));
      if (!esito.ok || !uguali(esito.output, p.output)) parla.add(k);
    });
    risultato.push({ riga: i, parla });
  });
  return risultato;
}

/**
 * La fase con gli esempi che servono: il primo resta il primo (è quello della consegna); se
 * qualche riga nuova non vi compare, la prova nascosta che ne fa comparire di più passa al
 * secondo posto e `esempi` diventa 2. Senza prove, o con una sola, la fase resta com'è.
 */
export function conEsempiNecessari(fase: Esercizio, prima: string): Esercizio {
  const prove = fase.prove;
  if (!prove || prove.length < 3) return fase;
  const mute = righeNuove(fase, prima).filter((r) => !r.parla.has(0));
  if (mute.length === 0) return fase;
  let migliore = -1;
  let quante = 0;
  for (let k = 1; k < prove.length; k++) {
    const n = mute.filter((r) => r.parla.has(k)).length;
    if (n > quante) {
      migliore = k;
      quante = n;
    }
  }
  if (migliore < 0) return fase;
  const riordinate = [prove[0], prove[migliore], ...prove.filter((_, k) => k !== 0 && k !== migliore)];
  return { ...fase, prove: riordinate, esempi: 2 };
}

/** Tutte le fasi di un compito: ognuna confrontata con la soluzione della fase prima (o con il codice da cui parte). */
export function esempiDelCompito(fasi: Esercizio[]): Esercizio[] {
  return fasi.map((f, k) => conEsempiNecessari(f, k > 0 ? fasi[k - 1].soluzione : (f.codiceIniziale ?? '')));
}
