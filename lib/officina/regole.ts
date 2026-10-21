/* L'Officina: le regole pure dei compiti di realtà (PERCORSO.md §12).
 *
 * Qui non c'è la gara: ogni allievo lavora da solo, al suo ritmo, con i suoi numeri.
 * Il voto è quello della Cronoscalata (lib/giro/progetti.ts): 10 meno un punto a
 * domanda al tutor, pavimento 5 per chi finisce.
 *
 * Modulo puro: niente Firestore, niente Next.
 */
import { votoProposto, votoSeFinisce } from '../giro/progetti';

/** Le fasi di un compito: i progetti ne hanno cinque. */
export const FASI_PER_COMPITO = 5;

/** Un codice di classe: 4 caratteri senza 0/O/1/I, come quelli del Giro. */
export const ALFABETO_CODICE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Il seme del compito per un allievo: dal suo uid e dal compito, così i parametri sono
 * suoi (il vicino non può copiare i numeri) e restano gli stessi a ogni apertura.
 * FNV-1a a 32 bit: non serve altro che spargere bene.
 */
export function semeDa(testo: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < testo.length; i++) {
    h ^= testo.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0 || 1;
}

export type StatoLavoro = {
  fasi: number;
  consigli: number;
  finito: boolean;
  /** Voto scritto a mano dal docente: vince su quello calcolato. */
  votoDocente?: number | null;
};

/** Il voto del compito: quello del docente se c'è, altrimenti quello calcolato. */
export function votoLavoro(l: StatoLavoro, fasiTotali = FASI_PER_COMPITO): number {
  if (typeof l.votoDocente === 'number') return l.votoDocente;
  return l.finito ? votoSeFinisce(l.consigli) : votoProposto(l.fasi, fasiTotali, l.consigli);
}

/** Il voto "se finisci" mostrato all'allievo mentre lavora. */
export { votoSeFinisce };

/** Dominio ammesso per gli account degli allievi (OFFICINA_DOMINIO, anche più d'uno separati da virgola). */
export function dominiAmmessi(valore: string | undefined): string[] {
  return (valore ?? '')
    .split(',')
    .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
}

/** Vero se l'email può entrare: nessun dominio configurato = tutti. */
export function emailAmmessa(email: string, domini: string[]): boolean {
  if (domini.length === 0) return true;
  const dominio = email.toLowerCase().split('@')[1] ?? '';
  return domini.includes(dominio);
}
