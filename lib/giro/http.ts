/* Strato HTTP comune alle route /api/giro/*: body JSON, risposte JSON, errori uniformi
 * { error, message } con messaggio in italiano da mostrare all'allievo.
 *
 * A differenza dell'escape room le pagine degli allievi sono servite dalla stessa app
 * (niente file://, niente CORS, niente trucchi sul Content-Type).
 */
import 'server-only';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function leggiBody(request: Request): Promise<Record<string, unknown>> {
  let testo: string;
  try {
    testo = await request.text();
  } catch {
    throw new ApiError(400, 'INVALID_BODY', 'Richiesta illeggibile');
  }
  if (!testo.trim()) throw new ApiError(400, 'INVALID_BODY', 'Richiesta vuota');
  let dati: unknown;
  try {
    dati = JSON.parse(testo);
  } catch {
    throw new ApiError(400, 'INVALID_BODY', 'La richiesta non è JSON valido');
  }
  if (!dati || typeof dati !== 'object' || Array.isArray(dati)) {
    throw new ApiError(400, 'INVALID_BODY', 'La richiesta deve essere un oggetto JSON');
  }
  return dati as Record<string, unknown>;
}

export type Azione = (body: Record<string, unknown>) => Promise<unknown>;

/** Avvolge un'azione: lettura del body, risposta JSON, errori uniformi. */
export function handler(azione: Azione): (request: Request) => Promise<Response> {
  return async (request) => {
    try {
      const body = await leggiBody(request);
      return json(await azione(body));
    } catch (e) {
      if (e instanceof ApiError) return json({ error: e.code, message: e.message }, e.status);
      console.error('[api/giro] errore inatteso', e);
      return json({ error: 'INTERNAL', message: 'Errore interno del server: chiama il prof' }, 500);
    }
  };
}
