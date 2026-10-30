/* I quattro compiti con cui comincia l'Officina (PERCORSO.md §15): un'idea nuova ciascuno,
 * a gradini piccoli, prima del salvadanaio che le usa tutte insieme.
 *
 *   1. il cartello della festa  — il `for` ripete; `range(n)`; i `print` fuori dal ciclo
 *   2. la classifica della gara — la variabile del ciclo; `range(1, n + 1)`; testo e numero
 *   3. il conto alla rovescia   — il passo, anche negativo
 *   4. la scala del garage      — la variabile in un calcolo; `"#" * i`
 *
 * Stessa forma degli altri compiti: parametri dal seme, cinque fasi che aggiungono ogni
 * volta un pezzo, la scheda con l'output finale per intero. Modulo puro. */
import { REGOLE, conNote, generatore, type Esercizio } from '../giro/esercizi';
import type { SchedaCompito } from './compiti';

const base = { tipo: 'progetto' as const, mostraOutput: true, risposta: 'codice' as const };

/* ------------------------------------------------------- 1. il cartello della festa */

const EVENTI = ['Festa di fine anno', 'Torneo di calcetto', 'Gita al lago', 'Mercatino di Natale', 'Giornata dello sport', 'Spettacolo di teatro'] as const;
const DECORAZIONE = '* * * * *';

interface ParametriCartello {
  frase: string;
  volte: number;
}

function parametriCartello(seme: number): ParametriCartello {
  const rnd = generatore(seme);
  const frase = EVENTI[Math.floor(rnd() * EVENTI.length)];
  // 4 o 5 volte: con la decorazione in mezzo e la cornice si arriva a 12 righe al massimo.
  const volte = 4 + Math.floor(rnd() * 2);
  return { frase, volte };
}

function righeCartello(p: ParametriCartello, fase: 1 | 2 | 3 | 4 | 5): string[] {
  const cornice = '='.repeat(p.frase.length);
  const n = fase === 1 ? 3 : p.volte;
  const righe: string[] = [];
  if (fase >= 3) righe.push(cornice);
  for (let i = 0; i < n; i++) {
    righe.push(p.frase);
    if (fase === 5) righe.push(DECORAZIONE);
  }
  if (fase >= 4) righe.push(cornice);
  return righe;
}

const REGOLA_CARTELLO =
  'Le righe con la frase le stampa un ciclo `for` che gira una volta per riga: non valgono le righe scritte a mano una per una, ' +
  'né un ciclo da un giro solo con un `print` per riga. La cornice (una riga sopra e una sotto) sono `print` fuori dal ciclo, e va bene così.';

