/* Il patentino dei cicli `for` (PERCORSO.md §19): l'esame in fondo alla prima sezione del
 * percorso. Un compito come gli altri nella forma (cinque fasi, un programma che cresce,
 * parametri dal seme) ma ogni fase ripassa un'idea diversa del percorso: ripetere, la
 * variabile in un calcolo, `input()` dentro il ciclo, l'accumulatore, la variabile che
 * ricorda il migliore. Il tutor è spento (`esame: true`): restano gli hint automatici.
 *
 * Scenario nuovo, così non si copia da un compito fatto: il tabellone della gara sociale,
 * N giri di un circuito da L km, con il tempo di ogni giro chiesto a chi tiene il tabellone.
 *
 * Modulo puro. */
import { generatore, type Esercizio, type Prova } from '../giro/esercizi';
import type { SchedaCompito } from './compiti';

const LUNGHEZZE = [2, 3, 4, 5] as const;

interface ParametriPatentino {
  giri: number;
  lunghezza: number;
  /**
   * I tempi dei giri: la gara mostrata e due nascoste, sempre con gli stessi giri (il numero
   * è nel codice), col giro più veloce in posizioni diverse: in mezzo, per primo, per ultimo.
   */
  gare: [number[], number[], number[]];
}

function tempiDistinti(rnd: () => number, n: number): number[] {
  const tempi: number[] = [];
  while (tempi.length < n) {
    const t = 5 + Math.floor(rnd() * 8); // 5..12 minuti
    if (!tempi.includes(t)) tempi.push(t);
  }
  return tempi;
}

/** Sposta il tempo più basso alla posizione `dove`. */
function veloceIn(tempi: number[], dove: number): number[] {
  const copia = [...tempi];
  const i = copia.indexOf(Math.min(...copia));
  [copia[i], copia[dove]] = [copia[dove], copia[i]];
  return copia;
}

function parametriPatentino(seme: number): ParametriPatentino {
  const rnd = generatore(seme);
  const giri = 4 + Math.floor(rnd() * 3); // 4..6
  const lunghezza = LUNGHEZZE[Math.floor(rnd() * LUNGHEZZE.length)];
  // Nella gara mostrata il giro più veloce non è il primo (altrimenti basta ricordare la prima risposta).
  const mostrata = veloceIn(tempiDistinti(rnd, giri), 1 + Math.floor(rnd() * (giri - 2)));
  const primo = veloceIn(tempiDistinti(rnd, giri), 0);
  const ultimo = veloceIn(tempiDistinti(rnd, giri), giri - 1);
  return { giri, lunghezza, gare: [mostrata, primo, ultimo] };
}

function righePatentino(p: ParametriPatentino, tempi: number[], fase: 1 | 2 | 3 | 4 | 5): string[] {
  const righe = tempi.map((t, idx) => {
    const i = idx + 1;
    if (fase === 1) return `Giro ${i}`;
    if (fase === 2) return `Giro ${i}: ${i * p.lunghezza} km`;
    return `Giro ${i}: ${i * p.lunghezza} km in ${t} min`;
  });
  if (fase >= 4) righe.push(`Tempo totale: ${tempi.reduce((a, b) => a + b, 0)} min`);
  if (fase >= 5) {
    const minimo = Math.min(...tempi);
    righe.push(`Giro più veloce: il ${tempi.indexOf(minimo) + 1} (${minimo} min)`);
  }
  return righe;
}

/** Dalla fase 3 il programma chiede i tempi: tre gare di prova con tempi diversi. */
function provePatentino(p: ParametriPatentino, fase: 3 | 4 | 5): Prova[] {
  return p.gare.map((tempi) => ({ risposte: tempi.map(String), output: righePatentino(p, tempi, fase) }));
}

function regolaPatentino(fase: number, lunghezza: number): string {
  const ciclo = 'Le righe dei giri le stampa un ciclo `for`: non valgono righe scritte a mano né un ciclo da un giro solo con più `print`.';
  const km = fase >= 2 ? ` I km li calcola il programma dalla variabile del ciclo (\`i * ${lunghezza}\`) oppure con una variabile che cresce di ${lunghezza} a ogni giro: non valgono numeri scritti a mano riga per riga.` : '';
  const tempo = fase >= 3 ? ' Il tempo di ogni giro arriva da `input()` (con `int()`) dentro il ciclo, una domanda per giro: non valgono tempi scritti nel programma né una domanda sola fuori dal ciclo.' : '';
  const totale = fase >= 4 ? ' Il tempo totale lo tiene una variabile che parte da 0 prima del ciclo e cresce a ogni giro del tempo risposto: non vale un numero scritto a mano.' : '';
  const veloce = fase >= 5 ? ' Il giro più veloce lo trovano una variabile che parte da un numero grande e un `if` dentro il ciclo che la sostituisce quando il tempo è più basso, insieme al numero del giro: non vale scriverlo a mano.' : '';
  return ciclo + km + tempo + totale + veloce;
}

