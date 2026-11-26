/* I compiti della sezione «Le liste» (PERCORSO.md §26): la cassettiera del primo video della
 * serie (Traduzioni/python/liste). Per ora solo quello che il video ha detto: la lista scritta
 * fra quadre, il cassetto aperto con la sua targhetta (da zero), `print` della lista intera,
 * la lista vuota che cresce con `append`, `len`, il cassetto che non c'è. Scorrere tutta la
 * lista con il `for` arriva con il secondo video: qui i cassetti si aprono uno alla volta.
 *
 *   1. gli invitati della festa — la festa di Marco del video: primo, ultimo (len − 1), quanti;
 *      i ritardatari con `append`; i nomi da `input()` con la sentinella; la festa annullata
 *      quando la lista è vuota. Fase 1 guidata: è il primo incontro con le quadre.
 *   2. l'ordine d'arrivo — la targhetta è la posizione meno uno: il podio, la maglia nera, chi
 *      è arrivato N° chiesto con `input()`, e la posizione che non c'è.
 *
 * Stessa forma degli altri compiti: parametri dal seme, cinque fasi che aggiungono ogni
 * volta un pezzo, la scheda con l'output finale per intero. Modulo puro. */
import { conNote, generatore, type Esercizio, type Prova } from '../giro/esercizi';
import type { SchedaCompito } from './compiti';

const base = { tipo: 'progetto' as const, mostraOutput: true, risposta: 'codice' as const };

/** I nomi nei cassetti: corti, senza apostrofi, di una classe vera. */
const NOMI = [
  'Luca', 'Sara', 'Omar', 'Giulia', 'Matteo', 'Aisha', 'Kevin', 'Chiara', 'Yusuf',
  'Elena', 'Davide', 'Noemi', 'Rayan', 'Sofia', 'Andrea', 'Ilaria', 'Samuel', 'Greta',
] as const;

/** `n` nomi diversi fra loro e da quelli già `presi`. */
function nomiDiversi(rnd: () => number, n: number, presi: string[] = []): string[] {
  const out: string[] = [];
  while (out.length < n) {
    const x = NOMI[Math.floor(rnd() * NOMI.length)];
    if (!out.includes(x) && !presi.includes(x)) out.push(x);
  }
  return out;
}

/** La lista come la stampa Python: `['Luca', 'Sara']` (i nomi qui non hanno apostrofi). */
const sdraiata = (nomi: string[]) => `[${nomi.map((n) => `'${n}'`).join(', ')}]`;
/** La lista come si scrive nel codice: `["Luca", "Sara"]`. */
const scritta = (nomi: string[]) => `[${nomi.map((n) => `"${n}"`).join(', ')}]`;
const elenco = (nomi: string[]) => nomi.map((n) => `**${n}**`).join(', ');

/** I nomi letti con la sentinella: un `while` con `input()` che si ferma a `fine`, e l'`append` dentro. */
const leggiNomi = (lista: string, domanda: string) =>
  `${lista} = []\nnome = input("${domanda}")\nwhile nome != "fine":\n    ${lista}.append(nome)\n    nome = input("${domanda}")`;

/* ------------------------------------------------------- 1. gli invitati della festa */

const FESTEGGIATI = ['Marco', 'Anna', 'Ivan', 'Lara', 'Nico'] as const;

interface ParametriInvitati {
  festeggiato: string;
  /** La lista scritta nel programma, fasi 1-3. */
  lista: string[];
  /** I due che arrivano dopo, con `append` (fase 3). */
  ritardatari: string[];
  /** Gli invitati delle prove con `input()`: quella mostrata (4), una corta (2), una lunga (6). */
  serate: [string[], string[], string[]];
}

function parametriInvitati(seme: number): ParametriInvitati {
  const rnd = generatore(seme);
  const festeggiato = FESTEGGIATI[Math.floor(rnd() * FESTEGGIATI.length)];
  const lista = nomiDiversi(rnd, 4);
  const ritardatari = nomiDiversi(rnd, 2, lista);
  return { festeggiato, lista, ritardatari, serate: [nomiDiversi(rnd, 4), nomiDiversi(rnd, 2), nomiDiversi(rnd, 6)] };
}

