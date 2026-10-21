'use client';

/* Il gregario: il consiglio dell'IA nella Cronoscalata. Non scrive codice, dice dove
 * guardare. Ogni consiglio costa un punto sul voto, e l'allievo lo vede prima di
 * chiedere: il bottone apre una conferma con il voto di adesso e quello di dopo. */
import { useState } from 'react';
import Testo from '@/components/Testo';
import { messaggioErrore, type ConsiglioRicevuto, type Cronoscalata, type RispostaConsiglio } from '@/lib/giro/client';

interface Props {
  c: Cronoscalata;
  fase: number;
  /** Chiede il consiglio al server; chi chiama aggiorna lo stato con la risposta. */
  onChiedi(domanda: string): Promise<RispostaConsiglio>;
  attivo: boolean;
}

export default function Gregario({ c, fase, onChiedi, attivo }: Props) {
  const [aperto, setAperto] = useState(false);
  const [domanda, setDomanda] = useState('');
  const [attesa, setAttesa] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const finiti = c.consigliRimasti <= 0;

  async function chiedi() {
    if (attesa) return;
    setAttesa(true);
    setErrore(null);
    try {
      await onChiedi(domanda);
      setDomanda('');
      setAperto(false);
    } catch (e) {
      setErrore(messaggioErrore(e));
    } finally {
      setAttesa(false);
    }
  }

  const diQuestaFase = c.gregario.filter((g) => g.fase === fase);

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-(--color-bordo) bg-(--color-fondo-card) p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-bold">🚴 Il gregario</p>
          <p className="text-sm text-(--color-testo-tenue)">
            Se sei fermo ti dice dove guardare, mai il codice. Ogni consiglio costa 1 punto.
          </p>
        </div>
        <p className="text-right">
          <span className="block text-sm text-(--color-testo-tenue)">Voto se arrivi in fondo</span>
          <span className="font-mono text-3xl font-black text-(--color-giallo)" aria-label="voto">
            {c.voto}
          </span>
        </p>
      </div>

      {!aperto ? (
        <button
          type="button"
          onClick={() => setAperto(true)}
          disabled={!attivo || finiti}
          className="self-start rounded-lg border-2 border-(--color-giallo) px-4 py-2 font-bold text-(--color-giallo) hover:bg-(--color-giallo)/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {finiti ? 'Consigli finiti' : 'Chiedi al gregario'}
        </button>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl border border-(--color-giallo)/40 bg-(--color-giallo)/5 p-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-(--color-testo-tenue)">Che cosa non ti torna? (puoi anche lasciare vuoto)</span>
            <input
              value={domanda}
              onChange={(e) => setDomanda(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void chiedi();
                }
              }}
              maxLength={300}
              autoFocus
              placeholder="es. perché il totale non cresce?"
              className="rounded-lg border border-(--color-bordo) bg-black/40 px-3 py-2 outline-none focus:border-(--color-giallo)"
            />
          </label>
          <p className="font-bold">
            Questo consiglio costa 1 punto: il voto passa da {c.voto} a {Math.max(5, c.voto - 1)}.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void chiedi()}
              disabled={attesa}
              className="rounded-lg bg-(--color-giallo) px-4 py-2 font-bold text-black hover:brightness-110 disabled:opacity-50"
            >
              {attesa ? 'Il gregario ci pensa…' : 'Sì, chiedi (−1 punto)'}
            </button>
            <button
              type="button"
              onClick={() => {
                setAperto(false);
                setErrore(null);
              }}
              disabled={attesa}
              className="rounded-lg px-4 py-2 font-bold text-(--color-testo-tenue) hover:text-(--color-testo)"
            >
              Annulla
            </button>
          </div>
          {errore && (
            <p role="alert" className="text-red-300">
              {errore}
            </p>
          )}
        </div>
      )}

      {diQuestaFase.length > 0 && (
        <ol className="flex flex-col gap-2" aria-label="consigli ricevuti">
          {diQuestaFase.map((g, i) => (
            <Consiglio key={i} g={g} />
          ))}
        </ol>
      )}
    </section>
  );
}

function Consiglio({ g }: { g: ConsiglioRicevuto }) {
  return (
    <li className="rounded-xl border border-(--color-giallo)/40 bg-(--color-giallo)/10 p-3 text-[1.05rem]">
      {g.domanda && <p className="mb-1 text-sm italic text-(--color-testo-tenue)">«{g.domanda}»</p>}
      <span aria-hidden>🚴 </span>
      <Testo>{g.consiglio}</Testo>
    </li>
  );
}
