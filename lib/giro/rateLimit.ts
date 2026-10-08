/* Rate limiting leggero, in memoria, a finestra fissa di un minuto per chiave.
 * Serve a fermare i loop accidentali (un tasto che resta premuto), non è una difesa:
 * ogni istanza del server ha i propri contatori.
 * GIRO_RATE_LIMIT_PER_MINUTE (default 30) regola il limite.
 */

const FINESTRA_MS = 60_000;
const MAX_CHIAVI = 5000;

const contatori = new Map<string, { inizio: number; n: number }>();

export function limitePerMinuto(): number {
  const n = Number(process.env.GIRO_RATE_LIMIT_PER_MINUTE ?? 30);
  return Number.isFinite(n) && n > 0 ? n : 30;
}

/** true se la richiesta è ammessa, false se la chiave ha superato il limite nel minuto. */
export function richiestaAmmessa(chiave: string, ora = Date.now()): boolean {
  const c = contatori.get(chiave);
  if (!c || ora - c.inizio >= FINESTRA_MS) {
    if (contatori.size >= MAX_CHIAVI) pulisci(ora);
    contatori.set(chiave, { inizio: ora, n: 1 });
    return true;
  }
  c.n += 1;
  return c.n <= limitePerMinuto();
}

function pulisci(ora: number): void {
  for (const [k, c] of contatori) if (ora - c.inizio >= FINESTRA_MS) contatori.delete(k);
  if (contatori.size >= MAX_CHIAVI) contatori.clear();
}