const ANNULLATA = 'Nessun invitato: festa annullata!';

function righeInvitati(nomi: string[], fase: 1 | 2 | 3 | 4 | 5): string[] {
  if (fase === 5 && nomi.length === 0) return [ANNULLATA];
  const righe = [sdraiata(nomi), `Primo invitato: ${nomi[0]}`];
  if (fase >= 2) righe.push(`Ultimo invitato: ${nomi[nomi.length - 1]}`, `Invitati: ${nomi.length}`);
  return righe;
}

/** La regola cresce con le fasi e nomina solo quello che la fase chiede (PERCORSO.md §23). */
function regolaInvitati(fase: number): string {
  const lista =
    fase >= 4
      ? 'Gli invitati li legge un ciclo `while` con `input()` che si ferma quando la risposta è `fine`, e ogni nome entra nella lista con `append` dentro il ciclo: ' +
        'il programma non sa prima quanti invitati saranno, e non valgono nomi scritti nel programma. '
      : '';
  const primo = 'Il primo invitato esce dal suo cassetto della lista, aperto con le quadre e la targhetta, e la lista intera si stampa con un `print` della lista: non valgono nomi scritti a mano nei `print`.';
  const ultimo = fase >= 2 ? " Anche l'ultimo invitato esce da un cassetto della lista, e quanti sono lo dice `len`: non valgono numeri di invitati scritti a mano." : '';
  const append = fase === 3 ? ' I due ritardatari entrano nella lista con `append`, non riscrivendo la lista da capo.' : '';
  const vuota = fase === 5 ? " Che la lista sia vuota lo decide un `if` sulla lista, prima di aprire un cassetto." : '';
  return lista + primo + ultimo + append + vuota;
}

