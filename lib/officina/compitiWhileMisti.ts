/* I compiti della sezione «Il ciclo while» che **mescolano** le famiglie (PERCORSO.md §22):
 *
 *   7. il distributore      — accumulare da `input()` finché basta (quantità + risposte): le monete finché coprono il prezzo
 *   8. la cassa con il menu — la sentinella con l'`if`/`elif` dentro: riparte dalla cassa del bar già scritta
 *
 * Stessa forma degli altri compiti: parametri dal seme, cinque fasi che aggiungono ogni
 * volta un pezzo, la scheda con l'output finale per intero. Modulo puro. */
import { generatore, type Esercizio, type Prova } from '../giro/esercizi';
import type { SchedaCompito } from './compiti';

const base = { tipo: 'progetto' as const, mostraOutput: true, risposta: 'codice' as const };
const somma = (n: number[]) => n.reduce((a, b) => a + b, 0);

/* ------------------------------------------------------------------- 7. il distributore */

const SNACK = [
  { nome: 'le patatine', prezzo: 120 },
  { nome: 'la merendina', prezzo: 80 },
  { nome: 'il succo', prezzo: 100 },
  { nome: 'i cracker', prezzo: 150 },
  { nome: 'il cioccolato', prezzo: 180 },
] as const;

interface ParametriDistributore {
  snack: (typeof SNACK)[number];
  /** Le monete delle prove, in centesimi: la sequenza mostrata, una moneta sola da 2 €, e le monete che arrivano giuste. */
  monete: [number[], number[], number[]];
}

/** Le monete piccole che coprono il prezzo esatto: 50, poi 20, poi 10 (i prezzi sono multipli di 10). */
function moneteGiuste(prezzo: number): number[] {
  const out: number[] = [];
  let resta = prezzo;
  for (const m of [50, 20, 10]) {
    while (resta >= m) {
      out.push(m);
      resta -= m;
    }
  }
  return out;
}

function parametriDistributore(seme: number): ParametriDistributore {
  const rnd = generatore(seme);
  const snack = SNACK[Math.floor(rnd() * SNACK.length)];
  // La sequenza mostrata: forse una da 20 all'inizio, poi monete da 50 e da 1 € finché bastano (al massimo 5).
  const mostrata: number[] = rnd() < 0.5 ? [20] : [];
  while (somma(mostrata) < snack.prezzo) mostrata.push(rnd() < 0.5 ? 50 : 100);
  return { snack, monete: [mostrata, [200], moneteGiuste(snack.prezzo)] };
}

function righeDistributore(p: ParametriDistributore, monete: number[], fase: 1 | 2 | 3 | 4 | 5): string[] {
  const righe: string[] = [];
  let versato = 0;
  for (const m of monete) {
    versato += m;
    righe.push(`Versati ${versato} centesimi`);
  }
  const resto = versato - p.snack.prezzo;
  if (fase >= 2) righe.push(`Ecco ${p.snack.nome}!`);
  if (fase >= 4) righe.push(`Monete inserite: ${monete.length}`);
  if (fase === 5) righe.push(resto === 0 ? 'Nessun resto' : `Resto: ${resto} centesimi`);
  else if (fase >= 3) righe.push(`Resto: ${resto} centesimi`);
  return righe;
}

const REGOLA_DISTRIBUTORE =
  'Le monete le legge un ciclo `while` con `input()` dentro che gira finché il versato è sotto il prezzo: non si sa prima quante monete arriveranno (non vale un `for`), ' +
  'e i valori delle monete non vanno scritti nel programma. Il versato lo accumula una variabile che parte da 0; le monete le conta una variabile; le righe dopo il ciclo usano le variabili.';

