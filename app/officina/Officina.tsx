'use client';
/* L'Officina vista dall'allievo: il percorso dei compiti di realtà, uno sotto l'altro,
 * sbloccati uno alla volta, con la media dei voti. La prima volta si sceglie la classe. */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { chiamaOfficina, messaggioErrore, type CompitoInElenco, type Percorso, type SezionePercorso } from '@/lib/officina/client';
import { AccessoAllievo } from './Accesso';
import { useAllievo } from './useAllievo';

export function Officina() {
  const { stato, io, messaggio, accediGoogle, accediProva, esci, ricarica } = useAllievo();
  const [percorsi, setPercorsi] = useState<Percorso[]>([]);
  const [errore, setErrore] = useState('');

  const carica = useCallback(async () => {
    if (!io) return;
    try {
      setPercorsi(await Promise.all(io.classi.map((c) => chiamaOfficina<Percorso>('compiti', { classeId: c.id }))));
      setErrore('');
    } catch (e) {
      setErrore(messaggioErrore(e));
    }
  }, [io]);

  useEffect(() => {
    void carica();
  }, [carica]);

  if (stato !== 'ok' || !io) {
    return <AccessoAllievo stato={stato} messaggio={messaggio} accediGoogle={accediGoogle} accediProva={accediProva} esci={esci} />;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black text-(--color-giallo)">🔧 L&apos;Officina</h1>
          <p className="text-sm text-(--color-testo-tenue)">
            {io.nome} · {io.email}
          </p>
        </div>
        <button onClick={esci} className="text-sm text-(--color-testo-tenue) underline">
          esci
        </button>
      </header>

      {io.classi.length === 0 ? (
        <ScegliClasse onScelta={ricarica} />
      ) : (
        percorsi.map((p) => (
          <section key={p.classe.id} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-bold">
                Classe {p.classe.nome}
                {p.classe.chiusa && <span className="ml-2 text-sm font-normal text-(--color-testo-tenue)">🔒 Officina chiusa</span>}
              </h2>
              <p className="text-(--color-testo-tenue)">
                Media dei voti{' '}
                <span className="font-mono text-2xl font-black text-(--color-giallo)" aria-label="media">
                  {p.media ?? '–'}
                </span>
              </p>
            </div>
            {p.classe.chiusa && (
              <p role="status" className="rounded-xl border border-(--color-bordo) bg-black/30 p-3 text-(--color-testo-tenue)">
                Il prof ha chiuso l&apos;Officina per oggi: puoi rileggere i compiti e il tuo codice, ma consegne e tutor riprendono alla prossima lezione.
              </p>
            )}
            {p.sezioni.map((s) => (
              <SezioneDelPercorso key={s.id} sezione={s} compiti={p.compiti} classe={p.classe} />
            ))}
            <p className="text-sm text-(--color-testo-tenue)">
              I compiti si sbloccano uno alla volta. Il voto è 10 meno le domande al tutor, mai sotto 5: puoi chiedere aiuto quanto vuoi. Nel patentino il tutor è spento.
            </p>
          </section>
        ))
      )}

      {errore && (
        <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-red-200">
          {errore}
        </p>
      )}
    </main>
  );
}

/**
 * Un capitolo del percorso: il titolo, i suoi compiti numerati di seguito a quelli prima,
 * e il patentino quando l'esame in fondo è passato. Una sezione senza compiti dice che
 * arriveranno: l'allievo vede che dopo il for c'è un altro ciclo.
 */
