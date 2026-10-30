# Il Giro dei Cicli — gara a tappe sui cicli `for`

Leggi questo file per intero prima di ogni sessione. Contiene obiettivi, architettura e vincoli non negoziabili. L'ordine dei lavori è in `TASKS.md`.

## Obiettivo

Gioco di classe in tempo reale sui cicli `for` in **Python**, ispirato al minigioco PRINT RUSH del manuale edu-code (`C:\Users\Regnaud\edu-code\src\components\manuale\DigitaPrintGame.tsx`: sfida di digitazione con validazione tollerante, hint mirati sull'errore, l'errore non toglie punti ma costa tempo).

**Meccanica: il Giro a tappe tematiche** (tema Giro d'Italia — "cicli" = loop e biciclette). Un **Giro** si corre lungo le settimane seguendo il programma: è fatto di **tappe**, ciascuna una gara breve (10 minuti, 5 esercizi) su **un argomento solo**. Gli esercizi dentro la tappa sono i **chilometri**. L'allievo scrive il codice in un mini-editor e lo esegue; se l'output è giusto il chilometro è fatto e parte il successivo, se è sbagliato riceve un hint mirato e riprova. Sulla LIM: la tappa dal vivo, i ciclisti che avanzano, la classifica, la maglia rosa al primo della generale.

- **Gara individuale** (non a coppie come l'escape room).
- **Classifica di tappa**: chilometri fatti (desc), a parità chi ha chiuso prima l'ultimo. Gli errori non penalizzano: costano solo tempo.
- **Punti di tappa** a scalare (25, 20, 16, 13, …, poi 1 a chiunque abbia fatto almeno un km). **Classifica generale**: somma delle **migliori N tappe** di ciascuno (N scelto dal docente; vuoto = tutte), così chi è assente non resta indietro per sempre.
- **Esercizi generati casualmente all'apertura di ogni tappa** (parametri random, uguali per tutti gli allievi): il gioco è rigiocabile e il docente non congela a settembre la difficoltà di dicembre.
- La **gara singola** di prima esiste ancora: è un Giro di una tappa sola, col tema "misto" e senza limite di tempo.

Il progetto dei contenuti e le decisioni prese con il docente sono in `PERCORSO.md`.

## Utenti

- **Allievi**: biennio di istruzione/formazione professionale, 14-16 anni, stanno imparando Python (variabili, `print`, f-string, cicli `for` con `range`). Giocano individualmente su PC del laboratorio, con Chrome o Edge, su una **pagina web servita da Vercel** (nessun vincolo `file://`: qui non si modificano file locali).
- **Docente**: Fabio, unico amministratore, account Google istituzionale.

Tutta l'interfaccia è in **italiano**.

**Dati personali minimi**: degli allievi si memorizza solo il **nome di battesimo**. Niente cognomi, email, account.

## Gli esercizi (i chilometri)

I tipi di esercizio (`TipoEsercizio` in `lib/giro/esercizi.ts`; nel codice "esercizio", nell'interfaccia "chilometro"):

1. **ripeti-n**: "Stampa `Evviva` 7 volte" → `for i in range(7): print("Evviva")`.
2. **riga-ripetuta**: stampa N volte una riga di simboli (`-----`).
3. **output-range**: dato l'output `0 1 2 3 4` (una riga per numero), scrivere il ciclo. Varianti su inizio, fine, passo, conto alla rovescia.
4. **completa-range**: ciclo mostrato con `range(__, __)` da completare, output dato.
5. **ciclo-output** (inversione): dato il ciclo, scrivere l'output esatto (campo testo, non editor).
6. **quante-righe**: dato il ciclo, rispondere con il solo numero di righe che stampa.
7. **fstring**: testo e numero insieme con formati che **solo** la f-string produce (`1° giro`, `Km 3/7`); al terzo livello la tabellina scritta per esteso.
8. **scala**: disegni di asterischi — rettangolo, scala che sale, scala che scende (`print("*" * i)`). Insegna la variabile come valore, e non si aggira col passo.
9. **caccia-errore**: un ciclo sbagliato già scritto nell'editor, con accanto quello che stampa adesso; l'allievo lo corregge.
10. **accumulatore-visibile**: la somma che cresce, stampata a ogni giro (`1 3 6 10 15`): primo scalino dell'accumulatore.
11. **conta-giri**: contatore `conta += 1`, stampato alla fine.
12. **accumulatore**: somma dei numeri da 1 a N con `totale += i`, stampata solo alla fine.
13. **ciclo-stringa**: `for lettera in "ciao"`, una lettera per riga.
14. **conta-lettere**: contare le lettere di una parola con un ciclo.

Ogni tipo ha un **generatore** con parametri casuali entro limiti didattici (es. stop ≤ 12, step ∈ {1,2,3,-1,-2}, mai più di ~12 righe di output) e una **soluzione di riferimento** che produce l'output atteso. La proprietà che i test controllano su decine di semi: la soluzione di riferimento passa sempre.

**Validazione per simulazione, non per confronto testuale**: il server interpreta il codice dell'allievo in un micro-interprete TypeScript limitato al sottoinsieme didattico e confronta l'output prodotto con quello atteso. Qualunque soluzione corretta vale (`range(0, 5)` = `range(5)`; nome della variabile libero).

**Sottoinsieme Python ammesso** dal micro-interprete: assegnazione di interi e stringhe, `for <var> in range(a[, b[, c]])`, `for <var> in "stringa"`, `print(...)` con stringhe, numeri, variabili e f-string semplici, `+`/`+=`/`*` (anche stringa per numero), cicli annidati; `input(domanda)` e `int(...)` **solo** quando le risposte arrivano dalle opzioni (`Opzioni.risposte`, i compiti con le domande): le domande finiscono nello `schermo`, non nell'`output` confrontato; `if`/`elif`/`else` con una condizione che è **un confronto solo** (`==`, `!=`, `<`, `>`, `<=`, `>=`; niente `and`/`or`/`not`, niente booleani), dentro e fuori dai cicli (PERCORSO.md §17); `while <confronto>:` con la stessa condizione dell'`if`, più `-=` e `*=` (PERCORSO.md §22): **niente `while True`, niente `break`**, la condizione dice quando il ciclo si ferma; `import random` e `random.randint(a, b)` **solo** quando i numeri arrivano dalle opzioni (`Opzioni.casuali`, da `Prova.casuali`: per l'allievo il numero è casuale, per il server è scritto nella prova, così l'output è uno solo e le prove nascoste cambiano anche il "caso"; `opzioniDiProva` in `esercizi.ts` costruisce le opzioni da una prova). Tutto il resto → errore con messaggio in italiano comprensibile. Tetto di sicurezza: max 1000 iterazioni, max 200 righe di output; **sul `while` i tetti sono l'hint del ciclo infinito** («la condizione resta sempre vera: dentro il ciclo deve cambiare qualcosa»), e chi finisce le risposte di prova legge «dopo l'ultima risposta il programma doveva fermarsi».

**Esercizi con `input()`** (`Esercizio.prove`): ogni fase ha due o più prove `{risposte, output}`; la prima è mostrata all'allievo (`EsercizioPubblico.risposte`), le altre sono nascoste e `valutaRisposta` le esegue dopo che la prima passa: chi scrive i valori a mano cade lì («con altre risposte stampa un'altra cosa»). Il testo delle domande è libero. Primo compito così: lo scontrino del bar (`lib/officina/compiti.ts`).

**Anti-furbo: il Giudice, non i vincoli** (PERCORSO.md §13). Il micro-interprete controlla **solo l'output**; niente limiti sulle righe del corpo o sul numero di `for` (bocciavano soluzioni giuste con una variabile d'appoggio). Ogni esercizio con il codice porta una **regola a parole** (`Esercizio.regola`, dalle `REGOLE` in `esercizi.ts` o scritta dal progetto): «le righe le stampa un ciclo, non la mano», «il totale lo tiene una variabile che accumula». Sul codice **già promosso** il server chiama il giudice (`lib/giro/giudice.ts` puro, `giudiceClient.ts` con Haiku) con la regola, il codice e i **fatti misurati** dall'interprete (`Struttura` e `giri`: quanti for, quanti print dentro e fuori, accumuli, input, giri fatti davvero). Verdetto `OK`/`NO` più un motivo a parole; se `NO` la consegna torna bocciata con «Il risultato è giusto, ma non è fatto come chiede la tappa: …» (`hintGiudice`, mai codice). **Se il modello non risponde o non si capisce, la consegna passa** (fail-open: la classe non si ferma per l'API) e resta nei log. La verifica completa è `verificaConsegna` in `lib/giro/verifica.ts`, chiamata **fuori** dalle transazioni. Nei test `GREGARIO_FINTO=1`: il giudice finto boccia solo il codice con il commento `# furbo`. Gli esercizi senza `regola` (le risposte scritte a mano, i Giri creati prima) non passano dal giudice.