export function fasiCartello(seme: number): Esercizio[] {
  const p = parametriCartello(seme);
  const { frase, volte } = p;
  const L = frase.length;
  const b = { ...base, terreno: 'pianura' as const };
  return conNote([
    {
      ...b,
      consegna: `**Fase 1 — ripetere.** Il cartello ripete la frase. Scrivi un ciclo che stampa \`${frase}\` 3 volte.`,
      outputAtteso: righeCartello(p, 1),
      soluzione: `for i in range(3):\n    print("${frase}")`,
      regola: REGOLE.ciclo,
    },
    {
      ...b,
      consegna: `**Fase 2 — quante volte.** Tre sono poche: il cartello la vuole ${volte} volte. Cambia solo il numero dentro \`range\`.`,
      outputAtteso: righeCartello(p, 2),
      soluzione: `for i in range(${volte}):\n    print("${frase}")`,
      regola: REGOLE.ciclo,
    },
    {
      ...b,
      consegna:
        `**Fase 3 — la cornice sopra.** Prima delle frasi ci vuole una riga di \`=\` lunga quanto la frase: ${L} segni. ` +
        `Ricorda che \`"=" * ${L}\` fa una riga di ${L} \`=\`. Il \`print\` della cornice va **prima** del ciclo, non dentro.`,
      outputAtteso: righeCartello(p, 3),
      soluzione: `print("=" * ${L})\nfor i in range(${volte}):\n    print("${frase}")`,
      regola: REGOLA_CARTELLO,
    },
    {
      ...b,
      consegna: `**Fase 4 — la cornice sotto.** La stessa riga di \`=\` anche in fondo, **dopo** il ciclo.`,
      outputAtteso: righeCartello(p, 4),
      soluzione: `print("=" * ${L})\nfor i in range(${volte}):\n    print("${frase}")\nprint("=" * ${L})`,
      regola: REGOLA_CARTELLO,
    },
    {
      ...b,
      consegna:
        `**Fase 5 — la decorazione.** Sotto ogni frase ci vuole una riga \`${DECORAZIONE}\`. ` +
        `Dentro il ciclo ci vanno due \`print\`: la frase e la decorazione. Il ciclo gira sempre ${volte} volte.`,
      outputAtteso: righeCartello(p, 5),
      soluzione: `print("=" * ${L})\nfor i in range(${volte}):\n    print("${frase}")\n    print("${DECORAZIONE}")\nprint("=" * ${L})`,
      regola:
        `Dentro il ciclo ci sono due \`print\` (la frase e la decorazione) e il ciclo gira ${volte} volte: non valgono le righe scritte a mano ` +
        'una per una, né un ciclo da un giro solo con dentro tutte le righe. La cornice sopra e sotto sono `print` fuori dal ciclo, e va bene così.',
    },
  ], noteCartello(p));
}

export function schedaCartello(seme: number): SchedaCompito {
  const p = parametriCartello(seme);
  return {
    id: 'cartello',
    titolo: 'Il cartello della festa',
    committente:
      `La classe organizza «${p.frase}» e servono i cartelli per i corridoi: la stessa frase ripetuta ${p.volte} volte, ` +
      `con una cornice sopra e sotto e una riga di stelle fra una frase e l'altra. Il programma stampa il cartello.`,
    prodotto: 'Il cartello: la cornice, la frase ripetuta con la decorazione in mezzo, la cornice.',
    dati: [`Frase: ${p.frase}`, `Ripetizioni: ${p.volte}`, `Cornice: ${p.frase.length} segni =`],
    outputFinale: righeCartello(p, 5),
  };
}

/* ------------------------------------------------------ 2. la classifica della gara */

const GARE_CLASSIFICA = ['la corsa campestre', 'il torneo di scacchi', 'la gara di nuoto', 'la staffetta', 'il torneo di ping pong'] as const;

interface ParametriClassifica {
  gara: string;
  iscritti: number;
}

function parametriClassifica(seme: number): ParametriClassifica {
  const rnd = generatore(seme);
  const gara = GARE_CLASSIFICA[Math.floor(rnd() * GARE_CLASSIFICA.length)];
  // Da 5 a 8 posti: con intestazione e riga finale al massimo 10 righe.
  const iscritti = 5 + Math.floor(rnd() * 4);
  return { gara, iscritti };
}

function righeClassifica(p: ParametriClassifica, fase: 1 | 2 | 3 | 4 | 5): string[] {
  const righe: string[] = [];
  if (fase >= 4) righe.push(`Classifica: ${p.gara}`);
  for (let i = 1; i <= p.iscritti; i++) {
    if (fase === 1) righe.push(String(i));
    else if (fase === 2) righe.push(`Posto ${i}`);
    else righe.push(`${i}° posto`);
  }
  if (fase === 5) righe.push(`Iscritti: ${p.iscritti}`);
  return righe;
}

