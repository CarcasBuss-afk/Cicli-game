/* Dati della vista LIM: cronaca della tappa, riepilogo degli errori per tipo di esercizio,
 * durate. Funzioni pure, girano nel browser del docente sui dati che arrivano da Firestore
 * in tempo reale. Le classifiche (di tappa e generale) stanno in giro.ts. */
import type { TipoEsercizio } from './esercizi';

/** Come è andato un allievo in una tappa, con le date già convertite. */
export type ProgressoLim = {
  km: number;
  kmAt: Record<string, Date | null>;
  errori: number;
  erroriKm: Record<string, number>;
  ultimoAt: Date | null;
  ordineArrivo: number | null;
  posizione: number | null;
  punti: number | null;
};

export type AllievoLim = {
  id: string;
  name: string;
  /** Numero di corsa; null per le gare create prima che esistesse. */
  numero: number | null;
  erroriTotali: number;
  /** Progressi per tappa (chiave = indice della tappa). */
  tappe: Record<string, ProgressoLim>;
};

/** I chilometri chiusi più di recente nella tappa: è il filo della cronaca alla LIM. */
export function cronaca(
  allievi: AllievoLim[],
  tappa: number,
  quante = 6,
): Array<{ nome: string; km: number; quando: Date }> {
  const eventi: Array<{ nome: string; km: number; quando: Date }> = [];
  for (const a of allievi) {
    const p = a.tappe?.[String(tappa)];
    for (const [k, quando] of Object.entries(p?.kmAt ?? {})) {
      if (quando) eventi.push({ nome: a.name, km: Number(k) + 1, quando });
    }
  }
  return eventi.sort((x, y) => y.quando.getTime() - x.quando.getTime()).slice(0, quante);
}

/**
 * Errori raggruppati per tipo di esercizio su tutte le tappe corse, dal più "ostico" in
 * giù (errori medi per chilometro): a fine Giro dice al docente che cosa rispiegare.
 * `tipi[t][k]` è il tipo del chilometro k della tappa t.
 */
export function riepilogoErrori(
  tipi: TipoEsercizio[][],
  allievi: AllievoLim[],
): Array<{ tipo: TipoEsercizio; errori: number; km: number }> {
  const somma = new Map<TipoEsercizio, { errori: number; km: number }>();
  tipi.forEach((perKm, t) => {
    perKm.forEach((tipo, k) => {
      const riga = somma.get(tipo) ?? { errori: 0, km: 0 };
      riga.km += 1;
      for (const a of allievi) riga.errori += a.tappe?.[String(t)]?.erroriKm?.[String(k)] ?? 0;
      somma.set(tipo, riga);
    });
  });
  return [...somma.entries()]
    .map(([tipo, v]) => ({ tipo, ...v }))
    .filter((r) => r.km > 0)
    .sort((a, b) => b.errori / b.km - a.errori / a.km);
}

/** Nome leggibile del tipo di esercizio, per il riepilogo alla LIM. */
export const NOME_TIPO: Record<TipoEsercizio, string> = {
  'ripeti-n': 'Ripetere N volte',
  'output-range': 'Scrivere il ciclo',
  'completa-range': 'Completare range',
  'ciclo-output': "Indovinare l'output",
  'ciclo-stringa': 'Ciclo su una parola',
  accumulatore: 'Somma con accumulatore',
  'riga-ripetuta': 'Ripetere una riga',
  scala: 'Scala di asterischi',
  'caccia-errore': "Caccia all'errore",
  'quante-righe': 'Quante righe stampa',
  'accumulatore-visibile': 'Somma che cresce',
  'conta-giri': 'Contare i giri',
  fstring: 'Testo e numero (f-string)',
  'conta-lettere': 'Contare le lettere',
};

/** "m:ss" per il cronometro della tappa. */
export function formattaSecondi(secondi: number | null): string {
  if (secondi === null || !Number.isFinite(secondi)) return '–';
  const s = Math.max(0, Math.floor(secondi));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
