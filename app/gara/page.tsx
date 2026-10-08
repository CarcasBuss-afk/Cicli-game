'use client';

/* La gara dalla parte dell'allievo. Un Giro è fatto di tappe che il docente apre una alla
 * volta; dentro la tappa si corrono i chilometri, cioè gli esercizi. Lo spirito è quello
 * di PRINT RUSH: il chilometro superato vola via e arriva subito il prossimo, l'errore non
 * toglie niente e porta un suggerimento.
 *
 * La pagina chiede lo stato al server ogni dieci secondi: così si accorge da sola quando
 * il prof apre o chiude una tappa. Il tempo che resta lo calcola il server, perché
 * l'orologio dei PC d'aula non è affidabile. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import EditorPython from '@/components/EditorPython';
import Testo from '@/components/Testo';
import {
  leggiIdentita,
  messaggioErrore,
  status,
  submit,
  type Identita,
  type RispostaStatus,
} from '@/lib/giro/client';
import { sbloccaSuoni, suonoErrore, suonoTappa, suonoTraguardo, suonoVia, whoosh } from '@/lib/giro/suoni';

const AGGIORNA_MS = 10_000;
const DURATA_VOLO_MS = 450;

const TERRENI = {
  pianura: { icona: '🚴', nome: 'Pianura', colore: 'text-(--color-verde)' },
  collina: { icona: '🚵', nome: 'Collina', colore: 'text-(--color-giallo)' },
  montagna: { icona: '🏔️', nome: 'Salita', colore: 'text-(--color-rosa)' },
} as const;

export default function Gara() {
  const router = useRouter();
  const [identita, setIdentita] = useState<Identita | null>(null);
  const [stato, setStato] = useState<RispostaStatus | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [risposta, setRisposta] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [output, setOutput] = useState<string[] | null>(null);
  const [animazione, setAnimazione] = useState<'vola' | 'scuoti' | 'entra' | null>(null);
  const [invio, setInvio] = useState(false);
  const [serie, setSerie] = useState(0);
  /** Istante (orologio di questo PC) in cui scade la tappa, ricavato dai secondi del server. */
  const [scadenza, setScadenza] = useState<number | null>(null);
  const [adesso, setAdesso] = useState(() => Date.now());
  const rispostaRef = useRef('');
  const tappaPrima = useRef<number | null>(null);

  rispostaRef.current = risposta;

  // Identità dal localStorage: senza quella non si corre.
  useEffect(() => {
    const i = leggiIdentita();
    if (!i) {
      router.replace('/');
      return;
    }
    setIdentita(i);
  }, [router]);

  const aggiorna = useCallback(async (i: Identita) => {
    try {
      const s = await status(i);
      setStato(s);
      setErrore(null);
      const aperta = s.tappa?.indice ?? null;
      // Il prof ha appena aperto una tappa: si sente.
      if (aperta !== null && aperta !== tappaPrima.current) suonoVia();
      tappaPrima.current = aperta;
      setScadenza(s.tappa?.secondiRimasti != null ? Date.now() + s.tappa.secondiRimasti * 1000 : null);
      return s;
    } catch (e) {
      setErrore(messaggioErrore(e));
      return null;
    }
  }, []);

  useEffect(() => {
    if (!identita) return;
    void aggiorna(identita);
    const timer = setInterval(() => void aggiorna(identita), AGGIORNA_MS);
    return () => clearInterval(timer);
  }, [identita, aggiorna]);

  // Il cronometro gira solo se c'è una scadenza.
  useEffect(() => {
    if (scadenza === null) return;
    const timer = setInterval(() => setAdesso(Date.now()), 500);
    return () => clearInterval(timer);
  }, [scadenza]);

  const tappa = stato?.tappa ?? null;
  const secondi = scadenza === null ? null : Math.max(0, Math.ceil((scadenza - adesso) / 1000));
  const tempoFinito = tappa?.scaduta || secondi === 0;

  // Allo scadere chiediamo subito lo stato, senza aspettare il giro dei dieci secondi.
  useEffect(() => {
    if (secondi === 0 && identita) void aggiorna(identita);
  }, [secondi, identita, aggiorna]);

  const consegna = useCallback(async () => {
    if (!identita || !tappa || !tappa.esercizio || invio || tempoFinito) return;
    const testo = rispostaRef.current;
    setInvio(true);
    void sbloccaSuoni();
    try {
      const esito = await submit(identita, tappa.indice, tappa.kmFatti, testo);
      setErrore(null);
      if (!esito.promosso) {
        setHint(esito.hint);
        setOutput(esito.output);
        setStato((p) => (p ? { ...p, erroriTotali: esito.erroriTotali } : p));
        setSerie(0);
        suonoErrore();
        setAnimazione('scuoti');
        setTimeout(() => setAnimazione(null), 520);
        setInvio(false);
        return;
      }

      // Chilometro superato: la card vola via, poi entra il prossimo.
      const nuovaSerie = serie + 1;
      setSerie(nuovaSerie);
      setHint(null);
      setOutput(null);
      whoosh();
      suonoTappa(nuovaSerie - 1);
      setAnimazione('vola');
      setTimeout(() => {
        setStato((p) =>
          p && p.tappa
            ? {
                ...p,
                erroriTotali: esito.erroriTotali,
                tappa: {
                  ...p.tappa,
                  kmFatti: esito.kmFatti,
                  finita: esito.finita,
                  ordineArrivo: esito.ordineArrivo,
                  esercizio: esito.esercizio,
                },
              }
            : p,
        );
        setRisposta('');
        setAnimazione(esito.finita ? null : 'entra');
        setInvio(false);
        if (esito.finita) suonoTraguardo();
        else setTimeout(() => setAnimazione(null), 360);
      }, DURATA_VOLO_MS);
    } catch (e) {
      setErrore(messaggioErrore(e));
      setInvio(false);
      // Tappa chiusa, tempo scaduto, pagina fuori sincrono: si rilegge lo stato.
      void aggiorna(identita);
    }
  }, [identita, tappa, invio, tempoFinito, serie, aggiorna]);

  /* ----------------------------------------------------------------- schermate */

  if (!identita || (!stato && !errore)) return <Schermo titolo="Un attimo…" />;

  if (!stato) {
    return (
      <Schermo titolo="Connessione persa">
        <p className="text-(--color-testo-tenue)">{errore}</p>
        <button onClick={() => void aggiorna(identita)} className={BOTTONE}>
          Riprova
        </button>
      </Schermo>
    );
  }

  const testa = (
    <p className="text-(--color-testo-tenue)">
      {stato.name}
      {stato.numero !== null && <span className="ml-2 font-mono text-(--color-rosa)">n. {stato.numero}</span>}
      <span> · classe {stato.classLabel}</span>
    </p>
  );

  if (stato.sessionStatus === 'closed') {
    return (
      <Schermo titolo={stato.singola ? 'Gara finita' : 'Il Giro è finito'} icona="🏁">
        {testa}
        {!stato.singola && stato.generale && <Generale g={stato.generale} />}
        {stato.singola && stato.ultimaTappa && <RisultatoTappa r={stato.ultimaTappa} />}
        <p className="text-(--color-testo-tenue)">Guarda la classifica alla LIM 🏆</p>
      </Schermo>
    );
  }

  // Nessuna tappa aperta: prima del via o fra una tappa e l'altra.
  if (!tappa) {
    const primaVolta = stato.sessionStatus === 'waiting' || stato.tappeCorse === 0;
    return (
      <Schermo titolo={primaVolta ? `Ciao ${stato.name}!` : 'Tappa chiusa'} icona={primaVolta ? '⏳' : '🏁'}>
        {testa}
        {primaVolta && stato.numero !== null && <NumeroDiCorsa numero={stato.numero} />}
        {!primaVolta && stato.ultimaTappa && <RisultatoTappa r={stato.ultimaTappa} />}
        {!primaVolta && !stato.singola && stato.generale && <Generale g={stato.generale} />}
        <p className="text-xl font-bold">
          {primaVolta ? 'Aspetta che il prof apra la prima tappa.' : 'Aspetta la prossima tappa.'}
        </p>
        <p className="text-sm text-(--color-testo-tenue)">La pagina parte da sola.</p>
      </Schermo>
    );
  }

  if (tappa.finita) {
    const medaglia =
      tappa.ordineArrivo === 1 ? '🥇' : tappa.ordineArrivo === 2 ? '🥈' : tappa.ordineArrivo === 3 ? '🥉' : '🏁';
    return (
      <Schermo titolo={stato.singola ? 'Hai finito la gara!' : 'Hai finito la tappa!'} icona={medaglia}>
        {testa}
        {tappa.ordineArrivo !== null && <p className="text-2xl font-bold">Sei arrivato {tappa.ordineArrivo}°</p>}
        <p className="text-(--color-testo-tenue)">
          {tappa.km} km su {tappa.km} · {stato.erroriTotali} {stato.erroriTotali === 1 ? 'errore' : 'errori'} lungo
          la strada
        </p>
        <p className="text-(--color-testo-tenue)">Guarda la classifica alla LIM 🏆</p>
      </Schermo>
    );
  }

  if (tempoFinito) {
    return (
      <Schermo titolo="Tempo scaduto!" icona="⏱️">
        {testa}
        <p className="text-2xl font-bold">
          Hai percorso {tappa.kmFatti} km su {tappa.km}
        </p>
        <p className="text-(--color-testo-tenue)">Aspetta la classifica della tappa: la pagina parte da sola.</p>
      </Schermo>
    );
  }

  const es = tappa.esercizio;
  if (!es) {
    return (
      <Schermo titolo="Un attimo…">
        <button onClick={() => void aggiorna(identita)} className={BOTTONE}>
          Aggiorna
        </button>
      </Schermo>
    );
  }

  const terreno = TERRENI[es.terreno];
  const scriveOutput = es.risposta === 'output';
  // Cambia a ogni chilometro: è il segnale per l'editor di ripartire dal testo iniziale.
  const chiaveKm = tappa.indice * 1000 + tappa.kmFatti;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 p-4 sm:p-6">
      {/* Intestazione: chi sei, quale tappa, quanto manca */}
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-bold">
            {stato.name}
            {stato.numero !== null && <span className="ml-2 font-mono text-(--color-rosa)">n. {stato.numero}</span>}
          </p>
          <p className="text-sm text-(--color-testo-tenue)">
            {stato.singola ? tappa.nomeTema : `Tappa ${tappa.indice + 1} · ${tappa.nomeTema}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black">
            Km {tappa.kmFatti + 1}
            <span className="text-base font-normal text-(--color-testo-tenue)"> di {tappa.km}</span>
          </p>
          <p className={`text-sm font-bold ${terreno.colore}`}>
            {terreno.icona} {terreno.nome}
          </p>
        </div>
        {secondi !== null && <Cronometro secondi={secondi} />}
      </header>

      <Strada fatti={tappa.kmFatti} totale={tappa.km} />

      {/* Il chilometro */}
      <section
        className={`flex flex-col gap-4 rounded-2xl border border-(--color-bordo) bg-(--color-fondo-card) p-5 ${
          animazione === 'vola' ? 'vola-via' : animazione === 'scuoti' ? 'scuoti' : animazione === 'entra' ? 'entra' : ''
        }`}
      >
        <h1 className="text-xl font-bold">
          <Testo>{es.consegna}</Testo>
        </h1>

        {es.codiceMostrato && (
          <pre className="overflow-x-auto rounded-xl border border-(--color-bordo) bg-black/40 p-4 font-mono text-[1.05rem] text-(--color-giallo)">
            {es.codiceMostrato}
          </pre>
        )}

        {es.outputAtteso && es.outputSbagliato ? (
          // Caccia all'errore: quello che deve stampare accanto a quello che stampa adesso.
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-sm font-bold text-(--color-testo-tenue)">Deve stampare:</p>
              <pre className="overflow-x-auto rounded-xl border border-(--color-verde)/40 bg-(--color-verde)/5 p-4 font-mono text-[1.05rem] text-(--color-verde)">
                {es.outputAtteso.join('\n')}
              </pre>
            </div>
            <div>
              <p className="mb-1 text-sm font-bold text-(--color-testo-tenue)">Invece adesso stampa:</p>
              <pre className="overflow-x-auto rounded-xl border border-red-500/40 bg-red-500/5 p-4 font-mono text-[1.05rem] text-red-300">
                {es.outputSbagliato.length > 0 ? es.outputSbagliato.join('\n') : '(niente)'}
              </pre>
            </div>
          </div>
        ) : (
          es.outputAtteso && (
            <div>
              <p className="mb-1 text-sm font-bold text-(--color-testo-tenue)">Deve stampare:</p>
              <pre className="overflow-x-auto rounded-xl border border-(--color-verde)/40 bg-(--color-verde)/5 p-4 font-mono text-[1.05rem] text-(--color-verde)">
                {es.outputAtteso.join('\n')}
              </pre>
            </div>
          )
        )}

        {scriveOutput ? (
          <textarea
            key={chiaveKm}
            value={risposta}
            onChange={(e) => setRisposta(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                void consegna();
              }
            }}
            rows={Math.max(4, risposta.split('\n').length + 1)}
            autoFocus
            spellCheck={false}
            placeholder={es.segnapostoRisposta ?? 'una riga per ogni print\n…'}
            className="w-full rounded-xl border border-(--color-bordo) bg-black/40 p-4 font-mono text-[1.05rem] outline-none focus:border-(--color-rosa)"
          />
        ) : (
          <EditorPython
            valoreIniziale={es.codiceIniziale ?? ''}
            tappa={chiaveKm}
            onChange={setRisposta}
            onConsegna={() => void consegna()}
            attivo={!invio}
          />
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => void consegna()} disabled={invio} className={BOTTONE}>
            {invio ? '…' : scriveOutput ? 'Controlla ▶' : 'Esegui ▶'}
          </button>
          <span className="text-sm text-(--color-testo-tenue)">
            oppure <kbd className="rounded bg-black/40 px-1.5 py-0.5 font-mono">Ctrl</kbd>+
            <kbd className="rounded bg-black/40 px-1.5 py-0.5 font-mono">Invio</kbd>
          </span>
          {serie >= 2 && (
            <span className="ml-auto text-sm font-bold text-(--color-giallo)">🔥 {serie} km di fila</span>
          )}
        </div>
      </section>

      {/* Che cosa ha stampato il suo codice */}
      {output && output.length > 0 && (
        <section>
          <p className="mb-1 text-sm font-bold text-(--color-testo-tenue)">Il tuo codice ha stampato:</p>
          <pre className="overflow-x-auto rounded-xl border border-(--color-bordo) bg-black/40 p-4 font-mono text-[1.05rem]">
            {output.join('\n')}
          </pre>
        </section>
      )}

      {hint && (
        <section role="status" className="rounded-xl border border-(--color-giallo)/40 bg-(--color-giallo)/10 p-4 text-[1.05rem]">
          <span aria-hidden>💡 </span>
          <Testo>{hint}</Testo>
        </section>
      )}

      {errore && (
        <section role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">
          {errore}
          <button onClick={() => void aggiorna(identita)} className="ml-3 underline">
            Riprova
          </button>
        </section>
      )}

      <footer className="mt-auto pt-4 text-center text-sm text-(--color-testo-tenue)">
        Gli errori non tolgono punti: costano solo tempo. Conta chi arriva più lontano.
      </footer>
    </main>
  );
}

/* ------------------------------------------------------------------ pezzi di UI */

const BOTTONE =
  'rounded-lg bg-(--color-rosa) px-5 py-2.5 text-lg font-bold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40';

/** Il numero di corsa, come il dorsale dei ciclisti: serve a rientrare da un altro PC. */
function NumeroDiCorsa({ numero }: { numero: number }) {
  return (
    <div className="my-2 rounded-2xl border-2 border-(--color-rosa) bg-(--color-rosa)/10 px-8 py-4">
      <p className="text-sm text-(--color-testo-tenue)">Il tuo numero di corsa</p>
      <p className="font-mono text-6xl font-black text-(--color-rosa)">{numero}</p>
      <p className="mt-1 text-sm text-(--color-testo-tenue)">Serve per rientrare se cambi computer</p>
    </div>
  );
}

/** I chilometri della tappa come caselle: quelli fatti sono accesi. */
function Strada({ fatti, totale }: { fatti: number; totale: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${fatti} km su ${totale}`}>
      {Array.from({ length: totale }, (_, i) => (
        <div
          key={i}
          className={`h-2.5 flex-1 rounded-full ${
            i < fatti ? 'bg-(--color-rosa)' : i === fatti ? 'bg-(--color-giallo)' : 'bg-(--color-bordo)'
          }`}
        />
      ))}
    </div>
  );
}

