# Il Giro dei Cicli

Gara di classe in tempo reale sui cicli `for` in Python, per il biennio professionale.
Ogni allievo corre un percorso a tappe dal proprio PC: riceve una consegna alla volta,
scrive il codice in un mini-editor e lo esegue. Alla LIM il docente proietta la corsa,
con i ciclisti che avanzano, la maglia rosa e la cronaca.

Ispirato al minigioco **PRINT RUSH** del manuale edu-code: l'errore non toglie punti,
costa solo tempo, e porta sempre un suggerimento che dice che cosa guardare.

**Per usarlo in classe**: `GUIDA.md` ha la procedura passo passo, dalla preparazione
(regole Firestore, deploy, domini autorizzati) alla lezione.

## Come si gioca in classe

Un **Giro** dura settimane ed è fatto di **tappe**: gare brevi (10 minuti, 5 esercizi detti
**chilometri**) su un argomento solo, che il docente apre quando ha spiegato
quell'argomento. In ogni tappa conta chi fa più chilometri; alla chiusura si prendono punti,
e la classifica generale somma le migliori N tappe di ciascuno. Gli errori non tolgono
niente: costano solo tempo.

1. Il docente crea il Giro da `/docente`, scegliendo le tappe del programma.
2. Proietta la **vista LIM**: codice del Giro, lista dei corridori con il numero di corsa.
3. Gli allievi entrano col codice e il nome la prima volta, col codice e il numero di corsa
   dalle volte dopo (anche da un altro PC).
4. Il docente sceglie la durata e preme **VIA!**; alla fine **chiude la tappa** e la LIM
   mostra ordine d'arrivo, punti e generale con la maglia rosa.
5. A fine Giro: podio e riquadro **Da rispiegare**, con i tipi di esercizio ordinati per
   errori.

Gli esercizi sono generati a caso all'apertura di ogni tappa, uguali per tutti: rigiocando,
la classe non ha le risposte a memoria. La gara di un'ora sola, come all'inizio, c'è ancora:
**Gara singola**.

## Le tappe e gli esercizi

| Tappa | Che cosa allena |
|---|---|
| Ripetere | il `for` come "fai N volte" |
| Contare con range | da 0 a N, da A a B, completare range |
| Il passo | il terzo numero di `range`, il conto alla rovescia |
| Leggere il codice | quante righe stampa, che cosa stampa |
| Testo e numero | f-string dentro il ciclo |
| La scala | disegni di asterischi: la variabile come valore |
| Cronometro | esercizi facili già visti, conta la velocità |
| Caccia all'errore | correggere un ciclo sbagliato |
| Accumulatore | la somma che cresce, contare i giri, la somma finale |
| Cicli su una parola | `for lettera in "parola"` |

La correzione non confronta il testo del codice: lo **esegue** in un micro-interprete
(`lib/giro/interprete.ts`) e confronta l'output. Così ogni soluzione corretta vale
(`range(5)` o `range(0, 5)`, nome della variabile libero) e dagli scarti nascono gli hint.
Controlli anti-furbo impediscono di vincere con i `print` scritti a mano.

Il progetto completo, con il catalogo degli esercizi e le decisioni prese, è in
`PERCORSO.md`.

## Sviluppo

```bash
npm install
cp .env.example .env.local     # poi riempire le variabili
npm run dev                    # http://localhost:3000
```

Le variabili sono le stesse del progetto `html-escape-room`: il progetto Firebase è lo
stesso, con collezioni proprie (`giroSessions`). Vedi `.env.example`.

Comandi utili:

| Comando | Che cosa fa |
|---|---|
| `npm test` | test unitari (micro-interprete, tappe, hint, classifica): veloci |
| `npm run test:api` | test su emulatore Firestore: API, gioco completo, docente, regole (serve Java) |
| `npm run typecheck` | TypeScript |
| `npm run build` | build di produzione |
| `npm run set-teacher -- prof@scuola.it` | assegna il ruolo docente |
| `npm run deploy-rules` | pubblica `firestore.rules` |

**Attenzione alle regole**: il progetto Firebase ha un solo file di regole, condiviso con
l'escape room. `firestore.rules` di questo repository contiene anche il blocco
`escapeSessions`: pubblicando da qui si sovrascrivono anche quelle. Tenere i due file
allineati.

## Deploy

Su Vercel, con la radice del repository come root directory. Variabili d'ambiente: quelle
di `.env.example` (le `NEXT_PUBLIC_*` finiscono nel bundle al momento della build).
Aggiungere il dominio Vercel ai domini autorizzati di Firebase Authentication, altrimenti
il login Google del docente non funziona.

## Documentazione

- `CLAUDE.md`: obiettivi, architettura, modello dati, vincoli non negoziabili.
- `TASKS.md`: stato dei lavori.
