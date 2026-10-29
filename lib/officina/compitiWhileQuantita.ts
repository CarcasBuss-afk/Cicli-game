/* I compiti della sezione «Il ciclo while» sulla **quantità** (PERCORSO.md §22): il ciclo
 * gira finché una quantità non arriva a un punto, e quante volte gira non si sa prima.
 * Stessa forma in tre vesti, cambia solo l'aggiornamento:
 *
 *   2. il salvadanaio della bici — accumulare fino a un obiettivo (`+=`): le settimane sono il risultato
 *   4. la batteria del telefono  — consumare fino a zero (`-=`)
 *   6. il pettegolezzo           — crescere moltiplicando (`*=`)
 *
 * Stessa forma degli altri compiti: parametri dal seme, cinque fasi che aggiungono ogni
 * volta un pezzo, la scheda con l'output finale per intero. Modulo puro. */
import { generatore, type Esercizio, type Prova } from '../giro/esercizi';
import type { SchedaCompito } from './compiti';

const base = { tipo: 'progetto' as const, mostraOutput: true, risposta: 'codice' as const };

/* ------------------------------------------------------ 2. il salvadanaio della bici */

/* Il cuore della sezione: il ciclo che non sa quante volte gira. Nel salvadanaio del `for`
 * le settimane erano un dato; qui è dato l'obiettivo, e le settimane sono il risultato. */

const BICI = ['la bici da corsa usata', 'la mountain bike', 'la bici pieghevole', 'la gravel', 'la BMX'] as const;
const QUOTE_BICI = [15, 20, 25, 30, 40] as const;

interface ParametriObiettivo {
  bici: string;
  quota: number;
  obiettivo: number;
}

function parametriObiettivo(seme: number): ParametriObiettivo {
  const rnd = generatore(seme);
  const bici = BICI[Math.floor(rnd() * BICI.length)];
  const quota = QUOTE_BICI[Math.floor(rnd() * QUOTE_BICI.length)];
  // L'obiettivo è un multiplo esatto della quota (5..9 settimane): con la quota di prova si arriva giusti,
  // con le quote nascoste di solito si avanza qualcosa, e l'if della fase 5 si vede da tutte e due le parti.
  const settimane = 5 + Math.floor(rnd() * 5);
  return { bici, quota, obiettivo: quota * settimane };
}

/** Le quote delle prove nascoste: più alta di 5, e doppia. Settimane diverse, mai più di quelle mostrate. */
function quoteNascoste(p: ParametriObiettivo): number[] {
  return [p.quota + 5, p.quota * 2];
}

function righeObiettivo(p: ParametriObiettivo, quota: number, fase: 1 | 2 | 3 | 4 | 5): string[] {
  const righe: string[] = [];
  let totale = 0;
  let settimane = 0;
  while (totale < p.obiettivo) {
    totale += quota;
    settimane++;
    righe.push(fase === 1 ? `${totale} €` : `Settimana ${settimane}: ${totale} €`);
  }
  if (fase >= 3) righe.push(`Ce la fai in ${settimane} settimane`);
  if (fase === 5) righe.push(totale > p.obiettivo ? `Ti avanzano ${totale - p.obiettivo} €` : 'Giusto giusto, niente resto');
  return righe;
}

const REGOLA_OBIETTIVO =
  "Il totale lo tiene una variabile che parte da 0 e cresce della quota a ogni giro di un ciclo `while` che gira finché il totale è sotto l'obiettivo. " +
  'Il numero di settimane non si sa prima e non va scritto nel programma: non vale un `for` con `range`. Le settimane le conta una variabile che cresce di 1 a ogni giro, ' +
  'e le righe dopo il ciclo usano le variabili, non numeri scritti a mano.';

