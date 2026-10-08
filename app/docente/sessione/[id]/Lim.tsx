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
    // Tutto deve stare in uno schermo della LIM, anche 1280x720: niente da scorrere
    // mentre la classe guarda. Per questo intestazione su una riga e margini stretti.
    <main className="flex min-h-screen flex-col gap-3 p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex flex-wrap items-baseline gap-x-4">
          <h1 className="text-2xl font-black text-(--color-rosa)">Il Giro dei Cicli</h1>
          <p className="text-lg text-(--color-testo-tenue)">
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
              className="rounded-lg border border-(--color-bordo) px-3 py-1 text-sm text-(--color-testo-tenue) hover:text-(--color-testo)"
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

/* --------------------------------------------------------------- densità a schermo */

/**
 * Quante colonne servono perché la classe intera stia in uno schermo. Con pochi allievi
 * righe grandi, una sotto l'altra; con una classe piena, righe compatte su più colonne.
 * Le soglie vengono dalle misure a 1280x720 con 25 allievi.
 */
function colonnePer(quanti: number): 1 | 2 | 3 {
  if (quanti <= 8) return 1;
  if (quanti <= 18) return 2;
  return 3;
}

// Le classi di Tailwind devono comparire intere nel sorgente: niente `grid-cols-${n}`.
const GRIGLIA = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3' } as const;

/**
 * Righe per colonna di un elenco riempito dall'alto in basso: con `grid-auto-flow: column`
 * la griglia ha bisogno di sapere quante righe ha ogni colonna.
 */
function righePerColonna(quanti: number, colonne: number): React.CSSProperties {
  return { gridTemplateRows: `repeat(${Math.max(1, Math.ceil(quanti / colonne))}, auto)` };
}

