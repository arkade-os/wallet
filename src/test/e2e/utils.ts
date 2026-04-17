import { test as base, type Page } from '@playwright/test'
import { faucetOffchain } from './fundedWallet'
import { prettyNumber } from '../../lib/format'
import { sleep } from '../../lib/sleep'

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    // Pre-set currency display to "Show both" so e2e tests see SATS amounts.
    // The default changed to "Fiat only" in PR #473 which hides SATS from the balance.
    await page.addInitScript(() => {
      const raw = localStorage.getItem('config')
      const config = raw ? JSON.parse(raw) : {}
      config.currencyDisplay = 'Show both'
      localStorage.setItem('config', JSON.stringify(config))
    })
    await use(page)
  },
})

export { expect } from '@playwright/test'

/**
 * Wait for the wallet main page to be ready.
 *
 * The boot flow holds the loading screen until the first data load
 * completes.  If that load fails, a BootError overlay appears with
 * "Retry" and "Continue anyway" buttons.  This helper handles both
 * paths: it waits for either the wallet's "Send" button *or* the
 * error's "Continue anyway" button, dismisses the error if it shows,
 * and then waits for the wallet page.
 */
export async function waitForWalletPage(page: Page, timeout = 60000): Promise<void> {
  const sendBtn = page.getByText('Send', { exact: true })
  const continueBtn = page.getByText('Continue anyway')
  await sendBtn.or(continueBtn).first().waitFor({ state: 'visible', timeout })
  if (await continueBtn.isVisible()) {
    await continueBtn.click()
    await sendBtn.waitFor({ state: 'visible', timeout: 30000 })
  }
}

interface MintAssetOptions {
  amount: number
  name: string
  ticker: string
  decimals?: number
  controlMode?: 'mint-new' | 'existing'
  ctrlAmount?: number
}

export async function navigateToAssets(page: Page): Promise<void> {
  await page.getByTestId('tab-apps').click()
  await page.getByTestId('app-arkade-mint').click()
  await page.waitForSelector('text=Arkade Mint', { state: 'visible' })
}

export async function enableAssets(page: Page): Promise<void> {
  await navigateToAssets(page)
  await page.getByTestId('header-aux-btn').click()
  await page.waitForSelector('text=Arkade Mint settings', { state: 'visible' })
  await page.getByTestId('assets-toggle').click()
  await page.getByLabel('Go back').click()
}

export async function mintAsset(page: Page, opts: MintAssetOptions): Promise<void> {
  await sleep(3000)
  await navigateToAssets(page)
  await page.getByText('Mint', { exact: true }).click()
  await page.waitForSelector('text=Mint Asset', { state: 'visible' })

  // fill amount
  await page.getByTestId('asset-amount').locator('input:not(.cloned-input)').fill(opts.amount.toString())
  // fill name
  await page.getByTestId('asset-name').locator('input:not(.cloned-input)').fill(opts.name)
  // fill ticker
  await page.getByTestId('asset-ticker').locator('input:not(.cloned-input)').fill(opts.ticker)
  // fill decimals if provided
  if (opts.decimals !== undefined) {
    const decimalsInput = page.getByTestId('asset-decimals').locator('input:not(.cloned-input)')
    await decimalsInput.clear()
    await decimalsInput.fill(opts.decimals.toString())
  }

  // select control mode if specified
  if (opts.controlMode === 'mint-new') {
    await page.getByText('New').click()
    if (opts.ctrlAmount !== undefined) {
      const ctrlAmountInput = page.getByTestId('control-asset-amount').locator('input:not(.cloned-input)')
      await ctrlAmountInput.clear()
      await ctrlAmountInput.fill(opts.ctrlAmount.toString())
    }
  } else if (opts.controlMode === 'existing') {
    await page.getByText('Existing').click()
  }

  // submit
  await page.getByText('Mint', { exact: true }).click()
  await page.getByTestId('loading-logo').waitFor({ timeout: 3000 })
  await page.waitForSelector('text=Asset minted!', { timeout: 30000 })
}

export async function createWallet(page: Page): Promise<void> {
  // await execAsync('nigiri rpc --generate 1')
  await page.goto('/')
  await page.getByText('+ Create wallet').click()
  await waitForWalletPage(page)
}

export async function createWalletWithPassword(page: Page, password: string): Promise<void> {
  await createWallet(page)
  await page.getByTestId('tab-settings').click()
  await page.getByText('Advanced').click()
  await page.getByText('Change password').click()
  await page.locator('div[data-testid="new-password"] input').fill(password)
  await page.locator('div[data-testid="confirm-password"] input').fill(password)
  await page.getByText('Save password').click()
  // go back from Password → Advanced → Menu, then close settings
  await page.getByLabel('Go back').click()
  await page.getByLabel('Go back').click()
  await page.getByTestId('tab-settings').click()
}

export async function prePay(page: Page, address: string, isMobile = false, sats = 0): Promise<void> {
  // go to send page
  await page.getByTestId('tab-wallet').click()
  await page.getByText('Send').click()

  // fill address
  await page.locator('input[name="send-address"]').fill(address)

  // fill amount
  if (sats) {
    if (isMobile) {
      await page.locator('input[name="send-amount"]').click()
      await handleKeyboardInput(page, sats)
    } else {
      await page.locator('input[name="send-amount"]').fill(sats.toString())
    }
  }

  // continue to details page
  await page.getByText('Continue').click()
}

