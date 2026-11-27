/* I compiti della sezione «Le liste» (PERCORSO.md §26 e §28): seguono i video della serie
 * (Traduzioni/python), e ogni compito usa solo quello che i video hanno già detto (tranne
 * `insert` e `pop` nella playlist, spiegati dalle consegne), più quello che la classe sa dalle
 * sezioni prima (`input()`, l'`if`, le f-string, accumulatore,
 * contatore, record).
 *
 * Primo video, «Le liste» (liste/): la lista fra quadre, il cassetto aperto con la sua
 * targhetta (da zero), `print` della lista intera, `append`, `len`, il cassetto che non c'è.
 * I cassetti si aprono uno alla volta, nessun ciclo.
 *   1. gli invitati della festa — primo, ultimo (len − 1), quanti; i ritardatari con `append`;
 *      l'invitato dell'ultimo minuto chiesto con `input()`; i posti della sala. Fase 1 guidata.
 *   2. l'ordine d'arrivo — la targhetta è la posizione meno uno: il podio, la maglia nera, chi
 *      è arrivato N°, il ritardatario, la posizione che non c'è.
 *   3. la playlist della festa — la lista che cambia: `append` in fondo, `insert` in un posto
 *      preciso, `pop` che toglie l'ultimo o quello di una targhetta. `insert` e `pop` il video non
 *      li dice: li spiegano le consegne (deciso con Fabio il 27 novembre, PERCORSO.md §29).
 *
 * Secondo video, «Aprire tutti i cassetti» (aprire_cassetti/): il `for` che scorre la lista,
 * `for i in range(len(lista))` quando serve anche la targhetta («dove e cosa»), `for x in lista`
 * quando bastano i valori («solo cosa»).
 *   4. i biglietti d'invito — un biglietto per invitato, numerato, i ritardatari che il ciclo
 *      prende da solo, la seconda lista delle risposte letta con la stessa targhetta, quanti
 *      vengono. Fase 1 guidata.
 *   5. le uscite in bici — i km di ogni uscita, il totale, la più lunga e in quale uscita, quante
 *      raggiungono un obiettivo chiesto con `input()`.
 *
 * La lista che si riempie con un `while` e la sentinella è il terzo video: qui non c'è.
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

const FESTEGGIATI = ['Marco', 'Anna', 'Ivan', 'Lara', 'Nico'] as const;

/* ------------------------------------------------------- 1. gli invitati della festa */

interface ParametriInvitati {
  festeggiato: string;
  /** La lista scritta nel programma. */
  lista: string[];
  /** I due che arrivano dopo, con `append` (fase 3). */
  ritardatari: string[];
  /** L'invitato dell'ultimo minuto, da `input()`: quello della prova mostrata e due nascosti. */
  ultimoMinuto: [string, string, string];
}

function parametriInvitati(seme: number): ParametriInvitati {
  const rnd = generatore(seme);
  const festeggiato = FESTEGGIATI[Math.floor(rnd() * FESTEGGIATI.length)];
  const lista = nomiDiversi(rnd, 4);
  const ritardatari = nomiDiversi(rnd, 2, lista);
  const [a, b, c] = nomiDiversi(rnd, 3, [...lista, ...ritardatari]);
  return { festeggiato, lista, ritardatari, ultimoMinuto: [a, b, c] };
}

/** Gli invitati alla fine: la lista, i ritardatari e quello dell'ultimo minuto. */
const INVITATI_FINALI = 7;
/** I posti della sala nelle prove della fase 5: liberi, mancanti, proprio giusti (il confine). */
const POSTI_PROVA = [INVITATI_FINALI + 3, INVITATI_FINALI - 2, INVITATI_FINALI] as const;

function righeInvitati(nomi: string[], fase: 1 | 2 | 3 | 4 | 5, posti?: number): string[] {
  const righe = [sdraiata(nomi), `Primo invitato: ${nomi[0]}`];
  if (fase >= 2) righe.push(`Ultimo invitato: ${nomi[nomi.length - 1]}`, `Invitati: ${nomi.length}`);
  if (fase === 5 && posti !== undefined) {
    righe.push(nomi.length > posti ? `Posti mancanti: ${nomi.length - posti}` : `Posti liberi: ${posti - nomi.length}`);
  }
  return righe;
}

/** La regola cresce con le fasi e nomina solo quello che la fase chiede (PERCORSO.md §23). */
function regolaInvitati(fase: number): string {
  const primo = 'Il primo invitato esce dal suo cassetto della lista, aperto con le quadre e la targhetta, e la lista intera si stampa con un `print` della lista: non valgono nomi scritti a mano nei `print`.';
  const ultimo = fase >= 2 ? " Anche l'ultimo invitato esce da un cassetto della lista, e quanti sono lo dice `len`: non valgono numeri di invitati scritti a mano." : '';
  const append = fase >= 3 ? ' I ritardatari entrano nella lista con `append`, non riscrivendo la lista da capo.' : '';
  const nuovo = fase >= 4 ? " L'invitato dell'ultimo minuto arriva da `input()` ed entra in fondo alla lista con `append`: non valgono nomi scritti nel programma per lui." : '';
  const posti =
    fase === 5
      ? ' I posti arrivano da `input()` con `int()`, e se bastano lo decide un `if` che confronta `len` della lista con i posti: non valgono numeri di invitati o di posti scritti a mano.'
      : '';
  return primo + ultimo + append + nuovo + posti;
}

export function fasiInvitati(seme: number): Esercizio[] {
  const p = parametriInvitati(seme);
  const { lista, ritardatari, ultimoMinuto } = p;
  const b = { ...base, terreno: 'pianura' as const };
  const domandaNome = 'Chi aggiungi? ';
  const domandaPosti = 'Quanti posti ha la sala? ';
  const tutti = [...lista, ...ritardatari];
  const prove4: Prova[] = ultimoMinuto.map((nome) => ({ risposte: [nome], output: righeInvitati([...tutti, nome], 4) }));
  const prove5: Prova[] = ultimoMinuto.map((nome, k) => ({
    risposte: [nome, String(POSTI_PROVA[k])],
    output: righeInvitati([...tutti, nome], 5, POSTI_PROVA[k]),
  }));
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
  const scrittaLista = `invitati = ${scritta(lista)}`;
  const aggiunti = ritardatari.map((n) => `invitati.append("${n}")`).join('\n');
  const chiediNome = `nuovo = input("${domandaNome}")\ninvitati.append(nuovo)`;
  const chiediPosti = `posti = int(input("${domandaPosti}"))`;
  const r1 = `${scrittaLista}\n${stampa}`;
  const r2 = `${scrittaLista}\n${stampa2}`;
  const r3 = `${scrittaLista}\n${aggiunti}\n${stampa2}`;
  const r4 = `${scrittaLista}\n${aggiunti}\n${chiediNome}\n${stampa2}`;
  const r5 =
    `${scrittaLista}\n${aggiunti}\n${chiediNome}\n${chiediPosti}\n${stampa2}\n` +
    'if len(invitati) > posti:\n    print(f"Posti mancanti: {len(invitati) - posti}")\nelse:\n    print(f"Posti liberi: {posti - len(invitati)}")';

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
      `**Fase 4 — l'invitato dell'ultimo minuto.** All'ultimo minuto ${p.festeggiato} vuole aggiungere un amico, ma chi sia lo sa solo lui, quando usa il programma. ` +
        `Dopo i ritardatari chiedi \`${domandaNome}\` con \`input()\` e metti la risposta in fondo alla lista con \`append\`. Le righe dopo restano quelle: ` +
        `l'ultimo invitato adesso è lui, e gli invitati diventano ${tutti.length + 1}. Risposta di prova: **${ultimoMinuto[0]}**, ma il programma deve funzionare con qualunque nome.`,
      r4,
      prove4[0].output,
      { prove: prove4 },
    ),
    fase(
      5,
      `**Fase 5 — c'è posto per tutti?** Subito dopo il nome chiedi anche \`${domandaPosti}\` con \`input()\` e \`int()\`. In fondo, dopo le righe di prima, un \`if\`: ` +
        `se gli invitati sono più dei posti stampa quanti posti mancano (\`Posti mancanti: 2\`), altrimenti quanti ne restano liberi (\`Posti liberi: ${POSTI_PROVA[0] - INVITATI_FINALI}\`). ` +
        `Quanti sono gli invitati lo sa \`len\`. Risposte di prova: **${ultimoMinuto[0]}**, poi **${POSTI_PROVA[0]}**.`,
      r5,
      prove5[0].output,
      { prove: prove5 },
    ),
  ], noteInvitati(p));
}

