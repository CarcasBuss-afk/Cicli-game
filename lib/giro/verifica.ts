/* La verifica completa di una consegna, come la fanno i server del Giro e dell'Officina:
 * prima il micro-interprete (output giusto?), poi, solo se promossa e la tappa ha una
 * regola, il giudice (fatto come chiede la tappa?). È qui perché il giudice è lento e
 * può fallire: si chiama **fuori** dalle transazioni Firestore. */
import 'server-only';
import { opzioniDiProva, type Esercizio } from './esercizi';
import { giudizioDa, hintGiudice } from './giudice';
import { giudica } from './giudiceClient';
import { valutaRisposta, type Valutazione } from './hint';
import { esegui } from './interprete';

export async function verificaConsegna(esercizio: Esercizio, codice: string): Promise<Valutazione> {
  const valutazione = valutaRisposta(esercizio, codice);
  if (!valutazione.promosso || !esercizio.regola) return valutazione;

  const prova = esercizio.prove?.[0];
  const esito = esegui(codice, opzioniDiProva(prova));
  if (!esito.ok) return valutazione; // già promosso: non succede, ma non si blocca nessuno

  const verdetto = await giudica({
    consegna: esercizio.consegna,
    regola: esercizio.regola,
    outputAtteso: esercizio.outputAtteso,
    codice,
    struttura: esito.struttura,
    giri: esito.giri,
    risposte: prova?.risposte,
    casuali: prova?.casuali,
  });
  const giudizio = giudizioDa(verdetto);
  if (verdetto.genuino) return { ...valutazione, giudizio };
  return { ...valutazione, promosso: false, hint: hintGiudice(verdetto.motivo, codice), giudizio };
}