export function fasiObiettivo(seme: number): Esercizio[] {
  const p = parametriObiettivo(seme);
  const { quota, obiettivo } = p;
  const b = { ...base, terreno: 'collina' as const };
  const prove = (fase: 4 | 5): Prova[] => [quota, ...quoteNascoste(p)].map((q) => ({ risposte: [String(q)], output: righeObiettivo(p, q, fase) }));
  const corpo = (q: string) => `while totale < ${obiettivo}:\n    totale += ${q}\n    settimane += 1\n    print(f"Settimana {settimane}: {totale} €")`;
  const r3 = `totale = 0\nsettimane = 0\n${corpo(String(quota))}\nprint(f"Ce la fai in {settimane} settimane")`;
  const r4 = `quota = int(input("Quanto metti via a settimana? "))\ntotale = 0\nsettimane = 0\n${corpo('quota')}\nprint(f"Ce la fai in {settimane} settimane")`;
  const settimane = obiettivo / quota;
  return [
    {
      ...b,
      consegna:
        `**Fase 1 — finché non basta.** Metti via ${quota} € a settimana finché non arrivi a ${obiettivo} €. Quante settimane? Non lo sai, e non serve: ` +
        `una variabile \`totale\` parte da 0 e un \`while\` gira **finché \`totale\` è minore di ${obiettivo}**; dentro, il totale cresce di ${quota} e si stampa ` +
        `\`${quota} €\`, \`${quota * 2} €\`… Il ciclo si ferma da solo quando ci sei.`,
      outputAtteso: righeObiettivo(p, quota, 1),
      soluzione: `totale = 0\nwhile totale < ${obiettivo}:\n    totale += ${quota}\n    print(f"{totale} €")`,
      regola: REGOLA_OBIETTIVO,
    },
    {
      ...b,
      consegna:
        `**Fase 2 — contare le settimane.** Il ciclo non ha una variabile che conta: creala tu. \`settimane\` parte da 0 prima del ciclo e cresce di 1 a ogni giro; ` +
        `la riga diventa \`Settimana 1: ${quota} €\`, \`Settimana 2: ${quota * 2} €\`…`,
      outputAtteso: righeObiettivo(p, quota, 2),
      soluzione: `totale = 0\nsettimane = 0\n${corpo(String(quota))}`,
      regola: REGOLA_OBIETTIVO,
    },
    {
      ...b,
      consegna: `**Fase 3 — la risposta.** Dopo il ciclo, una riga sola: \`Ce la fai in ${settimane} settimane\`. Il numero è nella variabile che conta: non scriverlo a mano.`,
      outputAtteso: righeObiettivo(p, quota, 3),
      soluzione: r3,
      regola: REGOLA_OBIETTIVO,
    },
    {
      ...b,
      consegna:
        `**Fase 4 — quanto metti via lo decidi tu.** La quota la chiede il programma con \`input()\` (e \`int()\`) prima del ciclo, al posto del ${quota} scritto. ` +
        `L'obiettivo resta ${obiettivo} €. Risposta di prova: **${quota}**, ma con una quota diversa le settimane cambiano, e il programma deve funzionare lo stesso.`,
      outputAtteso: righeObiettivo(p, quota, 4),
      prove: prove(4),
      soluzione: r4,
      regola: REGOLA_OBIETTIVO + ' La quota arriva da `input()`: non va scritta nel programma.',
    },
    {
      ...b,
      consegna:
        `**Fase 5 — il resto.** Con alcune quote si supera l'obiettivo. Dopo il ciclo, un \`if\`: se \`totale\` è più grande di ${obiettivo} stampa ` +
        `\`Ti avanzano X €\` (la differenza), altrimenti \`Giusto giusto, niente resto\`. Con la quota di prova ${quota} si arriva giusti.`,
      outputAtteso: righeObiettivo(p, quota, 5),
      prove: prove(5),
      soluzione: `${r4}\nif totale > ${obiettivo}:\n    print(f"Ti avanzano {totale - ${obiettivo}} €")\nelse:\n    print("Giusto giusto, niente resto")`,
      regola: REGOLA_OBIETTIVO + ' La quota arriva da `input()`. La riga del resto la sceglie un `if` fuori dal ciclo sul totale.',
    },
  ];
}

export function schedaObiettivo(seme: number): SchedaCompito {
  const p = parametriObiettivo(seme);
  return {
    id: 'obiettivo',
    titolo: 'Il salvadanaio della bici',
    committente:
      `Vuoi comprarti ${p.bici}, che costa ${p.obiettivo} €, mettendo via ${p.quota} € a settimana. Quante settimane ci vogliono? ` +
      `Nel salvadanaio di prima le settimane erano un dato; qui le scopre il programma: il ciclo gira finché non ci sei.`,
    prodotto: 'Il piano: una riga per settimana con il totale, quante settimane servono e se avanza qualcosa. La quota la chiede con input().',
    dati: [`Prezzo: ${p.obiettivo} €`, `Quota di prova: ${p.quota} € a settimana`],
    outputFinale: righeObiettivo(p, p.quota, 5),
  };
}

/* ---------------------------------------------------------- 4. la batteria del telefono */

/* La stessa forma del salvadanaio in discesa: la quantità che finisce, `-=`. */

