/* I compiti della sezione «Il ciclo while» con il **caso** (PERCORSO.md §22): `random.randint`.
 * Per l'allievo il numero è casuale; per il server è scritto nella prova (`Prova.casuali`),
 * così l'output da confrontare è uno solo e le prove nascoste cambiano anche il "caso".
 *
 *    9. indovina il numero — il numero segreto da `randint`, fase 1 guidata; il `while` con l'`if` dentro e i tentativi
 *   10. il dado            — `randint` **dentro** il ciclo decide quando fermarsi: la sentinella col dado
 *   11. il duello          — la vita che scende di un colpo casuale, l'`if` dentro, il gioco intero
 *
 * Stessa forma degli altri compiti: parametri dal seme, cinque fasi che aggiungono ogni
 * volta un pezzo, la scheda con l'output finale per intero. Modulo puro. */
import { generatore, type Esercizio, type Prova } from '../giro/esercizi';
import type { SchedaCompito } from './compiti';

const base = { tipo: 'progetto' as const, mostraOutput: true, risposta: 'codice' as const };
const somma = (n: number[]) => n.reduce((a, b) => a + b, 0);

/* --------------------------------------------------------------- 9. indovina il numero */

const MASSIMO_SEGRETO = 20;

interface Partita {
  segreto: number;
  tentativi: number[];
}

interface ParametriIndovina {
  /** La partita mostrata e due nascoste: il segreto agli estremi (1 e 20), una in quattro tentativi e una al primo colpo. */
  partite: [Partita, Partita, Partita];
}

function parametriIndovina(seme: number): ParametriIndovina {
  const rnd = generatore(seme);
  // Il segreto mostrato sta in mezzo (4..17), così un tentativo sotto e uno sopra restano fra 1 e 20.
  const segreto = 4 + Math.floor(rnd() * 14);
  const sotto = segreto - (1 + Math.floor(rnd() * 3));
  const sopra = segreto + (1 + Math.floor(rnd() * 3));
  const primi = rnd() < 0.5 ? [sotto, sopra] : [sopra, sotto];
  return {
    partite: [
      { segreto, tentativi: [...primi, segreto] },
      { segreto: 1, tentativi: [10, 5, 3, 1] },
      { segreto: MASSIMO_SEGRETO, tentativi: [MASSIMO_SEGRETO] },
    ],
  };
}

function righeIndovina(g: Partita, fase: 1 | 2 | 3 | 4 | 5): string[] {
  if (fase === 1) return [`Il numero segreto è ${g.segreto}`];
  const righe: string[] = [];
  for (const t of g.tentativi.slice(0, -1)) {
    if (fase === 2) righe.push('No, riprova');
    else righe.push(t < g.segreto ? 'Più alto' : 'Più basso');
  }
  const n = g.tentativi.length;
  righe.push(fase <= 3 ? `Indovinato: era ${g.segreto}!` : `Indovinato: era ${g.segreto}, in ${n} tentativi`);
  if (fase === 5) righe.push(n <= 3 ? 'Bravo, in pochi colpi!' : "Ce l'hai fatta, alla fine");
  return righe;
}

const REGOLA_INDOVINA =
  `Il numero segreto lo dà \`random.randint(1, ${MASSIMO_SEGRETO})\` e non va scritto nel programma. I tentativi arrivano da \`input()\`: uno prima del ciclo e uno in fondo al corpo ` +
  'di un ciclo `while` che gira finché il numero non è quello giusto (non si sa quanti tentativi serviranno: non vale un `for`). I tentativi li conta una variabile.';

