/**
 * Il Giro dei Cicli — Verifica di recupero, per Google Classroom (solo testo, senza immagini).
 * File generato da quiz-classroom/genera.py: per cambiare le domande modifica domande.py.
 *
 * Uso: script.google.com → Nuovo progetto → incolla tutto → esegui creaVerificaRecupero.
 * Crea un Modulo Google in modalità quiz (15 domande, 1 punto ciascuna, una sola risposta
 * giusta su 4) nella cartella principale di Drive e ne scrive i link nel log.
 * Il codice di ogni domanda sta nel testo sotto la domanda.
 */

const QUIZ = /*DATI*/;

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
