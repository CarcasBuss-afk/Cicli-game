'use client';
/* L'Officina per il docente: le classi (in tempo reale), crearne una nuova. */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { getClientDb } from '@/lib/firebaseClient';
import { Accesso } from '../Accesso';
import { chiamaDocente } from '../api';
import { useDocente } from '../useDocente';

type Classe = { id: string; nome: string; codice: string; chiusa: boolean; compiti: number };

export function Classi() {
  const { stato, messaggio, accediGoogle, accediProva, esci, utente } = useDocente();
  const [classi, setClassi] = useState<Classe[]>([]);
  const [nome, setNome] = useState('');
  const [errore, setErrore] = useState('');
  const [occupato, setOccupato] = useState(false);

  useEffect(() => {
    if (stato !== 'ok') return;
    return onSnapshot(
      query(collection(getClientDb(), 'officinaClassi'), orderBy('createdAt', 'desc')),
      (snap) =>
        setClassi(
          snap.docs.map((d) => {
            const c = d.data();
            return {
              id: d.id,
              nome: c.nome ?? '?',
              codice: c.codice ?? '',
              chiusa: Boolean(c.chiusa),
              compiti: ((c.compiti ?? []) as Array<{ ritirato?: boolean }>).filter((k) => !k.ritirato).length,
            };
          }),
        ),
      (e) => setErrore(`Lettura delle classi non riuscita: ${e.message}`),
    );
  }, [stato]);

  async function crea(e: React.FormEvent) {
    e.preventDefault();
    setOccupato(true);
    setErrore('');
    try {
      await chiamaDocente('officina', { azione: 'creaClasse', nome });
      setNome('');
    } catch (err) {
      setErrore(err instanceof Error ? err.message : String(err));
    } finally {
      setOccupato(false);
    }
  }

  if (stato !== 'ok') {
    return <Accesso stato={stato} messaggio={messaggio} accediGoogle={accediGoogle} accediProva={accediProva} />;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black text-(--color-giallo)">🔧 L&apos;Officina · classi</h1>
          <p className="text-sm text-(--color-testo-tenue)">I compiti di realtà, in autonomia, con l&apos;account della scuola.</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-(--color-testo-tenue)">
          <Link href="/docente" className="underline">
            le gare del Giro
          </Link>
          <span>{utente?.email}</span>
          <button onClick={esci} className="underline">
            esci
          </button>
        </div>
      </header>

      <form onSubmit={crea} className="flex flex-wrap items-end gap-3 rounded-xl border border-(--color-bordo) bg-(--color-fondo-card) p-5">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-bold">Nuova classe</span>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="2A"
            aria-label="nome della classe"
            className="w-32 rounded-lg border border-(--color-bordo) bg-black/30 px-3 py-2 outline-none focus:border-(--color-giallo)"
          />
        </label>
        <button
          type="submit"
          disabled={occupato || nome.trim() === ''}
          className="rounded-lg bg-(--color-giallo) px-5 py-2.5 font-bold text-black hover:brightness-110 disabled:opacity-40"
        >
          Crea la classe
        </button>
        <p className="text-sm text-(--color-testo-tenue)">Gli allievi entrano una volta con il codice e poi basta l&apos;account.</p>
      </form>

      {errore && (
        <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-200">
          {errore}
        </p>
      )}

      <section className="flex flex-col gap-3" aria-label="classi">
        {classi.length === 0 && <p className="text-(--color-testo-tenue)">Nessuna classe: creane una qui sopra.</p>}
        {classi.map((c) => (
          <article key={c.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-(--color-bordo) bg-(--color-fondo-card) p-4">
            <span className="rounded-lg bg-black/40 px-3 py-2 font-mono text-2xl tracking-widest text-(--color-giallo)">{c.codice}</span>
            <div className="min-w-32">
              <p className="font-bold">classe {c.nome}</p>
              <p className="text-sm text-(--color-testo-tenue)">
                {c.chiusa ? 'chiusa' : `${c.compiti} ${c.compiti === 1 ? 'compito assegnato' : 'compiti assegnati'}`}
              </p>
            </div>
            <Link
              href={`/docente/officina/${c.id}`}
              className="ml-auto rounded-lg border border-(--color-giallo) px-4 py-2 font-bold text-(--color-giallo) hover:bg-(--color-giallo)/10"
            >
              Apri
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
