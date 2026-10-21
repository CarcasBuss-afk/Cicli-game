/* L'Officina: le regole pure dei compiti di realtà (PERCORSO.md §12).
 *
 * Non è una gara: ogni allievo percorre da solo, al suo ritmo, lo stesso elenco di compiti
 * (i progetti nell'ordine didattico), uno sbloccato alla volta: il successivo si apre
 * quando il precedente è finito. Il voto c'è solo a compito finito: 10 meno un punto a
 * domanda al tutor, mai sotto 5; gli aiuti restano possibili anche a 5.
 *
 * Modulo puro: niente Firestore, niente Next.
 */
import { ELENCO_PROGETTI, votoSeFinisce, type Progetto } from '../giro/progetti';

/** Le fasi di un compito: i progetti ne hanno cinque. */
export const FASI_PER_COMPITO = 5;

/** I compiti del percorso, nell'ordine in cui si sbloccano. */
export const PERCORSO: Progetto[] = ELENCO_PROGETTI;

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

export type ProgressoCompito = { fasi: number; consigli: number };

export type StatoCompito = 'finito' | 'in-corso' | 'da-cominciare' | 'bloccato';

export type VoceCompito = {
  id: Progetto;
  stato: StatoCompito;
  fasi: number;
  consigli: number;
  /** Solo a compito finito. */
  voto: number | null;
};

/** Il voto di un lavoro: solo se finito. */
export function votoLavoro(l: ProgressoCompito, fasiTotali = FASI_PER_COMPITO): number | null {
  return l.fasi >= fasiTotali ? votoSeFinisce(l.consigli) : null;
}

/**
 * Il percorso di un allievo: ogni compito con il suo stato. Il primo è sempre aperto; ogni
 * altro si sblocca quando il precedente è finito.
 */
export function percorsoDi(lavori: Record<string, ProgressoCompito | undefined>, fasiTotali = FASI_PER_COMPITO): VoceCompito[] {
  let precedenteFinito = true;
  return PERCORSO.map((id) => {
    const l = lavori[id] ?? { fasi: 0, consigli: 0 };
    const finito = l.fasi >= fasiTotali;
    const stato: StatoCompito = finito ? 'finito' : !precedenteFinito ? 'bloccato' : l.fasi > 0 ? 'in-corso' : 'da-cominciare';
    precedenteFinito = finito;
    return { id, stato, fasi: l.fasi, consigli: l.consigli, voto: finito ? votoSeFinisce(l.consigli) : null };
  });
}

/** La media dei voti dei compiti finiti, con un decimale; null se nessuno è finito. */
export function mediaVoti(voci: Array<{ voto: number | null }>): number | null {
  const voti = voci.map((v) => v.voto).filter((v): v is number => v !== null);
  if (voti.length === 0) return null;
  return Math.round((voti.reduce((s, v) => s + v, 0) / voti.length) * 10) / 10;
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
