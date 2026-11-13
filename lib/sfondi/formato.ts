/* Gli sfondi delle feste (le pagine senza esercizio: ingresso, attese del Giro, elenco
 * dell'Officina): le regole pure, usate dal server, dal browser e dallo script di caricamento.
 * Il docente carica le immagini e le accende o spegne quando vuole; fra quelle accese il sito
 * ne mostra una a caso per visita. Stessa idea del sito di Tecnologie Web, ma sfondi suoi.
 * Modulo puro: niente Firestore, niente Next. */

/** Il peso massimo di un'immagine salvata: sta in un solo documento Firestore (limite 1 MiB). */
export const PESO_MASSIMO = 900_000;

/** Il lato lungo a cui il browser del docente riduce l'immagine prima di caricarla. */
export const LATO_MASSIMO = 1920;

export type TipoImmagine = 'image/webp' | 'image/jpeg' | 'image/png';

/** Il tipo vero dell'immagine, dai primi byte; null se non è un'immagine ammessa. */
export function tipoDaiByte(b: Uint8Array): TipoImmagine | null {
  const ascii = (da: number, a: number) => String.fromCharCode(...b.subarray(da, a));
  if (b.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && b[0] === 0x89 && ascii(1, 4) === 'PNG') return 'image/png';
  return null;
}

/** Il nome dato dal docente, ripulito: mai vuoto. */
export function nomeSfondo(grezzo: unknown): string {
  const nome = typeof grezzo === 'string' ? grezzo.replace(/\s+/g, ' ').trim().slice(0, 60) : '';
  return nome || 'Sfondo senza nome';
}

/** L'id di uno sfondo come lo scrive Firestore: lettere e cifre. */
export const idValido = (id: unknown): id is string => typeof id === 'string' && /^[A-Za-z0-9]{1,40}$/.test(id);

/**
 * Lo sfondo da mostrare in questa visita: quello scelto prima, se è ancora acceso, così
 * passando dall'ingresso al Giro o all'Officina non cambia; altrimenti uno a caso fra gli accesi.
 */
export function scegliSfondo(accesi: string[], scelto: string | null, caso: number = Math.random()): string | null {
  if (accesi.length === 0) return null;
  if (scelto && accesi.includes(scelto)) return scelto;
  return accesi[Math.min(accesi.length - 1, Math.floor(caso * accesi.length))];
}
