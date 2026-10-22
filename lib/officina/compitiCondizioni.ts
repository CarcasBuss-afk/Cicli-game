/* I compiti dell'Officina sulle condizioni (PERCORSO.md §17): dopo i sette sul `for`,
 * l'idea nuova è decidere con un `if`. Si riparte dallo scontrino del bar, che l'allievo
 * conosce: la fase 1 trova nell'editor il programma già scritto (`codiceIniziale`) e tutto
 * il lavoro è sulla condizione. Prima l'`if` dentro il ciclo, legato alla variabile del
 * ciclo; poi l'`else`; poi l'accumulo che dipende dal ramo; infine l'`if` fuori dal ciclo,
 * sul totale. Sono i due gesti che serviranno al `while`.
 *
 * Come nello scontrino, ogni fase gira anche con clienti nascosti: uno senza omaggio e
 * senza sconto, uno con l'omaggio ma sotto la soglia. Chi scrive l'omaggio a mano cade lì.
 *
 * Modulo puro. */
import { generatore, type Esercizio, type Prova } from '../giro/esercizi';
import type { SchedaCompito } from './compiti';

const CLIENTI = ['Luca', 'Sara', 'Marco', 'Giulia', 'Omar', 'Aisha', 'Nadia', 'Pietro'] as const;
const PREZZI_PANINO = [3, 4, 5] as const;
const SCONTI = [1, 2] as const;
/** Il panino in omaggio è sempre il terzo: una regola da capire, non un numero da cercare. */
const OMAGGIO = 3;

interface Cliente {
  nome: string;
  panini: number;
}

interface ParametriPromozione {
  prezzo: number;
  /** Lo sconto fedeltà scatta da questa spesa in su (quattro panini pagati). */
  soglia: number;
  sconto: number;
  /** La prova mostrata (omaggio e sconto) e le due nascoste (niente; solo l'omaggio). */
  clienti: [Cliente, Cliente, Cliente];
}

function parametriPromozione(seme: number): ParametriPromozione {
  const rnd = generatore(seme);
  const prezzo = PREZZI_PANINO[Math.floor(rnd() * PREZZI_PANINO.length)];
  const sconto = SCONTI[Math.floor(rnd() * SCONTI.length)];
  // Tre clienti diversi, pescati senza ripetizioni.
  const mazzo: string[] = [...CLIENTI];
  const nomi = [0, 1, 2].map(() => mazzo.splice(Math.floor(rnd() * mazzo.length), 1)[0]);
  // 5 o 6 panini: omaggio e sconto; 2: niente; 4: omaggio ma sotto la soglia. Al massimo 12 righe.
  const mostrato = 5 + Math.floor(rnd() * 2);
  return {
    prezzo,
    soglia: 4 * prezzo,
    sconto,
    clienti: [
      { nome: nomi[0], panini: mostrato },
      { nome: nomi[1], panini: 2 },
      { nome: nomi[2], panini: 4 },
    ],
  };
}

/** Quanto paga il cliente prima dello sconto: i panini meno quello in omaggio. */
function totaleDi(p: ParametriPromozione, c: Cliente): number {
  return (c.panini - (c.panini >= OMAGGIO ? 1 : 0)) * p.prezzo;
}

/** Lo scontrino di un cliente, fase per fase. */
function righePromozione(p: ParametriPromozione, c: Cliente, fase: 1 | 2 | 3 | 4 | 5): string[] {
  const righe = [`Scontrino di ${c.nome}`, `Panini: ${c.panini}`];
  for (let i = 1; i <= c.panini; i++) {
    if (fase >= 2 && i === OMAGGIO) {
      righe.push(`Panino ${i}: omaggio`);
      continue;
    }
    righe.push(`Panino ${i}: ${p.prezzo} €`);
    if (fase === 1 && i === OMAGGIO) righe.push(`Il panino ${OMAGGIO} è in omaggio!`);
  }
  const totale = fase >= 3 ? totaleDi(p, c) : c.panini * p.prezzo;
  righe.push(`Totale: ${totale} €`);
  if (fase >= 4 && totale >= p.soglia) {
    righe.push(`Sconto fedeltà: -${p.sconto} €`, `Da pagare: ${totale - p.sconto} €`);
  }
  if (fase >= 5) {
    if (totale < p.soglia) righe.push(`Ti mancano ${p.soglia - totale} € per lo sconto`);
    righe.push(`Grazie, ${c.nome}!`);
  }
  return righe;
}