**Hint mirati** (stile PRINT RUSH, dal confronto tra output prodotto e atteso): "il tuo ciclo parte da 0, deve partire da 3", "una ripetizione di troppo: guarda il secondo numero di range", "ti serve il terzo numero di range (il passo)", "il conto alla rovescia vuole un passo negativo", "le righe devono cambiare lunghezza: usa la variabile", più gli errori di sintassi del micro-interprete. Gli hint sono gratuiti e automatici: l'errore costa solo tempo. **L'hint dice l'errore fatto e dove sta, non come si corregge** (quello è il mestiere del tutor, PERCORSO.md §23): porta la **riga** (`Valutazione.riga`, dall'errore dell'interprete o dal `for` a zero giri in `Esito.cicliVuoti`) e l'editor dell'Officina la evidenzia. Le **diagnosi preliminari** dell'interprete (`diagnosiPreliminare`) riconoscono il JavaScript incollato e il testo senza virgolette dentro `print()`/`input()`; i messaggi di sintassi coprono il confronto lasciato da solo, le stesse virgolette dentro le graffe della f-string, le parentesi attorno alla condizione. Sulle **prove nascoste** l'hint distingue i valori scritti a mano (stesse righe della prova mostrata, risposte non lette, nessun `randint`), la riga scritta male (maiuscole, spazi, punteggiatura: cita la riga dell'allievo) e la differenza vera (quante righe, da dove), **mai** la riga attesa.

