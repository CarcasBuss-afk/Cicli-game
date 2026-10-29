/* I compiti della sezione «Il ciclo while» (PERCORSO.md §22): dodici come quelli del `for`,
 * a gradini piccoli, con le famiglie d'uso del `while` mescolate. Dove arriva un comando
 * nuovo la fase 1 è guidata: il codice sta già nell'editor quasi finito (`codiceIniziale`)
 * e l'allievo completa un rigo.
 *
 *   1. il timer del forno — i tre gesti del `while` (preparo · condizione in testa ·
 *      aggiornamento in fondo) su un conto alla rovescia che sa già fare col `for`; il
 *      primo incontro con il ciclo infinito; poi il tempo da `input()` e l'`if` dentro.
 *
 * Stessa forma degli altri compiti: parametri dal seme, cinque fasi che aggiungono ogni
 * volta un pezzo, la scheda con l'output finale per intero. Modulo puro. */
import { generatore, type Esercizio, type Prova } from '../giro/esercizi';
import type { SchedaCompito } from './compiti';

const base = { tipo: 'progetto' as const, mostraOutput: true, risposta: 'codice' as const };

/* ------------------------------------------------------------- 1. il timer del forno */

const PIATTI = [
  { nome: 'la pizza', pronto: 'La pizza è pronta!' },
  { nome: 'la focaccia', pronto: 'La focaccia è pronta!' },
  { nome: 'il calzone', pronto: 'Il calzone è pronto!' },
  { nome: 'il pane', pronto: 'Il pane è pronto!' },
  { nome: 'le patatine', pronto: 'Le patatine sono pronte!' },
] as const;

/** I minuti delle prove nascoste, quando il tempo arriva da `input()`: uno corto e uno lungo (11 righe al massimo). */
const MINUTI_NASCOSTI = [3, 10] as const;

interface ParametriTimer {
  piatto: (typeof PIATTI)[number];
  minuti: number;
}

function parametriTimer(seme: number): ParametriTimer {
  const rnd = generatore(seme);
  const piatto = PIATTI[Math.floor(rnd() * PIATTI.length)];
  // Da 5 a 9 minuti: abbastanza righe perché il ciclo serva, diversi dai minuti delle prove nascoste.
  const minuti = 5 + Math.floor(rnd() * 5);
  return { piatto, minuti };
}

/** Le righe del timer per `minuti` minuti, nelle forme che il programma attraversa. */
function righeTimer(p: ParametriTimer, minuti: number, fase: 1 | 2 | 3 | 4 | 5): string[] {
  const righe: string[] = [];
  for (let m = minuti; m >= 1; m--) {
    if (fase <= 2) righe.push(String(m));
    else if (fase === 5 && m === 1) righe.push('Manca 1 minuto');
    else righe.push(`Mancano ${m} minuti`);
  }
  if (fase >= 2) righe.push(p.piatto.pronto);
  return righe;
}

const REGOLA_TIMER =
  'Il conto alla rovescia lo fa un ciclo `while` che gira finché i minuti sono sopra zero: la variabile dei minuti parte prima del ciclo ' +
  'e dentro al ciclo scende di 1 a ogni giro. Non valgono i numeri scritti a mano uno per uno, né un `for` con `range`: qui si impara il `while`. ' +
  'La riga finale è un `print` fuori dal ciclo, e va bene così.';

const REGOLA_TIMER_INPUT = REGOLA_TIMER + ' Il numero dei minuti arriva da `input()`: non va scritto nel programma.';

