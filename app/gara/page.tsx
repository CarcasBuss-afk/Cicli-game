'use client';

/* La gara: una tappa alla volta, mini-editor, hint. Lo spirito è quello di PRINT RUSH:
 * la tappa superata vola via e arriva subito la prossima, l'errore non toglie niente e
 * porta un suggerimento. */
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

const ATTESA_VIA_MS = 10_000;
const DURATA_VOLO_MS = 450;

const TERRENI = {
  pianura: { icona: '🚴', nome: 'Pianura', colore: 'text-(--color-verde)' },
  collina: { icona: '🚵', nome: 'Collina', colore: 'text-(--color-giallo)' },
  montagna: { icona: '🏔️', nome: 'Tappone', colore: 'text-(--color-rosa)' },
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
  const rispostaRef = useRef('');
  const eraInAttesa = useRef(false);

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
      // Il prof ha dato il via mentre eravamo in attesa: si sente.
      if (eraInAttesa.current && s.sessionStatus === 'running') suonoVia();
      eraInAttesa.current = s.sessionStatus === 'waiting';
      return s;
    } catch (e) {
      setErrore(messaggioErrore(e));
      return null;
    }
  }, []);

  useEffect(() => {
    if (!identita) return;
    void aggiorna(identita);
  }, [identita, aggiorna]);

  // In attesa del via la pagina riprova da sola.
  useEffect(() => {
    if (!identita || stato?.sessionStatus !== 'waiting') return;
    const timer = setInterval(() => void aggiorna(identita), ATTESA_VIA_MS);
    return () => clearInterval(timer);
  }, [identita, stato?.sessionStatus, aggiorna]);

  const tappa = stato?.tappa ?? null;

  const consegna = useCallback(async () => {
    if (!identita || !stato || !tappa || invio) return;
    const testo = rispostaRef.current;
    setInvio(true);
    void sbloccaSuoni();
    try {
      const esito = await submit(identita, stato.tappaCorrente, testo);
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

      // Tappa superata: la card vola via, poi entra la prossima.
      const nuovaSerie = serie + 1;
      setSerie(nuovaSerie);
      setHint(null);
      setOutput(null);
      whoosh();
      suonoTappa(nuovaSerie - 1);
      setAnimazione('vola');
      setTimeout(() => {
        setStato((precedente) =>
          precedente
            ? {
                ...precedente,
                tappaCorrente: esito.tappaCorrente,
                arrivato: esito.arrivato,
                posizione: esito.posizione,
                erroriTotali: esito.erroriTotali,
                tappa: esito.tappa,
              }
            : precedente,
        );
        setRisposta('');
        setAnimazione(esito.arrivato ? null : 'entra');
        setInvio(false);
        if (esito.arrivato) suonoTraguardo();
        else setTimeout(() => setAnimazione(null), 360);
      }, DURATA_VOLO_MS);
    } catch (e) {
      setErrore(messaggioErrore(e));
      setInvio(false);
      // Se la gara è stata chiusa o siamo fuori sincrono, rileggiamo lo stato.
      void aggiorna(identita);
    }
  }, [identita, stato, tappa, invio, serie, aggiorna]);

  /* ----------------------------------------------------------------- schermate */

  if (!identita || (!stato && !errore)) {
    return <Schermo titolo="Un attimo…" />;
  }

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

  if (stato.sessionStatus === 'waiting') {
    return (
      <Schermo titolo={`Ciao ${stato.name}!`} icona="⏳">
        <p className="text-xl text-(--color-testo-tenue)">
          Sei in griglia di partenza con la classe {stato.classLabel}.
        </p>
        {stato.numero !== null && <NumeroDiCorsa numero={stato.numero} />}
        <p className="text-xl font-bold">Aspetta il via del prof.</p>
        <p className="text-sm text-(--color-testo-tenue)">
          Il percorso è di {stato.numTappe} tappe. La pagina parte da sola.
        </p>
      </Schermo>
    );
  }

  if (stato.arrivato) {
    const medaglia = stato.posizione === 1 ? '🥇' : stato.posizione === 2 ? '🥈' : stato.posizione === 3 ? '🥉' : '🏁';
    return (
      <Schermo titolo="Hai finito il Giro!" icona={medaglia}>
        <p className="text-2xl font-bold">
          {stato.posizione ? `Sei arrivato ${stato.posizione}°` : 'Traguardo tagliato'}
        </p>
        <p className="text-(--color-testo-tenue)">
          {stato.numTappe} tappe su {stato.numTappe} · {stato.erroriTotali}{' '}
          {stato.erroriTotali === 1 ? 'errore' : 'errori'} lungo la strada
        </p>
        <p className="text-(--color-testo-tenue)">Guarda la classifica alla LIM 🏆</p>
      </Schermo>
    );
  }

  if (stato.sessionStatus === 'closed') {
    return (
      <Schermo titolo="Gara chiusa" icona="🏁">
        <p className="text-(--color-testo-tenue)">
          Hai completato {stato.tappaCorrente} tappe su {stato.numTappe}. Guarda la classifica alla LIM.
        </p>
      </Schermo>
    );
  }

  if (!tappa) {
    return (
      <Schermo titolo="Un attimo…">
        <button onClick={() => void aggiorna(identita)} className={BOTTONE}>
          Aggiorna
        </button>
      </Schermo>
    );
  }

  const terreno = TERRENI[tappa.terreno];
  const scriveOutput = tappa.risposta === 'output';

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 p-4 sm:p-6">
      {/* Intestazione: chi sei, dove sei nel percorso */}
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-bold">
            {stato.name}
            {stato.numero !== null && (
              <span className="ml-2 font-mono text-(--color-rosa)">n. {stato.numero}</span>
            )}
          </p>
          <p className="text-sm text-(--color-testo-tenue)">classe {stato.classLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black">
            Tappa {stato.tappaCorrente + 1}
            <span className="text-base font-normal text-(--color-testo-tenue)"> di {stato.numTappe}</span>
          </p>
          <p className={`text-sm font-bold ${terreno.colore}`}>
            {terreno.icona} {terreno.nome}
          </p>
        </div>
      </header>

      <Percorso fatte={stato.tappaCorrente} totale={stato.numTappe} />

      {/* La tappa */}
      <section
        className={`flex flex-col gap-4 rounded-2xl border border-(--color-bordo) bg-(--color-fondo-card) p-5 ${
          animazione === 'vola' ? 'vola-via' : animazione === 'scuoti' ? 'scuoti' : animazione === 'entra' ? 'entra' : ''
        }`}
      >
        <h1 className="text-xl font-bold">
          <Testo>{tappa.consegna}</Testo>
        </h1>

        {tappa.codiceMostrato && (
          <pre className="overflow-x-auto rounded-xl border border-(--color-bordo) bg-black/40 p-4 font-mono text-[1.05rem] text-(--color-giallo)">
            {tappa.codiceMostrato}
          </pre>
        )}

        {tappa.outputAtteso && tappa.outputSbagliato ? (
          // Caccia all'errore: quello che deve stampare accanto a quello che stampa adesso.
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-sm font-bold text-(--color-testo-tenue)">Deve stampare:</p>
              <pre className="overflow-x-auto rounded-xl border border-(--color-verde)/40 bg-(--color-verde)/5 p-4 font-mono text-[1.05rem] text-(--color-verde)">
                {tappa.outputAtteso.join('\n')}
              </pre>
            </div>
            <div>
              <p className="mb-1 text-sm font-bold text-(--color-testo-tenue)">Invece adesso stampa:</p>
              <pre className="overflow-x-auto rounded-xl border border-red-500/40 bg-red-500/5 p-4 font-mono text-[1.05rem] text-red-300">
                {tappa.outputSbagliato.length > 0 ? tappa.outputSbagliato.join('\n') : '(niente)'}
              </pre>
            </div>
          </div>
        ) : (
          tappa.outputAtteso && (
            <div>
              <p className="mb-1 text-sm font-bold text-(--color-testo-tenue)">Deve stampare:</p>
              <pre className="overflow-x-auto rounded-xl border border-(--color-verde)/40 bg-(--color-verde)/5 p-4 font-mono text-[1.05rem] text-(--color-verde)">
                {tappa.outputAtteso.join('\n')}
              </pre>
            </div>
          )
        )}

        {scriveOutput ? (
          <textarea
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
            placeholder={tappa.segnapostoRisposta ?? 'una riga per ogni print\n…'}
            className="w-full rounded-xl border border-(--color-bordo) bg-black/40 p-4 font-mono text-[1.05rem] outline-none focus:border-(--color-rosa)"
          />
        ) : (
          <EditorPython
            valoreIniziale={tappa.codiceIniziale ?? ''}
            tappa={stato.tappaCorrente}
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
            <span className="ml-auto text-sm font-bold text-(--color-giallo)">🔥 {serie} tappe di fila</span>
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

      {/* Il suggerimento */}
      {hint && (
        <section
          role="status"
          className="rounded-xl border border-(--color-giallo)/40 bg-(--color-giallo)/10 p-4 text-[1.05rem]"
        >
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
        Gli errori non togliono punti: costano solo tempo. Conta chi arriva più lontano.
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
      <p className="mt-1 text-sm text-(--color-testo-tenue)">
        Serve per rientrare se cambi computer
      </p>
    </div>
  );
}

/** Il percorso come fila di caselle: quelle fatte sono accese. */
function Percorso({ fatte, totale }: { fatte: number; totale: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${fatte} tappe su ${totale}`}>
      {Array.from({ length: totale }, (_, i) => (
        <div
          key={i}
          className={`h-2.5 flex-1 rounded-full ${
            i < fatte ? 'bg-(--color-rosa)' : i === fatte ? 'bg-(--color-giallo)' : 'bg-(--color-bordo)'
          }`}
        />
      ))}
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
