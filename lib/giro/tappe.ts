/* Generatori delle tappe del Giro dei Cicli.
 *
 * Ogni tappa è generata con parametri casuali entro limiti didattici, da un seme: la
 * stessa sessione produce sempre lo stesso percorso (riproducibile e testabile), due
 * sessioni diverse no (il gioco è rigiocabile, al secondo giro la classe non sa le
 * risposte a memoria). Dentro una sessione il percorso è uguale per tutti: la gara è equa.
 *
 * Il modulo è puro: niente Firestore, niente Next. La soluzione di riferimento di ogni
 * tappa resta sul server (vedi `tappaPerAllievo`).
 */

export type TipoTappa =
  | 'ripeti-n' // stampa N volte la stessa frase
  | 'output-range' // dato l'output, scrivere il ciclo
  | 'completa-range' // come sopra, ma con il ciclo già impostato da completare
  | 'ciclo-output' // dato il ciclo, scrivere l'output (inversione)
  | 'ciclo-stringa' // scorrere le lettere di una parola
  | 'accumulatore'; // somma con totale += i

/** Il terreno dà il tono alla tappa (e il colore sulla LIM): 1 pianura, 2 collina, 3 montagna. */
export type Terreno = 'pianura' | 'collina' | 'montagna';

/** Cosa consegna l'allievo: il codice da eseguire, oppure l'output che il codice produce. */
export type Risposta = 'codice' | 'output';

/** Vincoli sulla forma del codice: senza di questi `print` ripetuti a mano vincerebbero. */
export interface Vincoli {
  /** Quanti `for` deve avere la soluzione; null = non si controlla. */
  forRichiesti: number | null;
  /** Massimo di istruzioni dentro il ciclo; null = non si controlla. */
  righeCorpoMax: number | null;
  /** Massimo di `print` fuori da ogni ciclo; null = non si controlla. */
  printFuoriCicloMax: number | null;
}

export interface Tappa {
  tipo: TipoTappa;
  terreno: Terreno;
  /** Testo della consegna, mostrato all'allievo. */
  consegna: string;
  /** Righe che il programma deve stampare. */
  outputAtteso: string[];
  /** Se true l'output atteso fa parte della consegna e si mostra; se false è il segreto della tappa. */
  mostraOutput: boolean;
  /** Codice già scritto da mostrare (il ciclo da leggere, o quello da completare). */
  codiceMostrato?: string;
  /** Contenuto iniziale dell'editor. */
  codiceIniziale?: string;
  /** Che cosa consegna l'allievo. */
  risposta: Risposta;
  /** Soluzione di riferimento: resta sul server, serve ai test e al docente. */
  soluzione: string;
  vincoli: Vincoli;
}

/** La tappa come la vede l'allievo: senza soluzione e senza l'output se è segreto. */
export type TappaPubblica = Omit<Tappa, 'soluzione' | 'outputAtteso'> & { outputAtteso?: string[] };

export function tappaPerAllievo(tappa: Tappa): TappaPubblica {
  const { soluzione: _soluzione, outputAtteso, ...resto } = tappa;
  void _soluzione;
  return tappa.mostraOutput ? { ...resto, outputAtteso } : resto;
}

/* ---------------------------------------------------------------- numeri casuali */

