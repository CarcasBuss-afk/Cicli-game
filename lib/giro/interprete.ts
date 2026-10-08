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

/** Forma del codice, per i controlli anti-furbo delle tappe (vedi hint.ts). */
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
}

export type Esito =
  | { ok: true; output: string[]; struttura: Struttura }
  | { ok: false; errore: ErroreCodice };

export interface Opzioni {
  /** Tetto alle iterazioni totali dei cicli (default 1000). */
  maxIterazioni?: number;
  /** Tetto alle righe stampate (default 200). */
  maxRigheOutput?: number;
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
  | { k: 'fstr'; parti: Array<{ k: 'testo'; v: string } | { k: 'espr'; e: Espr }> };

type Iterabile = { k: 'range'; args: Espr[] } | { k: 'espr'; espr: Espr };

type Istruzione =
  | { k: 'assegna'; nome: string; op: '=' | '+='; espr: Espr; riga: number }
  | { k: 'print'; args: Espr[]; riga: number }
  | { k: 'for'; variabile: string; iter: Iterabile; corpo: Istruzione[]; riga: number };

/** Parole chiave di Python fuori dal sottoinsieme: messaggio dedicato, non "errore di sintassi". */
const NON_AMMESSE = [
  'while',
  'if',
  'elif',
  'else',
  'def',
  'return',
  'import',
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
  'input',
];

const RISERVATE = ['for', 'in', 'print', 'range', 'and', 'or', 'not', 'is', 'True', 'False', 'None', ...NON_AMMESSE];

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
    if (l.prossimoEOp('(')) {
      if (t.v === 'print') {
        err('nonAmmesso', '`print` va su una riga sua, non dentro un calcolo', l.riga);
      }
      err('nonAmmesso', `La funzione \`${t.v}()\` non è ammessa in questo gioco`, l.riga);
    }
    if (t.v === 'range') {
      err('sintassi', '`range` si usa solo dopo `in`, in un ciclo for', l.riga);
    }
    return { k: 'nome', v: t.v };
  }
  if (t.t === 'fine') err('sintassi', 'La riga finisce prima del previsto: manca qualcosa', l.riga);
  err('sintassi', `\`${'v' in t ? t.v : ''}\` non ci va qui`, l.riga);
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
  if (parola === 'input') {
    return '`input()` non è ammesso: in questo gioco il programma non chiede niente, stampa soltanto';
  }
  if (parola === 'while') {
    return 'Qui serve un ciclo `for`: `while` non è ammesso in questo gioco';
  }
  if (parola === 'if' || parola === 'elif' || parola === 'else') {
    return `In questo gioco si usano solo \`for\`, \`print\` e le variabili: \`${parola}\` non è ammesso`;
  }
  return `\`${parola}\` non è ammesso in questo gioco: si usano solo \`for\`, \`print\` e le variabili`;
}

/* -------------------------------------------------------------- parser di istruzioni */

class Parser {
  private pos = 0;