export function fasiDistributore(seme: number): Esercizio[] {
  const p = parametriDistributore(seme);
  const { prezzo, nome } = p.snack;
  const [mostrate] = p.monete;
  const b = { ...base, terreno: 'pianura' as const };
  const fase = (n: 1 | 2 | 3 | 4 | 5, consegna: string, soluzione: string, regola = REGOLA_DISTRIBUTORE): Esercizio => {
    const prove: Prova[] = p.monete.map((monete) => ({ risposte: monete.map(String), output: righeDistributore(p, monete, n) }));
    return { ...b, consegna, outputAtteso: prove[0].output, prove, soluzione, regola };
  };
  const r1 = `versato = 0\nwhile versato < ${prezzo}:\n    moneta = int(input("Moneta? "))\n    versato += moneta\n    print(f"Versati {versato} centesimi")`;
  const r2 = `${r1}\nprint("Ecco ${nome}!")`;
  const r3 = `${r2}\nprint(f"Resto: {versato - ${prezzo}} centesimi")`;
  const r4 = `versato = 0\nmonete = 0\nwhile versato < ${prezzo}:\n    moneta = int(input("Moneta? "))\n    versato += moneta\n    monete += 1\n    print(f"Versati {versato} centesimi")\nprint("Ecco ${nome}!")\nprint(f"Monete inserite: {monete}")\nprint(f"Resto: {versato - ${prezzo}} centesimi")`;
  const r5 = r4.replace(`print(f"Resto: {versato - ${prezzo}} centesimi")`, `if versato == ${prezzo}:\n    print("Nessun resto")\nelse:\n    print(f"Resto: {versato - ${prezzo}} centesimi")`);
  const resto = somma(mostrate) - prezzo;
  return [
    fase(
      1,
      `**Fase 1 — finché basta.** ${nome[0].toUpperCase() + nome.slice(1)} costa ${prezzo} centesimi. Il distributore chiede una moneta alla volta (con \`input()\` e \`int()\` **dentro** il ciclo) ` +
        `e la aggiunge a \`versato\`, che parte da 0; dopo ogni moneta stampa \`Versati X centesimi\`. Il \`while\` gira finché \`versato\` è sotto ${prezzo}: ` +
        `quante monete servono dipende da quali arrivano. Monete di prova: ${mostrate.map((m) => `**${m}**`).join(', ')}.`,
      r1,
    ),
    fase(2, `**Fase 2 — il prodotto.** Quando il ciclo finisce i soldi bastano: stampa \`Ecco ${nome}!\` dopo il ciclo.`, r2),
    fase(
      3,
      `**Fase 3 — il resto.** Poi \`Resto: ${resto} centesimi\`: la differenza fra il versato e il prezzo, calcolata dal programma${resto === 0 ? ' (con le monete di prova è 0, ma con altre no)' : ''}.`,
      r3,
    ),
    fase(
      4,
      `**Fase 4 — quante monete.** Una variabile conta le monete, una per giro. Fra il prodotto e il resto stampa \`Monete inserite: ${mostrate.length}\`.`,
      r4,
    ),
    fase(
      5,
      `**Fase 5 — niente resto.** Al posto della riga del resto, un \`if\`: se il versato è esattamente ${prezzo} stampa \`Nessun resto\`, altrimenti la riga del resto di prima.`,
      r5,
      REGOLA_DISTRIBUTORE + ' La riga del resto la sceglie un `if` fuori dal ciclo.',
    ),
  ];
}

export function schedaDistributore(seme: number): SchedaCompito {
  const p = parametriDistributore(seme);
  const [mostrate] = p.monete;
  return {
    id: 'distributore',
    titolo: 'Il distributore',
    committente:
      `Il distributore automatico della scuola: ${p.snack.nome} costa ${p.snack.prezzo} centesimi, si inseriscono monete una alla volta finché i soldi bastano, ` +
      `poi esce il prodotto con il resto. Quante monete servono non si sa: dipende da quali arrivano. Il programma le legge finché non basta.`,
    prodotto: 'Il display del distributore: il versato dopo ogni moneta, il prodotto, quante monete, il resto (o «Nessun resto»). Le monete le chiede con input().',
    dati: [`Prezzo: ${p.snack.prezzo} centesimi`, `Monete di prova: ${mostrate.join(' · ')}`],
    outputFinale: righeDistributore(p, mostrate, 5),
  };
}

/* ------------------------------------------------------------- 8. la cassa con il menu */

/* Riparte dalla cassa del bar (compito 5): al posto del prezzo si digita il codice del
 * prodotto, e dentro il ciclo un `if`/`elif`/`else` decide che cosa è e quanto costa. */

const PREZZI_CORNETTO = [1, 2] as const;
const PREZZI_PANINO = [3, 4, 5] as const;
const CAFFE = 1;
const CODICE_SCONOSCIUTO = [7, 8, 9] as const;

interface ParametriMenu {
  cornetto: number;
  panino: number;
  /** Le scelte base delle tre prove (solo caffè e cornetti), e i codici sbagliati di ciascuna. */
  scelte: [number[], number[], number[]];
  sbagliati: [number, number, number];
}