export function schedaInvitati(seme: number): SchedaCompito {
  const p = parametriInvitati(seme);
  return {
    id: 'invitati',
    titolo: 'Gli invitati della festa',
    committente:
      `${p.festeggiato} organizza la sua festa e vuole un programma che si ricordi i nomi di tutti gli invitati. Una variabile per invitato non basta: ` +
      `ci vuole una lista, la cassettiera, un nome solo e un cassetto per invitato, che cresce quando serve. All'ultimo minuto ${p.festeggiato} aggiunge ` +
      `un amico, e vuole sapere se la sala ha posto per tutti.`,
    prodotto: "La lista degli invitati: tutta, il primo, l'ultimo e quanti sono, anche dopo i ritardatari e l'invitato dell'ultimo minuto; e se i posti della sala bastano.",
    dati: [
      `Festeggiato: ${p.festeggiato}`,
      `Invitati già in lista: ${p.lista.join(', ')}`,
      `Ritardatari (fase 3): ${p.ritardatari.join(', ')}`,
      `Invitato dell'ultimo minuto di prova (fasi 4-5): ${p.ultimoMinuto[0]}`,
      `Posti della sala di prova (fase 5): ${POSTI_PROVA[0]}`,
    ],
    outputFinale: righeInvitati([...p.lista, ...p.ritardatari, p.ultimoMinuto[0]], 5, POSTI_PROVA[0]),
  };
}

function noteInvitati(p: ParametriInvitati): string[] {
  const { lista, ritardatari, ultimoMinuto } = p;
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
    'Dopo i due append: nuovo = input(...) e poi invitati.append(nuovo), senza virgolette intorno a nuovo (è la variabile, non il testo); i print restano quelli. ' +
      "Far capire: la lista non deve sapere prima chi arriva, il cassetto nuovo si aggiunge quando il nome c'è; l'ultimo e il numero li ritrovano da soli len e len meno uno. " +
      `Errori tipici: invitati.append("${ultimoMinuto[0]}") scritto a mano (passa la prova mostrata, cade sulle nascoste), invitati.append("nuovo") con le virgolette (aggiunge la parola nuovo), ` +
      "l'input messo dopo i print (la lista stampata non lo contiene), la risposta salvata ma l'append dimenticato.",
    `La seconda domanda con int(input(...)) subito dopo la prima; in fondo if len(invitati) > posti: con il print dei posti mancanti, else con quello dei posti liberi. ` +
      'I due conti sono len(invitati) - posti e posti - len(invitati), dentro le graffe. ' +
      "Far capire: con tanti posti quanti invitati non manca niente: i posti liberi sono 0 (una prova nascosta lo controlla). " +
      `Errori tipici: >= al posto di > (con posti giusti stampa «Posti mancanti: 0»), il ${INVITATI_FINALI} scritto a mano al posto di len, int dimenticato (confronta un numero con un testo), ` +
      'le due domande in ordine scambiato rispetto alle risposte di prova, i conti invertiti (numeri negativi).',
  ];
}

/* ------------------------------------------------------------- 2. l'ordine d'arrivo */

const GARE = ['la corsa in bici della scuola', 'la gara di mountain bike del quartiere', 'la cronoscalata del paese', 'la pedalata di fine anno'] as const;

interface ParametriArrivo {
  gara: string;
  /** L'ordine d'arrivo scritto nel programma: cinque corridori. */
  arrivi: string[];
  /** Il ritardatario da `input()` (fasi 4-5): quello della prova mostrata e due nascosti. */
  ritardatari: [string, string, string];
}

function parametriArrivo(seme: number): ParametriArrivo {
  const rnd = generatore(seme);
  const gara = GARE[Math.floor(rnd() * GARE.length)];
  const arrivi = nomiDiversi(rnd, 5);
  const [a, b, c] = nomiDiversi(rnd, 3, arrivi);
  return { gara, arrivi, ritardatari: [a, b, c] };
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
  const podio = 'I nomi del podio escono dai cassetti della lista, aperti con le quadre e la targhetta: non valgono nomi scritti a mano nei `print`.';
  const nera = fase >= 2 ? " La maglia nera è l'ultimo cassetto della lista e quanti sono arrivati lo dice `len`: niente numeri di arrivati scritti a mano." : '';
  const posizione =
    fase >= 3 ? ' La posizione arriva da `input()`, e il nome esce dal cassetto la cui targhetta è calcolata dalla posizione: non valgono nomi né targhette scritti a mano per la posizione di prova.' : '';
  const ritardo = fase >= 4 ? ' Il ritardatario arriva da `input()` ed entra in fondo alla lista con `append`: non valgono nomi scritti nel programma per lui.' : '';
  const fuori = fase === 5 ? ' Che la posizione non ci sia lo decide un `if` che confronta la posizione con `len` della lista, prima di aprire il cassetto.' : '';
  return podio + nera + posizione + ritardo + fuori;
}

