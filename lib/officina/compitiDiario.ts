/* I compiti dell'Officina sul diario delle uscite in bici (PERCORSO.md §18): gli ultimi tre
 * sul `for` prima del patentino. L'idea nuova del primo è l'`input()` **dentro** il ciclo:
 * nello scontrino le domande stavano tutte fuori e decidevano solo quante volte girare; qui
 * la domanda si ripete a ogni giro, la risposta cambia, e il totale si accumula su quello
 * che l'utente scrive. Gli altri due ripartono dal diario già scritto (`codiceIniziale`):
 * il record (la variabile che ricorda il migliore: confronta e sostituisce, non somma) e il
 * conteggio (il contatore che cresce solo in un ramo dell'`if`).
 *
 * Ogni fase gira con tre mesi di prova: uno mostrato e due nascosti (due uscite e sei),
 * con i valori messi in modo che le risposte scritte a mano o il record cercato a occhio
 * cadano lì, prima del giudice.
 *
 * Modulo puro. */
import { conNote, generatore, type Esercizio, type Prova } from '../giro/esercizi';
import type { SchedaCompito } from './compiti';

type Rnd = () => number;

/** Un mese di uscite: i km di ciascuna, nell'ordine in cui si rispondono. */
type Mese = number[];

const BASE = { tipo: 'progetto' as const, terreno: 'montagna' as const, mostraOutput: true, risposta: 'codice' as const };

function intero(rnd: Rnd, min: number, max: number): number {
  return min + Math.floor(rnd() * (max - min + 1));
}

/** `n` km fra `min` e `max`; se `distinti`, tutti diversi (così `>` e `>=` trovano lo stesso record). */
function kmCasuali(rnd: Rnd, n: number, min: number, max: number, distinti = false): Mese {
  const km: number[] = [];
  while (km.length < n) {
    const k = intero(rnd, min, max);
    if (distinti && km.includes(k)) continue;
    km.push(k);
  }
  return km;
}

const somma = (m: Mese): number => m.reduce((a, b) => a + b, 0);

/** Le risposte di un mese: quante uscite, poi i km una per una (dalla fase in cui si chiedono). */
function risposteDi(m: Mese, conKm: boolean): string[] {
  return conKm ? [String(m.length), ...m.map(String)] : [String(m.length)];
}

function descriviProva(m: Mese): string {
  return `${m.length} uscite · ${m.join(', ')} km`;
}

/* ----------------------------------------------------------- il diario delle uscite */

/** Il diario com'è alla fine della fase 3: il punto di partenza del record e del conteggio. */
export function diarioBase(): string {
  return [
    'uscite = int(input("Quante uscite? "))',
    'totale = 0',
    'for i in range(1, uscite + 1):',
    '    km = int(input(f"Km dell\'uscita {i}? "))',
    '    totale += km',
    '    print(f"Uscita {i}: {km} km")',
    'print(f"Totale: {totale} km")',
  ].join('\n');
}

const TESTA = 'uscite = int(input("Quante uscite? "))';
const CICLO = 'for i in range(1, uscite + 1):\n    km = int(input(f"Km dell\'uscita {i}? "))';
const CODA = 'print(f"Totale: {totale} km")';

interface ParametriDiario {
  /** I km del mese da raggiungere: sotto il totale del mese mostrato, sopra quello del mese corto. */
  obiettivo: number;
  /** Il mese mostrato (3-5 uscite), uno corto (2 uscite piccole) e uno lungo (6 uscite). */
  mesi: [Mese, Mese, Mese];
}

function parametriDiario(seme: number): ParametriDiario {
  const rnd = generatore(seme);
  const mostrato = kmCasuali(rnd, intero(rnd, 3, 5), 8, 30);
  const corto = kmCasuali(rnd, 2, 5, 9);
  const lungo = kmCasuali(rnd, 6, 8, 30);
  // Una decina tonda sotto il totale mostrato (≥ 24), e sopra quello corto (≤ 18).
  const obiettivo = Math.max(20, 10 * Math.floor((somma(mostrato) - 1) / 10));
  return { obiettivo, mesi: [mostrato, corto, lungo] };
}

