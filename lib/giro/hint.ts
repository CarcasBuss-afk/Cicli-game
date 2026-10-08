/* Validazione di una risposta e hint mirati.
 *
 * L'idea arriva da PRINT RUSH: l'errore non toglie punti, costa solo tempo, e ogni
 * errore riceve un suggerimento che dice che cosa guardare — non la soluzione. Gli hint
 * nascono dal confronto fra l'output prodotto e quello atteso, più i messaggi di errore
 * del micro-interprete, che sono già scritti per un allievo.
 *
 * Qui vivono anche i controlli anti-furbo: senza di questi, cinque `print` scritti a mano
 * passerebbero una tappa che chiede un ciclo.
 */
import { esegui, type Struttura } from './interprete';
import type { Tappa } from './tappe';

export interface Valutazione {
  promosso: boolean;
  /** Che cosa dire all'allievo quando non è promosso. */
  hint: string | null;
  /** Output prodotto dal suo codice, da mostrare nel pannello (null se non eseguibile). */
  output: string[] | null;
}

/** Normalizza l'output: via gli spazi a fine riga e le righe vuote finali. */
function normalizza(righe: string[]): string[] {
  const out = righe.map((r) => r.replace(/\s+$/, ''));
  while (out.length > 0 && out[out.length - 1] === '') out.pop();
  return out;
}

function uguali(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((r, i) => r === b[i]);
}

function tuttiNumeri(righe: string[]): boolean {
  return righe.length > 0 && righe.every((r) => /^-?\d+$/.test(r.trim()));
}

/** Passo fra numeri consecutivi, oppure null se non è costante. */
function passo(numeri: number[]): number | null {
  if (numeri.length < 2) return null;
  const p = numeri[1] - numeri[0];
  for (let i = 2; i < numeri.length; i++) {
    if (numeri[i] - numeri[i - 1] !== p) return null;
  }
  return p;
}

function virgolette(s: string): string {
  return `«${s}»`;
}

/* ------------------------------------------------------------- confronto numerico */

function hintNumerico(prodotto: string[], atteso: string[]): string {
  const p = prodotto.map((r) => Number(r.trim()));
  const a = atteso.map((r) => Number(r.trim()));

  // Una riga sola attesa (tappa dell'accumulatore): è un risultato, non una sequenza.
  if (a.length === 1) {
    if (p.length > 1) {
      return `Stampi ${p.length} righe invece di una: il \`print\` va fuori dal ciclo, dopo la somma`;
    }
    return `Ti viene ${p[0]}, invece deve venire ${a[0]}: controlla da dove parte e dove si ferma il ciclo`;
  }

  if (p.length === 1) {
    return `Stampi una riga sola invece di ${a.length}: il \`print\` va dentro il ciclo, spostato a destra`;
  }

  const passoP = passo(p);
  const passoA = passo(a);

  // Il passo prima di tutto: se i numeri vanno di 2 in 2 il resto non si capisce.
  if (passoP !== null && passoA !== null && passoP !== passoA) {
    if (passoA < 0 && passoP > 0) {
      return 'Questi numeri scendono: serve il terzo numero di `range` con il passo negativo, per esempio `range(10, 0, -1)`';
    }
    if (passoA > 0 && passoP < 0) {
      return 'I tuoi numeri scendono, invece devono salire: controlla il passo di `range`';
    }
    return `I tuoi numeri vanno di ${Math.abs(passoP)} in ${Math.abs(passoP)}, devono andare di ${Math.abs(passoA)} in ${Math.abs(passoA)}: è il terzo numero di \`range\` (il passo)`;
  }

  if (p[0] !== a[0]) {
    return `Parti da ${p[0]}, invece il primo numero deve essere ${a[0]}: è il primo numero dentro \`range\``;
  }

  if (p.length !== a.length) {
    const differenza = p.length - a.length;
    if (differenza === 1) {
      return 'Una ripetizione di troppo: `range` si ferma **prima** del secondo numero, quindi va abbassato di 1';
    }
    if (differenza === -1) {
      return 'Una ripetizione di meno: `range` si ferma **prima** del secondo numero, quindi va alzato di 1';
    }
    return `Stampi ${p.length} numeri invece di ${a.length}: cambia il secondo numero di \`range\`, quello dove il ciclo si ferma`;
  }

  const ultimo = p[p.length - 1];
  return `L'ultimo numero che stampi è ${ultimo}, invece deve essere ${a[a.length - 1]}`;
}

/* ----------------------------------------------------------------- confronto testo */

