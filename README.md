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

1. Il docente apre `/docente`, accede con Google e crea una gara (classe e numero di tappe).
2. Apre la **vista LIM** e proietta: il codice di 4 caratteri riempie lo schermo.
3. Gli allievi aprono il sito, scrivono codice e nome, e aspettano in griglia di partenza.
4. Il docente preme **VIA!** e la corsa comincia.
5. Alla chiusura la LIM mostra il podio e il riquadro **Da rispiegare**: i tipi di tappa
   ordinati per errori, cioè che cosa è conviene riprendere la lezione dopo.

Il percorso è generato a caso a ogni gara (stesso per tutti gli allievi della stessa
gara, così è equa): rigiocandolo, la classe non ha le risposte a memoria.

## I tipi di tappa

| Tipo | Che cosa chiede |
|---|---|
| `ripeti-n` | stampare N volte una frase |
| `output-range` | dato l'output, scrivere il ciclo |
| `completa-range` | completare i numeri di `range` in un ciclo già impostato |
| `ciclo-output` | letto il ciclo, scrivere che cosa stampa |
| `ciclo-stringa` | scorrere le lettere di una parola |
| `accumulatore` | sommare con `totale += i` (il tappone) |

La correzione non confronta il testo del codice: lo **esegue** in un micro-interprete
(`lib/giro/interprete.ts`) e confronta l'output. Così ogni soluzione corretta vale
(`range(5)` o `range(0, 5)`, nome della variabile libero) e dagli scarti nascono gli hint.
Controlli anti-furbo impediscono di vincere con i `print` scritti a mano.

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
