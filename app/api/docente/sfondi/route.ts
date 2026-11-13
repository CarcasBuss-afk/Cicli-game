/* Gli sfondi delle feste, per il docente: elenco, carica, accendi o spegni, elimina. */
import { handlerDocente } from '@/lib/giro/docenteHandler';
import { ApiError } from '@/lib/giro/http';
import { accendiSfondo, caricaSfondo, elencoSfondi, eliminaSfondo } from '@/lib/sfondi/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = handlerDocente(async (body) => {
  const azione = typeof body.azione === 'string' ? body.azione : 'elenco';
  switch (azione) {
    case 'elenco':
      return elencoSfondi();
    case 'carica':
      return caricaSfondo(body);
    case 'accendi':
      return accendiSfondo(body);
    case 'elimina':
      return eliminaSfondo(body);
    default:
      throw new ApiError(400, 'INVALID_BODY', `Azione non riconosciuta: ${azione}`);
  }
});
