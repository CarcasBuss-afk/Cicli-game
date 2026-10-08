/* Giri: elenco, creazione (Giro a tappe o gara singola), chiusura del Giro. */
import { elencoSessioni, idSessione } from '@/lib/giro/docenteService';
import { handlerDocente } from '@/lib/giro/docenteHandler';
import { ApiError } from '@/lib/giro/http';
import { chiudiGiro, creaGiro } from '@/lib/giro/sessioni';

export const dynamic = 'force-dynamic';

export const POST = handlerDocente(async (body) => {
  const azione = typeof body.azione === 'string' ? body.azione : 'elenco';

  if (azione === 'elenco') return { sessioni: await elencoSessioni() };

  if (azione === 'crea') {
    const creata = await creaGiro(
      body.classLabel,
      body.tipo === 'singola'
        ? { tipo: 'singola', km: body.km }
        : { tipo: 'giro', temi: body.temi, migliori: body.migliori },
    );
    return { ...creata, sessioni: await elencoSessioni() };
  }

  if (azione === 'chiudi') {
    await chiudiGiro(idSessione(body));
    return { ok: true, sessioni: await elencoSessioni() };
  }

  throw new ApiError(400, 'INVALID_BODY', `Azione non riconosciuta: ${azione}`);
});
