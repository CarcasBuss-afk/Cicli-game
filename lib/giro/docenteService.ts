/* Azioni del docente: elenco dei Giri e correzioni sui singoli allievi (nome sbagliato,
 * iscritto per errore, chilometri da rifare). Apertura e chiusura delle tappe stanno in
 * sessioni.ts. */
import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebaseAdmin';
import { ApiError } from './http';
import { chiaveNome, normalizzaNome, validaNome } from './nomi';
import { indiceTappa, ricalcola } from './sessioni';
import { allieviRef, sessioniRef, type AllievoDoc, type SessioneDoc } from './store';

export type SessioneElenco = {
  id: string;
  code: string;
  classLabel: string;
  status: SessioneDoc['status'];
  /** true per la gara singola (una tappa mista sola). */
  singola: boolean;
  /** Creata prima del Giro a tappe: la lista degli esercizi stava al posto delle tappe. */
  vecchia: boolean;
  numTappe: number;
  tappeCorse: number;
  createdAt: string | null;
  allievi: number;
};

const iso = (t: { toDate(): Date } | null | undefined) => (t ? t.toDate().toISOString() : null);

/** Elenco dei Giri, dal più recente. Quelli in corso stanno in cima. */
export async function elencoSessioni(limite = 30): Promise<SessioneElenco[]> {
  const snap = await sessioniRef().orderBy('createdAt', 'desc').limit(limite).get();
  const sessioni = await Promise.all(
    snap.docs.map(async (d) => {
      const s = d.data() as SessioneDoc;
      // `count()` non scarica i documenti: all'elenco serve solo quanti sono.
      const quanti = await allieviRef(d.id).count().get();
      const tappe = s.tappe ?? [];
      return {
        id: d.id,
        code: s.code,
        classLabel: s.classLabel,
        status: s.status,
        singola: tappe.length === 1 && tappe[0]?.tema === 'misto',
        vecchia: tappe.some((t) => !t.tema),
        numTappe: tappe.length,
        tappeCorse: tappe.filter((t) => t.stato === 'chiusa').length,
        createdAt: iso(s.createdAt),
        allievi: quanti.data().count,
      } satisfies SessioneElenco;
    }),
  );
  const peso = { running: 0, waiting: 1, closed: 2 };
  return sessioni.sort((a, b) => peso[a.status] - peso[b.status]);
}

export function idSessione(body: Record<string, unknown>): string {
  const id = typeof body.sessionId === 'string' ? body.sessionId : '';
  if (!id) throw new ApiError(400, 'INVALID_BODY', 'Manca la gara');
  return id;
}

/** Riferimenti a gara e allievo, con il controllo che esistano davvero. */
async function trovaAllievo(body: Record<string, unknown>) {
  const sessionId = idSessione(body);
  const playerId = typeof body.playerId === 'string' ? body.playerId : '';
  if (!playerId) throw new ApiError(400, 'INVALID_BODY', "Manca l'allievo");
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
  // Il nome compare anche nella classifica generale fotografata sulla gara.
  await ricalcola(sessionId, null);
  return { ok: true, name };
}

/** Elimina un allievo iscritto per errore. */
export async function eliminaAllievo(body: Record<string, unknown>): Promise<{ ok: true }> {
  const { sessionId, ref } = await trovaAllievo(body);
  await ref.delete();
  await ricalcola(sessionId, null);
  return { ok: true };
}

/**
 * Rimanda un allievo al chilometro N di una tappa: azzera quello e i successivi. Serve
 * quando un chilometro è passato per sbaglio o il docente vuole farlo rifare. Se la tappa
 * è già chiusa, posizioni e punti di quella tappa vengono ricalcolati.
 */
export async function rimandaAlKm(body: Record<string, unknown>): Promise<{ ok: true; km: number }> {
  const { sessionId, ref } = await trovaAllievo(body);
  const sessione = (await sessioniRef().doc(sessionId).get()).data() as SessioneDoc | undefined;
  if (!sessione) throw new ApiError(404, 'SESSION_NOT_FOUND', 'Gara inesistente');
  const t = indiceTappa(body.tappa, sessione);
  const totale = sessione.tappe[t].km;
  const k = typeof body.km === 'number' ? body.km : Number.NaN;
  if (!Number.isInteger(k) || k < 0 || k >= totale) {
    throw new ApiError(400, 'INVALID_KM', `Chilometro non valido (da 1 a ${totale})`);
  }

  await getDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const allievo = snap.data() as AllievoDoc | undefined;
    if (!allievo) throw new ApiError(404, 'PLAYER_NOT_FOUND', 'Allievo inesistente');
    const progresso = allievo.tappe?.[String(t)];
    if (!progresso || (progresso.km ?? 0) <= k) return;

    const base = `tappe.${t}`;
    const aggiornamenti: Record<string, unknown> = {
      [`${base}.km`]: k,
      // Chi torna indietro non è più "arrivato": il contatore degli arrivi però non si
      // decrementa, altrimenti chi ritaglia prenderebbe un posto già assegnato.
      [`${base}.ordineArrivo`]: FieldValue.delete(),
    };
    for (const indice of Object.keys(progresso.kmAt ?? {})) {
      if (Number(indice) >= k) aggiornamenti[`${base}.kmAt.${indice}`] = FieldValue.delete();
    }
    // L'ultimo chilometro valido diventa quello prima del punto di ritorno.
    const precedente = k > 0 ? progresso.kmAt?.[String(k - 1)] : undefined;
    aggiornamenti[`${base}.ultimoAt`] = precedente ?? null;
    tx.update(ref, aggiornamenti);
  });

  await ricalcola(sessionId, t);
  return { ok: true, km: k };
}
