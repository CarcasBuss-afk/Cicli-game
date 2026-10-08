'use client';
/* Elenco dei Giri e creazione di uno nuovo. Le tappe si aprono e si chiudono dalla vista
 * LIM; da qui si compone il Giro e lo si chiude. */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { chiamaDocente } from './api';
import { Accesso } from './Accesso';
import { useDocente } from './useDocente';
import { KM_MISTO_DEFAULT, KM_MISTO_MAX, KM_MISTO_MIN } from '@/lib/giro/esercizi';
import { TEMI_DEL_GIRO, type Tema } from '@/lib/giro/giro';

type Sessione = {
  id: string;
  code: string;
  classLabel: string;
  status: 'waiting' | 'running' | 'closed';
  singola: boolean;
  vecchia: boolean;
  numTappe: number;
  tappeCorse: number;
  createdAt: string | null;
  allievi: number;
};

const ETICHETTA = {
  waiting: { testo: 'non ancora partito', classe: 'text-(--color-giallo)' },
  running: { testo: 'in corso', classe: 'text-(--color-verde)' },
  closed: { testo: 'chiuso', classe: 'text-(--color-testo-tenue)' },
} as const;

/** Le prime tappe del programma sono spuntate di partenza: sono quelle che la classe fa per prime. */
const PROPOSTE: Tema[] = ['ripeti', 'contare', 'passo', 'leggere'];

export function Dashboard() {
  const { stato, messaggio, accediGoogle, accediProva, esci, utente } = useDocente();
  const [sessioni, setSessioni] = useState<Sessione[]>([]);
  const [classe, setClasse] = useState('');
  const [tipo, setTipo] = useState<'giro' | 'singola'>('giro');
  const [temi, setTemi] = useState<Tema[]>(PROPOSTE);
  const [migliori, setMigliori] = useState('');
  const [km, setKm] = useState(KM_MISTO_DEFAULT);
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

  // Le tappe restano nell'ordine del programma, qualunque sia l'ordine dei clic.
  const alterna = (t: Tema) =>
    setTemi((ora) =>
      ora.includes(t) ? ora.filter((x) => x !== t) : TEMI_DEL_GIRO.map((x) => x.id).filter((x) => x === t || ora.includes(x)),
    );

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

      {/* Nuovo Giro */}
      <section className="flex flex-col gap-4 rounded-xl border border-(--color-bordo) bg-(--color-fondo-card) p-5">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-bold">Classe</span>
            <input
              value={classe}
              onChange={(e) => setClasse(e.target.value)}
              placeholder="2A"
              className="w-28 rounded-lg border border-(--color-bordo) bg-black/30 px-3 py-2 outline-none focus:border-(--color-rosa)"
            />
          </label>
          <div className="flex gap-2" role="tablist">
            {(['giro', 'singola'] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tipo === t}
                onClick={() => setTipo(t)}
                className={`rounded-lg border px-3 py-2 text-sm font-bold ${
                  tipo === t
                    ? 'border-(--color-rosa) bg-(--color-rosa)/10 text-(--color-rosa)'
                    : 'border-(--color-bordo) text-(--color-testo-tenue)'
                }`}
              >
                {t === 'giro' ? 'Giro a tappe' : 'Gara singola'}
              </button>
            ))}
          </div>
        </div>

        {tipo === 'giro' ? (
          <>
            <fieldset className="flex flex-col gap-1">
              <legend className="mb-1 text-sm font-bold">
                Tappe del Giro{' '}
                <span className="font-normal text-(--color-testo-tenue)">(5 km ciascuna, se ne aggiungono anche dopo)</span>
              </legend>
              {TEMI_DEL_GIRO.map((t, i) => (
                <label key={t.id} className="flex items-baseline gap-2">
                  <input type="checkbox" checked={temi.includes(t.id)} onChange={() => alterna(t.id)} />
                  <span className="font-bold">
                    {i + 1}. {t.nome}
                  </span>
                  <span className="text-sm text-(--color-testo-tenue)">
                    {t.descrizione} · {t.durataMinuti} min
                  </span>
                </label>
              ))}
            </fieldset>
            <label className="flex flex-wrap items-center gap-2 text-sm">
              <span>Nella classifica generale contano le migliori</span>
              <input
                type="number"
                min={1}
                max={30}
                value={migliori}
                onChange={(e) => setMigliori(e.target.value)}
                placeholder="tutte"
                aria-label="tappe migliori"
                className="w-20 rounded-lg border border-(--color-bordo) bg-black/30 px-2 py-1 text-center outline-none focus:border-(--color-rosa)"
              />
              <span>tappe di ciascuno (così chi è assente non resta indietro). Si cambia anche dopo.</span>
            </label>
          </>
        ) : (
          <label className="flex flex-wrap items-center gap-2 text-sm">
            <span>Esercizi</span>
            <input
              type="number"
              min={KM_MISTO_MIN}
              max={KM_MISTO_MAX}
              value={km}
              onChange={(e) => setKm(Number(e.target.value))}
              aria-label="esercizi"
              className="w-24 rounded-lg border border-(--color-bordo) bg-black/30 px-3 py-2 outline-none focus:border-(--color-rosa)"
            />
            <span className="text-(--color-testo-tenue)">
              una gara sola, mista, senza limite di tempo: range, lettura del codice, caccia all&apos;errore
            </span>
          </label>
        )}

        <div>
          <button
            onClick={() =>
              void azione(
                tipo === 'giro'
                  ? { azione: 'crea', tipo, classLabel: classe, temi, migliori: migliori === '' ? null : Number(migliori) }
                  : { azione: 'crea', tipo, classLabel: classe, km },
              )
            }
            disabled={occupato || classe.trim() === '' || (tipo === 'giro' && temi.length === 0)}
            className="rounded-lg bg-(--color-rosa) px-5 py-2.5 font-bold text-white hover:brightness-110 disabled:opacity-40"
          >
            {tipo === 'giro' ? 'Crea il Giro' : 'Crea la gara'}
          </button>
        </div>
      </section>

      {errore && (
        <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-200">
          {errore}
        </p>
      )}

      {/* Elenco */}
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
              {s.vecchia
                ? 'versione precedente, non più guidabile'
                : s.singola
                  ? 'gara singola'
                  : `Giro · ${s.tappeCorse}/${s.numTappe} tappe corse`}{' '}
              · {s.allievi}{' '}
              {s.allievi === 1 ? 'allievo' : 'allievi'}
            </p>
            <div className="ml-auto flex flex-wrap gap-2">
              <Link
                href={`/docente/sessione/${s.id}`}
                className="rounded-lg border border-(--color-rosa) px-4 py-2 font-bold text-(--color-rosa) hover:bg-(--color-rosa)/10"
              >
                Vista LIM
              </Link>
              {s.status !== 'closed' && (
                <button
                  onClick={() => {
                    if (confirm('Chiudere? Non si potranno più aprire tappe.')) void azione({ azione: 'chiudi', sessionId: s.id });
                  }}
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