function SezioneDelPercorso({ sezione, compiti, classe }: { sezione: SezionePercorso; compiti: CompitoInElenco[]; classe: { id: string; nome: string } }) {
  const miei = compiti.filter((k) => k.sezione === sezione.id);
  const esame = miei.find((k) => k.esame && k.stato === 'finito');
  return (
    <section aria-label={sezione.titolo} className="flex flex-col gap-2">
      <h3 className="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-base font-bold text-(--color-testo-tenue)">
        <span>{sezione.titolo}</span>
        {esame && (
          <span className="rounded-full border border-(--color-verde)/50 bg-(--color-verde)/10 px-3 py-0.5 text-sm text-(--color-verde)" aria-label="patentino">
            🪪 Patentino preso · voto {esame.voto}
          </span>
        )}
      </h3>
      {miei.length === 0 ? (
        <p className="rounded-xl border border-dashed border-(--color-bordo) px-4 py-3 text-sm text-(--color-testo-tenue)">I compiti di questa sezione arrivano quando la classe ci arriva.</p>
      ) : (
        <ol aria-label={`percorso di ${classe.nome} · ${sezione.titolo}`} className="flex flex-col gap-2">
          {miei.map((k) => (
            <li key={k.id}>
              <VoceCompito k={k} numero={compiti.indexOf(k) + 1} classeId={classe.id} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function VoceCompito({ k, numero, classeId }: { k: CompitoInElenco; numero: number; classeId: string }) {
  const bloccato = k.stato === 'bloccato';
  const dentro = (
    <>
      <span className="flex items-baseline gap-3">
        <span className="w-6 text-right font-mono text-(--color-testo-tenue)">{numero}.</span>
        <span className="font-bold">{k.titolo}</span>
        {k.esame && <span className="rounded bg-(--color-giallo)/20 px-1.5 py-0.5 text-xs text-(--color-giallo)">esame</span>}
      </span>
      <Stato k={k} />
    </>
  );
  const classe = 'flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3';
  if (bloccato) {
    return <div className={`${classe} border-(--color-bordo) text-(--color-testo-tenue) opacity-60`}>{dentro}</div>;
  }
  return (
    <Link href={`/officina/${classeId}/${k.id}`} className={`${classe} border-(--color-bordo) bg-(--color-fondo-card) hover:border-(--color-giallo)`}>
      {dentro}
    </Link>
  );
}

function Stato({ k }: { k: CompitoInElenco }) {
  switch (k.stato) {
    case 'finito':
      return (
        <span className="text-(--color-verde)">
          {k.esame ? 'Patentino preso' : 'Finito'} · voto <b className="font-mono text-lg">{k.voto}</b>
        </span>
      );
    case 'in-corso':
      return (
        <span className="text-(--color-giallo)">
          Fase {k.fasi + 1} di {k.fasiTotali} · continua →
        </span>
      );
    case 'da-cominciare':
      return <span className="text-(--color-giallo)">Comincia →</span>;
    default:
      return <span>🔒 si sblocca quando finisci il precedente</span>;
  }
}

/** La prima volta: la classe si sceglie da un elenco, niente codice da dettare. */
function ScegliClasse({ onScelta }: { onScelta: () => Promise<void> }) {
  const [classi, setClassi] = useState<Array<{ id: string; nome: string }>>([]);
  const [scelta, setScelta] = useState('');
  const [errore, setErrore] = useState('');
  const [occupato, setOccupato] = useState(false);

  useEffect(() => {
    chiamaOfficina<{ classi: Array<{ id: string; nome: string }> }>('classi')
      .then((r) => setClassi(r.classi))
      .catch((e) => setErrore(messaggioErrore(e)));
  }, []);

  async function entra(e: React.FormEvent) {
    e.preventDefault();
    setOccupato(true);
    setErrore('');
    try {
      await chiamaOfficina('entra', { classeId: scelta });
      await onScelta();
    } catch (err) {
      setErrore(messaggioErrore(err));
    } finally {
      setOccupato(false);
    }
  }

  return (
    <form onSubmit={entra} className="flex flex-col gap-3 rounded-2xl border border-(--color-bordo) bg-(--color-fondo-card) p-5">
      <label htmlFor="classe" className="font-bold">
        Per cominciare, dimmi in che classe sei:
      </label>
      {classi.length === 0 ? (
        <p className="text-(--color-testo-tenue)">Il prof non ha ancora creato nessuna classe.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <select
            id="classe"
            value={scelta}
            onChange={(e) => setScelta(e.target.value)}
            className="rounded-lg border border-(--color-bordo) bg-black/40 px-3 py-2 text-lg outline-none focus:border-(--color-giallo)"
          >
            <option value="">— scegli —</option>
            {classi.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          <button type="submit" disabled={occupato || !scelta} className="rounded-lg bg-(--color-giallo) px-4 py-2 font-bold text-black hover:brightness-110 disabled:opacity-40">
            Entra
          </button>
        </div>
      )}
      {errore && (
        <p role="alert" className="text-red-300">
          {errore}
        </p>
      )}
    </form>
  );
}
