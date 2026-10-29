/* I compiti della sezione «Il ciclo while» sulle **risposte** (PERCORSO.md §22): il ciclo
 * gira finché la risposta di `input()` non dice di fermarsi.
 *
 *   3. la parola d'ordine — richiedi finché non è giusta: il `while` con `input()` più corto che c'è
 *   5. la cassa del bar   — la sentinella (0 per chiudere), con totale e contatore; fase 1 guidata
 *
 * Stessa forma degli altri compiti: parametri dal seme, cinque fasi che aggiungono ogni
 * volta un pezzo, la scheda con l'output finale per intero. Modulo puro. */
import { generatore, type Esercizio, type Prova } from '../giro/esercizi';
import type { SchedaCompito } from './compiti';

const base = { tipo: 'progetto' as const, mostraOutput: true, risposta: 'codice' as const };

/* --------------------------------------------------------------- 3. la parola d'ordine */

const PAROLE = ['pedale', 'salita', 'maglia', 'borraccia', 'traguardo', 'tandem'] as const;
const SBAGLIATE = ['pizza', 'gatto', 'estate', 'ciao', 'luna', 'sole', 'nuvola', 'treno'] as const;

interface ParametriParola {
  parola: string;
  /** Quattro parole sbagliate distinte: tre per la prova mostrata, una per la prova nascosta da un errore. */
  sbagliate: string[];
}

function parametriParola(seme: number): ParametriParola {
  const rnd = generatore(seme);
  const parola = PAROLE[Math.floor(rnd() * PAROLE.length)];
  const scelte: string[] = [];
  while (scelte.length < 4) {
    const s = SBAGLIATE[Math.floor(rnd() * SBAGLIATE.length)];
    if (!scelte.includes(s)) scelte.push(s);
  }
  return { parola, sbagliate: scelte };
}

/** Gli errori delle tre prove: tre (mostrata), nessuno, uno. */
function tentativiParola(p: ParametriParola): string[][] {
  return [p.sbagliate.slice(0, 3), [], [p.sbagliate[3]]];
}

function righeParola(p: ParametriParola, sbagliate: string[], fase: 1 | 2 | 3 | 4 | 5): string[] {
  const righe: string[] = [];
  sbagliate.forEach((s, idx) => {
    righe.push(fase <= 2 ? 'Sbagliata, riprova' : `Sbagliata: ${s} non è la parola`);
    if (fase >= 4 && idx + 1 === 3) righe.push('Chiama il prof!');
  });
  const tentativi = sbagliate.length + 1;
  righe.push(fase === 1 ? 'Porta aperta!' : `Porta aperta al tentativo ${tentativi}`);
  if (fase === 5 && tentativi > 2) righe.push('Troppi tentativi: impara la parola!');
  return righe;
}

const REGOLA_PAROLA =
  'La domanda si ripete dentro un ciclo `while` che gira finché la risposta non è la parola giusta: la risposta arriva da `input()`, una domanda per tentativo ' +
  '(una prima del ciclo e una in fondo al corpo), e il programma non sa prima quanti tentativi serviranno: non vale un `for`. I tentativi li conta una variabile che cresce di 1 a ogni giro.';

export function fasiParola(seme: number): Esercizio[] {
  const p = parametriParola(seme);
  const { parola } = p;
  const b = { ...base, terreno: 'pianura' as const };
  const prove = (fase: 1 | 2 | 3 | 4 | 5): Prova[] => tentativiParola(p).map((sb) => ({ risposte: [...sb, parola], output: righeParola(p, sb, fase) }));
  const domanda = `parola = input("Parola d'ordine? ")`;
  const [mostrate] = tentativiParola(p);
  const fase = (n: 1 | 2 | 3 | 4 | 5, consegna: string, soluzione: string, regola = REGOLA_PAROLA): Esercizio => {
    const pr = prove(n);
    return { ...b, consegna, outputAtteso: pr[0].output, prove: pr, soluzione, regola };
  };
  const r2 = `${domanda}\ntentativi = 1\nwhile parola != "${parola}":\n    print("Sbagliata, riprova")\n    ${domanda}\n    tentativi += 1\nprint(f"Porta aperta al tentativo {tentativi}")`;
  const r3 = r2.replace('print("Sbagliata, riprova")', 'print(f"Sbagliata: {parola} non è la parola")');
  const r4 = r3.replace(`    ${domanda}\n    tentativi += 1`, `    if tentativi == 3:\n        print("Chiama il prof!")\n    ${domanda}\n    tentativi += 1`);
  const r5 = `${r4}\nif tentativi > 2:\n    print("Troppi tentativi: impara la parola!")`;
  return [
    fase(
      1,
      `**Fase 1 — richiedi finché non è giusta.** La parola d'ordine è \`${parola}\`. Chiedila con \`input()\` **prima** del ciclo; poi un \`while\` gira ` +
        `finché la risposta è **diversa** da \`${parola}\`: dentro stampa \`Sbagliata, riprova\` e **richiede** la parola, in fondo al corpo. ` +
        `Quando esce dal ciclo stampa \`Porta aperta!\`. Risposte di prova: ${mostrate.map((s) => `**${s}**`).join(', ')}, poi **${parola}**.`,
      `${domanda}\nwhile parola != "${parola}":\n    print("Sbagliata, riprova")\n    ${domanda}\nprint("Porta aperta!")`,
    ),
    fase(
      2,
      `**Fase 2 — i tentativi.** Una variabile \`tentativi\` parte da 1 (il primo lo fa prima del ciclo) e cresce di 1 a ogni giro. ` +
        `L'ultima riga diventa \`Porta aperta al tentativo ${mostrate.length + 1}\`.`,
      r2,
    ),
    fase(
      3,
      `**Fase 3 — che cosa ha scritto.** Il messaggio dice la parola sbagliata: \`Sbagliata: ${mostrate[0]} non è la parola\`. Una f-string con la variabile della risposta.`,
      r3,
    ),
    fase(
      4,
      `**Fase 4 — al terzo errore.** Dentro il ciclo, dopo il messaggio, un \`if\`: se \`tentativi\` è 3 stampa \`Chiama il prof!\`. ` +
        `Con le risposte di prova compare una volta; se si indovina prima, mai.`,
      r4,
    ),
    fase(
      5,
      `**Fase 5 — il giudizio.** Dopo il ciclo, un \`if\` sui tentativi: se sono più di 2 stampa \`Troppi tentativi: impara la parola!\`, altrimenti niente.`,
      r5,
      REGOLA_PAROLA + ' La riga finale la decide un `if` fuori dal ciclo sui tentativi.',
    ),
  ];
}

