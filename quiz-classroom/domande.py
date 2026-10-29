"""Le domande delle verifiche: tre parallele più il recupero. Le controlla e le trasforma in script `genera.py`.

Le verifiche sono parallele: la domanda N tocca lo stesso argomento, con la stessa
difficoltà, in tutte (la quarta è il recupero per gli assenti). Ognuna copre l'intero percorso del Giro:
  1-2 ripetere · 3-5 contare con range · 6-7 il passo · 8-9 leggere il codice
  10 f-string · 11 la scala · 12 caccia all'errore · 13-14 accumulatore · 15 parole

Tipi di controllo:
  output  -> la risposta corretta è l'output del codice (righe separate da " | ")
  righe   -> la risposta corretta è il numero di righe stampate
  codice  -> le opzioni sono codice: solo quella corretta stampa `atteso`
  None    -> domanda di teoria, controllata a mano
"""

SEP = " | "
VUOTA = "(riga vuota)"


def q(testo, opzioni, corretta, spiegazione, codice=None, check=None, atteso=None):
    return dict(testo=testo, codice=codice, opzioni=opzioni, corretta=corretta,
                spiegazione=spiegazione, check=check, atteso=atteso)


DESCRIZIONE = ("Tutto il percorso del Giro dei Cicli: ripetere, range, il passo, leggere il codice, "
               "f-string, la scala, caccia all'errore, accumulatore, cicli su una parola.")

VERIFICA_1 = [
    # 1-2 ripetere
    q("Quante volte viene stampato «Evviva»?",
      ["6", "7", "8", "1"], 1,
      "range(7) fa girare il ciclo 7 volte: da 0 a 6.",
      codice='for i in range(7):\n    print("Evviva")', check="righe"),
    q("Quale codice stampa 5 volte «Ciao»?",
      ['for i in range(1, 5): print("Ciao")', 'for i in range(5) print("Ciao")',
       'for i in range(5): print("Ciao")', 'for i in range(6): print("Ciao")'], 2,
      "range(5) gira 5 volte. range(1, 5) solo 4, e senza i due punti è un errore.",
      check="codice", atteso=SEP.join(["Ciao"] * 5)),
    # 3-5 contare con range
    q("Che cosa stampa questo codice?",
      ["1 | 2 | 3 | 4 | 5", "0 | 1 | 2 | 3 | 4 | 5", "1 | 2 | 3 | 4", "0 | 1 | 2 | 3 | 4"], 3,
      "range(5) parte da 0 e si ferma prima di 5.",
      codice="for i in range(5):\n    print(i)", check="output"),
    q("Che cosa stampa questo codice?",
      ["3 | 4 | 5 | 6 | 7", "3 | 4 | 5 | 6 | 7 | 8", "4 | 5 | 6 | 7 | 8", "3 | 8"], 0,
      "range(3, 8) parte da 3 e si ferma prima di 8.",
      codice="for i in range(3, 8):\n    print(i)", check="output"),
    q("Quale ciclo stampa  2 | 3 | 4 | 5 | 6 ?",
      ["for i in range(2, 6): print(i)", "for i in range(6): print(i)",
       "for i in range(1, 7): print(i)", "for i in range(2, 7): print(i)"], 3,
      "Si parte da 2 e il secondo numero è uno in più dell'ultimo: 7.",
      check="codice", atteso=SEP.join(["2", "3", "4", "5", "6"])),
    # 6-7 il passo
    q("Che cosa stampa questo codice?",
      ["0 | 2 | 4 | 6 | 8 | 10", "2 | 4 | 6 | 8 | 10", "0 | 2 | 4 | 6 | 8", "0 | 1 | 2 | 3 | 4"], 2,
      "Il terzo numero è il passo: si va avanti di 2, fermandosi prima di 10.",
      codice="for i in range(0, 10, 2):\n    print(i)", check="output"),
    q("Quale ciclo fa il conto alla rovescia  5 | 4 | 3 | 2 | 1 ?",
      ["for i in range(5, 0): print(i)", "for i in range(5, 0, -1): print(i)",
       "for i in range(5, 1, -1): print(i)", "for i in range(1, 6, -1): print(i)"], 1,
      "Per tornare indietro serve il passo negativo -1, e ci si ferma prima di 0.",
      check="codice", atteso=SEP.join(["5", "4", "3", "2", "1"])),
    # 8-9 leggere il codice
    q("Quante righe stampa questo codice?",
      ["4", "5", "8", "3"], 0,
      "Escono 2, 4, 6, 8: quattro righe.",
      codice="for i in range(2, 9, 2):\n    print(i)", check="righe"),
    q("Che cosa stampa questo codice?",
      ["1 | 2 | 3", "10 | 20 | 30 | 40", "10 | 20 | 30", "0 | 10 | 20"], 2,
      "i vale 1, 2, 3 e ogni volta si stampa i per 10.",
      codice="for i in range(1, 4):\n    print(i * 10)", check="output"),
    # 10 f-string
    q("Che cosa stampa questo codice?",
      ["1° giro | 2° giro | 3° giro", "{i}° giro | {i}° giro | {i}° giro",
       "1 ° giro | 2 ° giro | 3 ° giro", "0° giro | 1° giro | 2° giro"], 0,
      "Nella f-string {i} viene sostituito dal valore di i, attaccato al testo.",
      codice='for i in range(1, 4):\n    print(f"{i}° giro")', check="output"),
    # 11 la scala
    q("Che cosa stampa questo codice?",
      ["* | ** | *** | ****", "**** | **** | **** | ****", "* | ** | ***", "**** | *** | ** | *"], 0,
      "i vale 1, 2, 3, 4: ogni riga ha i asterischi, quindi la scala sale.",
      codice='for i in range(1, 5):\n    print("*" * i)', check="output"),
    # 12 caccia all'errore
    q("Doveva stampare i numeri da 1 a 5, ma stampa da 0 a 4. Come si corregge range?",
      ["range(1, 5)", "range(0, 5)", "range(1, 6)", "range(6)"], 2,
      "Si parte da 1 e il traguardo è uno oltre il 5.",
      codice="for i in range(5):\n    print(i)"),
    # 13-14 accumulatore
    q("Che cosa stampa questo codice?",
      ["1 | 2 | 3 | 4", "1 | 3 | 6 | 10", "10", "0 | 1 | 3 | 6"], 1,
      "print sta dentro il ciclo: si vede la somma che cresce, 1, 1+2, 1+2+3, 1+2+3+4.",
      codice="totale = 0\nfor i in range(1, 5):\n    totale += i\n    print(totale)", check="output"),
    q("Che cosa stampa questo codice?",
      ["10", "6", "9", "7"], 3,
      "Il ciclo gira per i da 3 a 9: sette giri, e conta aumenta di 1 a ogni giro.",
      codice="conta = 0\nfor i in range(3, 10):\n    conta += 1\nprint(conta)", check="output"),
    # 15 cicli su una parola
    q("Che cosa stampa questo codice?",
      ["bici", "b | i | c | i", "0 | 1 | 2 | 3", "b | i | c"], 1,
      "Il for su una parola dà una lettera a ogni giro.",
      codice='for lettera in "bici":\n    print(lettera)', check="output"),
]

