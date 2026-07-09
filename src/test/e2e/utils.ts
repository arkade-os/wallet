import { test as base, expect, type Page, type CDPSession } from '@playwright/test'
import { faucetOffchain } from './fundedWallet'
import { sleep } from '../../lib/sleep'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Onboarding registers a WebAuthn passkey (PRF). Plain Chromium has no
// authenticator, so credentials.create() would hang until timeout. Attach a
// virtual platform authenticator with PRF so the passkey ceremony completes
// automatically (no user interaction). Exposed via the `webauthn` fixture so
// individual tests can remove it to exercise the passwordless fallback.
export type WebAuthn = {
  client: CDPSession
  authenticatorId: string
  /** remove the authenticator so create() falls back to passwordless */
  disable: () => Promise<void>
}

async function addVirtualAuthenticator(page: Page): Promise<WebAuthn> {
  const client = await page.context().newCDPSession(page)
  await client.send('WebAuthn.enable')
  const { authenticatorId } = await client.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      ctap2Version: 'ctap2_1',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      hasPrf: true,
      automaticPresenceSimulation: true,
      isUserVerified: true,
    },
  })
  return {
    client,
    authenticatorId,
    disable: async () => {
      await client.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId }).catch(() => {})
    },
  }
}

export const test = base.extend<{ webauthn: WebAuthn }>({
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
  // auto so EVERY test gets a working authenticator without opting in; a test
  // can still declare `webauthn` in its args to disable it for passwordless
  webauthn: [
    async ({ page }, use) => {
      const webauthn = await addVirtualAuthenticator(page)
      await use(webauthn)
    },
    { auto: true },
  ],
})

export { expect }

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
export async function waitForWalletPage(page: Page, timeout = 90000): Promise<void> {
  const sendBtn = page.getByText('Send', { exact: true })
  const continueBtn = page.getByText('Continue anyway')
  await sendBtn.or(continueBtn).first().waitFor({ state: 'visible', timeout })
  if (await continueBtn.isVisible()) {
    await continueBtn.click()
    await sendBtn.waitFor({ state: 'visible', timeout: 30000 })
  }
  const dismissButton = page.getByText('Dismiss')
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

export async function navigateToAssets(page: Page): Promise<void> {
  await navigateToSettings(page)
  await page.getByText('advanced', { exact: true }).click()
  await page.getByText('Arkade Mint', { exact: true }).click()
  await page.waitForSelector('text=Arkade Mint', { state: 'visible' })
}

export async function navigateHome(page: Page): Promise<void> {
  const homeReceive = page.getByTestId('home-action-receive')
  if (await homeReceive.isVisible().catch(() => false)) return

  const backBtn = page.getByLabel('Go back')
  for (let i = 0; i < 8; i++) {
    if (await homeReceive.isVisible().catch(() => false)) return
    if (!(await backBtn.isVisible({ timeout: 300 }).catch(() => false))) break
    await backBtn.click()
    await page.waitForTimeout(200)
  }

  if (!(await homeReceive.isVisible().catch(() => false))) {
    await page.goto('/')
  }
  await homeReceive.waitFor({ state: 'visible', timeout: 30000 })
}

export async function navigateToBoltz(page: Page): Promise<void> {
  await navigateHome(page)
  await page.evaluate(() => {
    const nav = (
      window as typeof window & {
        __ARKADE_E2E_NAVIGATE__?: (page: 'AppBoltz') => void
      }
    ).__ARKADE_E2E_NAVIGATE__
    if (!nav) throw new Error('E2E navigation hook is unavailable')
    nav('AppBoltz')
  })
  await page.waitForSelector('text=Boltz', { state: 'visible', timeout: 60000 })
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
    await page.getByText('New').click()
    if (opts.ctrlAmount !== undefined) {
      const ctrlAmountInput = page.getByTestId('control-asset-amount')
      await ctrlAmountInput.clear()
      await ctrlAmountInput.fill(opts.ctrlAmount.toString())
    }
  } else if (opts.controlMode === 'existing') {
    await page.getByText('Existing').click()
  }

  // submit
  await page.getByText('Mint', { exact: true }).click()
  await page.getByTestId('loading-logo').waitFor({ timeout: 10000 })
  await page.waitForSelector('text=Asset minted!', { timeout: 60000 })
}

