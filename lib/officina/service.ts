/* Le API dell'allievo nell'Officina: entrare in una classe, vedere i compiti, lavorare su
 * un compito fase per fase, chiedere al tutor. L'allievo è riconosciuto dall'account
 * Google della scuola (auth.ts); i parametri del compito sono suoi (regole.ts).
 *
 * Come nel Giro: validazione solo qui, al client arriva solo la fase da fare adesso. */
import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebaseAdmin';
import { esercizioPerAllievo, type Esercizio } from '@/lib/giro/esercizi';
import { ApiError } from '@/lib/giro/http';
import { valutaRisposta } from '@/lib/giro/hint';
import { esegui } from '@/lib/giro/interprete';
import { generaCronoscalata, schedaProgetto } from '@/lib/giro/progetti';
import { richiestaAmmessa } from '@/lib/giro/rateLimit';
import type { Utente } from './auth';
import { FASI_PER_COMPITO, semeDa, votoLavoro, votoSeFinisce } from './regole';
import {
  allieviRef,
  appartenenzeRef,
  classiRef,
  lavoroVuoto,
  ms,
  scaduto,
  trovaClassePerCodice,
  type AllievoOfficinaDoc,
  type AppartenenzaDoc,
  type ClasseDoc,
  type CompitoDoc,
  type LavoroDoc,
} from './store';
import { chiediTutor } from './tutor';
import { MAX_DOMANDA_TUTOR } from './tutorPrompt';

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

/* -------------------------------------------------------------------- entra */

/** Entra in una classe con il codice: una volta sola, poi l'account basta. */
export async function entra(body: Record<string, unknown>, utente: Utente) {
  limita(utente);
  const codice = testo(body.codice, 8).toUpperCase();
  if (!codice) throw new ApiError(400, 'INVALID_BODY', 'Manca il codice della classe');
  const classe = await trovaClassePerCodice(codice);
  if (!classe) throw new ApiError(404, 'CLASSE_NON_TROVATA', 'Codice inesistente: chiedilo al prof');

  const allievoRef = allieviRef(classe.id).doc(utente.uid);
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
      { nome: utente.nome, email: utente.email, classi: FieldValue.arrayUnion(classe.id) },
      { merge: true },
    );
  });
  return { classeId: classe.id, nome: classe.dati.nome };
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
  if (!classe || !allievo) throw new ApiError(404, 'CLASSE_NON_TROVATA', 'Non sei in questa classe: entra con il codice');
  return { classeId, classe, allievo, allievoRef };
}

function compitoDi(classe: ClasseDoc, compitoId: string): CompitoDoc {
  const compito = classe.compiti.find((c) => c.id === compitoId && !c.ritirato);
  if (!compito) throw new ApiError(404, 'COMPITO_NON_TROVATO', 'Questo compito non c\'è più');
  return compito;
}

const semeDi = (uid: string, compitoId: string) => semeDa(`${uid}|${compitoId}`);

function fasiDi(compito: CompitoDoc, uid: string): Esercizio[] {
  return generaCronoscalata(compito.progetto, semeDi(uid, compito.id));
}

/** Lo stato di un lavoro visto dall'allievo (senza esercizi). */
function riassunto(compito: CompitoDoc, lavoro: LavoroDoc | undefined) {
  const l = lavoro ?? lavoroVuoto();
  const finito = l.fasi >= FASI_PER_COMPITO;
  return {
    id: compito.id,
    progetto: compito.progetto,
    scadenzaAt: ms(compito.scadenzaAt),
    scaduto: scaduto(compito),
    fasi: l.fasi,
    fasiTotali: FASI_PER_COMPITO,
    consigli: l.consigli,
    finito,
    // Il voto si vede quando è fissato: finito, scaduto, oppure scritto a mano dal docente.
    voto:
      finito || scaduto(compito) || typeof l.votoDocente === 'number'
        ? votoLavoro({ fasi: l.fasi, consigli: l.consigli, finito, votoDocente: l.votoDocente })
        : null,
    votoSeFinisci: votoSeFinisce(l.consigli),
  };
}