const CARICHE = [50, 60, 70, 80, 90] as const;
const CONSUMI = [15, 20, 25] as const;
const SOGLIA_SCARICA = 20;

interface ParametriBatteria {
  carica: number;
  consumo: number;
}

function parametriBatteria(seme: number): ParametriBatteria {
  const rnd = generatore(seme);
  return { carica: CARICHE[Math.floor(rnd() * CARICHE.length)], consumo: CONSUMI[Math.floor(rnd() * CONSUMI.length)] };
}

/** I consumi delle prove nascoste: più alto di 5, e doppio. Meno ore della prova mostrata. */
function consumiNascosti(p: ParametriBatteria): number[] {
  return [p.consumo + 5, p.consumo * 2];
}

function righeBatteria(p: ParametriBatteria, consumo: number, fase: 1 | 2 | 3 | 4 | 5): string[] {
  const righe: string[] = [];
  let carica = p.carica;
  let ore = 0;
  while (carica > 0) {
    ore++;
    righe.push(fase === 1 ? `${carica}%` : `Ora ${ore}: ${carica}%`);
    if (fase === 5 && carica <= SOGLIA_SCARICA) righe.push('Carica il telefono!');
    carica -= consumo;
  }
  if (fase >= 3) righe.push(`Si scarica dopo ${ore} ore`);
  return righe;
}

const REGOLA_BATTERIA =
  'La carica scende del consumo a ogni giro di un ciclo `while` che gira finché è sopra zero (`-=` oppure `carica = carica - consumo`): ' +
  'le ore non si sanno prima e non vanno scritte nel programma (niente `for` con `range`); le conta una variabile che cresce di 1 a ogni giro.';

export function fasiBatteria(seme: number): Esercizio[] {
  const p = parametriBatteria(seme);
  const { carica, consumo } = p;
  const b = { ...base, terreno: 'collina' as const };
  const prove = (fase: 4 | 5): Prova[] => [consumo, ...consumiNascosti(p)].map((k) => ({ risposte: [String(k)], output: righeBatteria(p, k, fase) }));
  const corpo = (k: string) => `carica = ${carica}\nore = 0\nwhile carica > 0:\n    ore += 1\n    print(f"Ora {ore}: {carica}%")\n    carica -= ${k}`;
  const r3 = `${corpo(String(consumo))}\nprint(f"Si scarica dopo {ore} ore")`;
  const r4 = `consumo = int(input("Quanto consuma all'ora? "))\n${corpo('consumo')}\nprint(f"Si scarica dopo {ore} ore")`;
  const ore = righeBatteria(p, consumo, 1).length;
  return [
    {
      ...b,
      consegna:
        `**Fase 1 — in discesa.** Il telefono è al ${carica}% e ogni ora consuma il ${consumo}%. Stampa la carica ora per ora, \`${carica}%\`, \`${carica - consumo}%\`… ` +
        `finché c'è: il \`while\` gira **finché \`carica\` è sopra 0**, e dentro, dopo il \`print\`, la carica scende di ${consumo} (\`-=\`). È il salvadanaio al contrario.`,
      outputAtteso: righeBatteria(p, consumo, 1),
      soluzione: `carica = ${carica}\nwhile carica > 0:\n    print(f"{carica}%")\n    carica -= ${consumo}`,
      regola: REGOLA_BATTERIA,
    },
    {
      ...b,
      consegna: `**Fase 2 — le ore.** Una variabile \`ore\` conta i giri: \`Ora 1: ${carica}%\`, \`Ora 2: ${carica - consumo}%\`… Parte da 0 e cresce di 1 a ogni giro, prima del \`print\`.`,
      outputAtteso: righeBatteria(p, consumo, 2),
      soluzione: corpo(String(consumo)),
      regola: REGOLA_BATTERIA,
    },
    {
      ...b,
      consegna: `**Fase 3 — quanto dura.** Dopo il ciclo: \`Si scarica dopo ${ore} ore\`. Il numero è in \`ore\`.`,
      outputAtteso: righeBatteria(p, consumo, 3),
      soluzione: r3,
      regola: REGOLA_BATTERIA,
    },
    {
      ...b,
      consegna:
        `**Fase 4 — il consumo lo dice l'utente.** Chiedi il consumo all'ora con \`input()\` e \`int()\` prima del ciclo, al posto del ${consumo}. ` +
        `Risposta di prova: **${consumo}**; con un consumo diverso le ore cambiano, e il programma deve funzionare lo stesso.`,
      outputAtteso: righeBatteria(p, consumo, 4),
      prove: prove(4),
      soluzione: r4,
      regola: REGOLA_BATTERIA + ' Il consumo arriva da `input()`: non va scritto nel programma.',
    },
    {
      ...b,
      consegna:
        `**Fase 5 — l'avviso.** Dentro il ciclo, dopo la riga dell'ora, un \`if\`: se \`carica\` è ${SOGLIA_SCARICA} o meno stampa \`Carica il telefono!\`. ` +
        `Compare solo nelle ore in cui la batteria è bassa.`,
      outputAtteso: righeBatteria(p, consumo, 5),
      prove: prove(5),
      soluzione: r4.replace(`    print(f"Ora {ore}: {carica}%")`, `    print(f"Ora {ore}: {carica}%")\n    if carica <= ${SOGLIA_SCARICA}:\n        print("Carica il telefono!")`),
      regola: REGOLA_BATTERIA + " Il consumo arriva da `input()`. L'avviso lo decide un `if` dentro il ciclo sulla carica.",
    },
  ];
}

