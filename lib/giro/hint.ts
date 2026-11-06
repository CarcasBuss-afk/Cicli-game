/* Validazione di una risposta e hint mirati.
 *
 * L'idea arriva da PRINT RUSH: l'errore non toglie punti, costa solo tempo, e ogni
 * errore riceve un suggerimento che dice che cosa guardare — non la soluzione. Gli hint
 * nascono dal confronto fra l'output prodotto e quello atteso, più i messaggi di errore
 * del micro-interprete, che sono già scritti per un allievo.
 *
 * Qui si guarda solo l'output: se è giusto, la risposta è promossa. Che sia fatto come
 * chiede la tappa (il ciclo per davvero, non le righe a mano) lo decide il giudice
 * (giudice.ts), chiamato dal server dopo, sul codice già promosso.
 */
import type { Giudizio } from './giudice';
import { esegui, type CicloVuoto, type RigaSchermo } from './interprete';
import { descriviProva, numeroEsempi, opzioniDiProva, type Esercizio } from './esercizi';

export interface Valutazione {
  promosso: boolean;
  /** Che cosa dire all'allievo quando non è promosso. */
  hint: string | null;
  /** Output prodotto dal suo codice, da mostrare nel pannello (null se non eseguibile). */
  output: string[] | null;
  /** Con le `input()`: lo schermo come lo vedrebbe l'allievo (domande con la risposta, e le righe stampate). */
  schermo?: RigaSchermo[];
  /** La riga del codice (1-based) a cui si riferisce l'hint, quando c'è: l'editor la evidenzia. */
  riga?: number | null;
  /** Il verdetto del giudice, se è stato chiamato (`verificaConsegna`): per il registro del docente. */
  giudizio?: Giudizio;
}

/** Normalizza l'output: via gli spazi a fine riga e le righe vuote finali. */
function normalizza(righe: string[]): string[] {
  const out = righe.map((r) => r.replace(/\s+$/, ''));
  while (out.length > 0 && out[out.length - 1] === '') out.pop();
  return out;
}

function uguali(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((r, i) => r === b[i]);
}

function tuttiNumeri(righe: string[]): boolean {
  return righe.length > 0 && righe.every((r) => /^-?\d+$/.test(r.trim()));
}

/** Passo fra numeri consecutivi, oppure null se non è costante. */
function passo(numeri: number[]): number | null {
  if (numeri.length < 2) return null;
  const p = numeri[1] - numeri[0];
  for (let i = 2; i < numeri.length; i++) {
    if (numeri[i] - numeri[i - 1] !== p) return null;
  }
  return p;
}

function virgolette(s: string): string {
  return `«${s}»`;
}

/* ------------------------------------------------------------- confronto numerico */

/**
 * Confronto fra numeri. Con `conWhile` il codice ha un `while` e nessun `for`: le frasi parlano
 * della condizione e della riga che cambia la variabile, non dei numeri di `range` che non ci sono.
 */
