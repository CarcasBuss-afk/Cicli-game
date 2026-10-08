# Il Giro a tappe tematiche — progetto del percorso

Raccolta delle decisioni prese nel brainstorming. È il piano di contenuto e di struttura
per la versione del gioco spalmata su più lezioni. Non è ancora implementato: oggi il
gioco fa **una gara sola** con un percorso misto di esercizi.

## 1. L'idea di fondo

Invece di una gara da 12 esercizi mescolati, **una tappa per argomento**. Ogni tappa è una
gara breve (dieci minuti) su un solo tipo di esercizio; il Giro è l'insieme delle tappe e
si corre lungo le settimane, seguendo il programma.

Risolve tre problemi in un colpo solo:

- **Niente argomenti mai visti.** Non serve configurare cosa far uscire: si corre la tappa
  dell'argomento appena spiegato, le altre aspettano.
- **Chi si pianta non è fuori per sempre.** Oggi chi si blocca al terzo esercizio passa
  fermo il resto dell'ora. Con le tappe, ogni tappa riazzera: la settimana dopo riparte
  alla pari. È decisivo per i più in difficoltà.
- **Ritmo di lezione sano.** Dieci minuti di gara, poi si spiega, poi si corre ancora.

Gli allievi si iscrivono **una volta sola** per tutto il Giro: niente nome da riscrivere a
ogni tappa.

## 2. Come si vince

Non "chi vince più tappe": premierebbe solo il primo, e chi arriva sempre secondo dopo due
tappe smette di spingere. Si usa la **classifica a punti**, che è anche la soluzione del
Giro vero: ogni tappa assegna punti a scalare (15 al primo, 12 al secondo, 10 al terzo…) e
la generale è la somma. Il primo vale di più, ma anche il sesto porta a casa qualcosa.

Volendo due maglie: **rosa** a chi ha più punti, **ciclamino** a chi è più regolare.

Dentro la singola tappa la classifica è quella che il gioco ha già: chi ha completato più
esercizi, a parità chi ci è arrivato prima.

## 3. Regole di una tappa

- **Durata**: un tempo deciso alla creazione (es. sette minuti), più il pulsante "chiudi
  tappa" per il docente, che serve quando sono tutti fermi.
- **Esercizi dentro la tappa**: cinque o sei dello stesso tipo, a difficoltà crescente,
  con numeri sempre diversi.
- **Come chiamarli**: restando nel tema, i **chilometri** della tappa ("sei al km 4 di 6").
  In alternativa "prove". Serve una parola perché "tappa" ora indica la gara breve.
- **Assenti**: chi manca perde una tappa. O lo si accetta, oppure la generale conta solo le
  migliori N tappe di ciascuno (anche questo è un meccanismo da ciclismo).

## 4. Il catalogo degli esercizi

**✔** = il generatore esiste già · **○** = da costruire

### A. Ripetere — il `for` come "fai N volte"

La variabile non si usa: conta solo le ripetizioni. Primo scalino.

| Esercizio | Esempio | Soluzione | |
|---|---|---|---|
| Ripeti una frase | Stampa 5 volte `Evviva` | `for i in range(5): print("Evviva")` | ✔ |
| Frase con apostrofo | Stampa 4 volte `C'è il sole` | obbliga le virgolette doppie | ✔ |
| Riga ripetuta | 6 righe di `-----` | `print("-----")` nel ciclo | ○ |

### B. Contare — il `for` che scorre i numeri

Il cuore di `range`. Tre argomenti distinti, da tenere come tappe separate.

| Esercizio | Esempio | Soluzione | |
|---|---|---|---|
| Da 0 a N | `0 1 2 3 4` | `range(5)` | ✔ |
| Da A a B | `3 4 5 6 7` | `range(3, 8)` | ✔ |
| Completa i buchi | `range(__, __)` con l'output dato | solo i numeri | ✔ |
| Il passo | `0 2 4 6 8` | `range(0, 10, 2)` | ✔ |
| Conto alla rovescia | `5 4 3 2 1` | `range(5, 0, -1)` | ✔ |
| Multipli e tabelline | multipli di 7 fino a 70 | `range(7, 71, 7)` | ✔ |

> I multipli stanno **qui**, non fra gli esercizi sulla variabile: `range` li produce con
> il solo passo.

### C. Leggere il codice — l'inversione

Non si scrive, si legge. Veloce e preziosa: è l'abilità che manca quasi sempre.

| Esercizio | Esempio | Risposta | |
|---|---|---|---|
| Che cosa stampa? | dato il ciclo, scrivi le righe | l'output | ✔ |
| Quante righe stampa? | solo il numero | un numero | ○ |
| **Caccia all'errore** | "doveva stampare 1..5, stampa 0..4: correggilo" | il codice giusto | ○ |

### E. Disegnare — la variabile come valore

Sostituisce la tappa sui quadrati, scartata. Stessa lezione — `i` non è solo un contagiri,
è un valore — ma il risultato **si vede**: se sbagli, la scala viene storta.
Non aggirabile col passo: nessun `range` produce stringhe che si allungano.
Prerequisito nuovo: `"*" * 3` fa `***` (trenta secondi di spiegazione). Il motore lo
supporta già.

