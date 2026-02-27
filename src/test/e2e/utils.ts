import { test as base, type Page } from '@playwright/test'
import { exec } from 'child_process'

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await use(page)
  },
})

export { expect } from '@playwright/test'

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
  await page.getByTestId('app-assets').click()
  await page.waitForSelector('text=Assets', { state: 'visible' })
}

export async function mintAsset(page: Page, opts: MintAssetOptions): Promise<void> {
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
  await page.waitForSelector('text=Asset minted!', { state: 'visible', timeout: 30000 })
}

export async function createWallet(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Skip for now').click()
  await page.getByText('+ Create wallet').click()
  await page.waitForSelector('text=Your new wallet is live!', { state: 'visible' })
  await page.getByText('Go to wallet').click()
  const maybeLater = page.getByRole('button', { name: 'Maybe later' })
  await maybeLater.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {})
  if (await maybeLater.isVisible()) {
    await maybeLater.click({ force: true })
    await maybeLater.waitFor({ state: 'hidden' }).catch(() => {})
  }
}

export async function createWalletWithPassword(page: Page, password: string): Promise<void> {
  await createWallet(page)
  await page.getByTestId('tab-settings').click()
  await page.getByText('Advanced').click()
  await page.getByText('Change password').click()
  await page.locator('div[data-testid="new-password"] input').fill(password)
  await page.locator('div[data-testid="confirm-password"] input').fill(password)
  await page.getByText('Save password').click()
  await page.getByTestId('tab-wallet').click()
}

export async function pay(page: Page, address: string, isMobile = false, sats = 0): Promise<void> {
  // go to send page
  await page.getByTestId('tab-wallet').click()
  await page.getByText('Send').click()

  // fill address
  await page.locator('ion-input[name="send-address"] input').fill(address)

  // fill amount
  if (sats) {
    if (isMobile) {
      await page.locator('ion-input[name="send-amount"] input').click()
      await handleKeyboardInput(page, sats)
    } else {
      await page.locator('ion-input[name="send-amount"] input').fill(sats.toString())
    }
  }

  // continue to send
  await page.getByText('Continue').click()
  await page.getByText('Tap to Sign').click()
  await page.waitForSelector('text=Payment sent!')
}

async function receive(page: Page, type: 'btc' | 'ark' | 'invoice', isMobile = false, sats = 0): Promise<string> {
  // go to receive page
  await page.getByTestId('tab-wallet').click()
  await page.getByText('Receive').click()

  // fill amount to receive if provided
  if (sats) {
    if (isMobile) {
      await page.locator('ion-input[name="receive-amount"] input').click()
      await handleKeyboardInput(page, sats)
    } else {
      await page.locator('ion-input[name="receive-amount"] input').fill(sats.toString())
    }
    await page.getByText('Continue').click()
  } else {
    await page.getByText('Skip').click()
  }

  // copy address/invoice
  await page.getByTestId('expand-addresses').click()
  await page.getByTestId(`${type}-address-copy`).click()
  return await readClipboard(page)
}

export async function receiveOnchain(page: Page): Promise<string> {
  return receive(page, 'btc')
}

export async function receiveOffchain(page: Page): Promise<string> {
  return receive(page, 'ark')
}

export async function receiveLightning(page: Page, isMobile: boolean, sats: number): Promise<string> {
  return receive(page, 'invoice', isMobile, sats)
}

async function getNsec(page: Page): Promise<string> {
  await page.getByTestId('tab-settings').click()
  await page.getByText('backup', { exact: true }).click()
  await page.getByText('View private key').click()
  await page.getByText('Confirm').click()
  const nsec = await page.getByTestId('private-key').innerText()
  return nsec
}

async function resetWallet(page: Page): Promise<void> {
  await page.getByTestId('tab-settings').click()
  await page.getByText('Reset wallet').click()
  await page.getByText('I have backed up my wallet').click()
  await page.getByRole('contentinfo').getByText('Reset wallet').click()
}

async function restoreWallet(page: Page, nsec: string): Promise<void> {
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Skip for now').click()
  await page.getByText('Other login options').click()
  await page.getByText('Restore wallet').click()
  await page.locator('ion-input[name="private-key"] input').fill(nsec)
  await page.getByText('Continue').click()
  await page.getByText('Go to wallet').click()
  await page.getByText('Maybe later').click()
}

export async function fundWallet(page: Page, amount: number = 5000): Promise<void> {
  const arkAddress = await receiveOffchain(page)
  exec(`docker exec -t arkd ark send --to ${arkAddress} --amount ${amount} --password secret`)
  await waitForPaymentReceived(page)
  await page.getByTestId('tab-wallet').click()
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
  await page.waitForSelector('text=Payment received!')
}

async function handleKeyboardInput(page: Page, sats: number): Promise<void> {
  await page.waitForSelector('text=Save', { state: 'visible' })
  const digits = sats.toString().split('')
  for (const digit of digits) {
    await page.getByTestId(`keyboard-${digit}`).click()
  }
  await page.getByText('Save').click()
}
