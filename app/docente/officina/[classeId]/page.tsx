import { Classe } from './Classe';

export const metadata = { title: "Classe · L'Officina" };

export default async function PaginaClasse({ params }: { params: Promise<{ classeId: string }> }) {
  const { classeId } = await params;
  return <Classe classeId={classeId} />;
}
