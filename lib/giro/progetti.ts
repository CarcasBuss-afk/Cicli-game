/* La Cronoscalata: il compito di realtà guidato (vedi PERCORSO.md §11).
 *
 * Una tappa speciale del Giro, senza cronometro, i cui chilometri sono le **fasi di
 * costruzione di un solo programma**: a ogni fase l'allievo aggiunge una riga o due a
 * quello che ha già, finché il programma non è il prodotto finito. Ogni fase è un
 * `Esercizio` come gli altri, così validazione e hint restano quelli del Giro; cambia la
 * cornice: la scheda del compito (committente, prodotto, output finale) e il voto.
 *
 * I parametri del progetto escono dal seme della tappa, uguali per tutti gli allievi:
 * l'output atteso si ricalcola dal seme ovunque serva, senza salvarlo due volte.
 *
 * Modulo puro: niente Firestore, niente Next.
 */
import { generatore, type Esercizio, type Prova, type Vincoli } from './esercizi';

export type Progetto = 'salvadanaio' | 'allenamento' | 'scontrino';

export interface SchedaProgetto {
  id: Progetto;
  titolo: string;
  /** Chi chiede il programma e perché: il contesto di realtà. */
  committente: string;
  /** Che cosa deve produrre il programma, in una riga. */
  prodotto: string;
  /** I dati del problema, già scelti: l'allievo li legge qui. */
  dati: string[];
  /** L'output finale per intero: in un compito di realtà il bersaglio si vede. */
  outputFinale: string[];
}

/** Il voto parte da qui e scende di uno a consiglio. */
export const VOTO_MASSIMO = 10;
/** Sotto questo non si scende se si arriva in fondo: i consigli servono a imparare, non a bocciare. */
export const VOTO_MINIMO_FINITO = 5;
/** Pavimento per chi non finisce. */
export const VOTO_MINIMO = 2;

/* -------------------------------------------------------------- il salvadanaio */

/** Quote settimanali possibili: tonde, così i totali si controllano a mente. */
const QUOTE = [5, 10, 15, 20, 25] as const;

/** Che cosa si vuole comprare: il prezzo si adatta a quota × settimane. */
const DESIDERI = ['le cuffie nuove', 'un videogioco', 'le scarpe da calcio', 'un regalo per un amico', 'la cassa bluetooth', 'lo zaino nuovo'] as const;

interface ParametriSalvadanaio {
  quota: number;
  settimane: number;
  desiderio: string;
}

function parametriSalvadanaio(seme: number): ParametriSalvadanaio {
  const rnd = generatore(seme);
  const quota = QUOTE[Math.floor(rnd() * QUOTE.length)];
  // Da 6 a 10 settimane: abbastanza righe perché il ciclo serva, poche abbastanza da leggerle.
  const settimane = 6 + Math.floor(rnd() * 5);
  const desiderio = DESIDERI[Math.floor(rnd() * DESIDERI.length)];
  return { quota, settimane, desiderio };
}

/** Le righe delle settimane, nelle quattro forme che il programma attraversa. */
function righeSettimane(p: ParametriSalvadanaio, fase: 1 | 2 | 3 | 4): string[] {
  const righe: string[] = [];
  let totale = 0;
  for (let i = 1; i <= p.settimane; i++) {
    totale += p.quota;
    if (fase === 1) righe.push(`Settimana ${i}`);
    else if (fase === 2) righe.push(`Settimana ${i}: ${p.quota} €`);
    else if (fase === 3) righe.push(`Settimana ${i}: ${totale} €`);
    else righe.push(`Settimana ${i}: ${totale} € ${'*'.repeat(i)}`);
  }
  return righe;
}

function rigaFinale(p: ParametriSalvadanaio): string {
  return `Obiettivo ${p.quota * p.settimane} € raggiunto in ${p.settimane} settimane`;
}

/**
 * Vincoli delle fasi: un ciclo solo con dentro un solo `print`. Le righe del corpo sono
 * libere: chi si fa una variabile d'appoggio (`barra = "=" * i`) scrive meglio, non
 * peggio; il furbo da fermare è chi mette otto `print` in un `for i in range(1)`, e lo
 * ferma il conto dei `print`. Da `accumuloDalla` in poi dentro il ciclo ci vuole
 * l'accumulo: `totale = quota * i` darebbe lo stesso output, ma il progetto esiste per
 * insegnare la variabile che ricorda.
 */
