import { test, expect, type Page, type Route } from '@playwright/test';

const siteBaseUrl = process.env.SITE_E2E_BASE_URL;

function buildProperties(total = 25) {
  return Array.from({ length: total }, (_, index) => {
    const id = 9001 + index;
    const inGoiania = index < 20;
    return {
      id,
      title: `Imóvel Painel->Site ${id}`,
      description: 'Fixture E2E painel para validar filtro no site.',
      type: 'Casa',
      status: 'approved',
      purpose: 'Venda',
      price: 400000 + index * 2000,
      city: inGoiania ? 'Goiânia' : 'Aparecida de Goiânia',
      bairro: inGoiania ? (index % 2 === 0 ? 'Centro' : 'Jardim') : 'Buriti Sereno',
      images: ['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
    };
  });
}

function fulfillJson(route: Route, payload: unknown) {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  });
}

async function mockSiteApi(page: Page) {
  const properties = buildProperties(25);

  await page.route('**/properties/cities-with-count', async (route) => {
    await fulfillJson(route, [
      { city: 'Aparecida de Goiânia', total: 5 },
      { city: 'Goiânia', total: 20 },
    ]);
  });

  await page.route('**/properties/bairros?*', async (route) => {
    const url = new URL(route.request().url());
    const city = String(url.searchParams.get('city') || '').toLowerCase();
    const rows = city === 'goiânia'
      ? [
          { city: 'Goiânia', bairro: 'Centro', total: 10 },
          { city: 'Goiânia', bairro: 'Jardim', total: 10 },
        ]
      : [];
    await fulfillJson(route, rows);
  });

  await page.route('**/properties?*', async (route) => {
    const url = new URL(route.request().url());
    const city = String(url.searchParams.get('city') || '').trim().toLowerCase();
    const pageNumber = Math.max(Number(url.searchParams.get('page') || 1), 1);
    const limit = Math.max(Number(url.searchParams.get('limit') || 10), 1);

    const filtered = city ? properties.filter((item) => item.city.toLowerCase() === city) : properties;
    const start = (pageNumber - 1) * limit;
    const rows = filtered.slice(start, start + limit);
    const total = filtered.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    await fulfillJson(route, {
      properties: rows,
      data: rows,
      total,
      page: pageNumber,
      totalPages,
    });
  });
}

async function uniquePropertyCount(page: Page): Promise<number> {
  const hrefs = await page
    .locator('main a[href^="/imoveis/"]')
    .evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute('href') || ''));
  return new Set(hrefs.filter(Boolean)).size;
}

test('painel abre contexto e valida filtro/cidade/lazy no site', async ({ page }) => {
  test.skip(!siteBaseUrl, 'Defina SITE_E2E_BASE_URL para rodar este cenário integrado.');

  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();

  const sitePage = await page.context().newPage();
  await mockSiteApi(sitePage);
  await sitePage.goto(`${siteBaseUrl}/imoveis`);

  const quickFilter = sitePage.locator('[aria-label="Filtros rápidos na listagem"]');
  await expect(quickFilter).toBeVisible();

  const citySelect = quickFilter.locator('select').first();
  await expect
    .poll(async () => citySelect.locator('option').allTextContents())
    .toContain('Goiânia (20)');

  await citySelect.selectOption({ label: 'Goiânia (20)' });
  await quickFilter.getByRole('button', { name: 'Aplicar' }).click();
  await expect(sitePage).toHaveURL(/city=Goi%C3%A2nia/);

  await expect.poll(() => uniquePropertyCount(sitePage)).toBe(10);
  await sitePage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect.poll(() => uniquePropertyCount(sitePage)).toBe(20);
});
