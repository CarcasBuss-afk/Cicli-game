/* Le API dell'allievo nell'Officina: scegliere la classe, vedere il percorso, lavorare su
 * un compito fase per fase, chiedere al tutor. L'allievo è riconosciuto dall'account
 * Google della scuola (auth.ts); i parametri del compito sono suoi (regole.ts).
 *
 * Come nel Giro: validazione solo qui, al client arriva solo la fase da fare adesso. */
import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebaseAdmin';
import { esercizioPerAllievo, opzioniDiProva } from '@/lib/giro/esercizi';
import { ApiError } from '@/lib/giro/http';
import { valutaRisposta } from '@/lib/giro/hint';
import { verificaConsegna } from '@/lib/giro/verifica';
import { esegui } from '@/lib/giro/interprete';
import { eCompito, eEsame, generaCompito, schedaCompito, SEZIONI, sezioneDi, type CompitoId } from '@/lib/officina/compiti';
import { richiestaAmmessa } from '@/lib/giro/rateLimit';
import type { Utente } from './auth';
import type { FasePassata } from './client';
import { FASI_PER_COMPITO, mediaVoti, percorsoDi, semeCompito, votoSeFinisce, type VoceCompito } from './regole';
import {
  allieviRef,
  appartenenzeRef,
  classiRef,
  lavoroVuoto,
  type AllievoOfficinaDoc,
  type AppartenenzaDoc,
  type ClasseDoc,
  type EsercitazioneDoc,
  type LavoroDoc,
} from './store';
import { provaCheCade } from './consiglio';
import { chiediTutor } from './tutor';
import { MAX_DOMANDA_TUTOR, MAX_DOMANDE_TUTOR } from './tutorPrompt';

function limita(utente: Utente): void {
  if (!richiestaAmmessa(`officina:${utente.uid}`)) {
    throw new ApiError(429, 'RATE_LIMITED', 'Troppe richieste: aspetta un momento e riprova');
  }
}

const testo = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/* ----------------------------------------------------------------------- io */

/** Chi sono e in quali classi sto. */
export async function io(_body: Record<string, unknown>, utente: Utente) {
  const snap = await appartenenzeRef().doc(utente.uid).get();
  const app = snap.data() as AppartenenzaDoc | undefined;
  const classi = await Promise.all(
    (app?.classi ?? []).map(async (id) => {
      const c = (await classiRef().doc(id).get()).data() as ClasseDoc | undefined;
      return c ? { id, nome: c.nome, chiusa: c.chiusa && !utente.docente } : null;
    }),
  );
  return { uid: utente.uid, email: utente.email, nome: utente.nome, classi: classi.filter((c) => c !== null) };
}