// The onboarding "+ Create wallet" button is disabled until the Ark server
// reports its signerPubkey (needed to derive addresses). In regtest that
// readiness can lag past a click's 30s actionability window, so wait for the
// button to become enabled — with its own generous timeout — before clicking.
async function clickCreateWallet(page: Page): Promise<void> {
  const createBtn = page.getByRole('button', { name: '+ Create wallet' })
  await expect(createBtn).toBeEnabled({ timeout: 60000 })
  await createBtn.click()
}

export async function createWallet(page: Page): Promise<void> {
  await page.goto('/')
  // A previous wallet on this browser leaves last_passkey_id behind (it survives
  // reset by design), which flips onboarding to the returning-user "Log in with
  // Passkey" layout and hides "+ Create wallet". This helper always wants a
  // fresh create, so if the create button isn't offered, drop that hint and
  // reload to get the clean-device layout.
  const createBtn = page.getByRole('button', { name: '+ Create wallet' })
  const loginBtn = page.getByRole('button', { name: 'Log in with Passkey' })
  await createBtn.or(loginBtn).first().waitFor({ state: 'visible', timeout: 30000 })
  if (!(await createBtn.isVisible().catch(() => false))) {
    await page.evaluate(() => localStorage.removeItem('last_passkey_id'))
    await page.reload()
  }
  // fresh device: '+ Create wallet' primary → confirm sheet → 'Create new wallet'.
  // (with the virtual authenticator the passkey ceremony completes silently)
  await clickCreateWallet(page)
  await page.getByRole('button', { name: 'Create new wallet' }).click()
  await waitForWalletPage(page)
}

// Create a passwordless (no-passkey) wallet by forcing the passkey ceremony to
// fail so the explicit fallback is taken. For legacy password/lock flows.
//
// We do NOT just remove the virtual authenticator: with no authenticator,
// credentials.create() hangs until the WebAuthn timeout (tens of seconds)
// rather than rejecting, so the fallback sheet appears far too late for the
// action timeout. Instead we stub create() to reject immediately, which is
// exactly the "user cancelled / unsupported" path the fallback handles.
export async function createPasswordlessWallet(page: Page, webauthn: WebAuthn): Promise<void> {
  await webauthn.disable()
  await page.goto('/')
  await page.evaluate(() => {
    navigator.credentials.create = () =>
      Promise.reject(new DOMException('passkey creation blocked for test', 'NotAllowedError'))
  })
  await clickCreateWallet(page)
  await page.getByRole('button', { name: 'Create new wallet' }).click()
  // ceremony rejects immediately → fallback sheet
  await page.getByText('Continue without passkey').click()
  await waitForWalletPage(page)
}

export async function createWalletWithFiat(page: Page): Promise<void> {
  await createWallet(page)
  await navigateToSettings(page)
  await page.getByText('display', { exact: true }).click()
  await page.getByText('currency').click()
  await page.getByText('USD').click()
  await page.getByLabel('Go back').click()
  await page.getByLabel('Go back').click()
  await navigateHome(page)
}

export async function createWalletWithPassword(page: Page, password: string, webauthn: WebAuthn): Promise<void> {
  // password flows require a NON-passkey wallet (a passkey wallet has no
  // password to change), so build the passwordless fallback wallet
  await createPasswordlessWallet(page, webauthn)
  await navigateToSettings(page)
  await page.getByText('Advanced').click()
  await page.getByText('Change password').click()
  await page.locator('div[data-testid="new-password"] input').fill(password)
  await page.locator('div[data-testid="confirm-password"] input').fill(password)
  await page.getByText('Save password').click()
  // go back from Password → Advanced → Menu, then close settings
  await page.getByLabel('Go back').click()
  await page.getByLabel('Go back').click()
  await page.getByLabel('Go back').click()
}

