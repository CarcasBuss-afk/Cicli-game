/* Il patentino dei cicli `while` (PERCORSO.md §22): l'esame in fondo alla seconda sezione.
 * Un compito come gli altri nella forma (cinque fasi, un programma che cresce, parametri
 * dal seme) ma ogni fase ripassa un gesto diverso del `while`: la quantità che cresce fino
 * a un punto, la sentinella con `input()`, il contatore e il totale, l'`if` dentro il ciclo,
 * l'`if` fuori sul risultato. Il tutor è spento (`esame: true`): restano gli hint automatici.
 *
 * Scenario nuovo, così non si copia da un compito fatto: il noleggio bici in spiaggia, con
 * la batteria della e-bike da caricare e i clienti della giornata.
 *
 * Modulo puro. */
import { generatore, type Esercizio, type Prova } from '../giro/esercizi';
import type { SchedaCompito } from './compiti';

const CARICHE_INIZIALI = [40, 50, 60] as const;
const PASSO_CARICA = 20;
const KM_LUNGO = 20;
const CLIENTI_PIENA = 4;

interface ParametriNoleggio {
  spiaggia: string;
  carica: number;
  /** I km dei clienti nelle tre giornate di prova: quella mostrata (3 o 4 clienti), una da un cliente, una da cinque. */
  giornate: [number[], number[], number[]];
}

const SPIAGGE = ['Bagno Oasi', 'Lido dei Pini', 'Bagno Marinella', 'Spiaggia Libera 12', 'Lido Sirena'] as const;

/** Km distinti fra 5 e 30, con al massimo `lunghiMax` sopra la soglia del giro lungo. */
function kmClienti(rnd: () => number, n: number, lunghiMax: number): number[] {
  const km: number[] = [];
  while (km.length < n) {
    const k = 5 + Math.floor(rnd() * 26);
    if (km.includes(k)) continue;
    if (k > KM_LUNGO && km.filter((x) => x > KM_LUNGO).length >= lunghiMax) continue;
    km.push(k);
  }
  return km;
}

function parametriNoleggio(seme: number): ParametriNoleggio {
  const rnd = generatore(seme);
  const spiaggia = SPIAGGE[Math.floor(rnd() * SPIAGGE.length)];
  const carica = CARICHE_INIZIALI[Math.floor(rnd() * CARICHE_INIZIALI.length)];
  const mostrata = kmClienti(rnd, 3 + Math.floor(rnd() * 2), 2);
  // Nella giornata mostrata almeno un giro lungo, così «Giro lungo!» si vede.
  if (!mostrata.some((k) => k > KM_LUNGO)) mostrata[0] = KM_LUNGO + 1 + Math.floor(rnd() * 9);
  return { spiaggia, carica, giornate: [mostrata, kmClienti(rnd, 1, 1), kmClienti(rnd, 5, 2)] };
}

function righeNoleggio(p: ParametriNoleggio, km: number[], fase: 1 | 2 | 3 | 4 | 5): string[] {
  const righe: string[] = [];
  for (let carica = p.carica; carica < 100; ) {
    carica += PASSO_CARICA;
    righe.push(`Carica: ${carica}%`);
  }
  if (fase === 1) return righe;
  for (const k of km) {
    righe.push(`Cliente: ${k} km`);
    if (fase >= 4 && k > KM_LUNGO) righe.push('Giro lungo!');
  }
  if (fase >= 3) righe.push(`Clienti: ${km.length}, km totali: ${km.reduce((a, b) => a + b, 0)}`);
  if (fase >= 5) righe.push(km.length >= CLIENTI_PIENA ? 'Giornata piena!' : 'Giornata tranquilla');
  return righe;
}

function regolaNoleggio(fase: number): string {
  const carica = `La carica sale di ${PASSO_CARICA} a ogni giro di un ciclo \`while\` che gira finché è sotto 100: non si scrivono le righe a mano né un \`for\` con il numero di giri.`;
  const clienti =
    fase >= 2
      ? ' I km dei clienti arrivano da `input()` dentro un secondo ciclo `while` che si ferma allo 0 (la sentinella): la domanda sta prima del ciclo e si ripete in fondo al corpo; non si sa prima quanti clienti saranno.'
      : '';
  const totale = fase >= 3 ? ' I clienti li conta una variabile e i km li accumula un\'altra, entrambe da 0, stampate dopo il ciclo: niente numeri scritti a mano.' : '';
  const lungo = fase >= 4 ? ` «Giro lungo!» lo decide un \`if\` dentro il ciclo sui km del cliente (sopra ${KM_LUNGO}).` : '';
  const giornata = fase >= 5 ? ` La riga finale la decide un \`if\`/\`else\` fuori dal ciclo sul numero dei clienti.` : '';
  return carica + clienti + totale + lungo + giornata;
}