function righeDiario(p: ParametriDiario, m: Mese, fase: 1 | 2 | 3 | 4 | 5): string[] {
  const righe: string[] = [];
  let totale = 0;
  m.forEach((km, idx) => {
    const i = idx + 1;
    totale += km;
    if (fase === 1) righe.push(`Uscita ${i}`);
    else if (fase < 4) righe.push(`Uscita ${i}: ${km} km`);
    else righe.push(`Uscita ${i}: ${km} km (finora ${totale} km)`);
  });
  if (fase >= 3) righe.push(`Totale: ${totale} km`);
  if (fase === 5) {
    righe.push(totale >= p.obiettivo ? `Obiettivo di ${p.obiettivo} km raggiunto!` : `Mancano ${p.obiettivo - totale} km all'obiettivo di ${p.obiettivo} km`);
  }
  return righe;
}

function proveDiario(p: ParametriDiario, fase: 1 | 2 | 3 | 4 | 5): Prova[] {
  return p.mesi.map((m) => ({ risposte: risposteDi(m, fase >= 2), output: righeDiario(p, m, fase) }));
}

/** La base comune alle regole dei tre compiti: i dati da `input()`, i km chiesti dentro il ciclo. */
const REGOLA_INPUT = 'Il numero di uscite e i km di ciascuna arrivano da `input()` (con `int()`): non valgono valori scritti nel programma.';
const REGOLA_CICLO = ' Le righe delle uscite le stampa un ciclo `for` che gira tante volte quante sono le uscite risposte.';
const REGOLA_KM = ' La domanda sui km si ripete dentro il ciclo, una volta per giro (i fatti contano le input() dentro i cicli): non vale chiederla una volta sola prima del ciclo.';
const REGOLA_TOTALE = ' Il totale lo tiene una variabile che parte da 0 prima del ciclo e cresce a ogni giro dei km risposti: non vale un numero scritto a mano.';

function regolaDiario(fase: number): string {
  const km = fase >= 2 ? REGOLA_KM : '';
  const totale = fase >= 3 ? REGOLA_TOTALE : '';
  const finora = fase >= 4 ? ' Il totale parziale nella riga è la stessa variabile, aggiornata prima di stamparla.' : '';
  const obiettivo = fase >= 5 ? ' La riga finale la decide un `if` sul totale, dopo il ciclo, con l\'`else`; quanto manca è calcolato dal totale, non scritto a mano.' : '';
  return REGOLA_INPUT + REGOLA_CICLO + km + totale + finora + obiettivo;
}

export function fasiDiario(seme: number): Esercizio[] {
  const p = parametriDiario(seme);
  const [m] = p.mesi;
  const totale = somma(m);
  const fase = (n: 1 | 2 | 3 | 4 | 5, consegna: string, soluzione: string): Esercizio => {
    const prove = proveDiario(p, n);
    return { ...BASE, consegna, outputAtteso: prove[0].output, prove, soluzione, regola: regolaDiario(n) };
  };
  const r1 = `${TESTA}\nfor i in range(1, uscite + 1):\n    print(f"Uscita {i}")`;
  const r2 = `${TESTA}\n${CICLO}\n    print(f"Uscita {i}: {km} km")`;
  const r3 = diarioBase();
  const r4 = `${TESTA}\ntotale = 0\n${CICLO}\n    totale += km\n    print(f"Uscita {i}: {km} km (finora {totale} km)")\n${CODA}`;
  const r5 = `${r4}\nif totale >= ${p.obiettivo}:\n    print("Obiettivo di ${p.obiettivo} km raggiunto!")\nelse:\n    print(f"Mancano {${p.obiettivo} - totale} km all'obiettivo di ${p.obiettivo} km")`;
  return conNote([
    fase(
      1,
      `**Fase 1 — quante uscite.** Il diario chiede quante uscite hai fatto nel mese (con \`int()\`) e stampa una riga per ciascuna: ` +
        `\`Uscita 1\`, \`Uscita 2\`… Il numero di giri è quello risposto. Risposta di prova: **${m.length}**.`,
      r1,
    ),
    fase(
      2,
      `**Fase 2 — i km, uscita per uscita.** A ogni uscita il diario chiede i km di quella uscita: la domanda va **dentro** il ciclo, ` +
        `così si ripete a ogni giro, e la risposta (con \`int()\`) finisce in una variabile. La riga diventa \`Uscita 1: ${m[0]} km\`. ` +
        `Risposte di prova: **${m.length}**, poi ${m.map((k) => `**${k}**`).join(', ')}.`,
      r2,
    ),
    fase(
      3,
      `**Fase 3 — il totale del mese.** Sotto le uscite stampa \`Totale: ${totale} km\`. Una variabile \`totale\` parte da 0 prima del ciclo ` +
        `e a ogni giro cresce dei km appena risposti: stavolta non cresce sempre dello stesso numero. Il \`print\` del totale va fuori dal ciclo.`,
      r3,
    ),
    fase(
      4,
      `**Fase 4 — il totale fin lì.** Ogni riga mostra anche quanto hai pedalato fino a quell'uscita: \`Uscita 1: ${m[0]} km (finora ${m[0]} km)\`, ` +
        `\`Uscita 2: ${m[1]} km (finora ${m[0] + m[1]} km)\`… È la stessa variabile \`totale\`, da aggiornare **prima** di stampare la riga.`,
      r4,
    ),
    fase(
      5,
      `**Fase 5 — l'obiettivo.** Il tuo obiettivo è ${p.obiettivo} km al mese. Dopo il totale, un \`if\` con \`>=\` stampa \`Obiettivo di ${p.obiettivo} km raggiunto!\`; ` +
        `altrimenti (\`else\`) \`Mancano X km all'obiettivo di ${p.obiettivo} km\`, con X calcolato da \`totale\`. Il mese di prova lo raggiunge: deve funzionare anche per un mese che non lo raggiunge.`,
      r5,
    ),
  ], noteDiario(p));
}

