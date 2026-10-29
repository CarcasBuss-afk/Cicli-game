/* Micro-interprete del sottoinsieme Python del Giro dei Cicli.
 *
 * Serve a validare le tappe per SIMULAZIONE: si esegue il codice dell'allievo e si
 * confronta l'output con quello atteso. Così ogni soluzione corretta vale (`range(5)` e
 * `range(0, 5)` sono equivalenti, il nome della variabile è libero) e dagli scarti
 * nascono gli hint mirati (vedi hint.ts).
 *
 * Non si usa mai `eval` né Python vero: solo questo interprete, puro TypeScript senza
 * dipendenze, con tetti su iterazioni e righe stampate.
 *
 * Sottoinsieme ammesso (vedi CLAUDE.md):
 *   - assegnazioni di interi e stringhe: `nome = ...`, `nome += ...`
 *   - `for <var> in range(a[, b[, c]]):` e `for <var> in "stringa":`
 *   - `print(...)` con stringhe, numeri, variabili, f-string semplici, più argomenti
 *   - operatori `+`, `-`, `*` su interi, `+` fra stringhe, `*` fra stringa e intero
 *   - corpo del ciclo sulla riga stessa (`for i in range(3): print(i)`) o indentato sotto
 *   - `input(domanda)` e `int(...)`, solo se le risposte arrivano dalle opzioni (i compiti
 *     di realtà): le domande finiscono sullo "schermo", non nell'output confrontato
 *   - `if confronto:` / `elif confronto:` / `else:`, dentro e fuori dai cicli; la condizione
 *     è un confronto solo (`==`, `!=`, `<`, `>`, `<=`, `>=`), niente `and`/`or`/`not`
 *   - `while confronto:` con la stessa condizione dell'`if`; `-=` e `*=` per far scendere o
 *     raddoppiare una variabile; il tetto delle iterazioni diventa l'hint del ciclo infinito
 *   - `import random` e `random.randint(a, b)`, solo se i numeri arrivano dalle opzioni
 *     (`Opzioni.casuali`): così l'output è lo stesso per tutti e le prove nascoste cambiano
 *     il numero "casuale" come cambiano le risposte
 * Tutto il resto è un errore con un messaggio in italiano scritto per un allievo.
 */

/** Un valore del linguaggio: solo interi e stringhe (niente decimali, booleani, liste). */
export type Valore = number | string;

export type TipoErrore =
  | 'sintassi' // scritto male: parentesi, due punti, virgolette, indentazione
  | 'nome' // variabile mai definita
  | 'tipo' // operazione fra tipi incompatibili
  | 'limite' // troppe iterazioni o troppe righe stampate
  | 'nonAmmesso'; // costrutto fuori dal sottoinsieme del gioco

export interface ErroreCodice {
  tipo: TipoErrore;
  /** Messaggio in italiano, pensato per essere mostrato all'allievo così com'è. */
  messaggio: string;
  /** Riga del codice (1-based) oppure null se l'errore non è su una riga precisa. */
  riga: number | null;
}

/** Forma del codice: i fatti che il giudice (giudice.ts) riceve insieme al codice. */
export interface Struttura {
  /** Quanti `for` in tutto (anche annidati). */
  numFor: number;
  /** Massimo numero di istruzioni nel corpo di un `for`. */
  righeCorpoMax: number;
  /** Quanti `print` in tutto. */
  numPrint: number;
  /** Quanti `print` fuori da ogni ciclo (a `print` ripetuti a mano si riconosce il furbo). */
  printFuoriCiclo: number;
  /** Righe di codice vere (vuote e commenti esclusi). */
  numRighe: number;
  /** Quante chiamate a `input()` nel codice. */
  numInput: number;
  /** Quante di quelle `input()` stanno dentro un ciclo (la domanda che si ripete a ogni giro). */
  inputNelCiclo: number;
  /**
   * Accumuli dentro un ciclo: `x += ...` oppure `x = x + ...`. Serve alle tappe della
   * somma, dove senza questo controllo `for i in range(1): print(15)` passerebbe.
   */
  accumuliNelCiclo: number;
  /** Quanti `if` (ogni `if` conta uno, con i suoi `elif`/`else`). */
  numIf: number;
  /** Quanti di quegli `if` stanno dentro un ciclo. */
  ifNelCiclo: number;
  /** Quanti `while` in tutto. */
  numWhile: number;
  /**
   * Quanti di quei `while` cambiano nel corpo almeno una variabile della condizione
   * (`totale += ...`, `risposta = input()`): è il gesto che fa finire il ciclo.
   */
  whileAggiornati: number;
  /** Quante chiamate a `random.randint()` nel codice. */
  numCasuali: number;
  /** Quante di quelle `randint()` stanno dentro un ciclo (il dado lanciato a ogni giro). */
  casualiNelCiclo: number;
}

/** Una domanda fatta con `input()` e la risposta che ha ricevuto. */
export interface Interazione {
  domanda: string;
  risposta: string;
}

/** Lo schermo come lo vedrebbe l'allievo: righe stampate e domande con la risposta "digitata", in ordine. */
export type RigaSchermo = { k: 'out'; v: string } | { k: 'in'; domanda: string; risposta: string };

export type Esito =
  | {
      ok: true;
      output: string[];
      struttura: Struttura;
      /** Quanti giri hanno fatto i cicli in tutto: un `for i in range(1)` con otto `print` ne fa uno. */
      giri: number;
      interazioni: Interazione[];
      schermo: RigaSchermo[];
    }
  | { ok: false; errore: ErroreCodice };

export interface Opzioni {
  /** Tetto alle iterazioni totali dei cicli (default 1000). */
  maxIterazioni?: number;
  /** Tetto alle righe stampate (default 200). */
  maxRigheOutput?: number;
  /**
   * Le risposte alle `input()`, nell'ordine in cui il programma le chiede. Se manca,
   * `input()` non è ammesso: nelle tappe del Giro il programma non chiede niente.
   */
  risposte?: string[];
  /**
   * I numeri che `random.randint()` restituisce, nell'ordine in cui il programma li chiede.
   * Se manca, `randint` non è ammesso. Per l'allievo il numero è casuale; per il server è
   * scritto nella prova, così l'output da confrontare è uno solo.
   */
  casuali?: number[];
}

export const MAX_ITERAZIONI = 1000;
export const MAX_RIGHE_OUTPUT = 200;

/* ------------------------------------------------------------------ errori interni */

/** Errore lanciato internamente e trasformato in `Esito` da `esegui`. */
class ErrPy extends Error {
  constructor(
    readonly tipo: TipoErrore,
    readonly messaggio: string,
    readonly riga: number | null,
  ) {
    super(messaggio);
  }
}

function err(tipo: TipoErrore, messaggio: string, riga: number | null): never {
  throw new ErrPy(tipo, messaggio, riga);
}

/* ------------------------------------------------------------------------ tokenizer */

type Tok =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'fstr'; v: string } // contenuto grezzo fra virgolette, analizzato dal parser
  | { t: 'nome'; v: string }
  | { t: 'op'; v: string }
  | { t: 'fine' };

const OPERATORI_DUE = ['+=', '-=', '*=', '==', '!=', '<=', '>='];
const OPERATORI_UNO = ['+', '-', '*', '(', ')', ',', ':', '=', ';', '[', ']', '{', '}', '.', '<', '>', '/', '%'];

function isLettera(c: string): boolean {
  return /[A-Za-z_]/.test(c);
}

function isCifra(c: string): boolean {
  return c >= '0' && c <= '9';
}

