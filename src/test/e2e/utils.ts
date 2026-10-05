import { test as base, type Page } from '@playwright/test'
import { faucetOffchain } from './fundedWallet'
import { sleep } from '../../lib/sleep'
import { exec } from 'child_process'
import { promisify } from 'util'
import { translations } from '../../lib/i18n'

const execAsync = promisify(exec)
const tr = translations.en

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    // Pre-set currency to BTC/sats so e2e tests see sats amounts.
    await page.addInitScript(() => {
      const raw = localStorage.getItem('config')
      const config = raw ? JSON.parse(raw) : {}
      config.currency = 'BTC'
      config.unit = 'sats'
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
  const sendBtn = page.getByText(tr.wallet.send, { exact: true })
  const continueBtn = page.getByText('Continue anyway')
  await sendBtn.or(continueBtn).first().waitFor({ state: 'visible', timeout })
  if (await continueBtn.isVisible()) {
    await continueBtn.click()
    await sendBtn.waitFor({ state: 'visible', timeout: 30000 })
  }
  const dismissButton = page.getByText(tr.common.dismiss)
  if (await dismissButton.isVisible().catch(() => false)) {
    await dismissButton.click()
  }
}

interface MintAssetOptions {
  amount: string
  name: string
  ticker: string
  decimals?: number
  controlMode?: 'mint-new' | 'existing'
  ctrlAmount?: number
}

export function isDesktop(page: Page): boolean {
  return page.viewportSize()?.width! >= 1024
}

export function navTestId(page: Page, item: string): string {
  return isDesktop(page) ? `desktop-nav-${item}` : `top-right-${item}`
}

export function navLocator(page: Page, item: string) {
  return page.getByTestId(navTestId(page, item))
}

export async function navigateToActivity(page: Page): Promise<void> {
  if (isDesktop(page)) return navLocator(page, 'activity').click()
  await navigateHome(page)
  await page.getByTestId('top-right-activity').click()
  await page.getByTestId('header-title-activity').waitFor({ state: 'visible', timeout: 30000 })
}

export async function navigateToAssets(page: Page): Promise<void> {
  await navigateToSettings(page)
  await page.getByText(tr.settings.advanced, { exact: true }).click()
  await page.getByText(tr.settings.arkadeMint, { exact: true }).click()
  await page.waitForSelector(`text=${tr.settings.arkadeMint}`, { state: 'visible' })
}

export async function navigateHome(page: Page): Promise<void> {
  if (isDesktop(page)) return navLocator(page, 'home').click()

  const homeReceive = page.getByTestId('home-action-receive')
  if (await homeReceive.isVisible().catch(() => false)) return

  const backBtn = page.getByLabel(tr.common.back)
  for (let i = 0; i < 8; i++) {
    if (await homeReceive.isVisible().catch(() => false)) return
    if (!(await backBtn.isVisible({ timeout: 300 }).catch(() => false))) break
    await backBtn.click()
    await page.waitForTimeout(200)
  }

  await homeReceive.waitFor({ state: 'visible', timeout: 30000 })
}

export async function enableAssets(page: Page): Promise<void> {
  await navigateToAssets(page)
  await page.getByTestId('header-aux-btn').click()
  await page.waitForSelector(`text=${tr.mint.settingsTitle}`, { state: 'visible' })
  await page.getByTestId('assets-toggle').click()
  await page.getByLabel(tr.common.back).click()
}

export async function mintAsset(page: Page, opts: MintAssetOptions): Promise<void> {
  await sleep(3000)
  await navigateToAssets(page)
  await page.getByText(tr.mint.mint, { exact: true }).click()
  await page.waitForSelector(`text=${tr.mint.title}`, { state: 'visible' })

  // fill amount
  await page.getByTestId('asset-amount').fill(opts.amount)
  // fill name
  await page.getByTestId('asset-name').fill(opts.name)
  // fill ticker
  await page.getByTestId('asset-ticker').fill(opts.ticker)
  // fill decimals if provided
  if (opts.decimals !== undefined) {
    const decimalsInput = page.getByTestId('asset-decimals')
    await decimalsInput.fill(opts.decimals.toString())
  }

  // select control mode if specified
  if (opts.controlMode === 'mint-new') {
    await page.getByText(tr.mint.new, { exact: true }).click()
    if (opts.ctrlAmount !== undefined) {
      const ctrlAmountInput = page.getByTestId('control-asset-amount')
      await ctrlAmountInput.clear()
      await ctrlAmountInput.fill(opts.ctrlAmount.toString())
    }
  } else if (opts.controlMode === 'existing') {
    await page.getByText(tr.mint.existing, { exact: true }).click()
  }

  // submit
  await page.getByText(tr.mint.mint, { exact: true }).click()
  await page.getByTestId('loading-logo').waitFor({ timeout: 10000 })
  await page.waitForSelector(`text=${tr.mint.assetMinted}`, { timeout: 60000 })
}

export async function createWallet(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByText(`+ ${tr.init.createWallet}`).click()
  await waitForWalletPage(page)
}

export async function createWalletWithFiat(page: Page): Promise<void> {
  await createWallet(page)
  await navigateToSettings(page)
  await page.getByText(tr.settings.currency).click()
  await page.getByText('USD').click()
  await page.getByLabel(tr.common.back).click()
  await page.getByLabel(tr.common.back).click()
  await navigateHome(page)
}

export async function createWalletWithPassword(page: Page, password: string): Promise<void> {
  await createWallet(page)
  await navigateToSettings(page)
  await page.getByText(tr.settings.advanced).click()
  await page.getByText(tr.settings.changePassword).click()
  await page.locator('div[data-testid="new-password"] input').fill(password)
  await page.locator('div[data-testid="confirm-password"] input').fill(password)
  await page.getByText(tr.components.savePassword).click()
  // go back from Password → Advanced → Menu, then close settings
  await page.getByLabel(tr.common.back).click()
  await page.getByLabel(tr.common.back).click()
  await page.getByLabel(tr.common.back).click()
}

export async function createWalletAndGetBIP21(page: Page, isMobile?: boolean, sats?: number): Promise<string> {
  await createWallet(page)
  await sleep(1000)
  await page.getByText(tr.wallet.receive, { exact: true }).click()

  if (sats) {
    await page.getByText(tr.receive.editAmount).click()
    if (isMobile) {
      await handleKeyboardInput(page, sats)
    } else {
      await page.locator('input[name="receive-amount-sheet"]').fill(sats.toString())
      await page.getByText(tr.receive.setAmount).click()
    }
  }

  await page.waitForSelector(`text=${tr.common.copy}`, { state: 'visible' })
  await page.getByText(tr.common.copy).click()
  await page.getByTestId('bip21-address-copy').click()
  const bip21 = await readClipboard(page)
  return bip21
}

export async function addInvoiceFromLND(amount: number): Promise<{ invoice: string; hash: string }> {
  const { stdout } = await execAsync(`docker exec lnd lncli --network=regtest addinvoice --amt ${amount}`)
  const outputJSON = JSON.parse(stdout.trim())
  return { invoice: outputJSON.payment_request, hash: outputJSON.r_hash }
}

export async function getInvoiceFromLND(amount = 2100): Promise<string> {
  const { invoice } = await addInvoiceFromLND(amount)
  return invoice
}

export async function prePay(page: Page, address: string, isMobile = false, amount = 0): Promise<void> {
  // go to send page
  await navigateHome(page)
  await page.getByText(tr.wallet.send, { exact: true }).click()

  // fill address
  await page.locator('input[name="send-address"]').fill(address)

  // fill amount — entry defaults to the bitcoin unit; pass fiat=true to flip
  // to display-currency entry first (desktop switch pill / keyboard toggle)
  if (amount) {
    if (isMobile) {
      await page.locator('input[name="send-amount"]').click()
      await page.waitForSelector(`text=${tr.common.save}`, { state: 'visible' })
      await handleKeyboardInput(page, amount)
    } else {
      await page.locator('input[name="send-amount"]').fill(amount.toString())
    }
  }

  // continue to details page
  await page.getByText(tr.common.continue, { exact: true }).click()
}

/** Dismiss the payment-success screen and return home. Two shapes coexist:
 * asset and Lightning sends keep a "Sounds good" button, while regular
 * send/receive now render WalletSuccessSplash — a single tap-to-dismiss button
 * whose accessible label ends in "Tap to go home." */
export async function dismissPaymentSuccess(page: Page, timeout = 60000): Promise<void> {
  await page.getByRole('button', { name: /Sounds good|Tap to go home/ }).click({ timeout })
}

export async function pay(page: Page, address: string, isMobile = false, sats = 0): Promise<void> {
  // insert value and address, then continue to details page
  await prePay(page, address, isMobile, sats)

  // continue to send
  await page.getByText(tr.send.tapToSign, { exact: true }).click()
  await page.getByTestId('loading-logo').waitFor({ timeout: 3000 })
  await page.waitForSelector(`text=${tr.send.paymentSent}`, { timeout: 30000 })
  await dismissPaymentSuccess(page, 30000)
}

async function receive(page: Page, type: 'btc' | 'ark' | 'invoice', isMobile = false, sats = 0): Promise<string> {
  // go to receive page
  await navigateHome(page)
  await page.getByText(tr.wallet.receive, { exact: true }).click()

  // fill amount to receive if provided
  if (sats && type === 'invoice') {
    await page.getByText(tr.receive.addAmount).click()
    if (isMobile) {
      await handleKeyboardInput(page, sats)
    } else {
      await page.locator('input[name="receive-amount-sheet"]').fill(sats.toString())
      await page.getByText(tr.receive.setAmount).click()
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

export async function navigateToSettings(page: Page): Promise<void> {
  if (
    await page
      .getByText(tr.settings.title, { exact: true })
      .isVisible()
      .catch(() => false)
  )
    return
  await navigateHome(page)
  await page.getByTestId('top-right-settings').click()
  await page.getByText(tr.settings.title, { exact: true }).waitFor({ state: 'visible', timeout: 30000 })
}

export async function resetWallet(page: Page): Promise<void> {
  await navigateToSettings(page)
  await page.getByText(tr.settings.resetWallet, { exact: true }).click()
  await page.getByTestId('checkbox').click()
  await page.getByRole('contentinfo').getByText(tr.settings.resetWallet, { exact: true }).click()
}

async function getSecret(page: Page): Promise<string> {
  await navigateToSettings(page)
  await page.getByText(tr.settings.backup, { exact: true }).click()
  // Mnemonic wallets show "View recovery phrase", legacy shows "View private key"
  const viewBtn = page.getByText(tr.backup.viewRecoveryPhrase).or(page.getByText(tr.backup.viewPrivateKey))
  await viewBtn.click()
  await page.getByText(tr.common.confirm, { exact: true }).click()
  const secret = await page.getByTestId('private-key').innerText()
  return secret
}

async function restoreWallet(page: Page, nsec: string): Promise<void> {
  await page.getByText(tr.init.otherLoginOptions).click()
  await page.getByText(tr.init.restoreWallet).click()
  await page.locator('input[name="private-key"]').fill(nsec)
  await page.getByText(tr.common.continue, { exact: true }).click()
  await waitForWalletPage(page)
}

export async function fundWallet(page: Page, amount: number = 5000): Promise<number> {
  const arkAddress = await receiveOffchain(page)
  await faucetOffchain(arkAddress, amount)
  await waitForPaymentReceived(page)
  await navigateHome(page)
  await page.getByText(tr.transaction.received).waitFor({ timeout: 10000 })
  const balanceText = await page.getByTestId('main-balance').innerText()
  const normalized = balanceText.replace(/[^\d.-]/g, '')
  const num = Number(normalized)
  if (!Number.isFinite(num)) throw new Error(`Unable to parse main balance: ${balanceText}`)
  return num
}

export async function resetAndRestoreWallet(page: Page): Promise<void> {
  const secret = await getSecret(page)
  await resetWallet(page)
  await restoreWallet(page, secret)
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
  await page.waitForSelector(`text=${tr.transaction.paymentReceived}`, { timeout: 60000 })
  await dismissPaymentSuccess(page)
}

export async function handleKeyboardInput(page: Page, sats: number): Promise<void> {
  await page.waitForSelector(`text=${tr.common.save}`, { state: 'visible' })
  const digits = sats.toString().split('')
  for (const digit of digits) {
    await page.getByTestId(`keyboard-${digit}`).click()
  }
  await page.getByText(tr.common.save, { exact: true }).click()
}

export async function getFeesFromDetails(page: Page): Promise<number> {
  const txtValue = await page.getByTestId('Network fees').textContent()
  return parseInt(txtValue?.replace(' sats', '').replaceAll(',', '') || '0')
}

export async function navigateToSwaps(page: Page): Promise<void> {
  await navigateHome(page)
  await page.getByTestId('home-action-swap').click()
  await page.waitForSelector(`text=${tr.swap.chooseAssetToSwap}`, { timeout: 2000 })
}

export const mockSolverCard = {
  version: 0,
  name: 'my-card',
  markets: [
    {
      pair: 'BTC/USDT',
      base_asset: { id: 'btc', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
      quote_asset: {
        id: 'a'.repeat(68),
        name: 'Tether',
        ticker: 'USDT',
        decimals: 8,
      },
      price_feed: 'https://example.com/price',
      price_feed_schema: { type: 'json', price_path: '/price' },
      price_decimals: 2,
      fee_bps: 1,
      min_base_amount: '1',
      max_base_amount: '100',
      min_quote_amount: '1',
      max_quote_amount: '100',
    },
  ],
}