function hintTesto(prodotto: string[], atteso: string[]): string {
  if (prodotto.length === 0) {
    return 'Il tuo programma non stampa niente: ci vuole un `print` dentro il ciclo';
  }

  // Stessa frase ripetuta, numero di volte sbagliato: è il caso della tappa "ripeti N volte".
  const unaFrase = new Set(atteso).size === 1 && new Set(prodotto).size === 1 && prodotto[0] === atteso[0];
  if (unaFrase && prodotto.length !== atteso.length) {
    return `Stampi la frase ${prodotto.length} volte invece di ${atteso.length}: cambia il numero dentro \`range\``;
  }

  const i = prodotto.findIndex((r, idx) => r !== atteso[idx]);
  if (i >= 0) {
    const mio = prodotto[i];
    const suo = atteso[i] ?? '(niente)';
    if (atteso[i] === undefined) {
      return `Stampi ${prodotto.length} righe invece di ${atteso.length}: la riga in più è ${virgolette(mio)}`;
    }
    if (mio.toLowerCase() === suo.toLowerCase()) {
      return `Attento alle maiuscole e minuscole: ci vuole ${virgolette(suo)}`;
    }
    if (mio.replace(/\s+/g, ' ').trim() === suo.replace(/\s+/g, ' ').trim()) {
      return `Controlla gli spazi: ci vuole ${virgolette(suo)}`;
    }
    const numeroRiga = i + 1;
    return `Alla riga ${numeroRiga} stampi ${virgolette(mio)}, invece ci vuole ${virgolette(suo)}`;
  }

  // Le righe in comune coincidono: ne mancano o ce ne sono di troppo in fondo.
  if (prodotto.length < atteso.length) {
    return `Stampi ${prodotto.length} righe invece di ${atteso.length}: il ciclo gira troppe poche volte`;
  }
  return `Stampi ${prodotto.length} righe invece di ${atteso.length}: il ciclo gira troppe volte`;
}

function hintConfronto(prodotto: string[], atteso: string[]): string {
  if (tuttiNumeri(atteso) && tuttiNumeri(prodotto)) return hintNumerico(prodotto, atteso);
  return hintTesto(prodotto, atteso);
}

/* --------------------------------------------------------------- controlli di forma */

/** Controlla i vincoli anti-furbo. Restituisce l'hint, oppure null se la forma va bene. */
function hintStruttura(tappa: Tappa, struttura: Struttura): string | null {
  const { forRichiesti, righeCorpoMax, printFuoriCicloMax } = tappa.vincoli;

  if (forRichiesti !== null && struttura.numFor === 0) {
    return 'Questa tappa si vince con un ciclo `for`: i `print` scritti a mano uno sotto l\'altro non valgono';
  }
  if (forRichiesti !== null && struttura.numFor > forRichiesti) {
    return `Qui basta un solo ciclo \`for\`, tu ne hai scritti ${struttura.numFor}`;
  }
  if (righeCorpoMax !== null && struttura.righeCorpoMax > righeCorpoMax) {
    return righeCorpoMax === 1
      ? 'Dentro il ciclo basta una riga sola'
      : `Dentro il ciclo bastano ${righeCorpoMax} righe`;
  }
  if (printFuoriCicloMax !== null && struttura.printFuoriCiclo > printFuoriCicloMax) {
    return printFuoriCicloMax === 0
      ? 'Il `print` va dentro il ciclo: niente `print` aggiunti a mano fuori dal ciclo'
      : 'Fuori dal ciclo ci va un solo `print`, quello del risultato';
  }
  return null;
}

/* -------------------------------------------------------------------- valutazione */

/** Valuta la risposta dell'allievo a una tappa. Non modifica niente: decide e spiega. */
export function valutaRisposta(tappa: Tappa, risposta: string): Valutazione {
  const testo = risposta ?? '';
  if (testo.trim() === '') {
    return {
      promosso: false,
      hint: tappa.risposta === 'codice' ? 'Non hai scritto niente' : 'Scrivi le righe che il ciclo stampa',
      output: null,
    };
  }

  const atteso = normalizza(tappa.outputAtteso);

  // Tappe di inversione: l'allievo scrive l'output, non il codice.
  if (tappa.risposta === 'output') {
    if (/^\s*for\b/.test(testo)) {
      return {
        promosso: false,
        hint: 'Qui non va il codice: scrivi le righe che quel ciclo stampa, una per riga',
        output: null,
      };
    }
    const righe = normalizza(testo.replace(/\r\n?/g, '\n').split('\n'));
    if (uguali(righe, atteso)) return { promosso: true, hint: null, output: righe };
    return { promosso: false, hint: hintConfronto(righe, atteso), output: righe };
  }

  // I trattini del codice da completare: senza questo controllo l'allievo riceverebbe
  // "la variabile `__` non esiste", che non gli dice niente.
  if (testo.includes('__')) {
    return {
      promosso: false,
      hint: 'Sostituisci i trattini `__` con i numeri giusti',
      output: null,
    };
  }

  const esito = esegui(testo);
  if (!esito.ok) {
    return { promosso: false, hint: esito.errore.messaggio, output: null };
  }

  // "Nessun ciclo" si dice subito: è il malinteso di fondo, non un dettaglio dell'output.
  if (tappa.vincoli.forRichiesti !== null && esito.struttura.numFor === 0) {
    return {
      promosso: false,
      hint: 'Questa tappa si vince con un ciclo `for`: i `print` scritti a mano uno sotto l\'altro non valgono',
      output: esito.output,
    };
  }

  const prodotto = normalizza(esito.output);
  if (!uguali(prodotto, atteso)) {
    return { promosso: false, hint: hintConfronto(prodotto, atteso), output: prodotto };
  }

  const forma = hintStruttura(tappa, esito.struttura);
  if (forma) return { promosso: false, hint: forma, output: prodotto };

  return { promosso: true, hint: null, output: prodotto };
}