export function fasiArrivo(seme: number): Esercizio[] {
  const p = parametriArrivo(seme);
  const { arrivi, ritardatari } = p;
  const b = { ...base, terreno: 'collina' as const };
  const domandaNome = 'Chi arriva adesso? ';
  const domandaPos = 'Quale posizione? ';
  const conRitardo = (nome: string) => [...arrivi, nome];
  /** Fase 3: la lista è fissa (5), cambia solo la posizione: la quarta, poi i due confini. */
  const prove3: Prova[] = [POSIZIONE_MOSTRATA, 1, arrivi.length].map((pos) => ({ risposte: [String(pos)], output: righeArrivo(arrivi, 3, pos) }));
  /** Fasi 4-5: cambiano il ritardatario e la posizione. Alla 4 il ritardatario stesso (l'ultimo) e il primo;
   *  alla 5 una posizione fuori di uno e una proprio sull'ultimo (fa cadere `>=`). */
  const posizioni = (fase: 4 | 5): number[] =>
    fase === 4 ? [POSIZIONE_MOSTRATA, arrivi.length + 1, 1] : [POSIZIONE_MOSTRATA, arrivi.length + 2, arrivi.length + 1];
  const prove = (fase: 4 | 5): Prova[] =>
    ritardatari.map((nome, k) => ({ risposte: [nome, String(posizioni(fase)[k])], output: righeArrivo(conRitardo(nome), fase, posizioni(fase)[k]) }));
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
  const ritardo = `ritardatario = input("${domandaNome}")\narrivi.append(ritardatario)`;
  const r1 = `${lista}\n${podio}`;
  const r2 = `${r1}\n${nera}`;
  const r3 = `${r2}\n${chiedi}\n${chi}`;
  const r4 = `${lista}\n${ritardo}\n${podio}\n${nera}\n${chiedi}\n${chi}`;
  const r5 = `${lista}\n${ritardo}\n${podio}\n${nera}\n${chiedi}\nif posizione > len(arrivi):\n    print(f"Nessun corridore al {posizione}° posto")\nelse:\n    ${chi}`;
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
      `**Fase 4 — il ritardatario.** Quando le righe sembravano finite arriva un altro corridore, staccatissimo: chi sia lo scrive il giudice quando usa il programma. ` +
        `Subito dopo la lista chiedi \`${domandaNome}\` con \`input()\` e metti il nome in fondo con \`append\`. Le righe dopo restano quelle: la maglia nera adesso è sua, ` +
        `gli arrivati diventano ${arrivi.length + 1}, e la domanda della posizione deve funzionare anche per lui. Risposte di prova: **${ritardatari[0]}**, poi **${POSIZIONE_MOSTRATA}**.`,
      r4,
      pr4[0].output,
      { prove: pr4 },
    ),
    fase(
      5,
      `**Fase 5 — la posizione che non c'è.** Con ${arrivi.length + 1} arrivati, se il giudice chiede la posizione ${arrivi.length + 2} il programma apre un cassetto che non c'è e si ferma con un errore. ` +
        `Prima di aprirlo, un \`if\`: se la posizione è oltre quanti sono arrivati stampa \`Nessun corridore al ${arrivi.length + 2}° posto\` (con la posizione chiesta), altrimenti la riga di prima. ` +
        `Risposte di prova: **${ritardatari[0]}**, poi **${POSIZIONE_MOSTRATA}**.`,
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
    prodotto: "Il traguardo: il podio, la maglia nera, gli arrivati e chi è arrivato nella posizione chiesta, anche con un ritardatario e quando quella posizione non c'è.",
    dati: [
      `Gara: ${p.gara}`,
      `Ordine d'arrivo: ${p.arrivi.join(', ')}`,
      `Ritardatario di prova (fasi 4-5): ${p.ritardatari[0]}`,
      `Posizione di prova: ${POSIZIONE_MOSTRATA}`,
    ],
    outputFinale: righeArrivo([...p.arrivi, p.ritardatari[0]], 5, POSIZIONE_MOSTRATA),
  };
}

function noteArrivo(p: ParametriArrivo): string[] {
  const { arrivi, ritardatari } = p;
  const n = arrivi.length;
  return [
    'La lista scritta fra quadre con le virgole, poi tre print con le f-string: arrivi[0], arrivi[1], arrivi[2]. ' +
      'Far capire: la targhetta dice quanti cassetti ci sono prima; chi arriva primo non ha nessuno davanti, quindi targhetta 0: la posizione è la targhetta più uno. ' +
      `Errori tipici: arrivi[1] per il primo (tutto il podio slitta di uno: 1° ${arrivi[1]}), i nomi scritti a mano nei print (il giudice li boccia), ` +
      'la virgola fra i nomi dimenticata, le quadre della lista dentro la f-string fuori dalle graffe.',
    `La maglia nera è arrivi[len(arrivi) - 1] (qui arrivi[${n - 1}] passa, ma alla fase 4 arriva un ritardatario), gli arrivati sono len(arrivi). ` +
      `Errori tipici: arrivi[${n}] o arrivi[len(arrivi)] (il cassetto che non c'è: l'ultima targhetta è len meno uno), il ${n} scritto nel testo (il giudice lo boccia).`,
    'Dopo le righe di prima: posizione = int(input(...)), poi la f-string con la posizione e arrivi[posizione - 1]. ' +
      `Far capire: chi arriva ${POSIZIONE_MOSTRATA}° ha ${POSIZIONE_MOSTRATA - 1} corridori davanti, quindi la sua targhetta è ${POSIZIONE_MOSTRATA - 1}: si toglie uno alla posizione. ` +
      `Errori tipici: arrivi[posizione] (con ${POSIZIONE_MOSTRATA} stampa ${arrivi[POSIZIONE_MOSTRATA]}, con ${n} apre un cassetto che non c'è), input senza int (fra le quadre ci vuole un numero), ` +
      `arrivi[${POSIZIONE_MOSTRATA - 1}] scritto a mano (passa la prova mostrata, cade sulle posizioni 1 e ${n}).`,
    'Subito dopo la lista: ritardatario = input(...) e arrivi.append(ritardatario), senza virgolette intorno alla variabile; poi tutte le righe di prima, uguali. ' +
      `Far capire: le righe scritte con len e len meno uno trovano da sole la nuova maglia nera e i ${n + 1} arrivati; il ritardatario arriva ${n + 1}°, e una prova nascosta chiede proprio lui. ` +
      `Errori tipici: arrivi.append("${ritardatari[0]}") scritto a mano (cade sulle prove nascoste), l'input messo dopo il podio o dopo la maglia nera (la maglia nera resta ${arrivi[n - 1]}), ` +
      `la maglia nera presa con arrivi[${n - 1}] dalla fase 2 (sbaglia: adesso l'ultimo è un altro), la domanda della posizione fatta prima di quella del ritardatario.`,
    "Un if prima di aprire il cassetto: if posizione > len(arrivi) stampa la f-string «Nessun corridore al ...° posto», else la riga della fase 3. " +
      `Far capire: con ${n + 1} arrivati le targhette vanno da 0 a ${n}, quindi le posizioni da 1 a ${n + 1}; la posizione ${n + 2} non c'è. ` +
      "Errori tipici: >= al posto di > (sbaglia proprio sull'ultimo arrivato: la prova nascosta lo controlla), l'if messo dopo aver già aperto il cassetto, " +
      'il confronto con la targhetta invece che con la posizione (posizione - 1 > len), il numero di corridori scritto a mano nell\'if.',
  ];
}

/* ------------------------------------------------------- 3. la playlist della festa */

/** Titoli inventati, corti, senza apostrofi (la lista stampata li mette fra apici). */
const CANZONI = [
  'Onde lunghe', 'Notte in moto', 'Cuore di neon', 'Estate pazza', 'Ballo sul tetto', 'Corri forte', 'Mare calmo',
  'Salto nel vuoto', 'Strade di vetro', 'Fuoco lento', 'Vento del sud', 'Ultimo treno', 'Cielo blu', 'Sabato sera',
] as const;

interface ParametriPlaylist {
  festeggiato: string;
  /** La playlist scritta nel programma. */
  lista: string[];
  /** Le due richieste degli amici, in fondo con `append` (fase 1); l'ultima è quella tolta con `pop` (fase 3). */
  richieste: [string, string];
  /** La canzone del festeggiato, in testa con `insert(0, ...)` (fase 2). */
  preferita: string;
  /** Le richieste da `input()` (fasi 4-5): quella della prova mostrata e due nascoste. */
  chieste: [string, string, string];
}

function parametriPlaylist(seme: number): ParametriPlaylist {
  const rnd = generatore(seme);
  const festeggiato = FESTEGGIATI[Math.floor(rnd() * FESTEGGIATI.length)];
  const titoli: string[] = [];
  while (titoli.length < 10) {
    const t = CANZONI[Math.floor(rnd() * CANZONI.length)];
    if (!titoli.includes(t)) titoli.push(t);
  }
  return {
    festeggiato,
    lista: titoli.slice(0, 4),
    richieste: [titoli[4], titoli[5]],
    preferita: titoli[6],
    chieste: [titoli[7], titoli[8], titoli[9]],
  };
}