export function schedaParola(seme: number): SchedaCompito {
  const p = parametriParola(seme);
  const [mostrate] = tentativiParola(p);
  return {
    id: 'parola',
    titolo: "La parola d'ordine",
    committente:
      `Il laboratorio ha una porta con la parola d'ordine: il programma la chiede e la richiede finché non è giusta, conta i tentativi ` +
      `e al terzo errore chiama il prof. Non si sa quante volte servirà chiedere: è il ciclo che decide quando fermarsi.`,
    prodotto: 'La porta: i messaggi di errore, «Chiama il prof!» al terzo, la porta che si apre con il numero del tentativo, il giudizio finale.',
    dati: [`Parola d'ordine: ${p.parola}`, `Risposte di prova: ${mostrate.join(' · ')} · ${p.parola}`],
    outputFinale: righeParola(p, mostrate, 5),
  };
}

/* ------------------------------------------------------------------ 5. la cassa del bar */

/* La sentinella: si legge finché non arriva lo 0. La fase 1 è guidata, perché il gesto
 * difficile è uno solo: la domanda ripetuta in fondo al corpo. */

const PREZZI_CASSA = [1, 2, 3, 4, 5] as const;

interface ParametriCassa {
  /** Gli articoli delle prove: tre (mostrata), uno, cinque. */
  spese: [number[], number[], number[]];
}

function parametriCassa(seme: number): ParametriCassa {
  const rnd = generatore(seme);
  const prezzi = (n: number) => Array.from({ length: n }, () => PREZZI_CASSA[Math.floor(rnd() * PREZZI_CASSA.length)]);
  return { spese: [prezzi(3), prezzi(1), prezzi(5)] };
}

const somma = (n: number[]) => n.reduce((a, b) => a + b, 0);

/** Quanto paga il cliente: la cifra tonda (multiplo di 5) che copre il totale con un po' di resto. */
function pagatoCassa(prezzi: number[]): number {
  return Math.ceil((somma(prezzi) + 1) / 5) * 5;
}

function righeCassa(prezzi: number[], fase: 1 | 2 | 3 | 4 | 5): string[] {
  const righe = prezzi.map((pr, i) => (fase >= 4 ? `Articolo ${i + 1}: ${pr} €` : `Articolo: ${pr} €`));
  if (fase >= 3) righe.push(`Articoli: ${prezzi.length}`);
  if (fase >= 2) righe.push(`Totale: ${somma(prezzi)} €`);
  if (fase === 5) righe.push(`Resto: ${pagatoCassa(prezzi) - somma(prezzi)} €`);
  return righe;
}

const REGOLA_CASSA =
  'Gli articoli li legge un ciclo `while` con `input()` dentro, che si ferma quando il prezzo è 0 (la sentinella): la domanda sta una volta prima del ciclo ' +
  'e si ripete in fondo al corpo. Il programma non sa prima quanti articoli saranno: non vale un `for`, non valgono prezzi scritti nel programma. ' +
  'Il totale e il numero degli articoli li tengono variabili che partono da 0 e crescono a ogni giro.';