export function schedaBatteria(seme: number): SchedaCompito {
  const p = parametriBatteria(seme);
  return {
    id: 'batteria',
    titolo: 'La batteria del telefono',
    committente:
      `Il telefono è al ${p.carica}% e vuoi sapere per quante ore ti dura. Il programma stampa la carica ora per ora finché c'è, ` +
      `conta le ore e ti avvisa quando è il momento di caricarlo. Il consumo all'ora lo chiede a te.`,
    prodotto: "La carica ora per ora, l'avviso quando è bassa, dopo quante ore si scarica. Deve funzionare per qualunque consumo: lo chiede con input().",
    dati: [`Carica iniziale: ${p.carica}%`, `Consumo di prova: ${p.consumo}% all'ora`, `Avviso dal: ${SOGLIA_SCARICA}% in giù`],
    outputFinale: righeBatteria(p, p.consumo, 5),
  };
}

/* ------------------------------------------------------------------ 6. il pettegolezzo */

/* L'aggiornamento non è un passo fisso: chi lo sa raddoppia ogni ora (`*=`). Pochi giri, ma
 * quanti non si sa. */

const SCUOLE = [200, 300, 400, 500, 600] as const;
const INIZI = [2, 3, 5] as const;
/** Gli inizi delle prove nascoste: più gente all'inizio, meno ore. */
const INIZI_NASCOSTI = [10, 25] as const;

interface ParametriPettegolezzo {
  scuola: number;
  inizio: number;
}

function parametriPettegolezzo(seme: number): ParametriPettegolezzo {
  const rnd = generatore(seme);
  return { scuola: SCUOLE[Math.floor(rnd() * SCUOLE.length)], inizio: INIZI[Math.floor(rnd() * INIZI.length)] };
}

function righePettegolezzo(p: ParametriPettegolezzo, inizio: number, fase: 1 | 2 | 3 | 4 | 5): string[] {
  const righe: string[] = [];
  let sanno = inizio;
  let ore = 0;
  while (sanno < p.scuola) {
    sanno *= 2;
    ore++;
    righe.push(fase === 1 ? `${sanno} persone` : `Ora ${ore}: ${sanno} persone`);
    if (fase === 5 && sanno >= p.scuola / 2) righe.push('Metà scuola lo sa!');
  }
  if (fase >= 3) righe.push(`Tutta la scuola lo sa dopo ${ore} ore`);
  return righe;
}

const REGOLA_PETTEGOLEZZO =
  'Quelli che lo sanno raddoppiano a ogni giro di un ciclo `while` che gira finché sono meno degli allievi della scuola (`*=` oppure `sanno = sanno * 2`): ' +
  'le ore non si sanno prima e non vanno scritte nel programma (niente `for` con `range`); le conta una variabile che cresce di 1 a ogni giro.';