function vincoliFase(fase: number, accumuloDalla = 3): Vincoli {
  return {
    forRichiesti: 1,
    righeCorpoMax: null,
    printNelCicloMax: 1,
    printFuoriCicloMax: fase === 5 ? 1 : 0,
    accumuloRichiesto: fase >= accumuloDalla,
  };
}

function fasiSalvadanaio(seme: number): Esercizio[] {
  const p = parametriSalvadanaio(seme);
  const { quota, settimane } = p;
  const base = { tipo: 'progetto' as const, terreno: 'collina' as const, mostraOutput: true, risposta: 'codice' as const };
  const ciclo = `for i in range(1, ${settimane + 1}):`;
  return [
    {
      ...base,
      consegna:
        `**Fase 1 — le settimane.** Il piano ha una riga per settimana. Scrivi un ciclo che stampa ` +
        `\`Settimana 1\`, \`Settimana 2\`… fino a \`Settimana ${settimane}\`.`,
      outputAtteso: righeSettimane(p, 1),
      soluzione: `${ciclo}\n    print(f"Settimana {i}")`,
      vincoli: vincoliFase(1),
    },
    {
      ...base,
      consegna:
        `**Fase 2 — la quota.** Ogni settimana si mettono da parte ${quota} €: scrivilo accanto, ` +
        `dopo i due punti, così: \`Settimana 1: ${quota} €\`.`,
      outputAtteso: righeSettimane(p, 2),
      soluzione: `${ciclo}\n    print(f"Settimana {i}: ${quota} €")`,
      vincoli: vincoliFase(2),
    },
    {
      ...base,
      consegna:
        `**Fase 3 — il totale che cresce.** Al posto della quota ci vuole quanto c'è nel salvadanaio ` +
        `dopo quella settimana: ${quota}, poi ${quota * 2}, poi ${quota * 3}… Usa una variabile \`totale\` che ` +
        `parte da 0 **prima** del ciclo e a ogni settimana cresce di ${quota}.`,
      outputAtteso: righeSettimane(p, 3),
      soluzione: `totale = 0\n${ciclo}\n    totale += ${quota}\n    print(f"Settimana {i}: {totale} €")`,
      vincoli: vincoliFase(3),
    },
    {
      ...base,
      consegna:
        `**Fase 4 — la barra.** Dopo il totale, separato da uno spazio, disegna una barra di asterischi ` +
        `che si allunga: un \`*\` alla prima settimana, due alla seconda, e così via. Ricorda che \`"*" * 3\` fa \`***\`.`,
      outputAtteso: righeSettimane(p, 4),
      soluzione: `totale = 0\n${ciclo}\n    totale += ${quota}\n    print(f"Settimana {i}: {totale} € " + "*" * i)`,
      vincoli: vincoliFase(4),
    },
    {
      ...base,
      consegna:
        `**Fase 5 — l'arrivo.** Quando il ciclo ha finito, stampa una riga sola con il risultato: ` +
        `\`${rigaFinale(p)}\`. Usa \`totale\`, non scrivere il numero a mano.`,
      outputAtteso: [...righeSettimane(p, 4), rigaFinale(p)],
      soluzione:
        `totale = 0\n${ciclo}\n    totale += ${quota}\n    print(f"Settimana {i}: {totale} € " + "*" * i)\n` +
        `print(f"Obiettivo {totale} € raggiunto in ${settimane} settimane")`,
      vincoli: vincoliFase(5),
    },
  ];
}

function schedaSalvadanaio(seme: number): SchedaProgetto {
  const p = parametriSalvadanaio(seme);
  const obiettivo = p.quota * p.settimane;
  return {
    id: 'salvadanaio',
    titolo: 'Il salvadanaio',
    committente:
      `Vuoi comprarti ${p.desiderio}, che costano ${obiettivo} €, e hai deciso di mettere da parte ` +
      `${p.quota} € ogni settimana. Prima di cominciare vuoi vedere su carta come cresce il salvadanaio.`,
    prodotto: 'Il piano di risparmio: una riga per settimana con il totale e una barra che cresce, e alla fine quando arrivi.',
    dati: [`Prezzo: ${obiettivo} €`, `Quota settimanale: ${p.quota} €`, `Settimane: ${p.settimane}`],
    outputFinale: [...righeSettimane(p, 4), rigaFinale(p)],
  };
}

