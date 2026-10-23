# Piano dei lavori

Un task alla volta, commit piccoli, test verdi prima di chiudere il task. Leggere `CLAUDE.md` prima di iniziare.

## Task 1 — Scaffold ✔
- [x] Next.js (App Router) + TypeScript + Tailwind alla radice, Node 22, `firebase-admin@13`.
- [x] `lib/firebaseAdmin.ts` (inizializzazione pigra da env, supporto `FIRESTORE_EMULATOR_HOST`), `.env.example` con tutte le variabili.
- [x] Route `api/health`. Vitest configurato.

## Task 2 — Micro-interprete (il cuore) ✔
- [x] Parser del sottoinsieme: assegnazioni, `for … in range(…)`, `for … in "…"`, `print(…)`, f-string, `+`/`+=`/`*`, corpo in linea o indentato (anche annidato).
- [x] Esecuzione con tetti (1000 iterazioni, 200 righe) → output e struttura del codice.
- [x] Errori con messaggi in italiano per allievi.
- [x] 69 test: casi validi, equivalenze, errori, tetti, tentativi "furbi".

## Task 3 — Generatori di tappe e hint ✔
- [x] Generatore per ognuno dei sei tipi, parametri casuali da un seme.
- [x] `generaPercorso`: pianura → montagna, tipi alternati, difficoltà che non scende.
- [x] Hint mirati dal confronto degli output + controlli anti-furbo.
- [x] 71 test, fra cui: la soluzione di riferimento passa sempre (ogni tipo, ogni difficoltà, 40 semi).

## Task 4 — API allievo + modello dati ✔
- [x] `join`, `status`, `submit` con token sha256, transazioni, rate limiting, errori uniformi.
- [x] Ciclo di vita della sessione in `sessioni.ts` (crea con percorso, via, chiusura).
- [x] 17 test Playwright sull'emulatore + 13 unitari (nomi, rate limit).

## Task 5 — Pagina allievo ✔
- [x] `/`: ingresso, `localStorage`, attesa del via, ripresa dopo ricarica.
- [x] `/gara`: card tappa, mini-editor CodeMirror 6 (Python, One Dark, suggerimenti), hint, progresso, animazioni e suoni, schermata d'arrivo.
- [x] Gestione errori di rete (timeout, retry, messaggio).
- [x] 9 test che giocano la gara con la tastiera.

## Task 6 — Docente e vista LIM ✔
- [x] Auth Google + claim `teacher`, `firestore.rules` con `giroSessions` accanto a `escapeSessions`, script `deploy-rules` e `set-teacher`.
- [x] `/docente`: elenco gare, creazione, via, chiusura; correzioni sull'allievo (nome, rimanda alla tappa, elimina).
- [x] `/docente/sessione/[id]`: strada con i ciclisti, maglia rosa, cronaca, codice gigante in attesa, podio e riepilogo "Da rispiegare".
- [x] 34 test: classifica (unitari), docente, regole Firestore.

## Task 8 — Il Giro a tappe tematiche ✔
- [x] Catalogo esteso: riga ripetuta, scala, caccia all'errore, quante righe, somma che cresce, conta i giri, f-string, conta le lettere.
- [x] Hint delle tappe a output segreto che non rivelano la risposta; accumulo obbligatorio nelle tappe della somma.
- [x] Numero di corsa e rientro da un altro PC; identità nel browser salvata per gara.
- [x] Il Giro: tappe tematiche da 5 km con cronometro, una aperta alla volta, punti alla chiusura, generale con le migliori N, tappe aggiungibili; la gara singola diventa un Giro di una tappa.
- [x] LIM: partenza, tappa dal vivo, risultati fra le tappe, fine del Giro. Pagina dell'allievo con cronometro, tempo scaduto, risultati.
- [x] Test: 231 unitari, 51 sull'emulatore.

## Task 9 — La Cronoscalata: il compito di realtà guidato (vedi PERCORSO.md §11)
- [x] 9a. `lib/giro/progetti.ts`: il salvadanaio come 5 fasi (`Esercizio` di tipo `progetto`) generate dal seme, la scheda del compito, il voto proposto. Tema `salvadanaio` senza cronometro. Test: la soluzione di riferimento passa ogni fase su decine di semi; ogni fase è la precedente più un pezzo.
- [x] 9b. Il Gregario: `lib/giro/gregario.ts` (prompt, filtro anti-codice, puro) + `api/giro/consiglio` (Claude Haiku, chiave `ANTHROPIC_API_KEY`, tetto e rate limit, consiglio salvato in `giroSessions/{id}/consigli`). Nei test l'IA è finta (`GREGARIO_FINTO`).
- [x] 9c. Pagina allievo: layout della Cronoscalata (scheda del compito, fase corrente, editor che non si svuota, bottone del gregario con conferma e voto attuale, i consigli ricevuti).
- [x] 9e. Secondo progetto: la tabella d'allenamento (due accumulatori, l'ordine nel corpo conta). Test comuni a tutti i progetti con `describe.each(ELENCO_PROGETTI)`.
- [x] 9d. Docente/LIM: la tabella `allievo · fasi · consigli · errori · voto proposto`, i consigli letti per allievo, esportazione CSV. La Cronoscalata non entra nella generale.

