/* Token dell'allievo: generato all'ingresso e restituito una sola volta; in Firestore
 * resta solo lo sha256, confrontato a tempo costante. */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export function generaToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function tokenValido(token: unknown, hashAtteso: string | undefined): boolean {
  if (typeof token !== 'string' || !token || !hashAtteso) return false;
  const a = Buffer.from(hashToken(token));
  const b = Buffer.from(hashAtteso);
  return a.length === b.length && timingSafeEqual(a, b);
}
