/* L'immagine di uno sfondo. Un'immagine caricata non cambia mai (una nuova ha un id nuovo),
 * quindi browser e CDN la tengono a lungo. */
import { immagineSfondo } from '@/lib/sfondi/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const immagine = await immagineSfondo(id).catch((e) => {
    console.error('[api/sfondi/id] lettura non riuscita', e);
    return null;
  });
  if (!immagine) return new Response('Sfondo inesistente', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  return new Response(new Uint8Array(immagine.dati), {
    headers: {
      'Content-Type': immagine.tipo,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
