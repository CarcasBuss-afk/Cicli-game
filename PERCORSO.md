# Il Giro a tappe tematiche — progetto del percorso

Raccolta delle decisioni prese nel brainstorming. È il piano di contenuto e di struttura
per la versione del gioco spalmata su più lezioni.

**Stato (21 ottobre 2026)**: **costruito.** Il Giro a tappe tematiche funziona: tappe da 5
chilometri con il cronometro, punti, classifica generale con le migliori N, numero di corsa
per rientrare da qualunque PC, e tutti gli esercizi del catalogo. La gara singola di prima
esiste ancora come Giro di una tappa sola. Restano aperte le idee della sezione 10; la
sezione 11 è il progetto nuovo in costruzione: la **Cronoscalata**, il compito di realtà.

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
Giro vero: ogni tappa assegna punti a scalare e la generale è la somma.

**Tabella adottata**: 25, 20, 16, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, e **1 punto a
chiunque abbia fatto almeno un chilometro**. Una tabella che si fermasse al decimo, con
venticinque allievi, lascerebbe a zero metà classe a ogni tappa. A parità di punti in
generale vince chi ha vinto più tappe.

La generale somma le **migliori N tappe** di ciascuno (N deciso dal docente, anche a Giro
iniziato; vuoto = tutte). La **maglia rosa** va al primo della generale. La maglia
ciclamino (la più regolare) è rimasta un'idea: vedi sezione 10.

Dentro la singola tappa la classifica è quella che il gioco ha già: chi ha completato più
esercizi, a parità chi ci è arrivato prima.

## 3. Regole di una tappa

- **Durata**: 10 minuti proposti (5 per la cronometro), che il docente cambia quando apre
  la tappa, o toglie del tutto; più il pulsante "chiudi la tappa" per finire prima.
- **Esercizi dentro la tappa**: **5**, dello stesso argomento, a difficoltà che non scende
  mai, con numeri generati all'apertura e uguali per tutti.
- **Si chiamano chilometri** ("Km 3 di 5").
- **Assenti**: la generale conta le **migliori N tappe** di ciascuno.
- **Una tappa aperta alla volta**: aprire la successiva chiude da sola quella in corso.

## 4. Il catalogo degli esercizi

**✔** = il generatore esiste già · **○** = da costruire

### A. Ripetere — il `for` come "fai N volte"

La variabile non si usa: conta solo le ripetizioni. Primo scalino.

| Esercizio | Esempio | Soluzione | |
|---|---|---|---|
| Ripeti una frase | Stampa 5 volte `Evviva` | `for i in range(5): print("Evviva")` | ✔ |
| Frase con apostrofo | Stampa 4 volte `C'è il sole` | obbliga le virgolette doppie | ✔ |
| Riga ripetuta | 6 righe di `-----` | `print("-----")` nel ciclo | ✔ |

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
| Quante righe stampa? | solo il numero | un numero | ✔ |
| **Caccia all'errore** | "doveva stampare 1..5, stampa 0..4: correggilo" | il codice giusto | ✔ |

### E. Disegnare — la variabile come valore

Sostituisce la tappa sui quadrati, scartata. Stessa lezione — `i` non è solo un contagiri,
è un valore — ma il risultato **si vede**: se sbagli, la scala viene storta.
Non aggirabile col passo: nessun `range` produce stringhe che si allungano.
Prerequisito nuovo: `"*" * 3` fa `***` (trenta secondi di spiegazione). Il motore lo
supporta già.

| Esercizio | Esempio | Soluzione | |
|---|---|---|---|
| Rettangolo | 4 righe da 6 asterischi | `print("*" * 6)`, `i` non si usa | ✔ |
| Scala crescente | `*`, `**`, `***`, `****` | `print("*" * i)` | ✔ |
| Scala decrescente | la stessa al contrario | `print("*" * i)` con passo negativo | ✔ |

### F. Accumulare — la variabile che ricorda

Il tappone, spezzato in due scalini invece di uno.

| Esercizio | Esempio | Soluzione | |
|---|---|---|---|
| Somma visibile | stampa `1 3 6 10 15` | `totale += i` con `print` **dentro** | ✔ |
| Somma finale | somma 1..5, stampa `15` | `print` **fuori** dal ciclo | ✔ |
| Somma dei pari | i pari fino a 10 | `range(2, 11, 2)` + accumulatore | ✔ |
| Conta i giri | quante volte gira il ciclo | `conta += 1` | ✔ |

