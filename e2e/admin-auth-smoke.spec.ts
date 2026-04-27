import { test, expect } from '@playwright/test'

test('painel sem token mostra login e bloqueia rota administrativa', async ({ page }) => {
  await page.goto('/admin/contratos')

  await expect(page.getByPlaceholder('Email')).toBeVisible()
  await expect(page.getByRole('button', { name: /^entrar$/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /^dashboard$/i })).toHaveCount(0)
})

test('erro de credenciais no login mostra mensagem do backend', async ({ page }) => {
  await page.route('**/admin/login', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.continue()
      return
    }

    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Email ou senha incorretos.' }),
    })
  })

  await page.goto('/')
  await page.getByPlaceholder('Email').fill('admin-invalido@example.com')
  await page.getByPlaceholder('Senha').fill('senha-errada')
  await page.getByRole('button', { name: /^entrar$/i }).click()

  await expect(page.getByText('Email ou senha incorretos.')).toBeVisible()
})
