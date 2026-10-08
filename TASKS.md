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
