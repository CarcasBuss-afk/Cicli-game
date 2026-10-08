/* Wrapper delle route /api/docente/*: stessa origine (niente CORS), body JSON facoltativo,
 * docente verificato prima di ogni azione, errori uniformi { error, message }. */
import 'server-only';
import { verificaDocente, type Docente } from './docenteAuth';
import { ApiError } from './http';

export type AzioneDocente = (body: Record<string, unknown>, docente: Docente) => Promise<unknown>;

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export function handlerDocente(azione: AzioneDocente): (request: Request) => Promise<Response> {
  return async (request) => {
    try {
      const docente = await verificaDocente(request);
      let body: Record<string, unknown> = {};
      const testo = await request.text();
      if (testo.trim()) {
        let dati: unknown;
        try {
          dati = JSON.parse(testo);
        } catch {
          throw new ApiError(400, 'INVALID_BODY', 'Il corpo della richiesta non è JSON valido');
        }
        if (!dati || typeof dati !== 'object' || Array.isArray(dati)) {
          throw new ApiError(400, 'INVALID_BODY', 'Corpo non valido');
        }
        body = dati as Record<string, unknown>;
      }
      return json(await azione(body, docente));
    } catch (e) {
      if (e instanceof ApiError) return json({ error: e.code, message: e.message }, e.status);
      console.error('[api/docente] errore inatteso', e);
      return json({ error: 'INTERNAL', message: 'Errore interno del server' }, 500);
    }
  };
}
