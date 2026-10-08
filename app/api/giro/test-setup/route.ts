/* SOLO PER I TEST. Attiva unicamente quando è impostato FIRESTORE_EMULATOR_HOST, cioè
 * quando il server parla con l'emulatore: in produzione risponde 404.
 *
 * Serve ai test delle API per preparare una gara (creare, dare il via, chiudere) e per
 * rileggere lo stato, senza passare dalla pagina docente, che arriva nel Task 6.
 * Restituisce anche le soluzioni delle tappe: per questo non deve esistere in produzione.
 */
import { ApiError, handler } from '@/lib/giro/http';
import { avviaSessione, chiudiSessione, creaSessione } from '@/lib/giro/sessioni';
import { allieviRef, sessioniRef, type AllievoDoc, type SessioneDoc } from '@/lib/giro/store';

export const dynamic = 'force-dynamic';

function soloConEmulatore(): void {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new ApiError(404, 'NOT_FOUND', 'Rotta non disponibile');
  }
}

function sessionId(body: Record<string, unknown>): string {
  const id = typeof body.sessionId === 'string' ? body.sessionId : '';
  if (!id) throw new ApiError(400, 'INVALID_BODY', 'Manca sessionId');
  return id;
}

export const POST = handler(async (body) => {
  soloConEmulatore();
  const azione = typeof body.azione === 'string' ? body.azione : '';

  if (azione === 'crea') {
    const creata = await creaSessione(body.classLabel ?? '3B', body.numTappe ?? 6);
    const snap = await sessioniRef().doc(creata.id).get();
    const sessione = snap.data() as SessioneDoc;
    if (body.avvia === true) await avviaSessione(creata.id);
    // Le soluzioni servono ai test per consegnare le risposte giuste.
    return { ...creata, sessionId: creata.id, tappe: sessione.tappe };
  }

  if (azione === 'avvia') {
    await avviaSessione(sessionId(body));
    return { ok: true };
  }

  if (azione === 'chiudi') {
    await chiudiSessione(sessionId(body));
    return { ok: true };
  }

  if (azione === 'leggi') {
    const id = sessionId(body);
    const [sessione, allievi] = await Promise.all([
      sessioniRef().doc(id).get(),
      allieviRef(id).get(),
    ]);
    if (!sessione.exists) throw new ApiError(404, 'SESSION_NOT_FOUND', 'Sessione inesistente');
    const dati = sessione.data() as SessioneDoc;
    return {
      sessione: { status: dati.status, numTappe: dati.numTappe, arrivati: dati.arrivati, code: dati.code },
      allievi: allievi.docs.map((d) => {
        const a = d.data() as AllievoDoc;
        return {
          id: d.id,
          name: a.name,
          tappaCorrente: a.tappaCorrente,
          erroriTotali: a.erroriTotali,
          ordineArrivo: a.ordineArrivo,
          arrivato: Boolean(a.finishedAt),
          tappe: Object.fromEntries(
            Object.entries(a.tappe ?? {}).map(([k, v]) => [k, { errori: v.errori ?? 0, completata: Boolean(v.completedAt) }]),
          ),
        };
      }),
    };
  }

  if (azione === 'svuota') {
    // Pulizia fra i test: cancella le sessioni create, con i loro allievi.
    const sessioni = await sessioniRef().get();
    for (const s of sessioni.docs) {
      const allievi = await s.ref.collection('players').get();
      await Promise.all(allievi.docs.map((d) => d.ref.delete()));
      await s.ref.delete();
    }
    return { ok: true, cancellate: sessioni.size };
  }

  throw new ApiError(400, 'INVALID_BODY', `Azione non riconosciuta: ${azione}`);
});
