"""Il codice delle domande disegnato come in VS Code (tema Dark+), in PNG."""

import pathlib
import re

from PIL import Image, ImageDraw, ImageFont

FONT = pathlib.Path("C:/Windows/Fonts/consola.ttf")
DIM = 30            # px del carattere: l'immagine esce al doppio e Moduli la rimpicciolisce
PAD = 26
GUTTER = 64         # spazio per i numeri di riga
BARRA = 50          # la barra delle schede in alto

SFONDO = "#1E1E1E"
SFONDO_BARRA = "#252526"
NUMERI = "#6E7681"
COLORI = {
    "keyword": "#C586C0",   # for, in
    "funzione": "#DCDCAA",  # print, range
    "stringa": "#CE9178",
    "fprefix": "#569CD6",   # la f delle f-string e le graffe
    "numero": "#B5CEA8",
    "nome": "#9CDCFE",
    "testo": "#D4D4D4",
}

TOKEN = re.compile(r"""
    (?P<fstringa>f"[^"\n]*"?)
  | (?P<stringa>"[^"\n]*"?|'[^'\n]*'?)
  | (?P<numero>\d+)
  | (?P<parola>[A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ_0-9]*)
  | (?P<spazio>[ \t]+)
  | (?P<altro>.)
""", re.VERBOSE)


def _parola(p):
    if p in ("for", "in", "if", "else", "while"):
        return "keyword"
    if p in ("print", "range", "len"):
        return "funzione"
    return "nome"


def colora(riga):
    """[(testo, colore)] per una riga di codice."""
    pezzi = []
    for m in TOKEN.finditer(riga):
        tipo, testo = m.lastgroup, m.group()
        if tipo == "fstringa":
            pezzi.append(("f", COLORI["fprefix"]))
            # dentro la f-string: testo arancione, {espressione} colorata come codice
            for parte in re.split(r"(\{[^}]*\})", testo[1:]):
                if parte.startswith("{") and parte.endswith("}"):
                    pezzi.append(("{", COLORI["fprefix"]))
                    pezzi.extend(colora(parte[1:-1]))
                    pezzi.append(("}", COLORI["fprefix"]))
                elif parte:
                    pezzi.append((parte, COLORI["stringa"]))
        elif tipo == "stringa":
            pezzi.append((testo, COLORI["stringa"]))
        elif tipo == "numero":
            pezzi.append((testo, COLORI["numero"]))
        elif tipo == "parola":
            pezzi.append((testo, COLORI[_parola(testo)]))
        else:
            pezzi.append((testo, COLORI["testo"]))
    return pezzi


def disegna(codice, percorso, nome_file="giro.py"):
    """Scrive il PNG e restituisce la larghezza in px."""
    font = ImageFont.truetype(str(FONT), DIM)
    font_barra = ImageFont.truetype(str(FONT), int(DIM * 0.75))
    righe = codice.split("\n")
    car = font.getlength("M")
    alto_riga = int(DIM * 1.5)
    larghezza = int(GUTTER + PAD + max(len(r) for r in righe) * car + PAD * 2)
    larghezza = max(larghezza, 360)
    altezza = BARRA + PAD + alto_riga * len(righe) + PAD

    img = Image.new("RGB", (larghezza, altezza), SFONDO)
    d = ImageDraw.Draw(img)
    # barra delle schede con la scheda del file aperto
    d.rectangle([0, 0, larghezza, BARRA], fill=SFONDO_BARRA)
    larghezza_scheda = int(font_barra.getlength(nome_file) + 70)
    d.rectangle([0, 0, larghezza_scheda, BARRA], fill=SFONDO)
    d.rectangle([0, 0, larghezza_scheda, 2], fill="#0078D4")
    d.text((18, BARRA / 2), "●", font=font_barra, fill="#3B8EEA", anchor="lm")
    d.text((44, BARRA / 2), nome_file, font=font_barra, fill="#FFFFFF", anchor="lm")

    for n, riga in enumerate(righe):
        y = BARRA + PAD + n * alto_riga + alto_riga / 2
        d.text((GUTTER - 14, y), str(n + 1), font=font, fill=NUMERI, anchor="rm")
        x = GUTTER + PAD
        for testo, colore in colora(riga):
            d.text((x, y), testo, font=font, fill=colore, anchor="lm")
            x += font.getlength(testo)
    img.save(percorso, optimize=True)
    return larghezza


def a_capo(opzione):
    """`for i in range(5): print("Ciao")` scritto su due righe, come lo si scrive davvero."""
    if not opzione.startswith("for ") or " print" not in opzione:
        return opzione
    i = opzione.index(" print")
    return opzione[:i].rstrip() + "\n    " + opzione[i + 1:]
