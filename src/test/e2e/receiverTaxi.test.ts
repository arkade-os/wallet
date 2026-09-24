import { createRequire } from 'module'
import type { Page, Route } from '@playwright/test'
import { hex } from '@scure/base'
import { ArkAddress, RestArkProvider, asset, getNetwork, toXOnlySignerHex, type NetworkName } from '@arkade-os/sdk'
import { offerVtxoScript, type RfqQuote } from '@arkade-os/swap'
import { decodeReceiveQuote, type TaxiClient } from '@arkade-taxi/client'
import { finalizeEvent, generateSecretKey, getPublicKey, nip44, type Event } from 'nostr-tools'
import { decodeBip21 } from '../../lib/bip21'
import { prettyNumber } from '../../lib/format'
import {
  test,
  expect,
  createWallet,
  enableAssets,
  fundWallet,
  handleKeyboardInput,
  mintAsset,
  mockSolverCard,
  navigateHome,
  readClipboard,
} from './utils'

// The Taxi and the solver are stubs; arkd, the faucet and both wallets are real. Every case stops at the
// payer's price confirmation and cancels it, so nothing here funds, fills or claims anything.
// Alice holds no RDC: a payer who holds enough of the asset sends it directly and never asks the Taxi.

// Must equal VITE_TAXI_URL in playwright.config.ts, the only way a regtest wallet learns of a Taxi.
const TAXI_URL = 'http://localhost:7400'
const RELAY_HOST = 'relay.taxi-e2e.test'
const ARK_SERVER = 'http://localhost:7070'
// EMULATOR_PUBKEY.regtest in src/lib/constants.ts: the co-signer the wallet holds a Taxi to.
const EMULATOR_PUBKEY = '02999413c46fa10ada5cbc4bcc79a1d09160c2ba3cfc812705d7a13e5e545fb2a9'
const FARE_ID = 'flat'
const FARE = { currency: 'sats', units: '7' } as const
const PRICE_SATS = 1000n
const UNITS = 10

type TaxiInfo = Awaited<ReturnType<TaxiClient['info']>>
type TaxiQuote = Awaited<ReturnType<TaxiClient['requestReceiveQuote']>>
type CovenantParams = ReturnType<typeof decodeReceiveQuote>['params']

interface Covenant {
  DustCovenantScript: new (options: {
    serverKey: Uint8Array
    emulatorKey: Uint8Array
    params: CovenantParams
    vtxoMinAmount: bigint
  }) => { address(hrp: string, serverKey: Uint8Array): { encode(): string } }
}

// pnpm links the Taxi's covenant package beside its client only, so it is reached from there.
const { DustCovenantScript } = createRequire(require.resolve('@arkade-taxi/client'))(
  '@arkade-taxi/covenant',
) as Covenant

interface Arkd {
  serverKey: Uint8Array
  hrp: string
  dust: bigint
  vtxoMinAmount: bigint
  exitDelay: bigint
}

interface QuoteBody {
  receiverAddress: string
  makerPublicKey: string
  assetId: { txid: string; groupIndex: number }
  fareId?: string
  fundingExpiry: TaxiQuote['batchExpiry']
  payer?: 'receiver'
}

interface Rfq {
  rfq_id: string
  pair: string
  amount: string
  profile: {
    maker_pk_script: string
    maker_public_key: string
    carrier: { mode: 'purchase' } | { mode: 'recycle_receiver'; quote_id: string; taxi_url: string; taxi_key: string }
  }
}

interface TaxiStub {
  paths: string[]
  bodies: QuoteBody[]
  quotes: TaxiQuote[]
}

const readArkd = async (): Promise<Arkd> => {
  const info = await new RestArkProvider(ARK_SERVER).getInfo()
  return {
    serverKey: hex.decode(toXOnlySignerHex(info.signerPubkey)),
    hrp: getNetwork(info.network as NetworkName).hrp,
    dust: info.dust,
    vtxoMinAmount: info.vtxoMinAmount,
    exitDelay: info.unilateralExitDelay,
  }
}

const taxiInfo = (arkd: Arkd, operatorKey: string, assetId: string): TaxiInfo => {
  const id = asset.AssetId.fromString(assetId)
  return {
    protocolVersion: 1,
    operatorKey,
    serverKey: hex.encode(arkd.serverKey),
    emulatorKey: EMULATOR_PUBKEY.slice(2),
    arkdUrl: ARK_SERVER,
    emulatorUrl: 'http://localhost:7073',
    dust: arkd.dust.toString(),
    vtxoMinAmount: arkd.vtxoMinAmount.toString(),
    assetRules: [
      {
        assetId: { txid: hex.encode(Uint8Array.from(id.txid).reverse()), groupIndex: id.groupIndex },
        enabled: true,
        claim: 'either',
        maxTopupSats: null,
        unclaimedMode: 'reclaim',
        fares: [{ id: FARE_ID, currency: FARE.currency, pricing: { kind: 'flat', units: FARE.units } }],
      },
    ],
    maxPerPaymentTopupSats: arkd.dust.toString(),
    paused: false,
  }
}

