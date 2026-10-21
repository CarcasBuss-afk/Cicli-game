/* Logica delle API /api/giro/*: join, rientro, status, submit (tabella in CLAUDE.md).
 *
 * La validazione sta tutta qui, sul server: il client riceve solo il chilometro da fare
 * adesso e, quando sbaglia, l'hint. Output atteso, soluzioni e chilometri futuri non
 * escono mai.
 */
import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebaseAdmin';
import { esercizioPerAllievo, type EsercizioPubblico } from './esercizi';
import { infoTema } from './giro';
import { MAX_CONSIGLI, normalizzaDomanda } from './gregario';
import { chiediConsiglio } from './gregarioClient';
import { valutaRisposta } from './hint';
import { ApiError } from './http';
import { esegui } from './interprete';
import { schedaProgetto, votoSeFinisce } from './progetti';
import { chiaveNome, normalizzaNome, validaNome } from './nomi';
import { richiestaAmmessa } from './rateLimit';
import {
  allieviRef,
  caricaContesto,
  componiPlayerId,
  ms,
  scaduta,
  sessioniRef,
  trovaSessioneAttiva,
  type AllievoDoc,
  type Contesto,
  type SessioneDoc,
  type TappaDoc,
} from './store';
import { generaToken, hashToken } from './token';

function limita(chiave: string): void {
  if (!richiestaAmmessa(chiave)) {
    throw new ApiError(429, 'RATE_LIMITED', 'Troppe richieste: aspetta un momento e riprova');
  }
}

const chiaveAllievo = (body: Record<string, unknown>) =>
  `player:${typeof body.playerId === 'string' ? body.playerId : '?'}`;

/** Secondi che restano alla tappa, calcolati dal server: l'orologio dei PC d'aula non è affidabile. */
function secondiRimasti(tappa: TappaDoc, ora = Date.now()): number | null {
  const fine = ms(tappa.scadenzaAt);
  if (fine === null) return null;
  return Math.max(0, Math.ceil((fine - ora) / 1000));
}

const kmFatti = (allievo: AllievoDoc, indice: number) => allievo.tappe?.[String(indice)]?.km ?? 0;

/* ----------------------------------------------------------------- Cronoscalata */

/** Il progetto della tappa, se è una Cronoscalata. */
const progettoDi = (tappa: TappaDoc) => infoTema(tappa.tema).progetto ?? null;

/**
 * Nella Cronoscalata il programma cresce di fase in fase: l'esercizio arriva all'allievo
 * con dentro il codice promosso alla fase prima, così l'editor non riparte da vuoto
 * (nemmeno dopo una ricarica o da un altro PC).
 */
function conCodicePrecedente(esercizio: EsercizioPubblico, codice: string | undefined): EsercizioPubblico {
  return codice ? { ...esercizio, codiceIniziale: codice } : esercizio;
}

