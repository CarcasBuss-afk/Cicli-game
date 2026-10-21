'use client';
/* L'Officina vista dall'allievo: le sue classi e i compiti assegnati, con lo stato di
 * ciascuno. Da qui si entra in una classe con il codice e si apre un compito. */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { chiamaOfficina, messaggioErrore, type CompitoInElenco } from '@/lib/officina/client';
import { AccessoAllievo } from './Accesso';
import { useAllievo } from './useAllievo';

type Classe = { id: string; nome: string; chiusa: boolean; compiti: CompitoInElenco[] };

export function Officina() {
  const { stato, io, messaggio, accediGoogle, accediProva, esci, ricarica } = useAllievo();
  const [classi, setClassi] = useState<Classe[]>([]);
  const [codice, setCodice] = useState('');
  const [errore, setErrore] = useState('');
  const [occupato, setOccupato] = useState(false);

  const carica = useCallback(async () => {
    if (!io) return;
    try {
      const tutte = await Promise.all(
        io.classi.map(async (c) => {
          const r = await chiamaOfficina<{ compiti: CompitoInElenco[] }>('compiti', { classeId: c.id });
          return { ...c, compiti: r.compiti };
        }),
      );
      setClassi(tutte);
      setErrore('');
    } catch (e) {
      setErrore(messaggioErrore(e));
    }
  }, [io]);

  useEffect(() => {
    void carica();
  }, [carica]);

  async function entra(e: React.FormEvent) {
    e.preventDefault();
    setOccupato(true);
    setErrore('');
    try {
      await chiamaOfficina('entra', { codice });
      setCodice('');
      await ricarica();
    } catch (err) {
      setErrore(messaggioErrore(err));
    } finally {
      setOccupato(false);
    }
  }

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

      {classi.map((c) => (
        <section key={c.id} className="flex flex-col gap-2 rounded-2xl border border-(--color-bordo) bg-(--color-fondo-card) p-4">
          <h2 className="text-lg font-bold">
            Classe {c.nome}
            {c.chiusa && <span className="ml-2 text-sm font-normal text-(--color-testo-tenue)">(chiusa)</span>}
          </h2>
          {c.compiti.length === 0 ? (
            <p className="text-(--color-testo-tenue)">Nessun compito assegnato per ora.</p>
          ) : (
            <ul aria-label={`compiti di ${c.nome}`} className="flex flex-col gap-2">
              {c.compiti.map((k) => (
                <li key={k.id}>
                  <Link
                    href={`/officina/${c.id}/${k.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-(--color-bordo) px-4 py-3 hover:border-(--color-giallo)"
                  >
                    <span className="font-bold">{k.titolo}</span>
                    <StatoCompito k={k} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <form onSubmit={entra} className="flex flex-col gap-2 rounded-2xl border border-(--color-bordo) p-4">
        <label className="text-sm text-(--color-testo-tenue)" htmlFor="codice">
          {classi.length === 0 ? 'Per cominciare, il codice della classe che ti ha dato il prof:' : 'Entrare in un\'altra classe:'}
        </label>
        <div className="flex gap-2">
          <input
            id="codice"
            value={codice}
            onChange={(e) => setCodice(e.target.value.toUpperCase())}
            placeholder="K7QX"
            maxLength={8}
            autoComplete="off"
            className="w-32 rounded-lg border border-(--color-bordo) bg-black/40 px-3 py-2 font-mono text-xl uppercase outline-none focus:border-(--color-giallo)"
          />
          <button
            type="submit"
            disabled={occupato || codice.length < 4}
            className="rounded-lg bg-(--color-giallo) px-4 py-2 font-bold text-black hover:brightness-110 disabled:opacity-40"
          >
            Entra
          </button>
        </div>
      </form>

      {errore && (
        <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-red-200">
          {errore}
        </p>
      )}
    </main>
  );
}

function StatoCompito({ k }: { k: CompitoInElenco }) {
  if (k.finito) {
    return (
      <span className="text-(--color-verde)">
        Finito · voto <b className="font-mono text-lg">{k.voto}</b>
      </span>
    );
  }
  if (k.scaduto) {
    return (
      <span className="text-(--color-testo-tenue)">
        Scaduto · {k.fasi}/{k.fasiTotali} fasi · voto <b className="font-mono text-lg">{k.voto}</b>
      </span>
    );
  }
  return (
    <span className="text-(--color-testo-tenue)">
      {k.fasi === 0 ? 'Da cominciare' : `Fase ${k.fasi + 1} di ${k.fasiTotali}`}
      {k.scadenzaAt !== null && ` · entro il ${new Date(k.scadenzaAt).toLocaleDateString('it-IT')}`}
    </span>
  );
}