/** Floored at the payer's earliest coin, as asked, and recoverable an hour before that. */
const receiveQuote = (body: QuoteBody, arkd: Arkd, operatorKey: string): TaxiQuote => {
  const now = Math.floor(Date.now() / 1000)
  const floor = body.fundingExpiry
  const recovery = { kind: floor.kind, value: (BigInt(floor.value) - 3600n).toString() }
  const receiver = ArkAddress.decode(body.receiverAddress)
  const quote: TaxiQuote = {
    quoteId: `rq-${now}`,
    state: 'quoted',
    receiverAddress: body.receiverAddress,
    makerPublicKey: body.makerPublicKey,
    params: {
      receiverKey: hex.encode(receiver.vtxoTaprootKey),
      senderKey: body.makerPublicKey,
      operatorKey,
      dust: arkd.dust.toString(),
      topup: arkd.dust.toString(),
      assetId: body.assetId,
      locktime: recovery.value,
      recoveryRecipient: 'receiver',
      claimMode: 'recycle',
      receiverFare: FARE,
    },
    covenantAddress: body.receiverAddress,
    fare: { currency: 'sats', units: '0' },
    batchExpiry: floor,
    inputExpiryFloor: floor,
    recoveryLocktime: recovery,
    createdAt: now,
    expiresAt: now + 900,
    payer: 'receiver',
    receiverFare: FARE,
    unclaimedMode: 'reclaim',
  }
  const covenant = new DustCovenantScript({
    serverKey: arkd.serverKey,
    emulatorKey: hex.decode(EMULATOR_PUBKEY.slice(2)),
    params: decodeReceiveQuote(quote).params,
    vtxoMinAmount: arkd.vtxoMinAmount,
  })
  return { ...quote, covenantAddress: covenant.address(receiver.hrp, arkd.serverKey).encode() }
}

/** Priced at PRICE_SATS plus any carrier sold, with the offer address the wallet derives itself. */
const solverQuote = (rfq: Rfq, arkd: Arkd, assetId: string, solverPubkey: string, taxi?: TaxiStub): RfqQuote => {
  const { carrier } = rfq.profile
  const receiverPaid = carrier.mode === 'recycle_receiver'
  const taxiQuote = receiverPaid ? taxi?.quotes.find((quote) => quote.quoteId === carrier.quote_id) : undefined
  const expiresAt = taxiQuote?.expiresAt ?? Math.floor(Date.now() / 1000) + 300
  const offer = offerVtxoScript(
    {
      wantAmount: BigInt(rfq.amount),
      wantAsset: asset.AssetId.fromString(assetId),
      makerPkScript: hex.decode(rfq.profile.maker_pk_script),
      makerPublicKey: hex.decode(rfq.profile.maker_public_key),
      emulatorPubkey: hex.decode(EMULATOR_PUBKEY.slice(2)),
      exitDelay: { type: arkd.exitDelay < 512n ? 'blocks' : 'seconds', value: arkd.exitDelay },
    },
    arkd.serverKey,
  )
  const dust = arkd.dust.toString()
  return {
    v: 1,
    type: 'rfq_quote',
    rfq_id: rfq.rfq_id,
    pair: rfq.pair,
    from_amount: (PRICE_SATS + (receiverPaid ? 0n : arkd.dust)).toString(),
    to_amount: rfq.amount,
    ...(receiverPaid ? {} : { carrier_sats: dust }),
    solver_pubkey: solverPubkey,
    valid_until: expiresAt,
    profile: {
      offer_address: offer.address(arkd.hrp, arkd.serverKey).encode(),
      offer_pk_script: hex.encode(offer.pkScript),
      carrier: {
        ...carrier,
        physical_sats: dust,
        loan_sats: receiverPaid ? dust : '0',
        receipt_sats: '0',
        service_fare_sats: '0',
        priced_sats: receiverPaid ? '0' : dust,
        expires_at: expiresAt,
      },
    },
  }
}

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(body),
  })