export function fasiTimer(seme: number): Esercizio[] {
  const p = parametriTimer(seme);
  const { minuti, piatto } = p;
  const b = { ...base, terreno: 'pianura' as const };
  const prove = (fase: 4 | 5): Prova[] => [minuti, ...MINUTI_NASCOSTI].map((m) => ({ risposte: [String(m)], output: righeTimer(p, m, fase) }));
  const corpoInput = 'minuti = int(input("Quanti minuti? "))';
  return [
    {
      ...b,
      consegna:
        `**Fase 1 — la riga che manca.** Il \`while\` ripete finché la sua condizione è vera: qui finché \`minuti > 0\`. ` +
        `Il codice è quasi pronto, ma dentro il ciclo manca la riga che fa **scendere** i minuti di 1 a ogni giro: senza quella ` +
        `\`minuti\` resta ${minuti} per sempre e il ciclo non si ferma mai (prova a eseguirlo senza il commento, e leggi che cosa dice). ` +
        `Scrivi quella riga al posto del commento: deve stampare ${minuti}, ${minuti - 1}… fino a 1.`,
      outputAtteso: righeTimer(p, minuti, 1),
      codiceIniziale: `minuti = ${minuti}\nwhile minuti > 0:\n    print(minuti)\n    # qui manca la riga che fa scendere i minuti di 1`,
      soluzione: `minuti = ${minuti}\nwhile minuti > 0:\n    print(minuti)\n    minuti -= 1`,
      regola: REGOLA_TIMER,
    },
    {
      ...b,
      consegna:
        `**Fase 2 — il forno suona.** Quando il ciclo finisce (cioè quando \`minuti\` arriva a 0), stampa \`${piatto.pronto}\`. ` +
        `Quel \`print\` va **dopo** il ciclo, allineato con \`while\`, non dentro.`,
      outputAtteso: righeTimer(p, minuti, 2),
      soluzione: `minuti = ${minuti}\nwhile minuti > 0:\n    print(minuti)\n    minuti -= 1\nprint("${piatto.pronto}")`,
      regola: REGOLA_TIMER,
    },
    {
      ...b,
      consegna:
        `**Fase 3 — a parole.** Il timer dice \`Mancano ${minuti} minuti\`, \`Mancano ${minuti - 1} minuti\`… \`Mancano 1 minuti\`: ` +
        `una f-string con la variabile dei minuti.`,
      outputAtteso: righeTimer(p, minuti, 3),
      soluzione: `minuti = ${minuti}\nwhile minuti > 0:\n    print(f"Mancano {minuti} minuti")\n    minuti -= 1\nprint("${piatto.pronto}")`,
      regola: REGOLA_TIMER,
    },
    {
      ...b,
      consegna:
        `**Fase 4 — i minuti li dice il cuoco.** Non sempre sono ${minuti}: chiedili con \`input()\` (e \`int()\`) **prima** del ciclo, ` +
        `al posto del numero scritto. Il \`while\` non cambia: non gli serve sapere quante volte girerà. ` +
        `Il programma viene provato rispondendo **${minuti}**, ma deve funzionare con qualunque numero.`,
      outputAtteso: righeTimer(p, minuti, 4),
      prove: prove(4),
      soluzione: `${corpoInput}\nwhile minuti > 0:\n    print(f"Mancano {minuti} minuti")\n    minuti -= 1\nprint("${piatto.pronto}")`,
      regola: REGOLA_TIMER_INPUT,
    },
    {
      ...b,
      consegna:
        `**Fase 5 — l'ultimo minuto.** «Mancano 1 minuti» è sbagliato: all'ultimo giro deve dire \`Manca 1 minuto\`. ` +
        `Dentro il ciclo ci vuole un \`if\`: se \`minuti\` è 1 stampa quella riga, altrimenti la solita. Risposta di prova: **${minuti}**.`,
      outputAtteso: righeTimer(p, minuti, 5),
      prove: prove(5),
      soluzione:
        `${corpoInput}\nwhile minuti > 0:\n    if minuti == 1:\n        print("Manca 1 minuto")\n    else:\n        print(f"Mancano {minuti} minuti")\n` +
        `    minuti -= 1\nprint("${piatto.pronto}")`,
      regola: REGOLA_TIMER_INPUT + ' La riga dell\'ultimo minuto la sceglie un `if` dentro il ciclo.',
    },
  ];
}

export function schedaTimer(seme: number): SchedaCompito {
  const p = parametriTimer(seme);
  return {
    id: 'timer',
    titolo: 'Il timer del forno',
    committente:
      `La pizzeria vuole un timer sullo schermo del forno: il cuoco digita quanti minuti deve stare dentro ${p.piatto.nome}, ` +
      `lo schermo conta i minuti all'indietro, una riga per minuto, e alla fine avvisa che è pronto. Il conto alla rovescia lo sai già fare ` +
      `con un \`for\`: qui lo rifai con il \`while\`, il ciclo che gira finché una condizione è vera.`,
    prodotto: 'Il timer: i minuti che scendono, a parole, e l\'avviso quando è pronto. Deve funzionare per qualunque numero di minuti: lo chiede con input().',
    dati: [`Piatto: ${p.piatto.nome}`, `Minuti di prova: ${p.minuti}`],
    outputFinale: righeTimer(p, p.minuti, 5),
  };
}