/** Legge le sequenze di escape dentro una stringa (solo le essenziali). */
function leggiTesto(src: string, i: number, apice: string, riga: number): { valore: string; fine: number } {
  let valore = '';
  let j = i;
  while (j < src.length) {
    const c = src[j];
    if (c === '\\') {
      const succ = src[j + 1];
      if (succ === 'n') valore += '\n';
      else if (succ === 't') valore += '\t';
      else if (succ === '\\') valore += '\\';
      else if (succ === '"') valore += '"';
      else if (succ === "'") valore += "'";
      else err('sintassi', `La sequenza \`\\${succ ?? ''}\` non è ammessa dentro le virgolette`, riga);
      j += 2;
      continue;
    }
    if (c === apice) return { valore, fine: j + 1 };
    valore += c;
    j++;
  }
  err('sintassi', `Virgolette aperte e mai chiuse: manca \`${apice}\` alla fine del testo`, riga);
}

function tokenizza(src: string, riga: number): Tok[] {
  const tok: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t') {
      i++;
      continue;
    }
    if (c === '#') break; // commento: il resto della riga non conta

    // f-string: f"..." oppure f'...'
    if ((c === 'f' || c === 'F') && (src[i + 1] === '"' || src[i + 1] === "'")) {
      const apice = src[i + 1];
      const grezzo = leggiTestoGrezzo(src, i + 2, apice, riga);
      tok.push({ t: 'fstr', v: grezzo.valore });
      i = grezzo.fine;
      continue;
    }
    if (c === '"' || c === "'") {
      const testo = leggiTesto(src, i + 1, c, riga);
      tok.push({ t: 'str', v: testo.valore });
      i = testo.fine;
      continue;
    }
    if (isCifra(c)) {
      let j = i;
      while (j < src.length && isCifra(src[j])) j++;
      if (src[j] === '.') {
        err('nonAmmesso', 'In questo gioco si usano solo numeri interi: niente numeri con la virgola', riga);
      }
      tok.push({ t: 'num', v: Number(src.slice(i, j)) });
      i = j;
      continue;
    }
    if (isLettera(c)) {
      let j = i;
      while (j < src.length && (isLettera(src[j]) || isCifra(src[j]))) j++;
      tok.push({ t: 'nome', v: src.slice(i, j) });
      i = j;
      continue;
    }
    const due = src.slice(i, i + 2);
    if (OPERATORI_DUE.includes(due)) {
      tok.push({ t: 'op', v: due });
      i += 2;
      continue;
    }
    if (OPERATORI_UNO.includes(c)) {
      tok.push({ t: 'op', v: c });
      i++;
      continue;
    }
    err('sintassi', `Il carattere \`${c}\` non si può usare qui`, riga);
  }
  tok.push({ t: 'fine' });
  return tok;
}

/** Come `leggiTesto` ma senza interpretare gli escape: serve alle f-string, che vanno
 *  analizzate pezzo per pezzo (le graffe prima, gli escape dopo). */
function leggiTestoGrezzo(src: string, i: number, apice: string, riga: number): { valore: string; fine: number } {
  let valore = '';
  let j = i;
  while (j < src.length) {
    const c = src[j];
    if (c === '\\') {
      valore += c + (src[j + 1] ?? '');
      j += 2;
      continue;
    }
    if (c === apice) return { valore, fine: j + 1 };
    valore += c;
    j++;
  }
  err('sintassi', `Virgolette aperte e mai chiuse: manca \`${apice}\` alla fine del testo`, riga);
}

/* -------------------------------------------------------------------------- sintassi */

type Espr =
  | { k: 'num'; v: number }
  | { k: 'str'; v: string }
  | { k: 'nome'; v: string }
  | { k: 'bin'; op: '+' | '-' | '*'; sx: Espr; dx: Espr }
  | { k: 'neg'; e: Espr }
  | { k: 'fstr'; parti: Array<{ k: 'testo'; v: string } | { k: 'espr'; e: Espr }> }
  /** `input(domanda)`: la risposta arriva dalle opzioni, non dalla tastiera. */
  | { k: 'input'; domanda: Espr | null }
  /** `int(x)`: da testo a numero intero. */
  | { k: 'int'; e: Espr }
  /** `random.randint(a, b)`: il numero arriva dalle opzioni, non dal caso. */
  | { k: 'casuale'; a: Espr; b: Espr }
  /** Un confronto: vale solo come condizione di `if`/`elif`/`while`. */
  | { k: 'cmp'; op: Confronto; sx: Espr; dx: Espr };

type Confronto = '==' | '!=' | '<' | '>' | '<=' | '>=';
const CONFRONTI: Confronto[] = ['==', '!=', '<', '>', '<=', '>='];

type Iterabile = { k: 'range'; args: Espr[] } | { k: 'espr'; espr: Espr };

/** Un ramo di `if`/`elif`: la condizione e che cosa fare se è vera. */
interface Ramo {
  cond: Espr;
  corpo: Istruzione[];
  riga: number;
}

type OpAssegna = '=' | '+=' | '-=' | '*=';

type Istruzione =
  | { k: 'assegna'; nome: string; op: OpAssegna; espr: Espr; riga: number }
  | { k: 'print'; args: Espr[]; riga: number }
  | { k: 'for'; variabile: string; iter: Iterabile; corpo: Istruzione[]; riga: number }
  | { k: 'while'; cond: Espr; corpo: Istruzione[]; riga: number }
  | { k: 'if'; rami: Ramo[]; altrimenti: Istruzione[] | null; riga: number }
  /** `import random`: non fa niente, ma da lì in poi `random.randint` esiste. */
  | { k: 'import'; riga: number };

/** Parole chiave di Python fuori dal sottoinsieme: messaggio dedicato, non "errore di sintassi". */
const NON_AMMESSE = [
  'def',
  'return',
  'from',
  'class',
  'try',
  'except',
  'with',
  'lambda',
  'global',
  'break',
  'continue',
  'pass',
];

const RISERVATE = [
  'for',
  'in',
  'if',
  'elif',
  'else',
  'while',
  'print',
  'range',
  'input',
  'int',
  'import',
  'random',
  'randint',
  'and',
  'or',
  'not',
  'is',
  'True',
  'False',
  'None',
  ...NON_AMMESSE,
];

/**
 * Le righe in cui compare `random.randint` nel programma che si sta analizzando: se alla
 * fine manca `import random`, la prima di quelle righe è l'errore (come farebbe Python).
 * È stato del parser, azzerato da `esegui` a ogni programma.
 */
let righeConRandint: number[] = [];

interface Riga {
  testo: string;
  indent: number;
  /** Numero di riga nel codice originale, 1-based. */
  numero: number;
}

/** Divide il codice in righe utili, con l'indentazione misurata (tab = 4 spazi). */
function righeUtili(codice: string): Riga[] {
  const out: Riga[] = [];
  const righe = codice.replace(/\r\n?/g, '\n').split('\n');
  righe.forEach((grezza, idx) => {
    const espansa = grezza.replace(/\t/g, '    ');
    const senzaIndent = espansa.trimStart();
    if (senzaIndent === '' || senzaIndent.startsWith('#')) return;
    out.push({
      testo: senzaIndent.trimEnd(),
      indent: espansa.length - espansa.trimStart().length,
      numero: idx + 1,
    });
  });
  return out;
}

/** Cursore sui token di una riga. */
class Lettore {
  private pos = 0;

  constructor(
    private readonly tok: Tok[],
    readonly riga: number,
  ) {}

  guarda(): Tok {
    return this.tok[this.pos];
  }

  avanti(): Tok {
    return this.tok[this.pos++];
  }

  finito(): boolean {
    return this.tok[this.pos].t === 'fine';
  }