**Esercizi a output segreto** (`ciclo-output`, `quante-righe`, `accumulatore`, `conta-giri`, `conta-lettere`): gli hint dicono dove guardare, **mai** il contenuto atteso — altrimenti scrivendo a caso ci si fa dettare la soluzione. Vedi `TIPI_SEGRETI` in `lib/giro/hint.ts`.

## Il Giro: tappe, punti, classifiche

Logica pura in `lib/giro/giro.ts` (la usano il server e la LIM).

- **Temi delle tappe** (`TEMI`), nell'ordine didattico: ripetere, contare con range, il passo, leggere il codice, testo e numero (f-string), la scala, cronometro, caccia all'errore, accumulatore, cicli su una parola; più "misto" per la gara singola. Ogni tema ha un **piano** di 5 chilometri (tipo + difficoltà, che non scende mai) e una durata proposta (10 minuti, la cronometro 5).
- **Una tappa aperta alla volta.** Aprirne una nuova chiude la precedente fissandone i punti. Il docente sceglie la durata quando apre (o nessun limite) e può chiudere prima.
- **Tempo**: lo calcola il server (`secondiRimasti`), perché l'orologio dei PC d'aula non è affidabile. Dopo la scadenza le consegne sono rifiutate (`TEMPO_SCADUTO`); i punti si fissano alla chiusura.
- **Punti e generale si fissano sul server alla chiusura della tappa**: posizione e punti sul documento di ogni allievo che ha corso la tappa, e la classifica generale fotografata sul documento del Giro (`generale`). Così la pagina dell'allievo non deve leggere tutti gli allievi a ogni richiesta di stato. Si ricalcola anche quando il docente cambia N o corregge un allievo.
- **Chi non ha consegnato niente in una tappa** non ha la voce per quella tappa: niente posizione, niente punti. È quello che le "migliori N" compensano.
- **Il Giro è solo la gara.** I compiti di realtà vivono nell'Officina (sezione sotto) e non sono tappe: la Cronoscalata di un tempo (PERCORSO.md §11) è stata tolta il 22 ottobre 2026 (PERCORSO.md §14).
- **Cancellare una tappa** rinumera le successive: i progressi degli allievi sono salvati per indice di tappa, quindi vanno rinumerati nella stessa transazione (`rinumeraDopoCancellazione` in `giro.ts`), altrimenti i punti finirebbero alla tappa sbagliata.
- **Ordine d'arrivo sul momento**: chi finisce tutti i chilometri riceve subito "sei arrivato N°" (contatore `arrivati` per tappa sul Giro, in transazione).