export async function createWalletAndGetBIP21(page: Page, isMobile?: boolean, sats?: number): Promise<string> {
  await createWallet(page)
  await sleep(1000)
  await page.getByText('Receive', { exact: true }).click()

  if (sats) {
    await page.getByText('Edit amount').click()
    if (isMobile) {
      await handleKeyboardInput(page, sats)
    } else {
      await page.locator('input[name="receive-amount-sheet"]').fill(sats.toString())
      await page.getByText('Set amount').click()
    }
  }

  await page.waitForSelector('text=Copy', { state: 'visible' })
  await page.getByText('Copy').click()
  await page.getByTestId('bip21-address-copy').click()
  const bip21 = await readClipboard(page)
  return bip21
}

export async function getInvoiceFromLND(amount = 2100): Promise<string> {
  const { stdout } = await execAsync(`docker exec lnd lncli --network=regtest addinvoice --amt ${amount}`)
  const output = stdout.trim()
  const outputJSON = JSON.parse(output)
  const invoice = outputJSON.payment_request
  return invoice
}

export async function prePay(page: Page, address: string, isMobile = false, sats = 0): Promise<void> {
  // go to send page
  await navigateHome(page)
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
  await navigateHome(page)
  await page.getByText('Receive', { exact: true }).click()

  // fill amount to receive if provided
  if (sats && type === 'invoice') {
    await page.getByText('Add amount').click()
    if (isMobile) {
      await handleKeyboardInput(page, sats)
    } else {
      await page.locator('input[name="receive-amount-sheet"]').fill(sats.toString())
      await page.getByText('Set amount').click()
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
      .getByText('Settings', { exact: true })
      .isVisible()
      .catch(() => false)
  )
    return
  await navigateHome(page)
  await page.getByTestId('top-right-settings').click()
  await page.getByText('Settings', { exact: true }).waitFor({ state: 'visible', timeout: 30000 })
}

export async function resetWallet(page: Page): Promise<void> {
  await navigateToSettings(page)
  await page.getByText('Reset wallet').click()
  await page.getByTestId('checkbox').click()
  await page.getByRole('contentinfo').getByText('Reset wallet').click()
}

async function getSecret(page: Page): Promise<string> {
  await navigateToSettings(page)
  await page.getByText('backup', { exact: true }).click()
  // Mnemonic wallets show "View recovery phrase", legacy shows "View private key"
  const viewBtn = page.getByText('View recovery phrase').or(page.getByText('View private key'))
  await viewBtn.click()
  await page.getByText('Confirm').click()
  // a passkey wallet derives the phrase asynchronously (assertPrf + HKDF) after
  // Confirm, so wait until the obfuscation is replaced before reading
  await expect(page.getByTestId('private-key')).not.toHaveText(/^\*+$/)
  const secret = await page.getByTestId('private-key').innerText()
  return secret
}

async function restoreWallet(page: Page, nsec: string): Promise<void> {
  await page.getByText('Restore wallet').click()
  await page.locator('input[name="private-key"]').fill(nsec)
  await page.getByText('Continue').click()
  // A seed restore settles on either the passkey-migration screen (a Settings
  // sub-page whose back button only returns to the Settings menu) or directly
  // on the wallet. Wait for whichever appears, then hard-navigate to the wallet
  // home if we're on the migration screen — a reload auto-unlocks the
  // default-password restored wallet, avoiding the fragile back-button walk.
  const migrateHeader = page.getByText('Move to a passkey wallet')
  const sendBtn = page.getByText('Send', { exact: true })
  await migrateHeader.or(sendBtn).first().waitFor({ state: 'visible', timeout: 60000 })
  if (await migrateHeader.isVisible().catch(() => false)) {
    await page.goto('/')
  }
  await waitForWalletPage(page)
}

export async function fundWallet(page: Page, amount: number = 5000): Promise<number> {
  const arkAddress = await receiveOffchain(page)
  await faucetOffchain(arkAddress, amount)
  await waitForPaymentReceived(page)
  await navigateHome(page)
  await page.getByText('Received').waitFor({ timeout: 10000 })
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
  return parseInt(txtValue?.replace(' sats', '').replaceAll(',', '') || '0')
}
