'use client';

/* Ingresso dell'allievo: codice della gara (proiettato alla LIM) e nome di battesimo.
 * Se l'allievo è già registrato (localStorage) riprende la gara dov'era. */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { join, leggiIdentita, messaggioErrore, salvaIdentita, type Identita } from '@/lib/giro/client';
import { sbloccaSuoni } from '@/lib/giro/suoni';
import Testo from '@/components/Testo';

export default function Ingresso() {
  const router = useRouter();
  const [gia, setGia] = useState<Identita | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);
  /** true quando il JavaScript della pagina è pronto: prima di allora i pulsanti non
   *  farebbero niente di utile. Finisce su data-pronto del modulo, dove lo aspettano i test. */
  const [pronto, setPronto] = useState(false);
  // I campi non sono controllati da React: così quello che l'allievo digita subito,
  // prima che il JavaScript sia pronto (PC lenti del laboratorio), non va perduto.
  const codiceRef = useRef<HTMLInputElement>(null);
  const nomeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setGia(leggiIdentita());
    setPronto(true);
  }, []);

  async function entra(e: React.SyntheticEvent) {
    e.preventDefault();
    if (invio) return;
    const codice = (codiceRef.current?.value ?? '').trim().toUpperCase();
    const nome = (nomeRef.current?.value ?? '').trim();
    if (codice.length < 4) {
      setErrore('Il codice della gara è di 4 caratteri: guarda alla LIM');
      return;
    }
    if (nome === '') {
      setErrore('Scrivi il tuo nome');
      return;
    }
    setErrore(null);
    setInvio(true);
    void sbloccaSuoni();
    try {
      const esito = await join(codice, nome);
      salvaIdentita({
        playerId: esito.playerId,
        token: esito.token,
        name: esito.name,
        numTappe: esito.numTappe,
      });
      router.push('/gara');
    } catch (err) {
      setErrore(messaggioErrore(err));
      setInvio(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-8 p-6">
      <header className="text-center">
        <p className="text-5xl" aria-hidden>
          🚴
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-(--color-rosa)">Il Giro dei Cicli</h1>
        <p className="mt-2 text-(--color-testo-tenue)">
          Una gara a tappe sui cicli <code className="font-mono text-(--color-giallo)">for</code>
        </p>
      </header>

      {gia && (
        <div className="rounded-xl border border-(--color-rosa-scuro) bg-(--color-fondo-card) p-4">
          <p className="text-sm text-(--color-testo-tenue)">Stavi già correndo come</p>
          <p className="text-xl font-bold">{gia.name}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => {
                void sbloccaSuoni();
                router.push('/gara');
              }}
              className="rounded-lg bg-(--color-rosa) px-4 py-2 font-bold text-white hover:brightness-110"
            >
              Riprendi la gara
            </button>
            <button
              onClick={() => setGia(null)}
              className="rounded-lg border border-(--color-bordo) px-4 py-2 text-(--color-testo-tenue) hover:text-(--color-testo)"
            >
              Entra con un altro nome
            </button>
          </div>
        </div>
      )}

      {!gia && (
        <form
          onSubmit={entra}
          data-pronto={pronto ? '1' : undefined}
          className="flex flex-col gap-5 rounded-xl border border-(--color-bordo) bg-(--color-fondo-card) p-6"
        >
          <label className="flex flex-col gap-2">
            <span className="font-bold">Codice della gara</span>
            <span className="text-sm text-(--color-testo-tenue)">Lo trovi scritto grande alla LIM</span>
            <input
              ref={codiceRef}
              name="codice"
              maxLength={4}
              autoFocus
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="K7QX"
              className="rounded-lg border border-(--color-bordo) bg-black/30 px-4 py-3 text-center font-mono text-3xl tracking-[0.3em] uppercase outline-none focus:border-(--color-rosa)"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="font-bold">Il tuo nome</span>
            <span className="text-sm text-(--color-testo-tenue)">
              Solo il nome. Se in classe c&apos;è un altro con il tuo nome, aggiungi l&apos;iniziale del cognome
            </span>
            <input
              ref={nomeRef}
              name="nome"
              maxLength={20}
              autoComplete="off"
              placeholder="Luca"
              className="rounded-lg border border-(--color-bordo) bg-black/30 px-4 py-3 text-xl outline-none focus:border-(--color-rosa)"
            />
          </label>

          {errore && (
            <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-200">
              <Testo>{errore}</Testo>
            </p>
          )}

          {/* type="button": un clic arrivato prima che il JavaScript sia pronto non deve
              far ricaricare la pagina, cancellando quello che l'allievo ha scritto. */}
          <button
            type="button"
            onClick={entra}
            disabled={invio}
            className="rounded-lg bg-(--color-rosa) px-4 py-3 text-lg font-bold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {invio ? 'Entro…' : 'Al via!'}
          </button>
        </form>
      )}
    </main>
  );
}