export function fasiClassifica(seme: number): Esercizio[] {
  const p = parametriClassifica(seme);
  const { gara, iscritti } = p;
  const b = { ...base, terreno: 'pianura' as const };
  const ciclo = `for i in range(1, ${iscritti + 1}):`;
  return conNote([
    {
      ...b,
      consegna:
        `**Fase 1 — i posti.** La classifica ha ${iscritti} posti. Scrivi un ciclo che stampa i numeri da 1 a ${iscritti}, uno per riga: ` +
        `la variabile del ciclo vale ogni volta un numero diverso, e \`range\` deve partire da 1.`,
      outputAtteso: righeClassifica(p, 1),
      soluzione: `${ciclo}\n    print(i)`,
      regola: REGOLE.cicloVariabile,
    },
    {
      ...b,
      consegna: `**Fase 2 — la parola.** Davanti a ogni numero ci vuole \`Posto\`, con uno spazio: \`Posto 1\`, \`Posto 2\`… Il numero resta quello della variabile.`,
      outputAtteso: righeClassifica(p, 2),
      soluzione: `${ciclo}\n    print("Posto", i)`,
      regola: REGOLE.cicloVariabile,
    },
    {
      ...b,
      consegna:
        `**Fase 3 — il numero attaccato.** Si legge meglio così: \`1° posto\`, \`2° posto\`… Il \`°\` è attaccato al numero senza spazio: ` +
        `ci vuole una f-string, con la variabile fra graffe.`,
      outputAtteso: righeClassifica(p, 3),
      soluzione: `${ciclo}\n    print(f"{i}° posto")`,
      regola: REGOLE.cicloVariabile,
    },
    {
      ...b,
      consegna: `**Fase 4 — l'intestazione.** Prima della classifica una riga sola: \`Classifica: ${gara}\`. È un \`print\` **prima** del ciclo.`,
      outputAtteso: righeClassifica(p, 4),
      soluzione: `print("Classifica: ${gara}")\n${ciclo}\n    print(f"{i}° posto")`,
      regola: REGOLE.cicloVariabile + " L'intestazione è un `print` prima del ciclo, e va bene così.",
    },
    {
      ...b,
      consegna:
        `**Fase 5 — gli iscritti.** In fondo, dopo il ciclo, la riga \`Iscritti: ${iscritti}\`. Metti il numero degli iscritti in una variabile ` +
        `\`iscritti\` **prima** del ciclo e usala due volte: dentro \`range\` e nella riga finale (con una f-string). Così, se cambia, cambia in un posto solo.`,
      outputAtteso: righeClassifica(p, 5),
      soluzione: `iscritti = ${iscritti}\nprint("Classifica: ${gara}")\nfor i in range(1, iscritti + 1):\n    print(f"{i}° posto")\nprint(f"Iscritti: {iscritti}")`,
      regola:
        REGOLE.cicloVariabile +
        ' Il numero degli iscritti sta in una variabile usata sia dentro `range` sia nella riga finale: non vale scriverlo a mano nella riga finale.',
    },
  ], noteClassifica(p));
}

export function schedaClassifica(seme: number): SchedaCompito {
  const p = parametriClassifica(seme);
  return {
    id: 'classifica',
    titolo: 'La classifica della gara',
    committente:
      `Il professore di educazione fisica vuole il tabellone per ${p.gara}: i ${p.iscritti} posti già numerati, pronti da riempire ` +
      `con i nomi a penna, con l'intestazione e il numero degli iscritti in fondo.`,
    prodotto: "Il tabellone: l'intestazione, i posti numerati (1° posto, 2° posto…), gli iscritti.",
    dati: [`Gara: ${p.gara}`, `Iscritti: ${p.iscritti}`],
    outputFinale: righeClassifica(p, 5),
  };
}

/* -------------------------------------------------- 3. il conto alla rovescia del lancio */

const RAZZI = ['Aurora', 'Falco', 'Cometa', 'Vega', 'Saturno'] as const;
const PARTENZE_LANCIO = [6, 8, 10] as const;

interface ParametriLancio {
  nome: string;
  da: number;
}

