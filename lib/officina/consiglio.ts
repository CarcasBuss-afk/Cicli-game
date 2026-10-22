/* Il consiglio a parole: il contesto che si dà al tutor dell'Officina (lib/officina/tutor.ts)
 * e il consiglio finto dei test. Il tutor tira la volata ma non taglia il traguardo per
 * l'allievo: dice dove guardare e che cosa cambiare, mai la riga da scrivere. Il filtro
 * anti-codice sta nel motore (lib/giro/filtroCodice.ts), perché lo usa anche il giudice.
 *
 * Modulo puro: la chiamata al modello sta in tutor.ts (server-only).
 */
import type { Esercizio } from '../giro/esercizi';
import { contieneCodice, pulisciConsiglio } from '../giro/filtroCodice';
import type { SchedaCompito } from './compiti';

/** La domanda dell'allievo è facoltativa e corta. */
export const MAX_DOMANDA = 300;
export interface ContestoConsiglio {
  scheda: SchedaCompito;
  /** Numero della fase, da 1. */
  fase: number;
  fasiTotali: number;
  esercizio: Pick<Esercizio, 'consegna' | 'outputAtteso' | 'prove'>;
  /** Il codice com'è adesso nell'editor. */
  codice: string;
  /** Che cosa produce quel codice: le righe, oppure l'errore del micro-interprete. */
  esito: { output: string[] } | { errore: string };
  /** L'hint automatico che il Giro gli ha già mostrato all'ultima consegna, se c'è. */
  hint: string | null;
  domanda: string;
  /** Consigli già dati in questa tappa, dal più vecchio. */
  precedenti: Array<{ fase: number; consiglio: string }>;
}

function blocco(titolo: string, righe: string[]): string {
  return `${titolo}\n${righe.length ? righe.join('\n') : '(niente)'}`;
}

/** Il messaggio con tutto il contesto. Il modello non vede la soluzione di riferimento: non gli serve e non deve lasciarsela sfuggire. */
export function messaggioConsiglio(c: ContestoConsiglio): string {
  const parti: string[] = [];
  parti.push(`PROGETTO: ${c.scheda.titolo}. ${c.scheda.committente}`);
  parti.push(`Dati: ${c.scheda.dati.join(' · ')}`);
  parti.push(`FASE ${c.fase} di ${c.fasiTotali}. Consegna: ${c.esercizio.consegna.replace(/\*\*/g, '')}`);
  const risposte = c.esercizio.prove?.[0]?.risposte;
  if (risposte) {
    parti.push(
      `Il programma usa input(): viene provato rispondendo, nell'ordine, ${risposte.map((r) => `«${r}»`).join(', ')} (e poi con altre risposte: deve funzionare per chiunque). Il testo delle domande è libero; si confrontano solo le righe stampate con print.`,
    );
  }
  parti.push(blocco('OUTPUT CHE DEVE PRODURRE:', c.esercizio.outputAtteso));
  parti.push(blocco("CODICE DELL'ALLIEVO ADESSO:", c.codice.trim() ? c.codice.replace(/\r\n?/g, '\n').split('\n') : []));
  if ('errore' in c.esito) parti.push(`IL SUO CODICE NON GIRA. Errore: ${c.esito.errore}`);
  else parti.push(blocco('OUTPUT CHE PRODUCE IL SUO CODICE:', c.esito.output));
  if (c.hint) parti.push(`Hint automatico che ha già visto: ${c.hint}`);
  if (c.precedenti.length) {
    parti.push(blocco('CONSIGLI GIÀ DATI (non ripeterli):', c.precedenti.map((p) => `- (fase ${p.fase}) ${p.consiglio}`)));
  }
  parti.push(c.domanda.trim() ? `DOMANDA DELL'ALLIEVO: ${c.domanda.trim()}` : "L'allievo non ha scritto una domanda: non sa come andare avanti.");
  return parti.join('\n\n');
}

export { contieneCodice, pulisciConsiglio };

/** La domanda dell'allievo, ripulita e accorciata; vuota se non c'è. */
export function normalizzaDomanda(valore: unknown): string {
  if (typeof valore !== 'string') return '';
  return valore.replace(/\s+/g, ' ').trim().slice(0, MAX_DOMANDA);
}

/**
 * Il consiglio finto dei test e dello sviluppo senza chiave: risponde con un consiglio
 * generico, oppure, se la domanda comincia con `FINTO:`, con il testo che segue — così i
 * test provano anche che il server scarta le risposte con dentro del codice.
 */
export function consiglioFinto(c: ContestoConsiglio): string {
  const m = c.domanda.match(/^FINTO:([\s\S]*)$/);
  if (m) return m[1].trim();
  if ('errore' in c.esito) return `Il tuo programma non gira ancora: ${c.esito.errore}. Correggi quella riga prima di andare avanti.`;
  return `Confronta la prima riga che stampi con la prima riga attesa: guarda che cosa cambia e quale parte del print la produce. (Consiglio di prova per la fase ${c.fase}.)`;
}
