/* I compiti di realtà dell'Officina (PERCORSO.md §12 e §14).
 *
 * Un compito è un solo programma costruito in **fasi**: a ogni fase l'allievo aggiunge
 * una riga o due a quello che ha già, finché il programma non è il prodotto finito. Ogni
 * fase è un `Esercizio` del motore comune (lib/giro: interprete, hint, giudice), così
 * validazione e hint sono quelli di sempre; cambia la cornice: la scheda del compito
 * (committente, prodotto, output finale) e il voto.
 *
 * I parametri del compito escono da un seme (nell'Officina: dell'allievo), e l'output
 * atteso si ricalcola dal seme ovunque serva, senza salvarlo due volte.
 *
 * Modulo puro: niente Firestore, niente Next.
 */
import { generatore, REGOLE, type Esercizio, type Prova } from '../giro/esercizi';
import { fasiPromozione, schedaPromozione } from './compitiCondizioni';
import { fasiConteggio, fasiDiario, fasiRecord, schedaConteggio, schedaDiario, schedaRecord } from './compitiDiario';
import { fasiCartello, fasiClassifica, fasiLancio, fasiScala, schedaCartello, schedaClassifica, schedaLancio, schedaScala } from './compitiIniziali';
import { fasiPatentino, schedaPatentino } from './compitiPatentino';
import { fasiTimer, schedaTimer } from './compitiWhile';
import { fasiBatteria, fasiObiettivo, fasiPettegolezzo, schedaBatteria, schedaObiettivo, schedaPettegolezzo } from './compitiWhileQuantita';
import { fasiCassa, fasiParola, schedaCassa, schedaParola } from './compitiWhileRisposte';

export type CompitoId =
  | 'cartello'
  | 'classifica'
  | 'lancio'
  | 'scala'
  | 'salvadanaio'
  | 'allenamento'
  | 'scontrino'
  | 'promozione'
  | 'diario'
  | 'record'
  | 'conteggio'
  | 'patentino'
  | 'timer'
  | 'obiettivo'
  | 'parola'
  | 'batteria'
  | 'cassa'
  | 'pettegolezzo';

export interface SchedaCompito {
  id: CompitoId;
  titolo: string;
  /** Un esame (il patentino): tutor spento, restano gli hint automatici. */
  esame?: boolean;
  /** Chi chiede il programma e perché: il contesto di realtà. */
  committente: string;
  /** Che cosa deve produrre il programma, in una riga. */
  prodotto: string;
  /** I dati del problema, già scelti: l'allievo li legge qui. */
  dati: string[];
  /** L'output finale per intero: in un compito di realtà il bersaglio si vede. */
  outputFinale: string[];
}

/** Il voto parte da qui e scende di uno a domanda al tutor. */
export const VOTO_MASSIMO = 10;
/** Sotto questo non si scende: le domande servono a imparare, non a bocciare. */
export const VOTO_MINIMO_FINITO = 5;

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
 * La regola di ogni fase, per il giudice: un ciclo che fa le righe, e da `accumuloDalla` in
 * poi la variabile che accumula. Le righe del corpo sono libere: chi si fa una variabile
 * d'appoggio (`barra = "=" * i`) scrive meglio, non peggio; il furbo da fermare è chi mette
 * otto `print` in un `for i in range(1)`, o calcola il totale con `quota * i` quando il
 * progetto esiste per insegnare la variabile che ricorda.
 */
function regolaFase(fase: number, accumuloDalla = 3): string {
  const accumulo =
    fase >= accumuloDalla
      ? ' Il totale lo tiene una variabile che parte prima del ciclo e cresce a ogni giro (accumulo): non vale calcolarlo con una formula sul numero del giro, come `quota * i`.'
      : '';
  const finale = fase === 5 ? ' La riga finale, dopo il ciclo, usa la variabile del totale: il numero non va scritto a mano.' : '';
  return REGOLE.cicloVariabile + accumulo + finale;
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
      regola: regolaFase(1),
    },
    {
      ...base,
      consegna:
        `**Fase 2 — la quota.** Ogni settimana si mettono da parte ${quota} €: scrivilo accanto, ` +
        `dopo i due punti, così: \`Settimana 1: ${quota} €\`.`,
      outputAtteso: righeSettimane(p, 2),
      soluzione: `${ciclo}\n    print(f"Settimana {i}: ${quota} €")`,
      regola: regolaFase(2),
    },
    {
      ...base,
      consegna:
        `**Fase 3 — il totale che cresce.** Al posto della quota ci vuole quanto c'è nel salvadanaio ` +
        `dopo quella settimana: ${quota}, poi ${quota * 2}, poi ${quota * 3}… Usa una variabile \`totale\` che ` +
        `parte da 0 **prima** del ciclo e a ogni settimana cresce di ${quota}.`,
      outputAtteso: righeSettimane(p, 3),
      soluzione: `totale = 0\n${ciclo}\n    totale += ${quota}\n    print(f"Settimana {i}: {totale} €")`,
      regola: regolaFase(3),
    },
    {
      ...base,
      consegna:
        `**Fase 4 — la barra.** Dopo il totale, separato da uno spazio, disegna una barra di asterischi ` +
        `che si allunga: un \`*\` alla prima settimana, due alla seconda, e così via. Ricorda che \`"*" * 3\` fa \`***\`.`,
      outputAtteso: righeSettimane(p, 4),
      soluzione: `totale = 0\n${ciclo}\n    totale += ${quota}\n    print(f"Settimana {i}: {totale} € " + "*" * i)`,
      regola: regolaFase(4),
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
      regola: regolaFase(5),
    },
  ];
}