export function fasiIndovina(seme: number): Esercizio[] {
  const p = parametriIndovina(seme);
  const [mostrata] = p.partite;
  const b = { ...base, terreno: 'montagna' as const };
  const fase = (n: 1 | 2 | 3 | 4 | 5, consegna: string, soluzione: string, extra: Partial<Esercizio> = {}): Esercizio => {
    const prove: Prova[] = p.partite.map((g) => ({ risposte: n === 1 ? [] : g.tentativi.map(String), casuali: [g.segreto], output: righeIndovina(g, n) }));
    return { ...b, consegna, outputAtteso: prove[0].output, prove, soluzione, regola: REGOLA_INDOVINA, ...extra };
  };
  const testa = `import random\nsegreto = random.randint(1, ${MASSIMO_SEGRETO})`;
  const domanda = 'numero = int(input("Numero? "))';
  const fine = 'print(f"Indovinato: era {segreto}!")';
  const r2 = `${testa}\n${domanda}\nwhile numero != segreto:\n    print("No, riprova")\n    ${domanda}\n${fine}`;
  const r3 = r2.replace('    print("No, riprova")', '    if numero < segreto:\n        print("Più alto")\n    else:\n        print("Più basso")');
  const r4 = r3
    .replace(`${domanda}\nwhile`, `${domanda}\ntentativi = 1\nwhile`)
    .replace(`    ${domanda}\n${fine}`, `    ${domanda}\n    tentativi += 1\nprint(f"Indovinato: era {segreto}, in {tentativi} tentativi")`);
  const r5 = `${r4}\nif tentativi <= 3:\n    print("Bravo, in pochi colpi!")\nelse:\n    print("Ce l'hai fatta, alla fine")`;
  const tentativi = mostrata.tentativi;
  return [
    fase(
      1,
      `**Fase 1 — il numero segreto.** Il computer sceglie un numero a caso fra 1 e ${MASSIMO_SEGRETO}: lo fa \`random.randint(1, ${MASSIMO_SEGRETO})\`, che funziona solo se in cima c'è \`import random\`. ` +
        `È già scritto: tu stampa \`Il numero segreto è ${mostrata.segreto}\` usando la variabile, per vedere che funziona. Nella prova il numero è **${mostrata.segreto}**, ` +
        `ma il programma viene provato anche con altri numeri: non scriverlo a mano.`,
      `${testa}\nprint(f"Il numero segreto è {segreto}")`,
      { codiceIniziale: `${testa}\n# stampa il numero segreto, con una f-string: serve per provare, alla fase dopo lo togliamo` },
    ),
    fase(
      2,
      `**Fase 2 — finché non indovini.** Togli la stampa del segreto (altrimenti non è un gioco). Chiedi un numero con \`input()\` e \`int()\` prima del ciclo; ` +
        `il \`while\` gira finché \`numero\` è diverso da \`segreto\`: dentro stampa \`No, riprova\` e richiede il numero. Fuori, \`Indovinato: era ${mostrata.segreto}!\` (con la variabile). ` +
        `Tentativi di prova: ${tentativi.map((t) => `**${t}**`).join(', ')} (il segreto è ${mostrata.segreto}).`,
      r2,
    ),
    fase(
      3,
      `**Fase 3 — più alto, più basso.** Al posto di \`No, riprova\`, un \`if\` dentro il ciclo: se il numero è minore del segreto stampa \`Più alto\`, altrimenti \`Più basso\`.`,
      r3,
    ),
    fase(
      4,
      `**Fase 4 — i tentativi.** Una variabile \`tentativi\` parte da 1 e cresce di 1 a ogni giro. La riga finale diventa \`Indovinato: era ${mostrata.segreto}, in ${tentativi.length} tentativi\`.`,
      r4,
    ),
    fase(
      5,
      `**Fase 5 — il giudizio.** Dopo il ciclo, un \`if\`: se i tentativi sono al massimo 3 stampa \`Bravo, in pochi colpi!\`, altrimenti \`Ce l'hai fatta, alla fine\`.`,
      r5,
      { regola: REGOLA_INDOVINA + ' Il giudizio lo decide un `if` fuori dal ciclo sui tentativi.' },
    ),
  ];
}

export function schedaIndovina(seme: number): SchedaCompito {
  const p = parametriIndovina(seme);
  const [mostrata] = p.partite;
  return {
    id: 'indovina',
    titolo: 'Indovina il numero',
    committente:
      `Il gioco classico: il computer pensa un numero fra 1 e ${MASSIMO_SEGRETO}, tu provi a indovinarlo e lui ti dice «più alto» o «più basso» finché non ci arrivi, ` +
      `contando i tentativi. Il numero lo sceglie a caso con random.randint: nella prova è ${mostrata.segreto}, ma il programma deve funzionare con qualunque numero esca.`,
    prodotto: 'Il gioco: gli aiuti a ogni tentativo, in quanti tentativi hai indovinato, il giudizio. Il segreto viene da randint, i tentativi da input().',
    dati: [`Numeri possibili: da 1 a ${MASSIMO_SEGRETO}`, `Segreto di prova: ${mostrata.segreto}`, `Tentativi di prova: ${mostrata.tentativi.join(' · ')}`],
    outputFinale: righeIndovina(mostrata, 5),
  };
}

/* ---------------------------------------------------------------------- 10. il dado */

interface ParametriDado {
  gioco: string;
  /** I lanci delle prove: la sequenza mostrata (3..5 lanci non 6, poi il 6), il 6 subito, due lanci e il 6. */
  lanci: [number[], number[], number[]];
}

const GIOCHI = ['il gioco dell\'oca', 'Monopoli', 'il gioco delle pulci', 'Risiko', 'la tombola dei dadi'] as const;

