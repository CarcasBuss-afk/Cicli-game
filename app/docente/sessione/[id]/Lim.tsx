'use client';
/* Vista LIM: la corsa in tempo reale, da proiettare. Legge Firestore con onSnapshot
 * (il docente ha il claim `teacher`, le regole concedono solo la lettura) e scrive solo
 * passando dalle API /api/docente/*. Tutto grande: si deve leggere dal fondo dell'aula. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { collection, doc, onSnapshot, type Timestamp } from 'firebase/firestore';
import { getClientDb } from '@/lib/firebaseClient';
import { Accesso } from '../../Accesso';
import { chiamaDocente } from '../../api';
import { useDocente } from '../../useDocente';
import { classifica, cronaca, NOME_TIPO, riepilogoPerTipo, type AllievoLim } from '@/lib/giro/classifica';
import type { TipoTappa } from '@/lib/giro/tappe';

type Sessione = {
  code: string;
  classLabel: string;
  status: 'waiting' | 'running' | 'closed';
  numTappe: number;
  tipi: TipoTappa[];
};

const data = (t: unknown): Date | null =>
  t && typeof (t as Timestamp).toDate === 'function' ? (t as Timestamp).toDate() : null;

export function Lim({ sessionId }: { sessionId: string }) {
  const { stato, messaggio, accediGoogle, accediProva } = useDocente();
  const [sessione, setSessione] = useState<Sessione | null>(null);
  const [allievi, setAllievi] = useState<AllievoLim[]>([]);
  const [errore, setErrore] = useState('');
  const [scelto, setScelto] = useState<string | null>(null);

  // Gara: stato, codice, percorso (solo i tipi servono al riepilogo finale)
  useEffect(() => {
    if (stato !== 'ok') return;
    return onSnapshot(
      doc(getClientDb(), 'giroSessions', sessionId),
      (snap) => {
        const d = snap.data();
        if (!d) {
          setErrore('Gara inesistente');
          return;
        }
        setSessione({
          code: d.code,
          classLabel: d.classLabel,
          status: d.status,
          numTappe: d.numTappe,
          tipi: (d.tappe ?? []).map((t: { tipo: TipoTappa }) => t.tipo),
        });
      },
      (e) => setErrore(`Lettura della gara non riuscita: ${e.message}`),
    );
  }, [stato, sessionId]);

  // Allievi in tempo reale
  useEffect(() => {
    if (stato !== 'ok') return;
    return onSnapshot(
      collection(getClientDb(), 'giroSessions', sessionId, 'players'),
      (snap) => {
        setAllievi(
          snap.docs.map((d) => {
            const a = d.data();
            return {
              id: d.id,
              name: a.name ?? '?',
              numero: typeof a.numero === 'number' ? a.numero : null,
              tappaCorrente: a.tappaCorrente ?? 0,
              erroriTotali: a.erroriTotali ?? 0,
              finishedAt: data(a.finishedAt),
              ordineArrivo: a.ordineArrivo ?? null,
              tappe: Object.fromEntries(
                Object.entries((a.tappe ?? {}) as Record<string, { completedAt?: unknown; errori?: number }>).map(
                  ([k, v]) => [k, { completedAt: data(v.completedAt), errori: v.errori ?? 0 }],
                ),
              ),
            } satisfies AllievoLim;
          }),
        );
      },
      (e) => setErrore(`Lettura degli allievi non riuscita: ${e.message}`),
    );
  }, [stato, sessionId]);

  const azione = useCallback(async (rotta: string, corpo: Record<string, unknown>) => {
    setErrore('');
    try {
      await chiamaDocente(rotta, corpo);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const ordinati = useMemo(() => classifica(allievi), [allievi]);
  const eventi = useMemo(() => cronaca(allievi), [allievi]);
  const riepilogo = useMemo(
    () => (sessione ? riepilogoPerTipo(allievi, sessione.tipi) : []),
    [allievi, sessione],
  );

  if (stato !== 'ok') {
    return <Accesso stato={stato} messaggio={messaggio} accediGoogle={accediGoogle} accediProva={accediProva} />;
  }
  if (!sessione) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8 text-2xl text-(--color-testo-tenue)">
        {errore || 'Un attimo…'}
      </main>
    );
  }

  const inAttesa = sessione.status === 'waiting';
  const chiusa = sessione.status === 'closed';

  return (
    <main className="flex min-h-screen flex-col gap-5 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-(--color-rosa)">Il Giro dei Cicli</h1>
          <p className="text-xl text-(--color-testo-tenue)">
            classe {sessione.classLabel} · {sessione.numTappe} tappe · {allievi.length}{' '}
            {allievi.length === 1 ? 'allievo' : 'allievi'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {inAttesa && (
            <button
              onClick={() => void azione('sessioni', { azione: 'avvia', sessionId })}
              className="rounded-xl bg-(--color-verde) px-8 py-4 text-3xl font-black text-black hover:brightness-110"
            >
              VIA!
            </button>
          )}
          {!chiusa && !inAttesa && (
            <button
              onClick={() => void azione('sessioni', { azione: 'chiudi', sessionId })}
              className="rounded-lg border border-(--color-bordo) px-4 py-2 text-(--color-testo-tenue) hover:text-(--color-testo)"
            >
              Chiudi gara
            </button>
          )}
          <Link href="/docente" className="text-sm text-(--color-testo-tenue) underline">
            tutte le gare
          </Link>
        </div>
      </header>

      {errore && (
        <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-200">
          {errore}
        </p>
      )}

      {/* In attesa: il codice grande, è l'unica cosa che serve */}
      {inAttesa && (
        <section className="flex flex-col items-center gap-4 py-10">
          <p className="text-2xl text-(--color-testo-tenue)">Entrate su questo sito con il codice</p>
          <p className="font-mono text-[9rem] leading-none font-black tracking-[0.1em] text-(--color-rosa)">
            {sessione.code}
          </p>
          {allievi.length === 0 ? (
            <p className="text-3xl">Nessuno in griglia di partenza</p>
          ) : (
            <ListaCorridori allievi={allievi} />
          )}
        </section>
      )}

      {!inAttesa && (
        <div className="flex flex-1 flex-col gap-5 lg:flex-row">
          {/* La corsa */}
          <section className="flex-1">
            {chiusa && ordinati.length > 0 && <Podio primi={ordinati.slice(0, 3)} />}
            <ul aria-label="classifica" className="flex flex-col gap-2">
              {ordinati.map((a, posto) => (
                <li
                  key={a.id}
                  onClick={() => setScelto(scelto === a.id ? null : a.id)}
                  className={`cursor-pointer rounded-xl border p-3 ${
                    posto === 0
                      ? 'border-(--color-rosa) bg-(--color-rosa)/10'
                      : 'border-(--color-bordo) bg-(--color-fondo-card)'
                  }`}
                >
                  <div className="flex items-baseline gap-3">
                    <span className="w-8 text-2xl font-black text-(--color-testo-tenue)">{posto + 1}</span>
                    {/* L'emoji della maglietta è verde: la maglia rosa si fa col colore. */}
                    {posto === 0 && (
                      <span className="rounded-md bg-(--color-rosa) px-2 py-0.5 text-sm font-black text-white uppercase">
                        maglia rosa
                      </span>
                    )}
                    {a.numero !== null && (
                      <span className="font-mono text-xl text-(--color-testo-tenue)">{a.numero}</span>
                    )}
                    <span className="text-2xl font-bold">{a.name}</span>
                    <span className="text-xl text-(--color-testo-tenue)">
                      {a.tappaCorrente}/{sessione.numTappe}
                    </span>
                    {a.finishedAt && <span className="text-xl text-(--color-giallo)">🏁 arrivato</span>}
                    {a.erroriTotali > 0 && (
                      <span className="ml-auto text-lg text-(--color-testo-tenue)">
                        {a.erroriTotali} {a.erroriTotali === 1 ? 'errore' : 'errori'}
                      </span>
                    )}
                  </div>
                  <Strada fatte={a.tappaCorrente} totale={sessione.numTappe} />
                  {scelto === a.id && (
                    <Azioni
                      allievo={a}
                      numTappe={sessione.numTappe}
                      onAzione={(corpo) => void azione('allievi', { ...corpo, sessionId, playerId: a.id })}
                    />
                  )}
                </li>
              ))}
              {ordinati.length === 0 && <p className="text-2xl text-(--color-testo-tenue)">Nessuno in gara.</p>}
            </ul>
          </section>

          {/* Cronaca e, a gara finita, che cosa rispiegare */}
          <aside className="flex w-full flex-col gap-4 lg:w-80">
            <section className="rounded-xl border border-(--color-bordo) bg-(--color-fondo-card) p-4">
              <h2 className="mb-2 font-bold text-(--color-testo-tenue)">Cronaca</h2>
              <ul aria-label="cronaca" className="flex flex-col gap-1 text-lg">
                {eventi.map((e, i) => (
                  <li key={i}>
                    <span className="font-bold">{e.nome}</span> ha chiuso la tappa {e.tappa}
                  </li>
                ))}
                {eventi.length === 0 && <li className="text-(--color-testo-tenue)">Ancora nessuna tappa chiusa.</li>}
              </ul>
            </section>

            {chiusa && riepilogo.length > 0 && (
              <section className="rounded-xl border border-(--color-giallo)/40 bg-(--color-giallo)/5 p-4">
                <h2 className="mb-2 font-bold text-(--color-giallo)">Da rispiegare</h2>
                <ul className="flex flex-col gap-1">
                  {riepilogo.map((r) => (
                    <li key={r.tipo} className="flex justify-between gap-2">
                      <span>{NOME_TIPO[r.tipo]}</span>
                      <span className="text-(--color-testo-tenue)">
                        {r.errori} {r.errori === 1 ? 'errore' : 'errori'}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-sm text-(--color-testo-tenue)">
                  In ordine di errori per tappa: in cima quello che ha dato più filo da torcere.
                </p>
              </section>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}

/**
 * La lista dei corridori con il loro numero, da proiettare prima del via: è da qui che
 * gli allievi leggono il numero che serve a rientrare da un altro computer.
 */
function ListaCorridori({ allievi }: { allievi: AllievoLim[] }) {
  const perNumero = [...allievi].sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0));
  return (
    <div className="w-full">
      <p className="mb-3 text-2xl text-(--color-testo-tenue)">
        {allievi.length} in griglia di partenza · il numero serve per rientrare da un altro PC
      </p>
      <ul
        aria-label="corridori"
        className="mx-auto grid max-w-5xl grid-cols-2 gap-x-8 gap-y-1 text-left sm:grid-cols-3 lg:grid-cols-4"
      >
        {perNumero.map((a) => (
          <li key={a.id} className="flex items-baseline gap-3 text-2xl">
            <span className="w-10 text-right font-mono font-black text-(--color-rosa)">{a.numero ?? '–'}</span>
            <span>{a.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** La strada percorsa: una casella per tappa, il ciclista dove è arrivato. */
function Strada({ fatte, totale }: { fatte: number; totale: number }) {
  return (
    <div className="relative mt-2 flex items-center gap-1">
      {Array.from({ length: totale }, (_, i) => (
        <div
          key={i}
          className={`h-3 flex-1 rounded-full ${i < fatte ? 'bg-(--color-rosa)' : 'bg-(--color-bordo)'}`}
        />
      ))}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-1 text-xl transition-all duration-500"
        style={{ left: `calc(${(Math.min(fatte, totale) / totale) * 100}% - 0.6rem)` }}
      >
        🚴
      </span>
    </div>
  );
}

function Podio({ primi }: { primi: AllievoLim[] }) {
  const medaglie = ['🥇', '🥈', '🥉'];
  return (
    <section className="mb-4 flex flex-wrap items-end justify-center gap-6 rounded-xl border border-(--color-rosa)/40 bg-(--color-rosa)/5 p-6">
      {primi.map((a, i) => (
        <div key={a.id} className="text-center">
          <p className="text-5xl">{medaglie[i]}</p>
          <p className="text-2xl font-bold">{a.name}</p>
          <p className="text-(--color-testo-tenue)">{a.tappaCorrente} tappe</p>
        </div>
      ))}
    </section>
  );
}

/** Correzioni sul singolo allievo: si aprono toccando la sua riga. */
function Azioni({
  allievo,
  numTappe,
  onAzione,
}: {
  allievo: AllievoLim;
  numTappe: number;
  onAzione: (corpo: Record<string, unknown>) => void;
}) {
  const [nome, setNome] = useState(allievo.name);
  const [tappa, setTappa] = useState(Math.max(1, allievo.tappaCorrente));

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="mt-3 flex flex-wrap items-end gap-3 border-t border-(--color-bordo) pt-3 text-base"
    >
      <label className="flex flex-col gap-1">
        <span className="text-sm text-(--color-testo-tenue)">Correggi il nome</span>
        <div className="flex gap-2">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-40 rounded-lg border border-(--color-bordo) bg-black/30 px-3 py-1.5 outline-none focus:border-(--color-rosa)"
          />
          <button
            onClick={() => onAzione({ azione: 'rinomina', name: nome })}
            className="rounded-lg border border-(--color-bordo) px-3 py-1.5 hover:border-(--color-rosa)"
          >
            Salva
          </button>
        </div>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-(--color-testo-tenue)">Rimanda alla tappa</span>
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            max={numTappe}
            value={tappa}
            onChange={(e) => setTappa(Number(e.target.value))}
            className="w-20 rounded-lg border border-(--color-bordo) bg-black/30 px-3 py-1.5 outline-none focus:border-(--color-rosa)"
          />
          <button
            onClick={() => onAzione({ azione: 'azzera', tappa: tappa - 1 })}
            className="rounded-lg border border-(--color-bordo) px-3 py-1.5 hover:border-(--color-rosa)"
          >
            Rimanda
          </button>
        </div>
      </label>

      <button
        onClick={() => {
          if (confirm(`Eliminare ${allievo.name} dalla gara?`)) onAzione({ azione: 'elimina' });
        }}
        className="ml-auto rounded-lg border border-red-500/40 px-3 py-1.5 text-red-300 hover:bg-red-500/10"
      >
        Elimina
      </button>
    </div>
  );
}
