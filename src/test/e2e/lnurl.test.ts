import type { Browser, BrowserContext, Page, Route } from '@playwright/test'
import {
  test,
  expect,
  createWallet,
  dismissPaymentSuccess,
  fundWallet,
  handleKeyboardInput,
  navigateHome,
  prePay,
  prepareWalletPage,
  receiveOffchain,
  waitForPaymentReceived,
} from './utils'

// A reserved TLD: nothing here may reach a real LNURL server, so an unrouted request fails loudly.
const DOMAIN = 'pay.lnurl.test'
const LN_ADDRESS = `alice@${DOMAIN}`
const PAY_REQUEST_PATH = '/.well-known/lnurlp/alice'
const CALLBACK_PATH = '/lnurlp/alice/callback'

const fulfillJson = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  })

const payRequest = {
  tag: 'payRequest',
  callback: `https://${DOMAIN}${CALLBACK_PATH}`,
  minSendable: 1_000,
  maxSendable: 100_000_000,
  metadata: JSON.stringify([['text/plain', `Pay ${LN_ADDRESS}`]]),
  paymentOptions: [
    { id: 'arkade', type: 'arkade' },
    { id: 'lightning', type: 'lightning' },
  ],
}

/** Serves `alice@pay.lnurl.test`, handing out `destination` on the arkade option. */
const fakeLnurlServer = async (context: BrowserContext, destination: string): Promise<URLSearchParams[]> => {
  const callbacks: URLSearchParams[] = []
  await context.route(
    (url) => url.hostname === DOMAIN,
    (route) => {
      const url = new URL(route.request().url())
      if (url.pathname === PAY_REQUEST_PATH) return fulfillJson(route, payRequest)
      if (url.pathname !== CALLBACK_PATH) return fulfillJson(route, { status: 'ERROR', reason: 'Not found' }, 404)
      callbacks.push(url.searchParams)
      if (url.searchParams.get('paymentOption') !== 'arkade') {
        return fulfillJson(route, { status: 'ERROR', reason: 'Only the arkade option is served here' })
      }
      return fulfillJson(route, { paymentOption: 'arkade', paymentDestination: destination })
    },
  )
  return callbacks
}

// Its own context: two wallets on one origin would share localStorage.
const payeePage = async (browser: Browser): Promise<Page> => {
  const page = await (await browser.newContext()).newPage()
  await prepareWalletPage(page)
  return page
}

const balanceOf = async (page: Page): Promise<number> =>
  Number((await page.getByTestId('main-balance').innerText()).replace(/[^\d.-]/g, ''))

test('should pay a lightning address over its arkade option', async ({ page, browser, isMobile }) => {
  test.setTimeout(180_000)
  const payee = await payeePage(browser)
  try {
    await createWallet(payee)
    const payeeAddress = await receiveOffchain(payee)
    const callbacks = await fakeLnurlServer(page.context(), payeeAddress)

    await createWallet(page)
    await fundWallet(page, 5000)
    await prePay(page, LN_ADDRESS, isMobile, 2000)

    // details page: quoting on Continue is what asked the callback for a destination
    await expect(page.getByTestId('Direction')).toContainText('Paying inside Arkade')
    await expect(page.getByTestId('primary-amount')).toContainText('2,000 sats')
    await expect(page.getByTestId('Network fees')).toContainText('0 sats')
    await expect(page.getByTestId('Total')).toContainText('2,000 sats')
    // arkade outranks lightning in the router's priority, so the lightning option is never asked
    expect(callbacks.map((params) => [params.get('amount'), params.get('paymentOption')])).toEqual([
      ['2000000', 'arkade'],
    ])

    await page.getByText('Tap to Sign').click()
    await page.waitForSelector('text=Payment sent', { timeout: 30_000 })
    await expect(page.getByText('2,000 sats sent successfully')).toBeVisible()

    await dismissPaymentSuccess(page)
    await expect(page.getByText(`Sent to ${LN_ADDRESS}`, { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect.poll(() => balanceOf(page), { timeout: 30_000 }).toBe(3000)

    await waitForPaymentReceived(payee)
    await navigateHome(payee)
    await expect.poll(() => balanceOf(payee), { timeout: 30_000 }).toBe(2000)
  } finally {
    await payee.context().close()
  }
})

test('should refuse a lightning address whose payRequest is not found', async ({ page, isMobile }) => {
  const requested: string[] = []
  await page.context().route(
    (url) => url.hostname === DOMAIN,
    (route) => {
      requested.push(new URL(route.request().url()).pathname)
      return route.fulfill({ status: 404, headers: { 'Access-Control-Allow-Origin': '*' }, body: 'Not Found' })
    },
  )

  // funded, so the only thing left holding Continue back is the lnurl
  await createWallet(page)
  await fundWallet(page, 5000)

  await navigateHome(page)
  await page.getByText('Send').click()
  await page.locator('input[name="send-address"]').fill(LN_ADDRESS)
  if (isMobile) {
    await page.locator('input[name="send-amount"]').click()
    await handleKeyboardInput(page, 2000)
  } else {
    await page.locator('input[name="send-amount"]').fill('2000')
  }

  await expect(page.getByText('LNURL not found')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled()
  expect(requested).toContain(PAY_REQUEST_PATH)
})
