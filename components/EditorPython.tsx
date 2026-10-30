'use client';

/* Mini-editor Python con gli stessi colori e suggerimenti che gli allievi vedono in
 * VS Code: CodeMirror 6 con il linguaggio Python e il tema One Dark.
 *
 * Non c'è `basicSetup`: le estensioni sono scelte a mano, perché su tre righe di codice
 * la barra di ricerca e il gutter dei blocchi richiudibili sarebbero solo confusione.
 * Si consegna con Ctrl+Invio (o il pulsante): Invio va a capo con l'indentazione, come
 * in un editor vero.
 */
import { useEffect, useRef } from 'react';
import {
  acceptCompletion,
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  closeCompletion,
  moveCompletionSelection,
  snippetCompletion,
  startCompletion,
  type CompletionContext,
} from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { python } from '@codemirror/lang-python';
import { indentOnInput, indentUnit } from '@codemirror/language';
import { EditorState, Prec, StateEffect, StateField } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import {
  Decoration,
  type DecorationSet,
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder as placeholderExt,
} from '@codemirror/view';

/** Suggerimenti su misura per la gara: le tre cose che servono, già pronte. */
function suggerimentiGiro(context: CompletionContext) {
  const parola = context.matchBefore(/\w*/);
  if (!parola || (parola.from === parola.to && !context.explicit)) return null;
  return {
    from: parola.from,
    options: [
      snippetCompletion('for ${i} in range(${5}):\n\t${print(i)}', {
        label: 'for',
        detail: 'ciclo su range',
        type: 'keyword',
        boost: 99,
      }),
      snippetCompletion('while ${totale} < ${100}:\n\t${}', {
        label: 'while',
        detail: 'ciclo finché la condizione è vera',
        type: 'keyword',
        boost: 98,
      }),
      snippetCompletion('range(${5})', { label: 'range', detail: 'da 0 a 4', type: 'function', boost: 90 }),
      snippetCompletion('print(${})', { label: 'print', detail: 'stampa una riga', type: 'function', boost: 95 }),
      snippetCompletion('if ${x} == ${3}:\n\t${}', { label: 'if', detail: 'se la condizione è vera', type: 'keyword', boost: 85 }),
      snippetCompletion('input(${"Domanda? "})', { label: 'input', detail: 'chiede una risposta (testo)', type: 'function', boost: 80 }),
      snippetCompletion('int(${})', { label: 'int', detail: 'da testo a numero', type: 'function', boost: 80 }),
      snippetCompletion('random.randint(${1}, ${10})', { label: 'random.randint', detail: 'numero casuale fra 1 e 10', type: 'function', boost: 70 }),
      snippetCompletion('import random', { label: 'import random', detail: 'in cima: serve per randint', type: 'keyword', boost: 70 }),
    ],
  };
}

/** La riga da evidenziare (quella dell'errore dell'hint); sparisce appena l'allievo scrive. */
const evidenziaRiga = StateEffect.define<number | null>();
const rigaEvidenziata = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    for (const e of tr.effects) {
      if (e.is(evidenziaRiga)) {
        if (e.value === null || e.value < 1 || e.value > tr.state.doc.lines) return Decoration.none;
        return Decoration.set([Decoration.line({ class: 'cm-riga-errore' }).range(tr.state.doc.line(e.value).from)]);
      }
    }
    return tr.docChanged ? Decoration.none : deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

interface Props {
  /** Contenuto con cui (ri)parte l'editor. */
  valoreIniziale: string;
  /** Quando questo numero cambia, l'editor riparte dal valore iniziale: è la tappa nuova. */
  tappa: number;
  onChange(valore: string): void;
  /** Ctrl+Invio: consegna. */
  onConsegna(): void;
  attivo: boolean;
  segnaposto?: string;
  /** La riga (1-based) a cui si riferisce l'ultimo hint, da evidenziare; null = niente. */
  rigaErrore?: number | null;
}