function parametriDado(seme: number): ParametriDado {
  const rnd = generatore(seme);
  const gioco = GIOCHI[Math.floor(rnd() * GIOCHI.length)];
  const quanti = 3 + Math.floor(rnd() * 3);
  const mostrata = Array.from({ length: quanti }, () => 1 + Math.floor(rnd() * 5));
  mostrata.push(6);
  const breve = [1 + Math.floor(rnd() * 5), 6];
  return { gioco, lanci: [mostrata, [6], breve] };
}

function righeDado(lanci: number[], fase: 1 | 2 | 3 | 4 | 5): string[] {
  if (fase === 1) return [`Hai fatto ${lanci[0]}`];
  const righe: string[] = [];
  lanci.slice(0, -1).forEach((d, i) => righe.push(fase >= 4 ? `Lancio ${i + 1}: ${d}, ritira` : `Hai fatto ${d}, ritira`));
  righe.push('Sei! Si parte!');
  if (fase >= 3) righe.push(`Partito al lancio ${lanci.length}`);
  if (fase === 5) righe.push(lanci.length > 3 ? 'Che sfortuna, quanto ci hai messo!' : 'Pochi lanci, bravo!');
  return righe;
}

const REGOLA_DADO =
  'Il dado lo tira `random.randint(1, 6)`: una volta prima del ciclo e di nuovo in fondo al corpo di un ciclo `while` che gira finché non esce 6. ' +
  'Non si sa quanti lanci serviranno (non vale un `for`) e i numeri non vanno scritti nel programma; i lanci li conta una variabile.';

export function fasiDado(seme: number): Esercizio[] {
  const p = parametriDado(seme);
  const [mostrati] = p.lanci;
  const b = { ...base, terreno: 'pianura' as const };
  const fase = (n: 1 | 2 | 3 | 4 | 5, consegna: string, soluzione: string, extra: Partial<Esercizio> = {}): Esercizio => {
    const prove: Prova[] = p.lanci.map((lanci) => ({ risposte: [], casuali: n === 1 ? [lanci[0]] : lanci, output: righeDado(lanci, n) }));
    return { ...b, consegna, outputAtteso: prove[0].output, prove, soluzione, regola: REGOLA_DADO, ...extra };
  };
  const tiro = 'dado = random.randint(1, 6)';
  const r1 = `import random\n${tiro}\nprint(f"Hai fatto {dado}")`;
  const r2 = `import random\n${tiro}\nwhile dado != 6:\n    print(f"Hai fatto {dado}, ritira")\n    ${tiro}\nprint("Sei! Si parte!")`;
  const r3 = `import random\n${tiro}\nlanci = 1\nwhile dado != 6:\n    print(f"Hai fatto {dado}, ritira")\n    ${tiro}\n    lanci += 1\nprint("Sei! Si parte!")\nprint(f"Partito al lancio {lanci}")`;
  const r4 = r3.replace('print(f"Hai fatto {dado}, ritira")', 'print(f"Lancio {lanci}: {dado}, ritira")');
  const r5 = `${r4}\nif lanci > 3:\n    print("Che sfortuna, quanto ci hai messo!")\nelse:\n    print("Pochi lanci, bravo!")`;
  return [
    fase(
      1,
      `**Fase 1 — un lancio.** Tira il dado con \`random.randint(1, 6)\` (con \`import random\` in cima) e stampa \`Hai fatto ${mostrati[0]}\`. ` +
        `Nella prova esce **${mostrati[0]}**, ma il programma viene provato anche con altri numeri.`,
      r1,
    ),
    fase(
      2,
      `**Fase 2 — finché non esce il 6.** Per partire serve un 6. Il primo tiro sta prima del ciclo; il \`while\` gira finché \`dado\` è diverso da 6: dentro stampa ` +
        `\`Hai fatto ${mostrati[0]}, ritira\` e **ritira** il dado in fondo al corpo (di nuovo \`randint\`). Fuori, \`Sei! Si parte!\`. È la cassa del bar con il dado al posto della domanda. ` +
        `Lanci di prova: ${mostrati.map((d) => `**${d}**`).join(', ')}.`,
      r2,
    ),
    fase(3, `**Fase 3 — quanti lanci.** Una variabile \`lanci\` parte da 1 e cresce a ogni giro. Dopo \`Sei! Si parte!\` stampa \`Partito al lancio ${mostrati.length}\`.`, r3),
    fase(4, `**Fase 4 — numerati.** Le righe diventano \`Lancio 1: ${mostrati[0]}, ritira\`, \`Lancio 2: ${mostrati[1]}, ritira\`… con il contatore.`, r4),
    fase(
      5,
      `**Fase 5 — fortuna.** Dopo il ciclo, un \`if\`: se i lanci sono più di 3 stampa \`Che sfortuna, quanto ci hai messo!\`, altrimenti \`Pochi lanci, bravo!\`.`,
      r5,
      { regola: REGOLA_DADO + ' La riga finale la decide un `if` fuori dal ciclo sui lanci.' },
    ),
  ];
}

