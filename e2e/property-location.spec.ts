import { test, expect } from '@playwright/test';
import { installPropertyLocationApi } from './fixtures/propertyLocationApi';

for (const mobile of [false, true]) {
  test.describe(mobile ? 'mobile 390px com toque' : 'desktop 1440px', () => {
    test.use({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, hasTouch: mobile, isMobile: mobile });
    test('CEP → cadastro → SQLite → F5 → edição → reabertura', async ({ page, context }, info) => {
      const api = await installPropertyLocationApi(context, info.outputPath('imoveis-sinteticos.sqlite'), new URL(String(info.project.use.baseURL)).origin);
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      try {
        await page.goto('/#create_property');
        await expect(page.locator('#create-property-cep')).toBeVisible();
        await page.locator('#create-property-cep').fill('75970-000');
        await expect(page.locator('#create-property-city')).toHaveValue('Turvelândia');
        await expect(page.locator('#create-property-bairro')).toBeEnabled();
        if (mobile) await page.locator('#create-property-bairro').tap();
        await page.locator('#create-property-bairro').fill('Bairro sintético Turvelândia');
        await expect(page.locator('#create-property-state')).toHaveValue('GO');
        await page.locator('#create-property-bairro').scrollIntoViewIfNeeded();
        const box = await page.locator('#create-property-bairro').boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
        await page.screenshot({ path: info.outputPath('turvelandia.png'), fullPage: true });
        await page.getByLabel('Título *', { exact: true }).fill('Imóvel sintético CEP');
        await page.getByPlaceholder('Descreva o imóvel').fill('Imóvel criado apenas em API e SQLite sintéticos.');
        await page.locator('#create-property-address').fill('Rua sintética');
        await page.locator('#create-property-numero-input').fill('10');
        await page.locator('#create-property-quadra').fill('1');
        await page.locator('#create-property-lote').fill('1');
        for (const name of ['bedrooms', 'bathrooms', 'garage-spots']) await page.locator(`#create-property-${name}`).fill('1');
        await page.locator('#create-property-area-construida').fill('100');
        await page.locator('#create-property-area-terreno').fill('200');
        await page.getByLabel('Preço de venda *', { exact: true }).fill('10000000');
        await page.getByLabel('Fotos do imóvel *', { exact: true }).setInputFiles({ name: 'sintetica.png', mimeType: 'image/png',
          buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5ZcAAAAASUVORK5CYII=', 'base64') });
        await page.getByRole('button', { name: 'Cadastrar imóvel', exact: true }).click();
        await expect.poll(() => api.read()?.city).toBe('Turvelândia');
        expect(api.read()).toMatchObject({ state: 'GO', bairro: 'Bairro sintético Turvelândia', cep: '75970000' });
        const afterCreate = { city: api.read()?.city, state: api.read()?.state, bairro: api.read()?.bairro };
        await page.goto('/admin/properties');
        await page.reload();
        await page.getByRole('button', { name: 'Revisar', exact: true }).first().click();
        const dialog = page.getByRole('dialog');
        await dialog.getByRole('button', { name: 'Editar dados', exact: true }).click();
        await expect(page.locator('#edit-property-city')).toHaveValue('Turvelândia');
        await expect(page.locator('#edit-property-bairro')).toHaveValue('Bairro sintético Turvelândia');
        await page.locator('#edit-property-cep').fill('75901-000');
        await expect(page.locator('#edit-property-city')).toHaveValue('Rio Verde');
        await expect(page.locator('#edit-property-bairro')).toHaveValue('Centro');
        await expect(page.locator('#edit-property-bairro')).toBeEnabled();
        await page.locator('#edit-property-bairro').scrollIntoViewIfNeeded();
        await page.screenshot({ path: info.outputPath('rio-verde-edicao.png'), fullPage: true });
        await dialog.getByRole('button', { name: 'Salvar', exact: true }).first().click();
        await expect(dialog).not.toBeVisible();
        expect(api.read()).toMatchObject({ state: 'GO', city: 'Rio Verde', bairro: 'Centro' });
        await page.reload();
        await page.getByRole('button', { name: 'Revisar', exact: true }).first().click();
        await page.getByRole('dialog').getByRole('button', { name: 'Editar dados', exact: true }).click();
        await expect(page.locator('#edit-property-city')).toHaveValue('Rio Verde');
        await expect(page.locator('#edit-property-bairro')).toHaveValue('Centro');
        await info.attach('persistencia-sqlite.json', { body: JSON.stringify({
          afterCreate, afterEdit: { city: api.read()?.city, state: api.read()?.state, bairro: api.read()?.bairro }, requests: api.requests,
        }, null, 2), contentType: 'application/json' });
        expect(errors).toEqual([]);
      } finally { api.close(); }
    });
  });
}
