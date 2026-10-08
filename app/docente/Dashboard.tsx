'use client';
/* Elenco delle gare e creazione di una nuova. Il via e la chiusura si danno da qui o
 * dalla vista LIM. */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { chiamaDocente } from './api';
import { Accesso } from './Accesso';
import { useDocente } from './useDocente';
import { NUM_TAPPE_DEFAULT, NUM_TAPPE_MAX, NUM_TAPPE_MIN } from '@/lib/giro/esercizi';

type Sessione = {
  id: string;
  code: string;
  classLabel: string;
  status: 'waiting' | 'running' | 'closed';
  numTappe: number;
  createdAt: string | null;
  allievi: number;
  arrivati: number;
};

const ETICHETTA = {
  waiting: { testo: 'in attesa del via', classe: 'text-(--color-giallo)' },
  running: { testo: 'in corso', classe: 'text-(--color-verde)' },
  closed: { testo: 'chiusa', classe: 'text-(--color-testo-tenue)' },
} as const;

export function Dashboard() {
  const { stato, messaggio, accediGoogle, accediProva, esci, utente } = useDocente();
  const [sessioni, setSessioni] = useState<Sessione[]>([]);
  const [classe, setClasse] = useState('');
  const [numTappe, setNumTappe] = useState(NUM_TAPPE_DEFAULT);
  const [errore, setErrore] = useState('');
  const [occupato, setOccupato] = useState(false);

  const azione = useCallback(async (corpo: Record<string, unknown>) => {
    setErrore('');
    setOccupato(true);
    try {
      const r = await chiamaDocente<{ sessioni: Sessione[] }>('sessioni', corpo);
      if (r.sessioni) setSessioni(r.sessioni);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : String(e));
    } finally {
      setOccupato(false);
    }
  }, []);

  useEffect(() => {
    if (stato === 'ok') void azione({ azione: 'elenco' });
  }, [stato, azione]);

  if (stato !== 'ok') {
    return <Accesso stato={stato} messaggio={messaggio} accediGoogle={accediGoogle} accediProva={accediProva} />;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-black text-(--color-rosa)">Il Giro dei Cicli · gare</h1>
        <div className="flex items-center gap-3 text-sm text-(--color-testo-tenue)">
          <span>{utente?.email}</span>
          <button onClick={esci} className="underline">
            esci
          </button>
        </div>
      </header>

      {/* Nuova gara */}
      <section className="flex flex-wrap items-end gap-4 rounded-xl border border-(--color-bordo) bg-(--color-fondo-card) p-5">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-bold">Classe</span>
          <input
            value={classe}
            onChange={(e) => setClasse(e.target.value)}
            placeholder="2A"
            className="w-28 rounded-lg border border-(--color-bordo) bg-black/30 px-3 py-2 outline-none focus:border-(--color-rosa)"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-bold">Tappe</span>
          <input
            type="number"
            min={NUM_TAPPE_MIN}
            max={NUM_TAPPE_MAX}
            value={numTappe}
            onChange={(e) => setNumTappe(Number(e.target.value))}
            className="w-24 rounded-lg border border-(--color-bordo) bg-black/30 px-3 py-2 outline-none focus:border-(--color-rosa)"
          />
        </label>
        <button
          onClick={() => void azione({ azione: 'crea', classLabel: classe, numTappe })}
          disabled={occupato || classe.trim() === ''}
          className="rounded-lg bg-(--color-rosa) px-5 py-2.5 font-bold text-white hover:brightness-110 disabled:opacity-40"
        >
          Nuova gara
        </button>
        <p className="text-sm text-(--color-testo-tenue)">
          Il percorso è generato a caso: due gare non sono mai uguali.
        </p>
      </section>

      {errore && (
        <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-200">
          {errore}
        </p>
      )}

      {/* Elenco gare */}
      <section className="flex flex-col gap-3">
        {sessioni.length === 0 && <p className="text-(--color-testo-tenue)">Nessuna gara: creane una qui sopra.</p>}
        {sessioni.map((s) => (
          <article
            key={s.id}
            className="flex flex-wrap items-center gap-4 rounded-xl border border-(--color-bordo) bg-(--color-fondo-card) p-4"
          >
            <span className="rounded-lg bg-black/40 px-3 py-2 font-mono text-2xl tracking-widest text-(--color-rosa)">
              {s.code}
            </span>
            <div className="min-w-32">
              <p className="font-bold">classe {s.classLabel}</p>
              <p className={`text-sm font-bold ${ETICHETTA[s.status].classe}`}>{ETICHETTA[s.status].testo}</p>
            </div>
            <p className="text-sm text-(--color-testo-tenue)">
              {s.numTappe} tappe · {s.allievi} {s.allievi === 1 ? 'allievo' : 'allievi'}
              {s.arrivati > 0 && ` · ${s.arrivati} al traguardo`}
            </p>
            <div className="ml-auto flex flex-wrap gap-2">
              <Link
                href={`/docente/sessione/${s.id}`}
                className="rounded-lg border border-(--color-rosa) px-4 py-2 font-bold text-(--color-rosa) hover:bg-(--color-rosa)/10"
              >
                Vista LIM
              </Link>
              {s.status === 'waiting' && (
                <button
                  onClick={() => void azione({ azione: 'avvia', sessionId: s.id })}
                  disabled={occupato}
                  className="rounded-lg bg-(--color-verde) px-4 py-2 font-bold text-black hover:brightness-110 disabled:opacity-40"
                >
                  Via!
                </button>
              )}
              {s.status !== 'closed' && (
                <button
                  onClick={() => void azione({ azione: 'chiudi', sessionId: s.id })}
                  disabled={occupato}
                  className="rounded-lg border border-(--color-bordo) px-4 py-2 text-(--color-testo-tenue) hover:text-(--color-testo) disabled:opacity-40"
                >
                  Chiudi
                </button>
              )}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