export function schedaDado(seme: number): SchedaCompito {
  const p = parametriDado(seme);
  const [mostrati] = p.lanci;
  return {
    id: 'dado',
    titolo: 'Il dado per partire',
    committente:
      `Per cominciare ${p.gioco} serve un 6 al dado: si tira finché non esce. Il programma tira il dado con random.randint, stampa ogni lancio, ` +
      `conta quanti ne servono e dice se sei stato fortunato. Quante volte si tira non si sa: lo decide il dado.`,
    prodotto: 'I lanci numerati, il 6 che fa partire, al lancio numero quanti, il giudizio. Il dado è randint, dentro il ciclo.',
    dati: [`Serve: il 6`, `Lanci di prova: ${mostrati.join(' · ')}`],
    outputFinale: righeDado(mostrati, 5),
  };
}

/* -------------------------------------------------------------------- 11. il duello */

const DRAGHI = ['Fumone', 'Bracefredda', 'Scaglia', 'Vulcan', 'Nebbia'] as const;
const VITE = [35, 40, 45, 50, 55, 60] as const;
const COLPO_MIN = 5;
const COLPO_MAX = 15;
const CRITICO = 12;

interface ParametriDuello {
  drago: string;
  vita: number;
  /** I colpi delle prove: la sequenza mostrata (colpi da 8 a 15, almeno un critico, l'ultimo va sotto zero), tutti da 15, tutti da 10. */
  colpi: [number[], number[], number[]];
}

function colpiFissi(vita: number, colpo: number): number[] {
  const out: number[] = [];
  for (let resta = vita; resta > 0; resta -= colpo) out.push(colpo);
  return out;
}

function parametriDuello(seme: number): ParametriDuello {
  const rnd = generatore(seme);
  const drago = DRAGHI[Math.floor(rnd() * DRAGHI.length)];
  const vita = VITE[Math.floor(rnd() * VITE.length)];
  let mostrata: number[] = [];
  for (let prova = 0; prova < 30; prova++) {
    mostrata = [];
    let resta = vita;
    while (resta > 0) {
      const c = 8 + Math.floor(rnd() * (COLPO_MAX - 8 + 1));
      mostrata.push(c);
      resta -= c;
    }
    // Serve un critico e la vita che va sotto zero, così alla fase 4 e 5 si vede qualcosa già nella prova mostrata.
    if (resta < 0 && mostrata.some((c) => c >= CRITICO)) break;
  }
  return { drago, vita, colpi: [mostrata, colpiFissi(vita, 15), colpiFissi(vita, 10)] };
}

function righeDuello(p: ParametriDuello, colpi: number[], fase: 1 | 2 | 3 | 4 | 5): string[] {
  const righe: string[] = [];
  let vita = p.vita;
  const usati = fase === 1 ? colpi.slice(0, 1) : colpi;
  for (const c of usati) {
    vita -= c;
    if (fase >= 4 && vita < 0) vita = 0;
    righe.push(`Colpo da ${c}: a ${p.drago} restano ${vita} punti`);
    if (fase === 5 && c >= CRITICO) righe.push('Colpo critico!');
  }
  if (fase >= 2) righe.push(`${p.drago} è sconfitto!`);
  if (fase >= 3) righe.push(`Sconfitto in ${usati.length} colpi`);
  return righe;
}

const REGOLA_DUELLO =
  `I colpi li dà \`random.randint(${COLPO_MIN}, ${COLPO_MAX})\` dentro un ciclo \`while\` che gira finché la vita del drago è sopra zero; la vita scende del colpo (\`-=\`). ` +
  'Non si sa quanti colpi serviranno (non vale un `for`) e i numeri non vanno scritti nel programma; i colpi li conta una variabile.';

