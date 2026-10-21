/* Le API dell'allievo nell'Officina, una rotta sola con l'azione nel body (tabella in CLAUDE.md). */
import { ApiError } from '@/lib/giro/http';
import { handlerAllievo } from '@/lib/officina/auth';
import { compiti, compito, consegna, entra, io, tutor } from '@/lib/officina/service';

export const dynamic = 'force-dynamic';

const AZIONI = { io, entra, compiti, compito, consegna, tutor } as const;

export const POST = handlerAllievo(async (body, utente) => {
  const azione = typeof body.azione === 'string' ? body.azione : '';
  const f = (AZIONI as Record<string, (typeof AZIONI)[keyof typeof AZIONI]>)[azione];
  if (!f) throw new ApiError(400, 'INVALID_BODY', `Azione non riconosciuta: ${azione}`);
  return f(body, utente);
});
