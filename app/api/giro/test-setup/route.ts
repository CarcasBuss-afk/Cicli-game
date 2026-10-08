/* SOLO PER I TEST. Attiva unicamente quando è impostato FIRESTORE_EMULATOR_HOST, cioè
 * quando il server parla con l'emulatore: in produzione risponde 404.
 *
 * Serve ai test per preparare un Giro (crearlo, aprire e chiudere tappe, far scadere il
 * tempo) e per rileggere lo stato senza passare dalla pagina docente.
 * Restituisce anche le soluzioni degli esercizi: per questo non deve esistere in produzione.
 */
import { Timestamp } from 'firebase-admin/firestore';
import { ApiError, handler } from '@/lib/giro/http';
import { apriTappa, chiudiGiro, chiudiTappa, creaGiro, eliminaTappa } from '@/lib/giro/sessioni';
import { allieviRef, sessioniRef, type AllievoDoc, type SessioneDoc } from '@/lib/giro/store';

export const dynamic = 'force-dynamic';

function soloConEmulatore(): void {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new ApiError(404, 'NOT_FOUND', 'Rotta non disponibile');
}

function sessionId(body: Record<string, unknown>): string {
  const id = typeof body.sessionId === 'string' ? body.sessionId : '';
  if (!id) throw new ApiError(400, 'INVALID_BODY', 'Manca sessionId');
  return id;
}

async function leggiSessione(id: string): Promise<SessioneDoc> {
  const snap = await sessioniRef().doc(id).get();
  if (!snap.exists) throw new ApiError(404, 'SESSION_NOT_FOUND', 'Gara inesistente');
  return snap.data() as SessioneDoc;
}

/** Gli esercizi della tappa, con le soluzioni: servono ai test per consegnare giusto. */
async function eserciziDi(id: string, tappa: number) {
  const s = await leggiSessione(id);
  return s.tappe[tappa]?.esercizi ?? [];
}

export const POST = handler(async (body) => {
  soloConEmulatore();
  const azione = typeof body.azione === 'string' ? body.azione : '';

  if (azione === 'crea') {
    // Di default una gara singola da 6 esercizi, come i test di prima del Giro.
    const creata = await creaGiro(
      body.classLabel ?? '3B',
      body.tipo === 'giro'
        ? { tipo: 'giro', temi: body.temi, migliori: body.migliori }
        : { tipo: 'singola', km: body.km ?? 6 },
    );
    if (body.apri === true) await apriTappa(creata.id, 0, body.minuti);
    return {
      ...creata,
      sessionId: creata.id,
      esercizi: body.apri === true ? await eserciziDi(creata.id, 0) : [],
    };
  }

  if (azione === 'creaVecchia') {
    // Una gara nel formato di prima del Giro a tappe (gli esercizi al posto delle tappe),
    // come quelle rimaste nel database vero: serve a provare che le pagine non si rompono.
    const ref = sessioniRef().doc();
    await ref.set({
      code: 'VECC',
      classLabel: '1Z',
      status: 'running',
      createdAt: Timestamp.now(),
      startedAt: Timestamp.now(),
      endedAt: null,
      numTappe: 1,
      tappe: [{ tipo: 'ripeti-n', consegna: 'Stampa 3 volte Ciao', outputAtteso: ['Ciao', 'Ciao', 'Ciao'] }],
      arrivati: 0,
      prossimoNumero: 1,
    });
    return { sessionId: ref.id };
  }

  if (azione === 'apri') {
    const id = sessionId(body);
    const tappa = typeof body.tappa === 'number' ? body.tappa : 0;
    await apriTappa(id, tappa, body.minuti);
    return { ok: true, esercizi: await eserciziDi(id, tappa) };
  }

  if (azione === 'chiudiTappa') {
    await chiudiTappa(sessionId(body), typeof body.tappa === 'number' ? body.tappa : 0);
    return { ok: true };
  }

  if (azione === 'eliminaTappa') {
    await eliminaTappa(sessionId(body), body.tappa);
    return { ok: true };
  }

  if (azione === 'chiudi') {
    await chiudiGiro(sessionId(body));
    return { ok: true };
  }

  if (azione === 'scadi') {
    // Fa scadere il tempo della tappa aperta, senza aspettare dieci minuti veri.
    const id = sessionId(body);
    const s = await leggiSessione(id);
    if (s.tappaAperta === null) throw new ApiError(409, 'NESSUNA_TAPPA', 'Nessuna tappa aperta');
    const tappe = [...s.tappe];
    tappe[s.tappaAperta] = { ...tappe[s.tappaAperta], scadenzaAt: Timestamp.fromMillis(Date.now() - 1000) };
    await sessioniRef().doc(id).update({ tappe });
    return { ok: true };
  }

  if (azione === 'leggi') {
    const id = sessionId(body);
    const [dati, allievi] = await Promise.all([leggiSessione(id), allieviRef(id).get()]);
    return {
      sessione: {
        status: dati.status,
        code: dati.code,
        tappaAperta: dati.tappaAperta,
        migliori: dati.migliori,
        tappe: dati.tappe.map((t) => ({ tema: t.tema, stato: t.stato, km: t.km, durataSec: t.durataSec })),
        generale: dati.generale,
      },
      allievi: allievi.docs.map((d) => {
        const a = d.data() as AllievoDoc;
        return {
          id: d.id,
          name: a.name,
          numero: a.numero,
          erroriTotali: a.erroriTotali,
          tappe: Object.fromEntries(
            Object.entries(a.tappe ?? {}).map(([k, p]) => [
              k,
              {
                km: p.km ?? 0,
                errori: p.errori ?? 0,
                ordineArrivo: p.ordineArrivo ?? null,
                posizione: p.posizione ?? null,
                punti: p.punti ?? null,
              },
            ]),
          ),
        };
      }),
    };
  }

  if (azione === 'svuota') {
    // Pulizia fra i test: cancella i Giri creati, con i loro allievi.
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