function provePromozione(p: ParametriPromozione, fase: 1 | 2 | 3 | 4 | 5): Prova[] {
  return p.clienti.map((c) => ({ risposte: [c.nome, String(c.panini)], output: righePromozione(p, c, fase) }));
}

/** Lo scontrino com'era alla fine del compito prima: il punto di partenza della fase 1. */
function scontrinoBase(p: ParametriPromozione): string {
  return [
    'nome = input("Come ti chiami? ")',
    'print(f"Scontrino di {nome}")',
    'panini = int(input("Quanti panini? "))',
    'print(f"Panini: {panini}")',
    'totale = 0',
    'for i in range(1, panini + 1):',
    `    totale += ${p.prezzo}`,
    `    print(f"Panino {i}: ${p.prezzo} €")`,
    'print(f"Totale: {totale} €")',
  ].join('\n');
}

/** La regola di ogni fase, per il giudice: la base dello scontrino più l'`if` che la fase chiede. */
function regolaPromozione(fase: number): string {
  const base =
    'I dati del cliente arrivano da `input()` (con `int()` per i numeri). Le righe dei panini le stampa un ciclo `for` che gira ' +
    'tante volte quanti sono i panini risposti: non valgono righe scritte a mano né il ciclo spezzato in due pezzi attorno al terzo panino.';
  const omaggio =
    fase === 1
      ? ' La riga dell\'omaggio la stampa un `if` dentro il ciclo, con una condizione sulla variabile del ciclo: non vale un `print` fuori dal ciclo o fra due cicli.'
      : ' Dentro il ciclo un `if` sulla variabile del ciclo stampa la riga dell\'omaggio e un `else` quella del prezzo: una sola delle due a ogni giro.';
  const totale =
    fase >= 3
      ? ' Il totale lo tiene una variabile che parte da 0 e cresce solo nel ramo del panino pagato: non vale una formula come `(panini - 1) * prezzo` né un numero scritto a mano.'
      : '';
  const sconto = fase >= 4 ? ' Lo sconto lo decide un `if` sul totale, dopo il ciclo, con un confronto: non vale stamparlo sempre.' : '';
  const mancano = fase >= 5 ? ' Quanto manca allo sconto lo stampa il ramo `else` di quell\'`if`, con la differenza calcolata dal totale, non scritta a mano.' : '';
  return base + omaggio + totale + sconto + mancano;
}

