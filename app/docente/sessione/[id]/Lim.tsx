'use client';
/* Vista LIM: il Giro in tempo reale, da proiettare. Legge Firestore con onSnapshot (il
 * docente ha il claim `teacher`, le regole concedono solo la lettura) e scrive solo
 * passando dalle API /api/docente/*. Tutto grande: si deve leggere dal fondo dell'aula.
 *
 * Quattro momenti: la partenza (codice gigante e lista dei corridori), la tappa in corso
 * (cronometro e classifica dal vivo), fra una tappa e l'altra (risultati, generale, piano
 * del Giro), la fine del Giro (podio e "Da rispiegare"). */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { collection, doc, onSnapshot, type Timestamp } from 'firebase/firestore';
import { getClientDb } from '@/lib/firebaseClient';
import { Accesso } from '../../Accesso';
import { chiamaDocente } from '../../api';
import { useDocente } from '../../useDocente';
import { cronaca, formattaSecondi, NOME_TIPO, riepilogoErrori, type AllievoLim, type ProgressoLim } from '@/lib/giro/classifica';
import type { TipoEsercizio } from '@/lib/giro/esercizi';
import { classificaTappa, infoTema, TEMI_DEL_GIRO, type Tema } from '@/lib/giro/giro';

type StatoTappa = 'da-correre' | 'in-corso' | 'chiusa';

type TappaLim = {
  tema: Tema;
  nome: string;
  km: number;
  stato: StatoTappa;
  durataSec: number | null;
  scadenza: Date | null;
  /** Tipi dei chilometri, per il riepilogo degli errori. Vuoto finché non si apre. */
  tipi: TipoEsercizio[];
};

type RigaGenerale = { id: string; name: string; numero: number | null; punti: number; tappeContate: number; posizione: number };

type GiroLim = {
  code: string;
  classLabel: string;
  status: 'waiting' | 'running' | 'closed';
  tappe: TappaLim[];
  tappaAperta: number | null;
  migliori: number | null;
  generale: RigaGenerale[];
};

const data = (t: unknown): Date | null =>
  t && typeof (t as Timestamp).toDate === 'function' ? (t as Timestamp).toDate() : null;

function progressoDa(grezzo: Record<string, unknown>): ProgressoLim {
  const kmAt = Object.fromEntries(Object.entries((grezzo.kmAt ?? {}) as Record<string, unknown>).map(([k, v]) => [k, data(v)]));
  return {
    km: (grezzo.km as number) ?? 0,
    kmAt,
    errori: (grezzo.errori as number) ?? 0,
    erroriKm: (grezzo.erroriKm as Record<string, number>) ?? {},
    ultimoAt: data(grezzo.ultimoAt),
    ordineArrivo: (grezzo.ordineArrivo as number) ?? null,
    posizione: (grezzo.posizione as number) ?? null,
    punti: (grezzo.punti as number) ?? null,
  };
}