/** Lo stato della Cronoscalata visto dall'allievo: scheda, consigli, voto. */
function statoCronoscalata(tappa: TappaDoc, allievo: AllievoDoc, indice: number) {
  const progetto = progettoDi(tappa);
  if (!progetto) return null;
  const p = allievo.tappe?.[String(indice)];
  const consigli = p?.consigli ?? 0;
  return {
    scheda: schedaProgetto(progetto, tappa.seme),
    consigli,
    consigliRimasti: Math.max(0, MAX_CONSIGLI - consigli),
    voto: votoSeFinisce(consigli),
    gregario: (p?.gregario ?? []).map((g) => ({ fase: g.km + 1, domanda: g.domanda, consiglio: g.consiglio })),
  };
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
  const sessioneRef = sessioniRef().doc(sessione.id);

  const numero = await getDb().runTransaction(async (tx) => {
    // Tutte le letture prima di qualunque scrittura, come vuole Firestore.
    const doppioni = await tx.get(allieviRef(sessione.id).where('nameKey', '==', nameKey).limit(1));
    const snap = await tx.get(sessioneRef);
    const dati = snap.data() as SessioneDoc | undefined;
    if (!dati) throw new ApiError(404, 'SESSION_NOT_FOUND', 'Gara inesistente');
    if (!doppioni.empty) {
      throw new ApiError(
        409,
        'DUPLICATE_PLAYER',
        `C'è già un «${name}» in gara: se sei tu, rientra con il tuo numero di corsa; se no, aggiungi l'iniziale del cognome, per esempio «${name} B.»`,
      );
    }
    const assegnato = dati.prossimoNumero ?? 1;
    tx.set(ref, {
      name,
      nameKey,
      numero: assegnato,
      tokenHash: hashToken(token),
      createdAt: FieldValue.serverTimestamp(),
      tappe: {},
      erroriTotali: 0,
    } satisfies Omit<AllievoDoc, 'createdAt'> & { createdAt: FieldValue });
    tx.update(sessioneRef, { prossimoNumero: assegnato + 1 });
    return assegnato;
  });

  return {
    playerId: componiPlayerId(sessione.id, ref.id),
    token,
    name,
    numero,
    sessionStatus: sessione.data.status,
    numTappe: sessione.data.tappe.length,
    classLabel: sessione.data.classLabel,
  };
}

/* ---------------------------------------------------------------------- rientro */

/**
 * Rientro da un altro PC con il numero di corsa. Il browser di quella postazione non ha
 * memoria dell'allievo, quindi l'identità la ritrova il server.
 *
 * Il token viene rigenerato: quello vecchio, rimasto sul PC precedente, smette di valere.
 * È voluto — un allievo corre da una postazione alla volta.
 */
export async function rientro(body: Record<string, unknown>) {
  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  if (!code) throw new ApiError(400, 'INVALID_BODY', 'Manca il codice della gara');
  limita(`rientro:${code}`);

  const grezzo = typeof body.numero === 'number' ? body.numero : Number(String(body.numero ?? '').trim());
  if (!Number.isInteger(grezzo) || grezzo < 1) {
    throw new ApiError(400, 'INVALID_BODY', 'Il numero di corsa è un numero intero: guarda la lista alla LIM');
  }

  const sessione = await trovaSessioneAttiva(code);
  if (!sessione) {
    throw new ApiError(404, 'SESSION_NOT_FOUND', 'Codice inesistente o gara chiusa: controlla il codice alla LIM');
  }

  const trovati = await allieviRef(sessione.id).where('numero', '==', grezzo).limit(1).get();
  if (trovati.empty) {
    throw new ApiError(404, 'PLAYER_NOT_FOUND', `Nessun corridore con il numero ${grezzo}: controlla la lista alla LIM`);
  }

  const doc = trovati.docs[0];
  const allievo = doc.data() as AllievoDoc;
  const token = generaToken();
  await doc.ref.update({ tokenHash: hashToken(token) });

  return {
    playerId: componiPlayerId(sessione.id, doc.id),
    token,
    name: allievo.name,
    numero: allievo.numero,
    sessionStatus: sessione.data.status,
    numTappe: sessione.data.tappe.length,
    classLabel: sessione.data.classLabel,
  };
}

/* ----------------------------------------------------------------------- status */