export function schedaDiario(seme: number): SchedaCompito {
  const p = parametriDiario(seme);
  const [m] = p.mesi;
  return {
    id: 'diario',
    titolo: 'Il diario delle uscite',
    committente:
      `Vuoi tenere il diario delle tue uscite in bici. A fine mese il programma chiede quante uscite hai fatto e i km di ciascuna, ` +
      `e ti dice quanto hai pedalato e se hai raggiunto l'obiettivo di ${p.obiettivo} km. Nello scontrino chiedevi i dati prima del ciclo: qui una domanda sta nel ciclo.`,
    prodotto:
      'Il diario del mese: una riga per uscita con i km e il totale fin lì, il totale del mese, e se l\'obiettivo è raggiunto. Deve funzionare per qualunque mese: i dati li chiede con input().',
    dati: [`Obiettivo del mese: ${p.obiettivo} km`, `Risposte di prova: ${descriviProva(m)}`],
    outputFinale: righeDiario(p, m, 5),
  };
}

/* ------------------------------------------------------------------------ il record */

/* Le prove del record: nel mese mostrato la più lunga non è la prima (altrimenti basterebbe
 * ricordare la prima risposta), in quello lungo è la prima e la più corta è l'ultima. Tutti
 * i km di un mese sono diversi, così `>` e `>=` trovano lo stesso record. */

interface ParametriRecord {
  mesi: [Mese, Mese, Mese];
}

function spostaMassimo(m: Mese, dove: number): Mese {
  const copia = [...m];
  const i = copia.indexOf(Math.max(...copia));
  [copia[i], copia[dove]] = [copia[dove], copia[i]];
  return copia;
}

function parametriRecord(seme: number): ParametriRecord {
  const rnd = generatore(seme);
  const n = intero(rnd, 3, 5);
  const mostrato = spostaMassimo(kmCasuali(rnd, n, 8, 30, true), intero(rnd, 1, n - 1));
  const corto = kmCasuali(rnd, 2, 8, 30, true);
  const lungo = spostaMassimo(kmCasuali(rnd, 6, 8, 30, true), 0);
  return { mesi: [mostrato, corto, lungo] };
}

function righeRecord(m: Mese, fase: 1 | 2 | 3 | 4 | 5): string[] {
  const righe: string[] = [];
  let record = 0;
  m.forEach((km, idx) => {
    const nuovo = km > record;
    if (nuovo) record = km;
    righe.push(`Uscita ${idx + 1}: ${km} km${fase >= 3 && nuovo ? ' - nuovo record!' : ''}`);
  });
  righe.push(`Totale: ${somma(m)} km`);
  const quale = m.indexOf(record) + 1;
  righe.push(fase === 1 ? `Uscita più lunga: ${record} km` : `Uscita più lunga: la ${quale} (${record} km)`);
  const minimo = Math.min(...m);
  if (fase >= 4) righe.push(`Uscita più corta: la ${m.indexOf(minimo) + 1} (${minimo} km)`);
  if (fase >= 5) righe.push(`Fra la più corta e la più lunga: ${record - minimo} km di differenza`);
  return righe;
}

