/* La scheda del compito di realtà: chi lo chiede, che cosa deve venire
 * fuori, i dati, e il prodotto finale per intero. Resta sopra l'editor per tutta la tappa:
 * è il bersaglio, e nel compito di realtà il bersaglio si vede. */
import { useState } from 'react';
import type { SchedaCompito } from '@/lib/officina/compiti';

export default function SchedaCompito({ scheda, fase, fasi }: { scheda: SchedaCompito; fase: number; fasi: number }) {
  // Dalla seconda fase la scheda si richiude da sola: lo spazio serve al codice.
  const [aperta, setAperta] = useState(fase === 1);
  return (
    <section className="rounded-2xl border border-(--color-giallo)/40 bg-(--color-giallo)/5 p-4 sm:p-5">
      <button
        type="button"
        onClick={() => setAperta((a) => !a)}
        aria-expanded={aperta}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span>
          <span className="text-sm font-bold uppercase tracking-wide text-(--color-giallo)">Compito di realtà</span>
          <span className="block text-xl font-black">{scheda.titolo}</span>
        </span>
        <span className="text-sm text-(--color-testo-tenue)">
          fase {fase} di {fasi} {aperta ? '▲' : '▼'}
        </span>
      </button>

      {aperta && (
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <p>{scheda.committente}</p>
            <p className="text-(--color-testo-tenue)">{scheda.prodotto}</p>
            <ul className="mt-1 flex flex-wrap gap-2">
              {scheda.dati.map((d) => (
                <li key={d} className="rounded-lg bg-black/40 px-2.5 py-1 font-mono text-sm">
                  {d}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 text-sm font-bold text-(--color-testo-tenue)">Il programma finito stampa:</p>
            <pre className="overflow-x-auto rounded-xl border border-(--color-bordo) bg-black/40 p-3 font-mono text-sm leading-snug">
              {scheda.outputFinale.join('\n')}
            </pre>
          </div>
        </div>
      )}
    </section>
  );
}
