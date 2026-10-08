/* Il Giro a tappe tematiche: i temi delle tappe, i punti, le classifiche.
 *
 * Una **tappa** è una gara breve su un argomento solo; i suoi esercizi sono i
 * **chilometri**. Il Giro è la successione delle tappe lungo le settimane, e la classifica
 * generale somma i punti delle migliori N tappe di ciascuno (chi è assente non resta
 * indietro per sempre). Una gara singola è semplicemente un Giro di una tappa sola, con
 * il tema "misto".
 *
 * Modulo puro: niente Firestore, niente Next. Lo usano il server (che fissa i punti alla
 * chiusura di una tappa) e la LIM (che mostra la classifica dal vivo).
 */
import {
  generaEsercizio,
  generaPercorso,
  KM_MISTO_DEFAULT,
  type Difficolta,
  type Esercizio,
  type TipoEsercizio,
} from './esercizi';

/* ------------------------------------------------------------------------- temi */

export type Tema =
  | 'ripeti'
  | 'contare'
  | 'passo'
  | 'leggere'
  | 'fstring'
  | 'scala'
  | 'cronometro'
  | 'caccia'
  | 'accumulatore'
  | 'parola'
  | 'misto';

export interface InfoTema {
  id: Tema;
  nome: string;
  /** Che cosa allena, in una riga: compare al docente quando compone il Giro. */
  descrizione: string;
  /** I chilometri, in ordine: tipo di esercizio e difficoltà. */
  piano: Array<{ tipo: TipoEsercizio; difficolta: Difficolta }>;
  /** Durata proposta; il docente la cambia quando apre la tappa. */
  durataMinuti: number;
}

const km = (tipo: TipoEsercizio, difficolta: Difficolta) => ({ tipo, difficolta });

/** I temi nell'ordine didattico del Giro (vedi PERCORSO.md). */
export const TEMI: InfoTema[] = [
  {
    id: 'ripeti',
    nome: 'Ripetere',
    descrizione: 'Il for come "fai N volte": frasi e righe ripetute',
    piano: [km('ripeti-n', 1), km('riga-ripetuta', 1), km('ripeti-n', 1), km('riga-ripetuta', 2), km('ripeti-n', 2)],
    durataMinuti: 10,
  },
  {
    id: 'contare',
    nome: 'Contare con range',
    descrizione: 'Da 0 a N, da A a B, completare i numeri di range',
    piano: [km('output-range', 1), km('output-range', 1), km('completa-range', 1), km('output-range', 2), km('completa-range', 2)],
    durataMinuti: 10,
  },
  {
    id: 'passo',
    nome: 'Il passo',
    descrizione: 'Il terzo numero di range: avanti di 2, di 3, e il conto alla rovescia',
    piano: [km('output-range', 3), km('completa-range', 3), km('output-range', 3), km('completa-range', 3), km('output-range', 3)],
    durataMinuti: 10,
  },
  {
    id: 'leggere',
    nome: 'Leggere il codice',
    descrizione: 'Dato il ciclo: quante righe stampa, che cosa stampa',
    piano: [km('quante-righe', 1), km('ciclo-output', 1), km('quante-righe', 2), km('ciclo-output', 2), km('ciclo-output', 3)],
    durataMinuti: 10,
  },
  {
    id: 'fstring',
    nome: 'Testo e numero',
    descrizione: 'f-string dentro il ciclo: 1° giro, Km 3/7, la tabellina scritta',
    piano: [km('fstring', 1), km('fstring', 1), km('fstring', 2), km('fstring', 2), km('fstring', 3)],
    durataMinuti: 10,
  },
  {
    id: 'scala',
    nome: 'La scala',
    descrizione: 'Disegni di asterischi: la variabile del ciclo come valore',
    piano: [km('scala', 1), km('scala', 2), km('scala', 2), km('scala', 3), km('scala', 3)],
    durataMinuti: 10,
  },
  {
    id: 'cronometro',
    nome: 'Cronometro',
    descrizione: 'Esercizi facili già visti: conta solo la velocità',
    piano: [km('ripeti-n', 1), km('output-range', 1), km('riga-ripetuta', 1), km('output-range', 2), km('completa-range', 2)],
    durataMinuti: 5,
  },
  {
    id: 'caccia',
    nome: "Caccia all'errore",
    descrizione: 'Un ciclo sbagliato da correggere',
    piano: [km('caccia-errore', 1), km('caccia-errore', 1), km('caccia-errore', 2), km('caccia-errore', 2), km('caccia-errore', 3)],
    durataMinuti: 10,
  },
  {
    id: 'accumulatore',
    nome: 'Accumulatore',
    descrizione: 'La somma che cresce, contare i giri, la somma finale',
    piano: [
      km('accumulatore-visibile', 1),
      km('accumulatore-visibile', 2),
      km('conta-giri', 2),
      km('accumulatore', 2),
      km('accumulatore', 3),
    ],
    durataMinuti: 10,
  },
  {
    id: 'parola',
    nome: 'Cicli su una parola',
    descrizione: 'for lettera in "parola": stampare e contare le lettere',
    piano: [km('ciclo-stringa', 1), km('ciclo-stringa', 2), km('conta-lettere', 2), km('ciclo-stringa', 3), km('conta-lettere', 3)],
    durataMinuti: 10,
  },
  {
    id: 'misto',
    nome: 'Gara mista',
    descrizione: 'Un percorso misto, come la gara singola: range, lettura, caccia all\'errore',
    piano: [],
    durataMinuti: 0,
  },
];

