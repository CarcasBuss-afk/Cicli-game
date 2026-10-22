/* La porta d'ingresso: da `/` si sceglie l'attività, e ogni scelta porta alla sua
 * schermata di accesso; da lì si torna indietro. */
import { expect, test } from '@playwright/test';

test.describe("la porta d'ingresso", () => {
  test("allievi e docente scelgono l'attività", async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Che cosa facciamo oggi?')).toBeVisible();

    const attivita = page.getByRole('navigation', { name: 'attività' });
    await attivita.getByRole('link', { name: /Il Giro dei Cicli/ }).click();
    await expect(page).toHaveURL(/\/giro$/);
    await expect(page.getByRole('button', { name: 'Al via!' })).toBeVisible();
    await page.getByRole('link', { name: 'tutte le attività' }).click();
    await expect(page).toHaveURL(/\/$/);

    await attivita.getByRole('link', { name: /L'Officina/ }).click();
    await expect(page).toHaveURL(/\/officina$/);
    await expect(page.getByRole('button', { name: 'Accedi con Google' })).toBeVisible();
    await page.getByRole('link', { name: 'tutte le attività' }).click();

    const docente = page.getByRole('region', { name: 'area docente' });
    await docente.getByRole('link', { name: /Gare del Giro/ }).click();
    await expect(page).toHaveURL(/\/docente$/);
    await expect(page.getByRole('button', { name: 'Accedi con Google' })).toBeVisible();
    await page.goBack();
    await docente.getByRole('link', { name: /Classi dell'Officina/ }).click();
    await expect(page).toHaveURL(/\/docente\/officina$/);
    await expect(page.getByRole('button', { name: 'Accedi con Google' })).toBeVisible();
  });
});