export function fasiInvitati(seme: number): Esercizio[] {
  const p = parametriInvitati(seme);
  const { lista, ritardatari, serate } = p;
  const b = { ...base, terreno: 'pianura' as const };
  const domanda = 'Chi inviti? ';
  const tutti = [...lista, ...ritardatari];
  const prove = (fase: 4 | 5): Prova[] =>
    (fase === 4 ? serate : [serate[0], [], serate[2]]).map((nomi) => ({ risposte: [...nomi, 'fine'], output: righeInvitati(nomi, fase) }));
  const fase = (n: 1 | 2 | 3 | 4 | 5, consegna: string, soluzione: string, outputAtteso: string[], extra: Partial<Esercizio> = {}): Esercizio => ({
    ...b,
    consegna,
    outputAtteso,
    soluzione,
    regola: regolaInvitati(n),
    ...extra,
  });

  const stampa = 'print(invitati)\nprint(f"Primo invitato: {invitati[0]}")';
  const stampa2 = `${stampa}\nprint(f"Ultimo invitato: {invitati[len(invitati) - 1]}")\nprint(f"Invitati: {len(invitati)}")`;
  const r1 = `invitati = ${scritta(lista)}\n${stampa}`;
  const r2 = `invitati = ${scritta(lista)}\n${stampa2}`;
  const r3 = `invitati = ${scritta(lista)}\n${ritardatari.map((n) => `invitati.append("${n}")`).join('\n')}\n${stampa2}`;
  const r4 = `${leggiNomi('invitati', domanda)}\n${stampa2}`;
  const r5 =
    `${leggiNomi('invitati', domanda)}\nif len(invitati) == 0:\n    print("${ANNULLATA}")\nelse:\n` +
    stampa2
      .split('\n')
      .map((r) => `    ${r}`)
      .join('\n');
  const pr4 = prove(4);
  const pr5 = prove(5);

  return conNote([
    fase(
      1,
      `**Fase 1 — la cassettiera.** Nell'editor c'è già la lista \`invitati\`: un nome solo, quattro cassetti, e le targhette partono da **0**. ` +
        `La riga \`print(invitati)\` stampa la cassettiera sdraiata, come la scrive Python. Al posto del commento scrivi la riga che stampa ` +
        `\`Primo invitato: ${lista[0]}\`, prendendo il nome **dal suo cassetto**: il nome della lista e, fra le quadre, la targhetta.`,
      r1,
      righeInvitati(lista, 1),
      { codiceIniziale: `invitati = ${scritta(lista)}\nprint(invitati)\n# qui manca la riga che stampa il primo invitato` },
    ),
    fase(
      2,
      `**Fase 2 — l'ultimo e quanti.** Stampa \`Ultimo invitato: ${lista[lista.length - 1]}\` e poi \`Invitati: ${lista.length}\`. ` +
        `Che targhetta ha l'ultimo cassetto? Prova \`invitati[${lista.length}]\` e leggi che cosa risponde Python: l'ultima targhetta ha sempre un numero in meno ` +
        `di quanti sono i cassetti. Il numero degli invitati lo conta \`len\`.`,
      r2,
      righeInvitati(lista, 2),
    ),
    fase(
      3,
      `**Fase 3 — i ritardatari.** Prima di stampare, arrivano anche ${elenco(ritardatari)}: aggiungili **in fondo** alla lista con \`append\`, uno per riga, ` +
        `senza toccare la lista scritta. Le righe dopo devono trovare da sole il nuovo ultimo (\`${ritardatari[1]}\`) e il nuovo numero (\`${tutti.length}\`): ` +
        `se l'ultimo l'avevi preso con una targhetta scritta a mano, adesso sbaglia. La targhetta dell'ultimo è \`len\` meno uno.`,
      r3,
      righeInvitati(tutti, 3),
    ),
    fase(
      4,
      `**Fase 4 — i nomi li scrive ${p.festeggiato}.** Il programma lo scrivi tu, ma gli invitati li sa solo ${p.festeggiato}, quando lo usa: quanti cassetti preparare? ` +
        `Nessuno: la lista parte **vuota**, \`invitati = []\`. Poi chiedi \`${domanda}\` con \`input()\` e, finché la risposta non è \`fine\`, metti il nome in fondo con \`append\` ` +
        `e richiedi (come la cassa del bar, con \`fine\` al posto dello 0). Le righe dopo il ciclo restano quelle. ` +
        `Risposte di prova: ${elenco(serate[0])}, poi **fine**; il programma deve funzionare con qualunque numero di invitati.`,
      r4,
      pr4[0].output,
      { prove: pr4 },
    ),
    fase(
      5,
      `**Fase 5 — la festa annullata.** Prova a rispondere subito \`fine\`: la lista resta vuota, e \`invitati[0]\` apre un cassetto che non c'è. ` +
        `Dopo il ciclo ci vuole un \`if\`: se la lista non ha cassetti stampa \`${ANNULLATA}\`, altrimenti le righe di prima. Risposte di prova: ${elenco(serate[0])}, poi **fine**.`,
      r5,
      pr5[0].output,
      { prove: pr5 },
    ),
  ], noteInvitati(p));
}

export function schedaInvitati(seme: number): SchedaCompito {
  const p = parametriInvitati(seme);
  return {
    id: 'invitati',
    titolo: 'Gli invitati della festa',
    committente:
      `${p.festeggiato} organizza la sua festa e vuole un programma che si ricordi i nomi di tutti gli invitati. I nomi li scriverà lui, uno alla volta, ` +
      `quando lo usa: tu non sai quanti saranno, quindi una variabile per invitato non basta. Ci vuole una lista: la cassettiera, un nome solo e un cassetto ` +
      `per invitato, che cresce quando serve.`,
    prodotto: "La lista degli invitati: tutta, il primo, l'ultimo e quanti sono, con i nomi chiesti uno alla volta finché non si scrive «fine». Senza invitati la festa è annullata.",
    dati: [
      `Festeggiato: ${p.festeggiato}`,
      `Invitati già in lista (fasi 1-3): ${p.lista.join(', ')}`,
      `Ritardatari (fase 3): ${p.ritardatari.join(', ')}`,
      `Invitati di prova (fasi 4-5): ${p.serate[0].join(' · ')} · fine`,
    ],
    outputFinale: righeInvitati(p.serate[0], 5),
  };
}