const PER_ID = new Map(TEMI.map((t) => [t.id, t]));

export function infoTema(tema: Tema): InfoTema {
  const info = PER_ID.get(tema);
  if (!info) throw new Error(`Tema sconosciuto: ${tema}`);
  return info;
}

export function eTema(valore: unknown): valore is Tema {
  return typeof valore === 'string' && PER_ID.has(valore as Tema);
}

/** I temi che il docente può mettere in un Giro (la gara mista si crea a parte). */
export const TEMI_DEL_GIRO = TEMI.filter((t) => t.id !== 'misto');

/** Chilometri di una tappa tematica: la decisione presa con il docente. */
export const KM_PER_TAPPA = 5;

/**
 * Genera gli esercizi di una tappa. Si chiama all'**apertura** della tappa, non alla
 * creazione del Giro: così il docente non congela a settembre la difficoltà di dicembre.
 * Stesso seme, stessi esercizi: tutti gli allievi corrono la stessa tappa.
 */
export function generaTappa(tema: Tema, seme: number, kmMisto = KM_MISTO_DEFAULT): Esercizio[] {
  if (tema === 'misto') return generaPercorso(kmMisto, seme);
  return infoTema(tema).piano.map((p, i) => generaEsercizio(p.tipo, p.difficolta, seme + i * 7919));
}

/* ------------------------------------------------------------------------ punti */

/**
 * Punti per posizione nella tappa. Scalano come nel ciclismo, ma arrivano a tutti: chi ha
 * fatto almeno un chilometro prende almeno 1 punto. Con 25 allievi una tabella che si
 * ferma al decimo lascerebbe a zero metà classe a ogni tappa, e dopo due tappe chi è
 * sempre quindicesimo smetterebbe di spingere.
 */
export const PUNTI = [25, 20, 16, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2] as const;

export function puntiPerPosizione(posizione: number, kmFatti: number): number {
  if (kmFatti <= 0) return 0;
  return PUNTI[posizione - 1] ?? 1;
}

/* ---------------------------------------------------------- classifica di tappa */

export type ProgressoTappa = {
  km: number;
  /** Istante (ms) dell'ultimo chilometro completato; null se non ne ha completati. */
  ultimoAt: number | null;
  errori: number;
};

export type CorridoreTappa = {
  id: string;
  name: string;
  numero: number | null;
  progresso: ProgressoTappa | null;
};

export type RigaTappa = {
  id: string;
  name: string;
  numero: number | null;
  km: number;
  ultimoAt: number | null;
  errori: number;
  posizione: number;
  punti: number;
};

/** Più chilometri davanti; a parità, chi ha chiuso prima l'ultimo. Gli errori non contano. */
export function classificaTappa(corridori: CorridoreTappa[]): RigaTappa[] {
  const righe = corridori.map((c) => ({
    id: c.id,
    name: c.name,
    numero: c.numero,
    km: c.progresso?.km ?? 0,
    ultimoAt: c.progresso?.ultimoAt ?? null,
    errori: c.progresso?.errori ?? 0,
  }));
  righe.sort((a, b) => {
    if (b.km !== a.km) return b.km - a.km;
    const ta = a.ultimoAt ?? Number.MAX_SAFE_INTEGER;
    const tb = b.ultimoAt ?? Number.MAX_SAFE_INTEGER;
    if (ta !== tb) return ta - tb;
    return a.name.localeCompare(b.name, 'it');
  });
  return righe.map((r, i) => ({ ...r, posizione: i + 1, punti: puntiPerPosizione(i + 1, r.km) }));
}

/* ----------------------------------------------------------- classifica generale */

export type CorridoreGenerale = {
  id: string;
  name: string;
  numero: number | null;
  /** Punti presi nelle tappe chiuse, per indice di tappa. */
  punti: Record<string, number>;
};

export type RigaGenerale = {
  id: string;
  name: string;
  numero: number | null;
  punti: number;
  /** Quante tappe sono entrate nel conto (al massimo N). */
  tappeContate: number;
  /** Tappe vinte: servono a sciogliere le parità. */
  vittorie: number;
  posizione: number;
};

/**
 * Classifica generale: per ciascuno contano le sue **migliori N tappe** (N = `migliori`;
 * null o 0 vuol dire tutte). Così chi è stato assente non è penalizzato per sempre.
 * A parità di punti vince chi ha più vittorie di tappa, poi il nome.
 */
export function classificaGenerale(corridori: CorridoreGenerale[], migliori: number | null): RigaGenerale[] {
  const righe = corridori.map((c) => {
    const valori = Object.values(c.punti ?? {}).sort((a, b) => b - a);
    const contati = migliori && migliori > 0 ? valori.slice(0, migliori) : valori;
    return {
      id: c.id,
      name: c.name,
      numero: c.numero,
      punti: contati.reduce((s, v) => s + v, 0),
      tappeContate: contati.length,
      vittorie: valori.filter((v) => v === PUNTI[0]).length,
    };
  });
  righe.sort((a, b) => {
    if (b.punti !== a.punti) return b.punti - a.punti;
    if (b.vittorie !== a.vittorie) return b.vittorie - a.vittorie;
    return a.name.localeCompare(b.name, 'it');
  });
  return righe.map((r, i) => ({ ...r, posizione: i + 1 }));
}
