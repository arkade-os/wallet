import { test, expect } from './utils'
import { translations } from '../../lib/i18n'

const tr = translations.en

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

test('should keep bottom actions above the system navigation inset', async ({ page }) => {
  const inset = 48
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { bottom: inset } })

  await page.goto('/')
  await page.getByText(tr.init.otherLoginOptions).click()
  await page.getByText(tr.init.restoreWallet, { exact: true }).click()
  await expect(page.getByText(tr.common.cancel, { exact: true })).toBeVisible()

  const gap = await page.evaluate(() => {
    const buttons = document.querySelectorAll('footer.buttons-on-bottom button')
    return window.innerHeight - buttons[buttons.length - 1].getBoundingClientRect().bottom
  })
  expect(gap).toBeGreaterThanOrEqual(inset)
})
