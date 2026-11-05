import { test, expect, type Page, type BrowserContext, type Route } from '@playwright/test';

// Estado apenas no servidor de teste simulado. A aplicação continua usando a API.
type Assistant = { id: number; name: string; email: string; isActive: boolean };
const password = 'Senha sintética para teste!';
const admin = { id: 1, role: 'admin', name: 'Administrador sintético', capabilities: { canManageAdministration: true } };

async function mockApi(context: BrowserContext, rows: Assistant[]) {
  await context.route('**/*', async route => {
    const request = route.request(); const url = new URL(request.url());
    if (url.origin === 'http://127.0.0.1:4173') return route.continue();
    if (!url.pathname.startsWith('/admin/')) return route.abort();
    const reply = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, body: '' });
    if (url.pathname === '/admin/login') return reply({ token: 'sessao-sintetica', admin });
    if (url.pathname === '/admin/me') return reply({ admin });
    if (url.pathname === '/admin/reauth') return reply({ reauthToken: 'confirmacao-sintetica' });
    if (url.pathname === '/admin/assistants' && request.method() === 'POST') {
      const { name, email } = request.postDataJSON();
      const row = { id: 42, name, email, isActive: true }; rows.push(row);
      return reply({ data: row }, 201);
    }
    if (url.pathname === '/admin/assistants') {
      return reply({ data: rows.filter(row => row.isActive || url.searchParams.get('includeInactive') === 'true') });
    }
    if (url.pathname === '/admin/assistants/42' && request.method() === 'DELETE') {
      rows[0].isActive = false;
      expect(request.headers()['x-admin-reauth']).toBe('confirmacao-sintetica');
      return reply({ data: rows[0] });
    }
    if (url.pathname.includes('dashboard/stats')) return reply({ totalProperties: 0, totalBrokers: 0, totalUsers: 0 });
    return reply({ data: [], total: 0, propertiesByStatus: [], newPropertiesOverTime: [], goldenSignals: {}, externalServices: [], releaseHealth: [], timeSeries: [] });
  });
}
async function signIn(page: Page) {
  await page.goto('/');
  await page.getByPlaceholder('Email').fill('admin@example.test');
  await page.getByPlaceholder('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Dashboard', exact: true })).toBeVisible();
}
async function assistants(page: Page) {
  const group = page.getByRole('button', { name: 'Usuários', exact: true });
  if (await group.getAttribute('aria-expanded') === 'false') await group.click();
  await page.getByRole('button', { name: 'Auxiliares administrativos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Auxiliares administrativos', level: 2 })).toBeVisible();
}

test('cadastro persiste na API ao navegar, F5, nova sessão e exclusão confirmada', async ({ page, context, browser }) => {
  const rows: Assistant[] = [];
  await mockApi(context, rows);
  await signIn(page); await assistants(page);
  await expect(page.getByText('Nenhum auxiliar administrativo cadastrado.')).toBeVisible();
  const initial = page.getByLabel(/Senha inicial/);
  await expect(initial).toHaveAttribute('type', 'password');
  await page.getByLabel('Nome', { exact: true }).fill('Auxiliar de teste');
  await page.getByLabel('E-mail', { exact: true }).fill('auxiliar@example.test');
  await initial.fill(password);
  await page.getByRole('button', { name: 'Criar auxiliar' }).click();
  await expect(page.getByText('auxiliar@example.test', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await assistants(page);
  await expect(page.getByText('auxiliar@example.test', { exact: true })).toBeVisible();
  await page.reload(); await assistants(page);
  await expect(page.getByText('auxiliar@example.test', { exact: true })).toBeVisible();
  const freshContext = await browser.newContext();
  await mockApi(freshContext, rows);
  const fresh = await freshContext.newPage();
  await signIn(fresh); await assistants(fresh);
  await expect(fresh.getByText('auxiliar@example.test', { exact: true })).toBeVisible();
  await fresh.getByRole('button', { name: 'Editar auxiliar' }).click();
  await expect(fresh.getByLabel('Nova senha')).toHaveAttribute('type', 'password');
  await fresh.getByLabel('Nova senha').fill(password);
  await fresh.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await assistants(fresh);
  await fresh.getByRole('button', { name: 'Editar auxiliar' }).click();
  await expect(fresh.getByLabel('Nova senha')).toHaveValue('');
  await fresh.getByRole('button', { name: 'Excluir auxiliar Auxiliar de teste' }).click();
  const dialog = fresh.getByRole('dialog', { name: 'Excluir acesso do auxiliar' });
  await expect(dialog).toContainText('auxiliar@example.test');
  await expect(dialog.getByLabel('Senha do administrador')).toHaveAttribute('type', 'password');
  await dialog.getByLabel('Senha do administrador').fill(password);
  await fresh.screenshot({ path: test.info().outputPath('confirmacao-mascarada.png') });
  await dialog.getByRole('button', { name: 'Excluir acesso', exact: true }).click();
  await expect(fresh.getByText('Nenhum auxiliar administrativo cadastrado.')).toBeVisible();
  await fresh.getByRole('checkbox', { name: 'Mostrar desativados' }).check();
  await expect(fresh.getByText('auxiliar@example.test', { exact: true })).toBeVisible();
  await expect(fresh.getByText('Desativado', { exact: true })).toBeVisible();
  await freshContext.close();
});