export async function pay(page: Page, address: string, isMobile = false, sats = 0): Promise<void> {
  // insert value and address, then continue to details page
  await prePay(page, address, isMobile, sats)

  // continue to send
  await page.getByText('Tap to Sign').click()
  await page.getByTestId('loading-logo').waitFor({ timeout: 3000 })
  await page.waitForSelector('text=Payment sent!', { timeout: 30000 })
  await page.getByText('Sounds good').click()
}

async function receive(page: Page, type: 'btc' | 'ark' | 'invoice', isMobile = false, sats = 0): Promise<string> {
  // go to receive page
  await page.getByTestId('tab-wallet').click()
  await page.getByText('Receive', { exact: true }).click()

  // fill amount to receive if provided
  if (sats && type === 'invoice') {
    await page.getByText('Add amount').click()
    if (isMobile) {
      await page.locator('input[name="receive-amount"]').click()
      await handleKeyboardInput(page, sats)
    } else {
      await page.locator('input[name="receive-amount"]').fill(sats.toString())
    }
  }

  // copy address/invoice
  await page.getByText('Copy').click()
  await page.getByTestId(`${type}-address-copy`).click()
  return await readClipboard(page)
}

export async function receiveOnchain(page: Page, isMobile = false, sats = 0): Promise<string> {
  return receive(page, 'btc', isMobile, sats)
}

export async function receiveOffchain(page: Page): Promise<string> {
  return receive(page, 'ark')
}

export async function receiveLightning(page: Page, isMobile: boolean, sats: number): Promise<string> {
  return receive(page, 'invoice', isMobile, sats)
}

async function navigateToSettings(page: Page): Promise<void> {
  // If on a settings sub-page, go back until we reach the settings menu
  const backBtn = page.getByLabel('Go back')
  while (await backBtn.isVisible({ timeout: 300 }).catch(() => false)) {
    await backBtn.click()
    await page.waitForTimeout(200)
  }
  // If on wallet/apps sub-page, go to wallet root first (settings btn may be hidden)
  const walletTab = page.getByTestId('tab-wallet')
  if (await walletTab.isVisible().catch(() => false)) {
    await walletTab.click()
  }
  // Open settings if visible and not already on settings menu
  const settingsBtn = page.getByTestId('tab-settings')
  if (await settingsBtn.isVisible().catch(() => false)) {
    const label = await settingsBtn.getAttribute('aria-label').catch(() => '')
    if (label === 'Settings') {
      await settingsBtn.click()
    }
  }
}

async function getNsec(page: Page): Promise<string> {
  await navigateToSettings(page)
  await page.getByText('backup', { exact: true }).click()
  await page.getByText('View private key').click()
  await page.getByText('Confirm').click()
  const nsec = await page.getByTestId('private-key').innerText()
  return nsec
}

async function resetWallet(page: Page): Promise<void> {
  await navigateToSettings(page)
  await page.getByText('Reset wallet').click()
  await page.getByText('I have backed up my wallet').click()
  await page.getByRole('contentinfo').getByText('Reset wallet').click()
}

async function restoreWallet(page: Page, nsec: string): Promise<void> {
  await page.getByText('Other login options').click()
  await page.getByText('Restore wallet').click()
  await page.locator('input[name="private-key"]').fill(nsec)
  await page.getByText('Continue').click()
  await waitForWalletPage(page)
}

export async function fundWallet(page: Page, amount: number = 5000): Promise<void> {
  const arkAddress = await receiveOffchain(page)
  await faucetOffchain(arkAddress, amount)
  await waitForPaymentReceived(page)
  await page.getByTestId('tab-wallet').click()
  await page.waitForSelector(`text=+ ${prettyNumber(amount)} SATS`, { timeout: 10000 })
}

export async function resetAndRestoreWallet(page: Page): Promise<void> {
  const nsec = await getNsec(page)
  await resetWallet(page)
  await restoreWallet(page, nsec)
  await page.waitForTimeout(1000)
}

export function readClipboard(page: Page): Promise<string> {
  return page.evaluate(async () => {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      throw new Error('Clipboard API not available')
    }
    const clipboardText = await Promise.race([
      navigator.clipboard.readText(),
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Clipboard read timeout')), 5000)),
    ])
    return clipboardText
  })
}

export async function waitForPaymentReceived(page: Page): Promise<void> {
  await page.waitForSelector('text=Payment received!', { timeout: 60000 })
  await page.getByText('Sounds good').click()
}

export async function handleKeyboardInput(page: Page, sats: number): Promise<void> {
  await page.waitForSelector('text=Save', { state: 'visible' })
  const digits = sats.toString().split('')
  for (const digit of digits) {
    await page.getByTestId(`keyboard-${digit}`).click()
  }
  await page.getByText('Save').click()
}

export async function getFeesFromDetails(page: Page): Promise<number> {
  const txtValue = await page.getByTestId('Network fees').textContent()
  return parseInt(txtValue?.replace(' SATS', '').replaceAll(',', '') || '0')
}
