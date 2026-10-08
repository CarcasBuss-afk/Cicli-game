/* Generatori delle tappe del Giro dei Cicli.
 *
 * Ogni tappa è generata con parametri casuali entro limiti didattici, da un seme: la
 * stessa sessione produce sempre lo stesso percorso (riproducibile e testabile), due
 * sessioni diverse no (il gioco è rigiocabile, al secondo giro la classe non sa le
 * risposte a memoria). Dentro una sessione il percorso è uguale per tutti: la gara è equa.
 *
 * Il modulo è puro: niente Firestore, niente Next. La soluzione di riferimento di ogni
 * tappa resta sul server (vedi `esercizioPerAllievo`).
 */
import { esegui } from './interprete';

export type TipoEsercizio =
  | 'ripeti-n' // stampa N volte la stessa frase
  | 'output-range' // dato l'output, scrivere il ciclo
  | 'completa-range' // come sopra, ma con il ciclo già impostato da completare
  | 'ciclo-output' // dato il ciclo, scrivere l'output (inversione)
  | 'ciclo-stringa' // scorrere le lettere di una parola
  | 'accumulatore' // somma con totale += i, stampata solo alla fine
  | 'riga-ripetuta' // stampa N volte una riga di simboli
  | 'scala' // disegni di asterischi: la variabile del ciclo come valore
  | 'caccia-errore' // un ciclo sbagliato da correggere
  | 'quante-righe' // dato il ciclo, dire quante righe stampa
  | 'accumulatore-visibile' // somma che cresce, stampata a ogni giro
  | 'conta-giri' // contatore conta += 1
  | 'fstring' // testo e numero insieme: f"{i}° giro", tabellina scritta
  | 'conta-lettere'; // contare le lettere di una parola con un ciclo

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
  /**
   * Dentro il ciclo ci vuole un accumulo (`x += ...` o `x = x + ...`). Facoltativo:
   * le gare create prima che esistesse non ce l'hanno, e vale come false.
   */
  accumuloRichiesto?: boolean;
}

export interface Esercizio {
  tipo: TipoEsercizio;
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
  /** Che cosa stampa adesso il codice sbagliato (caccia all'errore): si mostra all'allievo. */
  outputSbagliato?: string[];
  /** Testo d'aiuto nella casella di risposta, quando la risposta è un output. */
  segnapostoRisposta?: string;
  /** Che cosa consegna l'allievo. */
  risposta: Risposta;
  /** Soluzione di riferimento: resta sul server, serve ai test e al docente. */
  soluzione: string;
  vincoli: Vincoli;
}

/** La tappa come la vede l'allievo: senza soluzione e senza l'output se è segreto. */
export type EsercizioPubblico = Omit<Esercizio, 'soluzione' | 'outputAtteso'> & { outputAtteso?: string[] };

