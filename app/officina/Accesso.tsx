'use client';
/* Schermata di accesso dell'allievo: il pulsante Google e, con gli emulatori, l'accesso di prova. */
import { useState } from 'react';
import type { StatoAccesso } from './useAllievo';

export function AccessoAllievo({
  stato,
  messaggio,
  accediGoogle,
  accediProva,
  esci,
}: {
  stato: StatoAccesso;
  messaggio: string;
  accediGoogle: () => void;
  accediProva: ((email: string, nome: string) => void) | null;
  esci: () => void;
}) {
  const [email, setEmail] = useState('');
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      <p className="text-5xl" aria-hidden>
        🔧
      </p>
      <h1 className="text-3xl font-black text-(--color-giallo)">L&apos;Officina</h1>
      <p className="text-(--color-testo-tenue)">I compiti di realtà sui cicli: entra con l&apos;account della scuola.</p>

      {stato === 'caricamento' || stato === 'verifica' ? (
        <p className="text-(--color-testo-tenue)">Un attimo…</p>
      ) : (
        <>
          <button onClick={accediGoogle} className="rounded-lg bg-(--color-giallo) px-5 py-3 text-lg font-bold text-black hover:brightness-110">
            Accedi con Google
          </button>
          {stato === 'negato' && (
            <button onClick={esci} className="text-sm text-(--color-testo-tenue) underline">
              Esci e cambia account
            </button>
          )}
          {accediProva && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                accediProva(email, email.split('@')[0]);
              }}
              className="flex flex-col gap-2"
            >
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email di prova"
                aria-label="email di prova"
                className="rounded-lg border border-(--color-bordo) bg-black/40 px-3 py-2 text-center outline-none"
              />
              <button type="submit" className="text-sm text-(--color-testo-tenue) underline">
                Accesso di prova (emulatori)
              </button>
            </form>
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
