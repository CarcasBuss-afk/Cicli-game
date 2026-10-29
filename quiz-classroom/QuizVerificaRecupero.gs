/**
 * Il Giro dei Cicli — Verifica di recupero, per Google Classroom (solo testo, senza immagini).
 * File generato da quiz-classroom/genera.py: per cambiare le domande modifica domande.py.
 *
 * Uso: script.google.com → Nuovo progetto → incolla tutto → esegui creaVerificaRecupero.
 * Crea un Modulo Google in modalità quiz (15 domande, 1 punto ciascuna, una sola risposta
 * giusta su 4) nella cartella principale di Drive e ne scrive i link nel log.
 * Il codice di ogni domanda sta nel testo sotto la domanda.
 */

const QUIZ = {
  "titolo": "Il Giro dei Cicli — Verifica di recupero",
  "descrizione": "Tutto il percorso del Giro dei Cicli: ripetere, range, il passo, leggere il codice, f-string, la scala, caccia all'errore, accumulatore, cicli su una parola.",
  "domande": [
    {
      "testo": "Quante volte viene stampato «Avanti»?",
      "codice": "for i in range(6):\n    print(\"Avanti\")",
      "opzioni": [
        "7",
        "5",
        "6",
        "0"
      ],
      "corretta": 2,
      "spiegazione": "range(6) fa girare il ciclo 6 volte: da 0 a 5."
    },
    {
      "testo": "Quale codice stampa 4 volte «Dai!»?",
      "codice": null,
      "opzioni": [
        "for i in range(5): print(\"Dai!\")",
        "for i in range(4): print(\"Dai!\")",
        "for i in range(1, 4): print(\"Dai!\")",
        "for i in range(4) print(\"Dai!\")"
      ],
      "corretta": 1,
      "spiegazione": "range(4) gira 4 volte. range(1, 4) solo 3, range(5) cinque, e senza i due punti è un errore."
    },
    {
      "testo": "Che cosa stampa questo codice?",
      "codice": "for i in range(7):\n    print(i)",
      "opzioni": [
        "0 | 1 | 2 | 3 | 4 | 5 | 6 | 7",
        "1 | 2 | 3 | 4 | 5 | 6 | 7",
        "1 | 2 | 3 | 4 | 5 | 6",
        "0 | 1 | 2 | 3 | 4 | 5 | 6"
      ],
      "corretta": 3,
      "spiegazione": "range(7) parte da 0 e si ferma prima di 7."
    },
    {
      "testo": "Che cosa stampa questo codice?",
      "codice": "for i in range(4, 9):\n    print(i)",
      "opzioni": [
        "4 | 5 | 6 | 7 | 8 | 9",
        "5 | 6 | 7 | 8 | 9",
        "4 | 5 | 6 | 7 | 8",
        "4 | 9"
      ],
      "corretta": 2,
      "spiegazione": "range(4, 9) parte da 4 e si ferma prima di 9."
    },
    {
      "testo": "Quale ciclo stampa  3 | 4 | 5 | 6 | 7 ?",
      "codice": null,
      "opzioni": [
        "for i in range(3, 8): print(i)",
        "for i in range(3, 7): print(i)",
        "for i in range(7): print(i)",
        "for i in range(2, 8): print(i)"
      ],
      "corretta": 0,
      "spiegazione": "Si parte da 3 e il secondo numero è uno in più dell'ultimo: 8."
    },
    {
      "testo": "Che cosa stampa questo codice?",
      "codice": "for i in range(2, 11, 4):\n    print(i)",
      "opzioni": [
        "2 | 6 | 10",
        "2 | 6 | 10 | 14",
        "2 | 4 | 6 | 8 | 10",
        "4 | 8 | 12"
      ],
      "corretta": 0,
      "spiegazione": "Si parte da 2 e si va avanti di 4: 2, 6, 10. Il 14 non c'è perché il traguardo è 11."
    },
    {
      "testo": "Quale ciclo fa il conto alla rovescia  6 | 5 | 4 | 3 | 2 | 1 ?",
      "codice": null,
      "opzioni": [
        "for i in range(6, 1, -1): print(i)",
        "for i in range(1, 7, -1): print(i)",
        "for i in range(6, 0): print(i)",
        "for i in range(6, 0, -1): print(i)"
      ],
      "corretta": 3,
      "spiegazione": "Per tornare indietro serve il passo negativo -1, e ci si ferma prima di 0: con 1 l'1 non uscirebbe."
    },
    {
      "testo": "Quante righe stampa questo codice?",
      "codice": "for i in range(3, 16, 4):\n    print(i)",
      "opzioni": [
        "5",
        "3",
        "4",
        "16"
      ],
      "corretta": 2,
      "spiegazione": "Escono 3, 7, 11, 15: quattro righe (il prossimo sarebbe 19, oltre il traguardo)."
    },
    {
      "testo": "Che cosa stampa questo codice?",
      "codice": "for i in range(1, 4):\n    print(i + 10)",
      "opzioni": [
        "1 | 2 | 3",
        "10 | 11 | 12",
        "11 | 12 | 13 | 14",
        "11 | 12 | 13"
      ],
      "corretta": 3,
      "spiegazione": "i vale 1, 2, 3 e ogni volta si stampa i più 10."
    },
    {
      "testo": "Che cosa stampa questo codice?",
      "codice": "for i in range(1, 4):\n    print(f\"Tappa {i} di 3\")",
      "opzioni": [
        "Tappa {i} di 3 | Tappa {i} di 3 | Tappa {i} di 3",
        "Tappa 1 di 3 | Tappa 2 di 3 | Tappa 3 di 3",
        "Tappa 0 di 3 | Tappa 1 di 3 | Tappa 2 di 3",
        "Tappa 1 di 3 | Tappa 2 di 3"
      ],
      "corretta": 1,
      "spiegazione": "Nella f-string {i} viene sostituito dal valore di i: 1, 2, 3."
    },
    {
      "testo": "Quale codice disegna la scala che sale  * | ** | *** | **** | ***** ?",
      "codice": null,
      "opzioni": [
        "for i in range(5): print(\"*\" * i)",
        "for i in range(1, 6): print(\"*\" * 5)",
        "for i in range(1, 6): print(\"*\" * i)",
        "for i in range(1, 5): print(\"*\" * i)"
      ],
      "corretta": 2,
      "spiegazione": "i deve valere 1, 2, 3, 4, 5: range(1, 6). Con range(5) la prima riga sarebbe vuota, con * 5 le righe sono tutte uguali."
    },
    {
      "testo": "Doveva stampare 0, 1, 2, ma stampa tre volte la lettera i. Perché?",
      "codice": "for i in range(3):\n    print(\"i\")",
      "opzioni": [
        "Il range è sbagliato",
        "Tra virgolette \"i\" è un testo, non la variabile: va scritto print(i)",
        "print va fuori dal ciclo",
        "Manca la f davanti alle virgolette"
      ],
      "corretta": 1,
      "spiegazione": "Quello che sta tra virgolette si stampa così com'è; la variabile si scrive senza virgolette."
    },
    {
      "testo": "Che cosa stampa questo codice?",
      "codice": "totale = 0\nfor i in range(1, 4):\n    totale += i\n    print(totale)",
      "opzioni": [
        "1 | 2 | 3",
        "6",
        "0 | 1 | 3",
        "1 | 3 | 6"
      ],
      "corretta": 3,
      "spiegazione": "print sta dentro il ciclo: si vede la somma che cresce, 1, 1+2, 1+2+3."
    },
    {
      "testo": "Doveva stampare 10 (cioè 1 + 2 + 3 + 4), ma stampa 4. Perché?",
      "codice": "totale = 0\nfor i in range(1, 5):\n    totale = i\nprint(totale)",
      "opzioni": [
        "totale = i sostituisce il valore invece di aggiungerlo: serve totale += i",
        "Il range è sbagliato",
        "print va dentro il ciclo",
        "totale = 0 va dentro il ciclo"
      ],
      "corretta": 0,
      "spiegazione": "Con = totale tiene solo l'ultimo valore di i; con += si aggiunge a quello che c'era."
    },
    {
      "testo": "Che cosa stampa questo codice?",
      "codice": "for lettera in \"sella\":\n    print(lettera)",
      "opzioni": [
        "s | e | l | l | a",
        "sella",
        "s | e | l | a",
        "5"
      ],
      "corretta": 0,
      "spiegazione": "Il for su una parola dà una lettera a ogni giro, anche quando una lettera è doppia."
    }
  ]
};

