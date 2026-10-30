'use client';
/* Una classe dell'Officina, in tempo reale, solo per guardare: la tabella allievi × compiti
 * del percorso con fasi, domande e voto, la media, il lavoro di ciascuno (codice fase per
 * fase, conversazione col tutor), il CSV. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { collection, doc, onSnapshot, type Timestamp } from 'firebase/firestore';
import { getClientDb } from '@/lib/firebaseClient';
import { FASI_PER_COMPITO, type VoceCompito } from '@/lib/officina/regole';
import { csvClasse, SEZIONI_PERCORSO, tabellaClasse, TITOLI_PERCORSO, type AllievoVisto, type LavoroVisto } from '@/lib/officina/tabella';
import { Accesso } from '../../Accesso';
import { chiamaDocente } from '../../api';
import { useDocente } from '../../useDocente';
import { InterruttoreOfficina } from '../InterruttoreOfficina';

type ClasseDati = { nome: string; chiusa: boolean };

const data = (t: unknown): Date | null => (t && typeof (t as Timestamp).toDate === 'function' ? (t as Timestamp).toDate() : null);

function lavoroDa(grezzo: Record<string, unknown>): LavoroVisto {
  return {
    fasi: (grezzo.fasi as number) ?? 0,
    consigli: (grezzo.consigli as number) ?? 0,
    errori: (grezzo.errori as number) ?? 0,
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
    giudizi: ((grezzo.giudizi ?? []) as Array<Record<string, unknown>>).map((g) => ({
      fase: ((g.fase as number) ?? 0) + 1,
      verdetto: (g.verdetto as 'OK' | 'NO' | 'GUASTO') ?? 'OK',
      motivo: (g.motivo as string | null) ?? null,
      at: data(g.at),
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
        setClasse({ nome: d.nome, chiusa: Boolean(d.chiusa) });
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

  const righe = useMemo(() => tabellaClasse(allievi), [allievi]);

  if (stato !== 'ok') return <Accesso stato={stato} messaggio={messaggio} accediGoogle={accediGoogle} accediProva={accediProva} />;
  if (!classe) return <main className="p-8 text-(--color-testo-tenue)">{errore || 'Un attimo…'}</main>;

  const dettaglio = aperta ? allievi.find((a) => a.uid === aperta.uid) : undefined;
  const compitoAperto = aperta ? TITOLI_PERCORSO.find((c) => c.id === aperta.compitoId) : undefined;

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/docente/officina" className="text-sm text-(--color-testo-tenue) underline">
            ← tutte le classi
          </Link>
          <h1 className="text-2xl font-black">
            Classe {classe.nome}
            <span className={`ml-2 text-base font-normal ${classe.chiusa ? 'text-(--color-testo-tenue)' : 'text-(--color-verde)'}`}>
              {classe.chiusa ? '🔒 Officina chiusa' : '● Officina aperta'}
            </span>
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => scarica(`officina-${classe.nome}.csv`, csvClasse(righe))}
            className="rounded-lg border border-(--color-bordo) px-3 py-1.5 text-sm hover:border-(--color-giallo)"
          >
            Scarica CSV
          </button>
          <InterruttoreOfficina chiusa={classe.chiusa} onCambia={(chiusa) => void azione({ azione: chiusa ? 'chiudiClasse' : 'apriClasse' })} />
        </div>
      </header>

      <p className="text-sm text-(--color-testo-tenue)">
        {classe.chiusa
          ? 'A Officina chiusa gli allievi vedono i compiti e il loro codice ma non consegnano e non parlano col tutor: niente compiti fatti dall’IA a casa. Riaprila all’inizio della lezione.'
          : 'A fine lezione chiudi l’Officina: gli allievi non potranno consegnare né chiedere al tutor fino alla prossima volta. Il lavoro resta salvato.'}
      </p>

      {errore && (
        <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-200">
          {errore}
        </p>
      )}

      <section className="overflow-x-auto rounded-xl border border-(--color-bordo) bg-(--color-fondo-card)">
        <table className="w-full text-left" aria-label="tabella della classe">
          <thead className="text-sm text-(--color-testo-tenue)">
            <tr className="text-xs uppercase tracking-wide">
              <th />
              {SEZIONI_PERCORSO.map((s) => (
                <th key={s.id} colSpan={s.compiti} className="border-b border-(--color-bordo) px-3 py-1 text-center font-normal">
                  {s.titolo}
                </th>
              ))}
              <th colSpan={2} />
            </tr>
            <tr>
              <th className="px-3 py-2">Allievo</th>
              {TITOLI_PERCORSO.map((c, i) => (
                <th key={c.id} className="px-3 py-2">
                  {i + 1}. {c.titolo}
                </th>
              ))}
              <th className="px-3 py-2">Media</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {righe.length === 0 && (
              <tr>
                <td colSpan={TITOLI_PERCORSO.length + 3} className="px-3 py-4 text-(--color-testo-tenue)">
                  Nessun allievo è ancora entrato: quando accedono scelgono la classe «{classe.nome}».
                </td>
              </tr>
            )}
            {righe.map((r) => (
              <tr key={r.uid} className="border-t border-(--color-bordo)">
                <td className="px-3 py-2">
                  <p className="font-bold">{r.nome}</p>
                  <p className="text-xs text-(--color-testo-tenue)">{r.email}</p>
                </td>
                {r.voci.map((v) => (
                  <td key={v.id} className="px-3 py-2">
                    <button
                      onClick={() => setAperta(aperta?.uid === r.uid && aperta.compitoId === v.id ? null : { uid: r.uid, compitoId: v.id })}
                      disabled={v.stato === 'bloccato'}
                      className={`rounded-lg border px-2 py-1 text-left hover:border-(--color-giallo) disabled:cursor-default disabled:hover:border-transparent ${
                        aperta?.uid === r.uid && aperta.compitoId === v.id ? 'border-(--color-giallo)' : 'border-transparent'
                      }`}
                      aria-label={`${r.nome}: ${v.id}`}
                    >
                      <Cella v={v} />
                    </button>
                  </td>
                ))}
                <td className="px-3 py-2 font-mono text-lg font-black text-(--color-giallo)">{r.media ?? '–'}</td>
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
        <Lavoro allievo={dettaglio} titolo={compitoAperto.titolo} lavoro={dettaglio.lavori[compitoAperto.id] ?? null} onChiudi={() => setAperta(null)} />
      )}
    </main>
  );
}

function Cella({ v }: { v: VoceCompito }) {
  if (v.stato === 'bloccato') return <span className="text-(--color-testo-tenue)">🔒</span>;
  if (v.stato === 'da-cominciare') return <span className="text-(--color-testo-tenue)">—</span>;
  return (
    <span className="flex items-baseline gap-2">
      <span className="font-mono text-sm text-(--color-testo-tenue)">
        {v.fasi}/{FASI_PER_COMPITO}
      </span>
      {v.consigli > 0 && <span className="text-sm text-(--color-giallo)">🧑‍🏫 {v.consigli}</span>}
      {v.voto !== null && <span className="font-mono text-lg font-black text-(--color-giallo)">{v.voto}</span>}
    </span>
  );
}

/** Il lavoro di un allievo su un compito: codice fase per fase, bozza, conversazione. */
function Lavoro({ allievo, titolo, lavoro, onChiudi }: { allievo: AllievoVisto; titolo: string; lavoro: LavoroVisto | null; onChiudi: () => void }) {
  const fasi = lavoro ? Object.entries(lavoro.codice).sort((a, b) => Number(a[0]) - Number(b[0])) : [];
  return (
    <section aria-label="lavoro dell'allievo" className="flex flex-col gap-3 rounded-xl border border-(--color-giallo)/40 bg-(--color-giallo)/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">
          {allievo.nome} · {titolo}
        </h2>
        <button onClick={onChiudi} className="text-sm text-(--color-testo-tenue) underline">
          chiudi
        </button>
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
            {lavoro.giudizi && lavoro.giudizi.length > 0 && (
              <details className="mb-1">
                <summary className="cursor-pointer text-sm">
                  Registro del giudice ({lavoro.giudizi.filter((g) => g.verdetto === 'NO').length} NO su {lavoro.giudizi.length})
                </summary>
                <ol aria-label="registro del giudice" className="mt-1 flex flex-col gap-1 text-sm">
                  {lavoro.giudizi.map((g, i) => (
                    <li key={i} className="rounded bg-black/30 p-2">
                      <span className={`font-mono font-bold ${g.verdetto === 'NO' ? 'text-red-300' : g.verdetto === 'GUASTO' ? 'text-(--color-testo-tenue)' : 'text-(--color-verde)'}`}>
                        {g.verdetto}
                      </span>
                      <span className="text-(--color-testo-tenue)">
                        {' '}
                        · fase {g.fase}
                        {g.at && ` · ${g.at.toLocaleString('it-IT')}`}
                      </span>
                      {g.motivo && <p>{g.motivo}</p>}
                    </li>
                  ))}
                </ol>
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
