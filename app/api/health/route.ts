/* Controllo di vita del server: usato dai test e dopo il deploy. Non tocca Firestore. */
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ ok: true, app: 'giro-dei-cicli', at: new Date().toISOString() });
}