/** Il posto chiesto alla fase 4: il mostrato in mezzo, poi il primo e uno più in là (`insert(posto)` deve cadere). */
const POSTI_RICHIESTA = [3, 1, 5] as const;
/** Le canzoni in scaletta quando si salta (fase 5): 4 + 2 richieste + la preferita − la tolta + la chiesta. */
const IN_SCALETTA = 7;
/** Il posto da saltare (fase 5): uno che c'è, uno che non c'è (il secondo esempio), proprio l'ultimo (fa cadere `>=`). */
const POSTI_SALTO = [2, IN_SCALETTA + 1, IN_SCALETTA] as const;

const nonCe = (posto: number, quante: number) => `Non c'è la canzone ${posto}: in scaletta sono ${quante}`;

/** La playlist dopo le fasi, e le righe che il programma stampa. */
function righePlaylist(p: ParametriPlaylist, fase: 1 | 2 | 3 | 4 | 5, k = 0): string[] {
  const playlist = [...p.lista, ...p.richieste];
  const righe: string[] = [];
  if (fase >= 2) playlist.unshift(p.preferita);
  if (fase >= 3) righe.push(`Tolta: ${playlist.pop()}`);
  if (fase >= 4) playlist.splice(POSTI_RICHIESTA[k] - 1, 0, p.chieste[k]);
  if (fase === 5) {
    const posto = POSTI_SALTO[k];
    righe.push(posto > playlist.length ? nonCe(posto, playlist.length) : `Saltata: ${playlist.splice(posto - 1, 1)[0]}`);
  }
  righe.push(sdraiata(playlist), `Canzoni: ${playlist.length}`);
  if (fase >= 2) righe.push(`Si comincia con: ${playlist[0]}`);
  return righe;
}

function regolaPlaylist(fase: number): string {
  const append = 'Le due richieste entrano in fondo alla lista con `append`, non riscrivendo la lista da capo; la lista si stampa con un `print` della lista e quante sono le canzoni lo dice `len`: niente numeri scritti a mano.';
  const insert = fase >= 2 ? ' La canzone del festeggiato entra in testa con `insert` e la targhetta 0, non riscrivendo la lista, e la prima canzone esce dal cassetto 0: non valgono titoli scritti a mano nei `print`.' : '';
  const pop = fase >= 3 ? " L'ultima canzone si toglie con `pop`, e il titolo stampato è quello che `pop` ha tolto (o quello letto dall'ultimo cassetto prima di toglierlo): non vale togliere l'`append` né scrivere il titolo a mano." : '';
  const richiesta = fase >= 4 ? ' La canzone chiesta e il suo posto arrivano da `input()`, e la canzone entra con `insert` alla targhetta calcolata dal posto: non valgono titoli né targhette scritti a mano.' : '';
  const salto =
    fase === 5
      ? ' Il posto da saltare arriva da `input()` con `int()`; se quel posto c\'è lo decide un `if` che confronta il posto con `len` della lista, e la canzone saltata si toglie con `pop` alla targhetta calcolata dal posto.'
      : '';
  return append + insert + pop + richiesta + salto;
}

export function fasiPlaylist(seme: number): Esercizio[] {
  const p = parametriPlaylist(seme);
  const { lista, richieste, preferita, chieste, festeggiato } = p;
  const b = { ...base, terreno: 'collina' as const };
  const domandaCanzone = 'Che canzone vuoi? ';
  const domandaPosto = 'A che posto la metti? ';
  const domandaSalto = 'Che posto salti? ';
  const prove4: Prova[] = chieste.map((c, k) => ({ risposte: [c, String(POSTI_RICHIESTA[k])], output: righePlaylist(p, 4, k) }));
  const prove5: Prova[] = chieste.map((c, k) => ({ risposte: [c, String(POSTI_RICHIESTA[k]), String(POSTI_SALTO[k])], output: righePlaylist(p, 5, k) }));
  const fase = (n: 1 | 2 | 3 | 4 | 5, consegna: string, soluzione: string, outputAtteso: string[], extra: Partial<Esercizio> = {}): Esercizio => ({
    ...b,
    consegna,
    outputAtteso,
    soluzione,
    regola: regolaPlaylist(n),
    ...extra,
  });

  const scrittaLista = `playlist = ${scritta(lista)}`;
  const aggiunte = richieste.map((c) => `playlist.append("${c}")`).join('\n');
  const inTesta = `playlist.insert(0, "${preferita}")`;
  const togli = 'tolta = playlist.pop()\nprint(f"Tolta: {tolta}")';
  const chiedi = `richiesta = input("${domandaCanzone}")\nposto = int(input("${domandaPosto}"))\nplaylist.insert(posto - 1, richiesta)`;
  const salta =
    `salto = int(input("${domandaSalto}"))\nif salto > len(playlist):\n    print(f"Non c'è la canzone {salto}: in scaletta sono {len(playlist)}")\n` +
    'else:\n    saltata = playlist.pop(salto - 1)\n    print(f"Saltata: {saltata}")';
  const stampa = 'print(playlist)\nprint(f"Canzoni: {len(playlist)}")';
  const prima = 'print(f"Si comincia con: {playlist[0]}")';
  const r1 = `${scrittaLista}\n${aggiunte}\n${stampa}`;
  const r2 = `${scrittaLista}\n${aggiunte}\n${inTesta}\n${stampa}\n${prima}`;
  const r3 = `${scrittaLista}\n${aggiunte}\n${inTesta}\n${togli}\n${stampa}\n${prima}`;
  const r4 = `${scrittaLista}\n${aggiunte}\n${inTesta}\n${togli}\n${chiedi}\n${stampa}\n${prima}`;
  const r5 = `${scrittaLista}\n${aggiunte}\n${inTesta}\n${togli}\n${chiedi}\n${salta}\n${stampa}\n${prima}`;

  return conNote([
    fase(
      1,
      `**Fase 1 — le richieste.** Per la festa di ${festeggiato} c'è già la playlist: \`playlist = ${scritta(lista)}\`. Due amici chiedono ${elenco(richieste)}: ` +
        `aggiungile **in fondo** con \`append\`, una per riga, senza riscrivere la lista. Poi stampa la playlist intera e \`Canzoni: ${lista.length + 2}\`, contate da \`len\`.`,
      r1,
      righePlaylist(p, 1),
    ),
    fase(
      2,
      `**Fase 2 — prima di tutte.** ${festeggiato} vuole che la festa cominci con la sua canzone, **${preferita}**. \`append\` mette solo in fondo: per mettere un cassetto ` +
        `in un posto preciso c'è \`insert\`, che vuole due cose fra le tonde, separate da una virgola: **la targhetta** del cassetto nuovo e **quello da metterci**. ` +
        `Con \`playlist.insert(0, ...)\` la canzone va nel cassetto 0, e tutte le altre scalano di un posto. Mettila dopo le richieste, prima dei \`print\`, ` +
        `e in fondo stampa \`Si comincia con: ${preferita}\`, prendendo il titolo dal primo cassetto.`,
      r2,
      righePlaylist(p, 2),
    ),
    fase(
      3,
      `**Fase 3 — una di troppo.** La festa dura poco: l'ultima canzone, **${richieste[1]}**, non ci sta più. Per togliere un cassetto c'è \`pop\`: \`playlist.pop()\`, con le tonde vuote, ` +
        `toglie **l'ultimo** e ti dà quello che c'era dentro, così lo puoi mettere in una variabile (\`tolta = playlist.pop()\`). Toglila subito dopo l'\`insert\` e stampa ` +
        `\`Tolta: ${richieste[1]}\` con il titolo che \`pop\` ti ha dato. Le righe dopo trovano da sole la playlist più corta.`,
      r3,
      righePlaylist(p, 3),
    ),
    fase(
      4,
      `**Fase 4 — la richiesta.** Durante la festa un amico chiede una canzone e dice anche a che posto vuole sentirla. Dopo il \`pop\` chiedi \`${domandaCanzone}\` e poi ` +
        `\`${domandaPosto}\` (con \`int()\`), e metti la canzone nella playlist con \`insert\`. Attenzione: il posto **non** è la targhetta. Chi vuole la sua canzone al 3° posto ` +
        `quante canzoni vuole prima? Risposte di prova: **${chieste[0]}**, poi **${POSTI_RICHIESTA[0]}**; il programma deve funzionare con ogni canzone e ogni posto.`,
      r4,
      prove4[0].output,
      { prove: prove4 },
    ),
    fase(
      5,
      `**Fase 5 — la canzone da saltare.** Una canzone proprio non piace: chiedi \`${domandaSalto}\` con \`int()\` e toglila con \`pop\`, che con una targhetta fra le tonde ` +
        `(\`playlist.pop(0)\` toglie la prima) toglie quel cassetto e non l'ultimo. Stampa \`Saltata: …\` con il titolo tolto. Ma il posto potrebbe non esserci: prima di togliere, un \`if\` che ` +
        `lo confronta con quante canzoni ci sono, e se è oltre stampa \`Non c'è la canzone ${IN_SCALETTA + 1}: in scaletta sono ${IN_SCALETTA}\` (con il posto chiesto e il numero vero). ` +
        `Tutto prima dei \`print\` della playlist. Risposte di prova: **${chieste[0]}**, **${POSTI_RICHIESTA[0]}**, poi **${POSTI_SALTO[0]}**.`,
      r5,
      prove5[0].output,
      { prove: prove5 },
    ),
  ], notePlaylist(p));
}