/** Le classi aperte fra cui scegliere la propria: niente codice da dettare. */
export async function classi() {
  const snap = await classiRef().where('chiusa', '==', false).get();
  return {
    classi: snap.docs
      .map((d) => ({ id: d.id, nome: (d.data() as ClasseDoc).nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'it')),
  };
}

/* -------------------------------------------------------------------- entra */

/** Entra nella classe scelta: una volta sola, poi l'account basta. */
export async function entra(body: Record<string, unknown>, utente: Utente) {
  limita(utente);
  const classeId = testo(body.classeId, 64);
  if (!classeId) throw new ApiError(400, 'INVALID_BODY', 'Scegli la classe');
  const classe = (await classiRef().doc(classeId).get()).data() as ClasseDoc | undefined;
  if (!classe || classe.chiusa) throw new ApiError(404, 'CLASSE_NON_TROVATA', 'Classe inesistente o chiusa');

  const allievoRef = allieviRef(classeId).doc(utente.uid);
  await getDb().runTransaction(async (tx) => {
    const esistente = await tx.get(allievoRef);
    if (!esistente.exists) {
      tx.set(allievoRef, {
        uid: utente.uid,
        nome: utente.nome,
        email: utente.email,
        entratoAt: FieldValue.serverTimestamp(),
        lavori: {},
      });
    }
    tx.set(
      appartenenzeRef().doc(utente.uid),
      { nome: utente.nome, email: utente.email, classi: FieldValue.arrayUnion(classeId) },
      { merge: true },
    );
  });
  return { classeId, nome: classe.nome };
}

/* ------------------------------------------------------------------ contesto */

type Contesto = {
  classeId: string;
  classe: ClasseDoc;
  allievo: AllievoOfficinaDoc;
  allievoRef: FirebaseFirestore.DocumentReference;
};

/** La classe e l'allievo dentro: senza appartenenza non si vede niente. */
async function contesto(body: Record<string, unknown>, utente: Utente, tx?: FirebaseFirestore.Transaction): Promise<Contesto> {
  const classeId = testo(body.classeId, 64);
  if (!classeId) throw new ApiError(400, 'INVALID_BODY', 'Manca la classe');
  const classeRef = classiRef().doc(classeId);
  const allievoRef = allieviRef(classeId).doc(utente.uid);
  const [c, a] = tx ? await tx.getAll(classeRef, allievoRef) : await getDb().getAll(classeRef, allievoRef);
  const classe = c.data() as ClasseDoc | undefined;
  const allievo = a.data() as AllievoOfficinaDoc | undefined;
  if (!classe || !allievo) throw new ApiError(404, 'CLASSE_NON_TROVATA', 'Non sei in questa classe: scegli la tua classe');
  return { classeId, classe, allievo, allievoRef };
}

/**
 * Il lavoro su cui l'allievo sta lavorando adesso. Di solito è il compito; se il compito è
 * finito ed è aperta un'esercitazione non ancora finita, è l'esercitazione: stesse fasi con
 * numeri nuovi (seme suo), lavoro a parte, il voto resta quello della prima volta.
 */
type Corso = {
  lavoro: LavoroDoc;
  seme: number;
  /** Il numero dell'esercitazione in corso, null se si lavora sul compito. */
  esercitazione: number | null;
};

function corsoDi(uid: string, progetto: CompitoId, voce: VoceCompito, lavoro: LavoroDoc): Corso {
  const e = lavoro.esercitazione;
  if (voce.stato === 'finito' && e && e.fasi < FASI_PER_COMPITO) {
    return { lavoro: e, seme: semeCompito(uid, progetto, e.numero), esercitazione: e.numero };
  }
  return { lavoro, seme: semeCompito(uid, progetto), esercitazione: null };
}

/** Il compito richiesto, se è nel percorso e sbloccato per questo allievo. */
function compitoAperto(allievo: AllievoOfficinaDoc, compitoId: string, docente: boolean) {
  if (!eCompito(compitoId)) throw new ApiError(404, 'COMPITO_NON_TROVATO', 'Compito inesistente');
  const voce = percorsoDi(allievo.lavori ?? {}, FASI_PER_COMPITO, docente).find((v) => v.id === compitoId);
  if (!voce) throw new ApiError(404, 'COMPITO_NON_TROVATO', 'Compito inesistente');
  if (voce.stato === 'bloccato') throw new ApiError(403, 'BLOCCATO', 'Questo compito si sblocca quando finisci il precedente');
  return { progetto: compitoId, voce, lavoro: allievo.lavori?.[compitoId] ?? lavoroVuoto() };
}

/* ------------------------------------------------------------------ compiti */

/** Il percorso dell'allievo: tutti i compiti con lo stato, le sezioni in cui stanno, e la media. */
export async function compiti(body: Record<string, unknown>, utente: Utente) {
  const ctx = await contesto(body, utente);
  const voci = percorsoDi(ctx.allievo.lavori ?? {}, FASI_PER_COMPITO, utente.docente);
  return {
    classe: { id: ctx.classeId, nome: ctx.classe.nome, chiusa: ctx.classe.chiusa && !utente.docente },
    compiti: voci.map((v) => ({
      ...v,
      fasiTotali: FASI_PER_COMPITO,
      titolo: schedaCompito(v.id, 1).titolo,
      votoSeFinisci: votoSeFinisce(v.consigli),
      sezione: sezioneDi(v.id).id,
      esame: eEsame(v.id),
    })),
    sezioni: SEZIONI.map((s) => ({ id: s.id, titolo: s.titolo, compiti: s.compiti })),
    media: mediaVoti(voci),
  };
}

/** Il compito aperto: scheda, fase da fare, codice da cui ripartire, conversazione col tutor. */
export async function compito(body: Record<string, unknown>, utente: Utente) {
  const ctx = await contesto(body, utente);
  const aperto = compitoAperto(ctx.allievo, testo(body.compitoId, 64), utente.docente);
  const { progetto, voce } = aperto;
  // Durante un'esercitazione la pagina mostra quella: fasi, bozza, codice e tutor suoi.
  const { lavoro, seme, esercitazione } = corsoDi(utente.uid, progetto, voce, aperto.lavoro);
  const fasi = generaCompito(progetto, seme);
  const finito = voce.stato === 'finito' && esercitazione === null;
  const esercizio = !finito ? fasi[lavoro.fasi] : undefined;
  // Si riparte dall'ultima consegna, giusta o no; altrimenti dal codice della fase prima;
  // altrimenti da quello che la fase porta già scritto (la promozione riparte dallo scontrino).
  const daCui = lavoro.bozza || (lavoro.fasi > 0 ? lavoro.codice?.[String(lavoro.fasi - 1)] : '') || esercizio?.codiceIniziale || '';
  return {
    id: progetto,
    classeChiusa: ctx.classe.chiusa && !utente.docente,
    docente: utente.docente,
    esame: eEsame(progetto),
    fasi: lavoro.fasi,
    fasiTotali: FASI_PER_COMPITO,
    consigli: lavoro.consigli,
    domandeRimaste: domandeRimaste(lavoro.consigli),
    finito,
    voto: voce.voto,
    // Nell'esercitazione il voto non si muove: quello «se finisci» è quello che ha già.
    votoSeFinisci: esercitazione !== null && voce.voto !== null ? voce.voto : votoSeFinisce(lavoro.consigli),
    esercitazione,
    esercitazioni: aperto.lavoro.esercitazione?.numero ?? 0,
    scheda: schedaCompito(progetto, seme),
    esercizio: esercizio ? { ...esercizioPerAllievo(esercizio), codiceIniziale: daCui || undefined } : null,
    codice: lavoro.codice ?? {},
    // Solo le fasi già superate, come l'allievo le vedeva (consegna e riquadri attesi): quelle da fare restano nascoste.
    passate: fasi.slice(0, lavoro.fasi).map((f): FasePassata => {
      const { consegna, outputAtteso, schermoAtteso, altriEsempi } = esercizioPerAllievo(f);
      return { consegna, outputAtteso, schermoAtteso, altriEsempi };
    }),
    tutor: (lavoro.tutor ?? []).map((s) => ({ fase: s.fase + 1, domanda: s.domanda, risposta: s.risposta })),
    errori: lavoro.errori,
  };
}

/**
 * Solo per il docente che prova i compiti: riporta il compito a zero (fasi, bozza, errori,
 * conversazione, voto), così lo rifà da capo. Agli allievi questa strada è chiusa.
 */
export async function ricomincia(body: Record<string, unknown>, utente: Utente) {
  if (!utente.docente) throw new ApiError(403, 'FORBIDDEN', 'Ricominciare un compito è riservato al docente');
  const ctx = await contesto(body, utente);
  const { progetto } = compitoAperto(ctx.allievo, testo(body.compitoId, 64), true);
  // update, non set con merge: il lavoro va sostituito per intero, non fuso con quello di prima.
  await ctx.allievoRef.update({ [`lavori.${progetto}`]: lavoroVuoto() });
  return { ok: true };
}

/**
 * Ripete un compito finito per esercitarsi: si riparte dalla fase 1, con numeri nuovi, gli
 * hint, il giudice e il tutor come la prima volta. Il voto e il codice della prima volta
 * restano dove sono: l'esercitazione ha il suo lavoro a parte, e una nuova rimpiazza la
 * precedente.
 */
export async function ripeti(body: Record<string, unknown>, utente: Utente) {
  limita(utente);
  const ctx = await contesto(body, utente);
  if (ctx.classe.chiusa && !utente.docente) throw new ApiError(403, 'CLASSE_CHIUSA', "L'Officina è chiusa: il prof la riapre alla prossima lezione");
  const { progetto, voce, lavoro } = compitoAperto(ctx.allievo, testo(body.compitoId, 64), utente.docente);
  if (voce.stato !== 'finito') throw new ApiError(403, 'NON_FINITO', 'Si ripete un compito finito: prima arriva in fondo');
  const numero = (lavoro.esercitazione?.numero ?? 0) + 1;
  const nuova: EsercitazioneDoc = { ...lavoroVuoto(), numero };
  // update, non set con merge: l'esercitazione di prima va sostituita per intero.
  await ctx.allievoRef.update({ [`lavori.${progetto}.esercitazione`]: nuova });
  return { ok: true, esercitazione: numero };
}

/* ----------------------------------------------------------------- consegna */

function intero(v: unknown): number {
  return typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : Number.NaN;
}

/**
 * Controlli comuni a consegna e tutor: classe aperta, compito sbloccato e non finito (o
 * finito ma con un'esercitazione in corso: allora si lavora su quella).
 */
function lavoroInCorso(ctx: Contesto, body: Record<string, unknown>, { uid, docente }: Utente) {
  if (ctx.classe.chiusa && !docente) throw new ApiError(403, 'CLASSE_CHIUSA', "L'Officina è chiusa: il prof la riapre alla prossima lezione");
  const aperto = compitoAperto(ctx.allievo, testo(body.compitoId, 64), docente);
  const { progetto, voce } = aperto;
  const { lavoro, seme, esercitazione } = corsoDi(uid, progetto, voce, aperto.lavoro);
  if (voce.stato === 'finito' && esercitazione === null) throw new ApiError(403, 'FINITO', 'Hai già finito questo compito!');
  const fasi = generaCompito(progetto, seme);
  return { progetto, lavoro, fasi, esercizio: fasi[lavoro.fasi], seme, esercitazione, voto: voce.voto };
}

/** Dove si scrive il lavoro: nel compito, o nella sua esercitazione. */
function dovePer(progetto: CompitoId, esercitazione: number | null, dati: Record<string, unknown>) {
  return { lavori: { [progetto]: esercitazione === null ? dati : { esercitazione: dati } } };
}

/** La fase che l'allievo sta consegnando: i controlli, uguali nei due tempi della consegna. */
function faseInConsegna(ctx: Contesto, body: Record<string, unknown>, utente: Utente) {
  const aperto = lavoroInCorso(ctx, body, utente);
  const f = intero(body.fase);
  if (f !== aperto.lavoro.fasi) {
    throw new ApiError(409, 'FASE_SBAGLIATA', `Stai consegnando la fase ${f + 1} ma sei alla fase ${aperto.lavoro.fasi + 1}: ricarica la pagina`);
  }
  return { ...aperto, f };
}

/**
 * Consegna di una fase. Il codice si salva sempre come bozza, giusto o sbagliato: alla
 * riapertura l'allievo ritrova quello che aveva scritto.
 *
 * Due tempi come nel Giro: la verifica (interprete più giudice, lento) sta fuori dalla
 * transazione; dentro si rilegge, si ricontrolla la fase e si scrive. Le fasi di un
 * compito non cambiano, quindi la verifica vale se la fase è ancora quella.
 */
export async function consegna(body: Record<string, unknown>, utente: Utente) {
  limita(utente);
  const codice = typeof body.codice === 'string' ? body.codice.slice(0, 6000) : '';

  const prima = faseInConsegna(await contesto(body, utente), body, utente);
  const valutazione = await verificaConsegna(prima.esercizio, codice);

  return getDb().runTransaction(async (tx) => {
    const ctx = await contesto(body, utente, tx);
    const { progetto, lavoro, fasi, f, esercitazione, voto } = faseInConsegna(ctx, body, utente);
    // Nel frattempo è partita un'altra esercitazione (numeri diversi): la verifica non vale più.
    if (esercitazione !== prima.esercitazione) {
      throw new ApiError(409, 'FASE_SBAGLIATA', 'Il compito è ripartito da capo: ricarica la pagina');
    }
    const salva = (dati: Partial<LavoroDoc>) =>
      tx.set(ctx.allievoRef, dovePer(progetto, esercitazione, { ...lavoro, ...dati, ultimoAt: Timestamp.now() }), { merge: true });
    // Il registro del giudice: ogni verdetto (anche il guasto) resta, il docente lo legge.
    const giudizi = valutazione.giudizio
      ? [...(lavoro.giudizi ?? []), { fase: f, verdetto: valutazione.giudizio.verdetto, motivo: valutazione.giudizio.motivo ?? null, at: Timestamp.now() }].slice(-20)
      : (lavoro.giudizi ?? []);

    if (!valutazione.promosso) {
      salva({
        bozza: codice,
        errori: lavoro.errori + 1,
        erroriFase: { ...lavoro.erroriFase, [String(f)]: (lavoro.erroriFase?.[String(f)] ?? 0) + 1 },
        giudizi,
      });
      return {
        promosso: false,
        hint: valutazione.hint,
        output: valutazione.output,
        schermo: valutazione.schermo,
        riga: valutazione.riga ?? null,
        errori: lavoro.errori + 1,
      };
    }

    const nuoveFasi = f + 1;
    const finito = nuoveFasi >= FASI_PER_COMPITO;
    const ora = Timestamp.now();
    salva({
      fasi: nuoveFasi,
      fasiAt: { ...lavoro.fasiAt, [String(f)]: ora },
      codice: { ...lavoro.codice, [String(f)]: codice },
      bozza: '',
      finitoAt: finito ? ora : (lavoro.finitoAt ?? null),
      giudizi,
    });
    const seguente = finito ? undefined : fasi[nuoveFasi];
    return {
      promosso: true,
      output: valutazione.output,
      schermo: valutazione.schermo,
      fasi: nuoveFasi,
      finito,
      // L'esercitazione non cambia il voto: alla fine si ritrova quello di prima.
      voto: finito ? (esercitazione !== null ? voto : votoSeFinisce(lavoro.consigli)) : null,
      votoSeFinisci: esercitazione !== null && voto !== null ? voto : votoSeFinisce(lavoro.consigli),
      esercizio: seguente ? { ...esercizioPerAllievo(seguente), codiceIniziale: codice } : null,
    };
  });
}

/* -------------------------------------------------------------------- tutor */

const domandeRimaste = (consigli: number) => Math.max(0, MAX_DOMANDE_TUTOR - consigli);

/**
 * Una domanda al tutor: costa mezzo punto (fino al pavimento, poi è gratis ma si conta),
 * fino al tetto di MAX_DOMANDE_TUTOR per compito.
 */
export async function tutor(body: Record<string, unknown>, utente: Utente) {
  limita(utente);
  const domanda = typeof body.domanda === 'string' ? body.domanda.replace(/\r\n?/g, '\n').trim().slice(0, MAX_DOMANDA_TUTOR) : '';
  const codice = typeof body.codice === 'string' ? body.codice.slice(0, 6000) : '';

  const ctx = await contesto(body, utente);
  const { progetto, lavoro, esercizio, seme, esercitazione, voto } = lavoroInCorso(ctx, body, utente);
  if (eEsame(progetto)) {
    throw new ApiError(403, 'TUTOR_SPENTO', 'Nel patentino il tutor è spento: è un esame, ce la fai da solo. Gli hint automatici restano');
  }
  if (lavoro.consigli >= MAX_DOMANDE_TUTOR) {
    throw new ApiError(403, 'DOMANDE_FINITE', `Hai fatto ${MAX_DOMANDE_TUTOR} domande su questo compito: da qui in poi vai avanti da solo, o chiedi al prof`);
  }
  const esito = esegui(codice, opzioniDiProva(esercizio.prove?.[0]));
  const valutazione = codice.trim() ? valutaRisposta(esercizio, codice) : null;
  const risposta = await chiediTutor(
    {
      scheda: schedaCompito(progetto, seme),
      fase: lavoro.fasi + 1,
      fasiTotali: FASI_PER_COMPITO,
      esercizio,
      codice,
      esito: esito.ok ? { output: esito.output, struttura: esito.struttura, giri: esito.giri } : { errore: esito.errore.messaggio },
      erroriFase: lavoro.erroriFase?.[String(lavoro.fasi)] ?? 0,
      hint: valutazione?.hint ?? null,
      provaNascosta: provaCheCade(esercizio, codice),
      domanda,
      precedenti: [],
    },
    (lavoro.tutor ?? []).map((s) => ({ fase: s.fase + 1, domanda: s.domanda, risposta: s.risposta })),
  );

  const consigli = await getDb().runTransaction(async (tx) => {
    const snap = await tx.get(ctx.allievoRef);
    const fresco = (snap.data() as AllievoOfficinaDoc | undefined)?.lavori?.[progetto];
    // La domanda va nel lavoro dove è stata fatta: nell'esercitazione, se è ancora quella.
    const attuale: LavoroDoc =
      esercitazione === null ? (fresco ?? lavoroVuoto()) : fresco?.esercitazione?.numero === esercitazione ? fresco.esercitazione : lavoro;
    const scambio = { fase: lavoro.fasi, domanda, risposta, at: Timestamp.now() };
    tx.set(
      ctx.allievoRef,
      dovePer(progetto, esercitazione, { ...attuale, bozza: codice || attuale.bozza, consigli: attuale.consigli + 1, tutor: [...(attuale.tutor ?? []), scambio] }),
      { merge: true },
    );
    return attuale.consigli + 1;
  });

  const votoSeFinisci = esercitazione !== null && voto !== null ? voto : votoSeFinisce(consigli);
  return { risposta, consigli, domandeRimaste: domandeRimaste(consigli), votoSeFinisci, fase: lavoro.fasi + 1 };
}