## Task 10 — L'Officina: i compiti di realtà in autonomia (PERCORSO.md §12)
- [x] 10a. Server: login con l'account scolastico (`lib/officina/auth.ts`, dominio `OFFICINA_DOMINIO`), classi con codice, compiti assegnati con scadenza, lavoro fase per fase con bozza, tutor Sonnet con conversazione (`lib/officina/tutor.ts`), voto del docente. Regole Firestore `officina*`. 7 test sull'emulatore + unitari.
- [x] 10b. Pagina allievo `/officina`: login Google, entrare con il codice, elenco dei compiti, il compito (scheda, fase, editor, tutor in conversazione, voto).
- [x] 10c. Dashboard `/docente/officina`: classi, codice, assegnare/ritirare compiti con scadenza, tabella allievi × compiti, il lavoro dell'allievo, voto a mano, CSV.
- [x] 10d. `input()` nel micro-interprete (risposte fornite dal compito, due serie, confronto sui soli print) e il progetto «lo scontrino del bar».

## Task 7 — Rifiniture
- [x] Podio e riepilogo degli errori per tipo di tappa (fatti nel Task 6).
- [x] README con istruzioni per la classe e per il deploy.
- [ ] Prova sul proiettore vero (leggibilità da lontano) e deploy su Vercel.
- [ ] Prova generale con una classe: una gara vera, poi tarare numero di tappe e difficoltà.

### Idee per dopo
- Maglia ciclamino per il più regolare; la tappa delle due soluzioni alla LIM (vedi PERCORSO.md).
- Aggancio a lab-guardian per riconoscere l'allievo dalla postazione.
- Esportazione dei risultati del Giro (CSV) per il registro.
- Tappe sui cicli annidati, quando la classe ci arriva.

## Task 11 — Il Giudice al posto dei vincoli (PERCORSO.md §13)
- [x] 11a. Via `Vincoli` da esercizi e progetti; `Esercizio.regola` a parole (`REGOLE`); l'interprete espone i `giri`; `hint.ts` guarda solo l'output.
- [x] 11b. `giudice.ts` (prompt, messaggio con i fatti, lettura del verdetto, hint senza codice, giudice finto) e `giudiceClient.ts` (Haiku, fail-open); `verificaConsegna` chiamata fuori dalle transazioni nel Giro e nell'Officina.

## Task 12 — Due attività separate (PERCORSO.md §14)
- [x] 12a. Via la Cronoscalata dal Giro (temi, gregario, `consiglio`, LIM, generale); catalogo dei compiti in `lib/officina/compiti.ts`, consiglio a parole in `lib/officina/consiglio.ts`, filtro anti-codice in `lib/giro/filtroCodice.ts`.
- [x] 12b. Il percorso a un'idea per compito (PERCORSO.md §15): i quattro compiti iniziali (cartello, classifica, lancio, scala) prima del salvadanaio, in `lib/officina/compitiIniziali.ts`.
- [x] 12d. L'interruttore dell'Officina: `apriClasse`/`chiudiClasse` a ogni lezione, avviso agli allievi a classe chiusa (PERCORSO.md §16).
- [x] 12e. Le condizioni (PERCORSO.md §17): confronti e `if`/`elif`/`else` nel micro-interprete; il compito 8, la promozione del bar, che riparte dallo scontrino già scritto.
- [x] 12f. Gli ultimi tre compiti sul `for` (PERCORSO.md §18): il diario delle uscite (`input()` nel ciclo), il record del mese, le uscite che contano, in `lib/officina/compitiDiario.ts`; il fatto `inputNelCiclo` per il giudice.
- [x] 12g. Il patentino dei cicli `for` (PERCORSO.md §19): il compito-esame in fondo alla sezione (cinque fasi su cinque idee, tutor spento, il patentino sulla pagina) in `lib/officina/compitiPatentino.ts`, e il percorso diviso in **sezioni** («Il ciclo for», «Il ciclo while»), sblocco uno alla volta attraverso le sezioni.
- [x] 12h. Il tutor più chiaro (PERCORSO.md §20): thinking adattivo, regola e prova nascosta nel contesto, prompt con l'ordine dove · perché · che cosa.
- [ ] 12c. I `while`, nella seconda sezione: l'obiettivo del salvadanaio, la cassa del bar (sentinella), indovina il numero; `while` nel micro-interprete con l'hint sul ciclo infinito.
