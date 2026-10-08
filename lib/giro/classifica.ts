/* Classifica e statistiche della vista LIM. Funzioni pure (girano nel browser del
 * docente, sui dati che arrivano da Firestore in tempo reale).
 *
 * Ordine della corsa: prima chi ha fatto più tappe; a parità, chi è arrivato prima
 * (ordine d'arrivo assegnato dal server) o, per chi è ancora in corsa, chi ha completato
 * per ultimo la sua tappa più recente. Gli errori non contano in classifica: costano
 * tempo e basta, come dice il gioco agli allievi.
 */
import type { TipoEsercizio } from './esercizi';

export type TappaFatta = { completedAt: Date | null; errori: number };

export type AllievoLim = {
  id: string;
  name: string;
  /** Numero di corsa; null per le gare create prima che esistesse. */
  numero: number | null;
  tappaCorrente: number;
  tappe: Record<string, TappaFatta>;
  erroriTotali: number;
  finishedAt: Date | null;
  ordineArrivo: number | null;
};

/** Istante dell'ultima tappa completata, 0 se non ne ha ancora completate. */
export function ultimoArrivoMs(a: AllievoLim): number {
  const istanti = Object.values(a.tappe ?? {})
    .map((t) => t.completedAt?.getTime() ?? 0)
    .filter((t) => t > 0);
  return istanti.length ? Math.max(...istanti) : 0;
}

export function classifica(allievi: AllievoLim[]): AllievoLim[] {
  return [...allievi].sort((a, b) => {
    if (b.tappaCorrente !== a.tappaCorrente) return b.tappaCorrente - a.tappaCorrente;
    // Fra due arrivati vale l'ordine d'arrivo deciso dal server.
    if (a.ordineArrivo !== null && b.ordineArrivo !== null) return a.ordineArrivo - b.ordineArrivo;
    if (a.ordineArrivo !== null) return -1;
    if (b.ordineArrivo !== null) return 1;
    const ua = ultimoArrivoMs(a);
    const ub = ultimoArrivoMs(b);
    // Chi non ha ancora completato niente sta in fondo, non in testa.
    if (ua !== ub) return (ua || Number.MAX_SAFE_INTEGER) - (ub || Number.MAX_SAFE_INTEGER);
    return a.name.localeCompare(b.name, 'it');
  });
}

/** Le ultime tappe completate da chiunque, più recenti prima: è il filo della cronaca. */
export function cronaca(allievi: AllievoLim[], quante = 6): Array<{ nome: string; tappa: number; quando: Date }> {
  const eventi: Array<{ nome: string; tappa: number; quando: Date }> = [];
  for (const a of allievi) {
    for (const [indice, t] of Object.entries(a.tappe ?? {})) {
      if (t.completedAt) eventi.push({ nome: a.name, tappa: Number(indice) + 1, quando: t.completedAt });
    }
  }
  return eventi.sort((x, y) => y.quando.getTime() - x.quando.getTime()).slice(0, quante);
}

/** Errori per tappa (indice 0-based): dice su quale scoglio si è fermata la classe. */
export function erroriPerTappa(allievi: AllievoLim[], numTappe: number): number[] {
  const out = new Array<number>(numTappe).fill(0);
  for (const a of allievi) {
    for (const [indice, t] of Object.entries(a.tappe ?? {})) {
      const i = Number(indice);
      if (i >= 0 && i < numTappe) out[i] += t.errori ?? 0;
    }
  }
  return out;
}

/**
 * Errori raggruppati per tipo di tappa, dal più "ostico" in giù: a fine gara dice al
 * docente che cosa conviene rispiegare.
 */
export function riepilogoPerTipo(
  allievi: AllievoLim[],
  tipi: TipoEsercizio[],
): Array<{ tipo: TipoEsercizio; errori: number; tappe: number }> {
  const errori = erroriPerTappa(allievi, tipi.length);
  const somma = new Map<TipoEsercizio, { errori: number; tappe: number }>();
  tipi.forEach((tipo, i) => {
    const riga = somma.get(tipo) ?? { errori: 0, tappe: 0 };
    riga.errori += errori[i];
    riga.tappe += 1;
    somma.set(tipo, riga);
  });
  return [...somma.entries()]
    .map(([tipo, v]) => ({ tipo, ...v }))
    .sort((a, b) => b.errori / b.tappe - a.errori / a.tappe);
}

/** Nome leggibile del tipo di tappa, per il riepilogo alla LIM. */
export const NOME_TIPO: Record<TipoEsercizio, string> = {
  'ripeti-n': 'Ripetere N volte',
  'output-range': 'Scrivere il ciclo',
  'completa-range': 'Completare range',
  'ciclo-output': 'Indovinare l\'output',
  'ciclo-stringa': 'Ciclo su una parola',
  accumulatore: 'Somma con accumulatore',
  'riga-ripetuta': 'Ripetere una riga',
  scala: 'Scala di asterischi',
  'caccia-errore': 'Caccia all\'errore',
  'quante-righe': 'Quante righe stampa',
  'accumulatore-visibile': 'Somma che cresce',
  'conta-giri': 'Contare i giri',
};

/** "mm:ss" sotto l'ora, altrimenti "h:mm:ss". */
export function formattaDurata(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return '–';
  const totaleSecondi = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totaleSecondi / 3600);
  const m = Math.floor((totaleSecondi % 3600) / 60);
  const s = totaleSecondi % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