/** Generatore pseudocasuale con seme (mulberry32): stesso seme, stesso percorso. */
export function generatore(seme: number): () => number {
  let a = seme >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Intero casuale fra min e max, estremi inclusi. */
function intero(rnd: () => number, min: number, max: number): number {
  return min + Math.floor(rnd() * (max - min + 1));
}

function scegli<T>(rnd: () => number, valori: readonly T[]): T {
  return valori[Math.floor(rnd() * valori.length)];
}

/* ------------------------------------------------------------------- materiale */

/** Frasi da ripetere: le ultime hanno l'apostrofo e obbligano le virgolette doppie. */
const FRASI_SEMPLICI = ['Evviva', 'Forza', 'Pedala', 'Ciao a tutti', 'Vado in fuga', 'Che salita'] as const;
const FRASI_APOSTROFO = ["C'è il sole", "L'ultimo giro", "Dai che ce l'hai", "È in salita"] as const;

/** Parole da scorrere lettera per lettera (corte: l'output resta leggibile). */
const PAROLE = ['ciao', 'pedale', 'tappa', 'ruota', 'salita', 'volata', 'python', 'ciclo'] as const;

const TERRENI: Record<1 | 2 | 3, Terreno> = { 1: 'pianura', 2: 'collina', 3: 'montagna' };

/* ------------------------------------------------------------------ generatori */

type Difficolta = 1 | 2 | 3;

function numeriDiRange(inizio: number, fine: number, passo: number): number[] {
  const out: number[] = [];
  const quante = Math.max(0, Math.ceil((fine - inizio) / passo));
  for (let i = 0, v = inizio; i < quante; i++, v += passo) out.push(v);
  return out;
}

/** Scrive la chiamata a range nella forma più corta possibile, come la userebbe il docente. */
function scriviRange(inizio: number, fine: number, passo: number): string {
  if (passo === 1 && inizio === 0) return `range(${fine})`;
  if (passo === 1) return `range(${inizio}, ${fine})`;
  return `range(${inizio}, ${fine}, ${passo})`;
}

/** Parametri di un range che produce fra 3 e 10 righe, secondo la difficoltà. */
function parametriRange(rnd: () => number, difficolta: Difficolta): { inizio: number; fine: number; passo: number } {
  if (difficolta === 1) {
    const fine = intero(rnd, 4, 8);
    return { inizio: 0, fine, passo: 1 };
  }
  if (difficolta === 2) {
    const inizio = intero(rnd, 2, 6);
    return { inizio, fine: inizio + intero(rnd, 3, 6), passo: 1 };
  }
  // Montagna: passo diverso da 1, a volte conto alla rovescia.
  if (rnd() < 0.45) {
    const quante = intero(rnd, 4, 7);
    const passo = -intero(rnd, 1, 2);
    const inizio = intero(rnd, 6, 12);
    const fine = inizio + passo * quante;
    return { inizio, fine, passo };
  }
  const passo = intero(rnd, 2, 3);
  const inizio = intero(rnd, 0, 3);
  const quante = intero(rnd, 4, 6);
  return { inizio, fine: inizio + passo * quante, passo };
}

function tappaRipetiN(rnd: () => number, difficolta: Difficolta): Tappa {
  const frase = difficolta === 1 ? scegli(rnd, FRASI_SEMPLICI) : scegli(rnd, FRASI_APOSTROFO);
  const n = intero(rnd, 3, 8);
  return {
    tipo: 'ripeti-n',
    terreno: TERRENI[difficolta],
    consegna: `Stampa ${n} volte la frase: ${frase}`,
    outputAtteso: Array.from({ length: n }, () => frase),
    mostraOutput: false,
    risposta: 'codice',
    soluzione: `for i in range(${n}):\n    print("${frase}")`,
    vincoli: { forRichiesti: 1, righeCorpoMax: 1, printFuoriCicloMax: 0 },
  };
}

function tappaOutputRange(rnd: () => number, difficolta: Difficolta): Tappa {
  const { inizio, fine, passo } = parametriRange(rnd, difficolta);
  const numeri = numeriDiRange(inizio, fine, passo);
  return {
    tipo: 'output-range',
    terreno: TERRENI[difficolta],
    consegna: 'Scrivi un ciclo che stampa questi numeri, uno per riga:',
    outputAtteso: numeri.map(String),
    mostraOutput: true,
    risposta: 'codice',
    soluzione: `for i in ${scriviRange(inizio, fine, passo)}:\n    print(i)`,
    vincoli: { forRichiesti: 1, righeCorpoMax: 1, printFuoriCicloMax: 0 },
  };
}

function tappaCompletaRange(rnd: () => number, difficolta: Difficolta): Tappa {
  const { inizio, fine, passo } = parametriRange(rnd, difficolta);
  const numeri = numeriDiRange(inizio, fine, passo);
  const buchi = passo === 1 ? 'range(__, __)' : 'range(__, __, __)';
  return {
    tipo: 'completa-range',
    terreno: TERRENI[difficolta],
    consegna: 'Completa il ciclo al posto dei trattini, perché stampi questi numeri:',
    outputAtteso: numeri.map(String),
    mostraOutput: true,
    risposta: 'codice',
    codiceIniziale: `for i in ${buchi}:\n    print(i)`,
    soluzione: `for i in ${scriviRange(inizio, fine, passo)}:\n    print(i)`,
    vincoli: { forRichiesti: 1, righeCorpoMax: 1, printFuoriCicloMax: 0 },
  };
}

function tappaCicloOutput(rnd: () => number, difficolta: Difficolta): Tappa {
  const { inizio, fine, passo } = parametriRange(rnd, difficolta);
  const numeri = numeriDiRange(inizio, fine, passo);
  // In collina e in montagna il ciclo stampa una f-string, non solo il numero.
  const conFrase = difficolta >= 2 && rnd() < 0.6;
  const etichetta = scegli(rnd, ['Giro', 'Tappa', 'Km'] as const);
  const corpo = conFrase ? `print(f"${etichetta} {i}")` : 'print(i)';
  const codice = `for i in ${scriviRange(inizio, fine, passo)}:\n    ${corpo}`;
  return {
    tipo: 'ciclo-output',
    terreno: TERRENI[difficolta],
    consegna: 'Leggi il ciclo: che cosa stampa? Scrivi le righe esatte, una per riga.',
    outputAtteso: numeri.map((n) => (conFrase ? `${etichetta} ${n}` : String(n))),
    mostraOutput: false,
    codiceMostrato: codice,
    risposta: 'output',
    soluzione: numeri.map((n) => (conFrase ? `${etichetta} ${n}` : String(n))).join('\n'),
    vincoli: { forRichiesti: null, righeCorpoMax: null, printFuoriCicloMax: null },
  };
}

function tappaCicloStringa(rnd: () => number, difficolta: Difficolta): Tappa {
  const parola = scegli(rnd, PAROLE);
  return {
    tipo: 'ciclo-stringa',
    terreno: TERRENI[difficolta],
    consegna: `Stampa una lettera per riga della parola: ${parola}`,
    outputAtteso: parola.split(''),
    mostraOutput: true,
    risposta: 'codice',
    soluzione: `for lettera in "${parola}":\n    print(lettera)`,
    vincoli: { forRichiesti: 1, righeCorpoMax: 1, printFuoriCicloMax: 0 },
  };
}

function tappaAccumulatore(rnd: () => number, difficolta: Difficolta): Tappa {
  const pari = difficolta === 3 && rnd() < 0.5;
  if (pari) {
    const n = intero(rnd, 4, 9) * 2; // numero pari fra 8 e 18
    const numeri = numeriDiRange(2, n + 1, 2);
    const somma = numeri.reduce((a, b) => a + b, 0);
    return {
      tipo: 'accumulatore',
      terreno: 'montagna',
      consegna: `Somma i numeri pari da 2 a ${n} e stampa solo il risultato.`,
      outputAtteso: [String(somma)],
      mostraOutput: false,
      risposta: 'codice',
      soluzione: `totale = 0\nfor i in range(2, ${n + 1}, 2):\n    totale += i\nprint(totale)`,
      vincoli: { forRichiesti: 1, righeCorpoMax: 2, printFuoriCicloMax: 1 },
    };
  }
  const n = intero(rnd, 5, 12);
  const somma = (n * (n + 1)) / 2;
  return {
    tipo: 'accumulatore',
    terreno: TERRENI[difficolta],
    consegna: `Somma i numeri da 1 a ${n} e stampa solo il risultato.`,
    outputAtteso: [String(somma)],
    mostraOutput: false,
    risposta: 'codice',
    soluzione: `totale = 0\nfor i in range(1, ${n + 1}):\n    totale += i\nprint(totale)`,
    vincoli: { forRichiesti: 1, righeCorpoMax: 2, printFuoriCicloMax: 1 },
  };
}

const GENERATORI: Record<TipoTappa, (rnd: () => number, d: Difficolta) => Tappa> = {
  'ripeti-n': tappaRipetiN,
  'output-range': tappaOutputRange,
  'completa-range': tappaCompletaRange,
  'ciclo-output': tappaCicloOutput,
  'ciclo-stringa': tappaCicloStringa,
  accumulatore: tappaAccumulatore,
};

export function generaTappa(tipo: TipoTappa, difficolta: Difficolta, seme: number): Tappa {
  return GENERATORI[tipo](generatore(seme), difficolta);
}

/* --------------------------------------------------------------------- percorso */

export const NUM_TAPPE_DEFAULT = 12;
export const NUM_TAPPE_MIN = 4;
export const NUM_TAPPE_MAX = 30;

/**
 * Lo schema del percorso: partenza in pianura (ripeti-n), gruppone in mezzo con i tipi
 * alternati, arrivo in montagna con l'accumulatore. La difficoltà sale con la posizione.
 */
function schema(numTappe: number): Array<{ tipo: TipoTappa; difficolta: Difficolta }> {
  const centro: TipoTappa[] = [
    'output-range',
    'ciclo-output',
    'completa-range',
    'ciclo-stringa',
    'output-range',
    'ciclo-output',
    'completa-range',
  ];
  const tipi: TipoTappa[] = [];
  // Due tappe di avvicinamento, poi il gruppone, poi il tappone finale.
  const partenza = Math.min(2, numTappe);
  for (let i = 0; i < partenza; i++) tipi.push('ripeti-n');
  const arrivo = numTappe >= 6 ? 1 : 0;
  const quanteCentro = numTappe - partenza - arrivo;
  for (let i = 0; i < quanteCentro; i++) tipi.push(centro[i % centro.length]);
  for (let i = 0; i < arrivo; i++) tipi.push('accumulatore');

  return tipi.map((tipo, i) => {
    // La difficoltà sale lungo il percorso: primo terzo 1, secondo 2, ultimo 3.
    const frazione = numTappe === 1 ? 1 : i / (numTappe - 1);
    const difficolta: Difficolta = frazione < 0.34 ? 1 : frazione < 0.7 ? 2 : 3;
    return { tipo, difficolta };
  });
}

/**
 * Genera il percorso di una sessione: `numTappe` tappe con parametri casuali derivati dal
 * seme. Stesso seme, stesso percorso.
 */
export function generaPercorso(numTappe = NUM_TAPPE_DEFAULT, seme = Date.now()): Tappa[] {
  const quante = Math.max(NUM_TAPPE_MIN, Math.min(NUM_TAPPE_MAX, Math.round(numTappe)));
  return schema(quante).map((s, i) => generaTappa(s.tipo, s.difficolta, seme + i * 7919));
}