VERIFICA_2 = [
    # 1-2 ripetere
    q("Quante volte viene stampato «Forza!»?",
      ["3", "5", "4", "0"], 2,
      "range(4) fa girare il ciclo 4 volte: da 0 a 3.",
      codice='for i in range(4):\n    print("Forza!")', check="righe"),
    q("Quale codice stampa 3 volte «Via!»?",
      ['for i in range(3): print("Via!")', 'for i in range(3): print(Via!)',
       'for i in range(2): print("Via!")', 'for i in range 3: print("Via!")'], 0,
      "Il testo va tra virgolette e range vuole le parentesi; range(2) girerebbe solo 2 volte.",
      check="codice", atteso=SEP.join(["Via!"] * 3)),
    # 3-5 contare con range
    q("Che cosa stampa questo codice?",
      ["1 | 2 | 3 | 4", "0 | 1 | 2 | 3", "0 | 1 | 2 | 3 | 4", "4"], 1,
      "range(4) parte da 0 e si ferma prima di 4.",
      codice="for n in range(4):\n    print(n)", check="output"),
    q("Che cosa stampa questo codice?",
      ["5 | 6 | 7 | 8 | 9", "6 | 7 | 8 | 9", "5 | 9", "5 | 6 | 7 | 8"], 3,
      "range(5, 9) parte da 5 e si ferma prima di 9.",
      codice="for i in range(5, 9):\n    print(i)", check="output"),
    q("Quale ciclo stampa  4 | 5 | 6 | 7 ?",
      ["for i in range(4, 7): print(i)", "for i in range(4, 8): print(i)",
       "for i in range(8): print(i)", "for i in range(3, 8): print(i)"], 1,
      "Si parte da 4 e il secondo numero è uno in più dell'ultimo: 8.",
      check="codice", atteso=SEP.join(["4", "5", "6", "7"])),
    # 6-7 il passo
    q("Che cosa stampa questo codice?",
      ["1 | 4 | 7", "1 | 4 | 7 | 10", "1 | 3 | 5 | 7 | 9", "3 | 6 | 9"], 0,
      "Si parte da 1 e si va avanti di 3: 1, 4, 7. Il 10 non c'è perché il traguardo è 10.",
      codice="for i in range(1, 10, 3):\n    print(i)", check="output"),
    q("Quale ciclo fa il conto alla rovescia  4 | 3 | 2 | 1 | 0 ?",
      ["for i in range(4, 0, -1): print(i)", "for i in range(4, -1, -1): print(i)",
       "for i in range(4, 0): print(i)", "for i in range(0, 5, -1): print(i)"], 1,
      "Per arrivare fino a 0 scendendo, il traguardo deve essere -1.",
      check="codice", atteso=SEP.join(["4", "3", "2", "1", "0"])),
    # 8-9 leggere il codice
    q("Quante righe stampa questo codice?",
      ["3", "10", "4", "5"], 2,
      "Escono 10, 7, 4, 1: quattro righe (il prossimo sarebbe -2, oltre il traguardo).",
      codice="for i in range(10, 0, -3):\n    print(i)", check="righe"),
    q("Che cosa stampa questo codice?",
      ["0 | 1 | 2", "1 | 2 | 3", "1 | 1 | 1", "0 | 1 | 2 | 3"], 1,
      "i vale 0, 1, 2 ma si stampa i + 1.",
      codice="for i in range(3):\n    print(i + 1)", check="output"),
    # 10 f-string
    q("Quale print scrive esattamente  Km 3/7  quando i vale 3?",
      ['print("Km {i}/7")', 'print("Km", i, "/7")', 'print(f"Km i/7")', 'print(f"Km {i}/7")'], 3,
      "Serve la f davanti e la variabile tra graffe. Con le virgole Python mette uno spazio prima di /7.",
      check="codice", atteso="Km 3/7"),
    # 11 la scala
    q("Quale codice disegna un rettangolo di 3 righe da 5 asterischi?",
      ['for i in range(3): print("*" * i)', 'for i in range(5): print("*" * 3)',
       'for i in range(1, 4): print("*" * i)', 'for i in range(3): print("*" * 5)'], 3,
      "3 giri, e ogni riga ha sempre 5 asterischi: la variabile non serve.",
      check="codice", atteso=SEP.join(["*****"] * 3)),
    # 12 caccia all'errore
    q("Doveva stampare 5 volte «Ciao», ma dà errore. Qual è lo sbaglio?",
      ["Mancano le parentesi di range", "Mancano le virgolette", "range(5) gira solo 4 volte",
       "print non è rientrato: non sta dentro il ciclo"], 3,
      "Il corpo del ciclo va spostato a destra di 4 spazi.",
      codice='for i in range(5):\nprint("Ciao")'),
    # 13-14 accumulatore
    q("Che cosa stampa questo codice?",
      ["15", "1 | 3 | 6 | 10 | 15", "5", "10"], 0,
      "print sta fuori dal ciclo: si stampa una volta sola, alla fine, 1+2+3+4+5.",
      codice="totale = 0\nfor i in range(1, 6):\n    totale += i\nprint(totale)", check="output"),
    q("Doveva stampare 6 (cioè 1 + 2 + 3), ma stampa 3. Perché?",
      ["Il range è sbagliato", "Bisognava scrivere totale = i",
       "totale = 0 sta dentro il ciclo e azzera la somma a ogni giro", "print va dentro il ciclo"], 2,
      "totale = 0 va scritto una volta sola, prima del for.",
      codice="for i in range(1, 4):\n    totale = 0\n    totale += i\nprint(totale)"),
    # 15 cicli su una parola
    q("Che cosa stampa questo codice?",
      ["5", "ruota", "4", "1"], 0,
      "Il ciclo gira una volta per lettera, e «ruota» ne ha 5.",
      codice='conta = 0\nfor lettera in "ruota":\n    conta += 1\nprint(conta)', check="output"),
]