/** La tappa in corso vista dall'allievo: solo il chilometro da fare adesso. */
function tappaInCorso(ctx: Contesto) {
  const indice = ctx.sessione.tappaAperta;
  if (ctx.sessione.status !== 'running' || indice === null || indice === undefined) return null;
  const tappa = ctx.sessione.tappe[indice];
  if (!tappa || tappa.stato !== 'in-corso') return null;

  const fatti = kmFatti(ctx.allievo, indice);
  const finita = fatti >= tappa.km;
  const finitoIlTempo = scaduta(tappa);
  const esercizio = !finita && !finitoIlTempo ? tappa.esercizi[fatti] : undefined;
  const progresso = ctx.allievo.tappe?.[String(indice)];
  const codicePrecedente = progettoDi(tappa) && fatti > 0 ? progresso?.codice?.[String(fatti - 1)] : undefined;
  return {
    indice,
    tema: tappa.tema,
    nomeTema: infoTema(tappa.tema).nome,
    km: tappa.km,
    kmFatti: fatti,
    secondiRimasti: secondiRimasti(tappa),
    scaduta: finitoIlTempo,
    finita,
    ordineArrivo: progresso?.ordineArrivo ?? null,
    esercizio: esercizio ? conCodicePrecedente(esercizioPerAllievo(esercizio), codicePrecedente) : null,
    /** Solo nella Cronoscalata: la scheda del compito, i consigli chiesti, il voto. */
    cronoscalata: statoCronoscalata(tappa, ctx.allievo, indice),
  };
}

/** Il risultato dell'ultima tappa chiusa che l'allievo ha corso. */
function ultimaTappa(ctx: Contesto) {
  for (let i = ctx.sessione.tappe.length - 1; i >= 0; i--) {
    const tappa = ctx.sessione.tappe[i];
    const p = ctx.allievo.tappe?.[String(i)];
    if (tappa.stato === 'chiusa' && p && typeof p.posizione === 'number') {
      return {
        indice: i,
        nomeTema: infoTema(tappa.tema).nome,
        km: tappa.km,
        kmFatti: p.km ?? 0,
        posizione: p.posizione,
        punti: p.punti ?? 0,
      };
    }
  }
  return null;
}

export async function status(body: Record<string, unknown>) {
  limita(chiaveAllievo(body));
  const ctx = await caricaContesto(body);
  const riga = (ctx.sessione.generale ?? []).find((r) => r.id === ctx.allievoDocId);
  return {
    sessionStatus: ctx.sessione.status,
    name: ctx.allievo.name,
    numero: ctx.allievo.numero ?? null,
    classLabel: ctx.sessione.classLabel,
    numTappe: ctx.sessione.tappe.length,
    tappeCorse: ctx.sessione.tappe.filter((t) => t.stato === 'chiusa').length,
    /** La gara singola (una tappa mista sola) non ha una classifica generale da mostrare. */
    singola: ctx.sessione.tappe.length === 1 && ctx.sessione.tappe[0].tema === 'misto',
    generale: riga ? { posizione: riga.posizione, punti: riga.punti, corridori: ctx.sessione.generale.length } : null,
    erroriTotali: ctx.allievo.erroriTotali ?? 0,
    tappa: tappaInCorso(ctx),
    ultimaTappa: ultimaTappa(ctx),
  };
}

/* ----------------------------------------------------------------------- submit */

function intero(valore: unknown): number {
  return typeof valore === 'number'
    ? valore
    : typeof valore === 'string' && valore.trim() !== ''
      ? Number(valore)
      : Number.NaN;
}

/**
 * Consegna di un chilometro. Una risposta sbagliata non è un errore HTTP: è il gioco
 * normale, e torna con `promosso: false` più l'hint.
 */