### G. Cicli su una parola

L'altro iterabile: il `for` non scorre più numeri.

| Esercizio | Esempio | Soluzione | |
|---|---|---|---|
| Lettera per riga | `pedale` | `for lettera in "pedale"` | ✔ |
| Conta le lettere | quante lettere ha | stringa + accumulatore | ✔ |

### D. Testo e numero insieme — le f-string

La classe le ha fatte. I formati sono scelti perché **solo** la f-string li produca:
`print("Giro", i)` scrive "Giro 1" con lo spazio, ma non "1° giro" né "Km 3/7", dove il
numero è attaccato al testo. La tabellina invece si può scrivere anche con `print(7, "x",
i, "=", 7 * i)` e va bene lo stesso: lì la lezione è usare `i` in un calcolo.

| Esercizio | Esempio | Soluzione | |
|---|---|---|---|
| Numerare le righe | `1° giro … 5° giro` | `print(f"{i}° giro")` | ✔ |
| Contachilometri | `Km 1/5 … Km 5/5` | `print(f"Km {i}/5")` | ✔ |
| Tabellina scritta | `7 x 1 = 7`, `7 x 2 = 14` | f-string con calcolo | ✔ |

## 5. L'ordine proposto del Giro

| # | Tappa | Da costruire? |
|---|---|---|
| 1 | Ripetere | no, pronta |
| 2 | Contare con `range` (da 0 a N, da A a B, completa) | no, pronta |
| 3 | Il passo, avanti e indietro | no, pronta |
| 4 | Leggere il codice: che cosa stampa | no, pronta |
| 5 | Testo e numero (f-string) | no, pronta |
| 6 | La scala di asterischi | no, pronta |
| 7 | Cronometro (ripasso veloce delle tappe 1-3), 5 minuti | no, pronta |
| 8 | Caccia all'errore | no, pronta |
| 9 | Accumulatore: somma che cresce, conta i giri, somma finale | no, pronta |
| 10 | Cicli su una parola: lettere e conta le lettere | no, pronta |

Tutte le tappe sono costruite (i piani dei 5 chilometri stanno in `TEMI`, in
`lib/giro/giro.ts`). La cronometro è un formato, non un tipo di esercizio: riusa quelli
delle tappe 1-3 e dura 5 minuti.

**Nella gara singola di oggi** il percorso misto usa solo i tipi che si risolvono con
`range` e `print`: ripeti, riga ripetuta, scrivi il ciclo, completa, che cosa stampa,
caccia all'errore, quante righe, e l'accumulatore come tappone finale. Il **ciclo sulla
parola è stato tolto dal mix**, perché la classe non l'ha ancora fatto; scala, somma che
cresce e conta giri sono pronti ma escono solo quando il docente li sceglierà nelle tappe
tematiche.

### Due difetti trovati costruendo gli esercizi nuovi, e sistemati

**Gli hint delle tappe a output segreto rivelavano la risposta.** In "che cosa stampa",
nella somma finale e in "quante righe" l'hint diceva "alla riga 1 ci vuole «Giro 1»" o
"deve venire 28": scrivendo a caso, un allievo si faceva dettare la soluzione. Ora in
quelle tappe l'hint dice **dove** guardare ("la riga 2 non è giusta: rifai a mente il
secondo giro"), mai **che cosa** ci va.

**La somma si poteva vincere scrivendo il risultato in un ciclo finto**:
`for i in range(1): print(28)` aveva un `for`, un corpo di una riga e passava. Ora le tappe
dell'accumulatore chiedono che dentro il ciclo ci sia davvero un accumulo (`totale += i`
oppure `totale = totale + i`).

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

## 8. Che cosa è stato costruito

Il motore non è cambiato: micro-interprete, hint ed editor sono gli stessi. È cambiata la
struttura sopra.

- **Modello dati**: un documento di gara è un **Giro** con le sue tappe (tema, chilometri,
  stato, durata, esercizi generati all'apertura), la tappa aperta, N e la classifica
  generale fotografata dal server. Ogni allievo ha i suoi progressi per tappa.
- **Punti fissati sul server alla chiusura della tappa**, non calcolati al volo: così la
  pagina dell'allievo non deve leggere tutta la classe ogni dieci secondi.
- **Dashboard**: si compone il Giro scegliendo le tappe, oppure si crea la gara singola.
- **LIM**: partenza col codice e i numeri di corsa, tappa dal vivo col cronometro, risultati
  e generale fra le tappe, "aggiungi tappa", fine del Giro con podio e "Da rispiegare".
- **Pagina dell'allievo**: cronometro calcolato dal server (l'orologio dei PC d'aula non è
  affidabile), tempo scaduto, risultato della tappa e posizione in generale.