export function esercizioPerAllievo(tappa: Esercizio): EsercizioPubblico {
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

export type Difficolta = 1 | 2 | 3;

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

function tappaRipetiN(rnd: () => number, difficolta: Difficolta): Esercizio {
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

function tappaOutputRange(rnd: () => number, difficolta: Difficolta): Esercizio {
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

function tappaCompletaRange(rnd: () => number, difficolta: Difficolta): Esercizio {
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

function tappaCicloOutput(rnd: () => number, difficolta: Difficolta): Esercizio {
  const { inizio, fine, passo } = parametriRange(rnd, difficolta);
  const numeri = numeriDiRange(inizio, fine, passo);
  // In collina e in montagna il ciclo stampa una f-string, non solo il numero.
  const conFrase = difficolta >= 2 && rnd() < 0.6;
  const etichetta = scegli(rnd, ['Giro', 'Esercizio', 'Km'] as const);
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

function tappaCicloStringa(rnd: () => number, difficolta: Difficolta): Esercizio {
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

function tappaAccumulatore(rnd: () => number, difficolta: Difficolta): Esercizio {
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
      vincoli: { forRichiesti: 1, righeCorpoMax: 2, printFuoriCicloMax: 1, accumuloRichiesto: true },
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
    vincoli: { forRichiesti: 1, righeCorpoMax: 2, printFuoriCicloMax: 1, accumuloRichiesto: true },
  };
}

/* ------------------------------------------------- generatori del catalogo esteso */

/** Righe di simboli da ripetere: niente lettere, così non si confonde con ripeti-n. */
const RIGHE = ['-----', '=======', '+-+-+-+', '~~~~~~', 'o-o-o-o'] as const;

function tappaRigaRipetuta(rnd: () => number, difficolta: Difficolta): Esercizio {
  const riga = scegli(rnd, RIGHE);
  const n = intero(rnd, 3, 7);
  return {
    tipo: 'riga-ripetuta',
    terreno: TERRENI[difficolta],
    consegna: `Stampa ${n} righe tutte uguali a questa: \`${riga}\``,
    outputAtteso: Array.from({ length: n }, () => riga),
    mostraOutput: false,
    risposta: 'codice',
    soluzione: `for i in range(${n}):\n    print("${riga}")`,
    vincoli: { forRichiesti: 1, righeCorpoMax: 1, printFuoriCicloMax: 0 },
  };
}

/**
 * Disegni di asterischi. Insegnano che `i` è un valore e non solo un contagiri, ma il
 * risultato si vede: se sbagli, la scala viene storta. E non si aggirano col passo,
 * perché nessun `range` produce stringhe che si allungano.
 */
function tappaScala(rnd: () => number, difficolta: Difficolta): Esercizio {
  const vincoli: Vincoli = { forRichiesti: 1, righeCorpoMax: 1, printFuoriCicloMax: 0 };
  if (difficolta === 1) {
    // Rettangolo: ripasso della notazione "*" * 6, la variabile non serve ancora.
    const righe = intero(rnd, 3, 5);
    const larghezza = intero(rnd, 4, 8);
    const riga = '*'.repeat(larghezza);
    return {
      tipo: 'scala',
      terreno: 'pianura',
      consegna: `Disegna un rettangolo: ${righe} righe da ${larghezza} asterischi ciascuna.`,
      outputAtteso: Array.from({ length: righe }, () => riga),
      mostraOutput: true,
      risposta: 'codice',
      soluzione: `for i in range(${righe}):\n    print("*" * ${larghezza})`,
      vincoli,
    };
  }
  const n = intero(rnd, 4, 7);
  const crescente = difficolta === 2;
  const lunghezze = crescente
    ? Array.from({ length: n }, (_, i) => i + 1)
    : Array.from({ length: n }, (_, i) => n - i);
  return {
    tipo: 'scala',
    terreno: TERRENI[difficolta],
    consegna: crescente ? 'Disegna questa scala di asterischi:' : 'Disegna questa scala che scende:',
    outputAtteso: lunghezze.map((l) => '*'.repeat(l)),
    mostraOutput: true,
    risposta: 'codice',
    soluzione: crescente
      ? `for i in range(1, ${n + 1}):\n    print("*" * i)`
      : `for i in range(${n}, 0, -1):\n    print("*" * i)`,
    vincoli,
  };
}

type Difetto = 'fine' | 'inizio' | 'stringa' | 'passo' | 'segno';

/**
 * Caccia all'errore: un ciclo che doveva stampare certi numeri e ne stampa altri.
 * L'editor parte con il codice sbagliato già scritto; l'allievo lo corregge.
 * I difetti sono quelli che si vedono davvero in laboratorio.
 */
function tappaCacciaErrore(rnd: () => number, difficolta: Difficolta): Esercizio {
  const { inizio, fine, passo } = parametriRange(rnd, difficolta);
  const giusto = numeriDiRange(inizio, fine, passo).map(String);

  const possibili: Difetto[] =
    difficolta === 1
      ? ['fine', 'stringa']
      : difficolta === 2
        ? ['fine', 'inizio', 'stringa']
        : passo < 0
          ? ['segno', 'fine', 'passo']
          : ['passo', 'fine'];
  const difetto = scegli(rnd, possibili);

  let rangeSbagliato = scriviRange(inizio, fine, passo);
  let corpo = 'print(i)';
  if (difetto === 'fine') rangeSbagliato = scriviRange(inizio, fine - passo, passo); // un giro di meno
  if (difetto === 'inizio') rangeSbagliato = scriviRange(inizio + 1, fine, passo); // parte un numero dopo
  if (difetto === 'passo') rangeSbagliato = `range(${inizio}, ${fine})`; // passo dimenticato
  if (difetto === 'segno') rangeSbagliato = `range(${inizio}, ${fine}, ${-passo})`; // passo positivo in discesa
  if (difetto === 'stringa') corpo = 'print("i")'; // stampa la lettera, non il valore

  const codiceSbagliato = `for i in ${rangeSbagliato}:\n    ${corpo}`;
  const esito = esegui(codiceSbagliato);
  const sbagliato = esito.ok ? esito.output : [];

  return {
    tipo: 'caccia-errore',
    terreno: TERRENI[difficolta],
    consegna: 'Questo ciclo doveva stampare i numeri qui sotto, ma ha un errore. Trovalo e correggilo.',
    outputAtteso: giusto,
    mostraOutput: true,
    codiceIniziale: codiceSbagliato,
    outputSbagliato: sbagliato,
    risposta: 'codice',
    soluzione: `for i in ${scriviRange(inizio, fine, passo)}:\n    print(i)`,
    vincoli: { forRichiesti: 1, righeCorpoMax: 1, printFuoriCicloMax: 0 },
  };
}

/** Quante righe stampa questo ciclo? Lettura pura: si risponde con un numero solo. */
function tappaQuanteRighe(rnd: () => number, difficolta: Difficolta): Esercizio {
  const { inizio, fine, passo } = parametriRange(rnd, difficolta);
  const quante = numeriDiRange(inizio, fine, passo).length;
  return {
    tipo: 'quante-righe',
    terreno: TERRENI[difficolta],
    consegna: 'Quante righe stampa questo ciclo? Scrivi solo il numero.',
    outputAtteso: [String(quante)],
    mostraOutput: false,
    codiceMostrato: `for i in ${scriviRange(inizio, fine, passo)}:\n    print(i)`,
    risposta: 'output',
    segnapostoRisposta: 'scrivi solo il numero',
    soluzione: String(quante),
    vincoli: { forRichiesti: null, righeCorpoMax: null, printFuoriCicloMax: null },
  };
}

/**
 * La somma che si vede crescere: il primo scalino dell'accumulatore. Con il `print`
 * dentro il ciclo il totale si vede a ogni giro, e si capisce che cosa fa la variabile.
 * Le somme parziali non sono una progressione aritmetica: nessun `range` le produce.
 */
function tappaAccumulatoreVisibile(rnd: () => number, difficolta: Difficolta): Esercizio {
  const da = difficolta === 3 ? intero(rnd, 2, 4) : 1;
  const a = da + intero(rnd, 3, 6);
  const somme: number[] = [];
  let totale = 0;
  for (let i = da; i <= a; i++) {
    totale += i;
    somme.push(totale);
  }
  return {
    tipo: 'accumulatore-visibile',
    terreno: TERRENI[difficolta],
    consegna: `Somma i numeri da ${da} a ${a} uno alla volta, e a ogni giro stampa il totale arrivato fin lì:`,
    outputAtteso: somme.map(String),
    mostraOutput: true,
    risposta: 'codice',
    soluzione: `totale = 0\nfor i in range(${da}, ${a + 1}):\n    totale += i\n    print(totale)`,
    vincoli: { forRichiesti: 1, righeCorpoMax: 2, printFuoriCicloMax: 0, accumuloRichiesto: true },
  };
}

/** Contare i giri con una variabile: `conta += 1`, e alla fine si stampa solo il conteggio. */
function tappaContaGiri(rnd: () => number, difficolta: Difficolta): Esercizio {
  const { inizio, fine, passo } = parametriRange(rnd, difficolta);
  const quante = numeriDiRange(inizio, fine, passo).length;
  const intervallo = scriviRange(inizio, fine, passo);
  return {
    tipo: 'conta-giri',
    terreno: TERRENI[difficolta],
    consegna:
      `Conta quante volte gira il ciclo \`for i in ${intervallo}:\` usando una variabile \`conta\` ` +
      'che parte da 0 e a ogni giro aumenta di 1. Alla fine stampa solo il conteggio.',
    outputAtteso: [String(quante)],
    mostraOutput: false,
    risposta: 'codice',
    soluzione: `conta = 0\nfor i in ${intervallo}:\n    conta += 1\nprint(conta)`,
    vincoli: { forRichiesti: 1, righeCorpoMax: 2, printFuoriCicloMax: 1, accumuloRichiesto: true },
  };
}

/**
 * Testo e numero sulla stessa riga. I formati sono scelti perché **solo** la f-string li
 * produca: `print("Giro", i)` scrive "Giro 1" con lo spazio, ma non "1° giro" né
 * "Km 3/7", dove il numero è attaccato al testo. La tabellina invece si può scrivere
 * anche con `print(7, "x", i, "=", 7 * i)`: va bene lo stesso, perché la lezione lì è
 * usare `i` in un calcolo.
 */
function tappaFstring(rnd: () => number, difficolta: Difficolta): Esercizio {
  const vincoli: Vincoli = { forRichiesti: 1, righeCorpoMax: 1, printFuoriCicloMax: 0 };
  if (difficolta === 1) {
    const n = intero(rnd, 3, 6);
    const cosa = scegli(rnd, ['giro', 'posto', 'tentativo'] as const);
    return {
      tipo: 'fstring',
      terreno: 'pianura',
      consegna: 'Stampa queste righe con un ciclo e una f-string:',
      outputAtteso: Array.from({ length: n }, (_, k) => `${k + 1}° ${cosa}`),
      mostraOutput: true,
      risposta: 'codice',
      soluzione: `for i in range(1, ${n + 1}):\n    print(f"{i}° ${cosa}")`,
      vincoli,
    };
  }
  if (difficolta === 2) {
    const n = intero(rnd, 4, 7);
    return {
      tipo: 'fstring',
      terreno: 'collina',
      consegna: 'Stampa il contachilometri della tappa con un ciclo e una f-string:',
      outputAtteso: Array.from({ length: n }, (_, k) => `Km ${k + 1}/${n}`),
      mostraOutput: true,
      risposta: 'codice',
      soluzione: `for i in range(1, ${n + 1}):\n    print(f"Km {i}/${n}")`,
      vincoli,
    };
  }
  const base = intero(rnd, 3, 9);
  const fino = intero(rnd, 5, 8);
  return {
    tipo: 'fstring',
    terreno: 'montagna',
    consegna: `Stampa la tabellina del ${base} fino a ${base} x ${fino}, scritta per esteso:`,
    outputAtteso: Array.from({ length: fino }, (_, k) => `${base} x ${k + 1} = ${base * (k + 1)}`),
    mostraOutput: true,
    risposta: 'codice',
    soluzione: `for i in range(1, ${fino + 1}):\n    print(f"${base} x {i} = {${base} * i}")`,
    vincoli,
  };
}

/** Contare le lettere di una parola con un ciclo: stringa e accumulatore insieme. */
function tappaContaLettere(rnd: () => number, difficolta: Difficolta): Esercizio {
  const parola = scegli(rnd, PAROLE);
  return {
    tipo: 'conta-lettere',
    terreno: TERRENI[difficolta],
    consegna:
      `Conta quante lettere ha la parola \`${parola}\` con un ciclo: usa una variabile \`conta\` ` +
      'che parte da 0 e a ogni lettera aumenta di 1. Alla fine stampa solo il numero.',
    outputAtteso: [String(parola.length)],
    mostraOutput: false,
    risposta: 'codice',
    soluzione: `conta = 0\nfor lettera in "${parola}":\n    conta += 1\nprint(conta)`,
    vincoli: { forRichiesti: 1, righeCorpoMax: 2, printFuoriCicloMax: 1, accumuloRichiesto: true },
  };
}

const GENERATORI: Record<TipoEsercizio, (rnd: () => number, d: Difficolta) => Esercizio> = {
  'ripeti-n': tappaRipetiN,
  'output-range': tappaOutputRange,
  'completa-range': tappaCompletaRange,
  'ciclo-output': tappaCicloOutput,
  'ciclo-stringa': tappaCicloStringa,
  accumulatore: tappaAccumulatore,
  'riga-ripetuta': tappaRigaRipetuta,
  scala: tappaScala,
  'caccia-errore': tappaCacciaErrore,
  'quante-righe': tappaQuanteRighe,
  'accumulatore-visibile': tappaAccumulatoreVisibile,
  'conta-giri': tappaContaGiri,
  fstring: tappaFstring,
  'conta-lettere': tappaContaLettere,
};

export function generaEsercizio(tipo: TipoEsercizio, difficolta: Difficolta, seme: number): Esercizio {
  return GENERATORI[tipo](generatore(seme), difficolta);
}

/* --------------------------------------------------------------------- percorso */

export const KM_MISTO_DEFAULT = 12;
export const KM_MISTO_MIN = 4;
export const KM_MISTO_MAX = 30;

/**
 * Lo schema del percorso: partenza in pianura (ripetere una frase, poi una riga), gruppone
 * in mezzo con i tipi alternati, arrivo in montagna con l'accumulatore. La difficoltà sale
 * con la posizione.
 */
function schema(numTappe: number): Array<{ tipo: TipoEsercizio; difficolta: Difficolta }> {
  // Nel gruppone solo tipi che si risolvono con `range` e `print`, cioè con quello che
  // la classe ha fatto per prima. Ciclo sulla parola, scala, somma che cresce e conta
  // giri richiedono argomenti in più: restano per le tappe tematiche, dove li sceglie il
  // docente quando li ha spiegati.
  const centro: TipoEsercizio[] = [
    'output-range',
    'ciclo-output',
    'completa-range',
    'caccia-errore',
    'quante-righe',
    'output-range',
    'ciclo-output',
    'caccia-errore',
    'completa-range',
  ];
  const tipi: TipoEsercizio[] = [];
  // Due tappe di avvicinamento, poi il gruppone, poi il tappone finale.
  const avvicinamento: TipoEsercizio[] = ['ripeti-n', 'riga-ripetuta'];
  const partenza = Math.min(2, numTappe);
  for (let i = 0; i < partenza; i++) tipi.push(avvicinamento[i]);
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
export function generaPercorso(numTappe = KM_MISTO_DEFAULT, seme = Date.now()): Esercizio[] {
  const quante = Math.max(KM_MISTO_MIN, Math.min(KM_MISTO_MAX, Math.round(numTappe)));
  return schema(quante).map((s, i) => generaEsercizio(s.tipo, s.difficolta, seme + i * 7919));
}
