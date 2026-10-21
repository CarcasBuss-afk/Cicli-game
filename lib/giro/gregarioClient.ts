/* La chiamata al modello per il Gregario. Haiku: veloce, costa poco, e per dire "guarda
 * il secondo numero di range" basta e avanza. La chiave è `ANTHROPIC_API_KEY`, la stessa
 * di edu-code, in variabile d'ambiente: mai nel bundle, mai nel repository.
 *
 * Senza chiave (sviluppo) o con `GREGARIO_FINTO` (test) risponde il gregario finto.
 */
import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { consiglioFinto, contieneCodice, messaggioConsiglio, PROMPT_SISTEMA, pulisciConsiglio, type ContestoConsiglio } from './gregario';
import { ApiError } from './http';

export const MODELLO_GREGARIO = 'claude-haiku-5-5';

/** Quante volte si richiede un consiglio al modello se quello arrivato contiene codice. */
const TENTATIVI = 2;

let client: Anthropic | null = null;

function anthropic(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 20_000, maxRetries: 1 });
  return client;
}

function finto(): boolean {
  return process.env.GREGARIO_FINTO === '1' || !process.env.ANTHROPIC_API_KEY;
}

/**
 * Chiede un consiglio e lo restituisce ripulito. Se il modello risponde con del codice
 * si riprova una volta chiedendo di rifare senza; se insiste, il consiglio non si dà:
 * meglio nessun consiglio che la soluzione dettata.
 */
export async function chiediConsiglio(contesto: ContestoConsiglio): Promise<string> {
  if (finto()) {
    const risposta = pulisciConsiglio(consiglioFinto(contesto));
    if (contieneCodice(risposta, contesto.codice)) throw new ApiError(503, 'GREGARIO_NON_DISPONIBILE', 'Il gregario non ha un consiglio buono adesso: riprova fra poco');
    return risposta;
  }

  const messaggi: Anthropic.MessageParam[] = [{ role: 'user', content: messaggioConsiglio(contesto) }];
  for (let tentativo = 0; tentativo < TENTATIVI; tentativo++) {
    let testo: string;
    try {
      const risposta = await anthropic().messages.create({
        model: MODELLO_GREGARIO,
        max_tokens: 400,
        // Senza questo Haiku ragiona prima di rispondere e il ragionamento si mangia i
        // token: il testo arrivava vuoto e il gregario "non aveva un consiglio buono".
        thinking: { type: 'disabled' },
        system: PROMPT_SISTEMA,
        messages: messaggi,
      });
      testo = risposta.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
    } catch (e) {
      console.error('[gregario] errore dal modello', e);
      throw new ApiError(503, 'GREGARIO_NON_DISPONIBILE', 'Il gregario non risponde: riprova fra poco');
    }
    const consiglio = pulisciConsiglio(testo);
    if (consiglio && !contieneCodice(consiglio, contesto.codice)) return consiglio;
    // Nei log di Vercel si vede che cosa è stato scartato: serve a tarare prompt e filtro.
    console.warn('[gregario] risposta scartata', { tentativo, vuota: !consiglio, testo });
    // Si rimanda la risposta sbagliata e si chiede di rifarla senza codice.
    messaggi.push({ role: 'assistant', content: testo });
    messaggi.push({ role: 'user', content: 'Il consiglio contiene del codice: rifallo a parole, senza nessuna riga di programma, in 2-3 frasi.' });
  }
  throw new ApiError(503, 'GREGARIO_NON_DISPONIBILE', 'Il gregario non ha un consiglio buono adesso: riprova fra poco');
}