## 9. L'identità attraverso le settimane — **deciso e fatto**

I dati sono sempre stati al sicuro (stanno su Firestore, non nel browser). Il problema era
un altro: **come fa un allievo a dimostrare di essere lui la settimana dopo**, visto che in
laboratorio cambia PC e il browser di quella postazione non lo conosce.

**Soluzione adottata: il numero di corsa**, come il dorsale dei ciclisti. All'iscrizione il
server assegna un numero progressivo; per rientrare da qualunque computer bastano il codice
della gara e quel numero. Nessun dato personale in più, niente password. La lista dei
corridori con i numeri si proietta alla LIM prima del via, così non c'è niente da
ricordare. Rientrando, la postazione precedente viene scollegata: un allievo corre da un
PC alla volta.

Limite accettato: **il numero si indovina**. In una classe è un imbroglio possibile ma
pubblico — si vede dalla LIM e si corregge. Se diventasse un problema, si stringe.

Sistemato nell'occasione anche un difetto: l'identità nel browser stava sotto **una chiave
sola**, quindi due allievi di classi diverse sullo stesso PC si sovrascrivevano. Ora è
salvata per gara.

### Più avanti: agganciarsi a lab-guardian

In `lab_guardian` esiste già l'infrastruttura che risolverebbe tutto meglio: gli allievi
hanno **account Firebase veri** con `uid` stabile (progetto `lab-guardian-scuola`), c'è
l'anagrafica `students/{uid}` con nome, cognome e classe, e la collezione `sessions`
registra **chi è connesso su quale PC** — la dashboard lo mostra già accanto a ogni
postazione. Il sistema sa già chi è seduto lì.

La via più elegante sarebbe: l'allievo sceglie la sua postazione e il Giro chiede a
lab-guardian chi è connesso lì. Zero password, zero numeri, identità forte perché deriva
dal login del gate.

Tre cose da pesare prima di farlo:

- **Accoppiamento**: il Giro funzionerebbe solo in laboratorio, con agente e gate attivi.
  Per questo il numero di corsa resta comunque: due porte, una sola stanza.
- **Due progetti Firebase diversi** (`html-css-attivita` e `lab-guardian-scuola`), con in
  più la trappola nota che in quel progetto `firebase-admin/auth` è rotto per il conflitto
  jose/jwks-rsa (là usano le REST Identity Toolkit).
- **Privacy**: oggi il Giro conserva solo il nome di battesimo. Agganciarsi significa
  conservare identificatori degli allievi: da decidere apposta, non per inerzia.

## 10. Decisioni prese e idee per dopo

**Prese con il docente**: le f-string la classe le ha fatte; 5 esercizi e 10 minuti per
tappa, con la durata modificabile e la chiusura anticipata; gli esercizi si chiamano
chilometri; la generale conta le migliori N tappe.

**Idee rimaste fuori, da valutare dopo le prime prove in classe**:

- **Maglia ciclamino** per il più regolare (per esempio la media delle posizioni).
- **La tappa delle due soluzioni** (sezione 6): mostrare alla LIM due soluzioni diverse e
  giuste dello stesso esercizio.
- **Aggancio a lab-guardian** per riconoscere l'allievo dalla postazione (sezione 9).
- **Tarare la difficoltà** dei piani di ciascuna tappa dopo aver visto quanti chilometri fa
  davvero la classe in dieci minuti.

## 11. La Cronoscalata: il compito di realtà guidato

**Decisioni prese con il docente (21 ottobre 2026).** Gli allievi da soli non arriverebbero
a scrivere un programma intero: il compito di realtà va **presentato sul sito** e spezzato
in passi che li accompagnano. Possono chiedere consigli all'IA, ogni consiglio costa un
punto sul voto, e il consiglio non è mai codice.

### L'idea

