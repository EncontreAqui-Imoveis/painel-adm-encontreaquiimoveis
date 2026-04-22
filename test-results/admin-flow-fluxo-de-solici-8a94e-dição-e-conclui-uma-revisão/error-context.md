# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-flow.spec.ts >> fluxo de solicitações de imóvel abre a aba de edição e conclui uma revisão
- Location: e2e\admin-flow.spec.ts:207:1

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByText('Solicitações (Imóveis)')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - main [ref=e3]:
    - generic [ref=e4]:
      - complementary [ref=e5]:
        - img "Encontre Aqui Imóveis" [ref=e9]
        - generic [ref=e10]:
          - navigation [ref=e11]:
            - button "Dashboard" [ref=e12] [cursor=pointer]:
              - img [ref=e13]
              - generic [ref=e14]: Dashboard
            - generic [ref=e15]:
              - button "Imóveis" [expanded] [active] [ref=e16] [cursor=pointer]:
                - generic [ref=e17]:
                  - img [ref=e18]
                  - generic [ref=e19]: Imóveis
                - img [ref=e21]
              - generic [ref=e22]:
                - button "Disponíveis" [ref=e23] [cursor=pointer]:
                  - img [ref=e24]
                  - generic [ref=e25]: Disponíveis
                - button "Vendidos / Alugados" [ref=e26] [cursor=pointer]:
                  - img [ref=e27]
                  - generic [ref=e28]: Vendidos / Alugados
                - button "Destaques" [ref=e29] [cursor=pointer]:
                  - img [ref=e30]
                  - generic [ref=e31]: Destaques
                - button "Cadastrar Imóvel" [ref=e32] [cursor=pointer]:
                  - img [ref=e33]
                  - generic [ref=e34]: Cadastrar Imóvel
            - button "Usuários" [ref=e36] [cursor=pointer]:
              - generic [ref=e37]:
                - img [ref=e38]
                - generic [ref=e39]: Usuários
              - img [ref=e40]
            - button "Negociações" [ref=e42] [cursor=pointer]:
              - generic [ref=e43]:
                - img [ref=e44]
                - generic [ref=e45]: Negociações
              - img [ref=e46]
            - button "Verificação 1" [ref=e48] [cursor=pointer]:
              - generic [ref=e49]:
                - img [ref=e50]
                - generic [ref=e51]: Verificação
              - generic [ref=e52]:
                - generic [ref=e53]: "1"
                - img [ref=e54]
            - button "Notificações" [ref=e55] [cursor=pointer]:
              - img [ref=e56]
              - generic [ref=e57]: Notificações
          - generic [ref=e58]:
            - generic [ref=e59]:
              - button "Claro" [ref=e60] [cursor=pointer]
              - button "Escuro" [ref=e61] [cursor=pointer]
            - button "Sair" [ref=e62] [cursor=pointer]:
              - img [ref=e63]
              - text: Sair
      - generic [ref=e65]:
        - heading "Dashboard" [level=1] [ref=e68]
        - main [ref=e69]
  - region "Notifications alt+T"
