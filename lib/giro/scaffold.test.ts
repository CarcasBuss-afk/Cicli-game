/* Segnaposto del Task 1: verifica solo che Vitest sia configurato.
 * Si cancella nel Task 2, quando arrivano i test veri del micro-interprete. */
import { describe, expect, it } from 'vitest';

describe('scaffold', () => {
  it('Vitest funziona', () => {
    expect(1 + 1).toBe(2);
  });
});