export default function EditorPython({
  valoreIniziale,
  tappa,
  onChange,
  onConsegna,
  attivo,
  segnaposto = '# scrivi qui il tuo codice',
  rigaErrore = null,
}: Props) {
  const contenitore = useRef<HTMLDivElement>(null);
  const vista = useRef<EditorView | null>(null);
  // I callback stanno in ref: cambiare una funzione non deve ricostruire l'editor
  // (si perderebbe il testo che l'allievo sta scrivendo).
  const consegna = useRef(onConsegna);
  const cambio = useRef(onChange);
  consegna.current = onConsegna;
  cambio.current = onChange;

  useEffect(() => {
    if (!contenitore.current) return;

    const view = new EditorView({
      parent: contenitore.current,
      state: EditorState.create({
        doc: valoreIniziale,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          highlightActiveLineGutter(),
          drawSelection(),
          history(),
          indentOnInput(),
          indentUnit.of('    '), // quattro spazi, come in Python
          closeBrackets(),
          // defaultKeymap: false perché di serie **Invio accetta il suggerimento**: un
          // allievo che scrive print(i) e va a capo si troverebbe uno snippet al posto
          // della riga nuova. Qui i suggerimenti si accettano solo con Tab.
          autocompletion({ override: [suggerimentiGiro], defaultKeymap: false }),
          python(),
          oneDark,
          // Più in alto di tutto: Ctrl+Invio consegna anche col menu dei suggerimenti aperto.
          Prec.highest(
            keymap.of([
              {
                key: 'Mod-Enter',
                preventDefault: true,
                run: () => {
                  consegna.current();
                  return true;
                },
              },
              // Questi comandi rispondono false se il menu è chiuso: Tab torna a indentare
              // e le frecce a muovere il cursore.
              { key: 'Tab', run: acceptCompletion },
              { key: 'Mod-Space', run: startCompletion },
              { key: 'Escape', run: closeCompletion },
              { key: 'ArrowDown', run: moveCompletionSelection(true) },
              { key: 'ArrowUp', run: moveCompletionSelection(false) },
            ]),
          ),
          keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
          placeholderExt(segnaposto),
          rigaEvidenziata,
          EditorView.lineWrapping,
          EditorView.theme({
            '&': { fontSize: '17px', borderRadius: '10px', overflow: 'hidden' },
            '.cm-content': { minHeight: '120px', fontFamily: 'Consolas, "Courier New", monospace' },
            '.cm-gutters': { fontFamily: 'Consolas, "Courier New", monospace' },
            '&.cm-focused': { outline: '2px solid rgb(236 72 153)' },
            '.cm-riga-errore': { backgroundColor: 'rgba(239, 68, 68, 0.22)' },
          }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) cambio.current(u.state.doc.toString());
          }),
        ],
      }),
    });
    vista.current = view;
    view.focus();
    return () => {
      view.destroy();
      vista.current = null;
    };
    // Costruito una volta sola: il contenuto delle tappe successive arriva dall'effetto sotto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // L'hint indica una riga: si evidenzia finché l'allievo non tocca il testo.
  useEffect(() => {
    vista.current?.dispatch({ effects: evidenziaRiga.of(rigaErrore) });
  }, [rigaErrore]);

  // Tappa nuova: si riparte dal testo iniziale (vuoto, o il ciclo da completare).
  useEffect(() => {
    const view = vista.current;
    if (!view) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: valoreIniziale },
      selection: { anchor: valoreIniziale.length },
    });
    cambio.current(valoreIniziale);
    view.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tappa]);

  // In attesa o a gara finita l'editor non si tocca.
  useEffect(() => {
    const view = vista.current;
    if (!view) return;
    view.contentDOM.setAttribute('contenteditable', attivo ? 'true' : 'false');
    if (attivo) view.focus();
  }, [attivo]);

  return <div ref={contenitore} className="overflow-hidden rounded-xl border border-(--color-bordo)" />;
}
