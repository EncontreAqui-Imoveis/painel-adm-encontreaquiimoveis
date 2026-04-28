import { test, expect } from '@playwright/test';

test.describe('Proposal Flow Navigation', () => {
  test('should navigate to a property and generate a proposal', async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@encontreaqui.com.br');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await expect(page).toHaveURL(/dashboard|home/);

    // 2. Go to Properties
    await page.click('text=Imóveis');
    await expect(page).toHaveURL(/properties|imoveis/);

    // 3. Select a property
    await page.click('.property-card:first-child');
    
    // 4. Start Proposal Wizard
    await page.click('text=Gerar Proposta');
    
    // 5. Fill details
    await page.fill('input[name="clientName"]', 'Test Client');
    await page.fill('input[name="clientCpf"]', '123.456.789-01');
    await page.fill('input[name="proposalValue"]', '500000');
    
    // 6. Submit
    await page.click('button:has-text("Enviar Proposta")');

    // 7. Verify Success/Processing Message
    await expect(page.locator('.toast, .alert')).toContainText(/gerada|instantes|sucesso/i);
    
    // 8. Verify it appeared in the list
    await page.goto('/negotiations');
    await expect(page.locator('text=Test Client')).toBeVisible();
  });
});
