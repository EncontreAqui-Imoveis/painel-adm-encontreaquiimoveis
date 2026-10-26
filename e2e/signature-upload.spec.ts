import { test, expect, type Page } from '@playwright/test';

// Compiled panel and real HTTP client; local simulated API only, no production or customer records.
async function setup(page: Page, conflict = false) {
  const pending = () => ({ status: 'PENDING', eventId: null, confirmedByAdminId: null, confirmedAt: null,
    sourceEventId: null, originalEventId: null, originalSignedVersionId: null, preservation: null });
  const contract = {
    id: 'signature-e2e', negotiationId: 'neg-signature-e2e', propertyId: 1, dealType: 'rent',
    status: 'AWAITING_SIGNATURES', propertyTitle: 'Contrato sintético',
    draftReview: { revisionId: 11, documentId: 20, allConsented: true },
    documents: [{ id: 20, documentType: 'contrato_minuta', originalFileName: 'minuta.pdf', metadata: { contractId: 'signature-e2e' } }],
    signatures: { currentVersion: null as unknown, seller: pending(), buyer: pending() },
  };
  const requests: string[] = [];
  const external: string[] = [];
  const uploads: string[] = [];
  await page.addInitScript(() => sessionStorage.setItem('authToken', 'local-signature-e2e-token'));
  await page.route('**/*', async route => {
    const host = new URL(route.request().url()).hostname;
    if (host === '127.0.0.1' || host === 'localhost') return route.continue();
    external.push(host); return route.abort();
  });
  await page.route('https://127.0.0.1:4011/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const json = (data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204 });
    requests.push(`${request.method()} ${url.pathname}`);
    if (url.pathname === '/admin/me') return json({ admin: { id: 7, name: 'Administrador sintético', role: 'admin' } });
    if (url.pathname === '/admin/contracts') return json({ data: url.searchParams.get('status') === 'AWAITING_SIGNATURES' ? [contract] : [], total: 1 });
    if (url.pathname === '/contracts/signature-e2e') return json({ contract, documents: contract.documents });
    if (url.pathname === '/admin/contracts/signature-e2e/signed-docs') {
      expect(request.method()).toBe('POST');
      expect(request.headers().authorization).toBe('Bearer local-signature-e2e-token');
      const body = request.postData()!;
      expect(body).toContain('name="draftRevisionId"\r\n\r\n11');
      expect(body).toContain('filename="assinado.pdf"');
      uploads.push(body);
      if (conflict) {
        contract.draftReview.revisionId = 12;
        return json({ code: 'CONTRACT_DRAFT_REVISION_STALE', error: 'A minuta foi atualizada.' }, 409);
      }
      contract.documents.push({ id: 41, documentType: 'contrato_assinado', originalFileName: 'assinado.pdf', metadata: { contractId: contract.id } });
      contract.signatures.currentVersion = { id: 31, documentId: 41, draftRevisionId: 11, uploadedByAdminId: 7,
        uploadedAt: '2026-10-26T12:00:00Z', previousVersionId: null, replacementReason: null, equivalence: null };
      return json({ readyForFinalization: true, signedVersion: { id: 31, draftRevisionId: 11 } }, 201);
    }
    if (request.method() !== 'GET') return json({ error: 'Operação inesperada' }, 400);
    return json({ data: [], total: 0 });
  });
  return { requests, uploads, external };
}
async function open(page: Page) {
  await page.goto('/admin/contratos');
  await page.getByRole('button', { name: 'Aguardando Assinaturas', exact: true }).click();
  await page.getByRole('button', { name: 'Finalizar Venda/Locação', exact: true }).click();
  await expect(page.getByText('Revisão da minuta: #11', { exact: true })).toBeVisible();
}
async function upload(page: Page) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Escolher arquivo PDF ou imagem' }).click();
  await (await chooser).setFiles({ name: 'assinado.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7 synthetic signatures') });
  await page.getByRole('button', { name: 'Anexar documento físico' }).click();
}
test('upload binds revision, persists after F5 and never creates signature confirmations', async ({ page }) => {
  const state = await setup(page);
  await open(page); await upload(page);
  await expect(page.getByText('PDF corrente: assinado.pdf', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Aguardando Assinaturas', exact: true }).click();
  await page.getByRole('button', { name: 'Finalizar Venda/Locação', exact: true }).click();
  await expect(page.getByText('PDF corrente: assinado.pdf', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Assinaturas presenciais' }).getByText('Pendente', { exact: true })).toHaveCount(2);
  expect(state.uploads).toHaveLength(1);
  expect(state.requests.filter(x => x.startsWith('POST '))).toEqual(['POST /admin/contracts/signature-e2e/signed-docs']);
});
test('stale revision displays conflict, reloads new state and does not retry', async ({ page }) => {
  const state = await setup(page, true);
  await open(page); await upload(page);
  await expect(page.getByText('Revisão da minuta: #12', { exact: true })).toBeVisible();
  await expect(page.getByText('A revisão ou o documento corrente mudou. Atualize e confira os detalhes antes de selecionar novamente o PDF.', { exact: true })).toBeVisible();
  await expect(page.getByText('Documento físico anexado com sucesso.', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Anexar documento físico' })).toHaveCount(0);
  expect(state.uploads).toHaveLength(1);
});
