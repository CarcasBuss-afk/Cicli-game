import { Lim } from './Lim';

export const metadata = { title: 'Vista LIM · Il Giro dei Cicli' };

// In Next 16 i parametri della rotta arrivano come Promise.
export default async function PaginaSessione({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Lim sessionId={id} />;
}
