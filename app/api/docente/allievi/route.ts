/* Correzioni sui singoli allievi: nome sbagliato, iscritto per errore, tappa da rifare. */
import { azzeraTappa, correggiNome, eliminaAllievo } from '@/lib/giro/docenteService';
import { handlerDocente } from '@/lib/giro/docenteHandler';
import { ApiError } from '@/lib/giro/http';

export const dynamic = 'force-dynamic';

export const POST = handlerDocente(async (body) => {
  const azione = typeof body.azione === 'string' ? body.azione : '';
  if (azione === 'rinomina') return correggiNome(body);
  if (azione === 'elimina') return eliminaAllievo(body);
  if (azione === 'azzera') return azzeraTappa(body);
  throw new ApiError(400, 'INVALID_BODY', `Azione non riconosciuta: ${azione}`);
});
