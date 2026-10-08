/* Chiamate alle API dal browser dell'allievo e identità salvata nel localStorage.
 *
 * Vincolo di CLAUDE.md: la pagina non deve mai rompersi. Ogni chiamata ha un timeout di
 * 10 secondi e, se la rete fa i capricci, tre tentativi prima di arrendersi con un
 * messaggio chiaro. Gli errori del server (4xx/5xx) non si ritentano: sono risposte.
 */
import type { TappaPubblica } from './tappe';

const TIMEOUT_MS = 10_000;
const TENTATIVI = 3;
const ATTESA_FRA_TENTATIVI_MS = 700;

export class ErroreApi extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Errore di rete: il server non ha risposto affatto. */
export class ErroreRete extends Error {
  constructor(message = 'Connessione al server persa: chiama il prof') {
    super(message);
  }
}

const attendi = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function chiamaApi<T>(rotta: string, dati: unknown): Promise<T> {
  let ultimo: unknown;
  for (let tentativo = 1; tentativo <= TENTATIVI; tentativo++) {
    const annulla = new AbortController();
    const scadenza = setTimeout(() => annulla.abort(), TIMEOUT_MS);
    try {
      const risposta = await fetch(`/api/giro/${rotta}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dati),
        signal: annulla.signal,
      });
      const corpo = await risposta.json().catch(() => null);
      if (!risposta.ok) {
        const errore = corpo as { error?: string; message?: string } | null;
        throw new ErroreApi(errore?.error ?? 'INTERNAL', errore?.message ?? 'Errore del server: chiama il prof');
      }
      return corpo as T;
    } catch (e) {
      // Una risposta d'errore del server è definitiva: non si ritenta.
      if (e instanceof ErroreApi) throw e;
      ultimo = e;
      if (tentativo < TENTATIVI) await attendi(ATTESA_FRA_TENTATIVI_MS * tentativo);
    } finally {
      clearTimeout(scadenza);
    }
  }
  console.error('[giro] rete non raggiungibile', ultimo);
  throw new ErroreRete();
}

/** Messaggio da mostrare per qualunque errore arrivato da `chiamaApi`. */
export function messaggioErrore(e: unknown): string {
  if (e instanceof ErroreApi || e instanceof ErroreRete) return e.message;
  return 'Qualcosa è andato storto: chiama il prof';
}

/* ------------------------------------------------------------------ identità */

const CHIAVE = 'giro:allievo';

export type Identita = {
  playerId: string;
  token: string;
  name: string;
  numTappe: number;
};

/** Il localStorage può essere bloccato (navigazione in incognito): mai lasciar cadere la pagina. */
export function salvaIdentita(i: Identita): void {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(i));
  } catch {
    // Pazienza: l'allievo dovrà rientrare se ricarica la pagina.
  }
}

export function leggiIdentita(): Identita | null {
  try {
    const grezzo = localStorage.getItem(CHIAVE);
    if (!grezzo) return null;
    const i = JSON.parse(grezzo) as Partial<Identita>;
    if (typeof i.playerId !== 'string' || typeof i.token !== 'string' || typeof i.name !== 'string') return null;
    return { playerId: i.playerId, token: i.token, name: i.name, numTappe: Number(i.numTappe) || 0 };
  } catch {
    return null;
  }
}

export function dimenticaIdentita(): void {
  try {
    localStorage.removeItem(CHIAVE);
  } catch {
    // niente da fare
  }
}

/* ------------------------------------------------------- forma delle risposte */

export type StatoSessione = 'waiting' | 'running' | 'closed';

export type RispostaJoin = {
  playerId: string;
  token: string;
  name: string;
  sessionStatus: StatoSessione;
  numTappe: number;
  classLabel: string;
};

export type RispostaStatus = {
  sessionStatus: StatoSessione;
  name: string;
  classLabel: string;
  numTappe: number;
  tappaCorrente: number;
  arrivato: boolean;
  posizione: number | null;
  erroriTotali: number;
  tappa: TappaPubblica | null;
};

export type RispostaSubmit =
  | {
      promosso: true;
      output: string[] | null;
      tappaCorrente: number;
      arrivato: boolean;
      posizione: number | null;
      erroriTotali: number;
      tappa: TappaPubblica | null;
    }
  | { promosso: false; hint: string; output: string[] | null; erroriTotali: number };

export const join = (code: string, name: string) => chiamaApi<RispostaJoin>('join', { code, name });

export const status = (i: Identita) =>
  chiamaApi<RispostaStatus>('status', { playerId: i.playerId, token: i.token });

export const submit = (i: Identita, tappa: number, risposta: string) =>
  chiamaApi<RispostaSubmit>('submit', { playerId: i.playerId, token: i.token, tappa, risposta });