function parametriMenu(seme: number): ParametriMenu {
  const rnd = generatore(seme);
  const cornetto = PREZZI_CORNETTO[Math.floor(rnd() * PREZZI_CORNETTO.length)];
  const panino = PREZZI_PANINO[Math.floor(rnd() * PREZZI_PANINO.length)];
  // La prova mostrata ha sempre due caffè (l'offerta della fase 5) e un cornetto, in ordine casuale.
  const mostrata = rnd() < 0.5 ? [1, 2, 1] : [1, 1, 2];
  const sbagliato = () => CODICE_SCONOSCIUTO[Math.floor(rnd() * CODICE_SCONOSCIUTO.length)];
  return { cornetto, panino, scelte: [mostrata, [2], [1, 1]], sbagliati: [sbagliato(), sbagliato(), sbagliato()] };
}

/** Le scelte di una prova a una certa fase: dalla 2 compare il panino (3), dalla 3 un codice sconosciuto; lo 0 chiude. */
function scelteMenu(p: ParametriMenu, prova: 0 | 1 | 2, fase: 1 | 2 | 3 | 4 | 5): number[] {
  const basi = p.scelte[prova];
  const panini = prova === 2 ? [3, 3] : [3];
  const scelte = fase >= 2 ? [...basi, ...panini] : [...basi];
  if (fase >= 3) scelte.splice(1, 0, p.sbagliati[prova]);
  return scelte;
}

function righeMenu(p: ParametriMenu, scelte: number[], fase: 1 | 2 | 3 | 4 | 5): string[] {
  const righe: string[] = [];
  let totale = 0;
  let caffe = 0;
  for (const s of scelte) {
    if (s === 1) {
      righe.push(`Caffè: ${CAFFE} €`);
      totale += CAFFE;
      caffe++;
    } else if (s === 2) {
      righe.push(`Cornetto: ${p.cornetto} €`);
      totale += p.cornetto;
    } else if (s === 3 && fase >= 2) {
      righe.push(`Panino: ${p.panino} €`);
      totale += p.panino;
    } else if (fase >= 3) {
      righe.push('Codice sconosciuto');
    }
  }
  if (fase >= 4) righe.push(`Caffè venduti: ${caffe}`);
  righe.push(`Totale: ${totale} €`);
  if (fase === 5 && caffe >= 2) righe.push(`Hai preso ${caffe} caffè: il prossimo è gratis!`);
  return righe;
}

const REGOLA_MENU =
  'Le scelte le legge un ciclo `while` con `input()` dentro, che si ferma allo 0 (la sentinella): la domanda sta prima del ciclo e si ripete in fondo al corpo, ' +
  'e non si sa prima quante scelte arriveranno (non vale un `for`). Dentro al ciclo un `if`/`elif` decide il prodotto dal codice e fa crescere il totale del prezzo giusto: ' +
  'non valgono scelte o totali scritti nel programma. Il totale e il numero dei caffè li tengono variabili che partono da 0.';

