/* Il voto dell'Officina: 10 meno mezzo punto a domanda al tutor, mai sotto 5. Si calcola
 * sempre dal numero di domande, non si salva. Modulo puro, senza segreti: lo usano anche
 * le pagine, che non devono importare i generatori di compiti.ts. */

/** Il voto parte da qui e scende di `COSTO_DOMANDA` a domanda al tutor. */
export const VOTO_MASSIMO = 10;
/** Sotto questo non si scende: le domande servono a imparare, non a bocciare. */
export const VOTO_MINIMO_FINITO = 5;
export const COSTO_DOMANDA = 0.5;

/**
 * Il voto che l'allievo vede mentre lavora: quello che prende se arriva in fondo. È il
 * numero che gli si mostra prima di chiedere un consiglio («il voto passa da 10 a 9,5»).
 */
export function votoSeFinisce(consigli: number): number {
  return Math.max(VOTO_MINIMO_FINITO, VOTO_MASSIMO - COSTO_DOMANDA * Math.max(0, consigli));
}

/** La media dei voti dei compiti finiti, con un decimale; null se nessuno è finito. */
export function mediaVoti(voci: Array<{ voto: number | null }>): number | null {
  const voti = voci.map((v) => v.voto).filter((v): v is number => v !== null);
  if (voti.length === 0) return null;
  return Math.round((voti.reduce((s, v) => s + v, 0) / voti.length) * 10) / 10;
}

/** Il voto o la media come si scrivono in italiano: 9,5. */
export function scriviVoto(voto: number): string {
  return String(voto).replace('.', ',');
}
