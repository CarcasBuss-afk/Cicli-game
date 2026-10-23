'use client';

/* I coriandoli della festa: una pioggia di pezzetti colorati su tutta la pagina, disegnata
 * su un canvas fisso che non prende i click. Ogni volta che `scoppio` cambia parte una
 * nuova pioggia; chi ha chiesto al sistema niente animazioni non la vede. */
import { useEffect, useRef } from 'react';

const COLORI = ['rgb(236 72 153)', 'rgb(250 204 21)', 'rgb(52 211 153)', 'rgb(96 165 250)', 'rgb(226 232 240)'];
const PEZZI = 140;
const DURATA_MS = 2600;

interface Pezzo {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  w: number;
  h: number;
  colore: string;
}

export default function Coriandoli({ scoppio }: { scoppio: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (scoppio === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = (canvas.width = window.innerWidth);
    const H = (canvas.height = window.innerHeight);
    // Due fontane dai lati in basso più una pioggia dall'alto: riempie lo schermo in un attimo.
    const pezzi: Pezzo[] = Array.from({ length: PEZZI }, (_, i) => {
      const daSinistra = i % 3 === 0;
      const daDestra = i % 3 === 1;
      const x = daSinistra ? 0 : daDestra ? W : Math.random() * W;
      const y = daSinistra || daDestra ? H * 0.85 : -20;
      const spinta = 9 + Math.random() * 7;
      const vx = daSinistra ? spinta * (0.5 + Math.random() * 0.5) : daDestra ? -spinta * (0.5 + Math.random() * 0.5) : (Math.random() - 0.5) * 3;
      const vy = daSinistra || daDestra ? -spinta * (1.1 + Math.random() * 0.6) : 2 + Math.random() * 3;
      return {
        x,
        y,
        vx,
        vy,
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 0.3,
        w: 6 + Math.random() * 6,
        h: 10 + Math.random() * 8,
        colore: COLORI[i % COLORI.length],
      };
    });

    let inizio = 0;
    let richiesta = 0;
    const disegna = (t: number) => {
      if (!inizio) inizio = t;
      const trascorso = t - inizio;
      ctx.clearRect(0, 0, W, H);
      const dissolvenza = Math.max(0, 1 - Math.max(0, trascorso - DURATA_MS * 0.6) / (DURATA_MS * 0.4));
      for (const p of pezzi) {
        p.vy += 0.35; // gravità
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;
        ctx.save();
        ctx.globalAlpha = dissolvenza;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.colore;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (trascorso < DURATA_MS) richiesta = requestAnimationFrame(disegna);
      else ctx.clearRect(0, 0, W, H);
    };
    richiesta = requestAnimationFrame(disegna);
    return () => {
      cancelAnimationFrame(richiesta);
      ctx.clearRect(0, 0, W, H);
    };
  }, [scoppio]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-50 h-full w-full" />;
}