function hintNumerico(prodotto: string[], atteso: string[], conWhile = false): string {
  if (conWhile) return hintNumericoWhile(prodotto, atteso);
  const p = prodotto.map((r) => Number(r.trim()));
  const a = atteso.map((r) => Number(r.trim()));

  // Una riga sola attesa (tappa dell'accumulatore): è un risultato, non una sequenza.
  if (a.length === 1) {
    if (p.length > 1) {
      return `Stampi ${p.length} righe invece di una: il \`print\` va fuori dal ciclo, dopo la somma`;
    }
    return `Ti viene ${p[0]}, invece deve venire ${a[0]}: controlla da dove parte e dove si ferma il ciclo`;
  }

  if (p.length === 1) {
    return `Stampi una riga sola invece di ${a.length}: il \`print\` va dentro il ciclo, spostato a destra`;
  }

  const passoP = passo(p);
  const passoA = passo(a);

  // Il passo prima di tutto: se i numeri vanno di 2 in 2 il resto non si capisce.
  if (passoP !== null && passoA !== null && passoP !== passoA) {
    if (passoA < 0 && passoP > 0) {
      return 'Questi numeri scendono: serve il terzo numero di `range` con il passo negativo, per esempio `range(10, 0, -1)`';
    }
    if (passoA > 0 && passoP < 0) {
      return 'I tuoi numeri scendono, invece devono salire: controlla il passo di `range`';
    }
    return `I tuoi numeri vanno di ${Math.abs(passoP)} in ${Math.abs(passoP)}, devono andare di ${Math.abs(passoA)} in ${Math.abs(passoA)}: è il terzo numero di \`range\` (il passo)`;
  }

  if (p[0] !== a[0]) {
    return `Parti da ${p[0]}, invece il primo numero deve essere ${a[0]}: è il primo numero dentro \`range\``;
  }

  if (p.length !== a.length) {
    const differenza = p.length - a.length;
    if (differenza === 1) {
      return 'Una ripetizione di troppo: `range` si ferma **prima** del secondo numero, quindi va abbassato di 1';
    }
    if (differenza === -1) {
      return 'Una ripetizione di meno: `range` si ferma **prima** del secondo numero, quindi va alzato di 1';
    }
    return `Stampi ${p.length} numeri invece di ${a.length}: cambia il secondo numero di \`range\`, quello dove il ciclo si ferma`;
  }

  const ultimo = p[p.length - 1];
  return `L'ultimo numero che stampi è ${ultimo}, invece deve essere ${a[a.length - 1]}`;
}

/* ----------------------------------------------------------------- confronto testo */

function hintNumericoWhile(prodotto: string[], atteso: string[]): string {
  const p = prodotto.map((r) => Number(r.trim()));
  const a = atteso.map((r) => Number(r.trim()));
  if (a.length === 1) {
    if (p.length > 1) return `Stampi ${p.length} righe invece di una: il \`print\` va fuori dal ciclo, dopo`;
    return `Ti viene ${p[0]}, invece deve venire ${a[0]}: controlla il valore di partenza e la condizione del \`while\``;
  }
  if (p.length === 1) {
    return `Stampi una riga sola invece di ${a.length}: o il \`print\` sta fuori dal ciclo, o il ciclo si ferma dopo un giro. Guarda la riga che cambia la variabile`;
  }
  const passoP = passo(p);
  const passoA = passo(a);
  if (passoP !== null && passoA !== null && passoP !== passoA) {
    if (passoA < 0 && passoP > 0) return 'Questi numeri devono scendere, invece salgono: a ogni giro la variabile deve diminuire, non crescere';
    if (passoA > 0 && passoP < 0) return 'I tuoi numeri scendono, invece devono salire: a ogni giro la variabile deve crescere, non diminuire';
    return `I tuoi numeri cambiano di ${Math.abs(passoP)} in ${Math.abs(passoP)}, devono cambiare di ${Math.abs(passoA)} in ${Math.abs(passoA)}: guarda di quanto cambia la variabile a ogni giro`;
  }
  if (p[0] !== a[0]) {
    return `Parti da ${p[0]}, invece il primo numero deve essere ${a[0]}: controlla il valore di partenza, e se il \`print\` viene prima o dopo la riga che cambia la variabile`;
  }
  if (p.length !== a.length) {
    const differenza = p.length - a.length;
    if (differenza === 1) return 'Una riga di troppo: il ciclo fa un giro in più. Guarda la condizione del `while`, il confronto e il numero a cui si ferma';
    if (differenza === -1) return 'Una riga di meno: il ciclo si ferma un giro prima. Guarda la condizione del `while`, il confronto e il numero a cui si ferma';
    return `Stampi ${p.length} numeri invece di ${a.length}: guarda la condizione del \`while\`, dice quando il ciclo si ferma`;
  }
  return `L'ultimo numero che stampi è ${p[p.length - 1]}, invece deve essere ${a[a.length - 1]}`;
}