Una **tappa speciale del Giro**, senza cronometro, che il docente apre come le altre. I suoi
5 chilometri sono le **fasi di costruzione di un solo programma**: a ogni fase l'allievo
aggiunge una riga o due a quello che ha già, e il programma cresce fino al prodotto finale.
L'editor **non si svuota** fra una fase e l'altra. La fase 1 la sanno fare tutti (è la
tappa "ripetere"); ogni fase sposta un pezzo solo.

La scheda del compito racconta committente, prodotto e **l'output finale per intero**: in un
compito di realtà il bersaglio si vede, non è un segreto. Per questo in tutte le fasi
l'output atteso è mostrato e gli hint automatici del Giro restano quelli di sempre.

### Il primo progetto: il salvadanaio

Committente: sé stessi. Prodotto: il piano di risparmio da stampare. I parametri (quota
settimanale, numero di settimane) li genera il server dal seme della tappa, **uguali per
tutti** (non li sceglie l'allievo: correggere a mano sarebbe più difficile, e la classe
deve poter confrontare i programmi alla LIM).

| Fase | Consegna | Cosa aggiunge |
|---|---|---|
| 1 | `Settimana 1` … `Settimana 8` | `for` + f-string |
| 2 | `Settimana 1: 15 €` (la quota accanto) | il numero fisso nel testo |
| 3 | `Settimana 1: 15 €`, `Settimana 2: 30 €`… il totale che cresce | accumulatore |
| 4 | la barra `*` accanto al totale, un asterisco per settimana | `"*" * i` |
| 5 | riga finale `Obiettivo 120 € raggiunto in 8 settimane` | `print` dopo il ciclo |

Tutto si fa con il sottoinsieme del micro-interprete (`+`, `*`, f-string, accumulatore).

### Il secondo progetto: la tabella d'allenamento (21 ottobre 2026)

Committente: un amico che prepara una gara. Prodotto: il piano di allenamento da appendere
in garage. Si parte da P km la prima settimana e si aggiungono I km a settimana (P ∈ {8,
10, 12, 15}, I ∈ {2, 3, 5}, 6-9 settimane, dal seme).

| Fase | Consegna | Cosa aggiunge |
|---|---|---|
| 1 | `Settimana 1` … `Settimana 8` | `for` + f-string |
| 2 | `Settimana 1: 10 km`, `Settimana 2: 13 km`… | `km` che parte prima del ciclo e cresce **dopo** la stampa: l'ordine nel corpo conta |
| 3 | `… (totale 23)` | il **secondo accumulatore** |
| 4 | la barra `=` | `"=" * i` |
| 5 | `In 8 settimane hai pedalato 316 km` | `print` dopo il ciclo |

È il passo dopo il salvadanaio: due variabili che ricordano, corpo del ciclo di tre righe,
e un errore nuovo che si vede subito (aumentare i km prima di stamparli sbaglia la prima
riga). L'accumulo è richiesto già dalla fase 2.

Altre idee nella stessa struttura: i biglietti numerati della festa (corpo di tre righe,
cornice-testo-cornice), il listino del bar con i cicli annidati (quando la classe ci
arriva). L'orario dell'autobus richiederebbe `//` e `%`, rimandato.

### Il Gregario: il consiglio dell'IA

Bottone «Chiedi al gregario» accanto all'editor, con una domanda facoltativa (a 14 anni
spesso non si sa cosa chiedere: il bottone da solo vale «non so andare avanti»). Prima di
chiedere l'allievo vede «Questo consiglio costa 1 punto. Voto attuale: 9» e conferma.