function proveRecord(p: ParametriRecord, fase: 1 | 2 | 3 | 4 | 5): Prova[] {
  return p.mesi.map((m) => ({ risposte: risposteDi(m, true), output: righeRecord(m, fase) }));
}

function regolaRecord(fase: number): string {
  const base = REGOLA_INPUT + REGOLA_CICLO + REGOLA_KM + REGOLA_TOTALE;
  const record =
    ' La più lunga la trova una variabile che parte da 0 e che, dentro il ciclo, un `if` sostituisce quando i km risposti sono più grandi: non vale il numero scritto a mano.';
  const quale = fase >= 2 ? ' Il numero dell\'uscita lo ricorda una seconda variabile, aggiornata nello stesso `if`.' : '';
  const avviso = fase >= 3 ? ' La scritta del nuovo record la stampa quell\'`if`, e l\'`else` stampa la riga normale: il confronto viene prima dell\'aggiornamento.' : '';
  const minimo = fase >= 4 ? ' La più corta la trova un altro `if` con `<` e una variabile che parte da un numero più grande di qualunque uscita.' : '';
  const differenza = fase >= 5 ? ' La differenza è calcolata dalle due variabili, non scritta a mano.' : '';
  return base + record + quale + avviso + minimo + differenza;
}

export function fasiRecord(seme: number): Esercizio[] {
  const p = parametriRecord(seme);
  const [m] = p.mesi;
  const record = Math.max(...m);
  const quale = m.indexOf(record) + 1;
  const minimo = Math.min(...m);
  const fase = (n: 1 | 2 | 3 | 4 | 5, consegna: string, soluzione: string): Esercizio => {
    const prove = proveRecord(p, n);
    return { ...BASE, consegna, outputAtteso: prove[0].output, prove, soluzione, regola: regolaRecord(n) };
  };
  const testa = `${TESTA}\ntotale = 0\nrecord = 0`;
  const corpo = `${CICLO}\n    totale += km`;
  const r1 = `${testa}\n${corpo}\n    print(f"Uscita {i}: {km} km")\n    if km > record:\n        record = km\n${CODA}\nprint(f"Uscita più lunga: {record} km")`;
  const r2 = `${testa}\n${corpo}\n    print(f"Uscita {i}: {km} km")\n    if km > record:\n        record = km\n        quale = i\n${CODA}\nprint(f"Uscita più lunga: la {quale} ({record} km)")`;
  const ifRecord = `    if km > record:\n        record = km\n        quale = i\n        print(f"Uscita {i}: {km} km - nuovo record!")\n    else:\n        print(f"Uscita {i}: {km} km")`;
  const r3 = `${testa}\n${corpo}\n${ifRecord}\n${CODA}\nprint(f"Uscita più lunga: la {quale} ({record} km)")`;
  const r4 = `${testa}\nminimo = 1000\n${corpo}\n${ifRecord}\n    if km < minimo:\n        minimo = km\n        corta = i\n${CODA}\nprint(f"Uscita più lunga: la {quale} ({record} km)")\nprint(f"Uscita più corta: la {corta} ({minimo} km)")`;
  const r5 = `${r4}\nprint(f"Fra la più corta e la più lunga: {record - minimo} km di differenza")`;
  return conNote([
    {
      ...fase(
        1,
        `**Fase 1 — la più lunga.** Il diario è già scritto: è quello del compito prima. In fondo ci vuole \`Uscita più lunga: ${record} km\`. ` +
          `Una variabile \`record\` parte da 0 prima del ciclo; dentro il ciclo un \`if\` controlla se i km appena risposti sono **più grandi** del record e, se sì, li mette in \`record\`. ` +
          `Non somma: sostituisce. Risposte di prova: **${m.length}**, poi ${m.map((k) => `**${k}**`).join(', ')}.`,
        r1,
      ),
      codiceIniziale: diarioBase(),
    },
    fase(
      2,
      `**Fase 2 — quale uscita.** La riga diventa \`Uscita più lunga: la ${quale} (${record} km)\`: serve una seconda variabile che ricordi il numero dell'uscita, ` +
        `aggiornata nello stesso \`if\`, nello stesso momento.`,
      r2,
    ),
    fase(
      3,
      `**Fase 3 — nuovo record!** Quando un'uscita batte il record, la sua riga lo dice: \`Uscita ${quale}: ${record} km - nuovo record!\` (anche la prima, che batte lo 0). ` +
        `Le altre righe restano come sono: il \`print\` della riga finisce dentro l'\`if\` e un \`else\` stampa quella normale. Attenzione all'ordine: il confronto prima di aggiornare il record.`,
      r3,
    ),
    fase(
      4,
      `**Fase 4 — la più corta.** Dopo la più lunga, \`Uscita più corta: la ${m.indexOf(minimo) + 1} (${minimo} km)\`. Stessa idea al contrario: un altro \`if\` con \`<\`, ` +
        `e una variabile che parte da un numero più grande di qualunque uscita, per esempio 1000, altrimenti nessuna uscita la batte.`,
      r4,
    ),
    fase(
      5,
      `**Fase 5 — la differenza.** Ultima riga: \`Fra la più corta e la più lunga: ${record - minimo} km di differenza\`, calcolata dalle due variabili. ` +
        `Deve funzionare per qualunque mese, anche se la più lunga è la prima uscita.`,
      r5,
    ),
  ], noteRecord(p));
}