function hintTesto(prodotto: string[], atteso: string[]): string {
  if (prodotto.length === 0) {
    return 'Il tuo programma non stampa niente: ci vuole un `print` dentro il ciclo';
  }

  // Una riga di troppo in mezzo (l'`else` dimenticato: escono tutte e due le righe): senza
  // questo l'hint parlava della riga dopo, come se fosse un problema di ordine.
  if (prodotto.length === atteso.length + 1) {
    const i = prodotto.findIndex((r, idx) => r !== atteso[idx]);
    if (i >= 0 && i < atteso.length && uguali([...prodotto.slice(0, i), ...prodotto.slice(i + 1)], atteso)) {
      return `Stampi una riga di troppo: la riga ${i + 1}, ${virgolette(prodotto[i])}, non ci doveva essere`;
    }
  }

  // Stessa frase ripetuta, numero di volte sbagliato: è il caso della tappa "ripeti N volte".
  const unaFrase = new Set(atteso).size === 1 && new Set(prodotto).size === 1 && prodotto[0] === atteso[0];
  if (unaFrase && prodotto.length !== atteso.length) {
    return `Stampi la frase ${prodotto.length} volte invece di ${atteso.length}: cambia il numero dentro \`range\``;
  }

  const i = prodotto.findIndex((r, idx) => r !== atteso[idx]);
  if (i >= 0) {
    const mio = prodotto[i];
    const suo = atteso[i] ?? '(niente)';
    if (atteso[i] === undefined) {
      return `Stampi ${prodotto.length} righe invece di ${atteso.length}: la riga in più è ${virgolette(mio)}`;
    }
    if (mio.toLowerCase() === suo.toLowerCase()) {
      return `Attento alle maiuscole e minuscole: ci vuole ${virgolette(suo)}`;
    }
    // Senza spazi le righe coincidono: ne manca uno o ce n'è uno di troppo (`1 :` invece di `1:`).
    if (mio.replace(/\s+/g, '') === suo.replace(/\s+/g, '')) {
      return `Controlla gli spazi: stampi ${virgolette(mio)}, ci vuole ${virgolette(suo)}`;
    }
    const numeroRiga = i + 1;
    return `Alla riga ${numeroRiga} stampi ${virgolette(mio)}, invece ci vuole ${virgolette(suo)}`;
  }

  // Le righe in comune coincidono: ne mancano o ce ne sono di troppo in fondo.
  if (prodotto.length < atteso.length) {
    // Se le righe che mancano sono ripetizioni di quelle già stampate, il ciclo si è fermato presto.
    // Se sono righe nuove, il ciclo è giusto e manca quello che viene dopo (il print finale, l'else):
    // dire «il ciclo gira poco» mandava a toccare il while giusto.
    const mancanti = atteso.slice(prodotto.length);
    if (mancanti.every((r) => prodotto.includes(r))) {
      return `Stampi ${prodotto.length} righe invece di ${atteso.length}: il ciclo gira troppe poche volte`;
    }
    const giuste = prodotto.length === 1 ? 'la prima riga è giusta' : `le prime ${prodotto.length} righe sono giuste`;
    return `Stampi ${prodotto.length} righe invece di ${atteso.length}: ${giuste}, manca qualcosa in fondo, dopo il ciclo. Rileggi che cosa chiede questa fase`;
  }
  return `Stampi ${prodotto.length} righe invece di ${atteso.length}: il ciclo gira troppe volte`;
}

function hintConfronto(prodotto: string[], atteso: string[], conWhile = false): string {
  if (tuttiNumeri(atteso) && tuttiNumeri(prodotto)) return hintNumerico(prodotto, atteso, conWhile);
  return hintTesto(prodotto, atteso);
}

/* ------------------------------------------------------------ tappe a output segreto */

/**
 * Tappe in cui l'output atteso è il segreto da scoprire. Qui gli hint normali sarebbero
 * una scorciatoia: "alla riga 1 ci vuole «Giro 1»" detta la soluzione, e scrivendo a caso
 * l'allievo se la farebbe dettare riga per riga. In queste tappe si dice **dove** guardare,
 * mai **che cosa** ci va.
 */
const TIPI_SEGRETI: ReadonlySet<Esercizio['tipo']> = new Set(['ciclo-output', 'quante-righe', 'accumulatore', 'conta-giri', 'conta-lettere']);

