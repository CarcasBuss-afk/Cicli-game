/* Rende i messaggi del gioco (consegne, hint, errori) con la poca formattazione che usano:
 * `codice` fra apici inversi e **grassetto**. Senza questo l'allievo leggerebbe gli apici
 * inversi a schermo. */

const PEZZI = /`([^`]+)`|\*\*([^*]+)\*\*/g;

export default function Testo({ children }: { children: string }) {
  const parti: React.ReactNode[] = [];
  let ultimo = 0;
  for (const m of children.matchAll(PEZZI)) {
    const inizio = m.index ?? 0;
    if (inizio > ultimo) parti.push(children.slice(ultimo, inizio));
    if (m[1] !== undefined) {
      parti.push(
        <code key={inizio} className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[0.95em] text-(--color-giallo)">
          {m[1]}
        </code>,
      );
    } else {
      parti.push(
        <strong key={inizio} className="font-bold text-(--color-testo)">
          {m[2]}
        </strong>,
      );
    }
    ultimo = inizio + m[0].length;
  }
  if (ultimo < children.length) parti.push(children.slice(ultimo));
  return <>{parti}</>;
}
