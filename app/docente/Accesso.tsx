'use client';
/* Schermata di accesso del docente, condivisa da dashboard e vista LIM. */
import type { StatoAccesso } from './useDocente';

export function Accesso({
  stato,
  messaggio,
  accediGoogle,
  accediProva,
}: {
  stato: StatoAccesso;
  messaggio: string;
  accediGoogle: () => void;
  accediProva: (() => void) | null;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      <p className="text-5xl" aria-hidden>
        🚴
      </p>
      <h1 className="text-3xl font-black text-(--color-rosa)">Il Giro dei Cicli</h1>
      <p className="text-(--color-testo-tenue)">Area docente</p>

      {stato === 'caricamento' || stato === 'verifica' ? (
        <p className="text-(--color-testo-tenue)">Un attimo…</p>
      ) : (
        <>
          <button
            onClick={accediGoogle}
            className="rounded-lg bg-(--color-rosa) px-5 py-3 text-lg font-bold text-white hover:brightness-110"
          >
            Accedi con Google
          </button>
          {accediProva && (
            <button onClick={accediProva} className="text-sm text-(--color-testo-tenue) underline">
              Accesso di prova (emulatori)
            </button>
          )}
        </>
      )}

      {messaggio && (
        <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-left text-red-200">
          {messaggio}
        </p>
      )}
    </main>
  );
}