export function fasiPettegolezzo(seme: number): Esercizio[] {
  const p = parametriPettegolezzo(seme);
  const { scuola, inizio } = p;
  const b = { ...base, terreno: 'montagna' as const };
  const prove = (fase: 4 | 5): Prova[] => [inizio, ...INIZI_NASCOSTI].map((n) => ({ risposte: [String(n)], output: righePettegolezzo(p, n, fase) }));
  const corpo = `while sanno < ${scuola}:\n    sanno *= 2\n    ore += 1\n    print(f"Ora {ore}: {sanno} persone")`;
  const r3 = `sanno = ${inizio}\nore = 0\n${corpo}\nprint(f"Tutta la scuola lo sa dopo {ore} ore")`;
  const r4 = `sanno = int(input("Quanti lo sanno all'inizio? "))\nore = 0\n${corpo}\nprint(f"Tutta la scuola lo sa dopo {ore} ore")`;
  const ore = righePettegolezzo(p, inizio, 1).length;
  return [
    {
      ...b,
      consegna:
        `**Fase 1 — raddoppia.** All'inizio lo sanno ${inizio} persone; ogni ora ognuno lo dice a un'altra, quindi **raddoppiano**: ${inizio * 2}, ${inizio * 4}, ${inizio * 8}… ` +
        `Il \`while\` gira finché \`sanno\` è meno di ${scuola} (tutta la scuola); dentro, \`sanno\` raddoppia (\`*=\`) e si stampa \`${inizio * 2} persone\`, \`${inizio * 4} persone\`…`,
      outputAtteso: righePettegolezzo(p, inizio, 1),
      soluzione: `sanno = ${inizio}\nwhile sanno < ${scuola}:\n    sanno *= 2\n    print(f"{sanno} persone")`,
      regola: REGOLA_PETTEGOLEZZO,
    },
    {
      ...b,
      consegna: `**Fase 2 — le ore.** Una variabile \`ore\` conta i giri: \`Ora 1: ${inizio * 2} persone\`, \`Ora 2: ${inizio * 4} persone\`…`,
      outputAtteso: righePettegolezzo(p, inizio, 2),
      soluzione: `sanno = ${inizio}\nore = 0\n${corpo}`,
      regola: REGOLA_PETTEGOLEZZO,
    },
    {
      ...b,
      consegna: `**Fase 3 — quando lo sanno tutti.** Dopo il ciclo: \`Tutta la scuola lo sa dopo ${ore} ore\`. Il numero è in \`ore\`.`,
      outputAtteso: righePettegolezzo(p, inizio, 3),
      soluzione: r3,
      regola: REGOLA_PETTEGOLEZZO,
    },
    {
      ...b,
      consegna:
        `**Fase 4 — quanti all'inizio.** Chiedi con \`input()\` e \`int()\` quanti lo sanno all'inizio, al posto del ${inizio}. Risposta di prova: **${inizio}**; ` +
        `se all'inizio sono di più le ore sono di meno, e il programma deve funzionare lo stesso.`,
      outputAtteso: righePettegolezzo(p, inizio, 4),
      prove: prove(4),
      soluzione: r4,
      regola: REGOLA_PETTEGOLEZZO + " Quanti lo sanno all'inizio arriva da `input()`: non va scritto nel programma.",
    },
    {
      ...b,
      consegna: `**Fase 5 — metà scuola.** Dentro il ciclo, dopo la riga dell'ora, un \`if\`: se \`sanno\` è almeno ${scuola / 2} (metà scuola) stampa \`Metà scuola lo sa!\`.`,
      outputAtteso: righePettegolezzo(p, inizio, 5),
      prove: prove(5),
      soluzione: r4.replace(`    print(f"Ora {ore}: {sanno} persone")`, `    print(f"Ora {ore}: {sanno} persone")\n    if sanno >= ${scuola / 2}:\n        print("Metà scuola lo sa!")`),
      regola: REGOLA_PETTEGOLEZZO + " Quanti lo sanno all'inizio arriva da `input()`. La riga di metà scuola la decide un `if` dentro il ciclo.",
    },
  ];
}

export function schedaPettegolezzo(seme: number): SchedaCompito {
  const p = parametriPettegolezzo(seme);
  return {
    id: 'pettegolezzo',
    titolo: 'Il pettegolezzo',
    committente:
      `Nella scuola ci sono ${p.scuola} allievi. Un pettegolezzo parte da ${p.inizio} persone e ogni ora chi lo sa lo racconta a una persona nuova: ` +
      `quelli che lo sanno raddoppiano. Dopo quante ore lo sa tutta la scuola? Il programma lo scopre girando finché non ci arriva.`,
    prodotto: "Ora per ora quanti lo sanno, l'avviso a metà scuola, dopo quante ore lo sanno tutti. Quanti lo sanno all'inizio lo chiede con input().",
    dati: [`Allievi della scuola: ${p.scuola}`, `Lo sanno all'inizio (prova): ${p.inizio}`],
    outputFinale: righePettegolezzo(p, p.inizio, 5),
  };
}