/** Il tempo che resta alla tappa; nell'ultimo minuto diventa rosso. */
function Cronometro({ secondi }: { secondi: number }) {
  const mm = Math.floor(secondi / 60);
  const ss = String(secondi % 60).padStart(2, '0');
  return (
    <p
      aria-label="tempo rimasto"
      className={`w-full text-center font-mono text-3xl font-black sm:w-auto ${
        secondi <= 60 ? 'text-red-400' : 'text-(--color-testo)'
      }`}
    >
      ⏱ {mm}:{ss}
    </p>
  );
}

function RisultatoTappa({ r }: { r: NonNullable<RispostaStatus['ultimaTappa']> }) {
  return (
    <div className="rounded-xl border border-(--color-bordo) bg-(--color-fondo-card) px-6 py-4">
      <p className="text-sm text-(--color-testo-tenue)">
        Tappa {r.indice + 1} · {r.nomeTema}
      </p>
      <p className="text-2xl font-bold">{r.posizione}° posto</p>
      <p className="text-(--color-testo-tenue)">
        {r.kmFatti} km su {r.km} · {r.punti} {r.punti === 1 ? 'punto' : 'punti'}
      </p>
    </div>
  );
}

function Generale({ g }: { g: NonNullable<RispostaStatus['generale']> }) {
  return (
    <div className="rounded-xl border border-(--color-rosa)/50 bg-(--color-rosa)/10 px-6 py-4">
      <p className="text-sm text-(--color-testo-tenue)">Classifica generale</p>
      <p className="text-2xl font-bold">
        {g.posizione}° su {g.corridori}
      </p>
      <p className="text-(--color-testo-tenue)">{g.punti} punti</p>
    </div>
  );
}

/** Schermata a tutto campo per attesa, traguardo, errori. */
function Schermo({ titolo, icona, children }: { titolo: string; icona?: string; children?: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
      {icona && (
        <p className="text-6xl" aria-hidden>
          {icona}
        </p>
      )}
      <h1 className="text-3xl font-black text-(--color-rosa)">{titolo}</h1>
      {children}
    </main>
  );
}