export function schedaRecord(seme: number): SchedaCompito {
  const p = parametriRecord(seme);
  const [m] = p.mesi;
  return {
    id: 'record',
    titolo: 'Il record del mese',
    committente:
      'Il diario delle uscite funziona e vuoi che dica anche qual è stata l\'uscita più lunga del mese, quale la più corta, e che festeggi ' +
      'ogni volta che batti il record. Il diario c\'è già: va insegnato al programma a ricordare il migliore, che non è una somma.',
    prodotto:
      'Il diario con il record: una riga per uscita (con «nuovo record!» quando lo batte), il totale, la più lunga e la più corta con il loro numero, la differenza. Deve funzionare per qualunque mese.',
    dati: ['Il record parte da 0; la più corta da un numero grande', `Risposte di prova: ${descriviProva(m)}`],
    outputFinale: righeRecord(m, 5),
  };
}

/* --------------------------------------------------------------------- il conteggio */

/* Le prove del conteggio: il mese mostrato raggiunge l'obiettivo di uscite lunghe e ha
 * almeno una corta; il mese corto ha due uscite corte (contatore a zero); il mese lungo ha
 * una lunga in meno dell'obiettivo. */

const SOGLIE = [15, 20, 25] as const;
const OBIETTIVI = [2, 3] as const;

interface ParametriConteggio {
  /** Da questi km in su l'uscita è «lunga». */
  soglia: number;
  /** Quante uscite lunghe al mese vuole l'allenatore. */
  obiettivo: number;
  mesi: [Mese, Mese, Mese];
}

/** Un mese con `lunghe` uscite lunghe su `n`, mescolate. */
function meseCon(rnd: Rnd, n: number, lunghe: number, soglia: number): Mese {
  const km = [...kmCasuali(rnd, lunghe, soglia, 30), ...kmCasuali(rnd, n - lunghe, 5, soglia - 1)];
  for (let i = km.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [km[i], km[j]] = [km[j], km[i]];
  }
  return km;
}

function parametriConteggio(seme: number): ParametriConteggio {
  const rnd = generatore(seme);
  const soglia = SOGLIE[Math.floor(rnd() * SOGLIE.length)];
  const obiettivo = OBIETTIVI[Math.floor(rnd() * OBIETTIVI.length)];
  const n = intero(rnd, 4, 5);
  return {
    soglia,
    obiettivo,
    mesi: [meseCon(rnd, n, obiettivo + intero(rnd, 0, n - obiettivo - 1), soglia), meseCon(rnd, 2, 0, soglia), meseCon(rnd, 6, obiettivo - 1, soglia)],
  };
}

