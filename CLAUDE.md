# Il Giro dei Cicli — gara a tappe sui cicli `for`

Leggi questo file per intero prima di ogni sessione. Contiene obiettivi, architettura e vincoli non negoziabili. L'ordine dei lavori è in `TASKS.md`.

## Obiettivo

Gioco di classe in tempo reale sui cicli `for` in **Python**, ispirato al minigioco PRINT RUSH del manuale edu-code (`C:\Users\Regnaud\edu-code\src\components\manuale\DigitaPrintGame.tsx`: sfida di digitazione con validazione tollerante, hint mirati sull'errore, l'errore non toglie punti ma costa tempo).

**Meccanica: corsa a tappe** (tema Giro d'Italia — "cicli" = loop e biciclette). Ogni allievo, dal suo PC, riceve una tappa alla volta: una sfida sui cicli `for`. Scrive il codice in un mini-editor, lo esegue; se l'output è giusto la tappa è completata e parte la successiva, se è sbagliato riceve un hint mirato e riprova. Sulla LIM: la corsa live con i ciclisti che avanzano, la classifica, la maglia rosa al primo.

- **Gara individuale** (non a coppie come l'escape room).
- **Classifica**: tappe completate (desc), a parità ordine d'arrivo sull'ultima tappa completata. Gli errori non penalizzano la classifica: costano solo tempo.
- **Tappe generate casualmente** a ogni sessione (parametri random, stesso percorso per tutti gli allievi della sessione): il gioco è rigiocabile, al secondo giro la classe non conosce le risposte a memoria.

## Utenti

- **Allievi**: biennio di istruzione/formazione professionale, 14-16 anni, stanno imparando Python (variabili, `print`, f-string, cicli `for` con `range`). Giocano individualmente su PC del laboratorio, con Chrome o Edge, su una **pagina web servita da Vercel** (nessun vincolo `file://`: qui non si modificano file locali).
- **Docente**: Fabio, unico amministratore, account Google istituzionale.

Tutta l'interfaccia è in **italiano**.

**Dati personali minimi**: degli allievi si memorizza solo il **nome di battesimo**. Niente cognomi, email, account.

## Le tappe (contenuto didattico)

Tipi di tappa, in difficoltà crescente (il percorso li mescola con una curva di difficoltà: pianura all'inizio, montagna alla fine):

1. **ripeti-n**: "Stampa `Evviva` 7 volte" → `for i in range(7): print("Evviva")`.
2. **output-range**: dato l'output `0 1 2 3 4` (una riga per numero), scrivere il ciclo. Varianti su start/stop/step, conto alla rovescia.
3. **completa-range**: ciclo mostrato con `range(__, __)` da completare, output dato.
4. **ciclo-output** (inversione): dato il ciclo, scrivere l'output esatto (campo testo, non editor).
5. **ciclo-stringa**: `for lettera in "ciao"` (se nel programma della classe).
6. **accumulatore** (tappa di montagna): somma dei numeri da 1 a N con `totale += i`.

Ogni tipo ha un **generatore** con parametri casuali entro limiti didattici (es. stop ≤ 12, step ∈ {1,2,3,-1,-2}, mai più di ~12 righe di output) e una **soluzione di riferimento** che produce l'output atteso.

**Validazione per simulazione, non per confronto testuale**: il server interpreta il codice dell'allievo in un micro-interprete TypeScript limitato al sottoinsieme didattico e confronta l'output prodotto con quello atteso. Qualunque soluzione corretta vale (`range(0, 5)` = `range(5)`; nome della variabile libero).

**Sottoinsieme Python ammesso** dal micro-interprete: assegnazione di interi e stringhe, `for <var> in range(a[, b[, c]])`, `for <var> in "stringa"`, `print(...)` con stringhe, numeri, variabili e f-string semplici, `+`/`+=` su interi, indentazione a blocco singolo. Tutto il resto → errore con messaggio in italiano comprensibile. Tetto di sicurezza: max 1000 iterazioni, max 200 righe di output.

**Anti-furbo (vincolo)**: per le tappe che chiedono un ciclo, la soluzione deve contenere **esattamente un `for`** e il corpo al massimo 2 righe. Altrimenti `print("0")` ripetuto a mano passerebbe la verifica. Il micro-interprete espone la struttura (numero di for, righe del corpo) proprio per questo controllo.

**Hint mirati** (stile PRINT RUSH, generati dal confronto tra output prodotto e atteso): "il tuo ciclo parte da 0, deve partire da 3", "una ripetizione di troppo: guarda il secondo numero di range", "ti serve il terzo numero di range (il passo)", "il conto alla rovescia vuole un passo negativo", più gli errori di sintassi ("dopo `range(...)` ci vogliono i due punti", "la riga dentro il ciclo va spostata a destra (indentazione)"). Gli hint sono gratuiti e automatici: l'errore costa solo tempo.

## Il mini-editor (pagina allievo)

- **CodeMirror 6** con `@codemirror/lang-python` e tema scuro stile VS Code (One Dark): stessi colori che gli allievi vedono in VS Code.
- 2-4 righe, indentazione automatica dopo `:`, parentesi e virgolette auto-chiuse.
- **Autocompletamento** essenziale stile VS Code: `for`, `range()`, `print()`, `in`, nomi di variabile già scritti.
- Invio = a capo con indentazione; **Ctrl+Invio** o pulsante **"Esegui ▶"** = consegna.
- Feedback arcade come PRINT RUSH: tappa completata → la card vola via con burst + suono, arriva la prossima; errore → shake + hint nel pannello, suono soft.

## Architettura

Stesso pattern dell'escape room (`C:\Users\Regnaud\html-escape-room\CLAUDE.md`), semplificato perché le pagine allievi stanno su Vercel (stessa origine, niente CORS, niente `file://`):

```
PC allievo: /gara ──fetch /api/giro/*──▶ Next.js su Vercel ──Admin SDK──▶ Firestore
                                                                             │
LIM docente: /docente ◀──────── client SDK + onSnapshot ─────────────────────┘
```

### Vincoli critici (non negoziabili)

1. **Firestore scritto solo dal server** (Admin SDK). Regole: nessun accesso ai client tranne lettura di `giroSessions/**` per il docente autenticato (custom claim `teacher`).
2. **Validazione solo lato server**: output atteso e generatori mai nel bundle client. L'allievo manda il codice, il server risponde promosso/hint. (Eccezione: per `output-range` l'output atteso È la consegna mostrata; per `ciclo-output` invece è segreto.)
3. **Stesso progetto Firebase dell'escape room**, collezioni separate con prefisso proprio (`giroSessions`). Le regole dell'escape room non si toccano: si estende `firestore.rules` di questo repo con il blocco nuovo e si ripubblica (coordinarsi: un solo file di regole per progetto — copiare il blocco `escapeSessions` esistente e aggiungere il nostro).
4. **Identità dell'allievo in `localStorage`** (`giro:<sessionId>` → `{playerId, token, name}`): se ricarica la pagina riprende la gara dov'era.
5. **Errori di rete**: mai crash. Timeout 10 s, retry, messaggio "Connessione persa, chiama il prof".
6. **Rate limiting** per `playerId` (in memoria, come l'escape room): max ~30 submit/minuto.
7. Niente soluzioni, output attesi o parametri delle tappe future nelle risposte API: l'allievo riceve **solo la tappa corrente**.

## Modello dati Firestore

```
giroSessions/{sessionId}
  code: string                  // 4 caratteri senza 0/O/1/I, univoco tra le sessioni attive
  classLabel: string            // es. "2A"
  status: "waiting" | "running" | "closed"
  createdAt, startedAt, endedAt: Timestamp
  numTappe: number              // default 12
  tappe: Array<{                // generate alla creazione, uguali per tutti
    tipo: string                // "ripeti-n" | "output-range" | ...
    consegna: string            // testo mostrato all'allievo
    outputAtteso: string[]      // righe attese
    mostraOutput: boolean       // true per output-range, false per ciclo-output
    codiceMostrato?: string     // per completa-range e ciclo-output
  }>

giroSessions/{sessionId}/players/{playerId}
  name: string                  // nome di battesimo, normalizzato come nell'escape room
  nameKey: string               // minuscolo, per rifiutare i doppioni nella sessione
  tokenHash: string             // sha256 del token restituito all'allievo
  createdAt: Timestamp
  tappaCorrente: number         // 0-based; == numTappe → arrivato
  tappe: { [n: string]: { completedAt: Timestamp, errori: number } }
  erroriTotali: number
  finishedAt: Timestamp | null
  ordineArrivo: number | null   // assegnato dal server in transazione al traguardo
```

Classifica: `tappaCorrente` desc, poi `finishedAt`/ultimo `completedAt` asc.

## API

Allievo (`/api/giro/*`, tutte POST, body JSON, auth `playerId` + `token` via sha256):

| Route | Body | Risposta | Note |
|---|---|---|---|
| `join` | `{code, name}` | `{playerId, token, name, sessionStatus}` | sessione `waiting` o `running`; nomi normalizzati e doppioni rifiutati come nell'escape room (a parità di nome il server suggerisce "Luca B.") |
| `status` | `{playerId, token}` | `{sessionStatus, tappaCorrente, numTappe, tappa}` | `tappa` = solo consegna/codiceMostrato/output se `mostraOutput` della tappa corrente |
| `submit` | `{playerId, token, tappa, codice}` | `{ok: true, tappaSuccessiva?}` oppure `{ok: false, hint}` | valida col micro-interprete; registra `completedAt` solo la prima volta; rifiuta se `tappa != tappaCorrente` o sessione non `running` |

Docente (`/api/docente/*`, `Authorization: Bearer <ID token>`, email in `TEACHER_EMAILS`): crea sessione (genera il percorso), avvia, chiudi, correggi nome, elimina allievo, azzera tappa. Stesso impianto di auth dell'escape room (claim `teacher` auto-assegnato al primo accesso).

Errori: HTTP 4xx/5xx con `{error, message}` in italiano. Codici sul modello dell'escape room (`INVALID_BODY`, `INVALID_NAME`, `SESSION_NOT_FOUND`, `DUPLICATE_PLAYER`, `UNAUTHORIZED`, `SESSION_NOT_RUNNING`, `INVALID_TAPPA`, `RATE_LIMITED`, `INTERNAL`).

## Pagine

- `/` → ingresso allievo: codice sessione + nome → `join`; attesa del via con polling ogni 10 s.
- `/gara` → la gara: progresso tappe in alto (pallini/mini-pista), card della tappa, editor, hint, animazioni; al traguardo schermata d'arrivo con posizione.
- `/docente` → login Google, elenco sessioni, creazione (classe + numero tappe), avvia/chiudi.
- `/docente/sessione/[id]` → **vista LIM** a schermo intero: pista orizzontale con un ciclista per allievo (avanza di una casella a tappa completata, maglia rosa al primo), classifica laterale, feed eventi ("Sara ha scalato la tappa 8!"), codice sessione gigante finché `waiting`, podio animato alla chiusura + riepilogo errori per tipo di tappa (dice al docente cosa rispiegare). Realtime con `onSnapshot`.

## Stack e convenzioni

- Next.js (App Router) + TypeScript + Tailwind **alla radice del repo**, deploy su Vercel, Node 22. `firebase-admin` v13 (la 14 rompe su Vercel, verificato nell'escape room).
- Credenziali Admin da variabili d'ambiente (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`): stessi valori dell'escape room (`html-escape-room/web/.env`), mai file di service account nel repo.
- Editor: CodeMirror 6 (`codemirror`, `@codemirror/lang-python`, tema One Dark).
- Micro-interprete e generatori in `lib/giro/` **puri e senza dipendenze** (niente Firestore, niente Next): testabili in isolamento.
- Test: **Vitest** per micro-interprete, generatori e hint (è il cuore, va coperto bene); **Playwright** (solo Chromium) con emulatore Firestore per API e flusso completo, sul modello di `html-escape-room/tests/api/`.
- Commit piccoli, un task alla volta. Prima di dichiarare un task concluso, esegui i test.

## Cosa NON fare

- Non mandare al client output attesi segreti, soluzioni o tappe future.
- Non usare l'SDK client Firebase nelle pagine allievi (solo `fetch`; client SDK solo in `/docente` per login e `onSnapshot`).
- Non eseguire il codice dell'allievo con `eval`/`Function` o Python reale: solo il micro-interprete.
- Non toccare le regole/collezioni `escapeSessions` esistenti se non per copiarle nel file di regole condiviso.