Il server manda a Claude (Haiku, la stessa chiave di edu-code, in variabile d'ambiente):
scheda del progetto, consegna della fase, codice attuale, output prodotto e atteso, la
domanda, i consigli già dati. Regole del tutor: **un consiglio in 2-3 frasi, zero righe di
codice**, indica dove guardare e che cosa cambiare, mai la riga da scrivere. Il server
**controlla la risposta** (niente blocchi di codice né righe che sembrano Python) e se non
va la richiede: l'allievo non vede mai codice. Tetto di 30 consigli per allievo e tappa,
rate limit come il submit. Ogni consiglio è salvato (fase, domanda, risposta) e il docente
li rilegge: dicono dove la classe si incaglia.

Gli hint automatici del Giro restano **gratis**: sono sulla sintassi e sul confronto degli
output, e l'errore continua a costare solo tempo.

### Il voto

`voto = 10 − consigli`, con pavimento **5**, per chi arriva in fondo. Chi non finisce ha un
voto **proposto** proporzionale alle fasi fatte (3 su 5 → 6), meno i consigli, pavimento 2;
è solo una proposta, il docente lo cambia prima di esportare. La Cronoscalata **non entra
nella classifica generale** del Giro: è a parte, con la sua tabella
`allievo · fasi · consigli · errori · voto proposto` esportabile.

## 12. L'Officina: i compiti di realtà in autonomia (21 ottobre 2026)

**Decisione.** La Cronoscalata (§11) era un innesto sulla gara: tappa aperta dal docente,
tutti insieme, parametri uguali, nome di battesimo. Per i compiti di realtà il docente
vuole altro: **un sistema suo**, con una dashboard sua, dove gli allievi **procedono in
autonomia** (a casa o in laboratorio, al loro ritmo), entrano con **l'account Google della
scuola**, e hanno un tutor più capace (almeno Sonnet) con domande lunghe quanto serve.
L'Officina è questo. Il Giro non cambia; la Cronoscalata resta per chi la vuole in classe.

**Identità.** Login Google (SDK client anche per gli allievi, è l'eccezione alla regola del
Giro), dominio limitato a `OFFICINA_DOMINIO`. Il server verifica l'ID token a ogni chiamata.
Si conservano **uid, email istituzionale e nome** dell'allievo: decisione presa apposta,
vale solo per l'Officina (collezioni `officina*`), non per il Giro.

**Classi.** Il docente crea la classe; l'allievo al primo accesso **la sceglie da un
elenco** (niente codice da proiettare o dettare) e da lì è dentro per sempre
(`officinaAllievi/{uid}` ricorda le sue classi, così non servono query di gruppo).

**Il percorso.** Non si assegna niente: tutti vedono **lo stesso elenco di compiti**, i
progetti nell'ordine didattico, uno sotto l'altro, e **si sbloccano uno alla volta**: il
seguente si apre quando il precedente è finito. Si va avanti a oltranza, al proprio ritmo,
senza scadenze. Ogni allievo ha **i suoi parametri** (seme da uid + progetto): il vicino non
copia i numeri. Si lavora fase per fase come nella Cronoscalata; l'ultima consegna, giusta
o no, resta come bozza e alla riapertura l'editor riparte da lì.

**Il tutor.** Sonnet 5.5 (`TUTOR_MODEL`), conversazione vera (la storia del compito entra
come messaggi: «non ho capito» ha un senso), domanda fino a 6000 caratteri, risposta fino a
un paragrafo pieno. Regola "mai codice" e filtro identici al gregario; può spiegare un
concetto con un esempio della vita.

**Tetto di 30 domande per compito** (22 ottobre 2026): a 5 il voto è già fermo, il tetto serve
alla spesa (ogni domanda porta con sé tutta la conversazione: 30 domande ≈ 0,45 $ per
allievo e compito, il massimo possibile) e a non far diventare il tutor una chat. L'allievo
vede quante gliene restano sotto le dieci; a zero il pannello lo dice e si va avanti da soli.

**La porta d'ingresso** (`/`, 22 ottobre 2026): allievi e docente scelgono l'attività da una
pagina sola, Giro o Officina; l'ingresso del Giro è passato a `/giro`.

**Voto.** Solo a compito finito: 10 − domande al tutor, **mai sotto 5**; arrivati a 5 gli
aiuti restano possibili. Un compito in corso non ha voto e non pesa sulla media. L'allievo
vede la **media dei voti** dei compiti finiti.

**Dashboard** (`/docente/officina`): **solo monitoraggio**. Classi → tabella allievi ×
compiti del percorso (fasi, domande, voto, media), il lavoro di ciascuno (codice fase per
fase, bozza, conversazione col tutor), CSV. Niente da proiettare: non è una gara.

*(Prima versione, 21 ottobre: codice di classe, compiti assegnati con scadenza, voto del
docente a mano. Tolti lo stesso giorno su richiesta del docente, a favore di questo modello
più semplice.)*

### Il terzo progetto: lo scontrino del bar, con `input()`

Il micro-interprete ha imparato `input(domanda)` e `int(...)`, ma solo quando **le risposte
le fornisce il compito**: nessuna tastiera, il server esegue il programma con le risposte
di prova. Le domande non entrano nell'output confrontato (il testo è libero, come il nome
delle variabili) ma si vedono nello "schermo" con la risposta evidenziata. Ogni fase si
prova con **due serie di risposte**, una mostrata e una nascosta: chi scrive i valori a
mano passa la prima e cade sulla seconda, con l'hint «i valori devono arrivare da
`input()`». È l'anti-furbo naturale, e insegna la cosa giusta: il programma deve
funzionare per chiunque.