export function fasiCassa(seme: number): Esercizio[] {
  const p = parametriCassa(seme);
  const [mostrati] = p.spese;
  const b = { ...base, terreno: 'pianura' as const };
  const prove = (fase: 1 | 2 | 3 | 4 | 5): Prova[] =>
    p.spese.map((prezzi) => ({
      risposte: [...prezzi.map(String), '0', ...(fase === 5 ? [String(pagatoCassa(prezzi))] : [])],
      output: righeCassa(prezzi, fase),
    }));
  const fase = (n: 1 | 2 | 3 | 4 | 5, consegna: string, soluzione: string, extra: Partial<Esercizio> = {}): Esercizio => {
    const pr = prove(n);
    return { ...b, consegna, outputAtteso: pr[0].output, prove: pr, soluzione, regola: REGOLA_CASSA, ...extra };
  };
  const domanda = 'prezzo = int(input("Prezzo? "))';
  const r1 = `${domanda}\nwhile prezzo != 0:\n    print(f"Articolo: {prezzo} €")\n    ${domanda}`;
  const r2 = `totale = 0\n${domanda}\nwhile prezzo != 0:\n    print(f"Articolo: {prezzo} €")\n    totale += prezzo\n    ${domanda}\nprint(f"Totale: {totale} €")`;
  const r3 =
    `totale = 0\narticoli = 0\n${domanda}\nwhile prezzo != 0:\n    print(f"Articolo: {prezzo} €")\n    totale += prezzo\n    articoli += 1\n    ${domanda}\n` +
    `print(f"Articoli: {articoli}")\nprint(f"Totale: {totale} €")`;
  const r4 =
    `totale = 0\narticoli = 0\n${domanda}\nwhile prezzo != 0:\n    articoli += 1\n    print(f"Articolo {articoli}: {prezzo} €")\n    totale += prezzo\n    ${domanda}\n` +
    `print(f"Articoli: {articoli}")\nprint(f"Totale: {totale} €")`;
  const r5 = `${r4}\npagato = int(input("Quanto paga? "))\nprint(f"Resto: {pagato - totale} €")`;
  const tot = somma(mostrati);
  return [
    fase(
      1,
      `**Fase 1 — la sentinella.** La cassa chiede un prezzo alla volta e si ferma quando il barista digita **0**. Il codice è quasi pronto: la prima domanda ` +
        `sta prima del ciclo, il \`while\` gira finché il prezzo è diverso da 0 e stampa l'articolo. Manca la riga che **richiede il prezzo** in fondo al corpo: ` +
        `senza, \`prezzo\` resta quello e il ciclo non si ferma mai. Scrivila al posto del commento. Risposte di prova: ${mostrati.map((x) => `**${x}**`).join(', ')}, poi **0**.`,
      r1,
      { codiceIniziale: `${domanda}\nwhile prezzo != 0:\n    print(f"Articolo: {prezzo} €")\n    # qui manca la riga che chiede il prezzo dell'articolo dopo` },
    ),
    fase(2, `**Fase 2 — il totale.** Una variabile \`totale\` parte da 0 prima del ciclo e cresce del prezzo a ogni giro. Dopo il ciclo: \`Totale: ${tot} €\`.`, r2),
    fase(3, `**Fase 3 — quanti articoli.** Una seconda variabile conta gli articoli, uno per giro. Prima del totale stampa \`Articoli: ${mostrati.length}\`.`, r3),
    fase(
      4,
      `**Fase 4 — numerati.** Le righe diventano \`Articolo 1: ${mostrati[0]} €\`, \`Articolo 2: ${mostrati[1]} €\`… Usa il contatore: deve crescere **prima** del \`print\`, ` +
        `altrimenti il primo articolo è lo 0.`,
      r4,
    ),
    fase(
      5,
      `**Fase 5 — il resto.** Chiuso lo scontrino, chiedi quanto paga (con \`int()\`) e stampa \`Resto: ${pagatoCassa(mostrati) - tot} €\`. ` +
        `Risposte di prova: ${mostrati.map((x) => `**${x}**`).join(', ')}, **0**, poi **${pagatoCassa(mostrati)}**.`,
      r5,
      { regola: REGOLA_CASSA + ' Quanto paga arriva da `input()` dopo il ciclo.' },
    ),
  ];
}

export function schedaCassa(seme: number): SchedaCompito {
  const p = parametriCassa(seme);
  const [mostrati] = p.spese;
  return {
    id: 'cassa',
    titolo: 'La cassa del bar',
    committente:
      `Il bar della scuola vuole una cassa: il barista digita i prezzi uno alla volta e, quando ha finito, digita 0. La cassa stampa gli articoli numerati, ` +
      `quanti sono, il totale e il resto. Nello scontrino di prima i panini erano uguali e il numero si chiedeva; qui ogni articolo ha il suo prezzo e non si sa quanti sono.`,
    prodotto: 'Lo scontrino: gli articoli numerati con il prezzo, quanti sono, il totale, il resto. Si ferma allo 0: la sentinella.',
    dati: [`Prezzi di prova: ${mostrati.join(' · ')} € (poi 0)`, `Paga: ${pagatoCassa(mostrati)} €`],
    outputFinale: righeCassa(mostrati, 5),
  };
}
