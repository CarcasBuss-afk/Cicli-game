/* Gli sfondi delle feste: il docente li carica, li accende e li spegne; compaiono nelle pagine
 * senza esercizio (l'ingresso, l'attesa del via) e spariscono quando parte il chilometro.
 * Un test solo, in sequenza: gli sfondi sono di tutto il sito e gli altri test girano intanto
 * (uno sfondo acceso non cambia niente di quello che controllano). */
import { expect, test, type APIRequestContext } from '@playwright/test';
import { AUTH_EMULATOR_HOST } from './ambiente';

/** Un PNG vero di 1×1 pixel: il browser lo carica, il server lo riconosce dai byte. */
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function tokenDocente(request: APIRequestContext): Promise<string> {
  const r = await request.post('/api/docente/test-login');
  const { token: custom } = (await r.json()) as { token: string };
  const s = await request.post(`http://${AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=finta`, {
    data: { token: custom, returnSecureToken: true },
  });
  const { idToken } = (await s.json()) as { idToken: string };
  await request.post('/api/docente/accesso', { headers: { Authorization: `Bearer ${idToken}` } });
  return idToken;
}

async function setup(request: APIRequestContext, dati: Record<string, unknown>) {
  return (await (await request.post('/api/giro/test-setup', { data: dati })).json()) as { sessionId: string; code: string };
}

const accesi = async (request: APIRequestContext) => ((await (await request.get('/api/sfondi')).json()) as { accesi: string[] }).accesi;

test('gli sfondi delle feste: il docente li accende, compaiono solo dove non c’è un esercizio', async ({ page, request }) => {
  // Senza accesso da docente non si tocca niente.
  expect((await request.post('/api/docente/sfondi', { data: { azione: 'elenco' } })).status()).toBe(401);

  const token = await tokenDocente(request);
  const sfondi = (dati: Record<string, unknown>) => request.post('/api/docente/sfondi', { data: dati, headers: { Authorization: `Bearer ${token}` } });

  // Un file che non è un'immagine (qui un SVG, che potrebbe contenere script) è rifiutato dai byte.
  const svg = await sfondi({ azione: 'carica', nome: 'finto', immagine: `data:image/png;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>').toString('base64')}` });
  expect(svg.status()).toBe(400);
  expect((await svg.json()).error).toBe('NON_IMMAGINE');

  const caricato = await sfondi({ azione: 'carica', nome: '  Natale   di prova ', immagine: PNG });
  expect(caricato.status()).toBe(200);
  const { id } = (await caricato.json()) as { id: string };

  try {
    const { sfondi: elenco } = (await (await sfondi({ azione: 'elenco' })).json()) as { sfondi: Array<{ id: string; nome: string; acceso: boolean }> };
    expect(elenco.find((s) => s.id === id)).toMatchObject({ nome: 'Natale di prova', acceso: true });
    expect(await accesi(request)).toContain(id);

    const immagine = await request.get(`/api/sfondi/${id}`);
    expect(immagine.headers()['content-type']).toBe('image/png');
    expect(immagine.headers()['cache-control']).toContain('immutable');
    expect((await request.get('/api/sfondi/inesistente')).status()).toBe(404);

    // La porta d'ingresso ha lo sfondo, e il contenuto sta sul pannello.
    await page.goto('/');
    await expect(page.getByTestId('sfondo-festivo')).toBeAttached();
    await expect(page.locator('body')).toHaveClass(/con-sfondo/);

    // L'attesa del via ha lo sfondo; appena parte il chilometro sparisce.
    const gara = await setup(request, { azione: 'crea', classLabel: '2S', km: 4 });
    await page.goto('/giro');
    await page.locator('form[data-pronto="1"]').waitFor();
    await page.getByPlaceholder('K7QX').fill(gara.code);
    await page.getByPlaceholder('Luca').fill('Noemi');
    await page.getByRole('button', { name: 'Al via!' }).click();
    await expect(page.getByText('Aspetta che il prof apra la prima tappa.')).toBeVisible();
    await expect(page.getByTestId('sfondo-festivo')).toBeAttached();

    await setup(request, { azione: 'apri', sessionId: gara.sessionId, tappa: 0 });
    await expect(page.getByText(/Km 1\b/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('sfondo-festivo')).toHaveCount(0);
    await expect(page.locator('body')).not.toHaveClass(/con-sfondo/);

    // Spento, il sito torna quello di sempre.
    expect((await (await sfondi({ azione: 'accendi', id, acceso: false })).json()).acceso).toBe(false);
    expect(await accesi(request)).not.toContain(id);
  } finally {
    expect((await sfondi({ azione: 'elimina', id })).status()).toBe(200);
  }
  expect((await request.get(`/api/sfondi/${id}`)).status()).toBe(404);
});
