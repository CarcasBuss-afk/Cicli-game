/* Le API dell'allievo nell'Officina, una rotta sola con l'azione nel body (tabella in CLAUDE.md). */
import { ApiError } from '@/lib/giro/http';
import { handlerAllievo, type AzioneAllievo } from '@/lib/officina/auth';
import { classi, compiti, compito, consegna, entra, io, tutor } from '@/lib/officina/service';

export const dynamic = 'force-dynamic';

const AZIONI: Record<string, AzioneAllievo> = { io, classi, entra, compiti, compito, consegna, tutor };

export const POST = handlerAllievo(async (body, utente) => {
  const azione = typeof body.azione === 'string' ? body.azione : '';
  const f = AZIONI[azione];
  if (!f) throw new ApiError(400, 'INVALID_BODY', `Azione non riconosciuta: ${azione}`);
  return f(body, utente);
});