/* ------------------------------------------------------- la tabella di allenamento */

/* Il passo dopo il salvadanaio: due variabili che ricordano (i km della settimana, che
 * crescono, e il totale percorso), e l'ordine delle istruzioni nel corpo che cambia il
 * risultato: i km si stampano **prima** di aumentarli. */

const PARTENZE = [8, 10, 12, 15] as const;
const INCREMENTI = [2, 3, 5] as const;
const GARE = ['la granfondo di giugno', 'la gara di paese', 'la salita del Mortirolo', 'la pedalata con gli amici', 'il raduno di primavera'] as const;

interface ParametriAllenamento {
  partenza: number;
  incremento: number;
  settimane: number;
  gara: string;
}

function parametriAllenamento(seme: number): ParametriAllenamento {
  const rnd = generatore(seme);
  const partenza = PARTENZE[Math.floor(rnd() * PARTENZE.length)];
  const incremento = INCREMENTI[Math.floor(rnd() * INCREMENTI.length)];
  const settimane = 6 + Math.floor(rnd() * 4);
  const gara = GARE[Math.floor(rnd() * GARE.length)];
  return { partenza, incremento, settimane, gara };
}

/** Le righe delle settimane nelle quattro forme del programma; `totaleFinale` serve alla riga d'arrivo. */
function righeAllenamento(p: ParametriAllenamento, fase: 1 | 2 | 3 | 4): { righe: string[]; totale: number } {
  const righe: string[] = [];
  let km = p.partenza;
  let totale = 0;
  for (let i = 1; i <= p.settimane; i++) {
    totale += km;
    if (fase === 1) righe.push(`Settimana ${i}`);
    else if (fase === 2) righe.push(`Settimana ${i}: ${km} km`);
    else if (fase === 3) righe.push(`Settimana ${i}: ${km} km (totale ${totale})`);
    else righe.push(`Settimana ${i}: ${km} km (totale ${totale}) ${'='.repeat(i)}`);
    km += p.incremento;
  }
  return { righe, totale };
}

function rigaArrivo(p: ParametriAllenamento): string {
  return `In ${p.settimane} settimane hai pedalato ${righeAllenamento(p, 4).totale} km`;
}

function fasiAllenamento(seme: number): Esercizio[] {
  const p = parametriAllenamento(seme);
  const { partenza, incremento, settimane } = p;
  const base = { tipo: 'progetto' as const, terreno: 'montagna' as const, mostraOutput: true, risposta: 'codice' as const };
  const ciclo = `for i in range(1, ${settimane + 1}):`;
  const corpo3 = `    totale += km\n    print(f"Settimana {i}: {km} km (totale {totale})`;
  return [
    {
      ...base,
      consegna:
        `**Fase 1 — le settimane.** Il piano ha una riga per settimana. Scrivi un ciclo che stampa ` +
        `\`Settimana 1\`, \`Settimana 2\`… fino a \`Settimana ${settimane}\`.`,
      outputAtteso: righeAllenamento(p, 1).righe,
      soluzione: `${ciclo}\n    print(f"Settimana {i}")`,
      vincoli: vincoliFase(1),
    },
    {
      ...base,
      consegna:
        `**Fase 2 — i chilometri che crescono.** La prima settimana si fanno ${partenza} km, poi ogni settimana ` +
        `${incremento} in più: ${partenza}, ${partenza + incremento}, ${partenza + 2 * incremento}… Usa una variabile \`km\` che parte da ${partenza} ` +
        `**prima** del ciclo; dentro, prima la stampi (\`Settimana 1: ${partenza} km\`) e **poi** la aumenti di ${incremento}.`,
      outputAtteso: righeAllenamento(p, 2).righe,
      soluzione: `km = ${partenza}\n${ciclo}\n    print(f"Settimana {i}: {km} km")\n    km += ${incremento}`,
      vincoli: vincoliFase(2, 2),
    },
    {
      ...base,
      consegna:
        `**Fase 3 — il totale.** Accanto ai km della settimana, fra parentesi, quanti km hai fatto in tutto fin lì: ` +
        `\`(totale ${partenza})\`, poi \`(totale ${2 * partenza + incremento})\`… Ti serve una seconda variabile \`totale\` che parte da 0 ` +
        `e a ogni settimana cresce dei km di quella settimana.`,
      outputAtteso: righeAllenamento(p, 3).righe,
      soluzione: `km = ${partenza}\ntotale = 0\n${ciclo}\n${corpo3}")\n    km += ${incremento}`,
      vincoli: vincoliFase(3, 2),
    },
    {
      ...base,
      consegna:
        `**Fase 4 — la barra.** Dopo la parentesi, separata da uno spazio, una barra di \`=\` che si allunga: ` +
        `uno alla prima settimana, due alla seconda, e così via (\`"=" * 3\` fa \`===\`).`,
      outputAtteso: righeAllenamento(p, 4).righe,
      soluzione: `km = ${partenza}\ntotale = 0\n${ciclo}\n${corpo3} " + "=" * i)\n    km += ${incremento}`,
      vincoli: vincoliFase(4, 2),
    },
    {
      ...base,
      consegna:
        `**Fase 5 — l'arrivo.** Quando il ciclo ha finito, stampa una riga sola: \`${rigaArrivo(p)}\`. ` +
        `Usa \`totale\`, non scrivere il numero a mano.`,
      outputAtteso: [...righeAllenamento(p, 4).righe, rigaArrivo(p)],
      soluzione:
        `km = ${partenza}\ntotale = 0\n${ciclo}\n${corpo3} " + "=" * i)\n    km += ${incremento}\n` +
        `print(f"In ${settimane} settimane hai pedalato {totale} km")`,
      vincoli: vincoliFase(5, 2),
    },
  ];
}