function noteInvitati(p: ParametriInvitati): string[] {
  const { lista, ritardatari } = p;
  const n = lista.length;
  return [
    `Fase guidata: manca una riga, print(f"Primo invitato: {invitati[0]}") (va bene anche print("Primo invitato:", invitati[0])). ` +
      'Far capire: la lista è una cassettiera, un nome solo e tanti cassetti; la targhetta dice quanti cassetti ci sono prima, quindi il primo ha la targhetta 0. ' +
      `Errori tipici: invitati[1] (stampa ${lista[1]}, il secondo), il nome «${lista[0]}» scritto a mano (passa l'output, il giudice lo boccia), ` +
      'le quadre fuori dalle graffe della f-string, invitati(0) con le tonde, la f dimenticata (stampa le graffe).',
    `L'ultimo ha la targhetta ${n - 1}: invitati[len(invitati) - 1] (oppure invitati[${n - 1}], che qui passa e alla fase 3 sbaglia). Il numero è len(invitati). ` +
      `Far capire: invitati[${n}] dà l'errore del cassetto che non c'è, perché l'ultima targhetta è len meno uno. ` +
      `Errori tipici: invitati[${n}] (errore), invitati[len(invitati)] (stesso errore), il ${n} scritto a mano nel testo (il giudice lo boccia).`,
    `Due righe invitati.append("${ritardatari[0]}") e invitati.append("${ritardatari[1]}") dopo la lista e prima dei print. ` +
      `Far capire: append aggiunge un cassetto in fondo e il cassetto nuovo prende la targhetta dopo l'ultima; i print dopo vedono la lista cresciuta. ` +
      `Errori tipici: l'ultimo preso con invitati[${n - 1}] (stampa ancora ${lista[n - 1]}: va calcolato con len), gli append messi dopo i print, ` +
      'i nomi aggiunti riscrivendo la lista fra quadre (passa l\'output, il giudice lo boccia), append con due nomi insieme (errore), append senza il punto o senza le virgolette.',
    'La lista parte vuota (invitati = []) prima del ciclo; la prima input() prima del while, la condizione nome != "fine", dentro append(nome) e poi la input() di nuovo in fondo; i print dopo il ciclo, senza rientro. ' +
      'Far capire: è la cassa del bar con la lista al posto del totale; non serve sapere quanti saranno, la lista cresce quando serve. ' +
      'Errori tipici: la input() in fondo al corpo dimenticata (le risposte finiscono: il ciclo non si ferma), invitati = [] dentro il ciclo (resta un nome solo), ' +
      "l'append dopo la seconda input() (finisce in lista anche «fine»), i print rientrati dentro il ciclo, la vecchia lista scritta lasciata al posto di quella vuota.",
    'Dopo il ciclo un if: if len(invitati) == 0 (oppure invitati == []) stampa la festa annullata, else con dentro, rientrate, le quattro righe di prima. ' +
      "Far capire: con la lista vuota invitati[0] apre un cassetto che non c'è (l'errore che si vede rispondendo subito fine): l'if controlla prima di aprire. " +
      "Errori tipici: l'if messo dopo i print (l'errore arriva prima), l'else dimenticato (con la lista piena stampa anche la festa annullata), " +
      'le righe del ramo else senza rientro, len(invitati) == "0" fra virgolette (confronta un numero con un testo).',
  ];
}

/* ------------------------------------------------------------- 2. l'ordine d'arrivo */

const GARE = ['la corsa in bici della scuola', 'la gara di mountain bike del quartiere', 'la cronoscalata del paese', 'la pedalata di fine anno'] as const;

interface ParametriArrivo {
  gara: string;
  /** L'ordine d'arrivo scritto nel programma, fasi 1-3: cinque corridori. */
  arrivi: string[];
  /** Le prove con `input()`: chi arriva (5 mostrati, 3, 7). */
  gare: [string[], string[], string[]];
}

function parametriArrivo(seme: number): ParametriArrivo {
  const rnd = generatore(seme);
  const gara = GARE[Math.floor(rnd() * GARE.length)];
  return { gara, arrivi: nomiDiversi(rnd, 5), gare: [nomiDiversi(rnd, 5), nomiDiversi(rnd, 3), nomiDiversi(rnd, 7)] };
}

/** La posizione mostrata: la quarta, fuori dal podio (così la riga non ripete il podio), mai l'ultima. */
const POSIZIONE_MOSTRATA = 4;