function parametriLancio(seme: number): ParametriLancio {
  const rnd = generatore(seme);
  const nome = RAZZI[Math.floor(rnd() * RAZZI.length)];
  const da = PARTENZE_LANCIO[Math.floor(rnd() * PARTENZE_LANCIO.length)];
  return { nome, da };
}

function righeLancio(p: ParametriLancio, fase: 1 | 2 | 3 | 4 | 5): string[] {
  const righe: string[] = [];
  if (fase === 5) righe.push(`Lancio del razzo ${p.nome}`);
  const passo = fase >= 4 ? 2 : 1;
  for (let i = p.da; i >= 1; i -= passo) righe.push(fase >= 3 ? `Meno ${i}` : String(i));
  if (fase >= 2) righe.push('Partenza!');
  return righe;
}

const REGOLA_LANCIO =
  'I numeri del conto alla rovescia li produce un ciclo `for` con un `range` che va all\'indietro (passo negativo): ' +
  'non valgono i numeri scritti a mano uno per uno, né un ciclo da un giro solo con un `print` per riga. ' +
  'Le righe prima e dopo il conto («Partenza!», l\'intestazione) sono `print` fuori dal ciclo, e va bene così.';

export function fasiLancio(seme: number): Esercizio[] {
  const p = parametriLancio(seme);
  const { nome, da } = p;
  const b = { ...base, terreno: 'collina' as const };
  return conNote([
    {
      ...b,
      consegna:
        `**Fase 1 — all'indietro.** Il conto alla rovescia parte da ${da} e arriva a 1. Un \`range\` può andare all'indietro: ` +
        `il terzo numero è il passo, e qui deve essere \`-1\`. Attento al secondo numero: dove si ferma il conto?`,
      outputAtteso: righeLancio(p, 1),
      soluzione: `for i in range(${da}, 0, -1):\n    print(i)`,
      regola: REGOLA_LANCIO,
    },
    {
      ...b,
      consegna: `**Fase 2 — il via.** Finito il conto, una riga sola: \`Partenza!\`. Va **dopo** il ciclo.`,
      outputAtteso: righeLancio(p, 2),
      soluzione: `for i in range(${da}, 0, -1):\n    print(i)\nprint("Partenza!")`,
      regola: REGOLA_LANCIO,
    },
    {
      ...b,
      consegna: `**Fase 3 — a voce.** Il conto si legge \`Meno ${da}\`, \`Meno ${da - 1}\`… \`Meno 1\`: la parola e poi il numero della variabile.`,
      outputAtteso: righeLancio(p, 3),
      soluzione: `for i in range(${da}, 0, -1):\n    print("Meno", i)\nprint("Partenza!")`,
      regola: REGOLA_LANCIO,
    },
    {
      ...b,
      consegna:
        `**Fase 4 — due alla volta.** Il razzo ha fretta: si conta di due in due, \`Meno ${da}\`, \`Meno ${da - 2}\`… fino a \`Meno 2\`. ` +
        `Cambia solo il passo.`,
      outputAtteso: righeLancio(p, 4),
      soluzione: `for i in range(${da}, 0, -2):\n    print("Meno", i)\nprint("Partenza!")`,
      regola: REGOLA_LANCIO,
    },
    {
      ...b,
      consegna: `**Fase 5 — l'annuncio.** Prima del conto, la riga \`Lancio del razzo ${nome}\`: un \`print\` prima del ciclo.`,
      outputAtteso: righeLancio(p, 5),
      soluzione: `print("Lancio del razzo ${nome}")\nfor i in range(${da}, 0, -2):\n    print("Meno", i)\nprint("Partenza!")`,
      regola: REGOLA_LANCIO,
    },
  ], noteLancio(p));
}

