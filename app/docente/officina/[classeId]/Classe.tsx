'use client';
/* Una classe dell'Officina, in tempo reale: il codice, i compiti assegnati (assegnare,
 * scadenza, ritirare), la tabella allievi × compiti con fasi, domande e voto, il lavoro di
 * ciascuno (codice fase per fase, conversazione col tutor, voto a mano), il CSV. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { collection, doc, onSnapshot, type Timestamp } from 'firebase/firestore';
import { getClientDb } from '@/lib/firebaseClient';
import { ELENCO_PROGETTI, schedaProgetto, type Progetto } from '@/lib/giro/progetti';
import { FASI_PER_COMPITO } from '@/lib/officina/regole';
import { csvClasse, tabellaClasse, type AllievoVisto, type CellaTabella, type CompitoVisto, type LavoroVisto } from '@/lib/officina/tabella';
import { Accesso } from '../../Accesso';
import { chiamaDocente } from '../../api';
import { useDocente } from '../../useDocente';

type ClasseDati = { nome: string; codice: string; chiusa: boolean; compiti: CompitoVisto[] };

const data = (t: unknown): Date | null => (t && typeof (t as Timestamp).toDate === 'function' ? (t as Timestamp).toDate() : null);

const titoloDi = (progetto: string) => schedaProgetto(progetto as Progetto, 1).titolo;

function lavoroDa(grezzo: Record<string, unknown>): LavoroVisto {
  return {
    fasi: (grezzo.fasi as number) ?? 0,
    consigli: (grezzo.consigli as number) ?? 0,
    errori: (grezzo.errori as number) ?? 0,
    votoDocente: typeof grezzo.votoDocente === 'number' ? grezzo.votoDocente : null,
    finitoAt: data(grezzo.finitoAt),
    ultimoAt: data(grezzo.ultimoAt),
    codice: (grezzo.codice as Record<string, string>) ?? {},
    bozza: (grezzo.bozza as string) ?? '',
    tutor: ((grezzo.tutor ?? []) as Array<Record<string, unknown>>).map((s) => ({
      fase: ((s.fase as number) ?? 0) + 1,
      domanda: (s.domanda as string) ?? '',
      risposta: (s.risposta as string) ?? '',
      at: data(s.at),
    })),
  };
}

function scarica(nome: string, contenuto: string) {
  const url = URL.createObjectURL(new Blob(['﻿' + contenuto], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

/** Per l'input datetime-local: la data in ora locale, senza secondi. */
function perInput(d: Date | null): string {
  if (!d) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function Classe({ classeId }: { classeId: string }) {
  const { stato, messaggio, accediGoogle, accediProva } = useDocente();
  const [classe, setClasse] = useState<ClasseDati | null>(null);
  const [allievi, setAllievi] = useState<AllievoVisto[]>([]);
  const [errore, setErrore] = useState('');
  const [aperta, setAperta] = useState<{ uid: string; compitoId: string } | null>(null);

  useEffect(() => {
    if (stato !== 'ok') return;
    return onSnapshot(
      doc(getClientDb(), 'officinaClassi', classeId),
      (snap) => {
        const d = snap.data();
        if (!d) {
          setErrore('Classe inesistente');
          return;
        }
        setClasse({
          nome: d.nome,
          codice: d.codice,
          chiusa: Boolean(d.chiusa),
          compiti: ((d.compiti ?? []) as Array<Record<string, unknown>>).map((c) => ({
            id: c.id as string,
            progetto: c.progetto as string,
            titolo: titoloDi(c.progetto as string),
            scadenzaAt: data(c.scadenzaAt),
            ritirato: Boolean(c.ritirato),
          })),
        });
      },
      (e) => setErrore(`Lettura della classe non riuscita: ${e.message}`),
    );
  }, [stato, classeId]);

  useEffect(() => {
    if (stato !== 'ok') return;
    return onSnapshot(
      collection(getClientDb(), 'officinaClassi', classeId, 'allievi'),
      (snap) =>
        setAllievi(
          snap.docs.map((d) => {
            const a = d.data();
            return {
              uid: d.id,
              nome: a.nome ?? '?',
              email: a.email ?? '',
              lavori: Object.fromEntries(
                Object.entries((a.lavori ?? {}) as Record<string, Record<string, unknown>>).map(([k, v]) => [k, lavoroDa(v)]),
              ),
            };
          }),
        ),
      (e) => setErrore(`Lettura degli allievi non riuscita: ${e.message}`),
    );
  }, [stato, classeId]);

  const azione = useCallback(
    async (corpo: Record<string, unknown>) => {
      setErrore('');
      try {
        await chiamaDocente('officina', { classeId, ...corpo });
      } catch (e) {
        setErrore(e instanceof Error ? e.message : String(e));
      }
    },
    [classeId],
  );

  const righe = useMemo(() => (classe ? tabellaClasse(allievi, classe.compiti) : []), [allievi, classe]);
  const attivi = useMemo(() => classe?.compiti.filter((c) => !c.ritirato) ?? [], [classe]);

  if (stato !== 'ok') return <Accesso stato={stato} messaggio={messaggio} accediGoogle={accediGoogle} accediProva={accediProva} />;
  if (!classe) return <main className="p-8 text-(--color-testo-tenue)">{errore || 'Un attimo…'}</main>;

  const dettaglio = aperta ? allievi.find((a) => a.uid === aperta.uid) : undefined;
  const compitoAperto = aperta ? attivi.find((c) => c.id === aperta.compitoId) : undefined;

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/docente/officina" className="text-sm text-(--color-testo-tenue) underline">
            ← tutte le classi
          </Link>
          <h1 className="text-2xl font-black">
            Classe {classe.nome}
            {classe.chiusa && <span className="ml-2 text-base font-normal text-(--color-testo-tenue)">(chiusa)</span>}
          </h1>
        </div>
        <p className="text-(--color-testo-tenue)">
          codice per entrare <span className="ml-2 rounded-lg bg-black/40 px-3 py-1 font-mono text-3xl font-black tracking-widest text-(--color-giallo)">{classe.codice}</span>
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => scarica(`officina-${classe.nome}.csv`, csvClasse(righe, classe.compiti))}
            className="rounded-lg border border-(--color-bordo) px-3 py-1.5 text-sm hover:border-(--color-giallo)"
          >
            Scarica CSV
          </button>
          {!classe.chiusa && (
            <button
              onClick={() => {
                if (confirm('Chiudere la classe? Nessuno potrà più entrare né consegnare.')) void azione({ azione: 'chiudiClasse' });
              }}
              className="rounded-lg border border-(--color-bordo) px-3 py-1.5 text-sm text-(--color-testo-tenue) hover:text-(--color-testo)"
            >
              Chiudi la classe
            </button>
          )}
        </div>
      </header>

      {errore && (
        <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-200">
          {errore}
        </p>
      )}

      <CompitiAssegnati compiti={attivi} chiusa={classe.chiusa} azione={azione} />

      {/* La tabella */}
      <section className="overflow-x-auto rounded-xl border border-(--color-bordo) bg-(--color-fondo-card)">
        <table className="w-full text-left" aria-label="tabella della classe">
          <thead className="text-sm text-(--color-testo-tenue)">
            <tr>
              <th className="px-3 py-2">Allievo</th>
              {attivi.map((c) => (
                <th key={c.id} className="px-3 py-2">
                  {c.titolo}
                </th>
              ))}
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {righe.length === 0 && (
              <tr>
                <td colSpan={attivi.length + 2} className="px-3 py-4 text-(--color-testo-tenue)">
                  Nessun allievo è ancora entrato: proietta il codice {classe.codice}.
                </td>
              </tr>
            )}
            {righe.map((r) => (
              <tr key={r.uid} className="border-t border-(--color-bordo)">
                <td className="px-3 py-2">
                  <p className="font-bold">{r.nome}</p>
                  <p className="text-xs text-(--color-testo-tenue)">{r.email}</p>
                </td>
                {r.celle.map((x) => (
                  <td key={x.compitoId} className="px-3 py-2">
                    <button
                      onClick={() => setAperta(aperta?.uid === r.uid && aperta.compitoId === x.compitoId ? null : { uid: r.uid, compitoId: x.compitoId })}
                      className={`rounded-lg border px-2 py-1 text-left hover:border-(--color-giallo) ${
                        aperta?.uid === r.uid && aperta.compitoId === x.compitoId ? 'border-(--color-giallo)' : 'border-transparent'
                      }`}
                      aria-label={`${r.nome}: ${x.compitoId}`}
                    >
                      <Cella x={x} />
                    </button>
                  </td>
                ))}
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => {
                      if (confirm(`Togliere ${r.nome} dalla classe? I suoi lavori vanno persi.`)) void azione({ azione: 'rimuoviAllievo', uid: r.uid });
                    }}
                    className="text-xs text-(--color-testo-tenue) hover:text-red-300"
                  >
                    togli
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {dettaglio && compitoAperto && (
        <Lavoro
          allievo={dettaglio}
          compito={compitoAperto}
          lavoro={dettaglio.lavori[compitoAperto.id] ?? null}
          onVoto={(voto) => void azione({ azione: 'voto', compitoId: compitoAperto.id, uid: dettaglio.uid, voto })}
          onChiudi={() => setAperta(null)}
        />
      )}
    </main>
  );
}

function Cella({ x }: { x: CellaTabella }) {
  if (!x.lavoro && !x.scaduto && x.voto === null) return <span className="text-(--color-testo-tenue)">—</span>;
  return (
    <span className="flex items-baseline gap-2">
      <span className="font-mono text-sm text-(--color-testo-tenue)">
        {x.fasi}/{FASI_PER_COMPITO}
      </span>
      {x.consigli > 0 && <span className="text-sm text-(--color-giallo)">🧑‍🏫 {x.consigli}</span>}
      {x.voto !== null && (
        <span className={`font-mono text-lg font-black ${x.finito || x.scaduto || x.aMano ? 'text-(--color-giallo)' : 'text-(--color-testo-tenue)'}`} title={x.aMano ? 'voto del docente' : x.finito || x.scaduto ? 'voto' : 'voto proposto, in corso'}>
          {x.voto}
          {x.aMano && '*'}
        </span>
      )}
    </span>
  );
}

function CompitiAssegnati({
  compiti,
  chiusa,
  azione,
}: {
  compiti: CompitoVisto[];
  chiusa: boolean;
  azione: (corpo: Record<string, unknown>) => Promise<void>;
}) {
  const [progetto, setProgetto] = useState<Progetto>(ELENCO_PROGETTI[0]);
  const [scadenza, setScadenza] = useState('');
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-(--color-bordo) bg-(--color-fondo-card) p-4">
      <h2 className="font-bold">Compiti assegnati</h2>
      {compiti.length === 0 && <p className="text-sm text-(--color-testo-tenue)">Nessuno ancora.</p>}
      <ul aria-label="compiti assegnati" className="flex flex-col gap-1">
        {compiti.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3">
            <span className="font-bold">{c.titolo}</span>
            <label className="flex items-center gap-1 text-sm text-(--color-testo-tenue)">
              scadenza
              <input
                type="datetime-local"
                defaultValue={perInput(c.scadenzaAt)}
                onBlur={(e) => {
                  const nuova = e.target.value ? new Date(e.target.value).toISOString() : null;
                  if (nuova !== (c.scadenzaAt?.toISOString() ?? null)) void azione({ azione: 'modificaCompito', compitoId: c.id, scadenza: nuova });
                }}
                aria-label={`scadenza di ${c.titolo}`}
                className="rounded border border-(--color-bordo) bg-black/30 px-2 py-0.5"
              />
            </label>
            <button
              onClick={() => {
                if (confirm(`Ritirare «${c.titolo}»? Sparisce agli allievi; i lavori restano.`)) void azione({ azione: 'modificaCompito', compitoId: c.id, ritira: true });
              }}
              className="text-sm text-(--color-testo-tenue) underline"
            >
              ritira
            </button>
          </li>
        ))}
      </ul>
      {!chiusa && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void azione({ azione: 'assegna', progetto, scadenza: scadenza ? new Date(scadenza).toISOString() : null });
          }}
          className="flex flex-wrap items-center gap-2 border-t border-(--color-bordo) pt-3 text-sm"
        >
          <select value={progetto} onChange={(e) => setProgetto(e.target.value as Progetto)} aria-label="compito da assegnare" className="rounded-lg border border-(--color-bordo) bg-black/30 px-2 py-1">
            {ELENCO_PROGETTI.map((p) => (
              <option key={p} value={p}>
                {titoloDi(p)}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-(--color-testo-tenue)">
            entro
            <input type="datetime-local" value={scadenza} onChange={(e) => setScadenza(e.target.value)} aria-label="scadenza" className="rounded border border-(--color-bordo) bg-black/30 px-2 py-0.5" />
            <span>(vuoto = senza scadenza)</span>
          </label>
          <button type="submit" className="rounded-lg bg-(--color-giallo) px-3 py-1 font-bold text-black hover:brightness-110">
            Assegna
          </button>
        </form>
      )}
    </section>
  );
}

