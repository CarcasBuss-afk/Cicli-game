/* Tappe di un Giro: apertura (con la durata scelta dal docente), chiusura anche prima
 * del tempo, aggiunta e cancellazione, quante tappe migliori contano nella generale. */
import { idSessione } from '@/lib/giro/docenteService';
import { handlerDocente } from '@/lib/giro/docenteHandler';
import { ApiError } from '@/lib/giro/http';
import { aggiungiTappa, apriTappa, chiudiTappa, eliminaTappa, impostaMigliori } from '@/lib/giro/sessioni';

export const dynamic = 'force-dynamic';

export const POST = handlerDocente(async (body) => {
  const azione = typeof body.azione === 'string' ? body.azione : '';
  const sessionId = idSessione(body);

  if (azione === 'apri') await apriTappa(sessionId, body.tappa, body.minuti);
  else if (azione === 'chiudi') await chiudiTappa(sessionId, body.tappa);
  else if (azione === 'aggiungi') await aggiungiTappa(sessionId, body.tema);
  else if (azione === 'elimina') await eliminaTappa(sessionId, body.tappa);
  else if (azione === 'migliori') await impostaMigliori(sessionId, body.migliori);
  else throw new ApiError(400, 'INVALID_BODY', `Azione non riconosciuta: ${azione}`);

  return { ok: true };
});