VERIFICA_3 = [
    # 1-2 ripetere
    q("Quante volte viene stampato «Pedala»?",
      ["5", "6", "4", "1"], 0,
      "range(1, 6) dà 1, 2, 3, 4, 5: cinque giri.",
      codice='for i in range(1, 6):\n    print("Pedala")', check="righe"),
    q("Quale riga stampa  C'è il sole ?",
      ["print('C'è il sole')", "print(C'è il sole)", "print 'C'è il sole'", 'print("C\'è il sole")'], 3,
      "L'apostrofo chiuderebbe le virgolette singole: servono le doppie.",
      check="codice", atteso="C'è il sole"),
    # 3-5 contare con range
    q("Che cosa stampa questo codice?",
      ["1 | 2 | 3 | 4 | 5 | 6", "0 | 1 | 2 | 3 | 4 | 5 | 6", "0 | 1 | 2 | 3 | 4 | 5", "1 | 2 | 3 | 4 | 5"], 2,
      "range(6) parte da 0 e si ferma prima di 6.",
      codice="for i in range(6):\n    print(i)", check="output"),
    q("Che cosa stampa questo codice?",
      ["2 | 3 | 4 | 5", "2 | 3 | 4 | 5 | 6", "3 | 4 | 5 | 6", "2 | 6"], 0,
      "range(2, 6) parte da 2 e si ferma prima di 6.",
      codice="for i in range(2, 6):\n    print(i)", check="output"),
    q("Quale ciclo stampa  1 | 2 | 3 | 4 | 5 | 6 ?",
      ["for i in range(6): print(i)", "for i in range(1, 6): print(i)",
       "for i in range(1, 7): print(i)", "for i in range(0, 7): print(i)"], 2,
      "Si parte da 1 e il secondo numero è uno in più dell'ultimo: 7.",
      check="codice", atteso=SEP.join(["1", "2", "3", "4", "5", "6"])),
    # 6-7 il passo
    q("Che cosa stampa questo codice?",
      ["5 | 10 | 15", "5 | 10 | 15 | 20", "0 | 5 | 10 | 15 | 20", "5 | 10 | 15 | 20 | 25"], 1,
      "Si parte da 5 e si va avanti di 5; il 20 c'è perché il traguardo è 21.",
      codice="for i in range(5, 21, 5):\n    print(i)", check="output"),
    q("Che cosa stampa questo codice?",
      ["10 | 8 | 6 | 4 | 2 | 0", "8 | 6 | 4 | 2", "10 | 8 | 6 | 4 | 2", "2 | 4 | 6 | 8 | 10"], 2,
      "Si parte da 10 e si scende di 2, fermandosi prima di 0.",
      codice="for i in range(10, 0, -2):\n    print(i)", check="output"),
    # 8-9 leggere il codice
    q("Quante righe stampa questo codice?",
      ["4", "5", "6", "20"], 1,
      "Escono 1, 5, 9, 13, 17: cinque righe.",
      codice="for i in range(1, 20, 4):\n    print(i)", check="righe"),
    q("Che cosa stampa questo codice?",
      ["1 | 2 | 3", "2 | 4 | 6", "1 | 4 | 9 | 16", "1 | 4 | 9"], 3,
      "i vale 1, 2, 3 e ogni volta si stampa i per i.",
      codice="for i in range(1, 4):\n    print(i * i)", check="output"),
    # 10 f-string
    q("Che cosa stampa questo codice?",
      ["7 x 0 = 0 | 7 x 1 = 7 | 7 x 2 = 14", "7 x i = 7 * i | 7 x i = 7 * i | 7 x i = 7 * i",
       "7 x 1 = 7 | 7 x 2 = 14 | 7 x 3 = 21", "7 x 1 = 7 | 7 x 2 = 14 | 7 x 3 = 21 | 7 x 4 = 28"], 2,
      "Dentro le graffe si può fare un calcolo: {7 * i} diventa il risultato.",
      codice='for i in range(1, 4):\n    print(f"7 x {i} = {7 * i}")', check="output"),
    # 11 la scala
    q("Quale codice disegna la scala che scende  **** | *** | ** | * ?",
      ['for i in range(4, 0, -1): print("*" * i)', 'for i in range(4, 0): print("*" * i)',
       'for i in range(4, 1, -1): print("*" * i)', 'for i in range(1, 5): print("*" * i)'], 0,
      "Per la scala che scende i deve andare da 4 a 1: passo -1, traguardo 0.",
      check="codice", atteso=SEP.join(["****", "***", "**", "*"])),
    # 12 caccia all'errore
    q("Doveva fare il conto alla rovescia 3, 2, 1, ma non stampa niente. Come si corregge?",
      ["range(3, 1, -1)", "range(1, 4)", "range(3, 0, 1)", "range(3, 0, -1)"], 3,
      "Senza passo negativo range va solo in avanti, e da 3 non arriva mai a 0.",
      codice="for i in range(3, 0):\n    print(i)"),
    # 13-14 accumulatore
    q("Che cosa stampa questo codice?",
      ["8", "20", "30", "4"], 1,
      "Si sommano i pari 2 + 4 + 6 + 8.",
      codice="totale = 0\nfor i in range(2, 9, 2):\n    totale += i\nprint(totale)", check="output"),
    q("Che cosa fa l'istruzione  totale += i ?",
      ["Aggiunge il valore di i a totale, come totale = totale + i",
       "Mette in totale il valore di i, cancellando quello di prima",
       "Confronta totale con i", "Aggiunge 1 a totale"], 0,
      "+= aggiunge al valore che c'era: è il cuore dell'accumulatore."),
    # 15 cicli su una parola
    q("Che cosa stampa questo codice?",
      ["ciao | ciao", "cc | ii | aa | oo", "c | i | a | o", "ciaociao"], 1,
      "A ogni giro la lettera viene ripetuta due volte.",
      codice='for lettera in "ciao":\n    print(lettera * 2)', check="output"),
]