| Esercizio | Esempio | Soluzione | |
|---|---|---|---|
| Rettangolo | 4 righe da 6 asterischi | `print("*" * 6)`, `i` non si usa | ○ |
| Scala crescente | `*`, `**`, `***`, `****` | `print("*" * i)` | ○ |
| Scala decrescente | la stessa al contrario | `print("*" * i)` con passo negativo | ○ |

### F. Accumulare — la variabile che ricorda

Il tappone, spezzato in due scalini invece di uno.

| Esercizio | Esempio | Soluzione | |
|---|---|---|---|
| Somma visibile | stampa `1 3 6 10 15` | `totale += i` con `print` **dentro** | ○ |
| Somma finale | somma 1..5, stampa `15` | `print` **fuori** dal ciclo | ✔ |
| Somma dei pari | i pari fino a 10 | `range(2, 11, 2)` + accumulatore | ✔ |
| Conta i giri | quante volte gira il ciclo | `conta += 1` | ○ |

### G. Cicli su una parola

L'altro iterabile: il `for` non scorre più numeri.

| Esercizio | Esempio | Soluzione | |
|---|---|---|---|
| Lettera per riga | `pedale` | `for lettera in "pedale"` | ✔ |
| Conta le lettere | quante lettere ha | stringa + accumulatore | ○ |

### D. Testo e numero insieme — in attesa delle f-string

Da aprire solo quando la classe avrà fatto le f-string.

| Esercizio | Esempio | Soluzione | |
|---|---|---|---|
| Numerare le righe | `Giro 1 … Giro 5` | `print(f"Giro {i}")` | ○ |
| Tabellina scritta | `7 x 1 = 7`, `7 x 2 = 14` | f-string con calcolo | ○ |

## 5. L'ordine proposto del Giro

| # | Tappa | Da costruire? |
|---|---|---|
| 1 | Ripetere | no, pronta |
| 2 | Contare con `range` (da 0 a N, da A a B, completa) | no, pronta |
| 3 | Il passo, avanti e indietro | no, pronta |
| 4 | Leggere il codice: che cosa stampa | no, pronta |
| 5 | La scala di asterischi | esercizi nuovi |
| 6 | Cronometro (ripasso veloce delle tappe 1-3) | formato nuovo |
| 7 | Caccia all'errore | esercizi nuovi |
| 8 | Accumulatore: somma visibile, poi somma finale | metà nuova |
| 9 | Cicli su una parola | no, pronta |

Gli esercizi delle tappe 1-4 e 9 **esistono già**: di quelle tappe manca solo la struttura
che le tiene insieme, non il contenuto.

## 6. Due formati speciali

**La cronometro.** Non contenuto nuovo, formato nuovo: esercizi facili già visti, conta
solo la velocità. Nel Giro vero esiste, quindi il tema regge. In classe serve a far vincere
qualcun altro — premia la fluidità sulle cose base, che è un obiettivo vero e che di solito
non si misura mai.

**La tappa delle due soluzioni.** Su un esercizio che ammette due strade giuste (i multipli
di 7: `range(7, 71, 7)` oppure `print(i * 7)`) si lascia risolvere come si vuole, e alla
fine si mostrano le due soluzioni affiancate alla LIM: "hanno ragione tutti e due, ma
pensano in modo diverso". È il momento in cui il secondo modello mentale si vede nascere
invece di spiegarlo a vuoto. Il sistema sa già quale codice ha scritto ciascuno: va solo
mostrato.

## 7. I due modelli mentali (perché certi esercizi contano)

`range` sa produrre **solo progressioni aritmetiche**. Quindi ogni esercizio il cui output
sia una progressione (multipli, pari, conto alla rovescia) è risolvibile col solo passo e
non obbliga a usare la variabile.

- **Col passo**: *faccio produrre al ciclo i numeri che mi servono*.
- **Col calcolo**: *il ciclo mi dà 1, 2, 3… e io li trasformo*.

Il secondo regge il peso di tutto il resto del programma (accumulatore, condizioni, liste,
funzioni); il primo è una scorciatoia che si rompe appena il bersaglio non è una
progressione. Per **verificare** il secondo modello l'esercizio deve essere costruito in
modo che solo quello funzioni: è il caso della scala.

In alternativa si può vincolare la consegna ("usando `range(1, 11)`"): è legittimo, purché
scritto. Richiederebbe di insegnare al micro-interprete a contare gli argomenti di `range`
— oggi sa già contare i `for` e le righe del corpo.

## 8. Che cosa comporta costruirlo

Il motore non si tocca: micro-interprete, hint, editor e LIM restano come sono. Cambia la
struttura sopra.

- **Modello dati**: una sessione non è più una lista di esercizi ma un **Giro** con N
  tappe, ognuna con il suo argomento, la sua durata, il suo stato e la sua classifica, più
  la generale a punti.
- **Dashboard**: comporre il Giro scegliendo le tappe, poi aprire e chiudere una tappa alla
  volta.
- **LIM**: due classifiche (tappa e generale), il cronometro della tappa.
- **Generatori nuovi**: scala, caccia all'errore, accumulatore visibile, riga ripetuta,
  quante righe stampa, conta i giri.

## 9. Decisioni ancora aperte

- **Le f-string: le hanno fatte?** Decide se la famiglia D entra adesso o dopo.
- **Quanti esercizi e quanti minuti per tappa**, almeno come punto di partenza.
- **Gli esercizi dentro la tappa si chiamano "chilometri" o "prove"?**
- **Assenti**: si accetta la tappa persa, o la generale conta le migliori N?
