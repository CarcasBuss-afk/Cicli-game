import { defineConfig } from 'vitest/config';

/* Vitest copre la logica pura di lib/giro (micro-interprete, generatori di tappe, hint).
 * Le API e il flusso di gioco sono coperti da Playwright (playwright.api.config.ts). */
export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts'],
    environment: 'node',
  },
});
