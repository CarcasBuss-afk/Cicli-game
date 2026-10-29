/**
 * Il Giro dei Cicli — tre verifiche parallele più il recupero, per Google Classroom.
 * File generato da quiz-classroom/genera.py: per cambiare le domande modifica domande.py.
 *
 * Uso: script.google.com → Nuovo progetto → incolla tutto → esegui creaTuttiIQuiz,
 * oppure creaVerificaRecupero per creare solo l'ultima (il recupero per gli assenti).
 * Crea Moduli Google in modalità quiz (15 domande, 1 punto ciascuna, una sola risposta
 * giusta su 4) nella cartella principale di Drive e ne scrive i link nel log.
 */

const QUIZ = /*DATI*/;

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