```

# Test source

```ts
  116 |               profissao: 'Corretor',
  117 |               email: 'captador@test.com',
  118 |               telefone: '62999998888',
  119 |               dados_bancarios: 'Banco XPTO',
  120 |             },
  121 |             buyerInfo: {
  122 |               estado_civil: 'Solteiro',
  123 |               profissao: 'Analista',
  124 |               email: 'vendedor@test.com',
  125 |               telefone: '62999997777',
  126 |             },
  127 |             sellerApprovalStatus: 'PENDING',
  128 |             buyerApprovalStatus: 'PENDING',
  129 |             documents: [
  130 |               {
  131 |                 id: 501,
  132 |                 type: 'other',
  133 |                 documentType: 'doc_identidade',
  134 |                 side: 'seller',
  135 |                 originalFileName: 'identidade.pdf',
  136 |                 downloadUrl: '/negotiations/neg-e2e-1/documents/501/download',
  137 |                 createdAt,
  138 |               },
  139 |               {
  140 |                 id: 502,
  141 |                 type: 'other',
  142 |                 documentType: 'doc_identidade',
  143 |                 side: 'buyer',
  144 |                 originalFileName: 'identidade-comprador.pdf',
  145 |                 downloadUrl: '/negotiations/neg-e2e-1/documents/502/download',
  146 |                 createdAt,
  147 |               },
  148 |             ],
  149 |             createdAt,
  150 |             updatedAt: createdAt,
  151 |           },
  152 |         ],
  153 |         total: 1,
  154 |         page: 1,
  155 |         limit: 20,
  156 |       });
  157 |       return;
  158 |     }
  159 | 
  160 |     if (path === '/admin/property-edit-requests') {
  161 |       await fulfillJson(route, {
  162 |         data: propertyEditRequests,
  163 |         total: propertyEditRequests.length,
  164 |       });
  165 |       return;
  166 |     }
  167 | 
  168 |     if (path === '/admin/property-edit-requests/1' && request.method() === 'GET') {
  169 |       await fulfillJson(route, propertyEditRequests[0] ?? {});
  170 |       return;
  171 |     }
  172 | 
  173 |     if (path === '/admin/property-edit-requests/1/review' && request.method() === 'POST') {
  174 |       propertyEditRequests = [];
  175 |       await fulfillJson(route, { status: 'APPROVED' });
  176 |       return;
  177 |     }
  178 | 
  179 |     await fulfillJson(route, {});
  180 |   });
  181 | }
  182 | 
  183 | test('login admin carrega o shell do dashboard', async ({ page }) => {
  184 |   await mockAdminApi(page);
  185 |   await page.goto('/');
  186 | 
  187 |   await page.getByPlaceholder('Email').fill('admin@example.com');
  188 |   await page.getByPlaceholder('Senha').fill('123456');
  189 |   await page.getByRole('button', { name: /^entrar$/i }).click();
  190 | 
  191 |   await expect(page.getByRole('button', { name: /^dashboard$/i })).toBeVisible();
  192 | });
  193 | 
  194 | test('rota de contratos abre o módulo principal e permite revisar documentação', async ({ page }) => {
  195 |   await mockAdminApi(page);
  196 |   await page.addInitScript(() => {
  197 |     window.sessionStorage.setItem('authToken', 'admin-e2e-token');
  198 |   });
  199 | 
  200 |   await page.goto('/admin/contratos');
  201 | 
  202 |   await expect(page.getByRole('heading', { level: 1, name: 'Contratos' })).toBeVisible();
  203 |   await page.getByRole('button', { name: 'Analisar Documentação' }).click();
  204 |   await expect(page.getByText('Dados Captador')).toBeVisible();
  205 | });
  206 | 
  207 | test('fluxo de solicitações de imóvel abre a aba de edição e conclui uma revisão', async ({ page }) => {
  208 |   await mockAdminApi(page);
  209 |   await page.addInitScript(() => {
  210 |     window.sessionStorage.setItem('authToken', 'admin-e2e-token');
  211 |   });
  212 | 
  213 |   await page.goto('/');
  214 | 
  215 |   await page.getByRole('button', { name: /^imóveis$/i }).click();
> 216 |   await page.getByText('Solicitações (Imóveis)').click();
      |                                                  ^ Error: locator.click: Test timeout of 60000ms exceeded.
  217 | 
  218 |   await expect(page.getByRole('button', { name: 'Edição' }).first()).toBeVisible();
  219 |   await page.getByRole('button', { name: 'Edição' }).first().click();
  220 |   await page.getByRole('button', { name: 'Revisar edição' }).click();
  221 | 
  222 |   await expect(page.getByText('Compare o que mudou antes de aprovar.')).toBeVisible();
  223 |   await expect(page.getByRole('button', { name: 'Aprovar tudo' })).toBeVisible();
  224 |   await expect(page.getByRole('button', { name: 'Rejeitar tudo' })).toBeVisible();
  225 |   await expect(page.getByRole('button', { name: 'Aprovar', exact: true })).toBeVisible();
  226 |   await expect(page.getByRole('button', { name: 'Rejeitar', exact: true })).toBeVisible();
  227 |   await page.getByRole('button', { name: 'Aprovar', exact: true }).click();
  228 | });
  229 | 
```