/* Gli sfondi delle feste accesi, per le pagine senza esercizio: pubblico, senza login. La CDN
 * lo tiene un minuto: quando il docente accende o spegne uno sfondo, il sito se ne accorge presto. */
import { sfondiAccesi } from '@/lib/sfondi/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    return Response.json({ accesi: await sfondiAccesi() }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
  } catch (e) {
    // Senza sfondi il sito funziona lo stesso: niente errore in faccia a nessuno.
    console.error('[api/sfondi] lettura non riuscita', e);
    return Response.json({ accesi: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
