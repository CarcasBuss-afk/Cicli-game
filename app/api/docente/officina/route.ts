/* Le azioni del docente nell'Officina: classi e allievi. Il resto è monitoraggio (onSnapshot). */
import { handlerDocente } from '@/lib/giro/docenteHandler';
import { ApiError } from '@/lib/giro/http';
import { chiudiClasse, creaClasse, rimuoviAllievo } from '@/lib/officina/docenteService';

export const dynamic = 'force-dynamic';

export const POST = handlerDocente(async (body, docente) => {
  const azione = typeof body.azione === 'string' ? body.azione : '';
  switch (azione) {
    case 'creaClasse':
      return creaClasse(body, docente);
    case 'chiudiClasse':
      return chiudiClasse(body);
    case 'rimuoviAllievo':
      return rimuoviAllievo(body);
    default:
      throw new ApiError(400, 'INVALID_BODY', `Azione non riconosciuta: ${azione}`);
  }
});