function schedaSalvadanaio(seme: number): SchedaCompito {
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
      regola: regolaFase(1),
    },
    {
      ...base,
      consegna:
        `**Fase 2 — i chilometri che crescono.** La prima settimana si fanno ${partenza} km, poi ogni settimana ` +
        `${incremento} in più: ${partenza}, ${partenza + incremento}, ${partenza + 2 * incremento}… Usa una variabile \`km\` che parte da ${partenza} ` +
        `**prima** del ciclo; dentro, prima la stampi (\`Settimana 1: ${partenza} km\`) e **poi** la aumenti di ${incremento}.`,
      outputAtteso: righeAllenamento(p, 2).righe,
      soluzione: `km = ${partenza}\n${ciclo}\n    print(f"Settimana {i}: {km} km")\n    km += ${incremento}`,
      regola: regolaFase(2, 2),
    },
    {
      ...base,
      consegna:
        `**Fase 3 — il totale.** Accanto ai km della settimana, fra parentesi, quanti km hai fatto in tutto fin lì: ` +
        `\`(totale ${partenza})\`, poi \`(totale ${2 * partenza + incremento})\`… Ti serve una seconda variabile \`totale\` che parte da 0 ` +
        `e a ogni settimana cresce dei km di quella settimana.`,
      outputAtteso: righeAllenamento(p, 3).righe,
      soluzione: `km = ${partenza}\ntotale = 0\n${ciclo}\n${corpo3}")\n    km += ${incremento}`,
      regola: regolaFase(3, 2),
    },
    {
      ...base,
      consegna:
        `**Fase 4 — la barra.** Dopo la parentesi, separata da uno spazio, una barra di \`=\` che si allunga: ` +
        `uno alla prima settimana, due alla seconda, e così via (\`"=" * 3\` fa \`===\`).`,
      outputAtteso: righeAllenamento(p, 4).righe,
      soluzione: `km = ${partenza}\ntotale = 0\n${ciclo}\n${corpo3} " + "=" * i)\n    km += ${incremento}`,
      regola: regolaFase(4, 2),
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
      regola: regolaFase(5, 2),
    },
  ];
}

