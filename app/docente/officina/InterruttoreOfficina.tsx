'use client';
/* L'interruttore dell'Officina di una classe: aperta durante la lezione, chiusa a fine ora
 * (così da casa nessuno si fa fare i compiti dal tutor). Non è una fine: si riapre la volta
 * dopo e tutto riprende da dove era. Niente conferma: è un gesto da ripetere a ogni lezione. */

type Props = { chiusa: boolean; onCambia: (chiusa: boolean) => void; compatto?: boolean };

export function InterruttoreOfficina({ chiusa, onCambia, compatto = false }: Props) {
  const classe = compatto ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 font-bold';
  return chiusa ? (
    <button
      onClick={() => onCambia(false)}
      aria-label="apri l'Officina"
      className={`rounded-lg bg-(--color-verde) text-black hover:brightness-110 ${classe}`}
    >
      Apri l&apos;Officina
    </button>
  ) : (
    <button
      onClick={() => onCambia(true)}
      aria-label="chiudi l'Officina"
      className={`rounded-lg border border-(--color-bordo) text-(--color-testo-tenue) hover:border-(--color-giallo) hover:text-(--color-testo) ${classe}`}
    >
      Chiudi l&apos;Officina
    </button>
  );
}
