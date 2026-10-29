"""Tre verifiche su Classroom per il Giro dei Cicli: controllo e generazione dello script.

    python quiz-classroom/genera.py

Le domande stanno in `domande.py`. Questo file esegue con Python vero il codice di ogni
domanda, controlla che la risposta segnata come corretta sia davvero l'unica giusta, e scrive
`QuizGiroDeiCicli.gs`, lo script Apps Script che crea i tre Moduli Google in modalità quiz.
"""

import contextlib
import io
import json
import pathlib

import immagini
from domande import QUIZ, SEP, VUOTA


def esegui(codice):
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf):
            exec(compile(codice, "<domanda>", "exec"), {})
    except Exception:
        return None
    return buf.getvalue().split("\n")[:-1]


def formatta(righe):
    return SEP.join(r if r else VUOTA for r in righe)


def verifica():
    errori = []
    for nq, quiz in enumerate(QUIZ, 1):
        assert len(quiz["domande"]) == 15, f"quiz {nq}: {len(quiz['domande'])} domande"
        posizioni = [d["corretta"] for d in quiz["domande"]]
        for nd, d in enumerate(quiz["domande"], 1):
            dove = f"quiz {nq} domanda {nd}"
            op = d["opzioni"]
            if len(op) != 4 or len(set(op)) != 4:
                errori.append(f"{dove}: servono 4 opzioni diverse")
            giusta = op[d["corretta"]]
            if d["check"] == "output":
                out = formatta(esegui(d["codice"]))
                if out != giusta:
                    errori.append(f"{dove}: l'output è «{out}», segnata «{giusta}»")
            elif d["check"] == "righe":
                n = len(esegui(d["codice"]))
                if str(n) != giusta or [o for o in op if o == str(n)] != [giusta]:
                    errori.append(f"{dove}: le righe sono {n}, segnata {giusta}")
            elif d["check"] == "codice":
                buone = [o for o in op if (r := esegui(f"i = 3\n{o}")) is not None and formatta(r) == d["atteso"]]
                if buone != [giusta]:
                    errori.append(f"{dove}: producono l'atteso {buone}, segnata «{giusta}»")
        print(f"quiz {nq}: posizioni della risposta giusta {[chr(65 + p) for p in posizioni]}")
    return errori


QUI = pathlib.Path(__file__).parent
CARTELLA_IMMAGINI = QUI / "giro-quiz-immagini"


def scrivi_gs(modello, dati, uscita):
    corpo = (QUI / modello).read_text(encoding="utf-8").replace(
        "/*DATI*/", json.dumps(dati, ensure_ascii=False, indent=2))
    (QUI / uscita).write_text(corpo, encoding="utf-8")


def genera_gs():
    dati = [{"titolo": qz["titolo"], "descrizione": qz["descrizione"],
             "domande": [{k: d[k] for k in ("testo", "codice", "opzioni", "corretta", "spiegazione")}
                         for d in qz["domande"]]} for qz in QUIZ]
    scrivi_gs("modello.gs", dati, "QuizGiroDeiCicli.gs")


def genera_gs_immagini():
    """Il codice delle domande e le opzioni fatte di codice diventano PNG stile VS Code."""
    CARTELLA_IMMAGINI.mkdir(exist_ok=True)
    for vecchia in CARTELLA_IMMAGINI.glob("*.png"):
        vecchia.unlink()
    dati = []
    for nq, qz in enumerate(QUIZ, 1):
        domande = []
        for nd, d in enumerate(qz["domande"], 1):
            voce = {k: d[k] for k in ("testo", "codice", "opzioni", "corretta", "spiegazione")}
            base = f"v{nq}-d{nd:02d}"
            if d["codice"]:
                voce["immagine"] = f"{base}.png"
                larghezza = immagini.disegna(d["codice"], CARTELLA_IMMAGINI / voce["immagine"])
                voce["larghezza"] = min(740, larghezza // 2 + 40)
            if d["check"] == "codice":
                voce["opzioniImmagini"] = []
                for lettera, opzione in zip("ABCD", d["opzioni"]):
                    nome = f"{base}-{lettera}.png"
                    immagini.disegna(immagini.a_capo(opzione), CARTELLA_IMMAGINI / nome)
                    voce["opzioniImmagini"].append(nome)
            domande.append(voce)
        dati.append({"titolo": qz["titolo"] + " (codice in immagine)",
                     "descrizione": qz["descrizione"], "domande": domande})
    scrivi_gs("modello_immagini.gs", dati, "QuizGiroDeiCicliImmagini.gs")
    return len(list(CARTELLA_IMMAGINI.glob("*.png")))


if __name__ == "__main__":
    errori = verifica()
    if errori:
        print("\n".join(errori))
        raise SystemExit(1)
    genera_gs()
    n = genera_gs_immagini()
    print(f"tutto giusto: scritti QuizGiroDeiCicli.gs, QuizGiroDeiCicliImmagini.gs e {n} immagini")