function schedaAllenamento(seme: number): SchedaProgetto {
  const p = parametriAllenamento(seme);
  const { righe, totale } = righeAllenamento(p, 4);
  return {
    id: 'allenamento',
    titolo: "La tabella d'allenamento",
    committente:
      `Un amico si prepara per ${p.gara} e ti chiede il piano: si parte da ${p.partenza} km la prima settimana ` +
      `e si aggiungono ${p.incremento} km ogni settimana, per ${p.settimane} settimane. Lo vuole stampato, da appendere in garage.`,
    prodotto: 'La tabella: una riga per settimana con i km da fare, il totale percorso fin lì e una barra che cresce; alla fine quanti km ha pedalato.',
    dati: [`Partenza: ${p.partenza} km`, `Aumento: +${p.incremento} km a settimana`, `Settimane: ${p.settimane}`, `Totale: ${totale} km`],
    outputFinale: [...righe, rigaArrivo(p)],
  };
}

/* ------------------------------------------------------------ lo scontrino del bar */

/* Il primo progetto con `input()`: il programma chiede il nome, quanti panini, quanto si
 * paga, e stampa lo scontrino. Le risposte le fornisce il compito; ogni fase si prova con
 * due serie di risposte (una mostrata, una nascosta), così chi scrive i valori a mano
 * invece di leggerli cade alla seconda. */

const CLIENTI = ['Luca', 'Sara', 'Marco', 'Giulia', 'Omar', 'Aisha', 'Nadia', 'Pietro'] as const;
const PREZZI_PANINO = [3, 4, 5] as const;

interface Cliente {
  nome: string;
  panini: number;
  /** Quanto paga: una banconota che copre il totale. */
  dato: number;
}

interface ParametriScontrino {
  prezzo: number;
  /** La prova mostrata e quella nascosta. */
  clienti: [Cliente, Cliente];
}

function parametriScontrino(seme: number): ParametriScontrino {
  const rnd = generatore(seme);
  const prezzo = PREZZI_PANINO[Math.floor(rnd() * PREZZI_PANINO.length)];
  const i = Math.floor(rnd() * CLIENTI.length);
  const j = (i + 1 + Math.floor(rnd() * (CLIENTI.length - 1))) % CLIENTI.length;
  const cliente = (nome: string, panini: number): Cliente => {
    const totale = panini * prezzo;
    // Paga con la banconota da 10, 20 o 50 che basta.
    const dato = totale <= 10 ? 10 : totale <= 20 ? 20 : 50;
    return { nome, panini, dato };
  };
  const a = 2 + Math.floor(rnd() * 4); // 2..5
  let b = 2 + Math.floor(rnd() * 5); // 2..6
  if (b === a) b = a === 6 ? 2 : a + 1;
  return { prezzo, clienti: [cliente(CLIENTI[i], a), cliente(CLIENTI[j], b)] };
}

