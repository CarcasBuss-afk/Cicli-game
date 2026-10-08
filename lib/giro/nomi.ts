/* Nome di battesimo dell'allievo: normalizzazione e validazione.
 * Degli allievi si memorizza solo il nome; in una classe con due "Luca" il secondo
 * aggiunge l'iniziale del cognome ("Luca B."), per questo il punto è ammesso. */

export const NOME_MAX = 20;

// Lettere di qualunque alfabeto, apostrofo (dritto o tipografico), spazio, trattino, punto.
const CARATTERI_AMMESSI = /^[\p{L}'’ .-]+$/u;

/** trim, spazi multipli ridotti a uno, iniziale maiuscola di ogni parola, resto minuscolo. */
export function normalizzaNome(grezzo: unknown): string {
  if (typeof grezzo !== 'string') return '';
  const pulito = grezzo.replace(/\s+/g, ' ').trim().toLocaleLowerCase('it');
  return pulito.replace(
    /(^|[ '’-])(\p{L})/gu,
    (_, sep: string, lettera: string) => sep + lettera.toLocaleUpperCase('it'),
  );
}

/** Messaggio d'errore in italiano, oppure null se il nome va bene. */
export function validaNome(nome: string): string | null {
  if (!nome) return 'il nome è vuoto';
  if (nome.length > NOME_MAX) return `il nome è troppo lungo (massimo ${NOME_MAX} caratteri)`;
  if (!CARATTERI_AMMESSI.test(nome)) return 'il nome può contenere solo lettere, spazi, apostrofi e trattini';
  if (!/\p{L}/u.test(nome)) return 'il nome deve contenere almeno una lettera';
  return null;
}

/** Chiave per riconoscere i doppioni nella stessa sessione: minuscolo, senza punti. */
export function chiaveNome(nome: string): string {
  return nome.toLocaleLowerCase('it').replace(/\./g, '').replace(/\s+/g, ' ').trim();
}
