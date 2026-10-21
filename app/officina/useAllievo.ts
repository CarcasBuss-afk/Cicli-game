'use client';
/* Stato di accesso dell'allievo nell'Officina: login Google con l'account della scuola,
 * verifica sul server (dominio), e chi è. Con gli emulatori c'è l'accesso di prova. */
import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithCustomToken, signInWithPopup, signOut } from 'firebase/auth';
import { EMULATORI, getClientAuth, providerGoogle } from '@/lib/firebaseClient';
import { chiamaOfficina, messaggioErrore, type Io } from '@/lib/officina/client';

export type StatoAccesso = 'caricamento' | 'anonimo' | 'verifica' | 'ok' | 'negato';

function spiegaErroreLogin(e: unknown): string {
  const codice = (e as { code?: string })?.code ?? '';
  switch (codice) {
    case 'auth/popup-blocked':
      return 'Il browser ha bloccato la finestra di accesso: consenti i popup per questo sito e riprova.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'La finestra di accesso è stata chiusa prima di finire: riprova.';
    case 'auth/network-request-failed':
      return 'Rete non raggiungibile: controlla la connessione e riprova.';
    default:
      return `Accesso non riuscito: ${messaggioErrore(e)}`;
  }
}

export function useAllievo() {
  const [stato, setStato] = useState<StatoAccesso>('caricamento');
  const [io, setIo] = useState<Io | null>(null);
  const [messaggio, setMessaggio] = useState('');

  const ricarica = useCallback(async () => {
    try {
      const r = await chiamaOfficina<Io>('io');
      setIo(r);
      setStato('ok');
    } catch (e) {
      setMessaggio(messaggioErrore(e));
      setStato('negato');
    }
  }, []);

  useEffect(() => {
    return onAuthStateChanged(getClientAuth(), (u) => {
      if (!u) {
        setIo(null);
        setStato('anonimo');
        return;
      }
      setStato('verifica');
      void ricarica();
    });
  }, [ricarica]);

  const accediGoogle = useCallback(async () => {
    setMessaggio('');
    try {
      await signInWithPopup(getClientAuth(), providerGoogle());
    } catch (e) {
      setMessaggio(spiegaErroreLogin(e));
    }
  }, []);

  /** Solo con gli emulatori: un allievo di prova con l'email data. */
  const accediProva = useCallback(async (email: string, nome: string) => {
    setMessaggio('');
    try {
      const r = await fetch('/api/officina/test-login', { method: 'POST', body: JSON.stringify({ email, nome }) });
      const d = (await r.json()) as { token?: string; message?: string };
      if (!r.ok || !d.token) throw new Error(d.message || `Errore ${r.status}`);
      await signInWithCustomToken(getClientAuth(), d.token);
    } catch (e) {
      setMessaggio(`Accesso di prova non riuscito: ${messaggioErrore(e)}`);
    }
  }, []);

  const esci = useCallback(() => signOut(getClientAuth()), []);

  return { stato, io, messaggio, accediGoogle, accediProva: EMULATORI ? accediProva : null, esci, ricarica };
}