export async function submit(body: Record<string, unknown>) {
  limita(chiaveAllievo(body));
  const risposta = typeof body.risposta === 'string' ? body.risposta : '';

  return getDb().runTransaction(async (tx) => {
    const ctx = await caricaContesto(body, tx);
    const { sessione, allievo } = ctx;

    if (sessione.status === 'waiting') {
      throw new ApiError(403, 'SESSION_NOT_RUNNING', 'Il Giro non è ancora partito: aspetta che il prof apra la prima tappa');
    }
    if (sessione.status === 'closed') throw new ApiError(403, 'SESSION_NOT_RUNNING', 'Il Giro è chiuso');

    // Niente Number() sul valore grezzo: null, false e '' diventerebbero 0, cioè la prima
    // tappa o il primo chilometro, e un client con un bug consegnerebbe a caso.
    const t = intero(body.tappa);
    if (!Number.isInteger(t) || t < 0 || t >= sessione.tappe.length) {
      throw new ApiError(400, 'INVALID_TAPPA', 'Tappa non valida: ricarica la pagina');
    }
    const tappa = sessione.tappe[t];
    if (sessione.tappaAperta !== t || tappa.stato !== 'in-corso') {
      throw new ApiError(409, 'TAPPA_NON_APERTA', 'Questa tappa non è aperta: ricarica la pagina');
    }
    if (scaduta(tappa)) {
      throw new ApiError(403, 'TEMPO_SCADUTO', 'Tempo scaduto! Aspetta la prossima tappa');
    }

    const fatti = kmFatti(allievo, t);
    if (fatti >= tappa.km) throw new ApiError(403, 'TAPPA_FINITA', 'Hai già finito questa tappa!');
    const k = intero(body.km);
    if (!Number.isInteger(k) || k < 0 || k >= tappa.km) {
      throw new ApiError(400, 'INVALID_KM', 'Chilometro non valido: ricarica la pagina');
    }
    if (k !== fatti) {
      throw new ApiError(409, 'INVALID_KM', `Stai consegnando il km ${k + 1} ma sei al km ${fatti + 1}: ricarica la pagina`);
    }

    const esercizio = tappa.esercizi[k];
    if (!esercizio) throw new ApiError(500, 'INTERNAL', 'Chilometro non trovato: chiama il prof');
    const valutazione = valutaRisposta(esercizio, risposta);
    const erroriPrima = allievo.erroriTotali ?? 0;
    const base = `tappe.${t}`;

    if (!valutazione.promosso) {
      tx.update(ctx.allievoRef, {
        erroriTotali: FieldValue.increment(1),
        [`${base}.errori`]: FieldValue.increment(1),
        [`${base}.erroriKm.${k}`]: FieldValue.increment(1),
      });
      // Il totale torna al client: la schermata finale lo mostra.
      return { promosso: false, hint: valutazione.hint, output: valutazione.output, schermo: valutazione.schermo, erroriTotali: erroriPrima + 1 };
    }

    const nuoviKm = k + 1;
    const finita = nuoviKm >= tappa.km;
    const ordineArrivo = finita ? (sessione.arrivati?.[String(t)] ?? 0) + 1 : null;
    tx.update(ctx.allievoRef, {
      [`${base}.km`]: nuoviKm,
      [`${base}.codice.${k}`]: risposta,
      [`${base}.kmAt.${k}`]: FieldValue.serverTimestamp(),
      [`${base}.ultimoAt`]: FieldValue.serverTimestamp(),
      ...(finita ? { [`${base}.ordineArrivo`]: ordineArrivo } : {}),
    });
    if (finita) tx.update(ctx.sessioneRef, { [`arrivati.${t}`]: FieldValue.increment(1) });

    const seguente = finita ? undefined : tappa.esercizi[nuoviKm];
    const progetto = progettoDi(tappa);
    const consigli = allievo.tappe?.[String(t)]?.consigli ?? 0;
    return {
      promosso: true,
      output: valutazione.output,
      schermo: valutazione.schermo,
      kmFatti: nuoviKm,
      finita,
      ordineArrivo,
      erroriTotali: erroriPrima,
      esercizio: seguente ? conCodicePrecedente(esercizioPerAllievo(seguente), progetto ? risposta : undefined) : null,
      /** Nella Cronoscalata: il voto se arriva in fondo (all'ultima fase è quello vero). */
      voto: progetto ? votoSeFinisce(consigli) : null,
    };
  });
}

/* -------------------------------------------------------------------- consiglio */

/**
 * Un consiglio del gregario sulla fase in corso. Costa un punto sul voto, quindi: la
 * tappa deve essere una Cronoscalata aperta, la fase non finita, il tetto non raggiunto.
 * La chiamata al modello sta fuori dalla transazione (è lenta e può fallire); il
 * conteggio si aggiorna dentro, rileggendo l'allievo.
 */