export function schedaLancio(seme: number): SchedaCompito {
  const p = parametriLancio(seme);
  return {
    id: 'lancio',
    titolo: 'Il conto alla rovescia del lancio',
    committente:
      `Il club di modellismo lancia il razzo ${p.nome} e vuole lo schermo del conto alla rovescia: l'annuncio, il conto da ${p.da} ` +
      `di due in due, e il via. Il programma stampa quello che lo speaker legge.`,
    prodotto: "Lo schermo del lancio: l'annuncio, il conto alla rovescia di due in due, «Partenza!».",
    dati: [`Razzo: ${p.nome}`, `Il conto parte da: ${p.da}`],
    outputFinale: righeLancio(p, 5),
  };
}

/* ------------------------------------------------------------ 4. la scala del garage */

const ALTEZZE_GRADINO = [10, 15, 20] as const;

interface ParametriScala {
  gradini: number;
  altezza: number;
}

function parametriScala(seme: number): ParametriScala {
  const rnd = generatore(seme);
  // Da 4 a 7 gradini: la scala si vede intera, con intestazione e riga finale al massimo 9 righe.
  const gradini = 4 + Math.floor(rnd() * 4);
  const altezza = ALTEZZE_GRADINO[Math.floor(rnd() * ALTEZZE_GRADINO.length)];
  return { gradini, altezza };
}

function righeScala(p: ParametriScala, fase: 1 | 2 | 3 | 4 | 5): string[] {
  const righe: string[] = [];
  if (fase >= 4) righe.push(`Scala del garage: ${p.gradini} gradini da ${p.altezza} cm`);
  for (let i = 1; i <= p.gradini; i++) {
    const scalino = '#'.repeat(i);
    if (fase === 1) righe.push(scalino);
    else if (fase === 2) righe.push(`${scalino} ${i * p.altezza} cm`);
    else righe.push(`Gradino ${i}: ${scalino} ${i * p.altezza} cm`);
  }
  if (fase === 5) righe.push(`Altezza totale: ${p.gradini * p.altezza} cm`);
  return righe;
}

const REGOLA_SCALA =
  'Le righe le stampa un ciclo `for` che gira una volta per gradino, e il gradino si allunga grazie alla variabile del ciclo (`"#" * i`): ' +
  'non valgono le righe scritte a mano una per una, né un ciclo da un giro solo con un `print` per riga.';
const REGOLA_SCALA_CM = REGOLA_SCALA + ' I centimetri li calcola la variabile del ciclo (il numero del gradino per l\'altezza): non vanno scritti a mano.';