function righeConteggio(p: ParametriConteggio, m: Mese, fase: 1 | 2 | 3 | 4 | 5): string[] {
  const righe = m.map((km, idx) => `Uscita ${idx + 1}: ${km} km${km >= p.soglia ? ' - lunga!' : ''}`);
  righe.push(`Totale: ${somma(m)} km`);
  const lunghe = m.filter((km) => km >= p.soglia);
  if (fase >= 2) righe.push(`Uscite lunghe: ${lunghe.length}`);
  if (fase >= 3) righe.push(`Uscite corte: ${m.length - lunghe.length}`);
  if (fase >= 4) righe.push(`Km nelle uscite lunghe: ${somma(lunghe)}`);
  if (fase >= 5) {
    righe.push(lunghe.length >= p.obiettivo ? `Obiettivo raggiunto: ${lunghe.length} uscite lunghe` : `Uscite lunghe mancanti: ${p.obiettivo - lunghe.length}`);
  }
  return righe;
}

function proveConteggio(p: ParametriConteggio, fase: 1 | 2 | 3 | 4 | 5): Prova[] {
  return p.mesi.map((m) => ({ risposte: risposteDi(m, true), output: righeConteggio(p, m, fase) }));
}

function regolaConteggio(fase: number): string {
  const base = REGOLA_INPUT + REGOLA_CICLO + REGOLA_KM + REGOLA_TOTALE;
  const lunga = ' La scritta «lunga!» la decide un `if` dentro il ciclo con un confronto sui km risposti.';
  const lunghe = fase >= 2 ? ' Le uscite lunghe le conta una variabile che parte da 0 e cresce di 1 solo nel ramo di quell\'`if`: non vale un numero scritto a mano.' : '';
  const corte = fase >= 3 ? ' Le corte le conta un\'altra variabile, nel ramo `else`.' : '';
  const km = fase >= 4 ? ' I km delle uscite lunghe li accumula una variabile nel ramo dell\'`if`, separata dal totale.' : '';
  const obiettivo = fase >= 5 ? ' La riga finale la decide un `if` sul contatore delle lunghe, dopo il ciclo, con l\'`else`; quante mancano è calcolato, non scritto a mano.' : '';
  return base + lunga + lunghe + corte + km + obiettivo;
}

export function fasiConteggio(seme: number): Esercizio[] {
  const p = parametriConteggio(seme);
  const [m] = p.mesi;
  const lunghe = m.filter((km) => km >= p.soglia);
  const primaLunga = m.findIndex((km) => km >= p.soglia) + 1;
  const fase = (n: 1 | 2 | 3 | 4 | 5, consegna: string, soluzione: string): Esercizio => {
    const prove = proveConteggio(p, n);
    return { ...BASE, consegna, outputAtteso: prove[0].output, prove, soluzione, regola: regolaConteggio(n) };
  };
  const ramo = (dentroIf: string, dentroElse: string) =>
    `${CICLO}\n    totale += km\n    if km >= ${p.soglia}:\n${dentroIf}        print(f"Uscita {i}: {km} km - lunga!")\n    else:\n${dentroElse}        print(f"Uscita {i}: {km} km")\n${CODA}`;
  const r1 = `${TESTA}\ntotale = 0\n${ramo('', '')}`;
  const r2 = `${TESTA}\ntotale = 0\nlunghe = 0\n${ramo('        lunghe += 1\n', '')}\nprint(f"Uscite lunghe: {lunghe}")`;
  const r3 = `${TESTA}\ntotale = 0\nlunghe = 0\ncorte = 0\n${ramo('        lunghe += 1\n', '        corte += 1\n')}\nprint(f"Uscite lunghe: {lunghe}")\nprint(f"Uscite corte: {corte}")`;
  const r4 =
    `${TESTA}\ntotale = 0\nlunghe = 0\ncorte = 0\nkm_lunghe = 0\n${ramo('        lunghe += 1\n        km_lunghe += km\n', '        corte += 1\n')}\n` +
    `print(f"Uscite lunghe: {lunghe}")\nprint(f"Uscite corte: {corte}")\nprint(f"Km nelle uscite lunghe: {km_lunghe}")`;
  const r5 = `${r4}\nif lunghe >= ${p.obiettivo}:\n    print(f"Obiettivo raggiunto: {lunghe} uscite lunghe")\nelse:\n    print(f"Uscite lunghe mancanti: {${p.obiettivo} - lunghe}")`;
  return conNote([
    {
      ...fase(
        1,
        `**Fase 1 — le uscite lunghe.** Il diario è già scritto. Per l'allenatore un'uscita è lunga da ${p.soglia} km in su, e la sua riga lo dice: ` +
          `\`Uscita ${primaLunga}: ${m[primaLunga - 1]} km - lunga!\`. Dentro il ciclo, un \`if\` con \`>=\` sui km appena risposti, e un \`else\` per la riga normale. ` +
          `Risposte di prova: **${m.length}**, poi ${m.map((k) => `**${k}**`).join(', ')}.`,
        r1,
      ),
      codiceIniziale: diarioBase(),
    },
    fase(
      2,
      `**Fase 2 — quante sono.** Dopo il totale, \`Uscite lunghe: ${lunghe.length}\`. Una variabile \`lunghe\` parte da 0 prima del ciclo e cresce di 1 ` +
        `**solo** nel ramo dell'\`if\`: è un contatore che non conta tutti i giri, conta quelli che passano il controllo.`,
      r2,
    ),
    fase(
      3,
      `**Fase 3 — e le corte.** Sotto, \`Uscite corte: ${m.length - lunghe.length}\`: un secondo contatore che cresce nel ramo \`else\`. A ogni giro cresce uno dei due, mai tutti e due.`,
      r3,
    ),
    fase(
      4,
      `**Fase 4 — i km che contano.** Poi \`Km nelle uscite lunghe: ${somma(lunghe)}\`: una variabile che accumula i km, ma solo nel ramo dell'\`if\`. ` +
        `Il \`totale\` continua a sommarli tutti: sono due variabili diverse.`,
      r4,
    ),
    fase(
      5,
      `**Fase 5 — l'obiettivo dell'allenatore.** Vuole almeno ${p.obiettivo} uscite lunghe al mese. Dopo il ciclo, un \`if\` sul contatore: ` +
        `\`Obiettivo raggiunto: ${lunghe.length} uscite lunghe\`, altrimenti \`Uscite lunghe mancanti: X\` con X calcolato. Il mese di prova lo raggiunge; deve funzionare anche per un mese senza nessuna uscita lunga.`,
      r5,
    ),
  ], noteConteggio(p));
}

