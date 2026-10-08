/* Logica delle API /api/giro/*: join, status, submit (tabella in CLAUDE.md).
 *
 * La validazione sta tutta qui, sul server: il client riceve solo la tappa corrente e,
 * quando sbaglia, l'hint. Output atteso, soluzioni e tappe future non escono mai.
 */
import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebaseAdmin';
import { valutaRisposta } from './hint';
import { ApiError } from './http';
import { chiaveNome, normalizzaNome, validaNome } from './nomi';
import { richiestaAmmessa } from './rateLimit';
import {
  allieviRef,
  caricaContesto,
  componiPlayerId,
  trovaSessioneAttiva,
  type AllievoDoc,
  type Contesto,
} from './store';
import { tappaPerAllievo, type Tappa } from './tappe';
import { generaToken, hashToken } from './token';

function limita(chiave: string): void {
  if (!richiestaAmmessa(chiave)) {
    throw new ApiError(429, 'RATE_LIMITED', 'Troppe richieste: aspetta un momento e riprova');
  }
}

const chiaveAllievo = (body: Record<string, unknown>) =>
  `player:${typeof body.playerId === 'string' ? body.playerId : '?'}`;

function verificaInCorso(ctx: Contesto): void {
  if (ctx.sessione.status === 'running') return;
  throw new ApiError(
    403,
    'SESSION_NOT_RUNNING',
    ctx.sessione.status === 'waiting' ? 'La gara non è ancora partita: aspetta il via del prof' : 'La gara è chiusa',
  );
}

const arrivato = (allievo: AllievoDoc, numTappe: number) => allievo.tappaCorrente >= numTappe;

/** La tappa da fare adesso, già ripulita di soluzione e output segreto. */
function tappaCorrentePubblica(ctx: Contesto) {
  if (ctx.sessione.status !== 'running' || arrivato(ctx.allievo, ctx.sessione.numTappe)) return null;
  const tappa = ctx.sessione.tappe[ctx.allievo.tappaCorrente] as Tappa | undefined;
  return tappa ? tappaPerAllievo(tappa) : null;
}

/* ------------------------------------------------------------------------- join */

export async function join(body: Record<string, unknown>) {
  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  if (!code) throw new ApiError(400, 'INVALID_BODY', 'Manca il codice della gara');
  limita(`join:${code}`);

  const name = normalizzaNome(body.name);
  const problema = validaNome(name);
  if (problema) throw new ApiError(400, 'INVALID_NAME', `Nome non valido: ${problema}`);

  const sessione = await trovaSessioneAttiva(code);
  if (!sessione) {
    throw new ApiError(404, 'SESSION_NOT_FOUND', 'Codice inesistente o gara chiusa: controlla il codice alla LIM');
  }

  const nameKey = chiaveNome(name);
  const token = generaToken();
  const ref = allieviRef(sessione.id).doc();

  await getDb().runTransaction(async (tx) => {
    const doppioni = await tx.get(allieviRef(sessione.id).where('nameKey', '==', nameKey).limit(1));
    if (!doppioni.empty) {
      throw new ApiError(
        409,
        'DUPLICATE_PLAYER',
        `C'è già un «${name}» in gara: aggiungi l'iniziale del cognome, per esempio «${name} B.»`,
      );
    }
    tx.set(ref, {
      name,
      nameKey,
      tokenHash: hashToken(token),
      createdAt: FieldValue.serverTimestamp(),
      tappaCorrente: 0,
      tappe: {},
      erroriTotali: 0,
      finishedAt: null,
      ordineArrivo: null,
    } satisfies Omit<AllievoDoc, 'createdAt'> & { createdAt: FieldValue });
  });

  return {
    playerId: componiPlayerId(sessione.id, ref.id),
    token,
    name,
    sessionStatus: sessione.data.status,
    numTappe: sessione.data.numTappe,
    classLabel: sessione.data.classLabel,
  };
}

/* ----------------------------------------------------------------------- status */