export function fasiPromozione(seme: number): Esercizio[] {
  const p = parametriPromozione(seme);
  const [a, , c] = p.clienti;
  const { prezzo, soglia, sconto } = p;
  const base = { tipo: 'progetto' as const, terreno: 'montagna' as const, mostraOutput: true, risposta: 'codice' as const };
  const fase = (n: 1 | 2 | 3 | 4 | 5, consegna: string, soluzione: string): Esercizio => {
    const prove = provePromozione(p, n);
    return { ...base, consegna, outputAtteso: prove[0].output, prove, soluzione, regola: regolaPromozione(n) };
  };
  const testa = [
    'nome = input("Come ti chiami? ")',
    'print(f"Scontrino di {nome}")',
    'panini = int(input("Quanti panini? "))',
    'print(f"Panini: {panini}")',
    'totale = 0',
    'for i in range(1, panini + 1):',
  ].join('\n');
  const r1 = `${testa}\n    totale += ${prezzo}\n    print(f"Panino {i}: ${prezzo} €")\n    if i == ${OMAGGIO}:\n        print("Il panino ${OMAGGIO} è in omaggio!")\nprint(f"Totale: {totale} €")`;
  const r2 = `${testa}\n    totale += ${prezzo}\n    if i == ${OMAGGIO}:\n        print(f"Panino {i}: omaggio")\n    else:\n        print(f"Panino {i}: ${prezzo} €")\nprint(f"Totale: {totale} €")`;
  const r3 = `${testa}\n    if i == ${OMAGGIO}:\n        print(f"Panino {i}: omaggio")\n    else:\n        totale += ${prezzo}\n        print(f"Panino {i}: ${prezzo} €")\nprint(f"Totale: {totale} €")`;
  const r4 = `${r3}\nif totale >= ${soglia}:\n    print("Sconto fedeltà: -${sconto} €")\n    print(f"Da pagare: {totale - ${sconto}} €")`;
  const r5 = `${r4}\nelse:\n    print(f"Ti mancano {${soglia} - totale} € per lo sconto")\nprint(f"Grazie, {nome}!")`;
  const totaleA = totaleDi(p, a);
  return [
    {
      ...fase(
        1,
        `**Fase 1 — la riga in più.** Lo scontrino è già scritto: è quello del compito prima. Il bar regala il ${OMAGGIO}° panino, e per ora vuole solo ` +
          `avvisare: subito dopo la riga \`Panino ${OMAGGIO}: ${prezzo} €\` ci vuole la riga \`Il panino ${OMAGGIO} è in omaggio!\`, ma **solo a quel giro**. ` +
          `Dentro il ciclo, un \`if\` con la condizione \`i == ${OMAGGIO}\` e sotto, spostato a destra, il \`print\`. Prova con **${a.nome}**, **${a.panini}**: deve funzionare anche con chi prende meno di ${OMAGGIO} panini.`,
        r1,
      ),
      codiceIniziale: scontrinoBase(p),
    },
    fase(
      2,
      `**Fase 2 — omaggio o prezzo.** Al posto dell'avviso, la riga del ${OMAGGIO}° panino diventa \`Panino ${OMAGGIO}: omaggio\` e le altre restano \`Panino 1: ${prezzo} €\`… ` +
        `Due strade e una sola si prende a ogni giro: sotto l'\`if\` la riga dell'omaggio, sotto \`else:\` la riga del prezzo.`,
      r2,
    ),
    fase(
      3,
      `**Fase 3 — il totale giusto.** Il panino in omaggio non si paga: il totale di ${a.nome} scende da ${a.panini * prezzo} a ${totaleA} €. ` +
        `La riga che fa crescere \`totale\` deve stare nel ramo del prezzo, non in quello dell'omaggio. Il \`print\` del totale resta fuori dal ciclo.`,
      r3,
    ),
    fase(
      4,
      `**Fase 4 — lo sconto fedeltà.** Chi spende almeno ${soglia} € ha ${sconto} € di sconto. Dopo il ciclo, un \`if\` sul totale con \`>=\`: se vale, due righe, ` +
        `\`Sconto fedeltà: -${sconto} €\` e \`Da pagare: ${totaleA - sconto} €\` (il numero calcolato da \`totale\`). Chi spende meno, come ${c.nome} con ${c.panini} panini, non le vede.`,
      r4,
    ),
    fase(
      5,
      `**Fase 5 — quanto manca.** Sotto la soglia, al posto dello sconto, la riga \`Ti mancano X € per lo sconto\`: è l'\`else\` dell'\`if\` sul totale, ` +
        `e X è \`${soglia} - totale\`, calcolato. Per tutti, in fondo, \`Grazie, ${a.nome}!\` con il nome del cliente. Risposte di prova: **${a.nome}**, **${a.panini}**.`,
      r5,
    ),
  ];
}

export function schedaPromozione(seme: number): SchedaCompito {
  const p = parametriPromozione(seme);
  const [a] = p.clienti;
  return {
    id: 'promozione',
    titolo: 'La promozione del bar',
    committente:
      `Il bar della scuola lancia due promozioni e vuole lo scontrino aggiornato: il ${OMAGGIO}° panino è in omaggio, e chi spende almeno ${p.soglia} € ` +
      `ha ${p.sconto} € di sconto fedeltà. Un panino costa ${p.prezzo} €. Lo scontrino di prima c'è già: va insegnato al programma a decidere.`,
    prodotto:
      'Lo scontrino con le promozioni: una riga per panino (il terzo in omaggio), il totale, lo sconto se c\'è o quanto manca per averlo, il saluto. Deve funzionare per qualunque cliente.',
    dati: [
      `Panino: ${p.prezzo} €`,
      `Omaggio: il ${OMAGGIO}° panino`,
      `Sconto fedeltà: ${p.sconto} € da ${p.soglia} € di spesa`,
      `Risposte di prova: ${a.nome} · ${a.panini} panini`,
    ],
    outputFinale: righePromozione(p, a, 5),
  };
}