export function fasiPatentino(seme: number): Esercizio[] {
  const p = parametriPatentino(seme);
  const [tempi] = p.gare;
  const { giri, lunghezza } = p;
  const base = { tipo: 'progetto' as const, terreno: 'montagna' as const, mostraOutput: true, risposta: 'codice' as const };
  const senzaInput = (n: 1 | 2, consegna: string, soluzione: string): Esercizio => ({
    ...base,
    consegna,
    outputAtteso: righePatentino(p, tempi, n),
    soluzione,
    regola: regolaPatentino(n, lunghezza),
  });
  const conInput = (n: 3 | 4 | 5, consegna: string, soluzione: string): Esercizio => {
    const prove = provePatentino(p, n);
    return { ...base, consegna, outputAtteso: prove[0].output, prove, soluzione, regola: regolaPatentino(n, lunghezza) };
  };
  const ciclo = `for i in range(1, ${giri + 1}):`;
  const domanda = '    tempo = int(input(f"Tempo del giro {i}? "))';
  const riga = `    print(f"Giro {i}: {i * ${lunghezza}} km in {tempo} min")`;
  const r1 = `${ciclo}\n    print(f"Giro {i}")`;
  const r2 = `${ciclo}\n    print(f"Giro {i}: {i * ${lunghezza}} km")`;
  const r3 = `${ciclo}\n${domanda}\n${riga}`;
  const r4 = `totale = 0\n${ciclo}\n${domanda}\n    totale += tempo\n${riga}\nprint(f"Tempo totale: {totale} min")`;
  const r5 = `totale = 0\nminimo = 1000\n${ciclo}\n${domanda}\n    totale += tempo\n    if tempo < minimo:\n        minimo = tempo\n        quale = i\n${riga}\nprint(f"Tempo totale: {totale} min")\nprint(f"Giro più veloce: il {quale} ({minimo} min)")`;
  const totale = tempi.reduce((a, b) => a + b, 0);
  const minimo = Math.min(...tempi);
  return [
    senzaInput(1, `**Fase 1 — i giri.** La gara è di ${giri} giri. Il tabellone comincia con una riga per giro: \`Giro 1\`, \`Giro 2\`… fino a \`Giro ${giri}\`. Un ciclo, non ${giri} righe a mano.`, r1),
    senzaInput(
      2,
      `**Fase 2 — i km percorsi.** Il circuito è lungo ${lunghezza} km: dopo il primo giro sono ${lunghezza}, dopo il secondo ${2 * lunghezza}… La riga diventa ` +
        `\`Giro 1: ${lunghezza} km\`, \`Giro 2: ${2 * lunghezza} km\`… I km li calcola il programma dalla variabile del ciclo.`,
      r2,
    ),
    conInput(
      3,
      `**Fase 3 — il tempo di ogni giro.** A ogni giro il programma chiede il tempo (con \`int()\`) a chi tiene il tabellone: la domanda va dentro il ciclo. ` +
        `La riga diventa \`Giro 1: ${lunghezza} km in ${tempi[0]} min\`. Risposte di prova: ${tempi.map((t) => `**${t}**`).join(', ')}.`,
      r3,
    ),
    conInput(
      4,
      `**Fase 4 — il tempo totale.** Dopo i giri, \`Tempo totale: ${totale} min\`: una variabile che parte da 0 prima del ciclo e cresce a ogni giro del tempo risposto, stampata fuori dal ciclo.`,
      r4,
    ),
    conInput(
      5,
      `**Fase 5 — il giro più veloce.** Ultima riga: \`Giro più veloce: il ${tempi.indexOf(minimo) + 1} (${minimo} min)\`. Una variabile parte da un numero grande (per esempio 1000); ` +
        `dentro il ciclo un \`if\` con \`<\` la sostituisce quando il tempo è più basso, e ricorda anche il numero del giro. Deve funzionare per qualunque gara.`,
      r5,
    ),
  ];
}

export function schedaPatentino(seme: number): SchedaCompito {
  const p = parametriPatentino(seme);
  const [tempi] = p.gare;
  return {
    id: 'patentino',
    titolo: 'Il patentino dei cicli for',
    esame: true,
    committente:
      `È l'esame per il patentino dei cicli for: cinque fasi, ognuna su un'idea del percorso. Il tutor è spento, restano gli hint automatici. ` +
      `La squadra fa la gara sociale: ${p.giri} giri di un circuito da ${p.lunghezza} km. Chi tiene il tabellone scrive il tempo di ogni giro, e il programma deve mostrare la gara.`,
    prodotto: 'Il tabellone della gara: una riga per giro con i km percorsi fin lì e il tempo del giro, il tempo totale, il giro più veloce. Deve funzionare per qualunque gara: i tempi li chiede con input().',
    dati: [`Giri: ${p.giri}`, `Circuito: ${p.lunghezza} km a giro`, `Risposte di prova (i tempi): ${tempi.join(', ')} min`],
    outputFinale: righePatentino(p, tempi, 5),
  };
}