/** Il lavoro di un allievo su un compito: codice fase per fase, conversazione, voto a mano. */
function Lavoro({
  allievo,
  compito,
  lavoro,
  onVoto,
  onChiudi,
}: {
  allievo: AllievoVisto;
  compito: CompitoVisto;
  lavoro: LavoroVisto | null;
  onVoto: (voto: number | null) => void;
  onChiudi: () => void;
}) {
  const [voto, setVoto] = useState(lavoro?.votoDocente?.toString() ?? '');
  const fasi = lavoro ? Object.entries(lavoro.codice).sort((a, b) => Number(a[0]) - Number(b[0])) : [];
  return (
    <section aria-label="lavoro dell'allievo" className="flex flex-col gap-3 rounded-xl border border-(--color-giallo)/40 bg-(--color-giallo)/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">
          {allievo.nome} · {compito.titolo}
        </h2>
        <div className="flex items-center gap-2 text-sm">
          <label className="flex items-center gap-1">
            voto a mano
            <input
              type="number"
              min={1}
              max={10}
              value={voto}
              onChange={(e) => setVoto(e.target.value)}
              placeholder="auto"
              aria-label="voto del docente"
              className="w-16 rounded border border-(--color-bordo) bg-black/30 px-2 py-0.5 text-center"
            />
          </label>
          <button onClick={() => onVoto(voto === '' ? null : Number(voto))} className="rounded-lg border border-(--color-bordo) px-2 py-0.5 hover:border-(--color-giallo)">
            Salva
          </button>
          <button onClick={onChiudi} className="text-(--color-testo-tenue) underline">
            chiudi
          </button>
        </div>
      </div>
      {!lavoro ? (
        <p className="text-(--color-testo-tenue)">Non ha ancora aperto il compito.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-1 text-sm font-bold text-(--color-testo-tenue)">
              {lavoro.fasi}/{FASI_PER_COMPITO} fasi · {lavoro.errori} {lavoro.errori === 1 ? 'errore' : 'errori'}
              {lavoro.ultimoAt && ` · ultima consegna ${lavoro.ultimoAt.toLocaleString('it-IT')}`}
            </p>
            {fasi.map(([k, codice]) => (
              <details key={k} open={Number(k) === fasi.length - 1} className="mb-1">
                <summary className="cursor-pointer text-sm">Fase {Number(k) + 1}</summary>
                <pre className="overflow-x-auto rounded bg-black/40 p-2 font-mono text-sm text-(--color-giallo)">{codice}</pre>
              </details>
            ))}
            {lavoro.bozza && (
              <details className="mb-1">
                <summary className="cursor-pointer text-sm">Bozza in corso (fase {lavoro.fasi + 1})</summary>
                <pre className="overflow-x-auto rounded bg-black/40 p-2 font-mono text-sm">{lavoro.bozza}</pre>
              </details>
            )}
          </div>
          <div>
            <p className="mb-1 text-sm font-bold text-(--color-testo-tenue)">
              {lavoro.tutor.length} {lavoro.tutor.length === 1 ? 'domanda' : 'domande'} al tutor
            </p>
            <ol aria-label="conversazione" className="flex flex-col gap-2">
              {lavoro.tutor.map((s, i) => (
                <li key={i} className="rounded bg-black/30 p-2 text-sm">
                  <p className="text-(--color-testo-tenue)">
                    fase {s.fase}
                    {s.at && ` · ${s.at.toLocaleString('it-IT')}`}
                  </p>
                  <p className="font-bold">{s.domanda || '(non so andare avanti)'}</p>
                  <p className="whitespace-pre-line">{s.risposta}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </section>
  );
}
