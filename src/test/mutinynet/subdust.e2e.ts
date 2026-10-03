import { expect, test, type Page } from '@playwright/test'
import { randomBytes } from 'node:crypto'
import { schnorr } from '@noble/curves/secp256k1.js'
import { hex } from '@scure/base'
import { navigateHome, waitForWalletPage } from '../e2e/utils'
import { translations } from '../../lib/i18n'

const tr = translations.en
const TAXI = 'https://taxi.mutinynet.arkade.sh'
const FAILED_TRANSFER = 't-smoke'

type Info = {
  operatorKey: string
  paused: boolean
  assetRules: { assetId: unknown; claim: string; enabled: boolean }[]
}

const openSend = async (page: Page, recipient: string) => {
  await navigateHome(page)
  await page.getByText(tr.wallet.send, { exact: true }).click()
  await page.locator('input[name="send-address"]').fill(recipient)
}

const shot = async (page: Page, name: string) =>
  page.screenshot({ path: test.info().outputPath(`${name}.png`), fullPage: true })

test('sub-dust bitcoin through the Taxi, on live mutinynet without moving money', async ({ page }) => {
  // Nostr is the only page WebSocket: mocked, no restore lookup or Lightning quote leaves the browser.
  await page.routeWebSocket(/.*/, () => {})
  await page.addInitScript(() => {
    const config = JSON.parse(localStorage.getItem('config') ?? '{}')
    localStorage.setItem('config', JSON.stringify({ ...config, currency: 'BTC', unit: 'sats' }))
  })
  const live = (await (await page.request.get(`${TAXI}/v1/info`)).json()) as Info
  const secret = randomBytes(32)

  await page.goto('/')
  await page.getByText(tr.init.otherLoginOptions).click()
  await page.getByText(tr.init.restoreWallet).click()
  await page.locator('input[name="private-key"]').fill(hex.encode(secret))
  await page.getByText(tr.common.continue, { exact: true }).click()
  await waitForWalletPage(page)
  await page.getByText(tr.wallet.receive, { exact: true }).click()
  await expect(page.getByTestId('bip21')).toContainText('ark=')
  const address = new URLSearchParams((await page.getByTestId('bip21').textContent())!.split('?')[1]).get('ark')!
  const request = (amount: string) => `bitcoin:?ark=${address}&amount=${amount}`

  const bitcoinRule = live.assetRules.find((rule) => rule.assetId === null)

  await test.step('the live Taxi is offered whenever it runs its bitcoin rule', async () => {
    await openSend(page, request('0.000001'))
    const offered = !live.paused && bitcoinRule?.enabled === true
    await expect(offered ? page.getByTestId('taxi-send-mode') : page.getByText(/^Taxi unavailable: /)).toBeVisible()
    await shot(page, '1-live-taxi')
  })

  const running = { ...live, paused: false }
  await page.route(`${TAXI}/v1/info`, (route) => route.fulfill({ json: running }))
  const claim = bitcoinRule!.claim
  const carriers = [
    'No Taxi: sub-dust coin',
    ...(claim === 'purchase' ? [] : ['Receiver uses own sats']),
    ...(claim === 'recycle' ? [] : ['Receiver needs no sats']),
    'Direct delivery, no claim',
  ]

  await test.step('a running Taxi offers the carriers its bitcoin rule allows', async () => {
    await openSend(page, request('0.000001'))
    const carrier = page.getByTestId('taxi-send-mode')
    await expect(carrier).toHaveText('Carrier: No Taxi: sub-dust coin')
    await carrier.click()
    await expect(page.getByRole('menuitem')).toHaveText(carriers)
    await page.getByRole('menuitem', { name: 'Receiver uses own sats' }).click()
    await expect(carrier).toHaveText('Carrier: Receiver uses own sats')
    await shot(page, '2-carrier-menu')
  })

  await test.step('the offer follows the amount across the dust boundary', async () => {
    const amount = page.locator('input[name="send-amount"]')
    await amount.fill('329')
    await expect(page.getByTestId('taxi-send-mode')).toHaveText('Carrier: No Taxi: sub-dust coin')
    await amount.fill('330')
    await expect(page.getByTestId('taxi-send-mode')).toHaveCount(0)
    await expect(page.getByText(/^Taxi unavailable|^Checking Taxi/)).toHaveCount(0)
    await shot(page, '3-at-dust')
  })

  await test.step('a sub-dust request names the Taxi and its fare', async () => {
    await navigateHome(page)
    await page.getByText(tr.wallet.receive, { exact: true }).click()
    await page.getByRole('button', { name: tr.receive.addAmount, exact: true }).click()
    await page.locator('input[name="receive-amount-sheet"]').fill('100')
    await page.getByRole('button', { name: tr.receive.setAmount, exact: true }).click()
    await page.getByRole('button', { name: 'Taxi: off', exact: true }).click()
    await page.getByRole('option', { name: 'sats · 0 sats', exact: true }).click()
    await expect(page.getByTestId('bip21')).toContainText(
      `amount=0.000001&taxi=${encodeURIComponent(TAXI)}&taxikey=${running.operatorKey}&taxifare=sats`,
    )
    await expect(
      page.getByText(
        'The payer pays this fare, and it arrives as a full 330-sat coin. Claiming may need a coin of at least ' +
          "230 sats of your own, and you have none; if you can't claim it, it can go back to the payer.",
      ),
    ).toBeVisible()
    await shot(page, '4-receive-request')
  })

  await test.step('a payment the Taxi failed to submit stops at once, and can be forgotten', async () => {
    const key = `directTaxiPending:mutinynet:${hex.encode(schnorr.getPublicKey(secret))}`
    await page.route(`${TAXI}/v1/transfers/${FAILED_TRANSFER}`, (route) =>
      route.fulfill({
        json: {
          transferId: FAILED_TRANSFER,
          state: 'locking',
          submissionPhase: 'failed',
          failureCode: 'lockup_submission_invalid_provider_response',
          failureDetail: 'server checkpoint 0 changed unsigned fields or metadata',
          updatedAt: 1,
        },
      }),
    )
    const record = {
      network: 'mutinynet',
      senderKey: hex.encode(schnorr.getPublicKey(secret)),
      taxiUrl: TAXI,
      operatorKey: running.operatorKey,
      transferId: FAILED_TRANSFER,
      expectedTxid: 'a'.repeat(64),
      expectedVout: 0,
      mode: 'recycle',
      receiverAddress: address,
      assetAmount: '100',
    }
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, JSON.stringify(record)])
    await navigateHome(page)
    await page.getByText(tr.wallet.send, { exact: true }).click()
    const check = page.getByRole('button', { name: 'Check Taxi payment', exact: true })
    await expect(check).toBeEnabled()
    await check.click()
    await expect(
      page.getByText(
        'Taxi could not submit this payment: server checkpoint 0 changed unsigned fields or metadata ' +
          '(lockup_submission_invalid_provider_response). ' +
          'It has not been delivered yet; the Taxi operator may still complete it.',
      ),
    ).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(`Taxi transfer ${FAILED_TRANSFER}: its coins may stay locked`)).toContainText(
      'if the operator later completes it, sending again pays the receiver twice',
    )
    await shot(page, '5-failed-submission')
    await page.getByRole('button', { name: 'Forget Taxi payment', exact: true }).click()
    await expect(check).toHaveCount(0)
    expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBeNull()
  })
})