## Il mini-editor (pagina allievo)

- **CodeMirror 6** con `@codemirror/lang-python` e tema scuro stile VS Code (One Dark): stessi colori che gli allievi vedono in VS Code.
- 2-4 righe, indentazione automatica dopo `:`, parentesi e virgolette auto-chiuse.
- **Autocompletamento** essenziale stile VS Code: `for`, `range()`, `print()`, `in`, nomi di variabile già scritti.
- Invio = a capo con indentazione; **Ctrl+Invio** o pulsante **"Esegui ▶"** = consegna (nell'Officina il pulsante si chiama **"Consegna ✔"**).
- **Solo nell'Officina, la «Prova ▶»** (`components/Prova.tsx`, PERCORSO.md §23): il programma gira **nel browser** come in un terminale, con le risposte che l'allievo digita lui a ogni `input()` e un `randint` casuale vero; non è una consegna, non conta errori, non tocca il server. Usa il micro-interprete in **modalità interattiva** (`Opzioni.interattivo`: quando le risposte finiscono l'esito è `ok: false` con `errore.tipo === 'input'` e la domanda in `attesaInput`; si riesegue da capo con una risposta in più, il programma è deterministico). È l'unico punto in cui l'interprete gira sul client: non contiene output attesi né generatori, quindi il vincolo «validazione solo sul server» resta.
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
4. **Identità dell'allievo**: sul server il **numero di corsa** (`numero`, progressivo nella gara, come il dorsale dei ciclisti), perché in laboratorio gli allievi cambiano PC e il browser non ha memoria di loro. Nel `localStorage` resta solo una scorciatoia **per gara** (`giro:gara:<sessionId>` più `giro:ultimo`): una chiave sola veniva sovrascritta dall'allievo della classe dopo.
5. **Errori di rete**: mai crash. Timeout 10 s, retry, messaggio "Connessione persa, chiama il prof".
6. **Rate limiting** per `playerId` (in memoria, come l'escape room): max ~30 submit/minuto.
7. Niente soluzioni, output attesi segreti o chilometri futuri nelle risposte API: l'allievo riceve **solo il chilometro da fare adesso**.

## Modello dati Firestore

```
giroSessions/{sessionId}            // un Giro (una gara singola è un Giro di una tappa "misto")
  code: string                      // 4 caratteri senza 0/O/1/I, univoco tra i Giri attivi
  classLabel: string                // es. "2A"
  status: "waiting" | "running" | "closed"   // waiting: nessuna tappa ancora aperta
  createdAt, startedAt, endedAt: Timestamp
  prossimoNumero: number            // prossimo numero di corsa da assegnare (parte da 1)
  migliori: number | null           // nella generale contano le migliori N tappe; null = tutte
  tappaAperta: number | null        // indice della tappa in corso
  arrivati: { [t]: number }         // quanti hanno finito tutti i km della tappa t
  generale: Array<{id, name, numero, punti, tappeContate, posizione}>  // fotografia del server
  tappe: Array<{
    tema: Tema                      // 'ripeti' | 'contare' | ... | 'misto' (lib/giro/giro.ts)
    km: number                      // 5 per le tappe tematiche
    stato: "da-correre" | "in-corso" | "chiusa"
    durataSec: number | null        // null = senza limite
    apertaAt, scadenzaAt, chiusaAt: Timestamp | null
    seme: number
    esercizi: Array<Esercizio>      // generati all'apertura, uguali per tutti (lib/giro/esercizi.ts)
  }>

giroSessions/{sessionId}/players/{playerId}
  name: string                      // nome di battesimo, normalizzato
  nameKey: string                   // minuscolo, per rifiutare i doppioni nel Giro
  numero: number                    // numero di corsa: serve a rientrare da un altro PC
  tokenHash: string                 // sha256 del token restituito all'allievo
  createdAt: Timestamp
  erroriTotali: number
  tappe: { [t]: {                   // manca se nella tappa t non ha mai consegnato
    km: number                      // chilometri fatti
    kmAt: { [k]: Timestamp }
    errori: number
    erroriKm: { [k]: number }       // per il riepilogo "Da rispiegare"
    ultimoAt: Timestamp | null
    ordineArrivo?: number           // se ha finito tutti i km
    posizione?: number              // fissati alla chiusura della tappa
    punti?: number
    codice?: { [k]: string }        // il codice promosso a ogni km (il docente può rileggerlo)
  } }
```

## API

Allievo (`/api/giro/*`, tutte POST, body JSON, auth `playerId` + `token` via sha256):

| Route | Body | Risposta | Note |
|---|---|---|---|
| `join` | `{code, name}` | `{playerId, token, name, numero, sessionStatus, numTappe, classLabel}` | Giro `waiting` o `running`; codice anche in minuscolo; nomi normalizzati e doppioni rifiutati (il messaggio suggerisce «Luca B.» oppure il rientro col numero) |
| `rientro` | `{code, numero}` | come `join` | Rientro da un altro PC con il numero di corsa. Il token viene **rigenerato**: quello rimasto sul PC di prima smette di valere |
| `status` | `{playerId, token}` | `{sessionStatus, name, numero, classLabel, numTappe, tappeCorse, singola, generale, erroriTotali, tappa, ultimaTappa}` | `tappa` = la tappa in corso vista dall'allievo (`indice, tema, nomeTema, km, kmFatti, secondiRimasti, scaduta, finita, ordineArrivo, esercizio`), `null` fra una tappa e l'altra; `esercizio` è solo il km da fare adesso. `generale` = `{posizione, punti, corridori}` dalla fotografia del server. `ultimaTappa` = risultato dell'ultima tappa chiusa che ha corso |
| `submit` | `{playerId, token, tappa, km, risposta}` | promosso: `{promosso: true, output, kmFatti, finita, ordineArrivo, erroriTotali, esercizio}`; bocciato: `{promosso: false, hint, output, erroriTotali}` | `tappa` deve essere quella aperta e `km` esattamente i km già fatti. **Una risposta sbagliata non è un errore HTTP**: torna 200 con l'hint. In due tempi: la verifica (interprete più giudice, `verificaConsegna`) fuori dalla transazione, poi la transazione rilegge, ricontrolla tappa e km e scrive. Il codice promosso si salva (`tappe[t].codice[k]`) |

Docente (`/api/docente/*`, `Authorization: Bearer <ID token>`, email in `TEACHER_EMAILS`; claim `teacher` auto-assegnato al primo accesso):

| Route | Azioni |
|---|---|
| `sessioni` | `elenco`; `crea` `{classLabel, tipo: 'giro', temi, migliori}` oppure `{classLabel, tipo: 'singola', km}`; `chiudi` (il Giro) |
| `tappe` | `apri` `{tappa, minuti}` (null = senza limite); `chiudi` `{tappa}`; `aggiungi` `{tema}`; `elimina` `{tappa}` (in qualunque stato: le tappe dopo scalano di numero e con loro i progressi degli allievi, i punti della tappa tolta spariscono, la generale si ricalcola; l'ultima tappa non si toglie); `migliori` `{migliori}` |
| `allievi` | `rinomina` `{name}`; `elimina`; `rimanda` `{tappa, km}` (azzera da quel km in poi e ricalcola i punti se la tappa è chiusa) |

`/api/giro/test-setup` esiste **solo per i test**: risponde 404 se non è impostato `FIRESTORE_EMULATOR_HOST`. Prepara Giri, apre e chiude tappe, fa scadere il tempo, e restituisce anche le soluzioni: non deve mai funzionare in produzione.

Errori: HTTP 4xx/5xx con `{error, message}` in italiano. Codici: `INVALID_BODY`, `INVALID_NAME`, `SESSION_NOT_FOUND` (404), `DUPLICATE_PLAYER` (409), `PLAYER_NOT_FOUND` (404), `UNAUTHORIZED` (401), `SESSION_NOT_RUNNING` (403, Giro non partito o chiuso), `INVALID_TAPPA` (400), `TAPPA_NON_APERTA` (409), `TEMPO_SCADUTO` (403), `TAPPA_FINITA` (403, ha già fatto tutti i km), `INVALID_KM` (400 fuori range, 409 non è il km corrente), `TAPPA_CHIUSA` (409, riaprire una tappa corsa), `ULTIMA_TAPPA` (400, cancellare l'unica tappa), `SESSION_CLOSED` (409), `RATE_LIMITED` (429), `INTERNAL` (500).

## L'Officina: i compiti di realtà in autonomia

Sistema **separato dal Giro** (PERCORSO.md §12 e §14): `lib/officina/`, con il motore comune di `lib/giro/` (interprete, hint, giudice) e un catalogo suo, `lib/officina/compiti.ts` (`ELENCO_COMPITI`, `generaCompito`, `schedaCompito`, `votoSeFinisce`) con i quattro compiti iniziali in `compitiIniziali.ts`, quelli sulle condizioni in `compitiCondizioni.ts`, i tre del diario in `compitiDiario.ts`, l'esame in `compitiPatentino.ts`. **Il percorso è a sezioni** (`SEZIONI`, PERCORSO.md §19): «Il ciclo for» con dodici compiti e «Il ciclo while» con altri dodici (PERCORSO.md §22), con le famiglie d'uso del `while` mescolate e la difficoltà che sale: timer del forno (`compitiWhile.ts`: i tre gesti, **fase 1 guidata** col `while` già in `codiceIniziale` e la riga dell'aggiornamento da completare) · salvadanaio della bici, batteria, pettegolezzo (`compitiWhileQuantita.ts`: finché la quantità, con `+=`, `-=`, `*=`) · parola d'ordine e cassa del bar (`compitiWhileRisposte.ts`: finché la risposta; la cassa è la sentinella 0 con la fase 1 guidata) · distributore e cassa con il menu (`compitiWhileMisti.ts`; il menu riparte dalla cassa già scritta) · indovina il numero, dado, duello (`compitiWhileCaso.ts`: `random.randint` dalle prove, `Prova.casuali`; indovina ha la fase 1 guidata con `import random` e `randint` già scritti; le prove nascoste mettono il caso agli estremi) · il **patentino dei cicli while** (`compitiPatentinoWhile.ts`, `patentinoWhile`, `esame: true`, il noleggio bici in spiaggia). Le regole del giudice dei compiti `while` escludono il `for`. `ELENCO_COMPITI` è le sezioni una dopo l'altra. **Undici compiti, un'idea nuova ciascuno** (PERCORSO.md §15, §17 e §18): cartello (ripetere), classifica (la variabile del ciclo), lancio (il passo), scala (la variabile in un calcolo), salvadanaio (accumulatore), allenamento (due variabili), scontrino (`input()`), promozione (decidere con un `if`: riparte dallo scontrino già scritto, `codiceIniziale` della fase 1, e tre clienti di prova per fase), diario (`input()` **dentro** il ciclo), record (la variabile che ricorda il migliore), conteggio (il contatore in un ramo dell'`if`); record e conteggio ripartono dal diario già scritto. In fondo alla sezione **il patentino dei cicli for** (`patentino`): cinque fasi su cinque idee in uno scenario nuovo, **tutor spento** (`esame: true` nella scheda, `eEsame`; l'API risponde `TUTOR_SPENTO`), hint automatici sì; chi lo passa vede il patentino sulla pagina. Il giudice riceve anche quante `input()` stanno dentro un ciclo (`inputNelCiclo`), quanti `while` e quanti cambiano nel corpo una variabile della condizione (`numWhile`, `whileAggiornati`), quanti `randint()` e dove (`numCasuali`, `casualiNelCiclo`). Ogni compito: 5 fasi che aggiungono un pezzo, output ≤ 12 righe, parametri dal seme; i test di `compiti.test.ts` lo verificano per ogni compito del catalogo. **Non è una gara**: ogni allievo percorre da solo, al suo ritmo, lo stesso elenco di compiti (`PERCORSO` = `ELENCO_COMPITI`, nell'ordine didattico), **uno sbloccato alla volta** anche attraverso le sezioni (`percorsoDi`: il seguente si apre quando il precedente è finito). Gli allievi entrano con **l'account Google della scuola** (SDK client anche per loro: è l'eccezione voluta; dominio in `OFFICINA_DOMINIO`), il server verifica l'ID token (`handlerAllievo`); al primo accesso **scelgono la classe da un elenco** (niente codice da proiettare). Si conservano uid, email e nome **solo qui** (collezioni `officinaClassi/{id}`, `officinaClassi/{id}/allievi/{uid}` con `lavori[progetto]`, `officinaAllievi/{uid}`), mai nel Giro. **Parametri per allievo** (`semeDa(uid|progetto)`); bozza salvata a ogni consegna; tutor **Sonnet** con conversazione (`TUTOR_MODEL`, domande fino a 6000 caratteri, filtro anti-codice in `lib/giro/filtroCodice.ts`, contesto e consiglio finto in `lib/officina/consiglio.ts`; **thinking adattivo** nella chiamata; il contesto porta anche la **regola** del compito e la **prova nascosta su cui cade** il codice, `provaCheCade`, PERCORSO.md §20), **tetto di 30 domande per compito** (`MAX_DOMANDE_TUTOR`: è un tetto alla spesa, non al voto; `domandeRimaste` nelle risposte). **Il tutor dà un passo solo** (PERCORSO.md §23): 70 parole, dove · perché · che cosa, chiusura con l'azione; riceve la **nota dell'autore per la fase** (`Esercizio.nota`, con `conNote` nei compiti della sezione `for`: errori tipici e che cosa far capire, **mai** mandata all'allievo), i **fatti misurati** dall'interprete (`descriviFatti`, gli stessi del giudice) e **quante volte ha già sbagliato la fase** (`erroriFase`). Nella pagina le **domande rapide** (`DOMANDE_RAPIDE`) al posto della domanda vuota. **Voto solo a compito finito**: 10 − domande, mai sotto 5, e il tutor resta disponibile anche a 5; `mediaVoti` dei compiti finiti. Il docente **guarda e basta**: tabella, lavoro di ciascuno, CSV.

API allievo: `POST /api/officina` con `{azione}` ∈ `io | classi | entra {classeId} | compiti {classeId} | compito {classeId, compitoId} | consegna {classeId, compitoId, fase, codice} | tutor {classeId, compitoId, domanda, codice}`, `Authorization: Bearer <ID token>`; `compitoId` è l'id del progetto. Docente: `POST /api/docente/officina` con `azione` ∈ `creaClasse {nome} | chiudiClasse {classeId} | apriClasse {classeId} | rimuoviAllievo {classeId, uid}`. Errori propri: `DOMINIO_NON_AMMESSO` (403), `CLASSE_NON_TROVATA` (404), `COMPITO_NON_TROVATO` (404), `BLOCCATO` (403), `CLASSE_CHIUSA` (403), `FINITO` (403), `FASE_SBAGLIATA` (409), `DOMANDE_FINITE` (403, tetto raggiunto), `TUTOR_SPENTO` (403, il patentino), `TUTOR_NON_DISPONIBILE` (503). La risposta di `compiti` porta anche `sezioni` e, per compito, `sezione` ed `esame`; quella di `compito` porta `esame`. `/api/officina/test-login` solo con l'emulatore Auth. Test: `tests/api/officina.spec.ts` (gli ID token si ottengono scambiando il custom token sull'emulatore).

## Pagine

- `/` → la porta d'ingresso: allievi e docente scelgono l'attività (il Giro → `/giro`, l'Officina → `/officina`; in fondo le due dashboard del docente).
- `/giro` → ingresso allievo nel Giro con due porte: prima volta (codice + nome) o rientro (codice + numero di corsa).
- `/gara` → chiede lo stato ogni 10 s, così si accorge da sola quando il prof apre o chiude una tappa. Schermate: attesa del via (col numero di corsa grande), tappa in corso (nome della tappa, Km X di 5, cronometro, editor, hint, animazioni), tempo scaduto, tappa finita (ordine d'arrivo), fra le tappe (posizione e punti dell'ultima tappa, posizione in generale), fine del Giro.
- `/officina` → l'Officina per l'allievo: login Google, scelta della classe, il percorso dei compiti a sezioni, uno sotto l'altro (finito con voto · in corso · comincia · 🔒 bloccato; «esame» sul patentino e «🪪 Patentino preso» sulla sezione quando è passato) e la media; `/officina/[classeId]/[compitoId]` → il compito (scheda, fase, editor che riparte dalla bozza, i dati di prova con le risposte e i numeri casuali (`RisposteDiProva`), `TutorChat` in conversazione, voto a fine). **La fase superata si festeggia**: coriandoli su tutta la pagina (`components/Coriandoli.tsx`, canvas che non prende i click), il cartello «Fase N superata!» (`role="status"`, aria-label «fase superata»; «Programma finito!»/«Patentino preso!» con la fanfara all'ultima), i suoni del Giro, e la pagina scorre da sola alla fase dopo (o al voto).
- `/docente/officina` → le classi dell'Officina (realtime), creazione; `/docente/officina/[classeId]` → solo monitoraggio: tabella allievi × compiti del percorso (`tabellaClasse`: fasi, domande, voto, media), il lavoro dell'allievo (codice fase per fase, bozza, conversazione), CSV (`csvClasse`), togli allievo, e l'**interruttore dell'Officina** (`InterruttoreOfficina`, anche nell'elenco delle classi): il docente la **chiude a fine lezione e la riapre la volta dopo**, così da casa nessuno si fa fare i compiti dal tutor. A classe chiusa gli allievi vedono scheda e codice (`classeChiusa` nel compito, avviso in pagina, editor e tutor spenti) ma consegne e tutor rispondono `CLASSE_CHIUSA`; chi non è ancora iscritto non la trova nell'elenco. Il lavoro resta tutto salvato: chiudere non è una fine.
- `/docente` → login Google, elenco dei Giri, creazione (Giro scegliendo le tappe tematiche e N, oppure gara singola), chiusura.
- `/docente/sessione/[id]` → **vista LIM**: alla partenza il codice gigante, la lista dei corridori con il numero e il VIA con la durata; durante la tappa il cronometro, la classifica dal vivo con la strada di ciascuno, la cronaca, le correzioni toccando una riga; fra le tappe l'ordine d'arrivo con i punti, la classifica generale con la maglia rosa e le migliori N, il piano del Giro con "aggiungi tappa"; alla fine il podio e il riepilogo "Da rispiegare". Realtime con `onSnapshot`. **Tutto deve stare in uno schermo da 1280×720 con 25 allievi**, senza scorrere: righe compatte su 1/2/3 colonne secondo il numero di allievi (`colonnePer`), elenchi riempiti per colonne, piano del Giro richiudibile. Un test in `tests/api/docente.spec.ts` ("una classe intera sulla LIM") lo verifica.

## Stack e convenzioni

- Next.js (App Router) + TypeScript + Tailwind **alla radice del repo**, deploy su Vercel, Node 22. `firebase-admin` v13 (la 14 rompe su Vercel, verificato nell'escape room).
- Credenziali Admin da variabili d'ambiente (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`): stessi valori dell'escape room (`html-escape-room/web/.env`), mai file di service account nel repo. `ANTHROPIC_API_KEY` per il tutor e il giudice: stesso valore di `edu-code/.env.local`; senza chiave (o con `GREGARIO_FINTO=1`) rispondono i finti.
- Editor: CodeMirror 6 (`codemirror`, `@codemirror/lang-python`, tema One Dark).
- Micro-interprete, generatori e hint in `lib/giro/` **puri e senza dipendenze** (niente Firestore, niente Next): testabili in isolamento. I moduli che toccano Firestore (`store.ts`, `service.ts`, `sessioni.ts`) hanno `import 'server-only'`.
- Test: **Vitest** (`npm test`) per micro-interprete, generatori, hint, nomi e rate limit (è il cuore, va coperto bene); **Playwright** (`npm run test:api`, solo Chromium) con emulatore Firestore per API e flusso completo, sul modello di `html-escape-room/tests/api/`. Gli emulatori girano sulle porte 8099/9199 e il server di test sulla 3211: diverse da quelle dell'escape room, così i due progetti possono avere i test aperti insieme. Serve Java.
- Commit piccoli, un task alla volta. Prima di dichiarare un task concluso, esegui i test.

## Cosa NON fare

- Non mandare al client output attesi segreti, soluzioni o chilometri futuri.
- Non usare l'SDK client Firebase nelle pagine allievi (solo `fetch`; client SDK solo in `/docente` per login e `onSnapshot`).
- Non eseguire il codice dell'allievo con `eval`/`Function` o Python reale: solo il micro-interprete.
- Non toccare le regole/collezioni `escapeSessions` esistenti se non per copiarle nel file di regole condiviso.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
