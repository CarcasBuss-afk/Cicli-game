/* Il giudice, parte pura: il messaggio porta regola, codice e fatti; il verdetto si legge
 * anche se il modello lo scrive un po' a modo suo; l'hint non contiene mai codice; il
 * giudice finto boccia solo il marcatore dei test. */
import { describe, expect, it } from 'vitest';
import { REGOLE } from './esercizi';
import { giudizioFinto, hintGiudice, interpretaVerdetto, MARCATORE_FURBO, messaggioGiudizio, PROMPT_GIUDICE, type ContestoGiudizio } from './giudice';
import { esegui } from './interprete';

function contesto(codice: string, regola: string = REGOLE.ciclo): ContestoGiudizio {
  const esito = esegui(codice);
  if (!esito.ok) throw new Error(esito.errore.messaggio);
  return {
    consegna: 'Stampa 3 volte la frase: Evviva',
    regola,
    outputAtteso: ['Evviva', 'Evviva', 'Evviva'],
    codice,
    struttura: esito.struttura,
    giri: esito.giri,
  };
}

describe('il messaggio per il giudice', () => {
  it('porta la regola, il codice e i fatti misurati, non la soluzione', () => {
    const m = messaggioGiudizio(contesto('for i in range(1):\n    print("Evviva")\n    print("Evviva")\n    print("Evviva")'));
    expect(m).toContain('REGOLA: ' + REGOLE.ciclo);
    expect(m).toContain('cicli for: 1');
    expect(m).toContain('giri fatti in tutto: 1');
    expect(m).toContain('print dentro i cicli: 3');
    expect(m).toContain('righe di output: 3');
    expect(m).not.toContain('SOLUZIONE');
  });

  it('con le input() dice con quali risposte è stato eseguito', () => {
    const m = messaggioGiudizio({ ...contesto('print("x")'), risposte: ['Luca', '3'] });
    expect(m).toContain('«Luca», «3»');
  });

  it('il prompt chiede OK o NO e vieta il codice nella spiegazione', () => {
    expect(PROMPT_GIUDICE).toContain('OK');
    expect(PROMPT_GIUDICE).toContain('NO');
    expect(PROMPT_GIUDICE).toContain('In dubbio: OK');
  });
});

describe('la lettura del verdetto', () => {
  it('OK in tutte le forme', () => {
    for (const t of ['OK', 'ok', '**OK**', 'OK.\n', 'Ok - va bene così']) {
      expect(interpretaVerdetto(t), t).toEqual({ genuino: true });
    }
  });

  it('NO con il motivo sulla riga dopo o sulla stessa riga', () => {
    expect(interpretaVerdetto('NO\nLe righe sono scritte a mano: usa il ciclo.')).toEqual({
      genuino: false,
      motivo: 'Le righe sono scritte a mano: usa il ciclo.',
    });
    expect(interpretaVerdetto('NO: il ciclo gira una volta sola.')).toEqual({ genuino: false, motivo: 'il ciclo gira una volta sola.' });
    expect(interpretaVerdetto('- NO -\n- manca il ciclo')).toEqual({ genuino: false, motivo: 'manca il ciclo' });
  });

  it('una risposta che non si capisce vale null: il server promuove', () => {
    expect(interpretaVerdetto('')).toBeNull();
    expect(interpretaVerdetto('Il programma è corretto ma...')).toBeNull();
    // "NOTA" non è "NO": il confine di parola conta.
    expect(interpretaVerdetto('NOTA: va bene')).toBeNull();
  });
});

describe("l'hint del giudice", () => {
  it('ripete il motivo, premettendo che il risultato è giusto', () => {
    const h = hintGiudice('le righe sono scritte a mano una per una: deve ripeterle il ciclo');
    expect(h).toContain('Il risultato è giusto');
    expect(h).toContain('deve ripeterle il ciclo');
  });

  it('se il motivo contiene codice, lo sostituisce con una frase generica', () => {
    const h = hintGiudice('scrivi `for i in range(3):` e dentro `print("Evviva")`');
    expect(h).not.toContain('range(3)');
    expect(h).toContain('rileggi la consegna');
  });

  it('motivo vuoto: frase generica', () => {
    expect(hintGiudice('   ')).toContain('rileggi la consegna');
  });
});

describe('il giudice finto', () => {
  it('promuove tutto tranne il marcatore dei test', () => {
    expect(giudizioFinto(contesto('for i in range(3):\n    print("Evviva")'))).toEqual({ genuino: true });
    const furbo = giudizioFinto(contesto(`for i in range(3):\n    print("Evviva")\n${MARCATORE_FURBO}`));
    expect(furbo.genuino).toBe(false);
  });
});

describe('i fatti sui while e sul caso', () => {
  it('conta i while, se la condizione cambia nel corpo, e i randint della prova', () => {
    const codice = 'import random\nn = random.randint(1, 6)\nlanci = 1\nwhile n != 6:\n    n = random.randint(1, 6)\n    lanci += 1\nprint(lanci)';
    const esito = esegui(codice, { casuali: [2, 6] });
    if (!esito.ok) throw new Error(esito.errore.messaggio);
    const m = messaggioGiudizio({ ...contesto('print("Evviva")'), codice, struttura: esito.struttura, giri: esito.giri, casuali: [2, 6] });
    expect(m).toContain('cicli while: 1 (di cui con una variabile della condizione che cambia nel corpo: 1)');
    expect(m).toContain('random.randint(): 2 (di cui dentro un ciclo: 1)');
    expect(m).toContain('randint() ha dato in questa prova, nell\'ordine: 2, 6');
    expect(PROMPT_GIUDICE).toContain('while');
  });
});
