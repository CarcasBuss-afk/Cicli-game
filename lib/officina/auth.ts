/* Autenticazione dell'allievo nell'Officina: l'account Google della scuola. L'ID token
 * Firebase arriva nell'intestazione Authorization e lo verifica l'Admin SDK; l'email deve
 * essere verificata e del dominio della scuola (OFFICINA_DOMINIO; vuoto = qualunque).
 *
 * È l'unico posto del progetto in cui si conservano uid ed email degli allievi: decisione
 * presa apposta per l'Officina (PERCORSO.md §12), non vale per il Giro. */
import 'server-only';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/lib/firebaseAdmin';
import { ApiError } from '@/lib/giro/http';
import { dominiAmmessi, emailAmmessa } from './regole';

export type Utente = { uid: string; email: string; nome: string };

export async function verificaAllievo(request: Request): Promise<Utente> {
  const intestazione = request.headers.get('authorization') ?? '';
  const token = intestazione.startsWith('Bearer ') ? intestazione.slice(7).trim() : '';
  if (!token) throw new ApiError(401, 'UNAUTHENTICATED', 'Accedi con il tuo account della scuola');

  let decoded;
  try {
    decoded = await getAuth(getAdminApp()).verifyIdToken(token);
  } catch {
    throw new ApiError(401, 'INVALID_TOKEN', 'Sessione scaduta: accedi di nuovo');
  }

  const email = (decoded.email ?? '').toLowerCase();
  if (!email || !decoded.email_verified) throw new ApiError(403, 'FORBIDDEN', 'Account senza email verificata');
  const domini = dominiAmmessi(process.env.OFFICINA_DOMINIO);
  if (!emailAmmessa(email, domini)) {
    throw new ApiError(403, 'DOMINIO_NON_AMMESSO', `Entra con l'account della scuola (@${domini.join(' o @')}), non con ${email}`);
  }
  const nome = (typeof decoded.name === 'string' && decoded.name.trim()) || email.split('@')[0];
  return { uid: decoded.uid, email, nome };
}

export type AzioneAllievo = (body: Record<string, unknown>, utente: Utente) => Promise<unknown>;

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

/** Wrapper delle route /api/officina/*: allievo verificato, body JSON, errori uniformi. */
export function handlerAllievo(azione: AzioneAllievo): (request: Request) => Promise<Response> {
  return async (request) => {
    try {
      const utente = await verificaAllievo(request);
      let body: Record<string, unknown> = {};
      const testo = await request.text();
      if (testo.trim()) {
        let dati: unknown;
        try {
          dati = JSON.parse(testo);
        } catch {
          throw new ApiError(400, 'INVALID_BODY', 'La richiesta non è JSON valido');
        }
        if (!dati || typeof dati !== 'object' || Array.isArray(dati)) throw new ApiError(400, 'INVALID_BODY', 'Corpo non valido');
        body = dati as Record<string, unknown>;
      }
      return json(await azione(body, utente));
    } catch (e) {
      if (e instanceof ApiError) return json({ error: e.code, message: e.message }, e.status);
      console.error('[api/officina] errore inatteso', e);
      return json({ error: 'INTERNAL', message: 'Errore interno del server: chiama il prof' }, 500);
    }
  };
}