function creaVerificaRecupero() {
  const form = FormApp.create(QUIZ.titolo);
  form.setIsQuiz(true)
    .setDescription(QUIZ.descrizione + '\n\nNelle risposte il simbolo | separa le righe stampate: ' +
      '"0 | 1 | 2" vuol dire 0, 1 e 2 su tre righe diverse.')
    .setShuffleQuestions(true)
    .setProgressBar(true)
    .setLimitOneResponsePerUser(true)
    .setShowLinkToRespondAgain(false);
  try {
    form.setEmailCollectionType(FormApp.EmailCollectionType.VERIFIED);
  } catch (e) {
    form.setCollectEmail(true);
  }

  QUIZ.domande.forEach(function (d, n) {
    const item = form.addMultipleChoiceItem();
    item.setTitle((n + 1) + '. ' + d.testo)
      .setRequired(true)
      .setPoints(1)
      .setChoices(d.opzioni.map(function (testo, i) {
        return item.createChoice(testo, i === d.corretta);
      }))
      .setFeedbackForCorrect(FormApp.createFeedback().setText('Giusto! ' + d.spiegazione).build())
      .setFeedbackForIncorrect(FormApp.createFeedback().setText(d.spiegazione).build());
    if (d.codice) item.setHelpText(d.codice);
  });
  Logger.log(QUIZ.titolo + '\n  modifica: ' + form.getEditUrl() + '\n  allievi:  ' + form.getPublishedUrl());
}