function schedaAllenamento(seme: number): SchedaCompito {
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

/** La regola di ogni fase dello scontrino: i dati da `input()`, dalla fase 3 il ciclo, dalla 4 l'accumulo. */
function regolaScontrino(fase: number): string {
  const input = 'I dati del cliente arrivano da `input()` (con `int()` per i numeri): non valgono i valori scritti nel programma.';
  if (fase < 3) return `${input} Qui non serve nessun ciclo.`;
  const ciclo = ' Le righe dei panini le stampa un ciclo `for` che gira tante volte quanti sono i panini risposti: non valgono le righe scritte a mano né un ciclo da un giro solo con più `print`.';
  const accumulo = fase >= 4 ? ' Il totale lo tiene una variabile che parte da 0 prima del ciclo e cresce a ogni panino; si stampa dopo il ciclo. Non vale `panini * prezzo` né il numero scritto a mano.' : '';
  return input + ciclo + accumulo;
}

function fasiScontrino(seme: number): Esercizio[] {
  const p = parametriScontrino(seme);
  const [a] = p.clienti;
  const base = { tipo: 'progetto' as const, terreno: 'montagna' as const, mostraOutput: true, risposta: 'codice' as const };
  const fase = (n: 1 | 2 | 3 | 4 | 5, consegna: string, soluzione: string): Esercizio => {
    const prove = proveScontrino(p, n);
    return { ...base, consegna, outputAtteso: prove[0].output, prove, soluzione, regola: regolaScontrino(n) };
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

function schedaScontrino(seme: number): SchedaCompito {
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

const PROGETTI: Record<CompitoId, { fasi: (seme: number) => Esercizio[]; scheda: (seme: number) => SchedaCompito }> = {
  cartello: { fasi: fasiCartello, scheda: schedaCartello },
  classifica: { fasi: fasiClassifica, scheda: schedaClassifica },
  lancio: { fasi: fasiLancio, scheda: schedaLancio },
  scala: { fasi: fasiScala, scheda: schedaScala },
  salvadanaio: { fasi: fasiSalvadanaio, scheda: schedaSalvadanaio },
  allenamento: { fasi: fasiAllenamento, scheda: schedaAllenamento },
  scontrino: { fasi: fasiScontrino, scheda: schedaScontrino },
  promozione: { fasi: fasiPromozione, scheda: schedaPromozione },
  diario: { fasi: fasiDiario, scheda: schedaDiario },
  record: { fasi: fasiRecord, scheda: schedaRecord },
  conteggio: { fasi: fasiConteggio, scheda: schedaConteggio },
  patentino: { fasi: fasiPatentino, scheda: schedaPatentino },
  timer: { fasi: fasiTimer, scheda: schedaTimer },
  obiettivo: { fasi: fasiObiettivo, scheda: schedaObiettivo },
  parola: { fasi: fasiParola, scheda: schedaParola },
  batteria: { fasi: fasiBatteria, scheda: schedaBatteria },
  cassa: { fasi: fasiCassa, scheda: schedaCassa },
  pettegolezzo: { fasi: fasiPettegolezzo, scheda: schedaPettegolezzo },
};

/* ------------------------------------------------------------------- sezioni */

export type SezioneId = 'for' | 'while';

/** Un capitolo del percorso: i compiti su un ciclo, con l'esame in fondo. */
export interface Sezione {
  id: SezioneId;
  titolo: string;
  compiti: CompitoId[];
}

/**
 * Il percorso a sezioni (PERCORSO.md §19): l'allievo vede i due cicli come due capitoli.
 * Nella prima i compiti nell'ordine didattico, un'idea nuova ciascuno (§15): ripetere · la
 * variabile del ciclo · il passo · la variabile in un calcolo · l'accumulatore · due
 * variabili e l'ordine nel corpo · input() · decidere con un if (§17) · input() dentro il
 * ciclo · la variabile che ricorda il migliore · il contatore in un ramo (§18) · il
 * patentino (§19). La seconda, il `while` (§22), dodici compiti con le famiglie d'uso
 * mescolate, a partire dal timer del forno (i tre gesti del `while`).
 */
export const SEZIONI: Sezione[] = [
  {
    id: 'for',
    titolo: 'Il ciclo for',
    compiti: ['cartello', 'classifica', 'lancio', 'scala', 'salvadanaio', 'allenamento', 'scontrino', 'promozione', 'diario', 'record', 'conteggio', 'patentino'],
  },
  { id: 'while', titolo: 'Il ciclo while', compiti: ['timer', 'obiettivo', 'parola', 'batteria', 'cassa', 'pettegolezzo'] },
];

/** Tutti i compiti nell'ordine in cui si sbloccano: sezione dopo sezione. */
export const ELENCO_COMPITI: CompitoId[] = SEZIONI.flatMap((s) => s.compiti);

export function sezioneDi(id: CompitoId): Sezione {
  return SEZIONI.find((s) => s.compiti.includes(id)) ?? SEZIONI[0];
}

/** Un esame (il patentino): il tutor è spento. */
export function eEsame(id: CompitoId): boolean {
  return PROGETTI[id].scheda(1).esame === true;
}

/** Le fasi del progetto, come chilometri della tappa. Stesso seme, stesse fasi. */
export function generaCompito(progetto: CompitoId, seme: number): Esercizio[] {
  return PROGETTI[progetto].fasi(seme);
}

/** La scheda del compito, ricalcolata dal seme della tappa ovunque serva. */
export function schedaCompito(progetto: CompitoId, seme: number): SchedaCompito {
  return PROGETTI[progetto].scheda(seme);
}

export function eCompito(valore: unknown): valore is CompitoId {
  return typeof valore === 'string' && valore in PROGETTI;
}

/* ----------------------------------------------------------------------- voto */

/**
 * Il voto che l'allievo vede mentre lavora: quello che prende se arriva in fondo, 10 meno
 * un punto a domanda, pavimento 5. È il numero che gli si mostra prima di chiedere un
 * consiglio («costa 1 punto: voto attuale 9»).
 */
export function votoSeFinisce(consigli: number): number {
  return Math.max(VOTO_MINIMO_FINITO, VOTO_MASSIMO - Math.max(0, consigli));
}
