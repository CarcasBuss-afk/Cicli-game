/* Ingresso dell'allievo. Segnaposto del Task 1: il modulo vero (codice sessione + nome,
 * salvataggio in localStorage, attesa del via) arriva nel Task 5. */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold text-(--color-rosa)">Il Giro dei Cicli</h1>
      <p className="text-(--color-testo-tenue)">
        Gara a tappe sui cicli <code>for</code>. L&apos;ingresso alla gara arriva nel Task 5.
      </p>
    </main>
  );
}