  /** Consuma l'operatore atteso, oppure lancia l'errore con il messaggio dato. */
  attesoOp(v: string, messaggio: string): void {
    const t = this.guarda();
    if (t.t === 'op' && t.v === v) {
      this.pos++;
      return;
    }
    err('sintassi', messaggio, this.riga);
  }

  prossimoEOp(v: string): boolean {
    const t = this.guarda();
    return t.t === 'op' && t.v === v;
  }

  prossimoENome(v: string): boolean {
    const t = this.guarda();
    return t.t === 'nome' && t.v === v;
  }

  /** Token restanti fino alla fine, per capire se la riga continua. */
  restanti(): Tok[] {
    return this.tok.slice(this.pos);
  }

  /** Riposiziona il cursore (serve per spezzare il corpo in linea su `;`). */
  salta(n: number): void {
    this.pos += n;
  }
}

/* ------------------------------------------------------------- parser di espressioni */

function parseEspressione(l: Lettore): Espr {
  let sx = parseTermine(l);
  for (;;) {
    const t = l.guarda();
    if (t.t === 'op' && (t.v === '+' || t.v === '-')) {
      l.avanti();
      const dx = parseTermine(l);
      sx = { k: 'bin', op: t.v as '+' | '-', sx, dx };
      continue;
    }
    return sx;
  }
}

function parseTermine(l: Lettore): Espr {
  let sx = parseFattore(l);
  for (;;) {
    const t = l.guarda();
    if (t.t === 'op' && t.v === '*') {
      l.avanti();
      const dx = parseFattore(l);
      sx = { k: 'bin', op: '*', sx, dx };
      continue;
    }
    return sx;
  }
}

function parseFattore(l: Lettore): Espr {
  const t = l.avanti();
  if (t.t === 'op' && t.v === '-') return { k: 'neg', e: parseFattore(l) };
  if (t.t === 'op' && t.v === '+') return parseFattore(l);
  if (t.t === 'num') return { k: 'num', v: t.v };
  if (t.t === 'str') return { k: 'str', v: t.v };
  if (t.t === 'fstr') return parseFString(t.v, l.riga);
  if (t.t === 'op' && t.v === '(') {
    const dentro = parseEspressione(l);
    l.attesoOp(')', 'Manca la parentesi tonda chiusa `)`');
    return dentro;
  }
  if (t.t === 'op' && t.v === '[') {
    err('nonAmmesso', 'Le liste non sono ammesse in questo gioco: per ripetere si usa `range`', l.riga);
  }
  if (t.t === 'nome') {
    if (NON_AMMESSE.includes(t.v)) {
      err('nonAmmesso', messaggioNonAmmessa(t.v), l.riga);
    }
    if (t.v === 'True' || t.v === 'False' || t.v === 'None') {
      err('nonAmmesso', `\`${t.v}\` non è ammesso: in questo gioco ci sono solo numeri e testo`, l.riga);
    }
    if (t.v === 'and' || t.v === 'or' || t.v === 'not') {
      err('nonAmmesso', `Una condizione alla volta: \`${t.v}\` non si usa in questo gioco. Serve un confronto solo, per esempio \`i == 3\``, l.riga);
    }
    if (t.v === 'random') return parseRandint(l);
    if (t.v === 'randint') {
      err('sintassi', 'Si scrive `random.randint(...)`, con `random.` davanti (e `import random` in cima al programma)', l.riga);
    }
    if (l.prossimoEOp('(')) {
      if (t.v === 'print') {
        err('nonAmmesso', '`print` va su una riga sua, non dentro un calcolo', l.riga);
      }
      if (t.v === 'input') {
        l.avanti();
        if (l.prossimoEOp(')')) {
          l.avanti();
          return { k: 'input', domanda: null };
        }
        const domanda = parseEspressione(l);
        l.attesoOp(')', 'Manca la parentesi tonda chiusa `)` di `input`');
        return { k: 'input', domanda };
      }
      if (t.v === 'int') {
        l.avanti();
        if (l.prossimoEOp(')')) err('sintassi', '`int()` è vuoto: dentro ci va quello da trasformare in numero, per esempio `int(input())`', l.riga);
        const e = parseEspressione(l);
        l.attesoOp(')', 'Manca la parentesi tonda chiusa `)` di `int`');
        return { k: 'int', e };
      }
      err('nonAmmesso', `La funzione \`${t.v}()\` non è ammessa in questo gioco`, l.riga);
    }
    if (t.v === 'input' || t.v === 'int') {
      err('sintassi', `Dopo \`${t.v}\` ci vogliono le parentesi tonde: \`${t.v}(...)\``, l.riga);
    }
    if (t.v === 'range') {
      err('sintassi', '`range` si usa solo dopo `in`, in un ciclo for', l.riga);
    }
    return { k: 'nome', v: t.v };
  }
  if (t.t === 'fine') err('sintassi', 'La riga finisce prima del previsto: manca qualcosa', l.riga);
  err('sintassi', `\`${'v' in t ? t.v : ''}\` non ci va qui`, l.riga);
}

/** `random.randint(a, b)`, dopo aver letto il nome `random`. L'unica cosa di `random` ammessa. */
function parseRandint(l: Lettore): Espr {
  if (!l.prossimoEOp('.')) {
    err('sintassi', '`random` da solo non è un numero: il numero casuale lo dà `random.randint(a, b)`', l.riga);
  }
  l.avanti();
  const cosa = l.avanti();
  if (cosa.t !== 'nome' || cosa.v !== 'randint') {
    err(
      'nonAmmesso',
      `Di \`random\` in questo gioco si usa solo \`random.randint(a, b)\`: un numero intero fra a e b, estremi compresi`,
      l.riga,
    );
  }
  l.attesoOp('(', 'Dopo `random.randint` ci vuole la parentesi tonda aperta `(`');
  if (l.prossimoEOp(')')) {
    err('sintassi', '`random.randint()` vuole due numeri: il più piccolo e il più grande che può uscire, per esempio `random.randint(1, 10)`', l.riga);
  }
  const a = parseEspressione(l);
  if (!l.prossimoEOp(',')) {
    err('sintassi', '`random.randint` vuole due numeri separati da una virgola: il più piccolo e il più grande che può uscire', l.riga);
  }
  l.avanti();
  const b = parseEspressione(l);
  l.attesoOp(')', 'Manca la parentesi tonda chiusa `)` di `random.randint`');
  righeConRandint.push(l.riga);
  return { k: 'casuale', a, b };
}