export function schedaConteggio(seme: number): SchedaCompito {
  const p = parametriConteggio(seme);
  const [m] = p.mesi;
  return {
    id: 'conteggio',
    titolo: 'Le uscite che contano',
    committente:
      `L'allenatore della squadra guarda solo le uscite lunghe, da ${p.soglia} km in su, e ne vuole almeno ${p.obiettivo} al mese. ` +
      'Vuole il tuo diario con il conto delle uscite lunghe e corte, i km fatti in quelle lunghe, e se l\'obiettivo del mese è raggiunto. Il diario c\'è già.',
    prodotto:
      'Il diario con il conteggio: una riga per uscita (con «lunga!» da quelle che contano), il totale, quante lunghe e quante corte, i km delle lunghe, l\'obiettivo. Deve funzionare per qualunque mese.',
    dati: [`Uscita lunga: da ${p.soglia} km in su`, `Obiettivo: almeno ${p.obiettivo} uscite lunghe al mese`, `Risposte di prova: ${descriviProva(m)}`],
    outputFinale: righeConteggio(p, m, 5),
  };
}

/* ------------------------------------------------------------ le note per il tutor */

function noteDiario(p: ParametriDiario): string[] {
  const [m] = p.mesi;
  return [
    `Le uscite si leggono con int(input()) e il ciclo gira range(1, uscite + 1) volte, con il print della f-string. Errori tipici: il numero di giri scritto a mano (${m.length}: cade sulla prova nascosta), range che parte da 0, int dimenticato.`,
    'La domanda dei km va DENTRO il ciclo, rientrata, una per giro: si legge con int(input()) in una variabile e poi il print la usa fra graffe. ' +
      'Errori tipici: la domanda fuori dal ciclo (chiesta una volta sola: il programma stampa sempre lo stesso km o finisce le risposte di prova), il print prima della domanda (usa il km del giro prima), i km scritti a mano.',
    'totale parte da 0 prima del ciclo, dentro cresce di km dopo averli letti, e il print del totale va dopo il ciclo senza rientro. ' +
      'Errori tipici: il print del totale dentro il ciclo (stampato a ogni giro), l\'aumento prima della lettura (somma il valore vecchio), il numero scritto a mano.',
    'Il «finora» è lo stesso totale, stampato dentro il ciclo nella riga dell\'uscita, dopo l\'aumento: leggi km, totale cresce, print. ' +
      'Errori tipici: il print prima dell\'aumento (il finora resta indietro di un\'uscita), una seconda variabile che fa lo stesso lavoro.',
    `Dopo il totale, if totale >= ${p.obiettivo} con il print rientrato, e nell'else l'altra riga con la differenza (${p.obiettivo} meno totale) calcolata. ` +
      'Errori tipici: l\'if dentro il ciclo, > al posto di >=, i numeri scritti a mano (cadono sulle prove nascoste, dove il mese è più corto).',
  ];
}