  constructor(private readonly righe: Riga[]) {}

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
  private istruzioneDaLettore(l: Lettore, riga: Riga): Istruzione {
    const t = l.guarda();
    if (t.t === 'nome' && t.v === 'for') {
      l.avanti();
      return this.ciclo(l, riga);
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
    if (t.t === 'nome' && t.v.toLowerCase() === 'for') {
      err('sintassi', '`for` va scritto tutto minuscolo', riga.numero);
    }
    if (t.t === 'nome') {
      const nome = t.v;
      l.avanti();
      const segno = l.guarda();
      if (segno.t === 'op' && (segno.v === '=' || segno.v === '+=')) {
        if (RISERVATE.includes(nome)) {
          err('nonAmmesso', `\`${nome}\` è una parola di Python: non puoi usarla come nome di variabile`, riga.numero);
        }
        l.avanti();
        const espr = parseEspressione(l);
        this.fineRiga(l, riga);
        return { k: 'assegna', nome, op: segno.v as '=' | '+=', espr, riga: riga.numero };
      }
      if (segno.t === 'op' && ['-=', '*=', '=='].includes(segno.v)) {
        err('nonAmmesso', `L'operatore \`${segno.v}\` non è ammesso: usa \`=\` o \`+=\``, riga.numero);
      }
      err(
        'sintassi',
        `\`${nome}\` da solo non fa niente: per stampare serve \`print(${nome})\`, per assegnare serve \`=\``,
        riga.numero,
      );
    }
    err('sintassi', 'Questa riga non è un\'istruzione: ci vuole `for`, `print` o un\'assegnazione', riga.numero);
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

    // Corpo sulla riga stessa: `for i in range(3): print(i)`
    if (!l.finito()) {
      const corpo: Istruzione[] = [this.istruzioneDaLettore(l, riga)];
      while (l.prossimoEOp(';')) {
        l.avanti();
        if (l.finito()) break;
        corpo.push(this.istruzioneDaLettore(l, riga));
      }
      const prossima = this.righe[this.pos];
      if (prossima && prossima.indent > riga.indent) {
        err(
          'sintassi',
          'Hai messo l\'istruzione sulla stessa riga del `for`: le altre righe del ciclo non possono stare sotto indentate',
          prossima.numero,
        );
      }
      return { k: 'for', variabile: varTok.v, iter, corpo, riga: riga.numero };
    }

    // Corpo indentato sotto
    const prossima = this.righe[this.pos];
    if (!prossima) {
      err('sintassi', 'Dopo i due punti ci vuole almeno una riga dentro il ciclo', riga.numero);
    }
    if (prossima.indent <= riga.indent) {
      err(
        'sintassi',
        'La riga dentro il ciclo va spostata a destra (indentazione): premi Tab a inizio riga',
        prossima.numero,
      );
    }
    const corpo = this.blocco(prossima.indent);
    return { k: 'for', variabile: varTok.v, iter, corpo, riga: riga.numero };
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
      err('sintassi', 'I due punti `:` vanno solo alla fine della riga del `for`', riga.numero);
    }
    err('sintassi', `Sulla riga c'è qualcosa di troppo dopo l'istruzione: \`${'v' in t ? t.v : ''}\``, riga.numero);
  }
}

/* ---------------------------------------------------------------------- esecuzione */

class Macchina {
  private readonly ambiente = new Map<string, Valore>();
  private iterazioni = 0;
  readonly output: string[] = [];

  constructor(
    private readonly maxIterazioni: number,
    private readonly maxRigheOutput: number,
  ) {}

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
          `\`${istr.nome} += ...\` non funziona se \`${istr.nome}\` non esiste ancora: prima scrivi \`${istr.nome} = 0\``,
          istr.riga,
        );
      }
      this.ambiente.set(istr.nome, somma(precedente, valore, istr.riga));
      return;
    }
    this.ciclo(istr);
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
        err(
          'limite',
          `Il programma stampa troppe righe (più di ${this.maxRigheOutput}): controlla i numeri dentro \`range\``,
          numeroRiga,
        );
      }
      this.output.push(pezzo);
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
        if (typeof sx === 'number' && typeof dx === 'number') return sx * dx;
        if (typeof sx === 'string' && typeof dx === 'number') return ripeti(sx, dx, riga);
        if (typeof sx === 'number' && typeof dx === 'string') return ripeti(dx, sx, riga);
        err('tipo', 'Non si moltiplica un testo per un altro testo', riga);
      }
    }
  }
}

function testo(v: Valore): string {
  return typeof v === 'number' ? String(v) : v;
}

function somma(sx: Valore, dx: Valore, riga: number): Valore {
  if (typeof sx === 'number' && typeof dx === 'number') return sx + dx;
  if (typeof sx === 'string' && typeof dx === 'string') return sx + dx;
  err(
    'tipo',
    'Non puoi unire un numero e un testo con `+`: usa una f-string, per esempio `f"Totale: {totale}"`',
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

function struttura(corpo: Istruzione[]): Struttura {
  const s: Struttura = { numFor: 0, righeCorpoMax: 0, numPrint: 0, printFuoriCiclo: 0, numRighe: 0 };

  const visita = (istruzioni: Istruzione[], dentroCiclo: boolean) => {
    for (const istr of istruzioni) {
      s.numRighe++;
      if (istr.k === 'print') {
        s.numPrint++;
        if (!dentroCiclo) s.printFuoriCiclo++;
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
    const parser = new Parser(righe);
    const programma = parser.blocco(0);
    const macchina = new Macchina(maxIterazioni, maxRigheOutput);
    macchina.esegui(programma);
    return { ok: true, output: macchina.output, struttura: struttura(programma) };
  } catch (e) {
    if (e instanceof ErrPy) {
      return { ok: false, errore: { tipo: e.tipo, messaggio: e.messaggio, riga: e.riga } };
    }
    throw e;
  }
}