/** Analizza il contenuto di una f-string: testo e parti fra graffe. */
function parseFString(grezzo: string, riga: number): Espr {
  const parti: Array<{ k: 'testo'; v: string } | { k: 'espr'; e: Espr }> = [];
  let testo = '';
  let i = 0;

  const chiudiTesto = () => {
    if (testo !== '') {
      parti.push({ k: 'testo', v: testo });
      testo = '';
    }
  };

  while (i < grezzo.length) {
    const c = grezzo[i];
    if (c === '\\') {
      const succ = grezzo[i + 1];
      if (succ === 'n') testo += '\n';
      else if (succ === 't') testo += '\t';
      else if (succ === '\\') testo += '\\';
      else if (succ === '"') testo += '"';
      else if (succ === "'") testo += "'";
      else err('sintassi', `La sequenza \`\\${succ ?? ''}\` non è ammessa dentro le virgolette`, riga);
      i += 2;
      continue;
    }
    if (c === '{' && grezzo[i + 1] === '{') {
      testo += '{';
      i += 2;
      continue;
    }
    if (c === '}' && grezzo[i + 1] === '}') {
      testo += '}';
      i += 2;
      continue;
    }
    if (c === '{') {
      const chiusa = grezzo.indexOf('}', i + 1);
      if (chiusa < 0) err('sintassi', 'Nella f-string hai aperto `{` e non l\'hai chiusa con `}`', riga);
      const dentro = grezzo.slice(i + 1, chiusa);
      if (dentro.trim() === '') err('sintassi', 'Nella f-string le graffe `{}` sono vuote: dentro ci va una variabile', riga);
      if (dentro.includes(':')) {
        err('nonAmmesso', 'I formati con i due punti dentro le graffe (per esempio `{x:.2f}`) non sono ammessi', riga);
      }
      chiudiTesto();
      const l = new Lettore(tokenizza(dentro, riga), riga);
      const e = parseEspressione(l);
      if (!l.finito()) err('sintassi', `Dentro le graffe della f-string c'è qualcosa di troppo: \`${dentro}\``, riga);
      parti.push({ k: 'espr', e });
      i = chiusa + 1;
      continue;
    }
    if (c === '}') err('sintassi', 'Nella f-string c\'è una `}` senza la `{` che la apre', riga);
    testo += c;
    i++;
  }
  chiudiTesto();
  return { k: 'fstr', parti };
}

function messaggioNonAmmessa(parola: string): string {
  if (parola === 'break' || parola === 'continue') {
    return `\`${parola}\` non si usa in questo gioco: il ciclo \`while\` si ferma da solo quando la sua condizione diventa falsa`;
  }
  if (parola === 'from') {
    return 'In questo gioco si scrive `import random` in cima al programma, e poi `random.randint(a, b)`';
  }
  return `\`${parola}\` non è ammesso in questo gioco: si usano solo \`for\`, \`while\`, \`if\`, \`print\` e le variabili`;
}

/** Il confronto che segue un'espressione nella condizione di `if`/`elif`/`while`. */
function parseCondizione(l: Lettore, parola: 'if' | 'elif' | 'while'): Espr {
  if (l.prossimoEOp(':') || l.finito()) {
    err('sintassi', `Dopo \`${parola}\` ci vuole una condizione, per esempio \`${parola} ${parola === 'while' ? 'totale < 100' : 'i == 3'}:\``, l.riga);
  }
  if (parola === 'while' && (l.prossimoENome('True') || l.prossimoENome('False'))) {
    err('nonAmmesso', 'Niente `while True`: la condizione deve dire quando il ciclo si ferma, per esempio `while totale < 100:` oppure `while risposta != "0":`', l.riga);
  }
  const sx = parseEspressione(l);
  const t = l.guarda();
  if (t.t === 'op' && t.v === '=') {
    err('sintassi', 'Per confrontare si usa `==` (due uguali): con uno solo si dà un valore', l.riga);
  }
  if (t.t !== 'op' || !CONFRONTI.includes(t.v as Confronto)) {
    const esempio = parola === 'while' ? 'totale < 100' : 'i == 3';
    if (t.t === 'op' && t.v === ':') {
      err('sintassi', `La condizione di \`${parola}\` deve essere un confronto, per esempio \`${parola} ${esempio}:\` oppure \`${parola} risposta != "fine":\``, l.riga);
    }
    err('sintassi', `Dopo \`${parola}\` ci vuole un confronto e poi i due punti, per esempio \`${parola} ${esempio}:\``, l.riga);
  }
  l.avanti();
  const dx = parseEspressione(l);
  const dopo = l.guarda();
  if (dopo.t === 'nome' && (dopo.v === 'and' || dopo.v === 'or')) {
    err('nonAmmesso', `Una condizione alla volta: \`${dopo.v}\` non si usa in questo gioco. Se servono due controlli, usa due \`if\``, l.riga);
  }
  return { k: 'cmp', op: t.v as Confronto, sx, dx };
}

/* -------------------------------------------------------------- parser di istruzioni */

class Parser {
  private pos = 0;
  /** true se il programma ha scritto `import random`. */
  importRandom = false;

  constructor(private readonly righe: Riga[]) {}

  /** `while cond:` e il suo corpo. La condizione è un confronto solo, come nell'`if`. */
  private cicloWhile(l: Lettore, riga: Riga): Istruzione {
    const cond = parseCondizione(l, 'while');
    l.attesoOp(':', 'Alla fine della riga del `while` ci vogliono i due punti `:`');
    return { k: 'while', cond, corpo: this.corpoDi(l, riga, 'while'), riga: riga.numero };
  }

  /** Analizza un blocco: tutte le righe con indentazione >= `indent`. */
  blocco(indent: number): Istruzione[] {
    const out: Istruzione[] = [];
    while (this.pos < this.righe.length) {
      const riga = this.righe[this.pos];
      if (riga.indent < indent) break;
      if (riga.indent > indent) {
        err(
          'sintassi',
          'Questa riga è spostata troppo a destra: allineala con le altre dello stesso blocco',
          riga.numero,
        );
      }
      out.push(...this.istruzioniDiRiga(riga));
    }
    return out;
  }

  /** Le istruzioni di una riga: di norma una, più di una se separate da `;`. */
  private istruzioniDiRiga(riga: Riga): Istruzione[] {
    this.pos++;
    const l = new Lettore(tokenizza(riga.testo, riga.numero), riga.numero);
    const out: Istruzione[] = [this.istruzioneDaLettore(l, riga)];
    while (l.prossimoEOp(';')) {
      l.avanti();
      if (l.finito()) break;
      out.push(this.istruzioneDaLettore(l, riga));
    }
    return out;
  }

  /** Riconosce l'istruzione dai token (usata anche per il corpo scritto in linea). */
  private istruzioneDaLettore(l: Lettore, riga: Riga, inLinea: 'for' | 'while' | 'if' | null = null): Istruzione {
    const t = l.guarda();
    if (t.t === 'nome' && (t.v === 'for' || t.v === 'if' || t.v === 'while') && inLinea) {
      err('sintassi', `Metti \`${t.v}\` su una riga sua, spostata a destra sotto il \`${inLinea}\``, riga.numero);
    }
    if (t.t === 'nome' && t.v === 'for') {
      l.avanti();
      return this.ciclo(l, riga);
    }
    if (t.t === 'nome' && t.v === 'while') {
      l.avanti();
      return this.cicloWhile(l, riga);
    }
    if (t.t === 'nome' && t.v === 'if') {
      l.avanti();
      return this.condizionale(l, riga);
    }
    if (t.t === 'nome' && t.v === 'import') {
      l.avanti();
      const modulo = l.avanti();
      if (modulo.t !== 'nome' || modulo.v !== 'random') {
        err('nonAmmesso', `In questo gioco si può importare solo \`random\` (per \`random.randint\`): \`import ${modulo.t === 'nome' ? modulo.v : '...'}\` non è ammesso`, riga.numero);
      }
      this.fineRiga(l, riga);
      this.importRandom = true;
      return { k: 'import', riga: riga.numero };
    }
    if (t.t === 'nome' && (t.v === 'elif' || t.v === 'else')) {
      err('sintassi', `\`${t.v}\` va subito dopo il blocco di un \`if\`, allineato con l'\`if\``, riga.numero);
    }
    if (t.t === 'nome' && t.v.toLowerCase() === 'print') {
      if (t.v !== 'print') {
        err('sintassi', '`print` va scritto tutto minuscolo', riga.numero);
      }
      l.avanti();
      // `print = 5`: parola riservata usata come variabile, non parentesi dimenticata.
      const segno = l.guarda();
      if (segno.t === 'op' && ['=', '+=', '-=', '*='].includes(segno.v)) {
        err('nonAmmesso', '`print` è una parola di Python: non puoi usarla come nome di variabile', riga.numero);
      }
      return this.stampa(l, riga);
    }
    if (t.t === 'nome' && NON_AMMESSE.includes(t.v)) {
      err('nonAmmesso', messaggioNonAmmessa(t.v), riga.numero);
    }
    if (t.t === 'nome' && (t.v.toLowerCase() === 'for' || t.v.toLowerCase() === 'while')) {
      err('sintassi', `\`${t.v.toLowerCase()}\` va scritto tutto minuscolo`, riga.numero);
    }
    if (t.t === 'nome') {
      const nome = t.v;
      l.avanti();
      const segno = l.guarda();
      if (segno.t === 'op' && ['=', '+=', '-=', '*='].includes(segno.v)) {
        if (RISERVATE.includes(nome)) {
          err('nonAmmesso', `\`${nome}\` è una parola di Python: non puoi usarla come nome di variabile`, riga.numero);
        }
        l.avanti();
        const espr = parseEspressione(l);
        this.fineRiga(l, riga);
        return { k: 'assegna', nome, op: segno.v as OpAssegna, espr, riga: riga.numero };
      }
      if (segno.t === 'op' && segno.v === '==') {
        err('sintassi', '`==` confronta due valori e si usa dopo `if` o `while`: per dare un valore a una variabile serve un solo `=`', riga.numero);
      }
      if (segno.t === 'op' && segno.v === '/') {
        err('nonAmmesso', 'La divisione non è ammessa in questo gioco: ci sono solo numeri interi', riga.numero);
      }
      err(
        'sintassi',
        `\`${nome}\` da solo non fa niente: per stampare serve \`print(${nome})\`, per assegnare serve \`=\``,
        riga.numero,
      );
    }
    err('sintassi', 'Questa riga non è un\'istruzione: ci vuole `for`, `while`, `if`, `print` o un\'assegnazione', riga.numero);
  }

