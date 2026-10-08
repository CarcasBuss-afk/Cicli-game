# Piano dei lavori

Un task alla volta, commit piccoli, test verdi prima di chiudere il task. Leggere `CLAUDE.md` prima di iniziare.

## Task 1 — Scaffold
- [ ] Next.js (App Router) + TypeScript + Tailwind alla radice, Node 22, `firebase-admin@13`.
- [ ] `lib/firebaseAdmin.ts` (inizializzazione pigra da env, supporto `FIRESTORE_EMULATOR_HOST`), `.env.example` con tutte le variabili.
- [ ] Route `api/health`. Vitest configurato con un test segnaposto.

## Task 2 — Micro-interprete (il cuore)
`lib/giro/interprete.ts`, puro TypeScript, zero dipendenze.
- [ ] Tokenizer + parser del sottoinsieme: assegnazioni, `for … in range(…)`, `for … in "…"`, `print(…)` (stringhe, numeri, variabili, f-string semplici), `+`/`+=`, un livello di indentazione.
- [ ] Esecuzione con tetti (1000 iterazioni, 200 righe) → `{output: string[], struttura: {numFor, righeCorpo}}`.
- [ ] Errori di sintassi/esecuzione con messaggi in italiano per allievi (saranno gli hint di sintassi).
- [ ] Test Vitest estesi: casi validi, equivalenze (`range(5)` ≡ `range(0,5)`), tutti gli errori, i tetti, tentativi "furbi".

## Task 3 — Generatori di tappe e hint
`lib/giro/tappe.ts` + `lib/giro/hint.ts`, puri.
- [ ] Generatore per tipo (`ripeti-n`, `output-range`, `completa-range`, `ciclo-output`, `ciclo-stringa`, `accumulatore`) con parametri casuali entro i limiti didattici di CLAUDE.md.
- [ ] `generaPercorso(numTappe)`: curva di difficoltà (pianura → montagna), mix dei tipi.
- [ ] Hint mirati dal confronto output prodotto/atteso (parte da N, una ripetizione di troppo/di meno, passo mancante/negativo, testo diverso…), più il controllo anti-furbo (un solo `for`, corpo ≤ 2 righe).
- [ ] Test Vitest: ogni generatore produce tappe la cui soluzione di riferimento passa la validazione; hint giusti sui classici errori.

## Task 4 — API allievo + modello dati
- [ ] `join`, `status`, `submit` come da CLAUDE.md: token sha256, transazioni per completamento tappa e `ordineArrivo`, rate limiting in memoria, errori `{error, message}`.
- [ ] Creazione sessione lato lib (servirà al docente): genera codice e percorso.
- [ ] Test Playwright API con emulatore Firestore (config sul modello `html-escape-room/playwright.api.config.ts`): flusso join→status→submit sbagliato (hint)→submit giusto→avanzamento→traguardo; doppioni; tappa sbagliata; sessione non running.

## Task 5 — Pagina allievo
- [ ] `/`: ingresso (codice + nome), salvataggio in `localStorage`, attesa del via (polling 10 s), ripresa dopo ricarica.
- [ ] `/gara`: card tappa, mini-editor CodeMirror 6 (lang-python, One Dark, autocomplete `for`/`range()`/`print()`, Ctrl+Invio/pulsante Esegui), pannello hint, progresso tappe, animazioni e suoni stile PRINT RUSH (card che vola via, shake sull'errore), schermata d'arrivo.
- [ ] Gestione errori di rete (timeout, retry, messaggio).

## Task 6 — Docente e vista LIM
- [ ] Auth Google + claim `teacher` (impianto dell'escape room), `firestore.rules` esteso con `giroSessions` accanto al blocco `escapeSessions` esistente, script deploy-rules.
- [ ] `/docente`: elenco sessioni, creazione (classe, numero tappe), avvia, chiudi; azioni su allievo (correggi nome, elimina, azzera tappa).
- [ ] `/docente/sessione/[id]` (LIM): pista con ciclisti, maglia rosa, classifica, feed eventi, codice gigante in `waiting`, realtime `onSnapshot`.
- [ ] Test Playwright: aggiornamento LIM entro 2 s dal submit.

## Task 7 — Rifiniture
- [ ] Podio animato alla chiusura + riepilogo errori per tipo di tappa (cosa rispiegare).
- [ ] Verifica su proiettore (leggibilità da lontano), suoni rifiniti, deploy Vercel, prova generale con sessione vera.
