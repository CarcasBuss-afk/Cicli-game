'use client';
/* La «Prova»: l'allievo esegue il suo programma nel browser come in un terminale, con i
 * dati che vuole lui. A ogni `input()` compare la domanda e lui risponde; `randint` dà un
 * numero casuale vero. Non è una consegna: niente server, niente errori contati, niente
 * confronto con l'output atteso. Serve a sperimentare i casi («e con 2 panini?») prima di
 * consegnare. Il micro-interprete è un modulo puro senza segreti dentro: può girare qui.
 *
 * Il programma è deterministico, quindi a ogni risposta nuova si riesegue da capo con
 * tutte le risposte date fin lì: lo schermo si allunga di una domanda alla volta. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { esegui, type Esito } from '@/lib/giro/interprete';

interface Props {
  /** Il codice com'è adesso nell'editor. */
  codice(): string;
  /** Quando cambia, la prova in corso si chiude: è una fase nuova. */
  fase: number;
  attivo: boolean;
}

export default function Prova({ codice, fase, attivo }: Props) {
  const [esito, setEsito] = useState<Esito | null>(null);
  const [risposte, setRisposte] = useState<string[]>([]);
  const [digitato, setDigitato] = useState('');
  const campo = useRef<HTMLInputElement>(null);
  const fondo = useRef<HTMLDivElement>(null);

  const lancia = useCallback(
    (date: string[]) => {
      setRisposte(date);
      setDigitato('');
      setEsito(esegui(codice(), { risposte: date, interattivo: true }));
    },
    [codice],
  );

  useEffect(() => {
    setEsito(null);
    setRisposte([]);
  }, [fase]);

  useEffect(() => {
    if (!esito) return;
    campo.current?.focus();
    fondo.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [esito]);

  const rispondi = () => {
    if (!esito || esito.ok || !esito.attesaInput) return;
    lancia([...risposte, digitato]);
  };

  const inAttesa = esito && !esito.ok && esito.attesaInput !== undefined;
  const righe = esito?.schermo ?? [];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => lancia([])}
          disabled={!attivo}
          className="rounded-lg border-2 border-(--color-verde) px-5 py-2 text-lg font-bold text-(--color-verde) hover:bg-(--color-verde)/10 disabled:opacity-40"
        >
          {esito ? 'Riprova ▶' : 'Prova ▶'}
        </button>
        <span className="text-sm text-(--color-testo-tenue)">Gira qui, con le risposte che vuoi tu: non è una consegna e non conta niente.</span>
      </div>
      {esito && (
        <section aria-label="la tua prova" className="rounded-xl border border-(--color-verde)/40 bg-black/60 p-4 font-mono text-[1.05rem]">
          {righe.map((r, i) =>
            r.k === 'out' ? (
              <div key={i}>{r.v || ' '}</div>
            ) : (
              <div key={i} className="text-(--color-testo-tenue)">
                {r.domanda}
                <span className="text-(--color-verde)">{r.risposta}</span>
              </div>
            ),
          )}
          {inAttesa && (
            <form
              className="flex items-center gap-0 text-(--color-testo-tenue)"
              onSubmit={(e) => {
                e.preventDefault();
                rispondi();
              }}
            >
              <label htmlFor="prova-risposta" className="whitespace-pre">
                {esito.attesaInput}
              </label>
              <input
                id="prova-risposta"
                ref={campo}
                value={digitato}
                onChange={(e) => setDigitato(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                aria-label="la tua risposta"
                className="min-w-24 flex-1 border-b border-(--color-verde)/60 bg-transparent font-mono text-(--color-verde) outline-none"
              />
            </form>
          )}
          {esito.ok && (
            <div className="mt-2 text-sm text-(--color-testo-tenue)">
              — fine del programma{esito.output.length === 0 ? ': non ha stampato niente' : ''} —
            </div>
          )}
          {!esito.ok && !inAttesa && (
            <div role="alert" className="mt-2 text-red-300">
              ✖ {esito.errore.messaggio}
              {esito.errore.riga !== null && <span className="text-red-300/70"> (riga {esito.errore.riga})</span>}
            </div>
          )}
          <div ref={fondo} />
        </section>
      )}
    </div>
  );
}
