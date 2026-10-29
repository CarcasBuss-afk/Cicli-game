/* Lo "schermo" di un programma con input(): le domande con la risposta digitata in
 * evidenza e le righe stampate, nell'ordine in cui l'allievo le vedrebbe nel terminale.
 * Per i programmi senza input() è una lista di righe e basta. */
import type { RigaSchermo } from '@/lib/giro/interprete';

export default function Schermo({ righe, titolo, classe = '' }: { righe: RigaSchermo[]; titolo?: string; classe?: string }) {
  return (
    <div>
      {titolo && <p className="mb-1 text-sm font-bold text-(--color-testo-tenue)">{titolo}</p>}
      <pre className={`overflow-x-auto rounded-xl border border-(--color-bordo) bg-black/40 p-4 font-mono text-[1.05rem] ${classe}`}>
        {righe.map((r, i) =>
          r.k === 'out' ? (
            <div key={i}>{r.v || ' '}</div>
          ) : (
            <div key={i} className="text-(--color-testo-tenue)">
              {r.domanda}
              <span className="rounded bg-(--color-giallo)/20 px-1 text-(--color-giallo)" title="risposta di prova">
                {r.risposta}
              </span>
            </div>
          ),
        )}
      </pre>
    </div>
  );
}

/** I dati di prova con cui il programma viene eseguito: le risposte alle `input()` e, se il compito usa il caso, i numeri che `randint` dà. */
export function RisposteDiProva({ risposte, casuali = [] }: { risposte: string[]; casuali?: number[] }) {
  const chip = (v: string | number, i: number) => (
    <span key={i} className="rounded bg-(--color-giallo)/20 px-2 py-0.5 font-mono text-(--color-giallo)">
      {v}
    </span>
  );
  return (
    <p className="flex flex-wrap items-center gap-2 text-sm text-(--color-testo-tenue)">
      {risposte.length > 0 && (
        <>
          <span>Il programma viene provato rispondendo, nell&apos;ordine:</span>
          {risposte.map(chip)}
        </>
      )}
      {casuali.length > 0 && (
        <>
          <span>{risposte.length > 0 ? 'e' : 'Il programma viene provato'} con {casuali.length === 1 ? 'il numero casuale' : 'i numeri casuali'}:</span>
          {casuali.map(chip)}
        </>
      )}
      <span>(e poi con altri dati: deve funzionare sempre)</span>
    </p>
  );
}
