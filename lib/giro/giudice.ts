/* Il Giudice: il controllo anti-furbo sul codice promosso (PERCORSO.md §13).
 *
 * Il micro-interprete controlla l'output; se è giusto, prima di passare al chilometro o
 * alla fase dopo il giudice (Haiku) guarda il codice e la regola della tappa a parole:
 * «le righe le stampa un ciclo, non la mano». Niente conti sulle righe del corpo, che
 * bocciavano chi scriveva bene con una variabile d'appoggio: decide un lettore, con
 * davanti anche i fatti misurati dall'interprete (quanti for, quanti print, quanti giri).
 *
 * Qui stanno le parti pure: il prompt, il messaggio, la lettura del verdetto, il giudice
 * finto dei test. La chiamata al modello sta in giudiceClient.ts (server-only).
 */
import { contieneCodice } from './filtroCodice';
import type { Struttura } from './interprete';

export const PROMPT_GIUDICE = `Sei il giudice di una gara di programmazione per allievi di 14-16 anni che imparano i cicli for in Python. Il programma dell'allievo produce già l'output giusto: tu devi dire solo se è fatto nel modo che la tappa vuole insegnare, secondo la REGOLA che ti viene data.

Rispondi OK oppure NO.
- OK se il programma rispetta la regola. Variabili d'appoggio, nomi diversi, righe in più, un modo diverso ma onesto di scrivere la stessa cosa: tutto OK. In dubbio: OK.
- NO solo se c'è una frode evidente rispetto alla regola: le righe stampate a mano una per una, un ciclo che gira una volta sola con un print per riga, print aggiunti fuori dal ciclo per completare l'output, il risultato scritto a mano o calcolato con una formula dove la regola chiede l'accumulo, i dati scritti nel programma dove la regola chiede input().

Formato della risposta, senza altro testo:
- prima riga: OK oppure NO
- se NO, seconda riga: una frase sola in italiano, al massimo 40 parole, rivolta all'allievo (dai del tu), che dice che cosa non va e che cosa deve fare invece, senza scrivere codice (niente righe di programma, niente "scrivi così"). Puoi nominare for, print, range, input e i nomi delle sue variabili.`;

export interface ContestoGiudizio {
  consegna: string;
  regola: string;
  outputAtteso: string[];
  codice: string;
  /** I fatti misurati dal micro-interprete sul codice. */
  struttura: Struttura;
  /** Giri fatti dai cicli, in tutto. */
  giri: number;
  /** Le risposte di prova con cui il programma è stato eseguito, se usa `input()`. */
  risposte?: string[];
}

export type Verdetto = { genuino: true } | { genuino: false; motivo: string };

/** Il messaggio con la regola, il codice e i fatti. Niente soluzione di riferimento: non serve. */
export function messaggioGiudizio(c: ContestoGiudizio): string {
  const s = c.struttura;
  const fatti = [
    `cicli for: ${s.numFor}`,
    `giri fatti in tutto: ${c.giri}`,
    `print dentro i cicli: ${s.numPrint - s.printFuoriCiclo}`,
    `print fuori dai cicli: ${s.printFuoriCiclo}`,
    `accumuli dentro i cicli (x += ... o x = x + ...): ${s.accumuliNelCiclo}`,
    `if: ${s.numIf} (di cui dentro un ciclo: ${s.ifNelCiclo})`,
    `chiamate a input(): ${s.numInput}`,
    `righe di output: ${c.outputAtteso.length}`,
  ];
  const parti = [
    `CONSEGNA: ${c.consegna.replace(/\*\*/g, '')}`,
    `REGOLA: ${c.regola}`,
    ...(c.risposte ? [`Il programma è stato eseguito rispondendo alle input(), nell'ordine: ${c.risposte.map((r) => `«${r}»`).join(', ')}.`] : []),
    `OUTPUT (giusto):\n${c.outputAtteso.join('\n')}`,
    `CODICE DELL'ALLIEVO:\n${c.codice.replace(/\r\n?/g, '\n').trim()}`,
    `FATTI MISURATI SUL CODICE:\n${fatti.map((f) => `- ${f}`).join('\n')}`,
  ];
  return parti.join('\n\n');
}

/**
 * Legge il verdetto del modello. `null` se non si capisce: in quel caso il server promuove,
 * perché un giudice che balbetta non deve fermare la classe.
 */
export function interpretaVerdetto(testo: string): Verdetto | null {
  const righe = testo
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((r) => r.replace(/[`*#\-]/g, '').trim())
    .filter((r) => r !== '');
  if (righe.length === 0) return null;
  const prima = righe[0].toUpperCase();
  if (/^OK\b/.test(prima)) return { genuino: true };
  if (/^NO\b/.test(prima)) {
    const dopo = righe[0].slice(2).replace(/^[\s:.,-]+/, '').trim();
    const motivo = (dopo || righe.slice(1).join(' ')).trim();
    return { genuino: false, motivo };
  }
  return null;
}

/** L'hint per l'allievo bocciato dal giudice: mai codice, anche se il modello ce l'ha messo. */
export function hintGiudice(motivo: string, codiceAllievo = ''): string {
  const pulito = motivo.replace(/\s+/g, ' ').trim();
  const buono = pulito !== '' && !contieneCodice(pulito, codiceAllievo);
  const spiegazione = buono ? pulito : 'rileggi la consegna: deve essere il ciclo a fare il lavoro, non le righe scritte a mano';
  return `Il risultato è giusto, ma non è fatto come chiede la tappa: ${spiegazione}`;
}

/** Il marcatore con cui i test fanno bocciare il giudice finto (un commento Python). */
export const MARCATORE_FURBO = '# furbo';

/**
 * Il giudice finto dei test e dello sviluppo senza chiave: promuove tutto, tranne il codice
 * con dentro il commento `# furbo`, così i test provano anche la strada della bocciatura.
 */
export function giudizioFinto(c: ContestoGiudizio): Verdetto {
  if (c.codice.includes(MARCATORE_FURBO)) return { genuino: false, motivo: 'le righe sono scritte a mano una per una: deve essere il ciclo a ripeterle (giudice di prova)' };
  return { genuino: true };
}
