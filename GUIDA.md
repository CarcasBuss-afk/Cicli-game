# Guida operativa per il docente

Due parti: la **preparazione**, che si fa una volta sola, e la **lezione**, che si ripete
a ogni gara.

---

## Parte 1 — Preparazione (una volta sola)

### 1. Pubblicare le regole Firestore

Senza questo passaggio la vista LIM non legge niente: resterebbe vuota anche con gli
allievi in gara. Dalla cartella `Cicli-game`:

```bash
npx firebase deploy --only firestore:rules --project html-css-attivita
```

Sei già autenticato con firebase-tools, quindi non serve altro.

In alternativa, dalla console Firebase: *Firestore Database → Regole*, incollare il
contenuto di `firestore.rules` di questo repository e premere **Pubblica**.

> Il progetto Firebase ha **un solo** file di regole, condiviso con l'escape room. Il
> file di questo repository contiene le regole di tutte e due le attività, quindi
> pubblicarlo non toglie niente a "Fuga dal Server". Attenzione al contrario: se un
> giorno pubblichi le regole dal repository dell'escape room, cancelli quelle del Giro e
> la LIM smette di vedere la corsa.

### 2. Mettere online l'app su Vercel

Nuovo progetto Vercel collegato al repository GitHub `CarcasBuss-afk/Cicli-game`.