const nessuno = (pos: number) => `Nessun corridore al ${pos}° posto`;

function righeArrivo(arrivi: string[], fase: 1 | 2 | 3 | 4 | 5, posizione?: number): string[] {
  const righe = [`1° ${arrivi[0]}`, `2° ${arrivi[1]}`, `3° ${arrivi[2]}`];
  if (fase >= 2) righe.push(`Maglia nera: ${arrivi[arrivi.length - 1]}`, `Arrivati: ${arrivi.length}`);
  if (fase >= 3 && posizione !== undefined) {
    righe.push(posizione > arrivi.length ? nessuno(posizione) : `${posizione}° ${arrivi[posizione - 1]}`);
  }
  return righe;
}

function regolaArrivo(fase: number): string {
  const lettura =
    fase >= 4
      ? "Gli arrivi li legge un ciclo `while` con `input()` che si ferma quando la risposta è `fine`, e ogni nome entra nella lista con `append` dentro il ciclo: il programma non sa prima quanti arriveranno, e non valgono nomi scritti nel programma. "
      : '';
  const podio = 'I nomi del podio escono dai cassetti della lista, aperti con le quadre e la targhetta: non valgono nomi scritti a mano nei `print`.';
  const nera = fase >= 2 ? " La maglia nera è l'ultimo cassetto della lista e quanti sono arrivati lo dice `len`: niente numeri di arrivati scritti a mano." : '';
  const posizione =
    fase >= 3 ? ' La posizione arriva da `input()`, e il nome esce dal cassetto la cui targhetta è calcolata dalla posizione: non valgono nomi né targhette scritti a mano per la posizione di prova.' : '';
  const fuori = fase === 5 ? ' Che la posizione non ci sia lo decide un `if` che confronta la posizione con `len` della lista, prima di aprire il cassetto.' : '';
  return lettura + podio + nera + posizione + fuori;
}

