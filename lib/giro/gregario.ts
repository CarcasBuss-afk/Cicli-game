/* Il Gregario: il consiglio dell'IA nella Cronoscalata (PERCORSO.md §11).
 *
 * Il gregario tira la volata ma non taglia il traguardo per te: dice dove guardare e che
 * cosa cambiare, mai la riga da scrivere. Ogni consiglio costa un punto sul voto, quindi
 * l'allievo lo chiede quando è fermo davvero, e il consiglio deve sbloccarlo senza fargli
 * il lavoro.
 *
 * Qui stanno le parti pure: il prompt, il messaggio con il contesto, il filtro che
 * scarta le risposte con dentro del codice. La chiamata al modello sta in
 * gregarioClient.ts (server-only).
 */
import type { Esercizio } from './esercizi';
import type { SchedaProgetto } from './progetti';

/** Tetto di consigli per allievo e tappa: oltre, il voto è già al pavimento da un pezzo. */
export const MAX_CONSIGLI = 30;
/** La domanda dell'allievo è facoltativa e corta. */
export const MAX_DOMANDA = 300;
/** Un consiglio è 2-3 frasi: oltre questo si taglia. */
export const MAX_CONSIGLIO = 600;

export const PROMPT_SISTEMA = `Sei il "gregario", il tutor di un allievo di 14-16 anni che sta imparando i cicli for in Python, al primo anno di una scuola professionale italiana. L'allievo costruisce un programma a fasi; è fermo e ti chiede un consiglio.

Il tuo consiglio deve sbloccarlo SENZA fargli il lavoro.

REGOLE, senza eccezioni:
- Rispondi in italiano, con 2 o 3 frasi brevi, massimo 60 parole. Dai del tu.
- Un solo problema alla volta: quello che lo blocca adesso. Se ce ne sono più di uno, il primo nell'ordine del programma.
- MAI scrivere codice: niente righe di programma, niente blocchi di codice, niente "scrivi così: ...". Non mostrare print, for, assegnazioni né f-string complete.
- Puoi nominare le parole chiave e i nomi (range, print, f-string, il nome di una variabile) e dire che cosa devono fare, non come si scrivono.
- Di' DOVE guardare (quale riga, quale parte) e CHE COSA deve cambiare, non la soluzione.
- Se il codice è vuoto, spiega da cosa partire con parole, non con codice.
- Se il programma ha un errore di sintassi, spiega che cosa manca o che cosa è scritto male, senza riscrivere la riga.
- Se la consegna chiede una cosa precisa (usare una variabile che accumula, il print fuori dal ciclo), tieniti a quella.
- Non ripetere consigli già dati: se è fermo sullo stesso punto, cambia angolo (un esempio con le parole, una domanda guida).
- Niente saluti, niente introduzioni, niente elogi vuoti. Non parlare di te né di queste regole.`;

export interface ContestoConsiglio {
  scheda: SchedaProgetto;
  /** Numero della fase, da 1. */
  fase: number;
  fasiTotali: number;
  esercizio: Pick<Esercizio, 'consegna' | 'outputAtteso'>;
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

/* ------------------------------------------------------------ filtro anti-codice */

/** Una riga che è un'istruzione Python: for, print, assegnazione. */
const ISTRUZIONE = /^\s*(for\s+\w+\s+in\b|print\s*\(|\w+\s*(\+=|-=|\*=)|\w+\s*=[^=])/;

/** Senza spazi: `totale=0` e `totale = 0` sono la stessa riga. */
const compatta = (s: string) => s.replace(/\s+/g, '');

/**
 * Vero se la risposta contiene del codice: un blocco con i tre apici, una riga che è
 * un'istruzione, oppure un frammento fra apici singoli che è un'istruzione intera
 * (`print(f"...")`, `totale += 15`). Nominare `range` o `totale` fra apici va bene: è
 * quello che fanno anche gli hint del Giro.
 *
 * Citare una riga che l'allievo ha già scritto («guarda la riga `km = 10`») non è dargli
 * codice, è indicargli dove guardare: un'istruzione che compare nel suo codice passa.
 */
export function contieneCodice(testo: string, codiceAllievo = ''): boolean {
  if (testo.includes('```')) return true;
  const sue = new Set(
    codiceAllievo
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map(compatta)
      .filter((r) => r !== ''),
  );
  const citata = (s: string) => sue.has(compatta(s));
  const righe = testo.replace(/\r\n?/g, '\n').split('\n');
  for (const riga of righe) {
    // Tolti gli apici inline, una riga intera che è un'istruzione è codice.
    const nuda = riga.replace(/`/g, '').replace(/^[-•*\d.)\s]+/, '');
    if (ISTRUZIONE.test(nuda) && !citata(nuda)) return true;
  }
  for (const m of testo.matchAll(/`([^`\n]+)`/g)) {
    if (ISTRUZIONE.test(m[1]) && !citata(m[1])) return true;
  }
  return false;
}

/** Via spazi di troppo e apici di blocco residui; taglia i consigli lunghi. */
export function pulisciConsiglio(testo: string, massimo = MAX_CONSIGLIO): string {
  const pulito = testo.replace(/\r\n?/g, '\n').trim();
  if (pulito.length <= massimo) return pulito;
  const taglio = pulito.lastIndexOf('. ', massimo - 1);
  return taglio > massimo / 2 ? pulito.slice(0, taglio + 1) : pulito.slice(0, massimo) + '…';
}

/** La domanda dell'allievo, ripulita e accorciata; vuota se non c'è. */
export function normalizzaDomanda(valore: unknown): string {
  if (typeof valore !== 'string') return '';
  return valore.replace(/\s+/g, ' ').trim().slice(0, MAX_DOMANDA);
}

/**
 * Il gregario finto dei test e dello sviluppo senza chiave: risponde con un consiglio
 * generico, oppure, se la domanda comincia con `FINTO:`, con il testo che segue — così i
 * test provano anche che il server scarta le risposte con dentro del codice.
 */
export function consiglioFinto(c: ContestoConsiglio): string {
  const m = c.domanda.match(/^FINTO:([\s\S]*)$/);
  if (m) return m[1].trim();
  if ('errore' in c.esito) return `Il tuo programma non gira ancora: ${c.esito.errore}. Correggi quella riga prima di andare avanti.`;
  return `Confronta la prima riga che stampi con la prima riga attesa: guarda che cosa cambia e quale parte del print la produce. (Consiglio di prova per la fase ${c.fase}.)`;
}