- **Root directory**: la radice del repository (qui l'app non sta in `web/` come
  nell'escape room).
- **Variabili d'ambiente**: le stesse che hai già nel progetto Vercel dell'escape room,
  si possono copiare da lì.

| Variabile | Da dove |
|---|---|
| `FIREBASE_PROJECT_ID` | `html-css-attivita` |
| `FIREBASE_CLIENT_EMAIL` | account di servizio, come nell'escape room |
| `FIREBASE_PRIVATE_KEY` | idem (con i `\n` letterali) |
| `TEACHER_EMAILS` | `f.regnaud@ciacdidattica.it` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | console Firebase → impostazioni progetto → app web |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `html-css-attivita.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `html-css-attivita` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | console Firebase, stessa pagina |

Le `NEXT_PUBLIC_*` entrano nel programma al momento della build: se le cambi dopo, va
rifatto il deploy.

### 3. Autorizzare il dominio per il login

Console Firebase → *Authentication → Impostazioni → Domini autorizzati* → aggiungere il
dominio Vercel del Giro (es. `cicli-game.vercel.app`).

Senza questo, il tuo accesso con Google non parte e la pagina dice che il dominio non è
autorizzato.

### 4. Provare a vuoto, prima di portarlo in classe

1. Apri `/docente`, accedi con Google (il permesso di docente si assegna da solo al primo
   accesso, non devi fare niente a mano).
2. Crea una gara di prova, apri la **Vista LIM**.
3. Dal telefono apri il sito, entra con il codice e un nome inventato, gioca una tappa.
4. Controlla che alla LIM ti veda avanzare. Poi chiudi la gara di prova.

---

## Parte 2 — Il Giro in classe

### Come funziona, in breve

Un **Giro** è un campionato che dura settimane. È fatto di **tappe**: ogni tappa è una gara
breve (di solito 10 minuti) su **un argomento solo**, con **5 esercizi** che si chiamano
**chilometri**. Apri una tappa quando hai spiegato quell'argomento; fra una tappa e l'altra
possono passare giorni.

In ogni tappa conta chi fa più chilometri, e a parità chi li ha chiusi prima. Gli errori non
tolgono niente. Alla chiusura della tappa ognuno prende dei **punti** (25 al primo, 20 al
secondo, 16 al terzo… e almeno 1 a chiunque abbia fatto un chilometro). La **classifica
generale** somma le **migliori N tappe** di ciascuno, così chi è assente non resta indietro.

### Una volta sola: creare il Giro

1. Apri **`/docente`** e accedi.
2. Scrivi la classe e lascia selezionato **Giro a tappe**.
3. Spunta le tappe che farai, nell'ordine del programma. Di partenza sono spuntate le prime
   quattro (ripetere, contare con range, il passo, leggere il codice). **Non preoccuparti di
   scegliere tutto subito**: le altre tappe si aggiungono dalla LIM quando arrivi a
   quell'argomento.
4. Se vuoi, scrivi quante tappe contano nella generale ("le migliori N"). Puoi lasciarlo
   vuoto e deciderlo più avanti, anche a Giro iniziato.
5. **Crea il Giro**. Il codice di 4 caratteri resta lo stesso per tutto il Giro: puoi
   scriverlo su un cartello in laboratorio.

> Per una gara di un'ora sola, come prima, c'è **Gara singola**: una tappa mista, senza
> limite di tempo.

### Ogni lezione

1. Apri la **Vista LIM** del Giro e proiettala (F11 per lo schermo intero).
2. Gli allievi aprono il sito:
   - **la prima volta** scrivono il codice e il nome, e ricevono il loro **numero di corsa**;
   - **dalle volte dopo** scelgono "Ho già un numero" e scrivono codice e numero. Alla LIM
     c'è il link **"mostra codice e numeri di corsa"**: proietta la lista, così nessuno deve
     ricordarsela.
3. Quando sei pronto, scegli la **durata** (10 minuti proposti, la cronometro 5; vuoto =
   senza limite) e premi **VIA!**. La pagina degli allievi parte da sola.
4. Durante la tappa la LIM mostra il **cronometro**, la classifica dal vivo con la strada di
   ciascuno e la cronaca dei chilometri chiusi. Allo scadere degli allievi compare "Tempo
   scaduto".
5. Premi **Chiudi la tappa** (anche prima del tempo, se vedi che sono tutti fermi). Compaiono
   l'**ordine d'arrivo con i punti** e la **classifica generale** con la maglia rosa. Gli
   allievi vedono la loro posizione nella tappa e in generale.

Aprire la tappa successiva chiude da sola quella in corso: non c'è il rischio di
dimenticarne una aperta.

### Quanto sta sullo schermo

La LIM è pensata per stare in **uno schermo solo, senza scorrere**, anche su un proiettore
da 1280×720 e con una classe di 25 allievi. Le righe si stringono e si dispongono su più
colonne man mano che gli allievi aumentano (una colonna fino a 8, due fino a 18, poi tre),
e le classifiche si leggono dall'alto in basso, colonna per colonna. Il piano del Giro sta
chiuso per lasciare spazio alla classe: si apre con un clic sul riquadro **Il Giro**.

### Correzioni durante la tappa

Tocca la riga di un allievo alla LIM:

| Problema | Che cosa fare |
|---|---|
| Nome scritto male all'ingresso | *Correggi il nome* → Salva |
| Ha superato un chilometro per sbaglio, o vuoi farglielo rifare | *Rimanda al km N* |
| Si è iscritto due volte / per errore | *Elimina* |

Le correzioni ricalcolano punti e classifica da sole, anche su una tappa già chiusa.

### Quando arrivi a un argomento nuovo

Fra una tappa e l'altra, nel riquadro **Il Giro** della LIM, scegli il tema dal menu e premi
**Aggiungi tappa**. Le tappe disponibili, nell'ordine del programma: ripetere, contare con
range, il passo, leggere il codice, testo e numero (f-string), la scala, cronometro, caccia
all'errore, accumulatore, cicli su una parola.

### Cancellare una tappa

Nel riquadro **Il Giro** della LIM ogni tappa ha una ✕. Cosa succede dipende dalla tappa:

| Tappa | Che cosa succede |
|---|---|
| Ancora da correre | sparisce dal piano |
| Già chiusa | spariscono anche i suoi punti, e la classifica generale si ricalcola |
| In corso | finisce subito senza punti. Durante la tappa c'è anche il link **annulla questa tappa**, per quando si apre quella sbagliata |

Le tappe dopo scalano di un numero, e i risultati degli allievi le seguono. Chiede sempre
conferma prima di cancellare. L'ultima tappa rimasta non si cancella: per finire, si chiude
il Giro.

### Alla fine del Giro

**Chiudi il Giro** (in alto a destra della LIM). Compaiono il **podio del Giro**, la
classifica generale completa e il riquadro **Da rispiegare**: i tipi di esercizio ordinati per
errori, cioè su che cosa la classe ha faticato di più in tutto il Giro.

## Cose da sapere

**Il numero di corsa si può indovinare.** Con venticinque allievi, provare il numero di un
compagno è alla portata di chiunque. Il danno però è a una classifica di un gioco, tu dalla
LIM vedi subito se qualcuno fa un balzo strano, e hai i pulsanti per correggere o rimandare
indietro un allievo. Se un giorno diventasse un problema vero, si può stringere.

**Se cade la rete** le pagine degli allievi non si rompono: riprovano da sole e mostrano
"Connessione al server persa". Quando la rete torna, si riprende.

**Gli errori non tolgono punti.** In ogni tappa conta chi fa più chilometri, e a parità chi
li ha chiusi prima. Gli errori si contano solo per il riepilogo "Da rispiegare". Vale la pena
dirlo agli allievi prima di cominciare: toglie la paura di provare.

**I `print` scritti a mano non valgono.** Se un allievo stampa cinque righe invece di
scrivere il ciclo, il sistema se ne accorge e glielo dice.