export function fasiArrivo(seme: number): Esercizio[] {
  const p = parametriArrivo(seme);
  const { arrivi, gare } = p;
  const b = { ...base, terreno: 'collina' as const };
  const domandaNome = 'Chi arriva? ';
  const domandaPos = 'Quale posizione? ';
  /** Fase 3: la lista è fissa (5), cambia solo la posizione: la quarta, poi i due confini. */
  const prove3: Prova[] = [POSIZIONE_MOSTRATA, 1, arrivi.length].map((pos) => ({ risposte: [String(pos)], output: righeArrivo(arrivi, 3, pos) }));
  /** Fasi 4-5: cambiano chi arriva e la posizione; alla 5 una posizione fuori di uno e una proprio sull'ultimo. */
  const posizioni = (fase: 4 | 5): number[] => (fase === 4 ? [POSIZIONE_MOSTRATA, 3, 1] : [POSIZIONE_MOSTRATA, gare[1].length + 1, gare[2].length]);
  const prove = (fase: 4 | 5): Prova[] =>
    gare.map((nomi, k) => ({ risposte: [...nomi, 'fine', String(posizioni(fase)[k])], output: righeArrivo(nomi, fase, posizioni(fase)[k]) }));
  const fase = (n: 1 | 2 | 3 | 4 | 5, consegna: string, soluzione: string, outputAtteso: string[], extra: Partial<Esercizio> = {}): Esercizio => ({
    ...b,
    consegna,
    outputAtteso,
    soluzione,
    regola: regolaArrivo(n),
    ...extra,
  });

  const podio = 'print(f"1° {arrivi[0]}")\nprint(f"2° {arrivi[1]}")\nprint(f"3° {arrivi[2]}")';
  const nera = 'print(f"Maglia nera: {arrivi[len(arrivi) - 1]}")\nprint(f"Arrivati: {len(arrivi)}")';
  const chiedi = `posizione = int(input("${domandaPos}"))`;
  const chi = 'print(f"{posizione}° {arrivi[posizione - 1]}")';
  const lista = `arrivi = ${scritta(arrivi)}`;
  const r1 = `${lista}\n${podio}`;
  const r2 = `${r1}\n${nera}`;
  const r3 = `${r2}\n${chiedi}\n${chi}`;
  const r4 = `${leggiNomi('arrivi', domandaNome)}\n${podio}\n${nera}\n${chiedi}\n${chi}`;
  const r5 = `${leggiNomi('arrivi', domandaNome)}\n${podio}\n${nera}\n${chiedi}\nif posizione > len(arrivi):\n    print(f"Nessun corridore al {posizione}° posto")\nelse:\n    ${chi}`;
  const pr4 = prove(4);
  const pr5 = prove(5);

  return conNote([
    fase(
      1,
      `**Fase 1 — il podio.** Al traguardo il giudice ha scritto i nomi in ordine d'arrivo: \`arrivi = ${scritta(arrivi)}\`. ` +
        `Scrivi la lista e stampa il podio, \`1° ${arrivi[0]}\`, \`2° ${arrivi[1]}\`, \`3° ${arrivi[2]}\`, prendendo ogni nome dal suo cassetto. ` +
        `Attenzione: chi arriva primo ha **zero** corridori davanti, quindi sta nel cassetto con la targhetta 0. Il simbolo ° si scrive dentro il testo.`,
      r1,
      righeArrivo(arrivi, 1),
    ),
    fase(
      2,
      `**Fase 2 — la maglia nera.** Al Giro l'ultimo arrivato prende la maglia nera. Stampa \`Maglia nera: ${arrivi[arrivi.length - 1]}\` e poi \`Arrivati: ${arrivi.length}\`, ` +
        `con \`len\`. La targhetta dell'ultimo è \`len\` meno uno: falla calcolare al programma, così vale anche quando gli arrivati saranno di più.`,
      r2,
      righeArrivo(arrivi, 2),
    ),
    fase(
      3,
      `**Fase 3 — chi è arrivato?** Il giudice vuole sapere chi è arrivato in una posizione qualunque. Dopo le righe di prima chiedi \`${domandaPos}\` con \`input()\` e \`int()\`, ` +
        `e stampa la posizione con il nome: \`${POSIZIONE_MOSTRATA}° ${arrivi[POSIZIONE_MOSTRATA - 1]}\`. La posizione ${POSIZIONE_MOSTRATA} **non** è la targhetta ${POSIZIONE_MOSTRATA}: ` +
        `quanti corridori ha davanti chi arriva ${POSIZIONE_MOSTRATA}°? Risposta di prova: **${POSIZIONE_MOSTRATA}**, ma deve funzionare per ogni posizione da 1 a ${arrivi.length}.`,
      r3,
      prove3[0].output,
      { prove: prove3 },
    ),
    fase(
      4,
      `**Fase 4 — gli arrivi in diretta.** Il giudice non sa prima quanti arriveranno: la lista \`arrivi\` parte **vuota** e si riempie al traguardo. ` +
        `Chiedi \`${domandaNome}\` con \`input()\` e, finché la risposta non è \`fine\`, metti il nome in fondo con \`append\` e richiedi. Dopo il ciclo restano il podio, la maglia nera, ` +
        `gli arrivati e la domanda sulla posizione. Risposte di prova: ${elenco(gare[0])}, **fine**, poi **${POSIZIONE_MOSTRATA}**. Al traguardo arrivano sempre almeno tre corridori.`,
      r4,
      pr4[0].output,
      { prove: pr4 },
    ),
    fase(
      5,
      `**Fase 5 — la posizione che non c'è.** Se arrivano ${gare[0].length} corridori e il giudice chiede la posizione ${gare[0].length + 1}, il programma apre un cassetto che non c'è e si ferma con un errore. ` +
        `Prima di aprirlo, un \`if\`: se la posizione è oltre quanti sono arrivati stampa \`Nessun corridore al ${gare[0].length + 1}° posto\` (con la posizione chiesta), altrimenti la riga di prima. ` +
        `Risposte di prova: ${elenco(gare[0])}, **fine**, poi **${POSIZIONE_MOSTRATA}**.`,
      r5,
      pr5[0].output,
      { prove: pr5 },
    ),
  ], noteArrivo(p));
}

