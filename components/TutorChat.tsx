'use client';

/* Il tutor dell'Officina: una conversazione sul compito. Ogni domanda costa un punto e
 * l'allievo lo vede prima di mandarla; la domanda può essere lunga quanto vuole. */
import { useState } from 'react';
import Testo from '@/components/Testo';
import { messaggioErrore, type Scambio } from '@/lib/officina/client';
import { DOMANDE_RAPIDE } from '@/lib/officina/tutorPrompt';

interface Props {
  scambi: Scambio[];
  votoSeFinisci: number;
  /** Domande ancora possibili su questo compito: a zero il tutor non risponde più. */
  domandeRimaste: number;
  onChiedi(domanda: string): Promise<void>;
  attivo: boolean;
}

/** Sotto questa soglia si vede quante domande restano: prima non serve ricordarlo. */
const AVVISO_RIMASTE = 10;

export default function TutorChat({ scambi, votoSeFinisci, domandeRimaste, onChiedi, attivo }: Props) {
  const [domanda, setDomanda] = useState('');
  const [conferma, setConferma] = useState(false);
  const [attesa, setAttesa] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function manda() {
    if (attesa) return;
    setAttesa(true);
    setErrore(null);
    try {
      await onChiedi(domanda);
      setDomanda('');
      setConferma(false);
    } catch (e) {
      setErrore(messaggioErrore(e));
    } finally {
      setAttesa(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-(--color-bordo) bg-(--color-fondo-card) p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-bold">🧑‍🏫 Il tutor</p>
          <p className="text-sm text-(--color-testo-tenue)">
            Spiega e ti dice dove guardare, mai il codice. Ogni domanda costa 1 punto.
            {domandeRimaste > 0 && domandeRimaste <= AVVISO_RIMASTE && (
              <span className="ml-1 text-(--color-giallo)" aria-label="domande rimaste">
                Te ne {domandeRimaste === 1 ? 'resta una' : `restano ${domandeRimaste}`} su questo compito.
              </span>
            )}
          </p>
        </div>
        <p className="text-right">
          <span className="block text-sm text-(--color-testo-tenue)">Voto se arrivi in fondo</span>
          <span className="font-mono text-3xl font-black text-(--color-giallo)" aria-label="voto">
            {votoSeFinisci}
          </span>
        </p>
      </div>

      {scambi.length > 0 && (
        <ol aria-label="conversazione con il tutor" className="flex flex-col gap-2">
          {scambi.map((s, i) => (
            <li key={i} className="flex flex-col gap-1">
              <p className="self-end rounded-xl rounded-br-sm bg-black/40 px-3 py-2 text-[1.05rem]">
                <span className="mr-2 text-xs text-(--color-testo-tenue)">fase {s.fase}</span>
                {s.domanda || <i className="text-(--color-testo-tenue)">non so andare avanti</i>}
              </p>
              <p className="self-start rounded-xl rounded-bl-sm border border-(--color-giallo)/40 bg-(--color-giallo)/10 px-3 py-2 text-[1.05rem] whitespace-pre-line">
                <Testo>{s.risposta}</Testo>
              </p>
            </li>
          ))}
        </ol>
      )}

      {attivo && domandeRimaste === 0 && (
        <p className="rounded-xl border border-(--color-bordo) bg-black/30 p-3 text-(--color-testo-tenue)">
          Le domande per questo compito sono finite: da qui in poi vai avanti da solo, o chiedi al prof.
        </p>
      )}

      {attivo && domandeRimaste > 0 && (
        <div className="flex flex-col gap-2">
          <div role="group" className="flex flex-wrap items-center gap-2" aria-label="domande rapide">
            <span className="text-sm text-(--color-testo-tenue)">Di che aiuto hai bisogno?</span>
            {DOMANDE_RAPIDE.map((d) => (
              <button
                key={d}
                type="button"
                disabled={attesa}
                onClick={() => {
                  setDomanda(d);
                  setConferma(true);
                }}
                className="rounded-full border border-(--color-bordo) bg-black/30 px-3 py-1 text-sm hover:border-(--color-giallo) disabled:opacity-50"
              >
                {d}
              </button>
            ))}
          </div>
          <textarea
            value={domanda}
            onChange={(e) => setDomanda(e.target.value)}
            rows={3}
            placeholder="Scrivi la tua domanda (anche lunga). Vuoto = «non so andare avanti»"
            aria-label="domanda al tutor"
            className="w-full rounded-xl border border-(--color-bordo) bg-black/40 p-3 outline-none focus:border-(--color-giallo)"
          />
          {!conferma ? (
            <button
              type="button"
              onClick={() => setConferma(true)}
              className="self-start rounded-lg border-2 border-(--color-giallo) px-4 py-2 font-bold text-(--color-giallo) hover:bg-(--color-giallo)/10"
            >
              Chiedi al tutor
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-(--color-giallo)/40 bg-(--color-giallo)/5 p-3">
              <p className="font-bold">
                Costa 1 punto: il voto passa da {votoSeFinisci} a {Math.max(5, votoSeFinisci - 1)}.
              </p>
              <button
                type="button"
                onClick={() => void manda()}
                disabled={attesa}
                className="rounded-lg bg-(--color-giallo) px-4 py-2 font-bold text-black hover:brightness-110 disabled:opacity-50"
              >
                {attesa ? 'Il tutor ci pensa…' : 'Sì, manda (−1 punto)'}
              </button>
              <button type="button" onClick={() => setConferma(false)} disabled={attesa} className="text-(--color-testo-tenue) underline">
                Annulla
              </button>
            </div>
          )}
          {errore && (
            <p role="alert" className="text-red-300">
              {errore}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