  /**
   * Il corpo dopo i due punti di `for`/`while`/`if`/`elif`/`else`: sulla riga stessa (una o
   * più istruzioni con `;`) oppure il blocco indentato sotto.
   */
  private corpoDi(l: Lettore, riga: Riga, cosa: 'for' | 'while' | 'if' | 'elif' | 'else'): Istruzione[] {
    const blocco = cosa === 'for' || cosa === 'while' ? 'il ciclo' : `il blocco di \`${cosa}\``;
    if (!l.finito()) {
      const inLinea = cosa === 'for' || cosa === 'while' ? cosa : 'if';
      const corpo: Istruzione[] = [this.istruzioneDaLettore(l, riga, inLinea)];
      while (l.prossimoEOp(';')) {
        l.avanti();
        if (l.finito()) break;
        corpo.push(this.istruzioneDaLettore(l, riga, inLinea));
      }
      const prossima = this.righe[this.pos];
      if (prossima && prossima.indent > riga.indent) {
        err(
          'sintassi',
          `Hai messo l'istruzione sulla stessa riga del \`${cosa}\`: le altre righe non possono stare sotto indentate`,
          prossima.numero,
        );
      }
      return corpo;
    }
    const prossima = this.righe[this.pos];
    if (!prossima) {
      err('sintassi', `Dopo i due punti ci vuole almeno una riga dentro ${blocco}`, riga.numero);
    }
    if (prossima.indent <= riga.indent) {
      err('sintassi', `La riga dentro ${blocco} va spostata a destra (indentazione): premi Tab a inizio riga`, prossima.numero);
    }
    return this.blocco(prossima.indent);
  }

  /** `if cond:` con i suoi `elif` ed `else`, che devono stare allineati con l'`if`. */
  private condizionale(l: Lettore, riga: Riga): Istruzione {
    const rami: Ramo[] = [{ cond: parseCondizione(l, 'if'), corpo: [], riga: riga.numero }];
    l.attesoOp(':', "Alla fine della riga dell'`if` ci vogliono i due punti `:`");
    rami[0].corpo = this.corpoDi(l, riga, 'if');
    let altrimenti: Istruzione[] | null = null;
    for (;;) {
      const seguente = this.righe[this.pos];
      if (!seguente || seguente.indent !== riga.indent) break;
      const parola = seguente.testo.match(/^(elif|else)\b/)?.[1];
      if (!parola) break;
      this.pos++;
      const ls = new Lettore(tokenizza(seguente.testo, seguente.numero), seguente.numero);
      ls.avanti();
      if (parola === 'elif') {
        const cond = parseCondizione(ls, 'elif');
        ls.attesoOp(':', "Alla fine della riga dell'`elif` ci vogliono i due punti `:`");
        rami.push({ cond, corpo: this.corpoDi(ls, seguente, 'elif'), riga: seguente.numero });
        continue;
      }
      if (ls.prossimoENome('if')) {
        err('sintassi', 'In Python `else if` si scrive `elif`, tutto attaccato', seguente.numero);
      }
      ls.attesoOp(':', 'Dopo `else` ci vogliono subito i due punti `:`');
      altrimenti = this.corpoDi(ls, seguente, 'else');
      break;
    }
    return { k: 'if', rami, altrimenti, riga: riga.numero };
  }

  private ciclo(l: Lettore, riga: Riga): Istruzione {
    const varTok = l.avanti();
    if (varTok.t !== 'nome') {
      err('sintassi', 'Dopo `for` ci va il nome della variabile, per esempio `for i in ...`', riga.numero);
    }
    if (RISERVATE.includes(varTok.v) && varTok.v !== 'in') {
      err('nonAmmesso', `\`${varTok.v}\` è una parola di Python: non puoi usarla come nome di variabile`, riga.numero);
    }
    if (!l.prossimoENome('in')) {
      err('sintassi', `Dopo \`for ${varTok.v}\` ci vuole \`in\`, per esempio \`for ${varTok.v} in range(5):\``, riga.numero);
    }
    l.avanti();

    let iter: Iterabile;
    if (l.prossimoENome('range')) {
      l.avanti();
      l.attesoOp('(', 'Dopo `range` ci vuole la parentesi tonda aperta `(`');
      const args: Espr[] = [];
      if (!l.prossimoEOp(')')) {
        for (;;) {
          args.push(parseEspressione(l));
          if (l.prossimoEOp(',')) {
            l.avanti();
            continue;
          }
          break;
        }
      }
      l.attesoOp(')', 'Manca la parentesi tonda chiusa `)` di `range`');
      if (args.length === 0) {
        err('sintassi', '`range()` è vuoto: dentro ci va almeno un numero, per esempio `range(5)`', riga.numero);
      }
      if (args.length > 3) {
        err('sintassi', '`range` accetta al massimo tre numeri: inizio, fine e passo', riga.numero);
      }
      iter = { k: 'range', args };
    } else {
      iter = { k: 'espr', espr: parseEspressione(l) };
    }

    if (!l.prossimoEOp(':')) {
      err('sintassi', 'Alla fine della riga del `for` ci vogliono i due punti `:`', riga.numero);
    }
    l.avanti();
    return { k: 'for', variabile: varTok.v, iter, corpo: this.corpoDi(l, riga, 'for'), riga: riga.numero };
  }