export function fasiScala(seme: number): Esercizio[] {
  const p = parametriScala(seme);
  const { gradini, altezza } = p;
  const b = { ...base, terreno: 'collina' as const };
  const ciclo = `for i in range(1, ${gradini + 1}):`;
  return conNote([
    {
      ...b,
      consegna:
        `**Fase 1 — la scala.** Disegna la scala vista di lato: ${gradini} gradini, il primo di un \`#\`, il secondo di due, e così via. ` +
        `Ricorda che \`"#" * 3\` fa \`###\`: la variabile del ciclo decide quanti.`,
      outputAtteso: righeScala(p, 1),
      soluzione: `${ciclo}\n    print("#" * i)`,
      regola: REGOLA_SCALA,
    },
    {
      ...b,
      consegna:
        `**Fase 2 — l'altezza.** Ogni gradino è alto ${altezza} cm: accanto a ogni riga, separata da uno spazio, l'altezza arrivata fin lì ` +
        `(${altezza}, ${altezza * 2}, ${altezza * 3}…) e poi \`cm\`. L'altezza si calcola dalla variabile del ciclo: non scriverla a mano.`,
      outputAtteso: righeScala(p, 2),
      soluzione: `${ciclo}\n    print("#" * i, i * ${altezza}, "cm")`,
      regola: REGOLA_SCALA_CM,
    },
    {
      ...b,
      consegna:
        `**Fase 3 — il numero del gradino.** Ogni riga comincia con \`Gradino 1: \`, \`Gradino 2: \`… Ti conviene una f-string; ` +
        `se il disegno ti dà fastidio dentro le graffe, mettilo prima in una variabile (\`scalino = "#" * i\`).`,
      outputAtteso: righeScala(p, 3),
      soluzione: `${ciclo}\n    scalino = "#" * i\n    print(f"Gradino {i}: {scalino} {i * ${altezza}} cm")`,
      regola: REGOLA_SCALA_CM,
    },
    {
      ...b,
      consegna: `**Fase 4 — l'intestazione.** Prima della scala, la riga \`Scala del garage: ${gradini} gradini da ${altezza} cm\`: un \`print\` prima del ciclo.`,
      outputAtteso: righeScala(p, 4),
      soluzione: `print("Scala del garage: ${gradini} gradini da ${altezza} cm")\n${ciclo}\n    scalino = "#" * i\n    print(f"Gradino {i}: {scalino} {i * ${altezza}} cm")`,
      regola: REGOLA_SCALA_CM + " L'intestazione è un `print` prima del ciclo, e va bene così.",
    },
    {
      ...b,
      consegna:
        `**Fase 5 — l'altezza totale.** Dopo il ciclo, la riga \`Altezza totale: ${gradini * altezza} cm\`. Metti il numero dei gradini in una ` +
        `variabile \`gradini\` prima del ciclo, usala nel \`range\`, e calcola il totale da quella: \`gradini * ${altezza}\`, non il numero a mano.`,
      outputAtteso: righeScala(p, 5),
      soluzione:
        `gradini = ${gradini}\nprint(f"Scala del garage: {gradini} gradini da ${altezza} cm")\nfor i in range(1, gradini + 1):\n` +
        `    scalino = "#" * i\n    print(f"Gradino {i}: {scalino} {i * ${altezza}} cm")\nprint(f"Altezza totale: {gradini * ${altezza}} cm")`,
      regola:
        REGOLA_SCALA_CM +
        " L'altezza totale, dopo il ciclo, si calcola dalla variabile dei gradini (`gradini * altezza`): non vale il numero scritto a mano.",
    },
  ], noteScala(p));
}

export function schedaScala(seme: number): SchedaCompito {
  const p = parametriScala(seme);
  return {
    id: 'scala',
    titolo: 'La scala del garage',
    committente:
      `Tuo zio costruisce una scala di ${p.gradini} gradini per il garage, ognuno alto ${p.altezza} cm, e vuole vederla disegnata ` +
      `di lato con le altezze segnate, per controllare che arrivi all'altezza giusta.`,
    prodotto: "Il disegno della scala: l'intestazione, un gradino per riga con la sua altezza, l'altezza totale.",
    dati: [`Gradini: ${p.gradini}`, `Altezza di un gradino: ${p.altezza} cm`],
    outputFinale: righeScala(p, 5),
  };
}

/* ------------------------------------------------------------ le note per il tutor */

function noteCartello(p: ParametriCartello): string[] {
  return [
    'Primo ciclo in assoluto. La riga del for finisce con i due punti e il print sta sotto, spostato a destra; range(3) gira tre volte. ' +
      'Errore tipico: la frase stampata con tre print scritti a mano (passa il confronto, il giudice la boccia).',
    `Cambia solo il numero dentro range: range(${p.volte}) gira ${p.volte} volte. Chi aggiunge un print o un secondo ciclo sta sbagliando strada.`,
    `La cornice è un print prima del for, senza rientro; "=" ripetuto ${p.frase.length} volte si ottiene moltiplicando il simbolo per il numero. ` +
      'Errore tipico: il print della cornice dentro il ciclo (compare a ogni giro).',
    'Il print di chiusura va dopo il ciclo con il rientro tolto: se resta rientrato la cornice compare dopo ogni frase.',
    'Due print dentro il ciclo, tutti e due con lo stesso rientro. Errori tipici: la decorazione fuori dal ciclo (compare una volta sola) o il ciclo scritto due volte.',
  ];
}

