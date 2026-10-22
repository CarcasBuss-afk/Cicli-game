/* La chiamata al modello per il Giudice. Haiku: una lettura di dieci righe con i fatti
 * già misurati, veloce e da un decimo di centesimo. Stessa chiave del gregario.
 *
 * Se il modello non risponde, o risponde una cosa che non si capisce, la consegna
 * **passa**: un'ora di laboratorio non si ferma per un disservizio dell'API, e nei log
 * resta traccia. Senza chiave (sviluppo) o con `GREGARIO_FINTO` (test) giudica il finto.
 */
import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { giudizioFinto, interpretaVerdetto, messaggioGiudizio, PROMPT_GIUDICE, type ContestoGiudizio, type Verdetto } from './giudice';

export const MODELLO_GIUDICE = 'claude-haiku-5-5';

let client: Anthropic | null = null;

function anthropic(): Anthropic {
  // Timeout corto: il giudice sta sulla strada di ogni chilometro promosso.
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 10_000, maxRetries: 1 });
  return client;
}

function finto(): boolean {
  return process.env.GREGARIO_FINTO === '1' || !process.env.ANTHROPIC_API_KEY;
}

/** Il verdetto del giudice sul codice promosso. In caso di dubbio o di guasto: genuino. */
export async function giudica(contesto: ContestoGiudizio): Promise<Verdetto> {
  if (finto()) return giudizioFinto(contesto);

  let testo: string;
  try {
    const risposta = await anthropic().messages.create({
      model: MODELLO_GIUDICE,
      max_tokens: 200,
      // Come per il gregario: senza, Haiku ragiona e il ragionamento si mangia i token.
      thinking: { type: 'disabled' },
      system: PROMPT_GIUDICE,
      messages: [{ role: 'user', content: messaggioGiudizio(contesto) }],
    });
    testo = risposta.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');
  } catch (e) {
    console.warn('[giudice] modello non disponibile, consegna promossa senza giudizio', e);
    return { genuino: true };
  }
  const verdetto = interpretaVerdetto(testo);
  if (!verdetto) {
    console.warn('[giudice] verdetto incomprensibile, consegna promossa', { testo });
    return { genuino: true };
  }
  if (!verdetto.genuino) console.info('[giudice] bocciato', { motivo: verdetto.motivo, codice: contesto.codice });
  return verdetto;
}
