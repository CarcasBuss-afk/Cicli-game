'use client';
/* Chiamate alle API dell'Officina dal browser dell'allievo, con l'ID token del suo account
 * Google. A differenza del Giro qui l'SDK client serve (per il login): è l'eccezione
 * voluta, vedi PERCORSO.md §12. */
import type { EsercizioPubblico } from '@/lib/giro/esercizi';
import type { SchedaProgetto } from '@/lib/giro/progetti';
import { getClientAuth } from '@/lib/firebaseClient';

export class ErroreOfficina extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function chiamaOfficina<T>(azione: string, dati: Record<string, unknown> = {}): Promise<T> {
  const utente = getClientAuth().currentUser;
  if (!utente) throw new ErroreOfficina('UNAUTHENTICATED', 'Accedi con il tuo account della scuola');
  const token = await utente.getIdToken();
  const annulla = new AbortController();
  const scadenza = setTimeout(() => annulla.abort(), 60_000);
  try {
    const r = await fetch('/api/officina', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ azione, ...dati }),
      signal: annulla.signal,
    });
    const corpo = (await r.json().catch(() => null)) as { error?: string; message?: string } | null;
    if (!r.ok) throw new ErroreOfficina(corpo?.error ?? 'INTERNAL', corpo?.message ?? 'Errore del server: chiama il prof');
    return corpo as T;
  } catch (e) {
    if (e instanceof ErroreOfficina) throw e;
    throw new ErroreOfficina('RETE', 'Connessione al server persa: riprova fra poco');
  } finally {
    clearTimeout(scadenza);
  }
}

export const messaggioErrore = (e: unknown) => (e instanceof Error ? e.message : 'Qualcosa è andato storto: chiama il prof');

/* ------------------------------------------------------------- forma delle risposte */

export type Io = { uid: string; email: string; nome: string; classi: Array<{ id: string; nome: string; chiusa: boolean }> };

export type CompitoInElenco = {
  id: string;
  progetto: string;
  titolo: string;
  scadenzaAt: number | null;
  scaduto: boolean;
  fasi: number;
  fasiTotali: number;
  consigli: number;
  finito: boolean;
  /** Il voto, quando è fissato (finito o scaduto); altrimenti null. */
  voto: number | null;
  votoSeFinisci: number;
};

export type Scambio = { fase: number; domanda: string; risposta: string };

export type CompitoAperto = Omit<CompitoInElenco, 'titolo'> & {
  scheda: SchedaProgetto;
  esercizio: EsercizioPubblico | null;
  codice: Record<string, string>;
  tutor: Scambio[];
  errori: number;
};

export type RispostaConsegna =
  | {
      promosso: true;
      output: string[] | null;
      fasi: number;
      finito: boolean;
      voto: number | null;
      votoSeFinisci: number;
      esercizio: EsercizioPubblico | null;
    }
  | { promosso: false; hint: string; output: string[] | null; errori: number };

export type RispostaTutor = { risposta: string; consigli: number; votoSeFinisci: number; fase: number };
