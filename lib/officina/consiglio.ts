/* Il consiglio a parole: il contesto che si dà al tutor dell'Officina (lib/officina/tutor.ts)
 * e il consiglio finto dei test. Il tutor tira la volata ma non taglia il traguardo per
 * l'allievo: dice dove guardare e che cosa cambiare, mai la riga da scrivere. Il filtro
 * anti-codice sta nel motore (lib/giro/filtroCodice.ts), perché lo usa anche il giudice.
 *
 * Modulo puro: la chiamata al modello sta in tutor.ts (server-only).
 */
import { descriviProva, opzioniDiProva, type Esercizio } from '../giro/esercizi';
import { contieneCodice, pulisciConsiglio } from '../giro/filtroCodice';
import { esegui } from '../giro/interprete';
import type { SchedaCompito } from './compiti';

/** La domanda dell'allievo è facoltativa e corta. */
export const MAX_DOMANDA = 300;

/**
 * La prova nascosta su cui il codice cade: con quali risposte, che cosa doveva stampare e
 * che cosa stampa (o l'errore con cui si ferma). L'hint automatico dice solo «con altre
 * risposte stampa un'altra cosa»; il tutor, per spiegare, deve vedere quale.
 */
export interface ProvaNascosta {
  risposte: string[];
  /** I numeri di `randint()` della prova, se il compito usa il caso. */
  casuali?: number[];
  atteso: string[];
  prodotto: string[] | null;
  errore?: string;
}

export interface ContestoConsiglio {
  scheda: SchedaCompito;
  /** Numero della fase, da 1. */
  fase: number;
  fasiTotali: number;
  esercizio: Pick<Esercizio, 'consegna' | 'outputAtteso' | 'prove' | 'regola'>;
  /** Il codice com'è adesso nell'editor. */
  codice: string;
  /** Che cosa produce quel codice: le righe, oppure l'errore del micro-interprete. */
  esito: { output: string[] } | { errore: string };
  /** L'hint automatico che il Giro gli ha già mostrato all'ultima consegna, se c'è. */
  hint: string | null;
  /** La prova nascosta che non passa, se il codice passa quella mostrata e cade su un'altra. */
  provaNascosta?: ProvaNascosta | null;
  domanda: string;
  /** Consigli già dati in questa tappa, dal più vecchio. */
  precedenti: Array<{ fase: number; consiglio: string }>;
}

function blocco(titolo: string, righe: string[]): string {
  return `${titolo}\n${righe.length ? righe.join('\n') : '(niente)'}`;
}

const normalizza = (righe: string[]) => righe.map((r) => r.trimEnd()).join('\n').trimEnd();

/**
 * La prova nascosta su cui cade il codice, se c'è: solo quando la prova mostrata passa
 * (altrimenti il problema è quello, e si vede già nell'esito). Pura: solo l'interprete.
 */
export function provaCheCade(esercizio: Pick<Esercizio, 'outputAtteso' | 'prove'>, codice: string): ProvaNascosta | null {
  const prove = esercizio.prove;
  if (!prove || prove.length < 2 || !codice.trim()) return null;
  const mostrata = esegui(codice, opzioniDiProva(prove[0]));
  if (!mostrata.ok || normalizza(mostrata.output) !== normalizza(prove[0].output)) return null;
  for (const prova of prove.slice(1)) {
    const esito = esegui(codice, opzioniDiProva(prova));
    const base = { risposte: prova.risposte, atteso: prova.output, ...(prova.casuali ? { casuali: prova.casuali } : {}) };
    if (!esito.ok) return { ...base, prodotto: null, errore: esito.errore.messaggio };
    if (normalizza(esito.output) !== normalizza(prova.output)) return { ...base, prodotto: esito.output };
  }
  return null;
}

const virgolette = (r: string) => `«${r}»`;

/** Il messaggio con tutto il contesto. Il modello non vede la soluzione di riferimento: non gli serve e non deve lasciarsela sfuggire. */
export function messaggioConsiglio(c: ContestoConsiglio): string {
  const parti: string[] = [];
  parti.push(`PROGETTO: ${c.scheda.titolo}. ${c.scheda.committente}`);
  parti.push(`Dati: ${c.scheda.dati.join(' · ')}`);
  parti.push(`FASE ${c.fase} di ${c.fasiTotali}. Consegna: ${c.esercizio.consegna.replace(/\*\*/g, '')}`);
  if (c.esercizio.regola) {
    parti.push(`REGOLA DEL COMPITO (la controlla un giudice sul codice che dà l'output giusto; se non è rispettata la consegna è bocciata anche con l'output giusto): ${c.esercizio.regola}`);
  }
  const prova = c.esercizio.prove?.[0];
  if (prova && prova.risposte.length > 0) {
    parti.push(
      `Il programma usa input(): viene provato rispondendo, nell'ordine, ${prova.risposte.map(virgolette).join(', ')} (e poi con altre risposte: deve funzionare per chiunque). Il testo delle domande è libero; si confrontano solo le righe stampate con print.`,
    );
  }
  if (prova?.casuali && prova.casuali.length > 0) {
    parti.push(
      `Il programma usa random.randint(): nella prova il numero "casuale" è ${prova.casuali.join(', poi ')} (l'allievo non lo vede nel codice e non deve scriverlo a mano; con altre prove cambia).`,
    );
  }
  parti.push(blocco('OUTPUT CHE DEVE PRODURRE:', c.esercizio.outputAtteso));
  parti.push(blocco("CODICE DELL'ALLIEVO ADESSO:", c.codice.trim() ? c.codice.replace(/\r\n?/g, '\n').split('\n') : []));
  if ('errore' in c.esito) parti.push(`IL SUO CODICE NON GIRA. Errore: ${c.esito.errore}`);
  else parti.push(blocco('OUTPUT CHE PRODUCE IL SUO CODICE:', c.esito.output));
  if (c.provaNascosta) {
    const p = c.provaNascosta;
    parti.push(
      `CON I DATI DI PROVA FUNZIONA, MA CADE SU UN'ALTRA PROVA. ${descriviProva({ risposte: p.risposte, casuali: p.casuali, output: p.atteso }).replace(/^./, (m) => m.toUpperCase())}:\n` +
        blocco('deve stampare:', p.atteso) +
        '\n' +
        (p.prodotto ? blocco('invece stampa:', p.prodotto) : `invece si ferma con l'errore: ${p.errore}`) +
        '\nPuoi dirgli questi dati e che cosa succede: il punto da far capire è che i numeri devono arrivare dalle risposte (o da randint), non essere scritti nel programma.',
    );
  }
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
