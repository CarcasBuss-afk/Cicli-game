'use client';
/* Il compito di realtà, fase per fase: la scheda, la consegna della fase, l'editor che
 * riparte da dove si era, il tutor. Da soli e senza fretta: non è una gara. La fase
 * superata però si festeggia: coriandoli, un cartello e la pagina che scorre alla fase dopo. */
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Coriandoli from '@/components/Coriandoli';
import EditorPython from '@/components/EditorPython';
import Prova from '@/components/Prova';
import SchedaCompito from '@/components/SchedaCompito';
import Schermo, { RisposteDiProva } from '@/components/Schermo';
import Testo from '@/components/Testo';
import TutorChat from '@/components/TutorChat';
import type { RigaSchermo } from '@/lib/giro/interprete';
import { suonoErrore, suonoTappa, suonoTraguardo } from '@/lib/giro/suoni';
import { chiamaOfficina, ErroreOfficina, fasePassata, messaggioErrore, type CompitoAperto, type FasePassata, type RispostaConsegna, type RispostaTutor } from '@/lib/officina/client';
import { scriviVoto } from '@/lib/officina/voto';
import { AccessoAllievo } from '../../Accesso';
import { useAllievo } from '../../useAllievo';

export function Compito({ classeId, compitoId }: { classeId: string; compitoId: string }) {
  const { stato, messaggio, accediGoogle, accediProva, esci } = useAllievo();
  const [c, setC] = useState<CompitoAperto | null>(null);
  const [errore, setErrore] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [output, setOutput] = useState<string[] | null>(null);
  const [schermo, setSchermo] = useState<RigaSchermo[] | null>(null);
  const [rigaErrore, setRigaErrore] = useState<number | null>(null);
  const [invio, setInvio] = useState(false);
  const [scossa, setScossa] = useState(false);
  /** La festa della fase appena superata: quale fase, e se con quella il compito è finito. */
  const [festa, setFesta] = useState<{ fase: number; finito: boolean } | null>(null);
  const [scoppio, setScoppio] = useState(0);
  /** Cresce a ogni «ricomincia»: editor e prova ripartono vuoti anche se la fase resta la stessa. */
  const [ripartenza, setRipartenza] = useState(0);
  const codiceRef = useRef('');
  const cardRef = useRef<HTMLElement>(null);
  const finitoRef = useRef<HTMLElement>(null);

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
        setRigaErrore(r.riga ?? null);
        setOutput(r.output);
        setC((p) => (p ? { ...p, errori: r.errori } : p));
        suonoErrore();
        setScossa(true);
        setTimeout(() => setScossa(false), 520);
        return;
      }
      setHint(null);
      setRigaErrore(null);
      setOutput(null);
      setSchermo(null);
      // La festa: coriandoli, il cartello, il suono; poi la pagina scorre alla fase dopo (o al voto).
      const faseFatta = c.fasi + 1;
      setFesta({ fase: faseFatta, finito: r.finito });
      setScoppio((n) => n + 1);
      if (r.finito) suonoTraguardo();
      else suonoTappa(faseFatta - 1);
      setTimeout(() => setFesta(null), 1900);
      setTimeout(() => {
        const bersaglio = r.finito ? finitoRef.current : cardRef.current;
        bersaglio?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 700);
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
              passate: c.esercizio ? [...p.passate, fasePassata(c.esercizio)] : p.passate,
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

  const ricomincia = useCallback(async () => {
    if (invio || !window.confirm('Ricominciare il compito da capo? Fasi, bozza, errori e tutor di questo compito si cancellano.')) return;
    setInvio(true);
    try {
      await chiamaOfficina('ricomincia', { classeId, compitoId });
      codiceRef.current = '';
      setHint(null);
      setRigaErrore(null);
      setOutput(null);
      setSchermo(null);
      setRipartenza((n) => n + 1);
      await carica();
    } catch (e) {
      setErrore(messaggioErrore(e));
    } finally {
      setInvio(false);
    }
  }, [invio, classeId, compitoId, carica]);

  const azzeraEsito = () => {
    setHint(null);
    setRigaErrore(null);
    setOutput(null);
    setSchermo(null);
  };

  const chiedi = useCallback(
    async (domanda: string) => {
      if (!c) return;
      let r: RispostaTutor;
      try {
        r = await chiamaOfficina<RispostaTutor>('tutor', { classeId, compitoId, domanda, codice: codiceRef.current });
      } catch (e) {
        // Il prof ha chiuso l'Officina nel frattempo: la pagina lo mostra subito.
        if (e instanceof ErroreOfficina && e.code === 'CLASSE_CHIUSA') setC((p) => (p ? { ...p, classeChiusa: true } : p));
        throw e;
      }
      setC((p) =>
        p
          ? {
              ...p,
              consigli: r.consigli,
              domandeRimaste: r.domandeRimaste,
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
      <Coriandoli scoppio={scoppio} />
      {festa && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-6">
          <p
            role="status"
            aria-label="fase superata"
            className="festa rounded-3xl border-4 border-(--color-giallo) bg-(--color-fondo-card) px-8 py-6 text-center shadow-2xl shadow-black/60"
          >
            <span className="block text-5xl" aria-hidden>
              {festa.finito ? '🏆' : '🎉'}
            </span>
            <span className="block text-3xl font-black text-(--color-giallo)">
              {festa.finito ? (c.esame ? 'Patentino preso!' : 'Programma finito!') : `Fase ${festa.fase} superata!`}
            </span>
            <span className="block text-(--color-testo-tenue)">{festa.finito ? 'Ce l’hai fatta.' : 'Avanti con la prossima.'}</span>
          </p>
        </div>
      )}
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/officina" className="text-sm text-(--color-testo-tenue) underline">
            ← i miei compiti
          </Link>
          <h1 className="text-2xl font-black">{c.scheda.titolo}</h1>
        </div>
        <p className="text-2xl font-black">
          {c.finito ? 'Finito' : `Fase ${fase}`}
          {!c.finito && <span className="text-base font-normal text-(--color-testo-tenue)"> di {c.fasiTotali}</span>}
        </p>
      </header>

      <Fasi fatte={c.fasi} totale={c.fasiTotali} />

      {c.classeChiusa && !c.finito && (
        <section role="status" aria-label="officina chiusa" className="rounded-2xl border border-(--color-bordo) bg-black/30 p-4 text-center">
          <p className="text-lg font-bold">🔒 L&apos;Officina è chiusa</p>
          <p className="text-(--color-testo-tenue)">
            Il prof la riapre alla prossima lezione. Il tuo lavoro è salvato: puoi rileggere la scheda e il tuo codice, ma non consegnare né chiedere al tutor.
          </p>
        </section>
      )}

      {c.finito && (
        <section ref={finitoRef} className="scroll-mt-4 rounded-2xl border border-(--color-giallo)/50 bg-(--color-giallo)/10 p-5 text-center">
          <p className="text-sm text-(--color-testo-tenue)">{c.esame ? '🪪 Patentino preso! Il tuo voto' : 'Programma finito! Il tuo voto'}</p>
          <p className="font-mono text-6xl font-black text-(--color-giallo)">{c.voto === null ? '' : scriviVoto(c.voto)}</p>
          <p className="text-(--color-testo-tenue)">
            {c.fasi} {c.fasi === 1 ? 'fase' : 'fasi'} su {c.fasiTotali}
            {!c.esame && ` · ${c.consigli} ${c.consigli === 1 ? 'domanda' : 'domande'} al tutor`}
          </p>
        </section>
      )}

      {c.esame && !c.finito && (
        <section role="note" aria-label="esame" className="rounded-xl border border-(--color-giallo)/40 bg-(--color-giallo)/10 p-3 text-center text-(--color-testo-tenue)">
          🪪 È l&apos;esame del patentino: il tutor è spento, ce la fai da solo. Gli hint automatici ci sono, e gli errori non costano niente.
        </section>
      )}

      <SchedaCompito key={compitoId} scheda={c.scheda} fase={Math.min(fase, c.fasiTotali)} fasi={c.fasiTotali} />

      <IlTuoCodice codice={c.codice} passate={c.passate} finito={c.finito} />

      {es && (
        <section
          ref={cardRef}
          className={`flex scroll-mt-4 flex-col gap-4 rounded-2xl border border-(--color-bordo) bg-(--color-fondo-card) p-5 ${scossa ? 'scuoti' : ''}`}
        >
          <h2 className="text-xl font-bold">
            <Testo>{es.consegna}</Testo>
          </h2>
          {(es.risposte || es.casuali) && <RisposteDiProva risposte={es.risposte ?? []} casuali={es.casuali} />}
          {es.schermoAtteso ? (
            <Schermo
              righe={es.schermoAtteso}
              titolo="Sullo schermo deve comparire (in grigio le domande, in giallo le risposte di prova):"
              classe="border-(--color-verde)/40 bg-(--color-verde)/5 p-4 text-[1.05rem] text-(--color-verde)"
            />
          ) : (
            es.outputAtteso && (
              <div>
                <p className="mb-1 text-sm font-bold text-(--color-testo-tenue)">Deve stampare:</p>
                <pre className="overflow-x-auto rounded-xl border border-(--color-verde)/40 bg-(--color-verde)/5 p-4 font-mono text-[1.05rem] text-(--color-verde)">
                  {es.outputAtteso.join('\n')}
                </pre>
              </div>
            )
          )}
          {es.altriEsempi?.map((altro, i) => (
            <section key={i} aria-label="secondo esempio" className="flex flex-col gap-2 border-t border-dashed border-(--color-bordo) pt-3">
              <p className="text-sm font-bold">E con altre risposte il programma deve fare anche questo:</p>
              <RisposteDiProva risposte={altro.risposte} casuali={altro.casuali} />
              {altro.schermoAtteso ? (
                <Schermo righe={altro.schermoAtteso} classe="border-(--color-verde)/40 bg-(--color-verde)/5 p-4 text-[1.05rem] text-(--color-verde)" />
              ) : (
                <pre className="overflow-x-auto rounded-xl border border-(--color-verde)/40 bg-(--color-verde)/5 p-4 font-mono text-[1.05rem] text-(--color-verde)">
                  {altro.outputAtteso.join('\n')}
                </pre>
              )}
            </section>
          ))}
          <EditorPython
            key={`editor-${ripartenza}`}
            valoreIniziale={es.codiceIniziale ?? ''}
            tappa={c.fasi}
            onChange={(v) => {
              codiceRef.current = v;
            }}
            onConsegna={() => void consegna()}
            attivo={!invio && !c.classeChiusa}
            rigaErrore={rigaErrore}
          />
          <Prova key={`prova-${compitoId}-${ripartenza}`} codice={() => codiceRef.current} fase={c.fasi} attivo={!c.classeChiusa} />
          <div className="flex flex-wrap items-center gap-3 border-t border-(--color-bordo) pt-4">
            <button
              onClick={() => void consegna()}
              disabled={invio || c.classeChiusa}
              className="rounded-lg bg-(--color-rosa) px-5 py-2.5 text-lg font-bold text-white hover:brightness-110 disabled:opacity-40"
            >
              {invio ? '…' : 'Consegna ✔'}
            </button>
            <span className="text-sm text-(--color-testo-tenue)">
              oppure <kbd className="rounded bg-black/40 px-1.5 py-0.5 font-mono">Ctrl</kbd>+<kbd className="rounded bg-black/40 px-1.5 py-0.5 font-mono">Invio</kbd>
              {es.altriEsempi && es.altriEsempi.length > 0
                ? ': gira con le risposte dei due esempi e viene controllato'
                : es.risposte && es.risposte.length > 0
                  ? ': gira con le risposte di prova e viene controllato'
                  : ': viene controllato'}
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

      {(hint || (output && output.length > 0) || (schermo && schermo.length > 0)) && (
        <button type="button" onClick={azzeraEsito} className="self-end rounded-lg border border-(--color-bordo) px-3 py-1 text-sm font-bold hover:bg-white/5">
          Azzera l&apos;esito ✕
        </button>
      )}

      {!c.esame && <TutorChat scambi={c.tutor} votoSeFinisci={c.votoSeFinisci} domandeRimaste={c.domandeRimaste} onChiedi={chiedi} attivo={!c.finito && !c.classeChiusa} />}

      {errore && (
        <section role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">
          {errore}
        </section>
      )}

      {c.docente && (
        <section aria-label="strumenti del docente" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-(--color-bordo) p-3">
          <span className="text-sm text-(--color-testo-tenue)">Solo per te, docente: riporta questo compito a zero per riprovarlo.</span>
          <button onClick={() => void ricomincia()} disabled={invio} className="rounded-lg border border-(--color-bordo) px-3 py-1.5 font-bold hover:bg-white/5 disabled:opacity-40">
            Ricomincia da capo
          </button>
        </section>
      )}

      <footer className="mt-auto pt-4 text-center text-sm text-(--color-testo-tenue)">
        Gli errori non costano niente e il lavoro resta salvato: puoi chiudere e riprendere quando vuoi.
        {!c.esame && ' Solo le domande al tutor costano mezzo punto.'}
      </footer>
    </main>
  );
}

/**
 * Il codice promosso, fase per fase, con la consegna che chiedeva: a compito finito è aperto
 * sull'ultima fase (il programma intero); mentre si lavora sta richiuso, per non spingere
 * giù l'editor.
 */
function IlTuoCodice({ codice, passate, finito }: { codice: Record<string, string>; passate: FasePassata[]; finito: boolean }) {
  const fasi = Object.entries(codice).sort((a, b) => Number(a[0]) - Number(b[0]));
  if (fasi.length === 0) return null;
  return (
    <section aria-label="il tuo codice" className="rounded-2xl border border-(--color-bordo) bg-(--color-fondo-card) p-4 sm:p-5">
      <details open={finito}>
        <summary className="cursor-pointer text-lg font-bold">{finito ? 'Il tuo codice' : 'Il tuo codice delle fasi superate'}</summary>
        <div className="mt-3 flex flex-col gap-2">
          {fasi.map(([k, testo], i) => (
            <details key={k} open={i === fasi.length - 1}>
              <summary className="cursor-pointer font-bold text-(--color-testo-tenue)">Fase {Number(k) + 1}</summary>
              {passate[Number(k)]?.consegna && (
                <p className="mt-1" aria-label="consegna della fase">
                  <Testo>{passate[Number(k)].consegna}</Testo>
                </p>
              )}
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <Atteso fase={passate[Number(k)]} />
                <div>
                  <p className="mb-1 text-sm font-bold text-(--color-testo-tenue)">Il tuo codice:</p>
                  <pre aria-label="codice della fase" className="overflow-x-auto rounded-xl border border-(--color-bordo) bg-black/40 p-4 font-mono text-[1.05rem]">
                    {testo}
                  </pre>
                </div>
              </div>
            </details>
          ))}
        </div>
      </details>
    </section>
  );
}

/** Che cosa doveva comparire sullo schermo in una fase superata: i riquadri attesi di allora, anche il secondo esempio. */
function Atteso({ fase }: { fase: FasePassata | undefined }) {
  if (!fase || (!fase.schermoAtteso && !fase.outputAtteso)) return null;
  const verde = 'border-(--color-verde)/40 bg-(--color-verde)/5 p-4 text-[1.05rem] text-(--color-verde)';
  return (
    <div aria-label="doveva comparire" className="flex flex-col gap-2">
      {fase.schermoAtteso ? (
        <Schermo righe={fase.schermoAtteso} titolo="Doveva comparire:" classe={verde} />
      ) : (
        <div>
          <p className="mb-1 text-sm font-bold text-(--color-testo-tenue)">Doveva stampare:</p>
          <pre className={`overflow-x-auto rounded-xl border font-mono ${verde}`}>{(fase.outputAtteso ?? []).join('\n')}</pre>
        </div>
      )}
      {fase.altriEsempi?.map((altro, i) =>
        altro.schermoAtteso ? (
          <Schermo key={i} righe={altro.schermoAtteso} titolo="E con le altre risposte:" classe={verde} />
        ) : (
          <div key={i}>
            <p className="mb-1 text-sm font-bold text-(--color-testo-tenue)">E con le altre risposte:</p>
            <pre className={`overflow-x-auto rounded-xl border font-mono ${verde}`}>{altro.outputAtteso.join('\n')}</pre>
          </div>
        ),
      )}
    </div>
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