export function fasiDuello(seme: number): Esercizio[] {
  const p = parametriDuello(seme);
  const { drago, vita } = p;
  const [mostrati] = p.colpi;
  const b = { ...base, terreno: 'montagna' as const };
  const fase = (n: 1 | 2 | 3 | 4 | 5, consegna: string, soluzione: string, extra: Partial<Esercizio> = {}): Esercizio => {
    const prove: Prova[] = p.colpi.map((colpi) => ({ risposte: [], casuali: n === 1 ? colpi.slice(0, 1) : colpi, output: righeDuello(p, colpi, n) }));
    return { ...b, consegna, outputAtteso: prove[0].output, prove, soluzione, regola: REGOLA_DUELLO, ...extra };
  };
  const tiro = `colpo = random.randint(${COLPO_MIN}, ${COLPO_MAX})`;
  const riga = `print(f"Colpo da {colpo}: a ${drago} restano {vita} punti")`;
  const r1 = `import random\nvita = ${vita}\n${tiro}\nvita -= colpo\n${riga}`;
  const r2 = `import random\nvita = ${vita}\nwhile vita > 0:\n    ${tiro}\n    vita -= colpo\n    ${riga}\nprint("${drago} è sconfitto!")`;
  const r3 = `import random\nvita = ${vita}\ncolpi = 0\nwhile vita > 0:\n    ${tiro}\n    vita -= colpo\n    colpi += 1\n    ${riga}\nprint("${drago} è sconfitto!")\nprint(f"Sconfitto in {colpi} colpi")`;
  const r4 = r3.replace(`    vita -= colpo\n`, `    vita -= colpo\n    if vita < 0:\n        vita = 0\n`);
  const r5 = r4.replace(`    ${riga}\n`, `    ${riga}\n    if colpo >= ${CRITICO}:\n        print("Colpo critico!")\n`);
  return [
    fase(
      1,
      `**Fase 1 — un colpo.** ${drago} ha ${vita} punti vita. Il tuo colpo vale a caso da ${COLPO_MIN} a ${COLPO_MAX}: \`random.randint(${COLPO_MIN}, ${COLPO_MAX})\` (con \`import random\`). ` +
        `Togli il colpo dalla vita (\`-=\`) e stampa \`Colpo da ${mostrati[0]}: a ${drago} restano ${vita - mostrati[0]} punti\`. Nella prova il colpo è **${mostrati[0]}**.`,
      r1,
    ),
    fase(
      2,
      `**Fase 2 — finché è in piedi.** Metti colpo, sottrazione e stampa dentro un \`while\` che gira finché \`vita\` è sopra 0: a ogni giro un colpo nuovo. ` +
        `Fuori dal ciclo, \`${drago} è sconfitto!\`. Colpi di prova: ${mostrati.map((c) => `**${c}**`).join(', ')}. (L'ultima riga va sotto zero: lo sistemiamo alla fase 4.)`,
      r2,
    ),
    fase(3, `**Fase 3 — quanti colpi.** Una variabile conta i colpi, uno per giro. Dopo la sconfitta stampa \`Sconfitto in ${mostrati.length} colpi\`.`, r3),
    fase(
      4,
      `**Fase 4 — mai sotto zero.** I punti vita non possono essere negativi. Dentro il ciclo, dopo la sottrazione e prima del \`print\`, un \`if\`: se \`vita\` è minore di 0, ` +
        `\`vita\` diventa 0. L'ultima riga dice \`restano 0 punti\`.`,
      r4,
    ),
    fase(
      5,
      `**Fase 5 — il colpo critico.** Dopo la riga del colpo, un altro \`if\`: se il colpo è almeno ${CRITICO} stampa \`Colpo critico!\`.`,
      r5,
      { regola: REGOLA_DUELLO + ' La vita non va sotto zero e il colpo critico si segnala con `if` dentro il ciclo.' },
    ),
  ];
}

export function schedaDuello(seme: number): SchedaCompito {
  const p = parametriDuello(seme);
  const [mostrati] = p.colpi;
  return {
    id: 'duello',
    titolo: 'Il duello con il drago',
    committente:
      `Un videogioco a turni: il drago ${p.drago} ha ${p.vita} punti vita e ogni tuo colpo gliene toglie un numero a caso da ${COLPO_MIN} a ${COLPO_MAX}. ` +
      `Il programma gioca il duello colpo dopo colpo finché il drago è in piedi, conta i colpi e segnala quelli critici. Quanti colpi servono lo decide il caso.`,
    prodotto: 'Il duello colpo per colpo con i punti che restano, «Colpo critico!» sui colpi forti, la sconfitta e in quanti colpi. I colpi sono randint, dentro il ciclo.',
    dati: [`Vita di ${p.drago}: ${p.vita} punti`, `Colpo: da ${COLPO_MIN} a ${COLPO_MAX}, critico da ${CRITICO}`, `Colpi di prova: ${mostrati.join(' · ')}`],
    outputFinale: righeDuello(p, mostrati, 5),
  };
}
