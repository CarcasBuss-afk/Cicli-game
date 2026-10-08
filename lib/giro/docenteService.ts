/* Azioni del docente sulle gare: elenco, creazione, via, chiusura, e le correzioni sui
 * singoli allievi (nome sbagliato, iscritto per errore, tappa da azzerare). */
import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebaseAdmin';
import { ApiError } from './http';
import { chiaveNome, normalizzaNome, validaNome } from './nomi';
import { allieviRef, sessioniRef, type AllievoDoc, type SessioneDoc } from './store';

export type SessioneElenco = {
  id: string;
  code: string;
  classLabel: string;
  status: SessioneDoc['status'];
  numTappe: number;
  createdAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  allievi: number;
  arrivati: number;
};

const iso = (t: { toDate(): Date } | null | undefined) => (t ? t.toDate().toISOString() : null);

/** Elenco delle gare, dalla più recente. Le attive stanno in cima. */
export async function elencoSessioni(limite = 30): Promise<SessioneElenco[]> {
  const snap = await sessioniRef().orderBy('createdAt', 'desc').limit(limite).get();
  const sessioni = await Promise.all(
    snap.docs.map(async (d) => {
      const s = d.data() as SessioneDoc;
      // `count()` non scarica i documenti: all'elenco serve solo quanti sono.
      const quanti = await allieviRef(d.id).count().get();
      return {
        id: d.id,
        code: s.code,
        classLabel: s.classLabel,
        status: s.status,
        numTappe: s.numTappe,
        createdAt: iso(s.createdAt),
        startedAt: iso(s.startedAt),
        endedAt: iso(s.endedAt),
        allievi: quanti.data().count,
        arrivati: s.arrivati ?? 0,
      } satisfies SessioneElenco;
    }),
  );
  const peso = { running: 0, waiting: 1, closed: 2 };
  return sessioni.sort((a, b) => peso[a.status] - peso[b.status]);
}

function idSessione(body: Record<string, unknown>): string {
  const id = typeof body.sessionId === 'string' ? body.sessionId : '';
  if (!id) throw new ApiError(400, 'INVALID_BODY', 'Manca la gara');
  return id;
}

/** Riferimenti a gara e allievo, con il controllo che esistano davvero. */
async function trovaAllievo(body: Record<string, unknown>) {
  const sessionId = idSessione(body);
  const playerId = typeof body.playerId === 'string' ? body.playerId : '';
  if (!playerId) throw new ApiError(400, 'INVALID_BODY', 'Manca l\'allievo');
  const ref = allieviRef(sessionId).doc(playerId);
  const snap = await ref.get();
  if (!snap.exists) throw new ApiError(404, 'PLAYER_NOT_FOUND', 'Allievo inesistente');
  return { sessionId, ref, allievo: snap.data() as AllievoDoc };
}

/** Corregge il nome di un allievo (sbagliato in fretta all'ingresso). */
export async function correggiNome(body: Record<string, unknown>): Promise<{ ok: true; name: string }> {
  const { sessionId, ref } = await trovaAllievo(body);
  const name = normalizzaNome(body.name);
  const problema = validaNome(name);
  if (problema) throw new ApiError(400, 'INVALID_NAME', `Nome non valido: ${problema}`);
  const nameKey = chiaveNome(name);

  await getDb().runTransaction(async (tx) => {
    const doppioni = await tx.get(allieviRef(sessionId).where('nameKey', '==', nameKey).limit(2));
    if (doppioni.docs.some((d) => d.id !== ref.id)) {
      throw new ApiError(409, 'DUPLICATE_PLAYER', `C'è già un «${name}» in questa gara`);
    }
    tx.update(ref, { name, nameKey });
  });
  return { ok: true, name };
}

/** Elimina un allievo iscritto per errore. */
export async function eliminaAllievo(body: Record<string, unknown>): Promise<{ ok: true }> {
  const { ref } = await trovaAllievo(body);
  await ref.delete();
  return { ok: true };
}

/**
 * Riporta un allievo alla tappa n: azzera quella e tutte le successive, e lo rimette in
 * corsa se era già arrivato. Serve quando una tappa è stata superata per sbaglio o il
 * docente vuole far rifare un pezzo di percorso.
 */
export async function azzeraTappa(body: Record<string, unknown>): Promise<{ ok: true; tappaCorrente: number }> {
  const { sessionId, ref } = await trovaAllievo(body);
  const sessione = (await sessioniRef().doc(sessionId).get()).data() as SessioneDoc | undefined;
  if (!sessione) throw new ApiError(404, 'SESSION_NOT_FOUND', 'Gara inesistente');

  const n = typeof body.tappa === 'number' ? body.tappa : Number.NaN;
  if (!Number.isInteger(n) || n < 0 || n >= sessione.numTappe) {
    throw new ApiError(400, 'INVALID_TAPPA', `Esercizio non valida (da 1 a ${sessione.numTappe})`);
  }

  await getDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const allievo = snap.data() as AllievoDoc | undefined;
    if (!allievo) throw new ApiError(404, 'PLAYER_NOT_FOUND', 'Allievo inesistente');

    const aggiornamenti: Record<string, unknown> = {
      tappaCorrente: Math.min(n, allievo.tappaCorrente),
      finishedAt: null,
      ordineArrivo: null,
    };
    for (const indice of Object.keys(allievo.tappe ?? {})) {
      if (Number(indice) >= n) aggiornamenti[`tappe.${indice}`] = FieldValue.delete();
    }
    tx.update(ref, aggiornamenti);
    // Il contatore `arrivati` NON si decrementa: conta gli arrivi registrati, non gli
    // allievi attualmente al traguardo. Decrementandolo, chi riparte e ritaglia
    // prenderebbe una posizione già assegnata a un altro. Alla LIM la posizione mostrata
    // è comunque il posto in classifica, non questo numero.
  });

  return { ok: true, tappaCorrente: n };
}
