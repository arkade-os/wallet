import type { Page } from '@playwright/test'

export async function createWallet(page: Page): Promise<void> {
  // when running tests in succession, it seems the servers need a bit of time to reset
  await page.waitForTimeout(2100)

  // create wallet
  await page.goto('/')
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Skip for now').click()
  await page.getByText('+ Create wallet').click()
  await page.waitForSelector('text=Your new wallet is live!', { state: 'visible' })
  await page.getByText('Go to wallet').click()
  await page.waitForSelector('text=Maybe later', { state: 'visible' })
  await page.getByText('Maybe later').click()
}

export async function pay(page: Page, address: string, isMobile: boolean, sats = 0): Promise<void> {
  // go to send page
  await page.getByTestId('tab-wallet').click()
  await page.getByText('Send').click()

  // fill address
  await page.locator('ion-input[name="send-address"] input').fill(address)

  // fill amount
  if (sats) {
    await page.locator('ion-input[name="send-amount"] input').click()
    if (isMobile) {
      await page.waitForSelector('text=Save', { state: 'visible' })
      const digits = sats.toString().split('')
      for (const digit of digits) {
        await page.getByTestId(`keyboard-${digit}`).click()
      }
      await page.getByText('Save').click()
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
      await page.waitForSelector('text=Save', { state: 'visible' })
      const digits = sats.toString().split('')
      for (const digit of digits) {
        await page.getByTestId(`keyboard-${digit}`).click()
      }
      await page.getByText('Save').click()
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
  // when running tests in succession, it seems the servers need a bit of time to reset
  // await page.waitForTimeout(2100)

  // restore wallet
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

  // wait for wallet to be restored
  await page.waitForTimeout(2100)
}

export async function resetAndRestoreWallet(page: Page): Promise<void> {
  const nsec = await getNsec(page)
  await resetWallet(page)
  await restoreWallet(page, nsec)
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