export function schedaArrivo(seme: number): SchedaCompito {
  const p = parametriArrivo(seme);
  return {
    id: 'arrivo',
    titolo: "L'ordine d'arrivo",
    committente:
      `Per ${p.gara} serve il programma del traguardo: il giudice scrive i nomi dei corridori nell'ordine in cui arrivano, e il programma stampa il podio, ` +
      `la maglia nera, quanti sono arrivati e, a richiesta, chi è arrivato in una certa posizione. La posizione e la targhetta del cassetto non sono lo stesso numero.`,
    prodotto: "Il traguardo: il podio, la maglia nera, gli arrivati e chi è arrivato nella posizione chiesta, anche quando quella posizione non c'è.",
    dati: [
      `Gara: ${p.gara}`,
      `Ordine d'arrivo (fasi 1-3): ${p.arrivi.join(', ')}`,
      `Arrivi di prova (fasi 4-5): ${p.gare[0].join(' · ')} · fine`,
      `Posizione di prova: ${POSIZIONE_MOSTRATA}`,
    ],
    outputFinale: righeArrivo(p.gare[0], 5, POSIZIONE_MOSTRATA),
  };
}

function noteArrivo(p: ParametriArrivo): string[] {
  const { arrivi } = p;
  const n = arrivi.length;
  return [
    'La lista scritta fra quadre con le virgole, poi tre print con le f-string: arrivi[0], arrivi[1], arrivi[2]. ' +
      'Far capire: la targhetta dice quanti cassetti ci sono prima; chi arriva primo non ha nessuno davanti, quindi targhetta 0: la posizione è la targhetta più uno. ' +
      `Errori tipici: arrivi[1] per il primo (tutto il podio slitta di uno: 1° ${arrivi[1]}), i nomi scritti a mano nei print (il giudice li boccia), ` +
      'la virgola fra i nomi dimenticata, le quadre della lista dentro la f-string fuori dalle graffe.',
    `La maglia nera è arrivi[len(arrivi) - 1] (qui arrivi[${n - 1}] passa, ma alla fase 4 la lista cambia lunghezza), gli arrivati sono len(arrivi). ` +
      `Errori tipici: arrivi[${n}] o arrivi[len(arrivi)] (il cassetto che non c'è: l'ultima targhetta è len meno uno), il ${n} scritto nel testo (il giudice lo boccia).`,
    'Dopo le righe di prima: posizione = int(input(...)), poi la f-string con la posizione e arrivi[posizione - 1]. ' +
      `Far capire: chi arriva ${POSIZIONE_MOSTRATA}° ha ${POSIZIONE_MOSTRATA - 1} corridori davanti, quindi la sua targhetta è ${POSIZIONE_MOSTRATA - 1}: si toglie uno alla posizione. ` +
      `Errori tipici: arrivi[posizione] (con ${POSIZIONE_MOSTRATA} stampa ${arrivi[POSIZIONE_MOSTRATA]}, con ${n} apre un cassetto che non c'è), input senza int (fra le quadre ci vuole un numero), ` +
      `arrivi[${POSIZIONE_MOSTRATA - 1}] scritto a mano (passa la prova mostrata, cade sulle posizioni 1 e ${n}).`,
    'La lista parte vuota (arrivi = []), la prima input() prima del while, la condizione nome != "fine", dentro append(nome) e la input() di nuovo in fondo; poi, fuori dal ciclo, tutte le righe di prima. ' +
      'Errori tipici: la vecchia lista scritta lasciata (cade sulle prove con altri corridori), la input() in fondo al corpo dimenticata, l\'append dopo la seconda input() (entra in lista anche «fine»), ' +
      "la maglia nera presa con un numero fisso (cade sulle prove da 3 e da 7), la domanda della posizione messa dentro il ciclo.",
    "Un if prima di aprire il cassetto: if posizione > len(arrivi) stampa la f-string «Nessun corridore al ...° posto», else la riga della fase 3. " +
      `Far capire: con ${n} arrivati le targhette vanno da 0 a ${n - 1}, quindi le posizioni da 1 a ${n}; la posizione ${n + 1} non c'è. ` +
      "Errori tipici: >= al posto di > (sbaglia proprio sull'ultimo arrivato: la prova nascosta lo controlla), l'if messo dopo aver già aperto il cassetto, " +
      'il confronto con la targhetta invece che con la posizione (posizione - 1 > len), il numero di corridori scritto a mano nell\'if.',
  ];
}