/** Lo scontrino di un cliente, fase per fase. */
function righeScontrino(p: ParametriScontrino, c: Cliente, fase: 1 | 2 | 3 | 4 | 5): string[] {
  const righe = [`Scontrino di ${c.nome}`];
  if (fase >= 2) righe.push(`Panini: ${c.panini}`);
  if (fase >= 3) for (let i = 1; i <= c.panini; i++) righe.push(`Panino ${i}: ${p.prezzo} €`);
  const totale = c.panini * p.prezzo;
  if (fase >= 4) righe.push(`Totale: ${totale} €`);
  if (fase >= 5) righe.push(`Hai dato ${c.dato} €, resto ${c.dato - totale} €. Grazie ${c.nome}!`);
  return righe;
}

/** Le risposte che servono alla fase: il nome, poi i panini, alla fine i soldi. */
function risposteScontrino(c: Cliente, fase: number): string[] {
  const r = [c.nome];
  if (fase >= 2) r.push(String(c.panini));
  if (fase >= 5) r.push(String(c.dato));
  return r;
}

function proveScontrino(p: ParametriScontrino, fase: 1 | 2 | 3 | 4 | 5): Prova[] {
  return p.clienti.map((c) => ({ risposte: risposteScontrino(c, fase), output: righeScontrino(p, c, fase) }));
}

/** I vincoli: niente ciclo fino alla fase 2, poi uno solo con un solo print; le `input()` crescono. */
function vincoliScontrino(fase: number): Vincoli {
  return {
    forRichiesti: fase >= 3 ? 1 : null,
    righeCorpoMax: null,
    printNelCicloMax: fase >= 3 ? 1 : null,
    printFuoriCicloMax: null,
    accumuloRichiesto: fase >= 4,
    inputRichiesti: fase >= 5 ? 3 : fase >= 2 ? 2 : 1,
  };
}

function fasiScontrino(seme: number): Esercizio[] {
  const p = parametriScontrino(seme);
  const [a] = p.clienti;
  const base = { tipo: 'progetto' as const, terreno: 'montagna' as const, mostraOutput: true, risposta: 'codice' as const };
  const fase = (n: 1 | 2 | 3 | 4 | 5, consegna: string, soluzione: string): Esercizio => {
    const prove = proveScontrino(p, n);
    return { ...base, consegna, outputAtteso: prove[0].output, prove, soluzione, vincoli: vincoliScontrino(n) };
  };
  const r1 = 'nome = input("Come ti chiami? ")\nprint(f"Scontrino di {nome}")';
  const r2 = `${r1}\npanini = int(input("Quanti panini? "))\nprint(f"Panini: {panini}")`;
  const r3 = `${r2}\nfor i in range(1, panini + 1):\n    print(f"Panino {i}: ${p.prezzo} €")`;
  const r4 = `${r2}\ntotale = 0\nfor i in range(1, panini + 1):\n    totale += ${p.prezzo}\n    print(f"Panino {i}: ${p.prezzo} €")\nprint(f"Totale: {totale} €")`;
  const r5 = `${r4}\ndato = int(input("Quanto paghi? "))\nprint(f"Hai dato {dato} €, resto {dato - totale} €. Grazie {nome}!")`;
  return [
    fase(
      1,
      `**Fase 1 — il cliente.** Lo scontrino comincia con il nome del cliente. Chiedilo con \`input()\`, mettilo in una ` +
        `variabile e stampa \`Scontrino di ${a.nome}\`. Il programma viene provato rispondendo **${a.nome}**, ma deve funzionare con qualunque nome.`,
      r1,
    ),
    fase(
      2,
      `**Fase 2 — quanti panini.** Chiedi quanti panini vuole e stampa \`Panini: ${a.panini}\`. La risposta di \`input()\` è un testo: ` +
        `per usarla come numero mettila dentro \`int()\`. Risposte di prova: **${a.nome}**, poi **${a.panini}**.`,
      r2,
    ),
    fase(
      3,
      `**Fase 3 — una riga per panino.** Dopo \`Panini: ${a.panini}\`, un ciclo stampa una riga per ogni panino: ` +
        `\`Panino 1: ${p.prezzo} €\`, \`Panino 2: ${p.prezzo} €\`… Il numero di giri è quello che ha risposto il cliente.`,
      r3,
    ),
    fase(
      4,
      `**Fase 4 — il totale.** Sotto i panini stampa \`Totale: ${a.panini * p.prezzo} €\`. Usa una variabile \`totale\` che parte da 0 ` +
        `prima del ciclo e a ogni panino cresce di ${p.prezzo}; il \`print\` del totale va **fuori** dal ciclo.`,
      r4,
    ),
    fase(
      5,
      `**Fase 5 — il resto.** Chiedi quanto paga (con \`int()\`) e stampa l'ultima riga: ` +
        `\`Hai dato ${a.dato} €, resto ${a.dato - a.panini * p.prezzo} €. Grazie ${a.nome}!\`. Risposte di prova: **${a.nome}**, **${a.panini}**, **${a.dato}**.`,
      r5,
    ),
  ];
}