export function schedaPlaylist(seme: number): SchedaCompito {
  const p = parametriPlaylist(seme);
  return {
    id: 'playlist',
    titolo: 'La playlist della festa',
    committente:
      `Alla festa di ${p.festeggiato} la musica la decide un programma: la playlist è una lista, e durante la festa cambia. Le canzoni nuove si aggiungono in fondo ` +
      `con \`append\` o in un posto preciso con \`insert\`, quelle che non servono più si tolgono con \`pop\`. Il programma stampa sempre la playlist com'è adesso.`,
    prodotto: 'La playlist della festa: le richieste in fondo, la canzone del festeggiato in testa, una tolta, una chiesta al posto giusto e una saltata, se quel posto c\'è.',
    dati: [
      `Festeggiato: ${p.festeggiato}`,
      `Playlist di partenza: ${p.lista.join(', ')}`,
      `Richieste degli amici (fase 1): ${p.richieste.join(', ')}`,
      `La canzone di ${p.festeggiato} (fase 2): ${p.preferita}`,
      `Canzone chiesta e posto di prova (fasi 4-5): ${p.chieste[0]}, al ${POSTI_RICHIESTA[0]}° posto`,
      `Posto da saltare di prova (fase 5): ${POSTI_SALTO[0]}`,
    ],
    outputFinale: righePlaylist(p, 5),
  };
}

function notePlaylist(p: ParametriPlaylist): string[] {
  const { lista, richieste, preferita, chieste } = p;
  return [
    `Dopo la lista due righe playlist.append("${richieste[0]}") e playlist.append("${richieste[1]}"), poi print(playlist) e il print con len(playlist). ` +
      "Far capire: append (dal video) aggiunge un cassetto in fondo, e i print dopo vedono la lista cresciuta. " +
      'Errori tipici: le richieste aggiunte riscrivendo la lista fra quadre (passa l\'output, il giudice lo boccia), gli append dopo i print, ' +
      `il ${lista.length + 2} scritto a mano nel testo, append con due titoli insieme (errore), le virgolette dimenticate intorno al titolo.`,
    `Dopo gli append: playlist.insert(0, "${preferita}"), poi i print di prima e in fondo print(f"Si comincia con: {playlist[0]}"). ` +
      "insert non è nel video: va detto a parole che vuole prima la targhetta e poi il valore, separati da una virgola, e che i cassetti dopo scalano di uno (nessuno viene sovrascritto). " +
      `Errori tipici: gli argomenti scambiati, insert("${preferita}", 0) (errore: la targhetta dev'essere un numero), playlist[0] = "${preferita}" (sovrascrive ${lista[0]} invece di spingerla avanti), ` +
      `insert(1, ...) pensando al «primo posto», il titolo scritto a mano nel print di Si comincia (il giudice lo boccia).`,
    `Subito dopo l'insert: tolta = playlist.pop() e print(f"Tolta: {tolta}") (va bene anche stampare playlist[len(playlist) - 1] prima del pop). ` +
      "pop non è nel video: va detto che toglie l'ultimo cassetto e dà quello che c'era, per questo si può mettere a destra dell'uguale. " +
      `Errori tipici: togliere l'append di ${richieste[1]} invece di usare pop e stampare il titolo a mano (passa l'output, il giudice lo boccia), ` +
      `pop(0) (toglie ${preferita}, la prima), il pop messo dopo i print, print(f"Tolta: {playlist.pop}") senza le tonde.`,
    `Dopo il pop: richiesta = input(...), posto = int(input(...)), playlist.insert(posto - 1, richiesta). ` +
      `Far capire: il posto è la targhetta più uno, come nell'ordine d'arrivo; al ${POSTI_RICHIESTA[0]}° posto vanno ${POSTI_RICHIESTA[0] - 1} canzoni prima, quindi targhetta ${POSTI_RICHIESTA[0] - 1}. ` +
      `Errori tipici: insert(posto, richiesta) (la mette un posto più in là: cade sulle prove nascoste, una chiede il 1° posto e allora cambia anche «Si comincia con»), ` +
      `insert(posto - 1, "richiesta") con le virgolette, il titolo «${chieste[0]}» o il ${POSTI_RICHIESTA[0] - 1} scritti a mano, int dimenticato (la targhetta non è un numero), append al posto di insert.`,
    `Dopo l'insert della richiesta: salto = int(input(...)); if salto > len(playlist): il print «Non c'è la canzone ...: in scaletta sono ...» con salto e len(playlist); else: saltata = playlist.pop(salto - 1) e print(f"Saltata: {saltata}"). ` +
      `Far capire: con ${IN_SCALETTA} canzoni le targhette vanno da 0 a ${IN_SCALETTA - 1}, i posti da 1 a ${IN_SCALETTA}; pop con una targhetta toglie quel cassetto e non l'ultimo, e il controllo si fa prima di togliere. ` +
      `Errori tipici: pop(salto) (toglie quella dopo, e con il posto ${IN_SCALETTA} cerca un cassetto che non c'è), >= al posto di > (sbaglia proprio sull'ultima: una prova nascosta lo controlla), ` +
      `il ${IN_SCALETTA} scritto a mano nell'if o nel testo, l'if messo dopo i print della playlist (la playlist stampata ha ancora la canzone saltata).`,
  ];
}

/* ------------------------------------------------------------ 4. i biglietti d'invito */

interface ParametriBiglietti {
  festeggiato: string;
  /** La lista scritta nel programma. */
  lista: string[];
  /** I due che arrivano dopo, con `append` (fase 3). */
  ritardatari: string[];
  /** Le risposte, una per invitato nello stesso ordine (fasi 4-5): `sì` o `no`, almeno due di ciascuna, mai metà e metà. */
  risposte: string[];
}

const quantiSi = (risposte: string[]) => risposte.filter((r) => r === 'sì').length;

