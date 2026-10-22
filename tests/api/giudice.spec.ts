/* Il giudice sulla strada della consegna nel Giro: l'output giusto non basta, il codice
 * deve essere fatto come chiede la tappa. Con GREGARIO_FINTO il giudice finto boccia
 * solo il codice con il marcatore `# furbo`: qui si prova la strada, non il modello. */
import { expect, test, type APIRequestContext } from '@playwright/test';

type Esercizio = { tipo: string; risposta: 'codice' | 'output'; soluzione: string };
type Allievo = { playerId: string; token: string };

async function chiama(request: APIRequestContext, rotta: string, dati: unknown) {
  const risposta = await request.post(`/api/giro/${rotta}`, { data: dati });
  return { stato: risposta.status(), corpo: await risposta.json() };
}

test.describe('il giudice nel Giro', () => {
  test("l'output giusto fatto a mano non passa, lo stesso codice onesto sì", async ({ request }) => {
    const { corpo: gara } = await chiama(request, 'test-setup', { azione: 'crea', classLabel: '2A', km: 6, apri: true });
    const esercizi = gara.esercizi as Esercizio[];
    const { corpo: luca } = await chiama(request, 'join', { code: gara.code, name: 'Luca' });
    const p = luca as Allievo;

    let giudicato = false;
    for (let k = 0; k < esercizi.length; k++) {
      const base = { playerId: p.playerId, token: p.token, tappa: 0, km: k };
      if (!giudicato && esercizi[k].risposta === 'codice') {
        // Stesso codice giusto, con il marcatore che il giudice finto boccia: output giusto, consegna bocciata, errore contato.
        const furbo = await chiama(request, 'submit', { ...base, risposta: `${esercizi[k].soluzione}\n# furbo` });
        expect(furbo.stato).toBe(200);
        expect(furbo.corpo.promosso).toBe(false);
        expect(furbo.corpo.hint).toContain('Il risultato è giusto');
        expect(furbo.corpo.erroriTotali).toBe(1);
        giudicato = true;
      }
      const onesto = await chiama(request, 'submit', { ...base, risposta: esercizi[k].soluzione });
      expect(onesto.corpo.promosso, `km ${k}: ${JSON.stringify(onesto.corpo)}`).toBe(true);
    }
    expect(giudicato, 'almeno un chilometro con il codice').toBe(true);
  });
});