function hintSegreto(tappa: Esercizio, prodotto: string[], atteso: string[]): string {
  if (tappa.tipo === 'quante-righe') {
    const scritto = prodotto.join(' ').trim();
    if (!/^\d+$/.test(scritto)) return 'Scrivi solo un numero: quante sono le righe, non le righe stesse';
    return `Non sono ${scritto}: rifai il conto. Ricorda che \`range\` si ferma **prima** del secondo numero, e che il passo salta dei numeri`;
  }

  // Un risultato solo (somma, conteggio): si dice che è sbagliato, non quanto deve venire.
  if (atteso.length === 1) {
    if (prodotto.length === 0) return 'Il tuo programma non stampa niente: alla fine ci vuole un `print` del risultato';
    if (prodotto.length > 1) {
      return `Stampi ${prodotto.length} righe invece di una: il \`print\` va fuori dal ciclo, dopo che il ciclo ha finito`;
    }
    return `Ti viene ${prodotto[0]}, ma non è il risultato giusto: controlla da dove parte e dove si ferma il ciclo`;
  }

  if (prodotto.length !== atteso.length) {
    const verso = prodotto.length < atteso.length ? 'di più' : 'di meno';
    return `Hai scritto ${prodotto.length} righe, ma il ciclo ne stampa ${verso}: contale di nuovo`;
  }
  const i = prodotto.findIndex((r, idx) => r !== atteso[idx]);
  const riga = i + 1;
  if (prodotto[i].toLowerCase() === atteso[i].toLowerCase()) return `Attento alle maiuscole alla riga ${riga}`;
  if (prodotto[i].replace(/\s+/g, '') === atteso[i].replace(/\s+/g, '')) {
    return `Controlla gli spazi alla riga ${riga}`;
  }
  return `La riga ${riga} non è giusta: rifai a mente il giro numero ${riga} del ciclo — quanto vale \`i\` in quel momento?`;
}

/* ------------------------------------------------------------- hint per tipo di tappa */

/** Lunghezze delle righe se sono tutte fatte dello stesso simbolo, altrimenti null. */
function lunghezzeDi(righe: string[], simbolo: string): number[] | null {
  return righe.every((r) => [...r].every((c) => c === simbolo)) ? righe.map((r) => r.length) : null;
}

/** Hint su misura per alcuni tipi di tappa, dove quello generico direbbe poco. */
function hintSpecifico(tappa: Esercizio, prodotto: string[], atteso: string[]): string | null {
  if (tappa.tipo === 'scala') {
    const simbolo = atteso[0]?.[0] ?? '*';
    const voluto = lunghezzeDi(atteso, simbolo);
    const fatto = lunghezzeDi(prodotto, simbolo);
    if (!voluto || !fatto || fatto.length === 0) return null;
    const tutteUguali = (l: number[]) => l.every((x) => x === l[0]);
    if (tutteUguali(fatto) && !tutteUguali(voluto)) {
      return 'Le righe devono cambiare lunghezza: dentro il `print` usa la variabile del ciclo, per esempio `"*" * i`';
    }
    if (fatto[0] !== voluto[0]) {
      return `La prima riga ha ${fatto[0]} asterischi, deve averne ${voluto[0]}: guarda il primo numero di \`range\``;
    }
    if (fatto.length !== voluto.length) {
      return `Disegni ${fatto.length} righe invece di ${voluto.length}: guarda dove si ferma \`range\``;
    }
    return null;
  }

  if (tappa.tipo === 'accumulatore-visibile') {
    // Stampa i al posto del totale: è l'errore che rivela che manca l'accumulo.
    const numeri = prodotto.map(Number);
    const sonoGiri = numeri.length > 1 && numeri.every((n, k) => k === 0 || n === numeri[k - 1] + 1);
    if (sonoGiri && !uguali(prodotto, atteso)) {
      return 'Stai stampando `i`, cioè il numero del giro: ti serve una variabile che accumula, per esempio `totale += i`, e stampare quella';
    }
  }
  return null;
}

/* -------------------------------------------------------------------- valutazione */

/** Sceglie l'hint giusto per un output sbagliato. */
function spiega(tappa: Esercizio, prodotto: string[], atteso: string[], conWhile = false): string {
  if (TIPI_SEGRETI.has(tappa.tipo)) return hintSegreto(tappa, prodotto, atteso);
  return hintSpecifico(tappa, prodotto, atteso) ?? hintConfronto(prodotto, atteso, conWhile);
}

