/* Costanti condivise fra la configurazione Playwright e i test delle API.
 * Porte diverse da quelle dell'escape room: i due progetti possono avere i test aperti
 * nello stesso momento. Il progetto "demo-giro" è fittizio (i progetti "demo-*" non
 * toccano mai Firebase vero). */

export const PROJECT_ID = 'demo-giro';
export const EMULATOR_HOST = '127.0.0.1:8099';
export const AUTH_EMULATOR_HOST = '127.0.0.1:9199';
export const PORTA_WEB = 3211;
export const API_BASE = `http://127.0.0.1:${PORTA_WEB}`;
/** Limite alto: i test fanno molte chiamate di seguito e non stanno provando il rate limit
 *  (quello è coperto dai test unitari di lib/giro/rateLimit.ts). */
export const RATE_LIMIT = 500;
export const TEACHER_EMAIL = 'prof@scuola.it';
