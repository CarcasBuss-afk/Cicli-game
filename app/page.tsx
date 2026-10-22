/* La porta d'ingresso: da qui allievi e docente scelgono l'attività. Niente logica, solo
 * i rimandi: il Giro (la gara in classe, col codice alla LIM) e l'Officina (i compiti di
 * realtà, da soli, con l'account della scuola); in fondo le due dashboard del docente. */
import Link from 'next/link';

const ATTIVITA = [
  {
    href: '/giro',
    icona: '🚴',
    titolo: 'Il Giro dei Cicli',
    cosa: 'La gara a tappe in classe',
    come: 'Serve il codice scritto alla LIM. Si entra con il nome, o con il numero di corsa se torni da un altro PC.',
    colore: 'rosa' as const,
  },
  {
    href: '/officina',
    icona: '🔧',
    titolo: "L'Officina",
    cosa: 'I compiti di realtà, da soli e al tuo ritmo',
    come: "Si entra con l'account Google della scuola. Un compito alla volta, con il tutor che ti aiuta a parole.",
    colore: 'giallo' as const,
  },
];

const DOCENTE = [
  { href: '/docente', titolo: 'Gare del Giro', cosa: 'crea un Giro, apri le tappe, proietta la LIM' },
  { href: '/docente/officina', titolo: "Classi dell'Officina", cosa: 'crea le classi e guarda come procedono' },
];

const STILE = {
  rosa: 'hover:border-(--color-rosa) focus-visible:border-(--color-rosa)',
  giallo: 'hover:border-(--color-giallo) focus-visible:border-(--color-giallo)',
};
const TITOLO = { rosa: 'text-(--color-rosa)', giallo: 'text-(--color-giallo)' };

export default function Ingresso() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-10 p-6">
      <header className="text-center">
        <h1 className="text-4xl font-black tracking-tight">
          I cicli <code className="font-mono text-(--color-giallo)">for</code> in Python
        </h1>
        <p className="mt-2 text-(--color-testo-tenue)">Che cosa facciamo oggi?</p>
      </header>

      <nav aria-label="attività" className="grid gap-4 sm:grid-cols-2">
        {ATTIVITA.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className={`flex flex-col gap-3 rounded-2xl border-2 border-(--color-bordo) bg-(--color-fondo-card) p-6 outline-none transition ${STILE[a.colore]}`}
          >
            <span className="text-5xl" aria-hidden>
              {a.icona}
            </span>
            <span className={`text-2xl font-black ${TITOLO[a.colore]}`}>{a.titolo}</span>
            <span className="font-bold">{a.cosa}</span>
            <span className="text-sm text-(--color-testo-tenue)">{a.come}</span>
          </Link>
        ))}
      </nav>

      <section aria-label="area docente" className="rounded-2xl border border-(--color-bordo) p-5">
        <p className="mb-3 text-sm font-bold text-(--color-testo-tenue)">Sei il docente?</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {DOCENTE.map((d) => (
            <li key={d.href}>
              <Link href={d.href} className="group flex flex-col rounded-xl px-3 py-2 hover:bg-white/5">
                <span className="font-bold underline group-hover:text-(--color-giallo)">{d.titolo}</span>
                <span className="text-sm text-(--color-testo-tenue)">{d.cosa}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