function noteClassifica(p: ParametriClassifica): string[] {
  return [
    `range deve partire da 1 e fermarsi a ${p.iscritti + 1}, perché il secondo numero è escluso. Errori tipici: range(${p.iscritti}) che dà da 0 a ${p.iscritti - 1}, ` +
      `range(1, ${p.iscritti}) che perde l'ultimo posto, il for scritto dentro il print.`,
    'Nel print due pezzi: la parola e la variabile. Con la virgola Python mette lo spazio da solo; con la f-string lo spazio va scritto. ' +
      'Errore tipico: la i dentro le virgolette senza graffe, che stampa la lettera.',
    'Qui serve la f-string: la f davanti alle virgolette e la variabile fra graffe, il simbolo ° attaccato alla graffa chiusa. ' +
      'Errori tipici: manca la f (stampa le graffe così come sono), parentesi tonde al posto delle graffe, uno spazio prima del °.',
    "L'intestazione è un print prima del for e senza rientro: se è dentro il ciclo compare prima di ogni posto.",
    `La variabile iscritti va prima del ciclo; in range ci va iscritti + 1; nella riga finale la variabile fra graffe, non il numero ${p.iscritti} a mano (il giudice lo boccia). ` +
      'Errore tipico: la variabile creata ma non usata, o creata dentro il ciclo.',
  ];
}

function noteLancio(p: ParametriLancio): string[] {
  return [
    `range con tre numeri: ${p.da}, 0 e -1. Il secondo è escluso, quindi 0 per arrivare a 1. Errori tipici: range(${p.da}, 1, -1) che perde l'1; ` +
      'senza il passo negativo il ciclo non gira nemmeno una volta e non stampa niente (l\'hint automatico parla del print dentro il ciclo: in quel caso è fuori strada).',
    'Il print di «Partenza!» va dopo il ciclo, senza rientro: dentro al ciclo comparirebbe dopo ogni numero.',
    'Nel print due pezzi, la parola e la variabile: con la virgola lo spazio è automatico. Errore tipico: la variabile fra virgolette, o la parola e il numero attaccati.',
    `Cambia solo il passo: -2. Da ${p.da} con il passo -2 si arriva a 2, e lo 0 resta escluso come prima. Errore tipico: cambiare anche il secondo numero.`,
    "L'annuncio è un print prima del for, senza rientro: se finisce dentro il ciclo compare prima di ogni numero. Il resto del programma non si tocca.",
  ];
}

function noteScala(p: ParametriScala): string[] {
  return [
    'Il disegno è il cancelletto moltiplicato per la variabile del ciclo: il numero di ripetizioni cambia a ogni giro. ' +
      'Errori tipici: un numero fisso al posto della variabile (tutte le righe uguali), la variabile dentro le virgolette, range che parte da 0 (prima riga vuota).',
    `Dopo il disegno due pezzi nuovi: l'altezza calcolata (la variabile per ${p.altezza}) e la scritta cm; con la virgola gli spazi sono automatici. ` +
      "Errori tipici: l'altezza scritta a mano riga per riga, oppure una variabile dei centimetri aumentata fuori dal ciclo (e mai creata: errore di nome).",
    'La f-string con tre graffe: il numero del gradino, il disegno, il calcolo. La consegna consiglia di mettere il disegno in una variabile prima del print. ' +
      'Errori tipici: virgolette doppie dentro una f-string doppia (l\'interprete dice virgolette non chiuse: suggerisci la variabile d\'appoggio), graffe vuote, la f mancante.',
    "L'intestazione è un print prima del ciclo, senza rientro: se finisce dentro il ciclo compare prima di ogni gradino. Il resto non si tocca.",
    `La variabile gradini prima del ciclo, usata in range(1, gradini + 1) e nel totale (gradini per ${p.altezza}) dopo il ciclo, senza rientro. ` +
      'Errori tipici: il totale scritto a mano (il giudice lo boccia), il print del totale dentro il ciclo, un nome di variabile con lo spazio (Altezza totale), che Python non accetta.',
  ];
}
