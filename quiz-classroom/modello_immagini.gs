/**
 * Il Giro dei Cicli — tre verifiche parallele più il recupero, con il codice in immagine (VS Code).
 * File generato da quiz-classroom/genera.py: per cambiare le domande modifica domande.py.
 *
 * Prima di eseguire:
 *  1. Carica su Drive la cartella CARTELLA_IMMAGINI (trascinala intera nella pagina di Drive).
 *  2. Nell'editor: a sinistra "Servizi" → + → "Google Forms API" → Aggiungi.
 * Poi esegui creaTuttiIQuizConImmagini, oppure creaVerificaRecuperoConImmagini per creare
 * solo l'ultima (il recupero per gli assenti).
 *
 * Le immagini della cartella vengono condivise come "chiunque abbia il link": Moduli le
 * scarica da lì. Contengono solo il codice delle domande, non le risposte.
 */

const CARTELLA_IMMAGINI = 'giro-quiz-immagini';
const LETTERE = ['A', 'B', 'C', 'D'];

const QUIZ = /*DATI*/;

function creaTuttiIQuizConImmagini() {
  creaQuizConImmagini_(QUIZ);
}

function creaVerificaRecuperoConImmagini() {
  creaQuizConImmagini_([QUIZ[QUIZ.length - 1]]);
}

function creaQuizConImmagini_(lista) {
  const api = formsApi_();
  const immagini = preparaImmagini_();
  let formatoUrl = null;
  lista.forEach(function (quiz) {
    const form = creaModulo_(quiz);
    if (!formatoUrl) formatoUrl = trovaFormatoUrl_(api, form.getId(), immagini);
    const url = function (nome) { return formatoUrl(immagini[nome]); };
    batch_(api, form.getId(), quiz.domande.map(function (d, n) { return creaDomanda_(d, n, url); }));
    Logger.log(quiz.titolo + '\n  modifica: ' + form.getEditUrl() + '\n  allievi:  ' + form.getPublishedUrl());
  });
}

function formsApi_() {
  if (typeof FormsApi !== 'undefined') return FormsApi;
  if (typeof Forms !== 'undefined') return Forms;
  throw new Error('Manca il servizio "Google Forms API": a sinistra Servizi → + → Google Forms API → Aggiungi, poi riesegui.');
}

function batch_(api, formId, requests) {
  const risorsa = api.Forms || api.Form;
  return risorsa.batchUpdate({ requests: requests }, formId);
}

/** Condivide le immagini con il link e restituisce { nomeFile: id }. */
function preparaImmagini_() {
  const cartelle = DriveApp.getFoldersByName(CARTELLA_IMMAGINI);
  if (!cartelle.hasNext()) {
    throw new Error('Non trovo su Drive la cartella "' + CARTELLA_IMMAGINI + '": caricala intera e riesegui.');
  }
  const immagini = {};
  const file = cartelle.next().getFiles();
  while (file.hasNext()) {
    const f = file.next();
    try {
      f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {
      throw new Error('Non posso condividere ' + f.getName() + ' con il link (la scuola lo blocca?): ' + e.message);
    }
    immagini[f.getName()] = f.getId();
  }
  Utilities.sleep(3000);  // la condivisione impiega qualche istante a valere
  return immagini;
}

/** Prova i formati di link di Drive su un'immagine di prova e tiene il primo che Moduli accetta. */
function trovaFormatoUrl_(api, formId, immagini) {
  const formati = [
    function (id) { return 'https://lh3.googleusercontent.com/d/' + id; },
    function (id) { return 'https://drive.google.com/uc?export=view&id=' + id; },
    function (id) { return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w2000'; },
  ];
  const prova = immagini[Object.keys(immagini)[0]];
  const errori = [];
  for (let i = 0; i < formati.length; i++) {
    try {
      batch_(api, formId, [{ createItem: {
        item: { title: 'prova', imageItem: { image: { sourceUri: formati[i](prova) } } },
        location: { index: 0 },
      } }]);
      batch_(api, formId, [{ deleteItem: { location: { index: 0 } } }]);
      return formati[i];
    } catch (e) {
      errori.push(e.message);
    }
  }
  throw new Error('Moduli non riesce a leggere le immagini da Drive:\n' + errori.join('\n'));
}

function creaModulo_(quiz) {
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
  return form;
}

function creaDomanda_(d, n, url) {
  const conImmagini = !!d.opzioniImmagini;
  const valore = function (i) { return conImmagini ? LETTERE[i] : d.opzioni[i]; };
  const question = {
    required: true,
    grading: {
      pointValue: 1,
      correctAnswers: { answers: [{ value: valore(d.corretta) }] },
      whenRight: { text: 'Giusto! ' + d.spiegazione },
      whenWrong: { text: d.spiegazione },
    },
    choiceQuestion: {
      type: 'RADIO',
      options: d.opzioni.map(function (testo, i) {
        if (!conImmagini) return { value: testo };
        return { value: valore(i), image: { sourceUri: url(d.opzioniImmagini[i]), altText: testo } };
      }),
    },
  };
  const questionItem = { question: question };
  if (d.immagine) {
    questionItem.image = {
      sourceUri: url(d.immagine),
      altText: d.codice,
      properties: { alignment: 'LEFT', width: d.larghezza },
    };
  }
  return { createItem: {
    item: { title: (n + 1) + '. ' + d.testo, questionItem: questionItem },
    location: { index: n },
  } };
}
