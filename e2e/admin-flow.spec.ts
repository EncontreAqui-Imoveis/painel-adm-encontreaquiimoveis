import { test, expect, type Page, type Route } from '@playwright/test';

const createdAt = '2026-04-07T10:00:00.000Z';

function fulfillJson(route: Route, payload: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  });
}

async function mockAdminApi(page: Page) {
  let propertyEditRequests = [
    {
      id: 1,
      propertyId: 101,
      propertyTitle: 'Casa Editada',
      propertyCode: 'EDIT-101',
      requesterUserId: 99,
      requesterRole: 'broker',
      requesterName: 'Corretor E2E',
      status: 'PENDING',
      before: { title: 'Casa Antiga' },
      after: { title: 'Casa Nova' },
      diff: {
        title: {
          before: 'Casa Antiga',
          after: 'Casa Nova',
        },
      },
      createdAt,
      updatedAt: createdAt,
    },
  ];

  await page.route('https://127.0.0.1:4011/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    if (path === '/admin/login' && request.method() === 'POST') {
      await fulfillJson(route, { token: 'admin-e2e-token' });
      return;
    }

    if (path === '/admin/dashboard/stats') {
      await fulfillJson(route, {
        totalProperties: 12,
        totalBrokers: 4,
        totalUsers: 18,
      });
      return;
    }

    if (path === '/admin/dashboard/sre') {
      await fulfillJson(route, {
        goldenSignals: {
          availability: 99.9,
          errorRate: 0.01,
          latencyP95: 120,
          throughput: 15,
        },
        externalServices: [],
        releaseHealth: [],
        timeSeries: [],
      });
      return;
    }

    if (path === '/admin/stats/dashboard') {
      await fulfillJson(route, {
        propertiesByStatus: [{ status: 'approved', count: 12 }],
        newPropertiesOverTime: [{ date: '2026-04-07', count: 3 }],
      });
      return;
    }

    if (path === '/admin/properties-with-brokers') {
      const status = url.searchParams.get('status');
      if (status === 'pending_approval') {
        await fulfillJson(route, { data: [], total: 0, page: 1, limit: 1 });
        return;
      }
      await fulfillJson(route, { data: [], total: 0, page: 1, limit: 10 });
      return;
    }

    if (path === '/admin/brokers') {
      await fulfillJson(route, { data: [], total: 0, page: 1, limit: 10 });
      return;
    }

    if (path === '/admin/contracts') {
      await fulfillJson(route, {
        data: [
          {
            id: 'contract-e2e-1',
            status: 'AWAITING_DOCS',
            negotiationId: 'neg-e2e-1',
            propertyId: 101,
            propertyCode: 'RV-900',
            propertyTitle: 'Casa Contrato',
            propertyPurpose: 'Venda',
            capturingBrokerId: 30001,
            sellingBrokerId: 30002,
            capturingBrokerName: 'Captador',
            sellingBrokerName: 'Vendedor',
            sellerInfo: {
              estado_civil: 'Casado',
              profissao: 'Corretor',
              email: 'captador@test.com',
              telefone: '62999998888',
              dados_bancarios: 'Banco XPTO',
            },
            buyerInfo: {
              estado_civil: 'Solteiro',
              profissao: 'Analista',
              email: 'vendedor@test.com',
              telefone: '62999997777',
            },
            sellerApprovalStatus: 'PENDING',
            buyerApprovalStatus: 'PENDING',
            documents: [
              {
                id: 501,
                type: 'other',
                documentType: 'doc_identidade',
                side: 'seller',
                originalFileName: 'identidade.pdf',
                downloadUrl: '/negotiations/neg-e2e-1/documents/501/download',
                createdAt,
              },
              {
                id: 502,
                type: 'other',
                documentType: 'doc_identidade',
                side: 'buyer',
                originalFileName: 'identidade-comprador.pdf',
                downloadUrl: '/negotiations/neg-e2e-1/documents/502/download',
                createdAt,
              },
            ],
            createdAt,
            updatedAt: createdAt,
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      });
      return;
    }

    if (path === '/admin/property-edit-requests') {
      await fulfillJson(route, {
        data: propertyEditRequests,
        total: propertyEditRequests.length,
      });
      return;
    }

    if (path === '/admin/property-edit-requests/1' && request.method() === 'GET') {
      await fulfillJson(route, propertyEditRequests[0] ?? {});
      return;
    }

    if (path === '/admin/property-edit-requests/1/review' && request.method() === 'POST') {
      propertyEditRequests = [];
      await fulfillJson(route, { status: 'APPROVED' });
      return;
    }

    await fulfillJson(route, {});
  });
}

test('login admin carrega o shell do dashboard', async ({ page }) => {
  await mockAdminApi(page);
  await page.goto('/');

  await page.getByPlaceholder('Email').fill('admin@example.com');
  await page.getByPlaceholder('Senha').fill('123456');
  await page.getByRole('button', { name: /^entrar$/i }).click();

  await expect(page.getByRole('button', { name: /^dashboard$/i })).toBeVisible();
});

test('rota de contratos abre o módulo principal e permite revisar documentação', async ({ page }) => {
  await mockAdminApi(page);
  await page.addInitScript(() => {
    window.sessionStorage.setItem('authToken', 'admin-e2e-token');
  });

  await page.goto('/admin/contratos');

  await expect(page.getByRole('heading', { level: 1, name: 'Contratos' })).toBeVisible();
  await page.getByRole('button', { name: 'Analisar Documentação' }).click();
  await expect(page.getByText('Dados Captador', { exact: true }).first()).toBeVisible();
});

test('fluxo de solicitações de imóvel abre a aba de edição e conclui uma revisão', async ({ page }) => {
  await mockAdminApi(page);
  await page.addInitScript(() => {
    window.sessionStorage.setItem('authToken', 'admin-e2e-token');
  });

  await page.goto('/');

  await page.getByRole('button', { name: /^verificação/i }).click();
  await page.getByRole('button', { name: /^solicitações \(imóveis\)/i }).click();

  await expect(page.getByRole('button', { name: 'Edição' }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Edição' }).first().click();
  await page.getByRole('button', { name: 'Revisar edição' }).click();

  await expect(page.getByText('Compare o que mudou antes de aprovar.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Aprovar tudo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Rejeitar tudo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Aprovar', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Rejeitar', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Aprovar', exact: true }).click();
});