export function Lim({ sessionId }: { sessionId: string }) {
  const { stato, messaggio, accediGoogle, accediProva } = useDocente();
  const [giro, setGiro] = useState<GiroLim | null>(null);
  const [allievi, setAllievi] = useState<AllievoLim[]>([]);
  const [errore, setErrore] = useState('');

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
        // Le gare create prima del Giro a tappe hanno la lista degli esercizi al posto
        // delle tappe: questa vista non le sa guidare, e senza il controllo andrebbe in errore.
        const tappeGrezze = (d.tappe ?? []) as Array<Record<string, unknown>>;
        if (tappeGrezze.some((t) => !t.tema)) {
          setErrore(
            'Questa gara è stata creata con la versione di prima del Giro a tappe e non si può più guidare da qui: creane una nuova dalla pagina delle gare.',
          );
          return;
        }
        setGiro({
          code: d.code,
          classLabel: d.classLabel,
          status: d.status,
          tappaAperta: d.tappaAperta ?? null,
          migliori: d.migliori ?? null,
          generale: d.generale ?? [],
          tappe: ((d.tappe ?? []) as Array<Record<string, unknown>>).map((t) => ({
            tema: t.tema as Tema,
            nome: infoTema(t.tema as Tema).nome,
            km: (t.km as number) ?? 0,
            stato: t.stato as StatoTappa,
            durataSec: (t.durataSec as number | null) ?? null,
            scadenza: data(t.scadenzaAt),
            tipi: ((t.esercizi ?? []) as Array<{ tipo: TipoEsercizio }>).map((e) => e.tipo),
          })),
        });
      },
      (e) => setErrore(`Lettura della gara non riuscita: ${e.message}`),
    );
  }, [stato, sessionId]);

  useEffect(() => {
    if (stato !== 'ok') return;
    return onSnapshot(
      collection(getClientDb(), 'giroSessions', sessionId, 'players'),
      (snap) =>
        setAllievi(
          snap.docs.map((d) => {
            const a = d.data();
            return {
              id: d.id,
              name: a.name ?? '?',
              numero: typeof a.numero === 'number' ? a.numero : null,
              erroriTotali: a.erroriTotali ?? 0,
              tappe: Object.fromEntries(
                Object.entries((a.tappe ?? {}) as Record<string, Record<string, unknown>>).map(([k, v]) => [k, progressoDa(v)]),
              ),
            } satisfies AllievoLim;
          }),
        ),
      (e) => setErrore(`Lettura degli allievi non riuscita: ${e.message}`),
    );
  }, [stato, sessionId]);

  const azione = useCallback(async (rotta: string, corpo: Record<string, unknown>) => {
    setErrore('');
    try {
      await chiamaDocente(rotta, { sessionId, ...corpo });
    } catch (e) {
      setErrore(e instanceof Error ? e.message : String(e));
    }
  }, [sessionId]);

  if (stato !== 'ok') {
    return <Accesso stato={stato} messaggio={messaggio} accediGoogle={accediGoogle} accediProva={accediProva} />;
  }
  if (!giro) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8 text-2xl text-(--color-testo-tenue)">
        {errore || 'Un attimo…'}
      </main>
    );
  }

  const singola = giro.tappe.length === 1 && giro.tappe[0].tema === 'misto';
  const maiPartito = giro.tappe.every((t) => t.stato === 'da-correre');
  const leader = singola ? null : (giro.generale[0]?.id ?? null);

  return (
    <main className="flex min-h-screen flex-col gap-5 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-(--color-rosa)">Il Giro dei Cicli</h1>
          <p className="text-xl text-(--color-testo-tenue)">
            classe {giro.classLabel} · {singola ? 'gara singola' : `${giro.tappe.length} tappe`} · {allievi.length}{' '}
            {allievi.length === 1 ? 'corridore' : 'corridori'}
            {!maiPartito && giro.status !== 'closed' && <span className="ml-3 font-mono">codice {giro.code}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {giro.status !== 'closed' && (
            <button
              onClick={() => {
                if (confirm(singola ? 'Chiudere la gara?' : 'Chiudere il Giro? Non si potranno più aprire tappe.')) {
                  void azione('sessioni', { azione: 'chiudi' });
                }
              }}
              className="rounded-lg border border-(--color-bordo) px-4 py-2 text-(--color-testo-tenue) hover:text-(--color-testo)"
            >
              {singola ? 'Chiudi gara' : 'Chiudi il Giro'}
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

      {giro.status === 'closed' ? (
        <FineGiro giro={giro} allievi={allievi} singola={singola} />
      ) : giro.tappaAperta !== null ? (
        <TappaInCorso
          giro={giro}
          indice={giro.tappaAperta}
          allievi={allievi}
          singola={singola}
          leader={leader}
          azione={azione}
        />
      ) : maiPartito ? (
        <Partenza giro={giro} allievi={allievi} azione={azione} />
      ) : (
        <FraLeTappe giro={giro} allievi={allievi} azione={azione} />
      )}
    </main>
  );
}

/* ---------------------------------------------------------------------- partenza */

function Partenza({
  giro,
  allievi,
  azione,
}: {
  giro: GiroLim;
  allievi: AllievoLim[];
  azione: (rotta: string, corpo: Record<string, unknown>) => Promise<void>;
}) {
  return (
    <section className="flex flex-col items-center gap-6 py-6">
      <p className="text-2xl text-(--color-testo-tenue)">Entrate su questo sito con il codice</p>
      <p className="font-mono text-[9rem] leading-none font-black tracking-[0.1em] text-(--color-rosa)">{giro.code}</p>
      {allievi.length === 0 ? (
        <p className="text-3xl">Nessuno in griglia di partenza</p>
      ) : (
        <ListaCorridori allievi={allievi} />
      )}
      <ApriTappa giro={giro} indice={0} azione={azione} grande />
    </section>
  );
}

/** Il pulsante per aprire una tappa, con la durata modificabile. */
function ApriTappa({
  giro,
  indice,
  azione,
  grande = false,
}: {
  giro: GiroLim;
  indice: number;
  azione: (rotta: string, corpo: Record<string, unknown>) => Promise<void>;
  grande?: boolean;
}) {
  const tappa = giro.tappe[indice];
  const [minuti, setMinuti] = useState<string>(tappa.durataSec ? String(Math.round(tappa.durataSec / 60)) : '');
  const singola = giro.tappe.length === 1 && tappa.tema === 'misto';
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <label className="flex items-center gap-2 text-lg">
        <span className="text-(--color-testo-tenue)">durata</span>
        <input
          type="number"
          min={1}
          max={120}
          value={minuti}
          onChange={(e) => setMinuti(e.target.value)}
          placeholder="∞"
          aria-label="minuti"
          className="w-20 rounded-lg border border-(--color-bordo) bg-black/30 px-3 py-2 text-center outline-none focus:border-(--color-rosa)"
        />
        <span className="text-(--color-testo-tenue)">min (vuoto = senza limite)</span>
      </label>
      <button
        onClick={() => void azione('tappe', { azione: 'apri', tappa: indice, minuti: minuti === '' ? null : Number(minuti) })}
        className={`rounded-xl bg-(--color-verde) font-black text-black hover:brightness-110 ${
          grande ? 'px-8 py-4 text-3xl' : 'px-5 py-2.5 text-lg'
        }`}
      >
        VIA! {singola ? '' : `Tappa ${indice + 1} · ${tappa.nome}`}
      </button>
    </div>
  );
}

/* --------------------------------------------------------------- tappa in corso */

function TappaInCorso({
  giro,
  indice,
  allievi,
  singola,
  leader,
  azione,
}: {
  giro: GiroLim;
  indice: number;
  allievi: AllievoLim[];
  singola: boolean;
  leader: string | null;
  azione: (rotta: string, corpo: Record<string, unknown>) => Promise<void>;
}) {
  const tappa = giro.tappe[indice];
  const [adesso, setAdesso] = useState(() => Date.now());
  const [scelto, setScelto] = useState<string | null>(null);
  useEffect(() => {
    if (!tappa.scadenza) return;
    const timer = setInterval(() => setAdesso(Date.now()), 500);
    return () => clearInterval(timer);
  }, [tappa.scadenza]);

  const secondi = tappa.scadenza ? Math.max(0, Math.ceil((tappa.scadenza.getTime() - adesso) / 1000)) : null;
  const scaduta = secondi === 0;
  const righe = useMemo(
    () =>
      classificaTappa(
        allievi.map((a) => {
          const p = a.tappe[String(indice)];
          return {
            id: a.id,
            name: a.name,
            numero: a.numero,
            progresso: p ? { km: p.km, ultimoAt: p.ultimoAt?.getTime() ?? null, errori: p.errori } : null,
          };
        }),
      ),
    [allievi, indice],
  );
  const perId = useMemo(() => new Map(allievi.map((a) => [a.id, a])), [allievi]);
  const eventi = useMemo(() => cronaca(allievi, indice), [allievi, indice]);
  // Nella gara singola la maglia rosa va a chi guida la tappa, che è la gara intera.
  const maglia = singola ? (righe[0]?.km ? righe[0].id : null) : leader;

  return (
    <div className="flex flex-1 flex-col gap-5">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-(--color-bordo) bg-(--color-fondo-card) px-5 py-3">
        <p className="text-2xl font-bold">
          {singola ? tappa.nome : `Tappa ${indice + 1} · ${tappa.nome}`}
          <span className="ml-3 text-lg font-normal text-(--color-testo-tenue)">{tappa.km} km</span>
        </p>
        {secondi !== null && (
          <p
            aria-label="tempo rimasto"
            className={`font-mono text-5xl font-black ${scaduta ? 'text-red-400' : secondi <= 60 ? 'text-(--color-giallo)' : ''}`}
          >
            {scaduta ? 'TEMPO!' : `⏱ ${formattaSecondi(secondi)}`}
          </p>
        )}
        <button
          onClick={() => void azione('tappe', { azione: 'chiudi', tappa: indice })}
          className={`rounded-lg px-5 py-2.5 text-lg font-bold ${
            scaduta ? 'bg-(--color-rosa) text-white hover:brightness-110' : 'border border-(--color-bordo) text-(--color-testo-tenue)'
          }`}
        >
          {singola ? 'Chiudi la gara e mostra la classifica' : 'Chiudi la tappa'}
        </button>
      </section>

      <div className="flex flex-1 flex-col gap-5 lg:flex-row">
        <section className="flex-1">
          <ul aria-label="classifica" className="flex flex-col gap-2">
            {righe.map((r) => {
              const a = perId.get(r.id);
              const arrivo = a?.tappe[String(indice)]?.ordineArrivo ?? null;
              return (
                <li
                  key={r.id}
                  onClick={() => setScelto(scelto === r.id ? null : r.id)}
                  className={`cursor-pointer rounded-xl border p-3 ${
                    r.posizione === 1 && r.km > 0
                      ? 'border-(--color-rosa) bg-(--color-rosa)/10'
                      : 'border-(--color-bordo) bg-(--color-fondo-card)'
                  }`}
                >
                  <div className="flex items-baseline gap-3">
                    <span className="w-8 text-2xl font-black text-(--color-testo-tenue)">{r.posizione}</span>
                    {r.numero !== null && <span className="font-mono text-xl text-(--color-testo-tenue)">{r.numero}</span>}
                    {maglia === r.id && <MagliaRosa />}
                    <span className="text-2xl font-bold">{r.name}</span>
                    <span className="text-xl text-(--color-testo-tenue)">
                      {r.km}/{tappa.km} km
                    </span>
                    {arrivo !== null && <span className="text-xl text-(--color-giallo)">🏁 {arrivo}° arrivato</span>}
                    {r.errori > 0 && (
                      <span className="ml-auto text-lg text-(--color-testo-tenue)">
                        {r.errori} {r.errori === 1 ? 'errore' : 'errori'}
                      </span>
                    )}
                  </div>
                  <Strada fatti={r.km} totale={tappa.km} />
                  {scelto === r.id && a && (
                    <Azioni allievo={a} indice={indice} km={tappa.km} azione={(c) => azione('allievi', { ...c, playerId: a.id })} />
                  )}
                </li>
              );
            })}
            {righe.length === 0 && <p className="text-2xl text-(--color-testo-tenue)">Nessuno in gara.</p>}
          </ul>
        </section>

        <aside className="flex w-full flex-col gap-4 lg:w-80">
          <section className="rounded-xl border border-(--color-bordo) bg-(--color-fondo-card) p-4">
            <h2 className="mb-2 font-bold text-(--color-testo-tenue)">Cronaca</h2>
            <ul aria-label="cronaca" className="flex flex-col gap-1 text-lg">
              {eventi.map((e, i) => (
                <li key={i}>
                  <span className="font-bold">{e.nome}</span> ha chiuso il km {e.km}
                </li>
              ))}
              {eventi.length === 0 && <li className="text-(--color-testo-tenue)">Ancora nessun chilometro chiuso.</li>}
            </ul>
          </section>
          {!singola && giro.generale.length > 0 && (
            <section className="rounded-xl border border-(--color-rosa)/40 bg-(--color-rosa)/5 p-4">
              <h2 className="mb-2 font-bold text-(--color-rosa)">Generale prima di questa tappa</h2>
              <ol className="flex flex-col gap-1 text-lg">
                {giro.generale.slice(0, 5).map((g) => (
                  <li key={g.id} className="flex justify-between gap-2">
                    <span>
                      {g.posizione}. {g.name}
                    </span>
                    <span className="text-(--color-testo-tenue)">{g.punti} pt</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

/* --------------------------------------------------------- fra una tappa e l'altra */

function FraLeTappe({
  giro,
  allievi,
  azione,
}: {
  giro: GiroLim;
  allievi: AllievoLim[];
  azione: (rotta: string, corpo: Record<string, unknown>) => Promise<void>;
}) {
  const ultima = giro.tappe.map((t, i) => ({ t, i })).filter(({ t }) => t.stato === 'chiusa').pop();
  const prossima = giro.tappe.findIndex((t) => t.stato === 'da-correre');
  const [mostraNumeri, setMostraNumeri] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      {mostraNumeri ? (
        <section className="flex flex-col items-center gap-4">
          <p className="text-2xl text-(--color-testo-tenue)">
            Codice <span className="font-mono text-4xl font-black text-(--color-rosa)">{giro.code}</span> · chi rientra
            usa il suo numero
          </p>
          <ListaCorridori allievi={allievi} />
          <button onClick={() => setMostraNumeri(false)} className="text-(--color-testo-tenue) underline">
            torna alla classifica
          </button>
        </section>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex flex-1 flex-col gap-6">
            {ultima && <RisultatiTappa giro={giro} indice={ultima.i} allievi={allievi} />}
            {prossima >= 0 ? (
              <section className="flex flex-col items-center gap-3 rounded-xl border border-(--color-verde)/40 bg-(--color-verde)/5 p-5">
                <p className="text-xl">
                  Prossima: <span className="font-bold">tappa {prossima + 1} · {giro.tappe[prossima].nome}</span>
                </p>
                <ApriTappa key={prossima} giro={giro} indice={prossima} azione={azione} />
                <button onClick={() => setMostraNumeri(true)} className="text-(--color-testo-tenue) underline">
                  mostra codice e numeri di corsa
                </button>
              </section>
            ) : (
              <p className="text-xl text-(--color-testo-tenue)">
                Tutte le tappe sono state corse: aggiungine un&apos;altra, oppure chiudi il Giro.
              </p>
            )}
          </div>
          <aside className="flex w-full flex-col gap-4 lg:w-96">
            <ClassificaGenerale giro={giro} azione={azione} />
            <PianoGiro giro={giro} azione={azione} />
          </aside>
        </div>
      )}
    </div>
  );
}

function RisultatiTappa({ giro, indice, allievi }: { giro: GiroLim; indice: number; allievi: AllievoLim[] }) {
  const tappa = giro.tappe[indice];
  const righe = allievi
    .map((a) => ({ a, p: a.tappe[String(indice)] }))
    .filter((x) => x.p && x.p.posizione !== null)
    .sort((x, y) => (x.p!.posizione ?? 0) - (y.p!.posizione ?? 0));
  return (
    <section className="rounded-xl border border-(--color-bordo) bg-(--color-fondo-card) p-5">
      <h2 className="mb-3 text-2xl font-bold">
        Tappa {indice + 1} · {tappa.nome}: ordine d&apos;arrivo
      </h2>
      <Podio nomi={righe.slice(0, 3).map(({ a, p }) => ({ id: a.id, name: a.name, sotto: `${p!.km} km · ${p!.punti} pt` }))} />
      <ol aria-label="ordine d'arrivo" className="mt-4 grid gap-x-8 gap-y-1 text-lg sm:grid-cols-2">
        {righe.map(({ a, p }) => (
          <li key={a.id} className="flex justify-between gap-2">
            <span>
              {p!.posizione}. {a.name}
            </span>
            <span className="text-(--color-testo-tenue)">
              {p!.km} km · {p!.punti} pt
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ClassificaGenerale({
  giro,
  azione,
}: {
  giro: GiroLim;
  azione: (rotta: string, corpo: Record<string, unknown>) => Promise<void>;
}) {
  const [n, setN] = useState(giro.migliori ? String(giro.migliori) : '');
  return (
    <section className="rounded-xl border border-(--color-rosa)/50 bg-(--color-rosa)/5 p-4">
      <h2 className="mb-2 text-xl font-bold text-(--color-rosa)">Classifica generale</h2>
      <ol aria-label="classifica generale" className="flex flex-col gap-1 text-lg">
        {giro.generale.map((g) => (
          <li key={g.id} className="flex items-baseline justify-between gap-2">
            <span className="flex items-baseline gap-2">
              <span className="w-6 text-right text-(--color-testo-tenue)">{g.posizione}</span>
              {g.posizione === 1 && g.punti > 0 && <MagliaRosa />}
              <span className="font-bold">{g.name}</span>
            </span>
            <span className="text-(--color-testo-tenue)">{g.punti} pt</span>
          </li>
        ))}
        {giro.generale.length === 0 && <li className="text-(--color-testo-tenue)">Ancora nessun punto.</li>}
      </ol>
      <label className="mt-3 flex flex-wrap items-center gap-2 border-t border-(--color-bordo) pt-3 text-sm">
        <span className="text-(--color-testo-tenue)">Contano le migliori</span>
        <input
          type="number"
          min={1}
          max={30}
          value={n}
          onChange={(e) => setN(e.target.value)}
          placeholder="tutte"
          aria-label="tappe migliori"
          className="w-20 rounded-lg border border-(--color-bordo) bg-black/30 px-2 py-1 text-center outline-none focus:border-(--color-rosa)"
        />
        <span className="text-(--color-testo-tenue)">tappe di ciascuno</span>
        <button
          onClick={() => void azione('tappe', { azione: 'migliori', migliori: n === '' ? null : Number(n) })}
          className="rounded-lg border border-(--color-bordo) px-3 py-1 hover:border-(--color-rosa)"
        >
          Applica
        </button>
      </label>
    </section>
  );
}

function PianoGiro({
  giro,
  azione,
}: {
  giro: GiroLim;
  azione: (rotta: string, corpo: Record<string, unknown>) => Promise<void>;
}) {
  const [tema, setTema] = useState<Tema>(TEMI_DEL_GIRO[0].id);
  const segno = { 'da-correre': '○', 'in-corso': '▶', chiusa: '✔' } as const;
  return (
    <section className="rounded-xl border border-(--color-bordo) bg-(--color-fondo-card) p-4">
      <h2 className="mb-2 font-bold text-(--color-testo-tenue)">Il Giro</h2>
      <ol aria-label="piano del giro" className="flex flex-col gap-1">
        {giro.tappe.map((t, i) => (
          <li key={i} className={t.stato === 'chiusa' ? 'text-(--color-testo-tenue)' : ''}>
            {segno[t.stato]} Tappa {i + 1} · {t.nome}
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-(--color-bordo) pt-3 text-sm">
        <select
          value={tema}
          onChange={(e) => setTema(e.target.value as Tema)}
          aria-label="tappa da aggiungere"
          className="rounded-lg border border-(--color-bordo) bg-black/30 px-2 py-1"
        >
          {TEMI_DEL_GIRO.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
        <button
          onClick={() => void azione('tappe', { azione: 'aggiungi', tema })}
          className="rounded-lg border border-(--color-bordo) px-3 py-1 hover:border-(--color-rosa)"
        >
          Aggiungi tappa
        </button>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------- fine Giro */

function FineGiro({ giro, allievi, singola }: { giro: GiroLim; allievi: AllievoLim[]; singola: boolean }) {
  const riepilogo = useMemo(
    () => riepilogoErrori(giro.tappe.map((t) => t.tipi), allievi),
    [giro, allievi],
  );
  const podio = singola
    ? allievi
        .map((a) => ({ a, p: a.tappe['0'] }))
        .filter((x) => x.p && x.p.posizione !== null)
        .sort((x, y) => (x.p!.posizione ?? 0) - (y.p!.posizione ?? 0))
        .slice(0, 3)
        .map(({ a, p }) => ({ id: a.id, name: a.name, sotto: `${p!.km} km` }))
    : giro.generale.slice(0, 3).map((g) => ({ id: g.id, name: g.name, sotto: `${g.punti} punti` }));

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex flex-1 flex-col gap-6">
        <section>
          <h2 className="mb-3 text-center text-3xl font-black">{singola ? 'Classifica finale' : 'Il podio del Giro'}</h2>
          <Podio nomi={podio} />
        </section>
        {singola ? (
          <RisultatiTappa giro={giro} indice={0} allievi={allievi} />
        ) : (
          <ClassificaFinale righe={giro.generale} />
        )}
      </div>
      {riepilogo.some((r) => r.errori > 0) && (
        <aside className="w-full lg:w-96">
          <section className="rounded-xl border border-(--color-giallo)/40 bg-(--color-giallo)/5 p-4">
            <h2 className="mb-2 text-xl font-bold text-(--color-giallo)">Da rispiegare</h2>
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
              In ordine di errori per chilometro: in cima quello che ha dato più filo da torcere.
            </p>
          </section>
        </aside>
      )}
    </div>
  );
}

function ClassificaFinale({ righe }: { righe: RigaGenerale[] }) {
  return (
    <ol aria-label="classifica generale" className="grid gap-x-8 gap-y-1 text-xl sm:grid-cols-2">
      {righe.map((g) => (
        <li key={g.id} className="flex justify-between gap-2">
          <span>
            {g.posizione}. {g.name}
          </span>
          <span className="text-(--color-testo-tenue)">{g.punti} pt</span>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ pezzi comuni */

function MagliaRosa() {
  // L'emoji della maglietta è verde: la maglia rosa si fa col colore.
  return (
    <span className="rounded-md bg-(--color-rosa) px-2 py-0.5 text-sm font-black whitespace-nowrap text-white uppercase">
      maglia rosa
    </span>
  );
}

function Podio({ nomi }: { nomi: Array<{ id: string; name: string; sotto: string }> }) {
  const medaglie = ['🥇', '🥈', '🥉'];
  if (nomi.length === 0) return null;
  return (
    <div className="flex flex-wrap items-end justify-center gap-6 rounded-xl border border-(--color-rosa)/40 bg-(--color-rosa)/5 p-6">
      {nomi.map((n, i) => (
        <div key={n.id} className="text-center">
          <p className="text-5xl">{medaglie[i]}</p>
          <p className="text-2xl font-bold">{n.name}</p>
          <p className="text-(--color-testo-tenue)">{n.sotto}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * La lista dei corridori con il loro numero, da proiettare: è da qui che gli allievi
 * leggono il numero che serve a rientrare da un altro computer.
 */
function ListaCorridori({ allievi }: { allievi: AllievoLim[] }) {
  const perNumero = [...allievi].sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0));
  return (
    <div className="w-full">
      <p className="mb-3 text-center text-2xl text-(--color-testo-tenue)">
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

/** I chilometri percorsi: una casella per chilometro, il ciclista dove è arrivato. */
function Strada({ fatti, totale }: { fatti: number; totale: number }) {
  return (
    <div className="relative mt-2 flex items-center gap-1">
      {Array.from({ length: totale }, (_, i) => (
        <div key={i} className={`h-3 flex-1 rounded-full ${i < fatti ? 'bg-(--color-rosa)' : 'bg-(--color-bordo)'}`} />
      ))}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-1 text-xl transition-all duration-500"
        style={{ left: `calc(${(Math.min(fatti, totale) / Math.max(totale, 1)) * 100}% - 0.6rem)` }}
      >
        🚴
      </span>
    </div>
  );
}

/** Correzioni sul singolo allievo: si aprono toccando la sua riga. */
function Azioni({
  allievo,
  indice,
  km,
  azione,
}: {
  allievo: AllievoLim;
  indice: number;
  km: number;
  azione: (corpo: Record<string, unknown>) => Promise<void>;
}) {
  const [nome, setNome] = useState(allievo.name);
  const fatti = allievo.tappe[String(indice)]?.km ?? 0;
  const [kmRitorno, setKmRitorno] = useState(Math.max(1, fatti));

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
            onClick={() => void azione({ azione: 'rinomina', name: nome })}
            className="rounded-lg border border-(--color-bordo) px-3 py-1.5 hover:border-(--color-rosa)"
          >
            Salva
          </button>
        </div>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-(--color-testo-tenue)">Rimanda al km</span>
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            max={km}
            value={kmRitorno}
            onChange={(e) => setKmRitorno(Number(e.target.value))}
            className="w-20 rounded-lg border border-(--color-bordo) bg-black/30 px-3 py-1.5 outline-none focus:border-(--color-rosa)"
          />
          <button
            onClick={() => void azione({ azione: 'rimanda', tappa: indice, km: kmRitorno - 1 })}
            className="rounded-lg border border-(--color-bordo) px-3 py-1.5 hover:border-(--color-rosa)"
          >
            Rimanda
          </button>
        </div>
      </label>

      <button
        onClick={() => {
          if (confirm(`Eliminare ${allievo.name} dal Giro?`)) void azione({ azione: 'elimina' });
        }}
        className="ml-auto rounded-lg border border-red-500/40 px-3 py-1.5 text-red-300 hover:bg-red-500/10"
      >
        Elimina
      </button>
    </div>
  );
}