  private stampa(l: Lettore, riga: Riga): Istruzione {
    l.attesoOp('(', 'Dopo `print` ci vuole la parentesi tonda aperta `(`');
    const args: Espr[] = [];
    if (!l.prossimoEOp(')')) {
      for (;;) {
        const t = l.guarda();
        if (t.t === 'nome' && (t.v === 'end' || t.v === 'sep')) {
          const resto = l.restanti();
          if (resto[1] && resto[1].t === 'op' && resto[1].v === '=') {
            err(
              'nonAmmesso',
              `In questo gioco \`print\` si usa senza \`${t.v}=\`: ogni \`print\` stampa una riga e va a capo`,
              riga.numero,
            );
          }
        }
        args.push(parseEspressione(l));
        const dopo = l.guarda();
        if (dopo.t === 'op' && CONFRONTI.includes(dopo.v as Confronto)) {
          err('sintassi', `Un confronto come \`${dopo.v}\` si usa solo nella condizione di un \`if\` o di un \`while\`, non dentro \`print\``, riga.numero);
        }
        if (l.prossimoEOp(',')) {
          l.avanti();
          if (l.prossimoEOp(')')) break; // virgola finale: print("a",)
          continue;
        }
        break;
      }
    }
    l.attesoOp(')', 'Manca la parentesi tonda chiusa `)` di `print`');
    this.fineRiga(l, riga);
    return { k: 'print', args, riga: riga.numero };
  }

  /** Dopo un'istruzione la riga deve finire (o continuare con `;`). */
  private fineRiga(l: Lettore, riga: Riga): void {
    if (l.finito() || l.prossimoEOp(';')) return;
    const t = l.guarda();
    if (t.t === 'op' && t.v === ':') {
      err('sintassi', 'I due punti `:` vanno solo alla fine della riga del `for`, del `while`, dell\'`if` o dell\'`else`', riga.numero);
    }
    if (t.t === 'op' && CONFRONTI.includes(t.v as Confronto)) {
      err('sintassi', `Un confronto come \`${t.v}\` si usa solo nella condizione di un \`if\` o di un \`while\``, riga.numero);
    }
    err('sintassi', `Sulla riga c'è qualcosa di troppo dopo l'istruzione: \`${'v' in t ? t.v : ''}\``, riga.numero);
  }
}

/* ---------------------------------------------------------------------- esecuzione */

/** L'hint del ciclo infinito: lo stesso sia che lo fermi il tetto dei giri sia quello delle righe. */
const PERCHE_WHILE_INFINITO = 'la sua condizione resta sempre vera. Dentro il ciclo deve cambiare qualcosa che prima o poi la renda falsa';

class Macchina {
  private readonly ambiente = new Map<string, Valore>();
  private iterazioni = 0;
  private prossimaRisposta = 0;
  private prossimoCasuale = 0;
  /** Le righe dei `while` in esecuzione adesso: se scatta un tetto, l'errore indica il ciclo, non il `print`. */
  private readonly whileAperti: number[] = [];
  /** Giri fatti da tutti i cicli. */
  get giri(): number {
    return this.iterazioni;
  }
  readonly output: string[] = [];
  readonly interazioni: Interazione[] = [];
  readonly schermo: RigaSchermo[] = [];

  constructor(
    private readonly maxIterazioni: number,
    private readonly maxRigheOutput: number,
    private readonly risposte: string[] | null,
    private readonly casuali: number[] | null,
  ) {}

  /** `input()`: la risposta è la prossima della lista; la domanda finisce sullo schermo, non nell'output. */
  private chiedi(domanda: string, riga: number): string {
    if (this.risposte === null) {
      err('nonAmmesso', '`input()` non è ammesso in questa tappa: il programma non chiede niente, stampa soltanto', riga);
    }
    if (this.prossimaRisposta >= this.risposte.length) {
      const ultima = this.risposte[this.risposte.length - 1];
      const dopo = ultima === undefined ? '' : ` Dopo l'ultima risposta («${ultima}») il programma doveva fermarsi, invece chiede ancora.`;
      err(
        'limite',
        `Il programma chiede più cose di quelle previste: le risposte di prova sono ${this.risposte.length} e questo è l'\`input()\` numero ${this.prossimaRisposta + 1}.${dopo}`,
        riga,
      );
    }
    const risposta = this.risposte[this.prossimaRisposta++];
    this.interazioni.push({ domanda, risposta });
    this.schermo.push({ k: 'in', domanda, risposta });
    return risposta;
  }

  /** `random.randint(a, b)`: il numero è il prossimo della prova, e deve stare fra a e b. */
  private casuale(a: number, b: number, riga: number): number {
    if (this.casuali === null) {
      err('nonAmmesso', '`random.randint()` non è ammesso in questa tappa: qui i numeri non sono casuali', riga);
    }
    if (a > b) {
      err('limite', `\`random.randint(${a}, ${b})\` non può dare niente: il primo numero deve essere il più piccolo`, riga);
    }
    if (this.prossimoCasuale >= this.casuali.length) {
      err(
        'limite',
        `Il programma chiede più numeri casuali di quelli previsti: la prova ne ha ${this.casuali.length} e questo è il \`randint\` numero ${this.prossimoCasuale + 1}`,
        riga,
      );
    }
    const n = this.casuali[this.prossimoCasuale++];
    if (n < a || n > b) {
      err(
        'limite',
        `Il numero di prova è ${n}, ma \`random.randint(${a}, ${b})\` non può darlo: controlla i limiti che chiede la consegna`,
        riga,
      );
    }
    return n;
  }

  esegui(corpo: Istruzione[]): void {
    for (const istr of corpo) this.istruzione(istr);
  }

  private istruzione(istr: Istruzione): void {
    if (istr.k === 'print') {
      const pezzi = istr.args.map((a) => testo(this.valuta(a, istr.riga)));
      this.stampa(pezzi.join(' '), istr.riga);
      return;
    }
    if (istr.k === 'assegna') {
      const valore = this.valuta(istr.espr, istr.riga);
      if (istr.op === '=') {
        this.ambiente.set(istr.nome, valore);
        return;
      }
      const precedente = this.ambiente.get(istr.nome);
      if (precedente === undefined) {
        err(
          'nome',
          `\`${istr.nome} ${istr.op} ...\` non funziona se \`${istr.nome}\` non esiste ancora: prima scrivi \`${istr.nome} = 0\``,
          istr.riga,
        );
      }
      if (istr.op === '+=') {
        this.ambiente.set(istr.nome, somma(precedente, valore, istr.riga));
      } else if (istr.op === '-=') {
        if (typeof precedente !== 'number' || typeof valore !== 'number') {
          err('tipo', `\`${istr.nome} -= ...\` funziona solo fra numeri: la sottrazione non si fa con il testo`, istr.riga);
        }
        this.ambiente.set(istr.nome, precedente - valore);
      } else {
        this.ambiente.set(istr.nome, prodotto(precedente, valore, istr.riga));
      }
      return;
    }
    if (istr.k === 'if') {
      for (const ramo of istr.rami) {
        if (this.condizione(ramo.cond, ramo.riga)) {
          this.esegui(ramo.corpo);
          return;
        }
      }
      if (istr.altrimenti) this.esegui(istr.altrimenti);
      return;
    }
    if (istr.k === 'while') {
      this.cicloWhile(istr);
      return;
    }
    if (istr.k === 'import') return;
    this.ciclo(istr);
  }

  /**
   * `while`: gira finché la condizione è vera. Il tetto delle iterazioni qui non è un
   * incidente ma l'errore tipico: il ciclo che non si ferma mai.
   */
  private cicloWhile(istr: Istruzione & { k: 'while' }): void {
    this.whileAperti.push(istr.riga);
    try {
      while (this.condizione(istr.cond, istr.riga)) {
        this.iterazioni++;
        if (this.iterazioni > this.maxIterazioni) {
          err('limite', `Il ciclo \`while\` non si ferma mai (ha già fatto ${this.maxIterazioni} giri): ${PERCHE_WHILE_INFINITO}`, istr.riga);
        }
        this.esegui(istr.corpo);
      }
    } finally {
      this.whileAperti.pop();
    }
  }