function parametriBiglietti(seme: number): ParametriBiglietti {
  const rnd = generatore(seme);
  const festeggiato = FESTEGGIATI[Math.floor(rnd() * FESTEGGIATI.length)];
  const lista = nomiDiversi(rnd, 4);
  const ritardatari = nomiDiversi(rnd, 2, lista);
  let risposte: string[] = [];
  do risposte = [...lista, ...ritardatari].map(() => (rnd() < 0.6 ? 'sì' : 'no'));
  // Almeno due sì e due no, e mai metà e metà: chi conta i no al posto dei sì deve sbagliare.
  while (risposte.filter((r) => r === 'sì').length < 2 || risposte.filter((r) => r === 'no').length < 2 || quantiSi(risposte) * 2 === risposte.length);
  return { festeggiato, lista, ritardatari, risposte };
}

function righeBiglietti(p: ParametriBiglietti, fase: 1 | 2 | 3 | 4 | 5): string[] {
  const nomi = fase >= 3 ? [...p.lista, ...p.ritardatari] : p.lista;
  const biglietto = (nome: string) => `Caro ${nome}, sei invitato alla festa di ${p.festeggiato}!`;
  if (fase === 1) return nomi.map(biglietto);
  if (fase <= 3) return nomi.map((nome, i) => `${i + 1}. ${biglietto(nome)}`);
  const righe = nomi.map((nome, i) => `${i + 1}. ${nome}: ${p.risposte[i] === 'sì' ? 'viene' : 'non viene'}`);
  if (fase === 5) righe.push(`Vengono: ${quantiSi(p.risposte)} su ${nomi.length}`);
  return righe;
}

function regolaBiglietti(fase: number): string {
  const ciclo = 'Le righe le stampa un ciclo `for` sulla lista, con un `print` solo dentro il ciclo per ogni tipo di riga: non valgono nomi scritti a mano né un `print` per invitato.';
  const numero = fase >= 2 ? ' Il numero di ogni riga lo calcola il programma dalla targhetta (o da un contatore): non valgono numeri scritti a mano.' : '';
  const giri =
    fase >= 3
      ? ' I ritardatari entrano con `append`, non riscrivendo la lista, e quanti giri fare lo decide la lista stessa (con `len` o scorrendola): non vale un numero di giri scritto nel `range`.'
      : '';
  const risposte = fase >= 4 ? " Se l'invitato viene lo decide un `if` dentro il ciclo, sul cassetto di `risposte` con la stessa targhetta dell'invitato." : '';
  const conta = fase === 5 ? ' Quanti vengono lo conta una variabile che cresce nel ramo del sì, e quanti sono gli invitati lo dice `len`: niente numeri scritti a mano.' : '';
  return ciclo + numero + giri + risposte + conta;
}

export function fasiBiglietti(seme: number): Esercizio[] {
  const p = parametriBiglietti(seme);
  const { festeggiato, lista, ritardatari, risposte } = p;
  const b = { ...base, terreno: 'pianura' as const };
  const fase = (n: 1 | 2 | 3 | 4 | 5, consegna: string, soluzione: string, extra: Partial<Esercizio> = {}): Esercizio => ({
    ...b,
    consegna,
    outputAtteso: righeBiglietti(p, n),
    soluzione,
    regola: regolaBiglietti(n),
    ...extra,
  });

  const scrittaLista = `invitati = ${scritta(lista)}`;
  const aggiunti = ritardatari.map((n) => `invitati.append("${n}")`).join('\n');
  const scritteRisposte = `risposte = ${scritta(risposte)}`;
  const testo = `sei invitato alla festa di ${festeggiato}!`;
  const ciclo = 'for i in range(len(invitati)):';
  const numerato = `    print(f"{i + 1}. Caro {invitati[i]}, ${testo}")`;
  const seViene = (conta: boolean) =>
    `    if risposte[i] == "sì":\n${conta ? '        vengono += 1\n' : ''}        print(f"{i + 1}. {invitati[i]}: viene")\n    else:\n        print(f"{i + 1}. {invitati[i]}: non viene")`;
  const r1 = `${scrittaLista}\nfor invitato in invitati:\n    print(f"Caro {invitato}, ${testo}")`;
  const r2 = `${scrittaLista}\n${ciclo}\n${numerato}`;
  const r3 = `${scrittaLista}\n${aggiunti}\n${ciclo}\n${numerato}`;
  const r4 = `${scrittaLista}\n${aggiunti}\n${scritteRisposte}\n${ciclo}\n${seViene(false)}`;
  const r5 = `${scrittaLista}\n${aggiunti}\n${scritteRisposte}\nvengono = 0\n${ciclo}\n${seViene(true)}\nprint(f"Vengono: {vengono} su {len(invitati)}")`;
  const tutti = [...lista, ...ritardatari];

  return conNote([
    fase(
      1,
      `**Fase 1 — un biglietto per ognuno.** ${festeggiato} ha la lista degli invitati e vuole un biglietto per ciascuno: \`Caro ${lista[0]}, ${testo}\`. ` +
        `Nell'editor ci sono già la lista e la riga del ciclo, \`for invitato in invitati:\`, che apre i cassetti uno dopo l'altro e mette nella scatola \`invitato\` ` +
        `quello che c'è dentro. Al posto del commento scrivi **una riga sola**, il \`print\` del biglietto: il ciclo la ripete per ogni invitato.`,
      r1,
      { codiceIniziale: `${scrittaLista}\nfor invitato in invitati:\n    # qui il print del biglietto` },
    ),
    fase(
      2,
      `**Fase 2 — i biglietti numerati.** Ogni biglietto ha il suo numero davanti: \`1. Caro ${lista[0]}, ${testo}\`, poi \`2.\` e così via. ` +
        `Adesso non basta sapere **cosa** c'è nel cassetto, serve anche **dove**: la targhetta. Il primo cassetto ha la targhetta 0, ma il biglietto è il numero 1.`,
      r2,
    ),
    fase(
      3,
      `**Fase 3 — i ritardatari.** Prima del ciclo arrivano anche ${elenco(ritardatari)}: aggiungili in fondo con \`append\`. ` +
        `Il ciclo deve stampare da solo ${tutti.length} biglietti, senza che tu cambi una riga dentro: se nel \`range\` avevi scritto un numero, gli ultimi restano senza biglietto, come Giulia nel video.`,
      r3,
    ),
    fase(
      4,
      `**Fase 4 — chi viene?** Sono arrivate le risposte, nello stesso ordine degli invitati: \`${scritteRisposte}\`. Scrivi questa seconda lista prima del ciclo. ` +
        `La risposta di ${tutti[0]} sta nel cassetto 0 di \`risposte\`, quella di ${tutti[1]} nel cassetto 1: la stessa targhetta apre i due cassetti. ` +
        `Al posto del biglietto stampa \`1. ${tutti[0]}: ${risposte[0] === 'sì' ? 'viene' : 'non viene'}\`: \`viene\` oppure \`non viene\`, deciso da un \`if\`.`,
      r4,
    ),
    fase(
      5,
      `**Fase 5 — quanti vengono.** Dopo il ciclo stampa una riga sola con quanti hanno risposto sì e quanti sono gli invitati: ` +
        `\`Vengono: ${quantiSi(risposte)} su ${tutti.length}\`. Ti serve un contatore che cresce solo quando la risposta è sì.`,
      r5,
    ),
  ], noteBiglietti(p));
}