export async function consiglio(body: Record<string, unknown>) {
  limita(chiaveAllievo(body));
  const domanda = normalizzaDomanda(body.domanda);
  const codice = typeof body.codice === 'string' ? body.codice.slice(0, 4000) : '';

  const ctx = await caricaContesto(body);
  const { sessione, allievo } = ctx;
  if (sessione.status !== 'running') {
    throw new ApiError(403, 'SESSION_NOT_RUNNING', sessione.status === 'closed' ? 'Il Giro è chiuso' : 'Il Giro non è ancora partito');
  }
  const t = intero(body.tappa);
  if (!Number.isInteger(t) || t < 0 || t >= sessione.tappe.length) {
    throw new ApiError(400, 'INVALID_TAPPA', 'Tappa non valida: ricarica la pagina');
  }
  const tappa = sessione.tappe[t];
  if (sessione.tappaAperta !== t || tappa.stato !== 'in-corso') {
    throw new ApiError(409, 'TAPPA_NON_APERTA', 'Questa tappa non è aperta: ricarica la pagina');
  }
  const progetto = progettoDi(tappa);
  if (!progetto) throw new ApiError(400, 'NON_PROGETTO', "In questa tappa il gregario non c'è: si corre da soli");
  if (scaduta(tappa)) throw new ApiError(403, 'TEMPO_SCADUTO', 'Tempo scaduto! Il gregario non serve più');

  const fatti = kmFatti(allievo, t);
  if (fatti >= tappa.km) throw new ApiError(403, 'TAPPA_FINITA', 'Hai già finito: il gregario non serve più');
  const progresso = allievo.tappe?.[String(t)];
  if ((progresso?.consigli ?? 0) >= MAX_CONSIGLI) {
    throw new ApiError(403, 'CONSIGLI_FINITI', 'Hai usato tutti i consigli di questa tappa: chiama il prof');
  }
  const esercizio = tappa.esercizi[fatti];
  if (!esercizio) throw new ApiError(500, 'INTERNAL', 'Fase non trovata: chiama il prof');

  const esito = esegui(codice, esercizio.prove?.[0] ? { risposte: esercizio.prove[0].risposte } : {});
  const valutazione = codice.trim() ? valutaRisposta(esercizio, codice) : null;
  const testo = await chiediConsiglio({
    scheda: schedaProgetto(progetto, tappa.seme),
    fase: fatti + 1,
    fasiTotali: tappa.km,
    esercizio,
    codice,
    esito: esito.ok ? { output: esito.output } : { errore: esito.errore.messaggio },
    hint: valutazione?.hint ?? null,
    domanda,
    precedenti: (progresso?.gregario ?? []).map((g) => ({ fase: g.km + 1, consiglio: g.consiglio })),
  });

  const consigli = await getDb().runTransaction(async (tx) => {
    const snap = await tx.get(ctx.allievoRef);
    const fresco = snap.data() as AllievoDoc | undefined;
    if (!fresco) throw new ApiError(401, 'UNAUTHORIZED', 'Non ti riconosco: rientra dalla pagina iniziale');
    const n = fresco.tappe?.[String(t)]?.consigli ?? 0;
    if (n >= MAX_CONSIGLI) throw new ApiError(403, 'CONSIGLI_FINITI', 'Hai usato tutti i consigli di questa tappa: chiama il prof');
    const base = `tappe.${t}`;
    tx.update(ctx.allievoRef, {
      [`${base}.consigli`]: n + 1,
      [`${base}.gregario`]: FieldValue.arrayUnion({ km: fatti, domanda, consiglio: testo, at: Timestamp.now() }),
    });
    return n + 1;
  });

  return {
    consiglio: testo,
    consigli,
    consigliRimasti: Math.max(0, MAX_CONSIGLI - consigli),
    voto: votoSeFinisce(consigli),
  };
}