/** The Taxi at TAXI_URL; without `info` nothing answers there at all. */
const serveTaxi = async (page: Page, info?: TaxiInfo, quote?: (body: QuoteBody) => TaxiQuote) => {
  const stub: TaxiStub = { paths: [], bodies: [], quotes: [] }
  await page.route(`${TAXI_URL}/**`, async (route) => {
    const request = route.request()
    const path = `${request.method()} ${new URL(request.url()).pathname}`
    stub.paths.push(path)
    if (!info) return route.abort('connectionrefused')
    if (path === 'GET /v1/info') return json(route, info)
    if (path === 'POST /v1/receive-quotes' && quote) {
      const body: QuoteBody = request.postDataJSON()
      const answer = quote(body)
      stub.bodies.push(body)
      stub.quotes.push(answer)
      return json(route, answer)
    }
    return json(route, { code: 'NOT_FOUND', error: path }, 404)
  })
  return stub
}

/** A NIP-01 relay only this page reaches, with a solver on it whose key the test holds. */
const serveSolver = async (page: Page, arkd: Arkd, assetId: string, taxi?: TaxiStub) => {
  const secret = generateSecretKey()
  const solver = { pubkey: getPublicKey(secret), rfqs: [] as Rfq[] }
  await page.routeWebSocket(
    (url) => url.host === RELAY_HOST,
    (ws) => {
      let subscription: string | undefined
      const pending: Event[] = []
      const deliver = () => {
        if (subscription) for (const event of pending.splice(0)) ws.send(JSON.stringify(['EVENT', subscription, event]))
      }
      ws.onMessage((raw) => {
        const [type, ...args] = JSON.parse(raw.toString())
        if (type === 'REQ') {
          subscription = args[0]
          ws.send(JSON.stringify(['EOSE', subscription]))
          return deliver()
        }
        if (type !== 'EVENT') return
        const event: Event = args[0]
        ws.send(JSON.stringify(['OK', event.id, true, '']))
        const key = nip44.v2.utils.getConversationKey(secret, event.pubkey)
        const rfq: Rfq = JSON.parse(nip44.v2.decrypt(event.content, key))
        solver.rfqs.push(rfq)
        const quote = solverQuote(rfq, arkd, assetId, solver.pubkey, taxi)
        const reply = {
          kind: event.kind,
          created_at: Math.floor(Date.now() / 1000),
          tags: [['p', event.pubkey]],
          content: nip44.v2.encrypt(JSON.stringify(quote), key),
        }
        pending.push(finalizeEvent(reply, secret))
        deliver()
      })
    },
  )
  return solver
}

const pinSolver = (page: Page, solverPubkey: string, assetId: string) =>
  page.addInitScript((pinned) => localStorage.setItem('solverCards', JSON.stringify([pinned])), {
    network: 'regtest',
    label: 'taxi-e2e',
    card: {
      ...mockSolverCard,
      name: 'taxi-e2e',
      discovery_pubkey: solverPubkey,
      transports: { nostr: { relays: [`wss://${RELAY_HOST}`] } },
      markets: [
        {
          ...mockSolverCard.markets[0],
          pair: 'BTC/RDC',
          quote_asset: { id: assetId, name: 'RideCoin', ticker: 'RDC', decimals: 0 },
        },
      ],
    },
  })

const consoleErrors = (page: Page) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  return errors
}

const payRequest = async (page: Page, uri: string) => {
  await navigateHome(page)
  await page.getByText('Send', { exact: true }).click()
  await page.locator('input[name="send-address"]').fill(uri)
  const next = page.getByRole('button', { name: 'Continue', exact: true })
  await expect(next).toBeEnabled({ timeout: 30_000 })
  await next.click()
}

/** The only sheet the payer is shown: one price, and nothing about a Taxi. */
const confirmation = async (page: Page) => {
  const sheets = page.locator('[data-slot="drawer-content"]').filter({ visible: true })
  const confirm = sheets.filter({ hasText: 'Confirm payment' })
  await expect(confirm).toBeVisible({ timeout: 30_000 })
  await expect(sheets).toHaveCount(1)
  await expect(confirm).not.toContainText(/taxi/i)
  return confirm
}