export function schedaBiglietti(seme: number): SchedaCompito {
  const p = parametriBiglietti(seme);
  return {
    id: 'biglietti',
    titolo: "I biglietti d'invito",
    committente:
      `${p.festeggiato} ha la lista degli invitati e deve scrivere un biglietto per ciascuno. Con quattro invitati si fa a mano, ma con duemila? ` +
      `Le righe sono tutte uguali, cambia solo il cassetto: è un lavoro per un ciclo che apre i cassetti uno dopo l'altro. Poi arrivano le risposte, e ${p.festeggiato} vuole sapere chi viene.`,
    prodotto: 'I biglietti numerati per tutti gli invitati, anche i ritardatari; poi, per ognuno, se viene o no, e quanti vengono in tutto.',
    dati: [
      `Festeggiato: ${p.festeggiato}`,
      `Invitati: ${p.lista.join(', ')}`,
      `Ritardatari (fase 3): ${p.ritardatari.join(', ')}`,
      `Risposte, nello stesso ordine (fasi 4-5): ${p.risposte.join(', ')}`,
    ],
    outputFinale: righeBiglietti(p, 5),
  };
}

function noteBiglietti(p: ParametriBiglietti): string[] {
  const { lista, ritardatari, risposte } = p;
  const n = lista.length;
  const tutti = n + ritardatari.length;
  return [
    'Fase guidata: manca il print dentro il ciclo, rientrato, con la f-string e invitato fra graffe. ' +
      'Far capire: è il ciclo del video, for amico in amici: a ogni giro la scatola invitato contiene un nome diverso, e la riga si scrive una volta sola. ' +
      'Errori tipici: invitati fra graffe al posto di invitato (stampa tutta la lista sdraiata in ogni biglietto), il print senza rientro (fuori dal ciclo), ' +
      'quattro print scritti a mano (il giudice li boccia), la f dimenticata.',
    'Serve la targhetta: for i in range(len(invitati)), e nel print i + 1 e invitati[i] fra graffe (va bene anche un contatore che parte da 1 e cresce a ogni giro, con il ciclo di prima). ' +
      "Far capire: nel video, se ti serve solo cosa c'è dentro basta for invitato in invitati; se ti serve anche il numero della targhetta, range di len. " +
      "Errori tipici: {i} senza il più uno (il primo biglietto ha il numero 0), invitati[i + 1] al posto di i + 1 (salta il primo e alla fine apre un cassetto che non c'è), " +
      `range(${n}) scritto a mano (qui passa, alla fase 3 lascia fuori i ritardatari), range(invitati) senza len (errore).`,
    `Due append prima del ciclo; il ciclo resta uguale e stampa da solo ${tutti} biglietti, perché len conta anche i cassetti nuovi. ` +
      `Errori tipici: range(${n}) rimasto dalla fase 2 (gli ultimi due senza biglietto: è il problema di Giulia nel video), range(${tutti}) scritto a mano (passa l'output, il giudice lo boccia), ` +
      'gli append messi dopo il ciclo, la lista riscritta da capo con sei nomi.',
    'La seconda lista risposte fra quadre prima del ciclo; dentro il ciclo un if risposte[i] == "sì" con il print di chi viene, else con quello di chi non viene. ' +
      'Far capire: la stessa targhetta i apre il cassetto del nome in invitati e quello della sua risposta in risposte: è il caso in cui serve sapere dove, non solo cosa. ' +
      `Errori tipici: for invitato in invitati senza la targhetta (non si sa quale risposta guardare), risposte[0] fisso (tutti con la risposta di ${lista[0]}), ` +
      '"si" senza accento (non è uguale a "sì"), il biglietto lasciato insieme alle righe nuove.',
    `vengono = 0 prima del ciclo, vengono += 1 nel ramo del sì, e il print finale dopo il ciclo senza rientro con vengono e len(invitati) fra graffe (risposte sì: ${quantiSi(risposte)}). ` +
      "Errori tipici: vengono azzerato dentro il ciclo (resta 0 o 1), il += nel ramo else (conta chi non viene), il print finale rientrato (una riga per invitato), " +
      `il ${tutti} scritto a mano al posto di len (il giudice lo boccia).`,
  ];
}

/* --------------------------------------------------------------- 5. le uscite in bici */

interface ParametriUscite {
  ciclista: string;
  /** I km delle uscite, in ordine: cinque numeri distanti almeno 2 l'uno dall'altro (il record è uno solo). */
  km: number[];
  /** Gli obiettivi delle prove (fase 5): quello mostrato, uno uguale a un'uscita (il confine), uno sopra tutte. */
  obiettivi: [number, number, number];
}

function parametriUscite(seme: number): ParametriUscite {
  const rnd = generatore(seme);
  const ciclista = NOMI[Math.floor(rnd() * NOMI.length)];
  const distanti = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    return s.every((x, i) => i === 0 || x - s[i - 1] >= 2);
  };
  let km: number[] = [];
  do km = Array.from({ length: 5 }, () => 8 + Math.floor(rnd() * 38));
  while (!distanti(km));
  const s = [...km].sort((a, b) => a - b);
  return { ciclista, km, obiettivi: [s[2] - 1, s[3], s[4] + 5] };
}

const almeno = (km: number[], obiettivo: number) => km.filter((x) => x >= obiettivo).length;
const somma = (km: number[]) => km.reduce((a, x) => a + x, 0);

function righeUscite(p: ParametriUscite, fase: 1 | 2 | 3 | 4 | 5, obiettivo?: number): string[] {
  const righe = p.km.map((x, i) => `Uscita ${i + 1}: ${x} km`);
  const record = Math.max(...p.km);
  if (fase >= 2) righe.push(`Totale: ${somma(p.km)} km`);
  if (fase >= 3) righe.push(`Uscita più lunga: ${record} km`);
  if (fase >= 4) righe.push(`Record all'uscita ${p.km.indexOf(record) + 1}`);
  if (fase === 5 && obiettivo !== undefined) righe.push(`Uscite da almeno ${obiettivo} km: ${almeno(p.km, obiettivo)}`);
  return righe;
}

function regolaUscite(fase: number): string {
  const ciclo =
    'Le righe delle uscite le stampa un ciclo `for` sulla lista dei km, con un `print` solo dentro: non valgono km o numeri di uscita scritti a mano, e quanti giri fare lo decide la lista.';
  const totale = fase >= 2 ? ' Il totale lo tiene una variabile che accumula i km dentro il ciclo: non valgono somme scritte a mano.' : '';
  const record = fase >= 3 ? " La più lunga la ricorda una variabile che il ciclo aggiorna con un `if` quando trova un'uscita più lunga: non valgono km scritti a mano." : '';
  const quale = fase >= 4 ? " In quale uscita c'è il record lo ricorda il programma nello stesso `if`, dalla targhetta (o da un contatore): non valgono numeri scritti a mano." : '';
  const obiettivo = fase === 5 ? " L'obiettivo arriva da `input()` con `int()`, e le uscite che lo raggiungono le conta una variabile nel ramo di un `if` dentro il ciclo." : '';
  return ciclo + totale + record + quale + obiettivo;
}

