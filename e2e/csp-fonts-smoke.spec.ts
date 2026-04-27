import { test, expect } from '@playwright/test'

test('Não há bloqueios repetidos de fontes com CSP atual', async ({ page }) => {
    const fontWarnings: string[] = []
    const cspWarnings: string[] = []

    page.on('console', (message) => {
        if (message.type() !== 'error') return

        const text = message.text()
        if (text.includes('Refused to load the font') || text.includes('Refused to connect to')) {
            fontWarnings.push(text)
        }
        if (text.includes('Creating a worker from blob') || text.includes('worker-src')) {
            cspWarnings.push(text)
        }
        if (text.includes('Content Security Policy')) {
            cspWarnings.push(text)
        }
    })

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1200)

    expect(fontWarnings).toHaveLength(0)
    expect(cspWarnings).toHaveLength(0)
})

