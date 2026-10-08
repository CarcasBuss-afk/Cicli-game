/* Gare: elenco, creazione, via, chiusura. */
import { elencoSessioni } from '@/lib/giro/docenteService';
import { handlerDocente } from '@/lib/giro/docenteHandler';
import { ApiError } from '@/lib/giro/http';
import { avviaSessione, chiudiSessione, creaSessione } from '@/lib/giro/sessioni';

export const dynamic = 'force-dynamic';

function idSessione(body: Record<string, unknown>): string {
  const id = typeof body.sessionId === 'string' ? body.sessionId : '';
  if (!id) throw new ApiError(400, 'INVALID_BODY', 'Manca la gara');
  return id;
}

export const POST = handlerDocente(async (body) => {
  const azione = typeof body.azione === 'string' ? body.azione : 'elenco';

  if (azione === 'elenco') return { sessioni: await elencoSessioni() };

  if (azione === 'crea') {
    const creata = await creaSessione(body.classLabel, body.numTappe);
    return { ...creata, sessioni: await elencoSessioni() };
  }

  if (azione === 'avvia') {
    await avviaSessione(idSessione(body));
    return { ok: true, sessioni: await elencoSessioni() };
  }

  if (azione === 'chiudi') {
    await chiudiSessione(idSessione(body));
    return { ok: true, sessioni: await elencoSessioni() };
  }

  throw new ApiError(400, 'INVALID_BODY', `Azione non riconosciuta: ${azione}`);
});