export function fasiUscite(seme: number): Esercizio[] {
  const p = parametriUscite(seme);
  const { km, obiettivi, ciclista } = p;
  const b = { ...base, terreno: 'collina' as const };
  const domanda = 'Obiettivo in km? ';
  const prove5: Prova[] = obiettivi.map((o) => ({ risposte: [String(o)], output: righeUscite(p, 5, o) }));
  const fase = (n: 1 | 2 | 3 | 4 | 5, consegna: string, soluzione: string, extra: Partial<Esercizio> = {}): Esercizio => ({
    ...b,
    consegna,
    outputAtteso: righeUscite(p, n, obiettivi[0]),
    soluzione,
    regola: regolaUscite(n),
    ...extra,
  });

  const lista = `km = [${km.join(', ')}]`;
  const ciclo = 'for i in range(len(km)):';
  const riga = '    print(f"Uscita {i + 1}: {km[i]} km")';
  const accumula = '    totale += km[i]';
  const piuLunga = (quale: boolean) => `    if km[i] > record:\n        record = km[i]${quale ? '\n        quale = i + 1' : ''}`;
  const conta = '    if km[i] >= obiettivo:\n        raggiunte += 1';
  const stampaTotale = 'print(f"Totale: {totale} km")';
  const stampaRecord = 'print(f"Uscita più lunga: {record} km")';
  const stampaQuale = 'print(f"Record all\'uscita {quale}")';
  const r1 = `${lista}\n${ciclo}\n${riga}`;
  const r2 = `${lista}\ntotale = 0\n${ciclo}\n${riga}\n${accumula}\n${stampaTotale}`;
  const r3 = `${lista}\ntotale = 0\nrecord = 0\n${ciclo}\n${riga}\n${accumula}\n${piuLunga(false)}\n${stampaTotale}\n${stampaRecord}`;
  const r4 = `${lista}\ntotale = 0\nrecord = 0\nquale = 0\n${ciclo}\n${riga}\n${accumula}\n${piuLunga(true)}\n${stampaTotale}\n${stampaRecord}\n${stampaQuale}`;
  const r5 =
    `${lista}\nobiettivo = int(input("${domanda}"))\ntotale = 0\nrecord = 0\nquale = 0\nraggiunte = 0\n${ciclo}\n${riga}\n${accumula}\n${piuLunga(true)}\n${conta}\n` +
    `${stampaTotale}\n${stampaRecord}\n${stampaQuale}\nprint(f"Uscite da almeno {obiettivo} km: {raggiunte}")`;
  const record = Math.max(...km);

  return conNote([
    fase(
      1,
      `**Fase 1 — il diario.** ${ciclista} si allena in bici e ha segnato i km di ogni uscita in una lista: \`${lista}\`. ` +
        `Stampa una riga per uscita, \`Uscita 1: ${km[0]} km\`, \`Uscita 2: ${km[1]} km\` e così via, con un ciclo che apre tutti i cassetti. ` +
        `Ti servono il numero dell'uscita e i km: dove **e** cosa.`,
      r1,
    ),
    fase(
      2,
      `**Fase 2 — il totale.** Dopo le righe delle uscite stampa quanti km ha fatto in tutto: \`Totale: ${somma(km)} km\`. ` +
        'Il totale cresce a ogni giro, con i km del cassetto aperto.',
      r2,
    ),
    fase(
      3,
      `**Fase 3 — l'uscita più lunga.** Stampa anche \`Uscita più lunga: ${record} km\`. Il ciclo deve ricordarsi la più lunga vista finora ` +
        'e cambiarla quando apre un cassetto con più km, come il record della sezione sui cicli for.',
      r3,
    ),
    fase(
      4,
      `**Fase 4 — quale uscita?** Sotto, stampa in quale uscita c'è il record: \`Record all'uscita ${km.indexOf(record) + 1}\`. ` +
        "Quando il ciclo trova un'uscita più lunga si ricorda i km; adesso deve ricordarsi anche **dove** l'ha trovata.",
      r4,
    ),
    fase(
      5,
      `**Fase 5 — l'obiettivo.** Prima del ciclo chiedi \`${domanda}\` con \`input()\` e \`int()\`. In fondo stampa quante uscite sono lunghe **almeno** così: ` +
        `\`Uscite da almeno ${obiettivi[0]} km: ${almeno(km, obiettivi[0])}\`. Risposta di prova: **${obiettivi[0]}**, ma il programma deve funzionare con qualunque obiettivo.`,
      r5,
      { prove: prove5 },
    ),
  ], noteUscite(p));
}

export function schedaUscite(seme: number): SchedaCompito {
  const p = parametriUscite(seme);
  return {
    id: 'uscite',
    titolo: 'Le uscite in bici',
    committente:
      `${p.ciclista} si allena in bici e segna i km di ogni uscita in una lista. Vuole un programma che gli scriva il diario delle uscite, il totale, ` +
      "l'uscita più lunga e in quale uscita l'ha fatta, e quante uscite raggiungono l'obiettivo che sceglie lui.",
    prodotto: "Il diario delle uscite numerate, il totale dei km, il record e la sua uscita, e quante uscite arrivano almeno all'obiettivo.",
    dati: [`Ciclista: ${p.ciclista}`, `Km delle uscite: ${p.km.join(', ')}`, `Obiettivo di prova (fase 5): ${p.obiettivi[0]} km`],
    outputFinale: righeUscite(p, 5, p.obiettivi[0]),
  };
}

function noteUscite(p: ParametriUscite): string[] {
  const { km, obiettivi } = p;
  const record = Math.max(...km);
  return [
    'for i in range(len(km)) e dentro un print con la f-string: i + 1 e km[i] fra graffe (va bene anche for x in km con un contatore che cresce). ' +
      "Far capire: servono il dove (il numero dell'uscita, la targhetta più uno) e il cosa (i km nel cassetto), quindi range di len. " +
      "Errori tipici: {i} senza il più uno (la prima è l'uscita 0), {km} al posto di {km[i]} (stampa tutta la lista), range(5) scritto a mano (il giudice lo boccia), " +
      "km[i + 1] (salta la prima e alla fine apre un cassetto che non c'è).",
    'totale = 0 prima del ciclo, totale += km[i] dentro, e il print del totale dopo il ciclo senza rientro. ' +
      "Far capire: è l'accumulatore della sezione for, solo che adesso a ogni giro si aggiunge il cassetto aperto, non la variabile del ciclo. " +
      'Errori tipici: totale += i (somma le targhette), totale azzerato dentro il ciclo, il print rientrato (un totale per riga), la somma scritta a mano.',
    'record = 0 prima del ciclo; dentro, if km[i] > record: record = km[i]; il print dopo il ciclo. ' +
      `Far capire: la variabile ricorda la più lunga vista finora e la cambia solo quando arriva un cassetto con più km; alla fine vale ${record}. ` +
      `Errori tipici: record = km[i] senza if (resta l'ultima uscita, ${km[km.length - 1]}), il confronto con totale, il print dentro il ciclo, il ${record} scritto a mano.`,
    'Una terza variabile, quale, che si aggiorna nello stesso if: quale = i + 1 accanto a record = km[i]. ' +
      "Far capire: quando si trova il record si ricorda anche dove: la targhetta è il dove, più uno per il numero dell'uscita. " +
      `Errori tipici: quale = i senza il più uno (dice l'uscita prima), quale aggiornata fuori dall'if (resta l'ultima, ${km.length}), quale += 1 (conta i record, non dice dove), ` +
      "il numero scritto a mano, l'apostrofo di all'uscita dentro una f-string con gli apici singoli.",
    'obiettivo = int(input(...)) prima del ciclo, raggiunte = 0 prima del ciclo, dentro if km[i] >= obiettivo: raggiunte += 1, e il print in fondo. ' +
      `Far capire: almeno vuol dire che conta anche l'uscita lunga esattamente come l'obiettivo (una prova nascosta usa ${obiettivi[1]}, che è proprio una delle uscite). ` +
      "Errori tipici: > al posto di >= (cade sul confine), int dimenticato (confronta un numero con un testo), il conteggio dentro l'if del record (conta solo i record), " +
      "raggiunte azzerato nel ciclo, la input dentro il ciclo (chiede l'obiettivo a ogni uscita).",
  ];
}
