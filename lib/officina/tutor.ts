/* La chiamata al modello per il tutor dell'Officina: Sonnet 5.5, più capace di Haiku,
 * con la conversazione del compito come storia. Stesso filtro
 * anti-codice del giudice, consiglio finto nei test (GREGARIO_FINTO). */
import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { consiglioFinto, contieneCodice, messaggioConsiglio, pulisciConsiglio, type ContestoConsiglio } from './consiglio';
import { ApiError } from '@/lib/giro/http';
import { MAX_RISPOSTA_TUTOR, PROMPT_TUTOR } from './tutorPrompt';

export const MODELLO_TUTOR = process.env.TUTOR_MODEL || 'claude-sonnet-5-5';

const TENTATIVI = 2;

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 40_000, maxRetries: 1 });
  return client;
}

const finto = () => process.env.GREGARIO_FINTO === '1' || !process.env.ANTHROPIC_API_KEY;

export type Scambio = { fase: number; domanda: string; risposta: string };

function nonDisponibile(): ApiError {
  return new ApiError(503, 'TUTOR_NON_DISPONIBILE', 'Il tutor non ha una risposta buona adesso: riprova fra poco');
}

/**
 * Chiede al tutor. La storia della conversazione sul compito entra come messaggi veri,
 * così "non ho capito" ha un senso; il contesto (consegna, codice, output) va nell'ultimo
 * messaggio, aggiornato a com'è adesso.
 */
export async function chiediTutor(contesto: ContestoConsiglio, storia: Scambio[]): Promise<string> {
  if (finto()) {
    const r = pulisciConsiglio(consiglioFinto(contesto), MAX_RISPOSTA_TUTOR);
    if (!r || contieneCodice(r, contesto.codice)) throw nonDisponibile();
    return r;
  }

  const messaggi: Anthropic.MessageParam[] = [];
  for (const s of storia) {
    messaggi.push({ role: 'user', content: `(fase ${s.fase}) ${s.domanda || 'Non so andare avanti.'}` });
    messaggi.push({ role: 'assistant', content: s.risposta });
  }
  // Il contesto del momento sta nell'ultimo messaggio; i consigli già dati sono già nella storia.
  messaggi.push({ role: 'user', content: messaggioConsiglio({ ...contesto, precedenti: [] }) });

  for (let tentativo = 0; tentativo < TENTATIVI; tentativo++) {
    let testo: string;
    try {
      const risposta = await anthropic().messages.create({
        model: MODELLO_TUTOR,
        max_tokens: 1200,
        // Niente `thinking`: Sonnet 5.5 rifiuta `{type: 'disabled'}` (che invece serve a Haiku nel giudice,
        // vedi giudiceClient.ts) e senza il parametro risponde subito, senza ragionare prima.
        system: PROMPT_TUTOR,
        messages: messaggi,
      });
      testo = risposta.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
    } catch (e) {
      console.error('[tutor] errore dal modello', e);
      throw new ApiError(503, 'TUTOR_NON_DISPONIBILE', 'Il tutor non risponde: riprova fra poco');
    }
    const risposta = pulisciConsiglio(testo, MAX_RISPOSTA_TUTOR);
    if (risposta && !contieneCodice(risposta, contesto.codice)) return risposta;
    console.warn('[tutor] risposta scartata', { tentativo, vuota: !risposta, testo });
    messaggi.push({ role: 'assistant', content: testo });
    messaggi.push({ role: 'user', content: 'La risposta contiene del codice: rifalla a parole, senza nessuna riga di programma.' });
  }
  throw nonDisponibile();
}
