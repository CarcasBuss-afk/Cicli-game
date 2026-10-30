/* La chiamata al modello per il Giudice. Sonnet (`GIUDICE_MODEL`): nell'Officina di
 * Tecnologie Web Haiku lasciava passare le frodi facili e Sonnet no, senza bocciare mai le
 * soluzioni di riferimento (PERCORSO.md §23). Una lettura di dieci righe con i fatti già
 * misurati, senza ragionamento esteso. Stessa chiave del tutor.
 *
 * Se il modello non risponde, o risponde una cosa che non si capisce, la consegna
 * **passa**: un'ora di laboratorio non si ferma per un disservizio dell'API, e nei log
 * resta traccia. Senza chiave (sviluppo) o con `GREGARIO_FINTO` (test) giudica il finto.
 */
import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { giudizioFinto, interpretaVerdetto, messaggioGiudizio, PROMPT_GIUDICE, type ContestoGiudizio, type Verdetto } from './giudice';

export const MODELLO_GIUDICE = process.env.GIUDICE_MODEL || 'claude-sonnet-5-5';

let client: Anthropic | null = null;

function anthropic(): Anthropic {
  // Timeout corto: il giudice sta sulla strada di ogni chilometro promosso.
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 15_000, maxRetries: 1 });
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
      // Niente ragionamento esteso: i fatti sono già misurati, la lettura è breve.
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
    return { genuino: true, guasto: true };
  }
  const verdetto = interpretaVerdetto(testo);
  if (!verdetto) {
    console.warn('[giudice] verdetto incomprensibile, consegna promossa', { testo });
    return { genuino: true, guasto: true };
  }
  if (!verdetto.genuino) console.info('[giudice] bocciato', { motivo: verdetto.motivo, codice: contesto.codice });
  return verdetto;
}
