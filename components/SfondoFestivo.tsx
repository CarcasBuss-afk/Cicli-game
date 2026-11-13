'use client';
/* Lo sfondo delle feste dietro le pagine senza esercizio (ingresso, ingresso del Giro, attese
 * della gara, accesso ed elenco dell'Officina): uno a caso fra quelli che il docente ha acceso,
 * lo stesso per tutta la visita. Compare quando l'immagine è arrivata, con una dissolvenza;
 * nessuno acceso = la pagina di sempre. Mentre c'è, il body ha la classe `con-sfondo` e i
 * contenuti marcati `pannello-sfondo` stanno su un pannello scuro (globals.css). Dove c'è un
 * esercizio non si monta: lì serve concentrazione. */
import { useEffect, useState } from 'react';
import { scegliSfondo } from '@/lib/sfondi/formato';

const CHIAVE = 'giro:sfondo';

export default function SfondoFestivo() {
  const [url, setUrl] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    let annullato = false;
    fetch('/api/sfondi')
      .then((r) => (r.ok ? (r.json() as Promise<{ accesi?: string[] }>) : { accesi: [] }))
      .then(({ accesi = [] }) => {
        let scelto: string | null = null;
        try {
          scelto = sessionStorage.getItem(CHIAVE);
        } catch {}
        const id = scegliSfondo(accesi, scelto);
        if (!id || annullato) return;
        try {
          sessionStorage.setItem(CHIAVE, id);
        } catch {}
        const src = `/api/sfondi/${id}`;
        const img = new Image();
        img.onload = () => {
          if (annullato) return;
          setUrl(src);
          requestAnimationFrame(() => setPronto(true));
        };
        img.src = src;
      })
      .catch(() => {});
    return () => {
      annullato = true;
    };
  }, []);

  useEffect(() => {
    if (!url) return;
    document.body.classList.add('con-sfondo');
    return () => document.body.classList.remove('con-sfondo');
  }, [url]);

  if (!url) return null;
  return (
    <div
      aria-hidden
      data-testid="sfondo-festivo"
      className={`pointer-events-none fixed inset-0 -z-10 transition-opacity duration-700 ${pronto ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${url})` }} />
      <div className="absolute inset-0 bg-(--color-fondo)/40" />
    </div>
  );
}