function hintWhileVuoto(riga: number): string {
  return `Il ciclo \`while\` alla riga ${riga} non gira nemmeno una volta: la sua condizione è già falsa all'inizio. Controlla il confronto (\`==\` e \`!=\` si confondono) e il valore di partenza della variabile`;
}

/**
 * Se l'output differisce dall'atteso solo per come sono scritte le righe (maiuscole, spazi,
 * punteggiatura), la prima riga sbagliata e che cosa controllare; altrimenti null. Serve
 * sulle prove nascoste: lì la riga sbagliata spesso sta in un ramo che la prova mostrata
 * non percorre, e si cita solo quello che l'allievo stampa, mai l'atteso.
 */
function scivoloneDiTesto(prodotto: string[], atteso: string[]): { riga: string; cosa: string } | null {
  if (prodotto.length !== atteso.length) return null;
  const senzaSpazi = (r: string) => r.replace(/\s+/g, '');
  const nudo = (r: string) => senzaSpazi(r).toLowerCase().replace(/[.,;:!?…]/g, '');
  let primo: { riga: string; cosa: string } | null = null;
  for (let i = 0; i < prodotto.length; i++) {
    const mio = prodotto[i];
    const suo = atteso[i];
    if (mio === suo) continue;
    if (nudo(mio) !== nudo(suo)) return null;
    if (primo) continue;
    let cosa = 'maiuscole, spazi e punteggiatura';
    if (mio.toLowerCase() === suo.toLowerCase()) cosa = 'le maiuscole e le minuscole';
    else if (senzaSpazi(mio) === senzaSpazi(suo)) cosa = 'gli spazi';
    else if (mio.replace(/[.,;:!?…]/g, '') === suo.replace(/[.,;:!?…]/g, '')) cosa = 'la punteggiatura';
    primo = { riga: mio, cosa };
  }
  return primo;
}

/** Un `for` su `range` che non ha fatto nemmeno un giro: il passo va nella direzione sbagliata, o i numeri sono invertiti. */
function hintCicloVuoto(c: CicloVuoto): string {
  const dove = `Il ciclo alla riga ${c.riga} non gira nemmeno una volta`;
  if (c.fine < c.inizio && c.passo > 0) {
    return `${dove}: \`range\` conta in avanti da ${c.inizio}, e ${c.fine} è già passato. Per scendere ci vuole il passo negativo, il terzo numero di \`range\``;
  }
  if (c.fine > c.inizio && c.passo < 0) {
    return `${dove}: con il passo negativo \`range\` conta all'indietro da ${c.inizio}, e ${c.fine} è più grande. Controlla l'ordine dei numeri`;
  }
  return `${dove}: \`range(${c.inizio}, ${c.fine})\` non contiene nessun numero, perché il secondo è escluso. Controlla i numeri dentro \`range\``;
}

/**
 * Dove l'output di una prova nascosta diverge dall'atteso, senza dire che cosa ci andava:
 * quante righe, da quale riga, e la riga dell'allievo. Chi sbaglia il ramo che la prova
 * mostrata non percorre capisce dove guardare.
 */
function descriviDifferenza(prodotto: string[], atteso: string[]): string {
  const k = prodotto.findIndex((r, i) => r !== atteso[i]);
  const prima = k < 0 ? Math.min(prodotto.length, atteso.length) : k;
  // Le righe che stampa sono tutte giuste, ma in un punto ne mancano: è il ramo che con quei
  // dati doveva partire. Si dice fra quali righe sue, mai che cosa ci andava.
  const mancano = atteso.length - prodotto.length;
  if (mancano > 0 && prodotto.length > 0 && uguali(prodotto.slice(prima), atteso.slice(prima + mancano))) {
    const quante = mancano === 1 ? 'manca una riga' : `mancano ${mancano} righe`;
    const dove =
      prima === 0
        ? `prima di ${virgolette(prodotto[0])}`
        : prima === prodotto.length
          ? `dopo ${virgolette(prodotto[prima - 1])}, in fondo`
          : `fra ${virgolette(prodotto[prima - 1])} e ${virgolette(prodotto[prima])}`;
    return `le righe che stampi sono giuste, ma ${quante} ${dove}. Con questi dati il programma deve passare da un pezzo (un ramo, un \`else\`) che con i dati di prova non parte: rileggi la consegna`;
  }
  const righe =
    prodotto.length !== atteso.length
      ? `${prodotto.length} righe invece di ${atteso.length}`
      : atteso.length === 1
        ? 'una riga come deve, ma non quella giusta'
        : `${atteso.length} righe come deve, ma non tutte giuste`;
  if (prima === 0) return `${righe}, e già la prima riga è diversa`;
  const suo = prodotto[prima];
  const dove = suo === undefined ? `dopo la riga ${prima} manca qualcosa` : `alla riga ${prima + 1} stampi ${virgolette(suo)}`;
  const giuste = prima === 1 ? 'la prima riga è giusta' : `le prime ${prima} righe sono giuste`;
  return `${righe}: ${giuste}, ${dove}. Pensa a che cosa deve succedere con quei dati`;
}