  /** Vero o falso di un confronto. Numeri con numeri, testo con testo: mischiarli è quasi sempre un `int()` dimenticato. */
  private condizione(e: Espr, riga: number): boolean {
    if (e.k !== 'cmp') err('sintassi', 'La condizione deve essere un confronto, per esempio `i == 3` oppure `totale < 100`', riga);
    const sx = this.valuta(e.sx, riga);
    const dx = this.valuta(e.dx, riga);
    if (typeof sx !== typeof dx) {
      err(
        'tipo',
        'Stai confrontando un numero con un testo: non saranno mai uguali. Se il valore viene da `input()`, ricorda che è un testo: mettilo dentro `int()`',
        riga,
      );
    }
    switch (e.op) {
      case '==':
        return sx === dx;
      case '!=':
        return sx !== dx;
      case '<':
        return sx < dx;
      case '>':
        return sx > dx;
      case '<=':
        return sx <= dx;
      case '>=':
        return sx >= dx;
    }
  }

  private ciclo(istr: Istruzione & { k: 'for' }): void {
    for (const valore of this.valoriDa(istr)) {
      this.iterazioni++;
      if (this.iterazioni > this.maxIterazioni) {
        err(
          'limite',
          `Il ciclo gira troppe volte (più di ${this.maxIterazioni}): controlla i numeri dentro \`range\``,
          istr.riga,
        );
      }
      this.ambiente.set(istr.variabile, valore);
      this.esegui(istr.corpo);
    }
  }

  /** Valori su cui itera il ciclo, calcolati pigramente per fermarsi subito sui tetti. */
  private *valoriDa(istr: Istruzione & { k: 'for' }): Generator<Valore> {
    if (istr.iter.k === 'espr') {
      const v = this.valuta(istr.iter.espr, istr.riga);
      if (typeof v === 'number') {
        err(
          'tipo',
          `Non si può scorrere un numero: scrivi \`for ${istr.variabile} in range(${v})\``,
          istr.riga,
        );
      }
      yield* v.split('');
      return;
    }

    const numeri = istr.iter.args.map((a) => {
      const v = this.valuta(a, istr.riga);
      if (typeof v !== 'number') {
        err('tipo', '`range` vuole numeri interi, non del testo fra virgolette', istr.riga);
      }
      return v;
    });
    const [inizio, fine, passo] =
      numeri.length === 1 ? [0, numeri[0], 1] : numeri.length === 2 ? [numeri[0], numeri[1], 1] : numeri;
    if (passo === 0) {
      err('limite', 'Il passo di `range` non può essere 0: il ciclo non finirebbe mai', istr.riga);
    }
    const quante = Math.max(0, Math.ceil((fine - inizio) / passo));
    if (quante > this.maxIterazioni) {
      err(
        'limite',
        `Questo ciclo girerebbe ${quante} volte (il massimo è ${this.maxIterazioni}): controlla i numeri dentro \`range\``,
        istr.riga,
      );
    }
    for (let i = 0, v = inizio; i < quante; i++, v += passo) yield v;
  }

  private stampa(riga: string, numeroRiga: number): void {
    // Un print con \n dentro produce più righe di output, come in Python.
    for (const pezzo of riga.split('\n')) {
      if (this.output.length >= this.maxRigheOutput) {
        const rigaWhile = this.whileAperti[this.whileAperti.length - 1];
        if (rigaWhile !== undefined) {
          err('limite', `Il programma stampa troppe righe (più di ${this.maxRigheOutput}): il ciclo \`while\` non si ferma mai, ${PERCHE_WHILE_INFINITO}`, rigaWhile);
        }
        err('limite', `Il programma stampa troppe righe (più di ${this.maxRigheOutput}): controlla i numeri dentro \`range\``, numeroRiga);
      }
      this.output.push(pezzo);
      this.schermo.push({ k: 'out', v: pezzo });
    }
  }

  private valuta(e: Espr, riga: number): Valore {
    switch (e.k) {
      case 'num':
        return e.v;
      case 'str':
        return e.v;
      case 'nome': {
        const v = this.ambiente.get(e.v);
        if (v === undefined) {
          err('nome', `La variabile \`${e.v}\` non esiste: non le hai mai dato un valore`, riga);
        }
        return v;
      }
      case 'neg': {
        const v = this.valuta(e.e, riga);
        if (typeof v !== 'number') err('tipo', 'Il meno davanti si usa solo con i numeri', riga);
        return -v;
      }
      case 'fstr': {
        let out = '';
        for (const parte of e.parti) {
          out += parte.k === 'testo' ? parte.v : testo(this.valuta(parte.e, riga));
        }
        return out;
      }
      case 'input': {
        const domanda = e.domanda ? testo(this.valuta(e.domanda, riga)) : '';
        return this.chiedi(domanda, riga);
      }
      case 'int': {
        const v = this.valuta(e.e, riga);
        if (typeof v === 'number') return v;
        if (!/^\s*-?\d+\s*$/.test(v)) {
          err('tipo', `\`int()\` vuole un numero scritto in cifre, invece ha ricevuto «${v}»`, riga);
        }
        return Number(v.trim());
      }
      case 'casuale': {
        const a = this.valuta(e.a, riga);
        const b = this.valuta(e.b, riga);
        if (typeof a !== 'number' || typeof b !== 'number') {
          err('tipo', '`random.randint` vuole due numeri interi, non del testo fra virgolette', riga);
        }
        return this.casuale(a, b, riga);
      }
      case 'bin': {
        const sx = this.valuta(e.sx, riga);
        const dx = this.valuta(e.dx, riga);
        if (e.op === '+') return somma(sx, dx, riga);
        if (e.op === '-') {
          if (typeof sx !== 'number' || typeof dx !== 'number') {
            err('tipo', 'La sottrazione funziona solo fra numeri', riga);
          }
          return sx - dx;
        }
        return prodotto(sx, dx, riga);
      }
      case 'cmp':
        err('sintassi', `Un confronto come \`${e.op}\` si usa solo nella condizione di un \`if\` o di un \`while\``, riga);
    }
  }
}

function prodotto(sx: Valore, dx: Valore, riga: number): Valore {
  if (typeof sx === 'number' && typeof dx === 'number') return sx * dx;
  if (typeof sx === 'string' && typeof dx === 'number') return ripeti(sx, dx, riga);
  if (typeof sx === 'number' && typeof dx === 'string') return ripeti(dx, sx, riga);
  err('tipo', 'Non si moltiplica un testo per un altro testo', riga);
}

function testo(v: Valore): string {
  return typeof v === 'number' ? String(v) : v;
}

function somma(sx: Valore, dx: Valore, riga: number): Valore {
  if (typeof sx === 'number' && typeof dx === 'number') return sx + dx;
  if (typeof sx === 'string' && typeof dx === 'string') return sx + dx;
  err(
    'tipo',
    'Non puoi unire un numero e un testo con `+`: usa una f-string, per esempio `f"Totale: {totale}"`. Se il testo viene da `input()`, ricorda che `input()` dà sempre un testo: per farne un numero mettilo dentro `int()`',
    riga,
  );
}

function ripeti(s: string, n: number, riga: number): string {
  if (n <= 0) return '';
  if (s.length * n > MAX_RIGHE_OUTPUT * 200) {
    err('limite', 'Il testo ripetuto diventa troppo lungo', riga);
  }
  return s.repeat(n);
}

/* ------------------------------------------------------------------------ struttura */

