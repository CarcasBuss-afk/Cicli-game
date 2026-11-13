import SfondoFestivo from '@/components/SfondoFestivo';
import { Officina } from './Officina';

export const metadata = { title: "L'Officina · compiti di realtà" };

export default function PaginaOfficina() {
  // Lo sfondo delle feste sta dietro l'accesso e l'elenco dei compiti; dentro il compito no.
  return (
    <>
      <SfondoFestivo />
      <Officina />
    </>
  );
}
