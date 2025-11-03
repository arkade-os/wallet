import { test, expect } from '@playwright/test'

test('should serve PWA manifest', async ({ page }) => {
  await page.goto('/')
  const manifestLink = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(manifestLink).toContain('manifest.json')

  const manifest = await page.evaluate(async () => {
    const res = await fetch('/manifest.json')
    return res.ok
  })
  expect(manifest).toBe(true)
})
