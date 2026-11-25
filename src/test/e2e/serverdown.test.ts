import { createServer, request } from 'node:http'
import {
  createWallet,
  createWalletWithPassword,
  expect,
  fundWallet,
  navigateHome,
  navigateToSettings,
  test,
} from './utils'
import { translations } from '../../lib/i18n'

const tr = translations.en
const regtestOperator = new URL(`http://127.0.0.1:${process.env.ARKD_PORT ?? 7070}`)

const outageTest = test.extend<{ operator: { stop: () => void; start: () => void } }>({
  operator: async ({ page }, use) => {
    let available = true
    // The proxy covers requests from both the page and its service worker.
    const server = createServer((incoming, outgoing) => {
      if (!available) {
        outgoing.setHeader('Access-Control-Allow-Origin', '*')
        outgoing.setHeader('Access-Control-Allow-Headers', '*')
        outgoing.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        if (incoming.method === 'OPTIONS') outgoing.writeHead(204).end()
        else outgoing.writeHead(503).end('Regtest operator unavailable')
        return
      }

      const upstream = request(
        regtestOperator,
        { path: incoming.url, method: incoming.method, headers: { ...incoming.headers, host: regtestOperator.host } },
        (response) => {
          outgoing.writeHead(response.statusCode ?? 502, response.headers)
          response.pipe(outgoing)
        },
      )
      upstream.on('error', () => {
        if (outgoing.headersSent) outgoing.destroy()
        else outgoing.writeHead(502).end()
      })
      outgoing.on('close', () => upstream.destroy())
      incoming.pipe(upstream)
    })
    await new Promise<void>((resolve, reject) => server.listen(0, '127.0.0.1', resolve).once('error', reject))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Operator test proxy did not bind a port')

    try {
      await page.addInitScript((aspUrl) => {
        const config = JSON.parse(localStorage.getItem('config') ?? '{}')
        localStorage.setItem('config', JSON.stringify({ ...config, aspUrl }))
      }, `http://127.0.0.1:${address.port}`)

      await use({
        stop: () => {
          available = false
          server.closeAllConnections()
        },
        start: () => {
          available = true
        },
      })
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
        server.closeAllConnections()
      })
    }
  },
})

outageTest('shows the operator error for a new wallet during an outage', async ({ page, operator }) => {
  operator.stop()
  await page.goto('/')

  await expect(page.getByText(tr.init.arkadeServerUnreachable, { exact: true })).toBeVisible()
  await expect(page.getByTestId('home-action-receive')).toHaveCount(0)
})

for (const locked of [false, true]) {
  outageTest(
    `reopens a ${locked ? 'password-protected' : 'passwordless'} wallet during an outage`,
    async ({ page, operator }) => {
      const password = 'testpassword'
      if (locked) await createWalletWithPassword(page, password)
      else await createWallet(page)
      await fundWallet(page, 10_000)
      const balance = page.getByTestId('main-balance')
      const received = page.getByText(tr.transaction.received, { exact: true })
      await expect(balance).toHaveText('10,000')
      await expect(received).toBeVisible()

      operator.stop()
      const session = await page.context().newCDPSession(page)
      await session.send('ServiceWorker.enable')
      await session.send('ServiceWorker.stopAllWorkers')
      await session.detach()
      await page.reload()

      if (locked) {
        await expect(page.getByText(tr.unlock.insertPassword)).toBeVisible()
        await expect(balance).toHaveCount(0)
        await page.locator('div[data-testid="password"] input').fill(password)
        await page.getByText(tr.unlock.unlockWallet).click()
      }

      const notice = page.getByText(tr.wallet.showingLastSyncedData, { exact: true })
      await expect(notice).toBeVisible()
      await expect(balance).toHaveText('10,000')
      await expect(received).toBeVisible()
      await expect(page.getByTestId('home-action-receive')).toBeDisabled()
      await navigateToSettings(page)
      await expect(page.getByText(tr.settings.backup, { exact: true })).toBeVisible()
      await navigateHome(page)

      operator.start()
      await page.evaluate(() => window.dispatchEvent(new Event('online')))
      await expect(notice).toHaveCount(0)
      await expect(page.getByTestId('home-action-receive')).toBeEnabled()
      await fundWallet(page, 2_000)
      await expect(balance).toHaveText('12,000')
      await expect(received).toHaveCount(2)
    },
  )
}
