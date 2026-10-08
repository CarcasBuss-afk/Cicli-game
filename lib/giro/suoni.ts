/* Effetti sonori sintetizzati con la Web Audio API (niente file audio), sullo stesso
 * modello dei minigiochi del manuale edu-code. Un solo AudioContext condiviso, sbloccato
 * al primo gesto dell'allievo. */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Da chiamare dentro un gesto dell'utente (un click) per sbloccare l'audio. */
export function sbloccaSuoni(): Promise<void> {
  const c = getCtx();
  if (!c || c.state === 'running') return Promise.resolve();
  return c.resume().catch(() => {});
}

/** Un breve "bip" con inviluppo morbido (attacco rapido, coda che sfuma). */
export function bip(freq: number, durata = 0.12, volume = 0.06): void {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  const t = c.currentTime;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + durata);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + durata + 0.03);
}

// Scala pentatonica: più tappe di fila, più sale il tono.
const SCALA = [523.25, 587.33, 659.25, 783.99, 880.0]; // Do Re Mi Sol La

/** Tappa superata: nota che sale con la serie di tappe fatte senza errori. */
export function suonoTappa(serie: number): void {
  const i = Math.min(Math.max(serie, 0), SCALA.length - 1);
  bip(SCALA[i], 0.1, 0.06);
  setTimeout(() => bip(SCALA[i] * 2, 0.08, 0.04), 70); // scintilla in ottava
}

/** Errore: un breve "buzz" basso e calante, morbido, non punitivo. */
export function suonoErrore(): void {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sawtooth';
  const t = c.currentTime;
  osc.frequency.setValueAtTime(196, t); // Sol basso
  osc.frequency.exponentialRampToValueAtTime(120, t + 0.18);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.05, t + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.23);
}

/** Il via del prof: tre colpi come allo start di una tappa. */
export function suonoVia(): void {
  bip(440, 0.1, 0.05);
  setTimeout(() => bip(440, 0.1, 0.05), 300);
  setTimeout(() => bip(880, 0.3, 0.07), 600);
}

/** Traguardo: fanfara trionfale. */
export function suonoTraguardo(): void {
  const seq = [523.25, 659.25, 783.99, 1046.5]; // Do Mi Sol Do
  seq.forEach((f, i) => setTimeout(() => bip(f, 0.16, 0.07), i * 120));
  setTimeout(() => {
    bip(1046.5, 0.5, 0.07);
    bip(1318.5, 0.5, 0.05);
  }, seq.length * 120);
}

/** "Whoosh": la card della tappa che vola via. */
export function whoosh(durata = 0.5, volume = 0.045): void {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sawtooth';
  const t = c.currentTime;
  osc.frequency.setValueAtTime(180, t);
  osc.frequency.exponentialRampToValueAtTime(1200, t + durata);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + durata);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + durata + 0.03);
}