/** Il codice senza le differenze che non contano (spazi a fine riga, righe vuote). */
function normalizzaCodice(codice: string): string {
  return codice
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((r) => r.replace(/\s+$/, ''))
    .filter((r) => r !== '')
    .join('\n');
}

/** Valuta la risposta dell'allievo a una tappa. Non modifica niente: decide e spiega. */
export function valutaRisposta(tappa: Esercizio, risposta: string): Valutazione {
  const testo = risposta ?? '';
  if (testo.trim() === '') {
    return {
      promosso: false,
      hint: tappa.risposta === 'codice' ? 'Non hai scritto niente' : 'Scrivi le righe che il ciclo stampa',
      output: null,
    };
  }

  const atteso = normalizza(tappa.outputAtteso);

  // Tappe di inversione: l'allievo scrive l'output, non il codice.
  if (tappa.risposta === 'output') {
    if (/^\s*for\b/.test(testo)) {
      return {
        promosso: false,
        hint: 'Qui non va il codice: scrivi le righe che quel ciclo stampa, una per riga',
        output: null,
      };
    }
    // Gli spazi in testa alla riga scritta a mano non contano: nessuna tappa li chiede.
    const righe = normalizza(testo.replace(/\r\n?/g, '\n').split('\n')).map((r) => r.trimStart());
    if (uguali(righe, atteso)) return { promosso: true, hint: null, output: righe };
    return { promosso: false, hint: spiega(tappa, righe, atteso), output: righe };
  }

  // I trattini del codice da completare: senza questo controllo l'allievo riceverebbe
  // "la variabile `__` non esiste", che non gli dice niente.
  if (testo.includes('__')) {
    return {
      promosso: false,
      hint: 'Sostituisci i trattini `__` con i numeri giusti',
      output: null,
    };
  }

  // Caccia all'errore: consegnare il codice così com'era non è un tentativo.
  if (tappa.codiceIniziale && normalizzaCodice(testo) === normalizzaCodice(tappa.codiceIniziale)) {
    return {
      promosso: false,
      hint: tappa.codiceIniziale.includes('#')
        ? 'Non hai cambiato niente: il codice è ancora quello di partenza. Al posto del commento va la riga che chiede la consegna'
        : 'Non hai cambiato niente: il codice è ancora quello di partenza. Confronta quello che stampa con quello che deve stampare',
      output: null,
    };
  }

  // Con le `input()` si esegue con la prova mostrata; senza, come sempre.
  const prove = tappa.prove && tappa.prove.length > 0 ? tappa.prove : null;
  const esito = esegui(testo, opzioniDiProva(prove?.[0]));
  if (!esito.ok) {
    return { promosso: false, hint: esito.errore.messaggio, output: null, riga: esito.errore.riga };
  }
  const schermo = prove ? esito.schermo : undefined;

  const prodotto = normalizza(esito.output);
  if (!uguali(prodotto, atteso)) {
    // Un `for` che non ha girato nemmeno una volta spiega le righe che mancano meglio di
    // qualunque confronto: senza questo, su `range(6, 0)` l'hint diceva di mettere il print nel ciclo.
    const vuoto = esito.cicliVuoti[0];
    if (vuoto && prodotto.length < atteso.length) {
      return { promosso: false, hint: hintCicloVuoto(vuoto), output: prodotto, schermo, riga: vuoto.riga };
    }
    // Stesso discorso per un `while` che non è entrato mai: `==` al posto di `!=`.
    const whileVuoto = esito.whileVuoti[0];
    if (whileVuoto !== undefined && prodotto.length < atteso.length) {
      return { promosso: false, hint: hintWhileVuoto(whileVuoto), output: prodotto, schermo, riga: whileVuoto };
    }
    const conWhile = esito.struttura.numWhile > 0 && esito.struttura.numFor === 0;
    return { promosso: false, hint: spiega(tappa, prodotto, atteso, conWhile), output: prodotto, schermo };
  }

  // Gli altri esempi mostrati (una fase che aggiunge un ramo), poi le prove nascoste: con
  // altre risposte il programma deve funzionare lo stesso.
  if (prove) {
    const esempi = numeroEsempi(tappa);
    for (const [indice, prova] of prove.entries()) {
      if (indice === 0) continue;
      const altro = esegui(testo, opzioniDiProva(prova));
      if (indice < esempi) {
        // L'esempio si vede nel riquadro atteso: il confronto si può fare apertamente, come sul primo.
        const quale = `Con il primo esempio funziona, ma con il secondo (${descriviProva(prova)})`;
        if (!altro.ok) return { promosso: false, hint: `${quale} il programma si ferma: ${altro.errore.messaggio}`, output: prodotto, schermo, riga: altro.errore.riga };
        const prodottoAltro = normalizza(altro.output);
        const attesoAltro = normalizza(prova.output);
        if (!uguali(prodottoAltro, attesoAltro)) {
          const conWhileAltro = altro.struttura.numWhile > 0 && altro.struttura.numFor === 0;
          const perche = spiega(tappa, prodottoAltro, attesoAltro, conWhileAltro);
          return { promosso: false, hint: `${quale}: ${perche.charAt(0).toLowerCase()}${perche.slice(1)}`, output: altro.output, schermo: altro.schermo };
        }
        continue;
      }
      const daDove = prova.casuali && prova.casuali.length > 0 ? 'i valori devono arrivare da `input()` e da `randint()`, non essere scritti a mano nel programma' : 'i valori devono arrivare da `input()`, non essere scritti a mano nel programma';
      if (!altro.ok) {
        return {
          promosso: false,
          hint: `Con i dati di prova funziona, ma ${descriviProva(prova)} il programma si ferma: ${altro.errore.messaggio}`,
          output: prodotto,
          schermo,
        };
      }
      const prodottoAltro = normalizza(altro.output);
      if (!uguali(prodottoAltro, normalizza(prova.output))) {
        // Una riga scritta male (maiuscole, spazi, punteggiatura) non è un valore a mano:
        // succede nel ramo che la prova mostrata non percorre, e l'hint dell'`input()` confonderebbe.
        const attesoAltro = normalizza(prova.output);
        const scivolone = scivoloneDiTesto(prodottoAltro, attesoAltro);
        // I valori scritti a mano si riconoscono: con altre risposte stampa le stesse righe della
        // prova mostrata, oppure non legge tutte le risposte (o nessun randint). Altrimenti si dice
        // che cosa cambia (quante righe, da dove), senza dettare il contenuto.
        const aMano =
          uguali(prodottoAltro, atteso) ||
          altro.interazioni.length < prova.risposte.length ||
          ((prova.casuali?.length ?? 0) > 0 && altro.struttura.numCasuali === 0);
        const motivo = scivolone
          ? `una riga non è scritta come dice la consegna. Stampi ${virgolette(scivolone.riga)}: controlla ${scivolone.cosa}`
          : aMano
            ? `stampa un'altra cosa: ${daDove}`
            : `stampa un'altra cosa: ${descriviDifferenza(prodottoAltro, attesoAltro)}`;
        return {
          promosso: false,
          hint: `Con i dati di prova funziona, ma ${descriviProva(prova)} ${motivo}`,
          output: prodotto,
          schermo,
        };
      }
    }
  }

  return { promosso: true, hint: null, output: prodotto, schermo };
}