export function fasiMenu(seme: number): Esercizio[] {
  const p = parametriMenu(seme);
  const { cornetto, panino } = p;
  const b = { ...base, terreno: 'collina' as const };
  const fase = (n: 1 | 2 | 3 | 4 | 5, consegna: string, soluzione: string, extra: Partial<Esercizio> = {}): Esercizio => {
    const prove: Prova[] = ([0, 1, 2] as const).map((i) => {
      const scelte = scelteMenu(p, i, n);
      return { risposte: [...scelte.map(String), '0'], output: righeMenu(p, scelte, n) };
    });
    return { ...b, consegna, outputAtteso: prove[0].output, prove, soluzione, regola: REGOLA_MENU, ...extra };
  };
  const domandaPrezzo = 'prezzo = int(input("Prezzo? "))';
  const cassa = `totale = 0\n${domandaPrezzo}\nwhile prezzo != 0:\n    print(f"Articolo: {prezzo} €")\n    totale += prezzo\n    ${domandaPrezzo}\nprint(f"Totale: {totale} €")`;
  const domanda = 'scelta = int(input("Scelta? "))';
  const rami2 = `    if scelta == 1:\n        print("Caffè: ${CAFFE} €")\n        totale += ${CAFFE}\n    elif scelta == 2:\n        print("Cornetto: ${cornetto} €")\n        totale += ${cornetto}`;
  const rami3 = `${rami2}\n    elif scelta == 3:\n        print("Panino: ${panino} €")\n        totale += ${panino}`;
  const rami4 = `${rami3}\n    else:\n        print("Codice sconosciuto")`;
  const programma = (rami: string, caffe = false, offerta = false) =>
    `totale = 0\n${caffe ? 'caffe = 0\n' : ''}${domanda}\nwhile scelta != 0:\n${caffe ? rami.replace(`        totale += ${CAFFE}`, `        totale += ${CAFFE}\n        caffe += 1`) : rami}\n    ${domanda}\n` +
    `${caffe ? 'print(f"Caffè venduti: {caffe}")\n' : ''}print(f"Totale: {totale} €")${offerta ? '\nif caffe >= 2:\n    print(f"Hai preso {caffe} caffè: il prossimo è gratis!")' : ''}`;
  const mostrate = scelteMenu(p, 0, 3);
  return [
    fase(
      1,
      `**Fase 1 — il codice al posto del prezzo.** La cassa riparte da quella del bar, già scritta. Ora il barista digita il **codice** del prodotto: ` +
        `**1** è il caffè (${CAFFE} €), **2** il cornetto (${cornetto} €), **0** chiude. Dentro il ciclo un \`if\`/\`elif\` sul codice stampa \`Caffè: ${CAFFE} €\` oppure \`Cornetto: ${cornetto} €\` ` +
        `e fa crescere il totale del prezzo giusto. Chiama la variabile \`scelta\`. Scelte di prova: ${scelteMenu(p, 0, 1).map((s) => `**${s}**`).join(', ')}, poi **0**.`,
      programma(rami2),
      { codiceIniziale: cassa },
    ),
    fase(2, `**Fase 2 — il panino.** Un terzo prodotto: codice **3**, il panino, ${panino} €. Un altro \`elif\`.`, programma(rami3)),
    fase(
      3,
      `**Fase 3 — codice sconosciuto.** Se il codice non è 1, 2 o 3 (e non è 0), la cassa stampa \`Codice sconosciuto\` e non aggiunge niente: un \`else\` in fondo. ` +
        `Scelte di prova: ${mostrate.map((s) => `**${s}**`).join(', ')}, poi **0**.`,
      programma(rami4),
    ),
    fase(
      4,
      `**Fase 4 — i caffè.** Una variabile conta solo i caffè: cresce di 1 nel ramo del codice 1. Prima del totale stampa \`Caffè venduti: ${righeMenu(p, mostrate, 4).find((r) => r.startsWith('Caffè venduti'))!.split(': ')[1]}\`.`,
      programma(rami4, true),
    ),
    fase(
      5,
      `**Fase 5 — l'offerta.** Dopo il totale, un \`if\`: se i caffè sono almeno 2 stampa \`Hai preso N caffè: il prossimo è gratis!\` con il numero dalla variabile; altrimenti niente.`,
      programma(rami4, true, true),
      { regola: REGOLA_MENU + " L'offerta la decide un `if` fuori dal ciclo sul numero dei caffè." },
    ),
  ];
}

export function schedaMenu(seme: number): SchedaCompito {
  const p = parametriMenu(seme);
  const mostrate = scelteMenu(p, 0, 5);
  return {
    id: 'menu',
    titolo: 'La cassa con il menu',
    committente:
      `Il bar della scuola vuole la cassa con il menu: il barista digita il codice del prodotto (1 caffè ${CAFFE} €, 2 cornetto ${p.cornetto} €, 3 panino ${p.panino} €) ` +
      `e 0 per chiudere. La cassa riconosce il prodotto, somma il prezzo giusto, segnala i codici sbagliati, conta i caffè per l'offerta. Riparte dalla cassa del bar.`,
    prodotto: "Lo scontrino con i prodotti riconosciuti dal codice, il totale, quanti caffè, l'offerta. Si ferma allo 0: la sentinella con l'if dentro.",
    dati: [`Menu: 1 caffè ${CAFFE} € · 2 cornetto ${p.cornetto} € · 3 panino ${p.panino} €`, `Scelte di prova: ${mostrate.join(' · ')} (poi 0)`],
    outputFinale: righeMenu(p, mostrate, 5),
  };
}
