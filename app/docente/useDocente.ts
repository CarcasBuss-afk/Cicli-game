'use client';
/* Stato di accesso del docente: login Google (o accesso di prova con gli emulatori),
 * verifica dell'autorizzazione sul server, claim `teacher` al primo accesso. */
import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithCustomToken, signInWithPopup, signOut, type User } from 'firebase/auth';
import { EMULATORI, getClientAuth, providerGoogle } from '@/lib/firebaseClient';
import { chiamaDocente } from './api';

export type StatoAccesso = 'caricamento' | 'anonimo' | 'verifica' | 'ok' | 'negato';

const testo = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Messaggi in italiano per gli errori più comuni del login con Google. */
function spiegaErroreLogin(e: unknown): string {
  const codice = (e as { code?: string })?.code ?? '';
  switch (codice) {
    case 'auth/unauthorized-domain':
      return `Questo dominio (${window.location.hostname}) non è autorizzato in Firebase: Authentication → Impostazioni → Domini autorizzati.`;
    case 'auth/popup-blocked':
      return 'Il browser ha bloccato la finestra di accesso: consenti i popup per questo sito e riprova.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'La finestra di accesso è stata chiusa prima di completare il login: riprova.';
    case 'auth/operation-not-allowed':
      return 'Il provider Google non è attivo in Firebase: Authentication → Metodo di accesso → Google.';
    case 'auth/network-request-failed':
      return 'Rete non raggiungibile: controlla la connessione e riprova.';
    default:
      return `Accesso non riuscito: ${testo(e)}`;
  }
}

export function useDocente() {
  const [utente, setUtente] = useState<User | null>(null);
  const [stato, setStato] = useState<StatoAccesso>('caricamento');
  const [messaggio, setMessaggio] = useState('');

  useEffect(() => {
    return onAuthStateChanged(getClientAuth(), async (u) => {
      setUtente(u);
      if (!u) {
        setStato('anonimo');
        return;
      }
      setStato('verifica');
      try {
        const r = await chiamaDocente<{ claimAggiornato: boolean }>('accesso');
        // Il claim appena assegnato entra nel token solo dopo un refresh.
        if (r.claimAggiornato) await u.getIdToken(true);
        setStato('ok');
      } catch (e) {
        setMessaggio(testo(e));
        setStato('negato');
      }
    });
  }, []);

  const accediGoogle = useCallback(async () => {
    setMessaggio('');
    try {
      await signInWithPopup(getClientAuth(), providerGoogle());
    } catch (e) {
      setMessaggio(spiegaErroreLogin(e));
    }
  }, []);

  const accediProva = useCallback(async () => {
    setMessaggio('');
    try {
      const r = await fetch('/api/docente/test-login', { method: 'POST' });
      const d = (await r.json()) as { token?: string; message?: string };
      if (!r.ok || !d.token) throw new Error(d.message || `Errore ${r.status}`);
      await signInWithCustomToken(getClientAuth(), d.token);
    } catch (e) {
      setMessaggio(`Accesso di prova non riuscito: ${testo(e)}`);
    }
  }, []);

  const esci = useCallback(() => signOut(getClientAuth()), []);

  return { utente, stato, messaggio, accediGoogle, accediProva: EMULATORI ? accediProva : null, esci };
}