export async function status(body: Record<string, unknown>) {
  limita(chiaveAllievo(body));
  const ctx = await caricaContesto(body);
  return {
    sessionStatus: ctx.sessione.status,
    name: ctx.allievo.name,
    classLabel: ctx.sessione.classLabel,
    numTappe: ctx.sessione.numTappe,
    tappaCorrente: ctx.allievo.tappaCorrente,
    arrivato: arrivato(ctx.allievo, ctx.sessione.numTappe),
    posizione: ctx.allievo.ordineArrivo,
    erroriTotali: ctx.allievo.erroriTotali ?? 0,
    tappa: tappaCorrentePubblica(ctx),
  };
}

/* ----------------------------------------------------------------------- submit */

function indiceTappa(valore: unknown, numTappe: number): number {
  // Niente `Number(valore)` sul valore grezzo: null, false e '' diventerebbero 0, cioè
  // la prima tappa, e un client con un bug consegnerebbe una tappa che non ha chiesto.
  const n =
    typeof valore === 'number'
      ? valore
      : typeof valore === 'string' && valore.trim() !== ''
        ? Number(valore)
        : Number.NaN;
  if (!Number.isInteger(n) || n < 0 || n >= numTappe) {
    throw new ApiError(400, 'INVALID_TAPPA', 'Numero di tappa non valido: ricarica la pagina');
  }
  return n;
}

/**
 * Consegna di una tappa. Una risposta sbagliata non è un errore HTTP: è il gioco
 * normale, e torna con `promosso: false` più l'hint.
 */
export async function submit(body: Record<string, unknown>) {
  limita(chiaveAllievo(body));
  const risposta = typeof body.risposta === 'string' ? body.risposta : '';

  return getDb().runTransaction(async (tx) => {
    const ctx = await caricaContesto(body, tx);
    verificaInCorso(ctx);
    const numTappe = ctx.sessione.numTappe;
    if (arrivato(ctx.allievo, numTappe)) {
      throw new ApiError(403, 'ALREADY_FINISHED', 'Hai già tagliato il traguardo!');
    }
    const n = indiceTappa(body.tappa, numTappe);
    if (n !== ctx.allievo.tappaCorrente) {
      throw new ApiError(
        409,
        'INVALID_TAPPA',
        `Stai consegnando la tappa ${n + 1} ma sei alla ${ctx.allievo.tappaCorrente + 1}: ricarica la pagina`,
      );
    }

    const tappa = ctx.sessione.tappe[n] as Tappa | undefined;
    if (!tappa) throw new ApiError(500, 'INTERNAL', 'Tappa non trovata nel percorso: chiama il prof');

    const valutazione = valutaRisposta(tappa, risposta);

    const erroriPrima = ctx.allievo.erroriTotali ?? 0;

    if (!valutazione.promosso) {
      tx.update(ctx.allievoRef, {
        erroriTotali: FieldValue.increment(1),
        [`tappe.${n}.errori`]: FieldValue.increment(1),
      });
      // Il totale torna al client: la schermata d'arrivo lo mostra e, senza questo,
      // resterebbe quello letto all'ingresso.
      return { promosso: false, hint: valutazione.hint, output: valutazione.output, erroriTotali: erroriPrima + 1 };
    }

    const prossima = n + 1;
    const taglia = prossima >= numTappe;
    const posizione = taglia ? (ctx.sessione.arrivati ?? 0) + 1 : null;

    tx.update(ctx.allievoRef, {
      [`tappe.${n}.completedAt`]: FieldValue.serverTimestamp(),
      tappaCorrente: prossima,
      ...(taglia ? { finishedAt: FieldValue.serverTimestamp(), ordineArrivo: posizione } : {}),
    });
    if (taglia) tx.update(ctx.sessioneRef, { arrivati: FieldValue.increment(1) });

    const seguente = taglia ? null : (ctx.sessione.tappe[prossima] as Tappa | undefined);
    return {
      promosso: true,
      output: valutazione.output,
      tappaCorrente: prossima,
      arrivato: taglia,
      posizione,
      erroriTotali: erroriPrima,
      tappa: seguente ? tappaPerAllievo(seguente) : null,
    };
  });
}
