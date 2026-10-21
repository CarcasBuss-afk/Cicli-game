'use client';
/* Il compito di realtà, fase per fase: la scheda, la consegna della fase, l'editor che
 * riparte da dove si era, il tutor. Come la Cronoscalata, ma da soli e senza fretta. */
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import EditorPython from '@/components/EditorPython';
import SchedaCompito from '@/components/SchedaCompito';
import Schermo, { RisposteDiProva } from '@/components/Schermo';
import Testo from '@/components/Testo';
import TutorChat from '@/components/TutorChat';
import type { RigaSchermo } from '@/lib/giro/interprete';
import { chiamaOfficina, messaggioErrore, type CompitoAperto, type RispostaConsegna, type RispostaTutor } from '@/lib/officina/client';
import { AccessoAllievo } from '../../Accesso';
import { useAllievo } from '../../useAllievo';

export function Compito({ classeId, compitoId }: { classeId: string; compitoId: string }) {
  const { stato, messaggio, accediGoogle, accediProva, esci } = useAllievo();
  const [c, setC] = useState<CompitoAperto | null>(null);
  const [errore, setErrore] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [output, setOutput] = useState<string[] | null>(null);
  const [schermo, setSchermo] = useState<RigaSchermo[] | null>(null);
  const [invio, setInvio] = useState(false);
  const [scossa, setScossa] = useState(false);
  const codiceRef = useRef('');

  const carica = useCallback(async () => {
    try {
      setC(await chiamaOfficina<CompitoAperto>('compito', { classeId, compitoId }));
      setErrore('');
    } catch (e) {
      setErrore(messaggioErrore(e));
    }
  }, [classeId, compitoId]);

  useEffect(() => {
    if (stato === 'ok') void carica();
  }, [stato, carica]);

  const consegna = useCallback(async () => {
    if (!c || !c.esercizio || invio) return;
    setInvio(true);
    try {
      const r = await chiamaOfficina<RispostaConsegna>('consegna', { classeId, compitoId, fase: c.fasi, codice: codiceRef.current });
      setErrore('');
      setSchermo(r.schermo ?? null);
      if (!r.promosso) {
        setHint(r.hint);
        setOutput(r.output);
        setC((p) => (p ? { ...p, errori: r.errori } : p));
        setScossa(true);
        setTimeout(() => setScossa(false), 520);
        return;
      }
      setHint(null);
      setOutput(null);
      setSchermo(null);
      setC((p) =>
        p
          ? {
              ...p,
              fasi: r.fasi,
              finito: r.finito,
              voto: r.voto,
              votoSeFinisci: r.votoSeFinisci,
              esercizio: r.esercizio,
              codice: { ...p.codice, [String(c.fasi)]: codiceRef.current },
            }
          : p,
      );
    } catch (e) {
      setErrore(messaggioErrore(e));
      void carica();
    } finally {
      setInvio(false);
    }
  }, [c, invio, classeId, compitoId, carica]);

  const chiedi = useCallback(
    async (domanda: string) => {
      if (!c) return;
      const r = await chiamaOfficina<RispostaTutor>('tutor', { classeId, compitoId, domanda, codice: codiceRef.current });
      setC((p) =>
        p
          ? {
              ...p,
              consigli: r.consigli,
              votoSeFinisci: r.votoSeFinisci,
              tutor: [...p.tutor, { fase: r.fase, domanda: domanda.trim(), risposta: r.risposta }],
            }
          : p,
      );
    },
    [c, classeId, compitoId],
  );

  if (stato !== 'ok') {
    return <AccessoAllievo stato={stato} messaggio={messaggio} accediGoogle={accediGoogle} accediProva={accediProva} esci={esci} />;
  }
  if (!c) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-(--color-testo-tenue)">{errore || 'Un attimo…'}</p>
        {errore && (
          <Link href="/officina" className="underline">
            torna ai compiti
          </Link>
        )}
      </main>
    );
  }

  const fase = c.fasi + 1;
  const es = c.esercizio;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/officina" className="text-sm text-(--color-testo-tenue) underline">
            ← i miei compiti
          </Link>
          <h1 className="text-2xl font-black">{c.scheda.titolo}</h1>
        </div>
        <p className="text-2xl font-black">
          {c.finito ? 'Finito' : c.scaduto ? 'Scaduto' : `Fase ${fase}`}
          {!c.finito && !c.scaduto && <span className="text-base font-normal text-(--color-testo-tenue)"> di {c.fasiTotali}</span>}
        </p>
      </header>

      <Fasi fatte={c.fasi} totale={c.fasiTotali} />

      {(c.finito || c.scaduto) && (
        <section className="rounded-2xl border border-(--color-giallo)/50 bg-(--color-giallo)/10 p-5 text-center">
          <p className="text-sm text-(--color-testo-tenue)">{c.finito ? 'Programma finito! Il tuo voto' : 'Il compito è scaduto. Il tuo voto'}</p>
          <p className="font-mono text-6xl font-black text-(--color-giallo)">{c.voto}</p>
          <p className="text-(--color-testo-tenue)">
            {c.fasi} {c.fasi === 1 ? 'fase' : 'fasi'} su {c.fasiTotali} · {c.consigli} {c.consigli === 1 ? 'domanda' : 'domande'} al tutor
          </p>
        </section>
      )}

      <SchedaCompito key={compitoId} scheda={c.scheda} fase={Math.min(fase, c.fasiTotali)} fasi={c.fasiTotali} />

      {es && (
        <section className={`flex flex-col gap-4 rounded-2xl border border-(--color-bordo) bg-(--color-fondo-card) p-5 ${scossa ? 'scuoti' : ''}`}>
          <h2 className="text-xl font-bold">
            <Testo>{es.consegna}</Testo>
          </h2>
          {es.risposte && <RisposteDiProva risposte={es.risposte} />}
          {es.outputAtteso && (
            <div>
              <p className="mb-1 text-sm font-bold text-(--color-testo-tenue)">Deve stampare:</p>
              <pre className="overflow-x-auto rounded-xl border border-(--color-verde)/40 bg-(--color-verde)/5 p-4 font-mono text-[1.05rem] text-(--color-verde)">
                {es.outputAtteso.join('\n')}
              </pre>
            </div>
          )}
          <EditorPython
            valoreIniziale={es.codiceIniziale ?? ''}
            tappa={c.fasi}
            onChange={(v) => {
              codiceRef.current = v;
            }}
            onConsegna={() => void consegna()}
            attivo={!invio}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => void consegna()}
              disabled={invio}
              className="rounded-lg bg-(--color-rosa) px-5 py-2.5 text-lg font-bold text-white hover:brightness-110 disabled:opacity-40"
            >
              {invio ? '…' : 'Esegui ▶'}
            </button>
            <span className="text-sm text-(--color-testo-tenue)">
              oppure <kbd className="rounded bg-black/40 px-1.5 py-0.5 font-mono">Ctrl</kbd>+<kbd className="rounded bg-black/40 px-1.5 py-0.5 font-mono">Invio</kbd>
            </span>
          </div>
        </section>
      )}

      {schermo && schermo.length > 0 ? (
        <Schermo righe={schermo} titolo="Il tuo programma, con le risposte di prova:" />
      ) : (
        output &&
        output.length > 0 && (
          <section>
            <p className="mb-1 text-sm font-bold text-(--color-testo-tenue)">Il tuo codice ha stampato:</p>
            <pre className="overflow-x-auto rounded-xl border border-(--color-bordo) bg-black/40 p-4 font-mono text-[1.05rem]">{output.join('\n')}</pre>
          </section>
        )
      )}

      {hint && (
        <section role="status" className="rounded-xl border border-(--color-giallo)/40 bg-(--color-giallo)/10 p-4 text-[1.05rem]">
          <span aria-hidden>💡 </span>
          <Testo>{hint}</Testo>
        </section>
      )}

      <TutorChat scambi={c.tutor} votoSeFinisci={c.votoSeFinisci} onChiedi={chiedi} attivo={!c.finito && !c.scaduto} />

      {errore && (
        <section role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">
          {errore}
        </section>
      )}

      <footer className="mt-auto pt-4 text-center text-sm text-(--color-testo-tenue)">
        Gli errori non costano niente e il lavoro resta salvato: puoi chiudere e riprendere quando vuoi. Solo le domande al tutor costano un punto.
      </footer>
    </main>
  );
}

function Fasi({ fatte, totale }: { fatte: number; totale: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${fatte} fasi su ${totale}`}>
      {Array.from({ length: totale }, (_, i) => (
        <div key={i} className={`h-2.5 flex-1 rounded-full ${i < fatte ? 'bg-(--color-giallo)' : i === fatte ? 'bg-(--color-giallo)/40' : 'bg-(--color-bordo)'}`} />
      ))}
    </div>
  );
}
