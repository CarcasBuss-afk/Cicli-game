/* Il filtro anti-codice del motore: serve a chiunque faccia parlare un modello con
 * l'allievo (il tutor dell'Officina, il giudice). La regola è una sola: a parole, mai la
 * riga da scrivere. Modulo puro. */

/** Un consiglio è 2-3 frasi: oltre questo si taglia. */
export const MAX_CONSIGLIO = 600;

/** Una riga che è un'istruzione Python: for, print, assegnazione. */
const ISTRUZIONE = /^\s*(for\s+\w+\s+in\b|print\s*\(|\w+\s*(\+=|-=|\*=)|\w+\s*=[^=])/;

/** Senza spazi: `totale=0` e `totale = 0` sono la stessa riga. */
const compatta = (s: string) => s.replace(/\s+/g, '');

/**
 * Vero se la risposta contiene del codice: un blocco con i tre apici, una riga che è
 * un'istruzione, oppure un frammento fra apici singoli che è un'istruzione intera
 * (`print(f"...")`, `totale += 15`). Nominare `range` o `totale` fra apici va bene: è
 * quello che fanno anche gli hint del Giro.
 *
 * Citare una riga che l'allievo ha già scritto («guarda la riga `km = 10`») non è dargli
 * codice, è indicargli dove guardare: un'istruzione che compare nel suo codice passa.
 */
export function contieneCodice(testo: string, codiceAllievo = ''): boolean {
  if (testo.includes('```')) return true;
  const sue = new Set(
    codiceAllievo
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map(compatta)
      .filter((r) => r !== ''),
  );
  const citata = (s: string) => sue.has(compatta(s));
  const righe = testo.replace(/\r\n?/g, '\n').split('\n');
  for (const riga of righe) {
    // Tolti gli apici inline, una riga intera che è un'istruzione è codice.
    const nuda = riga.replace(/`/g, '').replace(/^[-•*\d.)\s]+/, '');
    if (ISTRUZIONE.test(nuda) && !citata(nuda)) return true;
  }
  for (const m of testo.matchAll(/`([^`\n]+)`/g)) {
    if (ISTRUZIONE.test(m[1]) && !citata(m[1])) return true;
  }
  return false;
}

/** Via spazi di troppo e apici di blocco residui; taglia i consigli lunghi. */
export function pulisciConsiglio(testo: string, massimo = MAX_CONSIGLIO): string {
  const pulito = testo.replace(/\r\n?/g, '\n').trim();
  if (pulito.length <= massimo) return pulito;
  const taglio = pulito.lastIndexOf('. ', massimo - 1);
  return taglio > massimo / 2 ? pulito.slice(0, taglio + 1) : pulito.slice(0, massimo) + '…';
}