# La quarta verifica è il recupero per chi era assente: stesse 15 domande per argomento e
# difficoltà delle prime tre, ma con numeri, parole e sbagli diversi.
VERIFICA_RECUPERO = [
    # 1-2 ripetere
    q("Quante volte viene stampato «Avanti»?",
      ["7", "5", "6", "0"], 2,
      "range(6) fa girare il ciclo 6 volte: da 0 a 5.",
      codice='for i in range(6):\n    print("Avanti")', check="righe"),
    q("Quale codice stampa 4 volte «Dai!»?",
      ['for i in range(5): print("Dai!")', 'for i in range(4): print("Dai!")',
       'for i in range(1, 4): print("Dai!")', 'for i in range(4) print("Dai!")'], 1,
      "range(4) gira 4 volte. range(1, 4) solo 3, range(5) cinque, e senza i due punti è un errore.",
      check="codice", atteso=SEP.join(["Dai!"] * 4)),
    # 3-5 contare con range
    q("Che cosa stampa questo codice?",
      ["0 | 1 | 2 | 3 | 4 | 5 | 6 | 7", "1 | 2 | 3 | 4 | 5 | 6 | 7",
       "1 | 2 | 3 | 4 | 5 | 6", "0 | 1 | 2 | 3 | 4 | 5 | 6"], 3,
      "range(7) parte da 0 e si ferma prima di 7.",
      codice="for i in range(7):\n    print(i)", check="output"),
    q("Che cosa stampa questo codice?",
      ["4 | 5 | 6 | 7 | 8 | 9", "5 | 6 | 7 | 8 | 9", "4 | 5 | 6 | 7 | 8", "4 | 9"], 2,
      "range(4, 9) parte da 4 e si ferma prima di 9.",
      codice="for i in range(4, 9):\n    print(i)", check="output"),
    q("Quale ciclo stampa  3 | 4 | 5 | 6 | 7 ?",
      ["for i in range(3, 8): print(i)", "for i in range(3, 7): print(i)",
       "for i in range(7): print(i)", "for i in range(2, 8): print(i)"], 0,
      "Si parte da 3 e il secondo numero è uno in più dell'ultimo: 8.",
      check="codice", atteso=SEP.join(["3", "4", "5", "6", "7"])),
    # 6-7 il passo
    q("Che cosa stampa questo codice?",
      ["2 | 6 | 10", "2 | 6 | 10 | 14", "2 | 4 | 6 | 8 | 10", "4 | 8 | 12"], 0,
      "Si parte da 2 e si va avanti di 4: 2, 6, 10. Il 14 non c'è perché il traguardo è 11.",
      codice="for i in range(2, 11, 4):\n    print(i)", check="output"),
    q("Quale ciclo fa il conto alla rovescia  6 | 5 | 4 | 3 | 2 | 1 ?",
      ["for i in range(6, 1, -1): print(i)", "for i in range(1, 7, -1): print(i)",
       "for i in range(6, 0): print(i)", "for i in range(6, 0, -1): print(i)"], 3,
      "Per tornare indietro serve il passo negativo -1, e ci si ferma prima di 0: con 1 l'1 non uscirebbe.",
      check="codice", atteso=SEP.join(["6", "5", "4", "3", "2", "1"])),
    # 8-9 leggere il codice
    q("Quante righe stampa questo codice?",
      ["5", "3", "4", "16"], 2,
      "Escono 3, 7, 11, 15: quattro righe (il prossimo sarebbe 19, oltre il traguardo).",
      codice="for i in range(3, 16, 4):\n    print(i)", check="righe"),
    q("Che cosa stampa questo codice?",
      ["1 | 2 | 3", "10 | 11 | 12", "11 | 12 | 13 | 14", "11 | 12 | 13"], 3,
      "i vale 1, 2, 3 e ogni volta si stampa i più 10.",
      codice="for i in range(1, 4):\n    print(i + 10)", check="output"),
    # 10 f-string
    q("Che cosa stampa questo codice?",
      ["Tappa {i} di 3 | Tappa {i} di 3 | Tappa {i} di 3", "Tappa 1 di 3 | Tappa 2 di 3 | Tappa 3 di 3",
       "Tappa 0 di 3 | Tappa 1 di 3 | Tappa 2 di 3", "Tappa 1 di 3 | Tappa 2 di 3"], 1,
      "Nella f-string {i} viene sostituito dal valore di i: 1, 2, 3.",
      codice='for i in range(1, 4):\n    print(f"Tappa {i} di 3")', check="output"),
    # 11 la scala
    q("Quale codice disegna la scala che sale  * | ** | *** | **** | ***** ?",
      ['for i in range(5): print("*" * i)', 'for i in range(1, 6): print("*" * 5)',
       'for i in range(1, 6): print("*" * i)', 'for i in range(1, 5): print("*" * i)'], 2,
      "i deve valere 1, 2, 3, 4, 5: range(1, 6). Con range(5) la prima riga sarebbe vuota, con * 5 le righe sono tutte uguali.",
      check="codice", atteso=SEP.join(["*", "**", "***", "****", "*****"])),
    # 12 caccia all'errore
    q("Doveva stampare 0, 1, 2, ma stampa tre volte la lettera i. Perché?",
      ["Il range è sbagliato", 'Tra virgolette "i" è un testo, non la variabile: va scritto print(i)',
       "print va fuori dal ciclo", "Manca la f davanti alle virgolette"], 1,
      "Quello che sta tra virgolette si stampa così com'è; la variabile si scrive senza virgolette.",
      codice='for i in range(3):\n    print("i")'),
    # 13-14 accumulatore
    q("Che cosa stampa questo codice?",
      ["1 | 2 | 3", "6", "0 | 1 | 3", "1 | 3 | 6"], 3,
      "print sta dentro il ciclo: si vede la somma che cresce, 1, 1+2, 1+2+3.",
      codice="totale = 0\nfor i in range(1, 4):\n    totale += i\n    print(totale)", check="output"),
    q("Doveva stampare 10 (cioè 1 + 2 + 3 + 4), ma stampa 4. Perché?",
      ["totale = i sostituisce il valore invece di aggiungerlo: serve totale += i",
       "Il range è sbagliato", "print va dentro il ciclo", "totale = 0 va dentro il ciclo"], 0,
      "Con = totale tiene solo l'ultimo valore di i; con += si aggiunge a quello che c'era.",
      codice="totale = 0\nfor i in range(1, 5):\n    totale = i\nprint(totale)"),
    # 15 cicli su una parola
    q("Che cosa stampa questo codice?",
      ["s | e | l | l | a", "sella", "s | e | l | a", "5"], 0,
      "Il for su una parola dà una lettera a ogni giro, anche quando una lettera è doppia.",
      codice='for lettera in "sella":\n    print(lettera)', check="output"),
]

QUIZ = [
    {"titolo": f"Il Giro dei Cicli — Verifica {n}", "descrizione": DESCRIZIONE, "domande": d}
    for n, d in enumerate([VERIFICA_1, VERIFICA_2, VERIFICA_3], 1)
] + [{"titolo": "Il Giro dei Cicli — Verifica di recupero", "descrizione": DESCRIZIONE,
      "domande": VERIFICA_RECUPERO}]