function schedaScontrino(seme: number): SchedaProgetto {
  const p = parametriScontrino(seme);
  const [a] = p.clienti;
  return {
    id: 'scontrino',
    titolo: 'Lo scontrino del bar',
    committente:
      `Il bar della scuola vuole un programma per lo scontrino dei panini: chiede il nome del cliente, quanti panini prende ` +
      `e quanto paga, e stampa lo scontrino con il resto. Un panino costa ${p.prezzo} €.`,
    prodotto: 'Lo scontrino: il nome, una riga per panino, il totale e il resto. Deve funzionare per qualunque cliente: i dati li chiede con input().',
    dati: [`Panino: ${p.prezzo} €`, `Risposte di prova: ${a.nome} · ${a.panini} panini · paga ${a.dato} €`],
    outputFinale: righeScontrino(p, a, 5),
  };
}

/* ------------------------------------------------------------------- catalogo */

const PROGETTI: Record<Progetto, { fasi: (seme: number) => Esercizio[]; scheda: (seme: number) => SchedaProgetto }> = {
  salvadanaio: { fasi: fasiSalvadanaio, scheda: schedaSalvadanaio },
  allenamento: { fasi: fasiAllenamento, scheda: schedaAllenamento },
  scontrino: { fasi: fasiScontrino, scheda: schedaScontrino },
};

/** I progetti nell'ordine didattico: ognuno è un passo avanti rispetto al precedente. */
export const ELENCO_PROGETTI: Progetto[] = ['salvadanaio', 'allenamento', 'scontrino'];

/** Le fasi del progetto, come chilometri della tappa. Stesso seme, stesse fasi. */
export function generaCronoscalata(progetto: Progetto, seme: number): Esercizio[] {
  return PROGETTI[progetto].fasi(seme);
}

/** La scheda del compito, ricalcolata dal seme della tappa ovunque serva. */
export function schedaProgetto(progetto: Progetto, seme: number): SchedaProgetto {
  return PROGETTI[progetto].scheda(seme);
}

export function eProgetto(valore: unknown): valore is Progetto {
  return typeof valore === 'string' && valore in PROGETTI;
}

/* ----------------------------------------------------------------------- voto */

/**
 * Il voto che l'allievo vede mentre corre: quello che prende se arriva in fondo, 10 meno
 * un punto a consiglio, pavimento 5. È il numero che gli si mostra prima di chiedere un
 * consiglio («costa 1 punto: voto attuale 9»).
 */
export function votoSeFinisce(consigli: number): number {
  return Math.max(VOTO_MINIMO_FINITO, VOTO_MASSIMO - Math.max(0, consigli));
}

/**
 * Il voto proposto al docente a tappa chiusa: `votoSeFinisce` per chi arriva in fondo;
 * chi non finisce parte da un voto proporzionale alle fasi fatte (3 su 5 → 6), sempre
 * meno i consigli, pavimento 2. È una proposta: il docente la cambia prima di esportare.
 */
export function votoProposto(fasiFatte: number, fasiTotali: number, consigli: number): number {
  const finito = fasiTotali > 0 && fasiFatte >= fasiTotali;
  if (finito) return votoSeFinisce(consigli);
  const base = fasiTotali > 0 ? Math.round((VOTO_MASSIMO * fasiFatte) / fasiTotali) : 0;
  return Math.max(VOTO_MINIMO, base - Math.max(0, consigli));
}