/** true se l'espressione legge la variabile `nome` (per riconoscere `x = x + i`). */
function usaNome(e: Espr, nome: string): boolean {
  switch (e.k) {
    case 'nome':
      return e.v === nome;
    case 'bin':
    case 'cmp':
      return usaNome(e.sx, nome) || usaNome(e.dx, nome);
    case 'neg':
      return usaNome(e.e, nome);
    case 'fstr':
      return e.parti.some((p) => p.k === 'espr' && usaNome(p.e, nome));
    case 'int':
      return usaNome(e.e, nome);
    case 'casuale':
      return usaNome(e.a, nome) || usaNome(e.b, nome);
    default:
      return false;
  }
}

/** Quante volte `cosa` (`input()` o `randint()`) compare dentro un'espressione. */
function conta(e: Espr, cosa: 'input' | 'casuale'): number {
  switch (e.k) {
    case 'input':
      return (cosa === 'input' ? 1 : 0) + (e.domanda ? conta(e.domanda, cosa) : 0);
    case 'casuale':
      return (cosa === 'casuale' ? 1 : 0) + conta(e.a, cosa) + conta(e.b, cosa);
    case 'int':
      return conta(e.e, cosa);
    case 'bin':
    case 'cmp':
      return conta(e.sx, cosa) + conta(e.dx, cosa);
    case 'neg':
      return conta(e.e, cosa);
    case 'fstr':
      return e.parti.reduce((n, p) => n + (p.k === 'espr' ? conta(p.e, cosa) : 0), 0);
    default:
      return 0;
  }
}

/** I nomi delle variabili lette da un'espressione (per sapere di che cosa parla la condizione di un `while`). */
function nomiIn(e: Espr, out: Set<string> = new Set()): Set<string> {
  switch (e.k) {
    case 'nome':
      out.add(e.v);
      break;
    case 'bin':
    case 'cmp':
      nomiIn(e.sx, out);
      nomiIn(e.dx, out);
      break;
    case 'neg':
    case 'int':
      nomiIn(e.e, out);
      break;
    case 'casuale':
      nomiIn(e.a, out);
      nomiIn(e.b, out);
      break;
    case 'fstr':
      for (const p of e.parti) if (p.k === 'espr') nomiIn(p.e, out);
      break;
    case 'input':
      if (e.domanda) nomiIn(e.domanda, out);
      break;
    default:
      break;
  }
  return out;
}

/** true se nel blocco (anche dentro `if` e cicli annidati) qualche istruzione assegna uno dei `nomi`. */
function assegnaUnoDi(istruzioni: Istruzione[], nomi: Set<string>): boolean {
  return istruzioni.some((istr) => {
    switch (istr.k) {
      case 'assegna':
        return nomi.has(istr.nome);
      case 'for':
        return nomi.has(istr.variabile) || assegnaUnoDi(istr.corpo, nomi);
      case 'while':
        return assegnaUnoDi(istr.corpo, nomi);
      case 'if':
        return istr.rami.some((r) => assegnaUnoDi(r.corpo, nomi)) || (istr.altrimenti ? assegnaUnoDi(istr.altrimenti, nomi) : false);
      default:
        return false;
    }
  });
}

function struttura(corpo: Istruzione[]): Struttura {
  const s: Struttura = {
    numFor: 0,
    righeCorpoMax: 0,
    numPrint: 0,
    printFuoriCiclo: 0,
    numRighe: 0,
    accumuliNelCiclo: 0,
    numInput: 0,
    inputNelCiclo: 0,
    numIf: 0,
    ifNelCiclo: 0,
    numWhile: 0,
    whileAggiornati: 0,
    numCasuali: 0,
    casualiNelCiclo: 0,
  };

  const visita = (istruzioni: Istruzione[], dentroCiclo: boolean) => {
    const espressione = (e: Espr) => {
      const input = conta(e, 'input');
      const casuali = conta(e, 'casuale');
      s.numInput += input;
      s.numCasuali += casuali;
      if (dentroCiclo) {
        s.inputNelCiclo += input;
        s.casualiNelCiclo += casuali;
      }
    };
    for (const istr of istruzioni) {
      if (istr.k === 'import') continue;
      s.numRighe++;
      if (istr.k === 'if') {
        s.numIf++;
        if (dentroCiclo) s.ifNelCiclo++;
        for (const ramo of istr.rami) {
          espressione(ramo.cond);
          visita(ramo.corpo, dentroCiclo);
        }
        if (istr.altrimenti) visita(istr.altrimenti, dentroCiclo);
        continue;
      }
      if (istr.k === 'assegna') {
        espressione(istr.espr);
        if (dentroCiclo && (istr.op !== '=' || usaNome(istr.espr, istr.nome))) s.accumuliNelCiclo++;
        continue;
      }
      if (istr.k === 'print') {
        s.numPrint++;
        for (const a of istr.args) espressione(a);
        if (!dentroCiclo) s.printFuoriCiclo++;
        continue;
      }
      if (istr.k === 'while') {
        s.numWhile++;
        if (assegnaUnoDi(istr.corpo, nomiIn(istr.cond))) s.whileAggiornati++;
        // La condizione si valuta a ogni giro: le sue input()/randint() stanno nel ciclo.
        const prima = { input: s.numInput, casuali: s.numCasuali };
        espressione(istr.cond);
        s.inputNelCiclo += dentroCiclo ? 0 : s.numInput - prima.input;
        s.casualiNelCiclo += dentroCiclo ? 0 : s.numCasuali - prima.casuali;
        s.righeCorpoMax = Math.max(s.righeCorpoMax, istr.corpo.length);
        visita(istr.corpo, true);
        continue;
      }
      if (istr.k === 'for') {
        s.numFor++;
        s.righeCorpoMax = Math.max(s.righeCorpoMax, istr.corpo.length);
        visita(istr.corpo, true);
      }
    }
  };

  visita(corpo, false);
  return s;
}

/* -------------------------------------------------------------------------- pubblico */

/**
 * Esegue il codice dell'allievo e restituisce l'output riga per riga, oppure un errore
 * con un messaggio in italiano da mostrare così com'è.
 */
export function esegui(codice: string, opzioni: Opzioni = {}): Esito {
  const maxIterazioni = opzioni.maxIterazioni ?? MAX_ITERAZIONI;
  const maxRigheOutput = opzioni.maxRigheOutput ?? MAX_RIGHE_OUTPUT;
  try {
    const righe = righeUtili(codice);
    if (righe.length === 0) {
      return { ok: false, errore: { tipo: 'sintassi', messaggio: 'Non hai scritto niente', riga: null } };
    }
    if (righe[0].indent > 0) {
      return {
        ok: false,
        errore: {
          tipo: 'sintassi',
          messaggio: 'La prima riga non può essere spostata a destra: toglile gli spazi davanti',
          riga: righe[0].numero,
        },
      };
    }
    righeConRandint = [];
    const parser = new Parser(righe);
    const programma = parser.blocco(0);
    if (righeConRandint.length > 0 && !parser.importRandom) {
      err('nome', '`random` non esiste: per usare `random.randint` serve la riga `import random` in cima al programma', righeConRandint[0]);
    }
    const macchina = new Macchina(maxIterazioni, maxRigheOutput, opzioni.risposte ?? null, opzioni.casuali ?? null);
    macchina.esegui(programma);
    return {
      ok: true,
      output: macchina.output,
      struttura: struttura(programma),
      giri: macchina.giri,
      interazioni: macchina.interazioni,
      schermo: macchina.schermo,
    };
  } catch (e) {
    if (e instanceof ErrPy) {
      return { ok: false, errore: { tipo: e.tipo, messaggio: e.messaggio, riga: e.riga } };
    }
    throw e;
  }
}