test.describe.serial('receiver-chosen Taxi', () => {
  const operatorKey = getPublicKey(generateSecretKey())
  let arkd: Arkd
  let bob: { uri: string; assetId: string; arkAddress: string }

  test.beforeAll(async () => {
    arkd = await readArkd()
  })

  test("Bob's asset request carries the Taxi he chose", async ({ page, isMobile }) => {
    test.setTimeout(180_000)
    await createWallet(page)
    await fundWallet(page)
    await enableAssets(page)
    await mintAsset(page, { amount: '1000', name: 'RideCoin', ticker: 'RDC', decimals: 0 })
    await page.getByText('Back to Arkade Mint').click()

    const row = page.getByTestId(/^asset-row-RDC-/).first()
    const assetId = (await row.getAttribute('data-testid'))!.replace('asset-row-RDC-', '')
    expect(assetId).toMatch(/^[0-9a-f]{68}$/)
    await serveTaxi(page, taxiInfo(arkd, operatorKey, assetId))
    await row.click()
    await page.getByText('Receive', { exact: true }).click()

    await page.getByText('Add amount').click()
    if (isMobile) {
      await handleKeyboardInput(page, UNITS)
    } else {
      await page.locator('input[name="receive-amount-sheet"]').fill(UNITS.toString())
      await page.getByText('Set amount').click()
    }

    await page.getByRole('button', { name: 'Taxi: off' }).click()
    await page.getByRole('option', { name: `${FARE_ID} · ${FARE.units} sats` }).click()
    await expect(page.getByRole('button', { name: `Taxi: ${FARE_ID} · ${FARE.units} sats` })).toBeVisible()

    await page.getByText('Copy', { exact: true }).click()
    await expect.poll(() => readClipboard(page)).toContain('&taxikey=')
    const uri = await readClipboard(page)
    const params = new URLSearchParams(uri.slice(uri.indexOf('?') + 1))
    expect(params.get('taxi')).toBe(TAXI_URL)
    expect(params.get('taxikey')).toBe(operatorKey)
    expect(params.get('taxifare')).toBe(FARE_ID)

    const decoded = decodeBip21(uri)
    expect(decoded.taxi).toEqual({ url: TAXI_URL, operatorKey, fareId: FARE_ID })
    expect(decoded.assetId).toBe(assetId)
    expect(decoded.assetAmount).toBe(UNITS.toString())
    bob = { uri, assetId, arkAddress: decoded.arkAddress! }
  })

  test("Alice's wallet takes Bob's Taxi, and confirms a price with no carrier bought", async ({ page }) => {
    test.setTimeout(120_000)
    const errors = consoleErrors(page)
    const taxi = await serveTaxi(page, taxiInfo(arkd, operatorKey, bob.assetId), (body) =>
      receiveQuote(body, arkd, operatorKey),
    )
    const solver = await serveSolver(page, arkd, bob.assetId, taxi)
    await pinSolver(page, solver.pubkey, bob.assetId)
    await createWallet(page)
    await fundWallet(page)
    await payRequest(page, bob.uri)

    await expect(async () => expect(solver.rfqs, errors.join('\n')).not.toHaveLength(0)).toPass({ timeout: 60_000 })
    expect(taxi.bodies).toEqual([
      expect.objectContaining({ receiverAddress: bob.arkAddress, payer: 'receiver', fareId: FARE_ID }),
    ])
    const [quote] = taxi.quotes
    const [rfq] = solver.rfqs
    expect(rfq.profile.carrier).toEqual({
      mode: 'recycle_receiver',
      quote_id: quote.quoteId,
      taxi_url: TAXI_URL,
      taxi_key: operatorKey,
    })
    expect(rfq.profile.maker_pk_script).toBe(hex.encode(ArkAddress.decode(quote.covenantAddress).pkScript))

    const confirm = await confirmation(page)
    await expect(confirm).toContainText(`Pay ${prettyNumber(Number(PRICE_SATS))} sats`)
    expect(solver.rfqs, errors.join('\n')).toHaveLength(1)
    await confirm.getByRole('button', { name: 'Cancel' }).click()
    await expect(confirm).toBeHidden()
  })

  test("With Bob's Taxi unreachable, Alice's wallet buys a carrier and asks nothing about it", async ({ page }) => {
    test.setTimeout(120_000)
    const errors = consoleErrors(page)
    const taxi = await serveTaxi(page)
    const solver = await serveSolver(page, arkd, bob.assetId)
    await pinSolver(page, solver.pubkey, bob.assetId)
    await createWallet(page)
    await fundWallet(page)
    await payRequest(page, bob.uri)

    await expect(async () => expect(solver.rfqs, errors.join('\n')).not.toHaveLength(0)).toPass({ timeout: 60_000 })
    expect(taxi.paths).toContain('GET /v1/info')
    expect(taxi.paths).not.toContain('POST /v1/receive-quotes')
    const [rfq] = solver.rfqs
    expect(rfq.profile.carrier).toEqual({ mode: 'purchase' })
    expect(rfq.profile.maker_pk_script).toBe(hex.encode(ArkAddress.decode(bob.arkAddress).pkScript))

    const confirm = await confirmation(page)
    await expect(confirm).toContainText(`Pay ${prettyNumber(Number(PRICE_SATS + arkd.dust))} sats`)
    expect(solver.rfqs, errors.join('\n')).toHaveLength(1)
    await confirm.getByRole('button', { name: 'Cancel' }).click()
    await expect(confirm).toBeHidden()
  })
})
