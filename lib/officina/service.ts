/* Le API dell'allievo nell'Officina: scegliere la classe, vedere il percorso, lavorare su
 * un compito fase per fase, chiedere al tutor. L'allievo è riconosciuto dall'account
 * Google della scuola (auth.ts); i parametri del compito sono suoi (regole.ts).
 *
 * Come nel Giro: validazione solo qui, al client arriva solo la fase da fare adesso. */
import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebaseAdmin';
import { esercizioPerAllievo, opzioniDiProva, type Esercizio } from '@/lib/giro/esercizi';
import { ApiError } from '@/lib/giro/http';
import { valutaRisposta } from '@/lib/giro/hint';
import { verificaConsegna } from '@/lib/giro/verifica';
import { esegui } from '@/lib/giro/interprete';
import { eCompito, eEsame, generaCompito, schedaCompito, SEZIONI, sezioneDi, type CompitoId } from '@/lib/officina/compiti';
import { richiestaAmmessa } from '@/lib/giro/rateLimit';
import type { Utente } from './auth';
import { FASI_PER_COMPITO, mediaVoti, percorsoDi, semeDa, votoSeFinisce } from './regole';
import {
  allieviRef,
  appartenenzeRef,
  classiRef,
  lavoroVuoto,
  type AllievoOfficinaDoc,
  type AppartenenzaDoc,
  type ClasseDoc,
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
      return c ? { id, nome: c.nome, chiusa: c.chiusa } : null;
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

const semeDi = (uid: string, progetto: CompitoId) => semeDa(`${uid}|${progetto}`);

function fasiDi(progetto: CompitoId, uid: string): Esercizio[] {
  return generaCompito(progetto, semeDi(uid, progetto));
}

/** Il compito richiesto, se è nel percorso e sbloccato per questo allievo. */
function compitoAperto(allievo: AllievoOfficinaDoc, compitoId: string) {
  if (!eCompito(compitoId)) throw new ApiError(404, 'COMPITO_NON_TROVATO', 'Compito inesistente');
  const voce = percorsoDi(allievo.lavori ?? {}).find((v) => v.id === compitoId);
  if (!voce) throw new ApiError(404, 'COMPITO_NON_TROVATO', 'Compito inesistente');
  if (voce.stato === 'bloccato') throw new ApiError(403, 'BLOCCATO', 'Questo compito si sblocca quando finisci il precedente');
  return { progetto: compitoId, voce, lavoro: allievo.lavori?.[compitoId] ?? lavoroVuoto() };
}

/* ------------------------------------------------------------------ compiti */

/** Il percorso dell'allievo: tutti i compiti con lo stato, le sezioni in cui stanno, e la media. */
export async function compiti(body: Record<string, unknown>, utente: Utente) {
  const ctx = await contesto(body, utente);
  const voci = percorsoDi(ctx.allievo.lavori ?? {});
  return {
    classe: { id: ctx.classeId, nome: ctx.classe.nome, chiusa: ctx.classe.chiusa },
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
  const { progetto, voce, lavoro } = compitoAperto(ctx.allievo, testo(body.compitoId, 64));
  const fasi = fasiDi(progetto, utente.uid);
  const finito = voce.stato === 'finito';
  const esercizio = !finito ? fasi[lavoro.fasi] : undefined;
  // Si riparte dall'ultima consegna, giusta o no; altrimenti dal codice della fase prima;
  // altrimenti da quello che la fase porta già scritto (la promozione riparte dallo scontrino).
  const daCui = lavoro.bozza || (lavoro.fasi > 0 ? lavoro.codice?.[String(lavoro.fasi - 1)] : '') || esercizio?.codiceIniziale || '';
  return {
    id: progetto,
    classeChiusa: ctx.classe.chiusa,
    esame: eEsame(progetto),
    fasi: lavoro.fasi,
    fasiTotali: FASI_PER_COMPITO,
    consigli: lavoro.consigli,
    domandeRimaste: domandeRimaste(lavoro.consigli),
    finito,
    voto: voce.voto,
    votoSeFinisci: votoSeFinisce(lavoro.consigli),
    scheda: schedaCompito(progetto, semeDi(utente.uid, progetto)),
    esercizio: esercizio ? { ...esercizioPerAllievo(esercizio), codiceIniziale: daCui || undefined } : null,
    codice: lavoro.codice ?? {},
    tutor: (lavoro.tutor ?? []).map((s) => ({ fase: s.fase + 1, domanda: s.domanda, risposta: s.risposta })),
    errori: lavoro.errori,
  };
}

/* ----------------------------------------------------------------- consegna */

function intero(v: unknown): number {
  return typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : Number.NaN;
}

/** Controlli comuni a consegna e tutor: classe aperta, compito sbloccato e non finito. */
function lavoroInCorso(ctx: Contesto, body: Record<string, unknown>, uid: string) {
  if (ctx.classe.chiusa) throw new ApiError(403, 'CLASSE_CHIUSA', "L'Officina è chiusa: il prof la riapre alla prossima lezione");
  const { progetto, voce, lavoro } = compitoAperto(ctx.allievo, testo(body.compitoId, 64));
  if (voce.stato === 'finito') throw new ApiError(403, 'FINITO', 'Hai già finito questo compito!');
  const fasi = fasiDi(progetto, uid);
  return { progetto, lavoro, fasi, esercizio: fasi[lavoro.fasi] };
}

/** La fase che l'allievo sta consegnando: i controlli, uguali nei due tempi della consegna. */
function faseInConsegna(ctx: Contesto, body: Record<string, unknown>, uid: string) {
  const aperto = lavoroInCorso(ctx, body, uid);
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

  const prima = faseInConsegna(await contesto(body, utente), body, utente.uid);
  const valutazione = await verificaConsegna(prima.esercizio, codice);

  return getDb().runTransaction(async (tx) => {
    const ctx = await contesto(body, utente, tx);
    const { progetto, lavoro, fasi, f } = faseInConsegna(ctx, body, utente.uid);
    const salva = (dati: Partial<LavoroDoc>) =>
      tx.set(ctx.allievoRef, { lavori: { [progetto]: { ...lavoro, ...dati, ultimoAt: Timestamp.now() } } }, { merge: true });

    if (!valutazione.promosso) {
      salva({
        bozza: codice,
        errori: lavoro.errori + 1,
        erroriFase: { ...lavoro.erroriFase, [String(f)]: (lavoro.erroriFase?.[String(f)] ?? 0) + 1 },
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
    });
    const seguente = finito ? undefined : fasi[nuoveFasi];
    return {
      promosso: true,
      output: valutazione.output,
      schermo: valutazione.schermo,
      fasi: nuoveFasi,
      finito,
      voto: finito ? votoSeFinisce(lavoro.consigli) : null,
      votoSeFinisci: votoSeFinisce(lavoro.consigli),
      esercizio: seguente ? { ...esercizioPerAllievo(seguente), codiceIniziale: codice } : null,
    };
  });
}

/* -------------------------------------------------------------------- tutor */

const domandeRimaste = (consigli: number) => Math.max(0, MAX_DOMANDE_TUTOR - consigli);

/**
 * Una domanda al tutor: costa un punto (fino al pavimento, poi è gratis ma si conta),
 * fino al tetto di MAX_DOMANDE_TUTOR per compito.
 */
export async function tutor(body: Record<string, unknown>, utente: Utente) {
  limita(utente);
  const domanda = typeof body.domanda === 'string' ? body.domanda.replace(/\r\n?/g, '\n').trim().slice(0, MAX_DOMANDA_TUTOR) : '';
  const codice = typeof body.codice === 'string' ? body.codice.slice(0, 6000) : '';

  const ctx = await contesto(body, utente);
  const { progetto, lavoro, esercizio } = lavoroInCorso(ctx, body, utente.uid);
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
      scheda: schedaCompito(progetto, semeDi(utente.uid, progetto)),
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
    const fresco = snap.data() as AllievoOfficinaDoc | undefined;
    const attuale = fresco?.lavori?.[progetto] ?? lavoroVuoto();
    const scambio = { fase: lavoro.fasi, domanda, risposta, at: Timestamp.now() };
    tx.set(
      ctx.allievoRef,
      { lavori: { [progetto]: { ...attuale, bozza: codice || attuale.bozza, consigli: attuale.consigli + 1, tutor: [...(attuale.tutor ?? []), scambio] } } },
      { merge: true },
    );
    return attuale.consigli + 1;
  });

  return { risposta, consigli, domandeRimaste: domandeRimaste(consigli), votoSeFinisci: votoSeFinisce(consigli), fase: lavoro.fasi + 1 };
}