| Fase | Consegna | Cosa impara |
|---|---|---|
| 1 | chiedi il nome → `Scontrino di Luca` | `input()` + f-string |
| 2 | chiedi quanti panini → `Panini: 3` | `int(input())` |
| 3 | una riga per panino | il ciclo guidato dall'input |
| 4 | `Totale: 12 €` | accumulatore (ripasso) |
| 5 | chiedi quanto paga → `Hai dato 20 €, resto 8 €. Grazie Luca!` | sottrazione, tre input |

## 13. Il Giudice: l'anti-furbo a parole (22 ottobre 2026)

**Il problema.** L'anti-furbo era fatto di conti sulla forma del codice: esattamente un
`for`, al massimo una o due righe nel corpo, nessun `print` fuori dal ciclo. Fermava chi
scriveva le righe a mano, ma bocciava anche chi scriveva bene: un allievo con una variabile
d'appoggio nel corpo del ciclo (quattro righe, tutte sensate) si è sentito dire «dentro il
ciclo bastano tre righe», e non era vero.

**La decisione.** Via tutti i vincoli strutturali dal micro-interprete, che da oggi
controlla solo l'output. Ogni esercizio con il codice porta invece una **regola a parole**
(`Esercizio.regola`): «le righe le stampa un ciclo che gira una volta per riga; non valgono
le righe scritte a mano, né un ciclo da un giro solo con un print per riga», «il totale lo
tiene una variabile che accumula, non una formula come quota * i», «i dati arrivano da
input()». Prima di promuovere, il server mostra a **Haiku** la consegna, la regola, il
codice e i **fatti misurati** dall'interprete (quanti for, quanti print dentro e fuori dal
ciclo, quanti accumuli, quante input, quanti giri ha fatto davvero il ciclo) e chiede OK o
NO con un motivo. Con i fatti davanti il giudizio è facile e stabile: «un for, un giro,
otto print dentro» non lascia dubbi.

**Le scelte.** Il prompt dice «in dubbio: OK», perché bocciare un allievo onesto costa più
che far passare un furbo. Se il modello non risponde o scrive una cosa incomprensibile, la
consegna **passa** e resta una riga nei log: un'ora di laboratorio non si ferma per l'API.
Il motivo del NO arriva all'allievo come hint («Il risultato è giusto, ma non è fatto come
chiede la tappa: …»), filtrato come i consigli del gregario: mai codice. Costo: un decimo
di centesimo a consegna promossa. I Giri creati prima di oggi hanno esercizi senza regola
e non passano dal giudice. Nei test il giudice finto boccia solo il codice con il commento
`# furbo`.

## 14. Due attività separate: il Giro e l'Officina (22 ottobre 2026)

**La decisione.** Il Giro è la gara a tappe e basta; i compiti di realtà vivono solo
nell'Officina. La Cronoscalata (§11) nasceva come tappa speciale del Giro per portare il
compito in classe con il gregario; con l'Officina (§12) quel bisogno è coperto meglio, da
soli e senza fretta, e tenere i compiti anche dentro la gara legava le due attività in un
modo che confondeva: stessi progetti in due posti, voto e punti mescolati sulla LIM.

**Che cosa è cambiato nel codice.** Via dal Giro i temi Cronoscalata, il gregario e la
rotta `consiglio`, il voto alla LIM, la regola «fuori dalla generale». Il catalogo dei
compiti è passato da `lib/giro/progetti.ts` a `lib/officina/compiti.ts` (`ELENCO_COMPITI`,
`generaCompito`, `schedaCompito`); il contesto del consiglio a parole sta in
`lib/officina/consiglio.ts`, e il filtro anti-codice, che serve anche al giudice, nel motore
(`lib/giro/filtroCodice.ts`). Il motore (interprete, hint, giudice, editor) resta comune in
`lib/giro/`: è lo stesso Python, con le stesse regole.

**Da qui in avanti.** L'Officina cresce per conto suo: nuovi compiti di realtà che salgono di
difficoltà un gradino alla volta, uno sbloccato alla volta, prima sui cicli `for` e poi sui
`while`. Il Giro resta per le gare in classe sulle tappe tematiche.
