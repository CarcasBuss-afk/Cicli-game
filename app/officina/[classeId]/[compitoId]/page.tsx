import { Compito } from './Compito';

export const metadata = { title: "Compito · L'Officina" };

export default async function PaginaCompito({ params }: { params: Promise<{ classeId: string; compitoId: string }> }) {
  const { classeId, compitoId } = await params;
  return <Compito classeId={classeId} compitoId={compitoId} />;
}