/* ------------------------------------------------------------------ compiti */

/** I compiti assegnati alla classe, con lo stato del lavoro di questo allievo. */
export async function compiti(body: Record<string, unknown>, utente: Utente) {
  const ctx = await contesto(body, utente);
  const assegnati = ctx.classe.compiti.filter((c) => !c.ritirato);
  return {
    classe: { id: ctx.classeId, nome: ctx.classe.nome, chiusa: ctx.classe.chiusa },
    compiti: assegnati.map((c) => ({ ...riassunto(c, ctx.allievo.lavori?.[c.id]), titolo: schedaProgetto(c.progetto, 1).titolo })),
  };
}

/** Il compito aperto: scheda, fase da fare, codice da cui ripartire, conversazione col tutor. */
export async function compito(body: Record<string, unknown>, utente: Utente) {
  const ctx = await contesto(body, utente);
  const c = compitoDi(ctx.classe, testo(body.compitoId, 64));
  const lavoro = ctx.allievo.lavori?.[c.id] ?? lavoroVuoto();
  const fasi = fasiDi(c, utente.uid);
  const stato = riassunto(c, lavoro);
  const esercizio = !stato.finito && !stato.scaduto ? fasi[lavoro.fasi] : undefined;
  // Si riparte dall'ultima consegna, giusta o no; altrimenti dal codice della fase prima.
  const daCui = lavoro.bozza || (lavoro.fasi > 0 ? lavoro.codice?.[String(lavoro.fasi - 1)] : '') || '';
  return {
    ...stato,
    scheda: schedaProgetto(c.progetto, semeDi(utente.uid, c.id)),
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

/** Controlli comuni a consegna e tutor: classe aperta, compito in corso, fase giusta. */
function lavoroInCorso(ctx: Contesto, body: Record<string, unknown>, uid: string) {
  if (ctx.classe.chiusa) throw new ApiError(403, 'CLASSE_CHIUSA', 'La classe è chiusa');
  const c = compitoDi(ctx.classe, testo(body.compitoId, 64));
  if (scaduto(c)) throw new ApiError(403, 'SCADUTO', 'Il compito è scaduto: non si consegna più');
  const lavoro = ctx.allievo.lavori?.[c.id] ?? lavoroVuoto();
  if (lavoro.fasi >= FASI_PER_COMPITO) throw new ApiError(403, 'FINITO', 'Hai già finito questo compito!');
  const fasi = fasiDi(c, uid);
  return { c, lavoro, fasi, esercizio: fasi[lavoro.fasi] };
}

/**
 * Consegna di una fase. Il codice si salva sempre come bozza, giusto o sbagliato: alla
 * riapertura l'allievo ritrova quello che aveva scritto.
 */
export async function consegna(body: Record<string, unknown>, utente: Utente) {
  limita(utente);
  const codice = typeof body.codice === 'string' ? body.codice.slice(0, 6000) : '';
  return getDb().runTransaction(async (tx) => {
    const ctx = await contesto(body, utente, tx);
    const { c, lavoro, fasi, esercizio } = lavoroInCorso(ctx, body, utente.uid);
    const f = intero(body.fase);
    if (f !== lavoro.fasi) {
      throw new ApiError(409, 'FASE_SBAGLIATA', `Stai consegnando la fase ${f + 1} ma sei alla fase ${lavoro.fasi + 1}: ricarica la pagina`);
    }
    const base = `lavori.${c.id}`;
    const valutazione = valutaRisposta(esercizio, codice);
    if (!valutazione.promosso) {
      tx.set(
        ctx.allievoRef,
        {
          lavori: {
            [c.id]: {
              ...lavoro,
              bozza: codice,
              errori: lavoro.errori + 1,
              erroriFase: { ...lavoro.erroriFase, [String(f)]: (lavoro.erroriFase?.[String(f)] ?? 0) + 1 },
              ultimoAt: Timestamp.now(),
            },
          },
        },
        { merge: true },
      );
      return { promosso: false, hint: valutazione.hint, output: valutazione.output, schermo: valutazione.schermo, errori: lavoro.errori + 1 };
    }

    const nuoveFasi = f + 1;
    const finito = nuoveFasi >= FASI_PER_COMPITO;
    const ora = Timestamp.now();
    tx.set(
      ctx.allievoRef,
      {
        lavori: {
          [c.id]: {
            ...lavoro,
            fasi: nuoveFasi,
            fasiAt: { ...lavoro.fasiAt, [String(f)]: ora },
            codice: { ...lavoro.codice, [String(f)]: codice },
            bozza: '',
            ultimoAt: ora,
            finitoAt: finito ? ora : (lavoro.finitoAt ?? null),
          },
        },
      },
      { merge: true },
    );
    void base;
    const seguente = finito ? undefined : fasi[nuoveFasi];
    return {
      promosso: true,
      output: valutazione.output,
      schermo: valutazione.schermo,
      fasi: nuoveFasi,
      finito,
      voto: finito ? votoLavoro({ fasi: nuoveFasi, consigli: lavoro.consigli, finito: true, votoDocente: lavoro.votoDocente }) : null,
      votoSeFinisci: votoSeFinisce(lavoro.consigli),
      esercizio: seguente ? { ...esercizioPerAllievo(seguente), codiceIniziale: codice } : null,
    };
  });
}

/* -------------------------------------------------------------------- tutor */

/** Una domanda al tutor: costa un punto. La chiamata al modello sta fuori dalla transazione. */
export async function tutor(body: Record<string, unknown>, utente: Utente) {
  limita(utente);
  const domanda = typeof body.domanda === 'string' ? body.domanda.replace(/\r\n?/g, '\n').trim().slice(0, MAX_DOMANDA_TUTOR) : '';
  const codice = typeof body.codice === 'string' ? body.codice.slice(0, 6000) : '';

  const ctx = await contesto(body, utente);
  const { c, lavoro, esercizio } = lavoroInCorso(ctx, body, utente.uid);
  const esito = esegui(codice, esercizio.prove?.[0] ? { risposte: esercizio.prove[0].risposte } : {});
  const valutazione = codice.trim() ? valutaRisposta(esercizio, codice) : null;
  const risposta = await chiediTutor(
    {
      scheda: schedaProgetto(c.progetto, semeDi(utente.uid, c.id)),
      fase: lavoro.fasi + 1,
      fasiTotali: FASI_PER_COMPITO,
      esercizio,
      codice,
      esito: esito.ok ? { output: esito.output } : { errore: esito.errore.messaggio },
      hint: valutazione?.hint ?? null,
      domanda,
      precedenti: [],
    },
    (lavoro.tutor ?? []).map((s) => ({ fase: s.fase + 1, domanda: s.domanda, risposta: s.risposta })),
  );

  const consigli = await getDb().runTransaction(async (tx) => {
    const snap = await tx.get(ctx.allievoRef);
    const fresco = snap.data() as AllievoOfficinaDoc | undefined;
    const attuale = fresco?.lavori?.[c.id] ?? lavoroVuoto();
    const scambio = { fase: lavoro.fasi, domanda, risposta, at: Timestamp.now() };
    tx.set(
      ctx.allievoRef,
      { lavori: { [c.id]: { ...attuale, bozza: codice || attuale.bozza, consigli: attuale.consigli + 1, tutor: [...(attuale.tutor ?? []), scambio] } } },
      { merge: true },
    );
    return attuale.consigli + 1;
  });

  return { risposta, consigli, votoSeFinisci: votoSeFinisce(consigli), fase: lavoro.fasi + 1 };
}
