/**
 * Il Giro dei Cicli — tre verifiche parallele più il recupero, per Google Classroom.
 * File generato da quiz-classroom/genera.py: per cambiare le domande modifica domande.py.
 *
 * Uso: script.google.com → Nuovo progetto → incolla tutto → esegui creaTuttiIQuiz,
 * oppure creaVerificaRecupero per creare solo l'ultima (il recupero per gli assenti).
 * Crea Moduli Google in modalità quiz (15 domande, 1 punto ciascuna, una sola risposta
 * giusta su 4) nella cartella principale di Drive e ne scrive i link nel log.
 */

const QUIZ = [
  {
    "titolo": "Il Giro dei Cicli — Verifica 1",
    "descrizione": "Tutto il percorso del Giro dei Cicli: ripetere, range, il passo, leggere il codice, f-string, la scala, caccia all'errore, accumulatore, cicli su una parola.",
    "domande": [
      {
        "testo": "Quante volte viene stampato «Evviva»?",
        "codice": "for i in range(7):\n    print(\"Evviva\")",
        "opzioni": [
          "6",
          "7",
          "8",
          "1"
        ],
        "corretta": 1,
        "spiegazione": "range(7) fa girare il ciclo 7 volte: da 0 a 6."
      },
      {
        "testo": "Quale codice stampa 5 volte «Ciao»?",
        "codice": null,
        "opzioni": [
          "for i in range(1, 5): print(\"Ciao\")",
          "for i in range(5) print(\"Ciao\")",
          "for i in range(5): print(\"Ciao\")",
          "for i in range(6): print(\"Ciao\")"
        ],
        "corretta": 2,
        "spiegazione": "range(5) gira 5 volte. range(1, 5) solo 4, e senza i due punti è un errore."
      },
      {
        "testo": "Che cosa stampa questo codice?",
        "codice": "for i in range(5):\n    print(i)",
        "opzioni": [
          "1 | 2 | 3 | 4 | 5",
          "0 | 1 | 2 | 3 | 4 | 5",
          "1 | 2 | 3 | 4",
          "0 | 1 | 2 | 3 | 4"
        ],
        "corretta": 3,
        "spiegazione": "range(5) parte da 0 e si ferma prima di 5."
      },
      {
        "testo": "Che cosa stampa questo codice?",
        "codice": "for i in range(3, 8):\n    print(i)",
        "opzioni": [
          "3 | 4 | 5 | 6 | 7",
          "3 | 4 | 5 | 6 | 7 | 8",
          "4 | 5 | 6 | 7 | 8",
          "3 | 8"
        ],
        "corretta": 0,
        "spiegazione": "range(3, 8) parte da 3 e si ferma prima di 8."
      },
      {
        "testo": "Quale ciclo stampa  2 | 3 | 4 | 5 | 6 ?",
        "codice": null,
        "opzioni": [
          "for i in range(2, 6): print(i)",
          "for i in range(6): print(i)",
          "for i in range(1, 7): print(i)",
          "for i in range(2, 7): print(i)"
        ],
        "corretta": 3,
        "spiegazione": "Si parte da 2 e il secondo numero è uno in più dell'ultimo: 7."
      },
      {
        "testo": "Che cosa stampa questo codice?",
        "codice": "for i in range(0, 10, 2):\n    print(i)",
        "opzioni": [
          "0 | 2 | 4 | 6 | 8 | 10",
          "2 | 4 | 6 | 8 | 10",
          "0 | 2 | 4 | 6 | 8",
          "0 | 1 | 2 | 3 | 4"
        ],
        "corretta": 2,
        "spiegazione": "Il terzo numero è il passo: si va avanti di 2, fermandosi prima di 10."
      },
      {
        "testo": "Quale ciclo fa il conto alla rovescia  5 | 4 | 3 | 2 | 1 ?",
        "codice": null,
        "opzioni": [
          "for i in range(5, 0): print(i)",
          "for i in range(5, 0, -1): print(i)",
          "for i in range(5, 1, -1): print(i)",
          "for i in range(1, 6, -1): print(i)"
        ],
        "corretta": 1,
        "spiegazione": "Per tornare indietro serve il passo negativo -1, e ci si ferma prima di 0."
      },
      {
        "testo": "Quante righe stampa questo codice?",
        "codice": "for i in range(2, 9, 2):\n    print(i)",
        "opzioni": [
          "4",
          "5",
          "8",
          "3"
        ],
        "corretta": 0,
        "spiegazione": "Escono 2, 4, 6, 8: quattro righe."
      },
      {
        "testo": "Che cosa stampa questo codice?",
        "codice": "for i in range(1, 4):\n    print(i * 10)",
        "opzioni": [
          "1 | 2 | 3",
          "10 | 20 | 30 | 40",
          "10 | 20 | 30",
          "0 | 10 | 20"
        ],
        "corretta": 2,
        "spiegazione": "i vale 1, 2, 3 e ogni volta si stampa i per 10."
      },
      {
        "testo": "Che cosa stampa questo codice?",
        "codice": "for i in range(1, 4):\n    print(f\"{i}° giro\")",
        "opzioni": [
          "1° giro | 2° giro | 3° giro",
          "{i}° giro | {i}° giro | {i}° giro",
          "1 ° giro | 2 ° giro | 3 ° giro",
          "0° giro | 1° giro | 2° giro"
        ],
        "corretta": 0,
        "spiegazione": "Nella f-string {i} viene sostituito dal valore di i, attaccato al testo."
      },
      {
        "testo": "Che cosa stampa questo codice?",
        "codice": "for i in range(1, 5):\n    print(\"*\" * i)",
        "opzioni": [
          "* | ** | *** | ****",
          "**** | **** | **** | ****",
          "* | ** | ***",
          "**** | *** | ** | *"
        ],
        "corretta": 0,
        "spiegazione": "i vale 1, 2, 3, 4: ogni riga ha i asterischi, quindi la scala sale."
      },
      {
        "testo": "Doveva stampare i numeri da 1 a 5, ma stampa da 0 a 4. Come si corregge range?",
        "codice": "for i in range(5):\n    print(i)",
        "opzioni": [
          "range(1, 5)",
          "range(0, 5)",
          "range(1, 6)",
          "range(6)"
        ],
        "corretta": 2,
        "spiegazione": "Si parte da 1 e il traguardo è uno oltre il 5."
      },
      {
        "testo": "Che cosa stampa questo codice?",
        "codice": "totale = 0\nfor i in range(1, 5):\n    totale += i\n    print(totale)",
        "opzioni": [
          "1 | 2 | 3 | 4",
          "1 | 3 | 6 | 10",
          "10",
          "0 | 1 | 3 | 6"
        ],
        "corretta": 1,
        "spiegazione": "print sta dentro il ciclo: si vede la somma che cresce, 1, 1+2, 1+2+3, 1+2+3+4."
      },
      {
        "testo": "Che cosa stampa questo codice?",
        "codice": "conta = 0\nfor i in range(3, 10):\n    conta += 1\nprint(conta)",
        "opzioni": [
          "10",
          "6",
          "9",
          "7"
        ],
        "corretta": 3,
        "spiegazione": "Il ciclo gira per i da 3 a 9: sette giri, e conta aumenta di 1 a ogni giro."
      },
      {
        "testo": "Che cosa stampa questo codice?",
        "codice": "for lettera in \"bici\":\n    print(lettera)",
        "opzioni": [
          "bici",
          "b | i | c | i",
          "0 | 1 | 2 | 3",
          "b | i | c"
        ],
        "corretta": 1,
        "spiegazione": "Il for su una parola dà una lettera a ogni giro."
      }
    ]
  },
  {
    "titolo": "Il Giro dei Cicli — Verifica 2",
    "descrizione": "Tutto il percorso del Giro dei Cicli: ripetere, range, il passo, leggere il codice, f-string, la scala, caccia all'errore, accumulatore, cicli su una parola.",
    "domande": [
      {
        "testo": "Quante volte viene stampato «Forza!»?",
        "codice": "for i in range(4):\n    print(\"Forza!\")",
        "opzioni": [
          "3",
          "5",
          "4",
          "0"
        ],
        "corretta": 2,
        "spiegazione": "range(4) fa girare il ciclo 4 volte: da 0 a 3."
      },
      {
        "testo": "Quale codice stampa 3 volte «Via!»?",
        "codice": null,
        "opzioni": [
          "for i in range(3): print(\"Via!\")",
          "for i in range(3): print(Via!)",
          "for i in range(2): print(\"Via!\")",
          "for i in range 3: print(\"Via!\")"
        ],
        "corretta": 0,
        "spiegazione": "Il testo va tra virgolette e range vuole le parentesi; range(2) girerebbe solo 2 volte."
      },
      {
        "testo": "Che cosa stampa questo codice?",
        "codice": "for n in range(4):\n    print(n)",
        "opzioni": [
          "1 | 2 | 3 | 4",
          "0 | 1 | 2 | 3",
          "0 | 1 | 2 | 3 | 4",
          "4"
        ],
        "corretta": 1,
        "spiegazione": "range(4) parte da 0 e si ferma prima di 4."
      },
      {
        "testo": "Che cosa stampa questo codice?",
        "codice": "for i in range(5, 9):\n    print(i)",
        "opzioni": [
          "5 | 6 | 7 | 8 | 9",
          "6 | 7 | 8 | 9",
          "5 | 9",
          "5 | 6 | 7 | 8"
        ],
        "corretta": 3,
        "spiegazione": "range(5, 9) parte da 5 e si ferma prima di 9."
      },
      {
        "testo": "Quale ciclo stampa  4 | 5 | 6 | 7 ?",
        "codice": null,
        "opzioni": [
          "for i in range(4, 7): print(i)",
          "for i in range(4, 8): print(i)",
          "for i in range(8): print(i)",
          "for i in range(3, 8): print(i)"
        ],
        "corretta": 1,
        "spiegazione": "Si parte da 4 e il secondo numero è uno in più dell'ultimo: 8."
      },
      {
        "testo": "Che cosa stampa questo codice?",
        "codice": "for i in range(1, 10, 3):\n    print(i)",
        "opzioni": [
          "1 | 4 | 7",
          "1 | 4 | 7 | 10",
          "1 | 3 | 5 | 7 | 9",
          "3 | 6 | 9"
        ],
        "corretta": 0,
        "spiegazione": "Si parte da 1 e si va avanti di 3: 1, 4, 7. Il 10 non c'è perché il traguardo è 10."
      },
      {
        "testo": "Quale ciclo fa il conto alla rovescia  4 | 3 | 2 | 1 | 0 ?",
        "codice": null,
        "opzioni": [
          "for i in range(4, 0, -1): print(i)",
          "for i in range(4, -1, -1): print(i)",
          "for i in range(4, 0): print(i)",
          "for i in range(0, 5, -1): print(i)"
        ],
        "corretta": 1,
        "spiegazione": "Per arrivare fino a 0 scendendo, il traguardo deve essere -1."
      },
      {
        "testo": "Quante righe stampa questo codice?",
        "codice": "for i in range(10, 0, -3):\n    print(i)",
        "opzioni": [
          "3",
          "10",
          "4",
          "5"
        ],
        "corretta": 2,
        "spiegazione": "Escono 10, 7, 4, 1: quattro righe (il prossimo sarebbe -2, oltre il traguardo)."
      },
      {
        "testo": "Che cosa stampa questo codice?",
        "codice": "for i in range(3):\n    print(i + 1)",
        "opzioni": [
          "0 | 1 | 2",
          "1 | 2 | 3",
          "1 | 1 | 1",
          "0 | 1 | 2 | 3"
        ],
        "corretta": 1,
        "spiegazione": "i vale 0, 1, 2 ma si stampa i + 1."
      },
      {
        "testo": "Quale print scrive esattamente  Km 3/7  quando i vale 3?",
        "codice": null,
        "opzioni": [
          "print(\"Km {i}/7\")",
          "print(\"Km\", i, \"/7\")",
          "print(f\"Km i/7\")",
          "print(f\"Km {i}/7\")"
        ],
        "corretta": 3,
        "spiegazione": "Serve la f davanti e la variabile tra graffe. Con le virgole Python mette uno spazio prima di /7."
      },
      {
        "testo": "Quale codice disegna un rettangolo di 3 righe da 5 asterischi?",
        "codice": null,
        "opzioni": [
          "for i in range(3): print(\"*\" * i)",
          "for i in range(5): print(\"*\" * 3)",
          "for i in range(1, 4): print(\"*\" * i)",
          "for i in range(3): print(\"*\" * 5)"
        ],
        "corretta": 3,
        "spiegazione": "3 giri, e ogni riga ha sempre 5 asterischi: la variabile non serve."
      },
      {
        "testo": "Doveva stampare 5 volte «Ciao», ma dà errore. Qual è lo sbaglio?",
        "codice": "for i in range(5):\nprint(\"Ciao\")",
        "opzioni": [
          "Mancano le parentesi di range",
          "Mancano le virgolette",
          "range(5) gira solo 4 volte",
          "print non è rientrato: non sta dentro il ciclo"
        ],
        "corretta": 3,
        "spiegazione": "Il corpo del ciclo va spostato a destra di 4 spazi."
      },
      {
        "testo": "Che cosa stampa questo codice?",
        "codice": "totale = 0\nfor i in range(1, 6):\n    totale += i\nprint(totale)",
        "opzioni": [
          "15",
          "1 | 3 | 6 | 10 | 15",
          "5",
          "10"
        ],
        "corretta": 0,
        "spiegazione": "print sta fuori dal ciclo: si stampa una volta sola, alla fine, 1+2+3+4+5."
      },
      {
        "testo": "Doveva stampare 6 (cioè 1 + 2 + 3), ma stampa 3. Perché?",
        "codice": "for i in range(1, 4):\n    totale = 0\n    totale += i\nprint(totale)",
        "opzioni": [
          "Il range è sbagliato",
          "Bisognava scrivere totale = i",
          "totale = 0 sta dentro il ciclo e azzera la somma a ogni giro",
          "print va dentro il ciclo"
        ],
        "corretta": 2,
        "spiegazione": "totale = 0 va scritto una volta sola, prima del for."
      },
      {
        "testo": "Che cosa stampa questo codice?",
        "codice": "conta = 0\nfor lettera in \"ruota\":\n    conta += 1\nprint(conta)",
        "opzioni": [
          "5",
          "ruota",
          "4",
          "1"
        ],
        "corretta": 0,
        "spiegazione": "Il ciclo gira una volta per lettera, e «ruota» ne ha 5."
      }
    ]
  },
  {
    "titolo": "Il Giro dei Cicli — Verifica 3",
    "descrizione": "Tutto il percorso del Giro dei Cicli: ripetere, range, il passo, leggere il codice, f-string, la scala, caccia all'errore, accumulatore, cicli su una parola.",
    "domande": [
      {
        "testo": "Quante volte viene stampato «Pedala»?",
        "codice": "for i in range(1, 6):\n    print(\"Pedala\")",
        "opzioni": [
          "5",
          "6",
          "4",
          "1"
        ],
        "corretta": 0,
        "spiegazione": "range(1, 6) dà 1, 2, 3, 4, 5: cinque giri."
      },
      {
        "testo": "Quale riga stampa  C'è il sole ?",
        "codice": null,
        "opzioni": [
          "print('C'è il sole')",
          "print(C'è il sole)",
          "print 'C'è il sole'",
          "print(\"C'è il sole\")"
        ],
        "corretta": 3,
        "spiegazione": "L'apostrofo chiuderebbe le virgolette singole: servono le doppie."
      },
      {
        "testo": "Che cosa stampa questo codice?",
        "codice": "for i in range(6):\n    print(i)",
        "opzioni": [
          "1 | 2 | 3 | 4 | 5 | 6",
          "0 | 1 | 2 | 3 | 4 | 5 | 6",
          "0 | 1 | 2 | 3 | 4 | 5",
          "1 | 2 | 3 | 4 | 5"
        ],
        "corretta": 2,
        "spiegazione": "range(6) parte da 0 e si ferma prima di 6."
      },
      {
        "testo": "Che cosa stampa questo codice?",
        "codice": "for i in range(2, 6):\n    print(i)",
        "opzioni": [
          "2 | 3 | 4 | 5",
          "2 | 3 | 4 | 5 | 6",
          "3 | 4 | 5 | 6",
          "2 | 6"
        ],
        "corretta": 0,
        "spiegazione": "range(2, 6) parte da 2 e si ferma prima di 6."
      },
      {
        "testo": "Quale ciclo stampa  1 | 2 | 3 | 4 | 5 | 6 ?",
        "codice": null,
        "opzioni": [
          "for i in range(6): print(i)",
          "for i in range(1, 6): print(i)",
          "for i in range(1, 7): print(i)",
          "for i in range(0, 7): print(i)"
        ],
        "corretta": 2,
        "spiegazione": "Si parte da 1 e il secondo numero è uno in più dell'ultimo: 7."
      },
      {
        "testo": "Che cosa stampa questo codice?",
        "codice": "for i in range(5, 21, 5):\n    print(i)",
        "opzioni": [
          "5 | 10 | 15",
          "5 | 10 | 15 | 20",
          "0 | 5 | 10 | 15 | 20",
          "5 | 10 | 15 | 20 | 25"
        ],
        "corretta": 1,
        "spiegazione": "Si parte da 5 e si va avanti di 5; il 20 c'è perché il traguardo è 21."
      },
      {
        "testo": "Che cosa stampa questo codice?",
        "codice": "for i in range(10, 0, -2):\n    print(i)",
        "opzioni": [
          "10 | 8 | 6 | 4 | 2 | 0",
          "8 | 6 | 4 | 2",
          "10 | 8 | 6 | 4 | 2",
          "2 | 4 | 6 | 8 | 10"
        ],
        "corretta": 2,
        "spiegazione": "Si parte da 10 e si scende di 2, fermandosi prima di 0."
      },
      {
        "testo": "Quante righe stampa questo codice?",
        "codice": "for i in range(1, 20, 4):\n    print(i)",
        "opzioni": [
          "4",
          "5",
          "6",
          "20"
        ],
        "corretta": 1,
        "spiegazione": "Escono 1, 5, 9, 13, 17: cinque righe."
      },
      {
        "testo": "Che cosa stampa questo codice?",
        "codice": "for i in range(1, 4):\n    print(i * i)",
        "opzioni": [
          "1 | 2 | 3",
          "2 | 4 | 6",
          "1 | 4 | 9 | 16",
          "1 | 4 | 9"
        ],
        "corretta": 3,
        "spiegazione": "i vale 1, 2, 3 e ogni volta si stampa i per i."
      },
      {
        "testo": "Che cosa stampa questo codice?",
        "codice": "for i in range(1, 4):\n    print(f\"7 x {i} = {7 * i}\")",
        "opzioni": [
          "7 x 0 = 0 | 7 x 1 = 7 | 7 x 2 = 14",
          "7 x i = 7 * i | 7 x i = 7 * i | 7 x i = 7 * i",
          "7 x 1 = 7 | 7 x 2 = 14 | 7 x 3 = 21",
          "7 x 1 = 7 | 7 x 2 = 14 | 7 x 3 = 21 | 7 x 4 = 28"
        ],
        "corretta": 2,
        "spiegazione": "Dentro le graffe si può fare un calcolo: {7 * i} diventa il risultato."
      },
      {
        "testo": "Quale codice disegna la scala che scende  **** | *** | ** | * ?",
        "codice": null,
        "opzioni": [
          "for i in range(4, 0, -1): print(\"*\" * i)",
          "for i in range(4, 0): print(\"*\" * i)",
          "for i in range(4, 1, -1): print(\"*\" * i)",
          "for i in range(1, 5): print(\"*\" * i)"
        ],
        "corretta": 0,
        "spiegazione": "Per la scala che scende i deve andare da 4 a 1: passo -1, traguardo 0."
      },
      {
        "testo": "Doveva fare il conto alla rovescia 3, 2, 1, ma non stampa niente. Come si corregge?",
        "codice": "for i in range(3, 0):\n    print(i)",
        "opzioni": [
          "range(3, 1, -1)",
          "range(1, 4)",
          "range(3, 0, 1)",
          "range(3, 0, -1)"
        ],
        "corretta": 3,
        "spiegazione": "Senza passo negativo range va solo in avanti, e da 3 non arriva mai a 0."
      },
      {
        "testo": "Che cosa stampa questo codice?",
        "codice": "totale = 0\nfor i in range(2, 9, 2):\n    totale += i\nprint(totale)",
        "opzioni": [
          "8",
          "20",
          "30",
          "4"
        ],
        "corretta": 1,
        "spiegazione": "Si sommano i pari 2 + 4 + 6 + 8."
      },
      {
        "testo": "Che cosa fa l'istruzione  totale += i ?",
        "codice": null,
        "opzioni": [
          "Aggiunge il valore di i a totale, come totale = totale + i",
          "Mette in totale il valore di i, cancellando quello di prima",
          "Confronta totale con i",
          "Aggiunge 1 a totale"
        ],
        "corretta": 0,
        "spiegazione": "+= aggiunge al valore che c'era: è il cuore dell'accumulatore."
      },
      {
        "testo": "Che cosa stampa questo codice?",
        "codice": "for lettera in \"ciao\":\n    print(lettera * 2)",
        "opzioni": [
          "ciao | ciao",
          "cc | ii | aa | oo",
          "c | i | a | o",
          "ciaociao"
        ],
        "corretta": 1,
        "spiegazione": "A ogni giro la lettera viene ripetuta due volte."
      }
    ]
  },
  {
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
  }
];

function creaTuttiIQuiz() {
  QUIZ.forEach(function (quiz) {
    const form = creaQuiz(quiz);
    Logger.log(quiz.titolo + '\n  modifica: ' + form.getEditUrl() + '\n  allievi:  ' + form.getPublishedUrl());
  });
}

function creaVerificaRecupero() {
  const quiz = QUIZ[QUIZ.length - 1];
  const form = creaQuiz(quiz);
  Logger.log(quiz.titolo + '\n  modifica: ' + form.getEditUrl() + '\n  allievi:  ' + form.getPublishedUrl());
}

function creaQuiz(quiz) {
  const form = FormApp.create(quiz.titolo);
  form.setIsQuiz(true)
    .setDescription(quiz.descrizione + '\n\nNelle risposte il simbolo | separa le righe stampate: ' +
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

  quiz.domande.forEach(function (d, n) {
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
  return form;
}