/** Conferma prima di cancellare una tappa: il messaggio dice che cosa succede davvero. */
function confermaCancellazione(tappa: TappaLim, indice: number): boolean {
  const nome = `la tappa ${indice + 1} · ${tappa.nome}`;
  if (tappa.stato === 'chiusa') {
    return confirm(`Cancellare ${nome}? I suoi punti verranno tolti a tutti e la classifica generale ricalcolata.`);
  }
  if (tappa.stato === 'in-corso') return confirm(`Annullare ${nome}? Finisce subito e non assegna punti.`);
  return confirm(`Togliere ${nome} dal Giro?`);
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
  // Il codice gigante si restringe quando la lista dei corridori diventa lunga: il VIA
  // deve restare sullo schermo.
  const affollato = allievi.length > 10;
  return (
    <section className="flex flex-1 flex-col items-center gap-3">
      <p className="text-xl text-(--color-testo-tenue)">Entrate su questo sito con il codice</p>
      <p
        className={`font-mono leading-none font-black tracking-[0.1em] text-(--color-rosa) ${
          affollato ? 'text-[5rem]' : 'text-[8rem]'
        }`}
      >
        {giro.code}
      </p>
      {allievi.length === 0 ? (
        <p className="text-3xl">Nessuno in griglia di partenza</p>
      ) : (
        <ListaCorridori allievi={allievi} />
      )}
      <ApriTappa giro={giro} indice={0} azione={azione} grande={!affollato} />
      {giro.tappe.length > 1 && (
        <div className="w-full max-w-md">
          <PianoGiro giro={giro} azione={azione} />
        </div>
      )}
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
    <div className="flex flex-wrap items-center justify-center gap-3">
      <label className="flex items-center gap-2">
        <span className="text-(--color-testo-tenue)">durata</span>
        <input
          type="number"
          min={1}
          max={120}
          value={minuti}
          onChange={(e) => setMinuti(e.target.value)}
          placeholder="∞"
          aria-label="minuti"
          className="w-16 rounded-lg border border-(--color-bordo) bg-black/30 px-2 py-1.5 text-center outline-none focus:border-(--color-rosa)"
        />
        <span className="text-sm text-(--color-testo-tenue)">min (vuoto = senza limite)</span>
      </label>
      <button
        onClick={() => void azione('tappe', { azione: 'apri', tappa: indice, minuti: minuti === '' ? null : Number(minuti) })}
        className={`rounded-xl bg-(--color-verde) font-black text-black hover:brightness-110 ${
          grande ? 'px-8 py-3 text-3xl' : 'px-5 py-2 text-xl'
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
  const eventi = useMemo(() => cronaca(allievi, indice, 5), [allievi, indice]);
  // Nella gara singola la maglia rosa va a chi guida la tappa, che è la gara intera.
  const maglia = singola ? (righe[0]?.km ? righe[0].id : null) : leader;
  const colonne = colonnePer(righe.length);

  return (
    <div className="flex flex-1 flex-col gap-3">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-(--color-bordo) bg-(--color-fondo-card) px-4 py-2">
        <p className="text-xl font-bold">
          {singola ? tappa.nome : `Tappa ${indice + 1} · ${tappa.nome}`}
          <span className="ml-3 text-base font-normal text-(--color-testo-tenue)">{tappa.km} km</span>
        </p>
        {secondi !== null && (
          <p
            aria-label="tempo rimasto"
            className={`font-mono text-4xl font-black ${scaduta ? 'text-red-400' : secondi <= 60 ? 'text-(--color-giallo)' : ''}`}
          >
            {scaduta ? 'TEMPO!' : `⏱ ${formattaSecondi(secondi)}`}
          </p>
        )}
        <div className="flex items-center gap-3">
          {!singola && (
            <button
              onClick={() => {
                if (confermaCancellazione(tappa, indice)) void azione('tappe', { azione: 'elimina', tappa: indice });
              }}
              className="text-sm text-(--color-testo-tenue) underline"
            >
              annulla questa tappa
            </button>
          )}
          <button
            onClick={() => void azione('tappe', { azione: 'chiudi', tappa: indice })}
            className={`rounded-lg px-4 py-2 font-bold ${
              scaduta ? 'bg-(--color-rosa) text-white hover:brightness-110' : 'border border-(--color-bordo) text-(--color-testo-tenue)'
            }`}
          >
            {singola ? 'Chiudi la gara e mostra la classifica' : 'Chiudi la tappa'}
          </button>
        </div>
      </section>

      <div className="flex flex-1 gap-4">
        {/* Riempita per colonne, dall'alto in basso: una classifica si legge così, non a righe. */}
        <ul
          aria-label="classifica"
          className={`grid flex-1 grid-flow-col content-start gap-x-3 gap-y-1.5 ${GRIGLIA[colonne]}`}
          style={righePerColonna(righe.length, colonne)}
        >
          {righe.map((r) => {
            const a = perId.get(r.id);
            return (
              <RigaCorridore
                key={r.id}
                posizione={r.posizione}
                numero={r.numero}
                nome={r.name}
                km={r.km}
                totale={tappa.km}
                errori={r.errori}
                arrivo={a?.tappe[String(indice)]?.ordineArrivo ?? null}
                maglia={maglia === r.id}
                inTesta={r.posizione === 1 && r.km > 0}
                compatta={colonne > 1}
                scelto={scelto === r.id}
                onClick={() => setScelto(scelto === r.id ? null : r.id)}
              >
                {a && (
                  <Azioni allievo={a} indice={indice} km={tappa.km} azione={(c) => azione('allievi', { ...c, playerId: a.id })} />
                )}
              </RigaCorridore>
            );
          })}
          {righe.length === 0 && <p className="text-2xl text-(--color-testo-tenue)">Nessuno in gara.</p>}
        </ul>

        {/* Con tre colonne la classe riempie lo schermo: cronaca e generale lasciano il posto. */}
        {colonne < 3 && (
          <aside className="hidden w-64 shrink-0 flex-col gap-3 lg:flex">
            <section className="rounded-xl border border-(--color-bordo) bg-(--color-fondo-card) p-3">
              <h2 className="mb-1 text-sm font-bold text-(--color-testo-tenue)">Cronaca</h2>
              <ul aria-label="cronaca" className="flex flex-col gap-0.5">
                {eventi.map((e, i) => (
                  <li key={i}>
                    <span className="font-bold">{e.nome}</span> ha chiuso il km {e.km}
                  </li>
                ))}
                {eventi.length === 0 && <li className="text-(--color-testo-tenue)">Ancora nessun chilometro chiuso.</li>}
              </ul>
            </section>
            {!singola && giro.generale.length > 0 && (
              <section className="rounded-xl border border-(--color-rosa)/40 bg-(--color-rosa)/5 p-3">
                <h2 className="mb-1 text-sm font-bold text-(--color-rosa)">Generale prima di questa tappa</h2>
                <ol className="flex flex-col gap-0.5">
                  {giro.generale.slice(0, 5).map((g) => (
                    <li key={g.id} className="flex justify-between gap-2">
                      <span className="truncate">
                        {g.posizione}. {g.name}
                      </span>
                      <span className="text-(--color-testo-tenue)">{g.punti} pt</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

/**
 * Un corridore nella tappa. Con pochi allievi la riga è grande, con la strada intera e il
 * ciclista; con la classe piena sta tutta su una linea, e la strada diventa cinque
 * caselle accanto al nome.
 */
function RigaCorridore({
  posizione,
  numero,
  nome,
  km,
  totale,
  errori,
  arrivo,
  maglia,
  inTesta,
  compatta,
  scelto,
  onClick,
  children,
}: {
  posizione: number;
  numero: number | null;
  nome: string;
  km: number;
  totale: number;
  errori: number;
  arrivo: number | null;
  maglia: boolean;
  inTesta: boolean;
  compatta: boolean;
  scelto: boolean;
  onClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <li
      onClick={onClick}
      className={`cursor-pointer rounded-lg border ${compatta ? 'px-2 py-1' : 'px-3 py-2'} ${
        inTesta ? 'border-(--color-rosa) bg-(--color-rosa)/10' : 'border-(--color-bordo) bg-(--color-fondo-card)'
      } ${scelto && compatta ? 'col-span-full' : ''}`}
    >
      <div className="flex items-center gap-2">
        <span className={`w-8 shrink-0 text-right font-black text-(--color-testo-tenue) ${compatta ? 'text-xl' : 'text-2xl'}`}>
          {posizione}
        </span>
        {/* Il numero di corsa sembra un dorsale: accanto alla posizione, due numeri nudi si confondono. */}
        {numero !== null && <Dorsale numero={numero} />}
        {maglia && <MagliaRosa piccola={compatta} />}
        <span className={`min-w-0 flex-1 truncate font-bold ${compatta ? 'text-xl' : 'text-2xl'}`}>{nome}</span>
        {compatta && <Caselle fatti={km} totale={totale} />}
        <span className={`shrink-0 font-mono text-(--color-testo-tenue) ${compatta ? 'text-sm' : 'text-xl'}`}>
          {km}/{totale} km
        </span>
        {arrivo !== null && (
          <span className={`shrink-0 text-(--color-giallo) ${compatta ? 'text-sm' : 'text-xl'}`}>
            🏁 {arrivo}°{compatta ? '' : ' arrivato'}
          </span>
        )}
        {!compatta && errori > 0 && (
          <span className="ml-auto shrink-0 text-lg text-(--color-testo-tenue)">
            {errori} {errori === 1 ? 'errore' : 'errori'}
          </span>
        )}
      </div>
      {!compatta && <Strada fatti={km} totale={totale} />}
      {scelto && children}
    </li>
  );
}

/** Il numero di corsa disegnato come il dorsale di un ciclista. */
function Dorsale({ numero }: { numero: number }) {
  return (
    <span
      aria-label={`numero ${numero}`}
      className="shrink-0 rounded border border-(--color-rosa)/60 bg-white/90 px-1 font-mono text-xs leading-4 font-black text-black"
    >
      {numero}
    </span>
  );
}

/** I chilometri come caselle accese, per le righe compatte. */
function Caselle({ fatti, totale }: { fatti: number; totale: number }) {
  return (
    <span className="flex shrink-0 gap-0.5" aria-hidden>
      {Array.from({ length: totale }, (_, i) => (
        <span key={i} className={`h-3 w-4 rounded-sm ${i < fatti ? 'bg-(--color-rosa)' : 'bg-(--color-bordo)'}`} />
      ))}
    </span>
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
    <div className="flex flex-1 flex-col gap-3">
      {/* In alto, su una riga: che cosa viene dopo. È il comando che serve per primo. */}
      <section className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-xl border border-(--color-verde)/40 bg-(--color-verde)/5 px-4 py-2">
        {prossima >= 0 ? (
          <>
            <p className="text-lg">
              Prossima: <span className="font-bold">tappa {prossima + 1} · {giro.tappe[prossima].nome}</span>
            </p>
            <ApriTappa key={prossima} giro={giro} indice={prossima} azione={azione} />
          </>
        ) : (
          <p className="text-lg text-(--color-testo-tenue)">
            Tutte le tappe sono state corse: aggiungine un&apos;altra dal piano del Giro, oppure chiudi il Giro.
          </p>
        )}
        <button onClick={() => setMostraNumeri((m) => !m)} className="text-(--color-testo-tenue) underline">
          {mostraNumeri ? 'torna alla classifica' : 'mostra codice e numeri di corsa'}
        </button>
      </section>

      {mostraNumeri ? (
        <section className="flex flex-col items-center gap-3">
          <p className="text-2xl text-(--color-testo-tenue)">
            Codice <span className="font-mono text-4xl font-black text-(--color-rosa)">{giro.code}</span> · chi rientra
            usa il suo numero
          </p>
          <ListaCorridori allievi={allievi} />
        </section>
      ) : (
        <div className="flex flex-1 flex-col gap-4 lg:flex-row">
          <div className="min-w-0 flex-1">{ultima && <RisultatiTappa giro={giro} indice={ultima.i} allievi={allievi} />}</div>
          <aside className="flex w-full shrink-0 flex-col gap-3 lg:w-[30rem]">
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
  const colonne = righe.length > 14 ? 3 : 2;
  return (
    <section className="rounded-xl border border-(--color-bordo) bg-(--color-fondo-card) p-4">
      <h2 className="mb-2 text-xl font-bold">
        Tappa {indice + 1} · {tappa.nome}: ordine d&apos;arrivo
      </h2>
      <Podio nomi={righe.slice(0, 3).map(({ a, p }) => ({ id: a.id, name: a.name, sotto: `${p!.km} km · ${p!.punti} pt` }))} />
      <ol
        aria-label="ordine d'arrivo"
        className={`mt-3 grid grid-flow-col gap-x-6 gap-y-0.5 ${GRIGLIA[colonne]}`}
        style={righePerColonna(righe.length, colonne)}
      >
        {righe.map(({ a, p }) => (
          <li key={a.id} className="flex justify-between gap-2">
            <span className="truncate">
              {p!.posizione}. {a.name}
            </span>
            <span className="shrink-0 text-(--color-testo-tenue)">
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
  const dueColonne = giro.generale.length > 12;
  return (
    <section className="rounded-xl border border-(--color-rosa)/50 bg-(--color-rosa)/5 p-3">
      <h2 className="mb-1 text-lg font-bold text-(--color-rosa)">Classifica generale</h2>
      <ol
        aria-label="classifica generale"
        className={`grid grid-flow-col gap-x-4 gap-y-0.5 ${dueColonne ? 'grid-cols-2 text-base' : 'grid-cols-1 text-lg'}`}
        style={righePerColonna(giro.generale.length, dueColonne ? 2 : 1)}
      >
        {giro.generale.map((g) => (
          <li key={g.id} className="flex items-baseline justify-between gap-2">
            <span className="flex min-w-0 items-baseline gap-1.5">
              <span className="w-6 shrink-0 text-right text-(--color-testo-tenue)">{g.posizione}</span>
              {g.posizione === 1 && g.punti > 0 && <MagliaRosa piccola />}
              <span className="truncate font-bold">{g.name}</span>
            </span>
            <span className="shrink-0 text-(--color-testo-tenue)">{g.punti} pt</span>
          </li>
        ))}
        {giro.generale.length === 0 && <li className="text-(--color-testo-tenue)">Ancora nessun punto.</li>}
      </ol>
      <label className="mt-2 flex flex-wrap items-center gap-2 border-t border-(--color-bordo) pt-2 text-sm">
        <span className="text-(--color-testo-tenue)">Contano le migliori</span>
        <input
          type="number"
          min={1}
          max={30}
          value={n}
          onChange={(e) => setN(e.target.value)}
          placeholder="tutte"
          aria-label="tappe migliori"
          className="w-16 rounded-lg border border-(--color-bordo) bg-black/30 px-2 py-0.5 text-center outline-none focus:border-(--color-rosa)"
        />
        <span className="text-(--color-testo-tenue)">tappe di ciascuno</span>
        <button
          onClick={() => void azione('tappe', { azione: 'migliori', migliori: n === '' ? null : Number(n) })}
          className="rounded-lg border border-(--color-bordo) px-2 py-0.5 hover:border-(--color-rosa)"
        >
          Applica
        </button>
      </label>
    </section>
  );
}

/**
 * Il piano del Giro, chiuso di partenza: serve al docente ogni tanto (aggiungere o togliere
 * una tappa), e aperto ruberebbe alla classe lo spazio dello schermo.
 */
function PianoGiro({
  giro,
  azione,
}: {
  giro: GiroLim;
  azione: (rotta: string, corpo: Record<string, unknown>) => Promise<void>;
}) {
  const [tema, setTema] = useState<Tema>(TEMI_DEL_GIRO[0].id);
  const segno = { 'da-correre': '○', 'in-corso': '▶', chiusa: '✔' } as const;
  const corse = giro.tappe.filter((t) => t.stato === 'chiusa').length;
  return (
    <details className="rounded-xl border border-(--color-bordo) bg-(--color-fondo-card) px-3 py-2">
      <summary className="cursor-pointer font-bold text-(--color-testo-tenue)">
        Il Giro: {giro.tappe.length} {giro.tappe.length === 1 ? 'tappa' : 'tappe'}, {corse}{' '}
        {corse === 1 ? 'corsa' : 'corse'}
      </summary>
      <ol aria-label="piano del giro" className="mt-2 flex flex-col gap-0.5">
        {giro.tappe.map((t, i) => (
          <li key={i} className={`flex items-center gap-2 ${t.stato === 'chiusa' ? 'text-(--color-testo-tenue)' : ''}`}>
            <span>
              {segno[t.stato]} Tappa {i + 1} · {t.nome}
            </span>
            {/* Un Giro deve avere almeno una tappa: l'ultima non si toglie. */}
            {giro.tappe.length > 1 && (
              <button
                onClick={() => {
                  if (confermaCancellazione(t, i)) void azione('tappe', { azione: 'elimina', tappa: i });
                }}
                aria-label={`cancella la tappa ${i + 1}`}
                title="Cancella questa tappa"
                className="ml-auto rounded px-2 text-(--color-testo-tenue) hover:bg-red-500/10 hover:text-red-300"
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ol>
      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-(--color-bordo) pt-2 text-sm">
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
    </details>
  );
}

/* --------------------------------------------------------------------- fine Giro */

function FineGiro({ giro, allievi, singola }: { giro: GiroLim; allievi: AllievoLim[]; singola: boolean }) {
  const riepilogo = useMemo(() => riepilogoErrori(giro.tappe.map((t) => t.tipi), allievi), [giro, allievi]);
  const podio = singola
    ? allievi
        .map((a) => ({ a, p: a.tappe['0'] }))
        .filter((x) => x.p && x.p.posizione !== null)
        .sort((x, y) => (x.p!.posizione ?? 0) - (y.p!.posizione ?? 0))
        .slice(0, 3)
        .map(({ a, p }) => ({ id: a.id, name: a.name, sotto: `${p!.km} km` }))
    : giro.generale.slice(0, 3).map((g) => ({ id: g.id, name: g.name, sotto: `${g.punti} punti` }));

  return (
    <div className="flex flex-1 flex-col gap-4 lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <section>
          <h2 className="mb-2 text-center text-2xl font-black">{singola ? 'Classifica finale' : 'Il podio del Giro'}</h2>
          <Podio nomi={podio} />
        </section>
        {singola ? <RisultatiTappa giro={giro} indice={0} allievi={allievi} /> : <ClassificaFinale righe={giro.generale} />}
      </div>
      {riepilogo.some((r) => r.errori > 0) && (
        <aside className="w-full shrink-0 lg:w-80">
          <section className="rounded-xl border border-(--color-giallo)/40 bg-(--color-giallo)/5 p-3">
            <h2 className="mb-1 text-lg font-bold text-(--color-giallo)">Da rispiegare</h2>
            <ul className="flex flex-col gap-0.5">
              {riepilogo.map((r) => (
                <li key={r.tipo} className="flex justify-between gap-2">
                  <span>{NOME_TIPO[r.tipo]}</span>
                  <span className="shrink-0 text-(--color-testo-tenue)">
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
  const colonne = righe.length > 16 ? 3 : 2;
  return (
    <ol
      aria-label="classifica generale"
      className={`grid grid-flow-col gap-x-6 gap-y-0.5 text-lg ${GRIGLIA[colonne]}`}
      style={righePerColonna(righe.length, colonne)}
    >
      {righe.map((g) => (
        <li key={g.id} className="flex justify-between gap-2">
          <span className="truncate">
            {g.posizione}. {g.name}
          </span>
          <span className="shrink-0 text-(--color-testo-tenue)">{g.punti} pt</span>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ pezzi comuni */

function MagliaRosa({ piccola = false }: { piccola?: boolean }) {
  // L'emoji della maglietta è verde: la maglia rosa si fa col colore.
  return (
    <span
      className={`shrink-0 rounded-md bg-(--color-rosa) font-black whitespace-nowrap text-white uppercase ${
        piccola ? 'px-1.5 text-[0.65rem] leading-5' : 'px-2 py-0.5 text-sm'
      }`}
    >
      maglia rosa
    </span>
  );
}

/** Il podio su una riga: tre medaglie e tre nomi, alto quanto basta. */
function Podio({ nomi }: { nomi: Array<{ id: string; name: string; sotto: string }> }) {
  const medaglie = ['🥇', '🥈', '🥉'];
  if (nomi.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-2 rounded-xl border border-(--color-rosa)/40 bg-(--color-rosa)/5 px-4 py-3">
      {nomi.map((n, i) => (
        <div key={n.id} className="flex items-center gap-3">
          <span className="text-4xl">{medaglie[i]}</span>
          <div>
            <p className="text-2xl leading-tight font-bold">{n.name}</p>
            <p className="text-sm text-(--color-testo-tenue)">{n.sotto}</p>
          </div>
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
  const testo = allievi.length > 15 ? 'text-xl' : 'text-2xl';
  return (
    <div className="w-full">
      <p className="mb-2 text-center text-lg text-(--color-testo-tenue)">
        {allievi.length} in griglia di partenza · il numero serve per rientrare da un altro PC
      </p>
      <ul
        aria-label="corridori"
        className={`mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-0.5 text-left sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ${testo}`}
      >
        {perNumero.map((a) => (
          <li key={a.id} className="flex min-w-0 items-baseline gap-2">
            <span className="w-8 shrink-0 text-right font-mono font-black text-(--color-rosa)">{a.numero ?? '–'}</span>
            <span className="truncate">{a.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** I chilometri percorsi, per le righe grandi: una casella per km, il ciclista dove è arrivato. */
function Strada({ fatti, totale }: { fatti: number; totale: number }) {
  return (
    <div className="relative mt-1.5 flex items-center gap-1">
      {Array.from({ length: totale }, (_, i) => (
        <div key={i} className={`h-2.5 flex-1 rounded-full ${i < fatti ? 'bg-(--color-rosa)' : 'bg-(--color-bordo)'}`} />
      ))}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-1.5 text-lg transition-all duration-500"
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
      className="mt-2 flex flex-wrap items-end gap-3 border-t border-(--color-bordo) pt-2 text-base"
    >
      <label className="flex flex-col gap-1">
        <span className="text-sm text-(--color-testo-tenue)">Correggi il nome</span>
        <div className="flex gap-2">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-40 rounded-lg border border-(--color-bordo) bg-black/30 px-3 py-1 outline-none focus:border-(--color-rosa)"
          />
          <button
            onClick={() => void azione({ azione: 'rinomina', name: nome })}
            className="rounded-lg border border-(--color-bordo) px-3 py-1 hover:border-(--color-rosa)"
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
            className="w-16 rounded-lg border border-(--color-bordo) bg-black/30 px-2 py-1 outline-none focus:border-(--color-rosa)"
          />
          <button
            onClick={() => void azione({ azione: 'rimanda', tappa: indice, km: kmRitorno - 1 })}
            className="rounded-lg border border-(--color-bordo) px-3 py-1 hover:border-(--color-rosa)"
          >
            Rimanda
          </button>
        </div>
      </label>

      <button
        onClick={() => {
          if (confirm(`Eliminare ${allievo.name} dal Giro?`)) void azione({ azione: 'elimina' });
        }}
        className="ml-auto rounded-lg border border-red-500/40 px-3 py-1 text-red-300 hover:bg-red-500/10"
      >
        Elimina
      </button>
    </div>
  );
}