function noteRecord(p: ParametriRecord): string[] {
  const [m] = p.mesi;
  return [
    'Il diario c\'è già: serve una variabile record che parte da 0 prima del ciclo; dentro, dopo aver letto km, if km > record con sotto record = km; la riga finale fuori dal ciclo con record fra graffe. ' +
      `Errori tipici: record = km senza if (resta l'ultima uscita), l'if fuori dal ciclo (guarda solo l'ultimo km), record rimesso a 0 dentro il ciclo, il record ${Math.max(...m)} cercato a occhio e scritto a mano (cade sulle prove nascoste).`,
    'Una seconda variabile per il numero dell\'uscita, aggiornata nello STESSO if con la variabile del ciclo: due righe rientrate sotto l\'if. ' +
      'Errori tipici: aggiornarla fuori dall\'if (vale sempre l\'ultima uscita), scrivere il numero a mano.',
    'La riga «nuovo record!» va stampata quando l\'if scatta, al posto della riga normale: serve un else con la riga normale. Anche la prima uscita batte lo 0, quindi è un record. ' +
      'Errori tipici: stampare tutte e due le righe per l\'uscita record, >= al posto di > (segnala record anche a parità).',
    'Il minimo si cerca al contrario: una variabile che parte da un numero grande (per esempio 1000) e un if km < minimo che la aggiorna, con la sua variabile per il numero dell\'uscita; la riga va dopo quella della più lunga. ' +
      'Errori tipici: minimo che parte da 0 (nessun km lo batte: resta 0), > al posto di <, l\'if del minimo scritto dentro l\'if del record.',
    `L'ultima riga calcola la differenza (record meno minimo, qui ${Math.max(...m) - Math.min(...m)}) dentro la f-string, dopo il ciclo. Errori tipici: il numero scritto a mano, la sottrazione al contrario.`,
  ];
}

function noteConteggio(p: ParametriConteggio): string[] {
  return [
    `Il diario c'è già: dentro il ciclo, dopo aver letto km, if km >= ${p.soglia} con il print della riga «lunga» rientrato, e nell'else la riga normale. ` +
      'Errori tipici: > al posto di >= (l\'uscita esattamente sulla soglia non conta), la riga normale stampata sempre più quella lunga in aggiunta, l\'if fuori dal ciclo.',
    'Un contatore lunghe che parte da 0 prima del ciclo, cresce di 1 dentro il ramo if (rientrato come il print di quel ramo), e si stampa dopo il ciclo senza rientro. ' +
      'Errori tipici: l\'aumento fuori dall\'if (conta tutte le uscite), il numero scritto a mano, += km al posto di += 1.',
    'Un secondo contatore corte che cresce di 1 nel ramo else: a ogni giro cresce uno solo dei due. ' +
      'Errori tipici: corte calcolato come uscite meno lunghe (passa l\'output, il giudice vuole il contatore nel ramo else), l\'aumento fuori dall\'else.',
    'Un accumulatore dei km delle uscite lunghe: parte da 0 prima del ciclo e cresce di km solo nel ramo if. Errori tipici: += 1 al posto di += km, l\'aumento fuori dall\'if (somma tutti i km), confuso con il totale del mese.',
    `Dopo il ciclo, if sul contatore lunghe >= ${p.obiettivo} con la riga, e nell'else l'altra riga con la differenza (${p.obiettivo} meno lunghe) calcolata. ` +
      'Errori tipici: l\'if dentro il ciclo, il confronto sul totale dei km al posto del contatore, i numeri scritti a mano (cadono sui mesi nascosti).',
  ];
}
