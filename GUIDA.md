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

## Parte 2 — Il giorno della lezione

### Prima che entrino

1. Sul PC della LIM apri **`/docente`** e accedi.
2. **Nuova gara**: scrivi la classe (es. `2A`) e il numero di tappe. Per la prima volta
   parti con **8 tappe** e guarda l'orologio: saprai come tarare le volte dopo.
3. Apri **Vista LIM** e metti il browser a schermo intero (F11). Il codice della gara
   riempie lo schermo.
4. Scrivi alla lavagna l'indirizzo del sito (quello Vercel, senza `/docente`).

### Quando arrivano

5. Gli allievi aprono il sito, scrivono **il codice** e **il loro nome**. Li vedi comparire
   in griglia di partenza alla LIM.
   - Se in classe ci sono due allievi con lo stesso nome, al secondo il sito chiede da
     solo di aggiungere l'iniziale del cognome ("Luca B.").
6. Quando ci sono tutti, premi **VIA!**.

### Durante la gara

Alla LIM vedi una riga per allievo: la strada percorsa, il ciclista, gli errori, e la
maglia rosa al primo. A destra la cronaca delle ultime tappe chiuse.

Toccando la riga di un allievo si aprono le correzioni:

| Problema | Che cosa fare |
|---|---|
| Nome scritto male all'ingresso | *Correggi il nome* → Salva |
| Ha superato una tappa per sbaglio, o vuoi fargliela rifare | *Rimanda alla tappa N* |
| Si è iscritto due volte / iscritto per errore | *Elimina* |

Se un allievo chiude il browser o ricarica la pagina, riprende da dove era: il suo posto
è salvato nel browser di **quel** PC.

### Alla fine

7. **Chiudi gara**: alla LIM compaiono il podio e il riquadro **Da rispiegare**, con i
   tipi di tappa ordinati per errori. È la cosa più utile per te: dice su che cosa la
   classe ha faticato di più.
8. La gara chiusa resta nell'elenco: puoi riaprire la vista LIM anche dopo, per
   commentare i risultati.

Per una seconda gara si crea una gara nuova: il percorso viene generato di nuovo con
numeri diversi, quindi non si può vincere a memoria.

---

## Cose da sapere

**Se un allievo cambia PC** (o il browser dimentica i dati) non può rientrare con lo
stesso nome: il sistema lo considera un doppione. Deve entrare con un nome leggermente
diverso e ricomincia da capo, oppure lo elimini dalla LIM e lo fai rientrare, sempre
ripartendo da zero. Finché restano al loro posto non è un problema.

**Se cade la rete** le pagine degli allievi non si rompono: riprovano da sole e mostrano
"Connessione al server persa". Quando la rete torna, si riprende.

**Gli errori non tolgono punti.** Conta chi arriva più lontano, e a parità chi ci è
arrivato prima. Gli errori si contano solo per il riepilogo finale. Vale la pena dirlo
agli allievi prima di cominciare: toglie la paura di provare.

**I `print` scritti a mano non valgono.** Se un allievo stampa cinque righe invece di
scrivere il ciclo, il sistema se ne accorge e glielo dice.