export function fasiPatentinoWhile(seme: number): Esercizio[] {
  const p = parametriNoleggio(seme);
  const [giornata] = p.giornate;
  const base = { tipo: 'progetto' as const, terreno: 'montagna' as const, mostraOutput: true, risposta: 'codice' as const };
  const fase = (n: 1 | 2 | 3 | 4 | 5, consegna: string, soluzione: string): Esercizio => {
    if (n === 1) return { ...base, consegna, outputAtteso: righeNoleggio(p, giornata, 1), soluzione, regola: regolaNoleggio(1) };
    const prove: Prova[] = p.giornate.map((km) => ({ risposte: [...km.map(String), '0'], output: righeNoleggio(p, km, n) }));
    return { ...base, consegna, outputAtteso: prove[0].output, prove, soluzione, regola: regolaNoleggio(n) };
  };
  const r1 = `carica = ${p.carica}\nwhile carica < 100:\n    carica += ${PASSO_CARICA}\n    print(f"Carica: {carica}%")`;
  const domanda = 'km = int(input("Km del cliente? "))';
  const r2 = `${r1}\n${domanda}\nwhile km != 0:\n    print(f"Cliente: {km} km")\n    ${domanda}`;
  const r3 = `${r1}\nclienti = 0\ntotale = 0\n${domanda}\nwhile km != 0:\n    print(f"Cliente: {km} km")\n    clienti += 1\n    totale += km\n    ${domanda}\nprint(f"Clienti: {clienti}, km totali: {totale}")`;
  const r4 = r3.replace('    print(f"Cliente: {km} km")\n', `    print(f"Cliente: {km} km")\n    if km > ${KM_LUNGO}:\n        print("Giro lungo!")\n`);
  const r5 = `${r4}\nif clienti >= ${CLIENTI_PIENA}:\n    print("Giornata piena!")\nelse:\n    print("Giornata tranquilla")`;
  const totale = giornata.reduce((a, b) => a + b, 0);
  return [
    fase(
      1,
      `**Fase 1 — la batteria si carica.** La e-bike è al ${p.carica}% e ogni quarto d'ora guadagna il ${PASSO_CARICA}%. Stampa \`Carica: ${p.carica + PASSO_CARICA}%\`, ` +
        `\`Carica: ${p.carica + 2 * PASSO_CARICA}%\`… finché arriva a 100: un \`while\` sulla carica, non sul numero di righe.`,
      r1,
    ),
    fase(
      2,
      `**Fase 2 — i clienti.** Poi arrivano i clienti: per ognuno il programma chiede i km fatti (con \`int()\`) e stampa \`Cliente: ${giornata[0]} km\`. ` +
        `Quando non ce ne sono più si risponde **0** e il ciclo si ferma. Risposte di prova: ${giornata.map((k) => `**${k}**`).join(', ')}, poi **0**.`,
      r2,
    ),
    fase(
      3,
      `**Fase 3 — il riepilogo.** Dopo i clienti, una riga: \`Clienti: ${giornata.length}, km totali: ${totale}\`. Due variabili che partono da 0: una conta, l'altra accumula.`,
      r3,
    ),
    fase(4, `**Fase 4 — il giro lungo.** Sotto il cliente che ha fatto più di ${KM_LUNGO} km, la riga \`Giro lungo!\`: un \`if\` dentro il ciclo.`, r4),
    fase(
      5,
      `**Fase 5 — com'è andata.** Ultima riga: \`Giornata piena!\` se i clienti sono almeno ${CLIENTI_PIENA}, altrimenti \`Giornata tranquilla\`. Deve funzionare per qualunque giornata.`,
      r5,
    ),
  ];
}

export function schedaPatentinoWhile(seme: number): SchedaCompito {
  const p = parametriNoleggio(seme);
  const [giornata] = p.giornate;
  return {
    id: 'patentinoWhile',
    titolo: 'Il patentino dei cicli while',
    esame: true,
    committente:
      `È l'esame per il patentino dei cicli while: cinque fasi, ognuna su un gesto del percorso. Il tutor è spento, restano gli hint automatici. ` +
      `Il noleggio bici del ${p.spiaggia} vuole il programma della giornata: la e-bike che si carica dal ${p.carica}% fino al 100%, poi i clienti con i loro km finché non ce ne sono più, il riepilogo e il giudizio sulla giornata.`,
    prodotto: 'La carica che sale fino a 100, i clienti con i km e «Giro lungo!», quanti clienti e km in tutto, com\'è andata la giornata.',
    dati: [`Carica iniziale: ${p.carica}%, +${PASSO_CARICA}% a quarto d'ora`, `Giro lungo: sopra ${KM_LUNGO} km`, `Giornata piena: da ${CLIENTI_PIENA} clienti`, `Clienti di prova: ${giornata.join(' · ')} km`],
    outputFinale: righeNoleggio(p, giornata, 5),
  };
}
