import { afterEach, beforeAll, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { act, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { SingleKey } from '@arkade-os/sdk'
import { useState, type ReactNode } from 'react'
import { encodeLnurl } from '@arkade-os/lnurl-client/arkade'
import { FlowContext } from '../../../providers/flow'
import { LimitsContext } from '../../../providers/limits'
import { AspContext } from '../../../providers/asp'
import { WalletContext } from '../../../providers/wallet'
import { NavigationContext } from '../../../providers/navigation'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { NotificationsContext } from '../../../providers/notifications'
import { SwapsContext } from '../../../providers/swaps'
import { ToastProvider } from '../../../components/Toast'
import ReceiveQRCode from '../../../screens/Wallet/Receive/QrCode'
import {
  mockAspContextValue,
  mockConfigContextValue,
  mockFiatContextValue,
  mockFlowContextValue,
  mockLimitsContextValue,
  mockNavigationContextValue,
  mockSvcWallet,
  mockWalletContextValue,
} from '../mocks'
import type { Config } from '../../../lib/types'
import {
  BTC_USD,
  DECODABLE_ARK,
  LNURL_BASE,
  TOKEN_DEPOSITS,
  WALLET_BOARDING_ADDRESS,
  arbitrumUri,
  fakeInvoice,
  fakeLnurlServer,
  holdQuotes,
  namedAddress,
  namelessAddress,
  solanaUri,
} from '../../lib/receive/fakeLnurlServer'

// Every wait here sits behind a receiver load (signing, then fetches), which a full parallel run stretches past 1s.
configure({ asyncUtilTimeout: 3_000 })

// Every value the QR is rendered with, including renders the DOM no longer shows by the time a test looks.
const qrValues = vi.hoisted(() => [] as string[])
vi.mock('../../../components/QrCode', () => ({
  default: ({ value }: { value: string }) => {
    qrValues.push(value)
    return null
  },
}))
const copyToClipboard = vi.fn<(value: string) => Promise<void>>(async () => {})
vi.mock('../../../lib/clipboard', () => ({ copyToClipboard: (v: string) => copyToClipboard(v) }))
const share = vi.hoisted(() => ({ can: false, shareData: vi.fn() }))
vi.mock('../../../lib/share', () => ({
  canBrowserShareData: () => share.can,
  shareData: (data: unknown) => share.shareData(data),
}))
const browser = vi.hoisted(() => ({ mobile: false }))
vi.mock('../../../lib/browser', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/browser')>()),
  get isMobileBrowser() {
    return browser.mobile
  },
}))

beforeAll(() => {
  if (!navigator.serviceWorker) {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { addEventListener: vi.fn(), removeEventListener: vi.fn(), ready: Promise.resolve({}) },
      writable: true,
    })
  }
})

const receiveLightning = vi.fn()
const svcWallet = { ...mockSvcWallet, identity: SingleKey.fromHex('03'.repeat(32)) }
const atMarket = (sats: number) => (sats * BTC_USD) / 1e8

function ReceiveFlow({ children, satoshis, recv }: { children: ReactNode; satoshis: number; recv: object }) {
  const [recvInfo, setRecvInfo] = useState({
    ...mockFlowContextValue.recvInfo,
    satoshis,
    offchainAddr: DECODABLE_ARK,
    boardingAddr: WALLET_BOARDING_ADDRESS,
    ...recv,
  })
  return (
    <FlowContext.Provider value={{ ...mockFlowContextValue, recvInfo, setRecvInfo } as never}>
      {children}
    </FlowContext.Provider>
  )
}

const receiveTree = (satoshis = 0, config: Partial<Config> = {}, recv: object = {}, statefulFlow = false) => (
  <ToastProvider>
    <NavigationContext.Provider value={mockNavigationContextValue}>
      <AspContext.Provider value={mockAspContextValue as never}>
        <ConfigContext.Provider
          value={{ ...mockConfigContextValue, config: { ...mockConfigContextValue.config, ...config } } as never}
        >
          <FiatContext.Provider value={{ ...mockFiatContextValue, toFiatAmount: atMarket } as never}>
            <NotificationsContext.Provider value={{ notifyPaymentReceived: () => {} } as never}>
              <FlowContext.Provider
                value={
                  {
                    ...mockFlowContextValue,
                    setRecvInfo: vi.fn(),
                    recvInfo: {
                      ...mockFlowContextValue.recvInfo,
                      satoshis,
                      offchainAddr: DECODABLE_ARK,
                      boardingAddr: WALLET_BOARDING_ADDRESS,
                      ...recv,
                    },
                  } as never
                }
              >
                <WalletContext.Provider value={{ ...mockWalletContextValue, svcWallet } as never}>
                  <LimitsContext.Provider value={mockLimitsContextValue}>
                    <SwapsContext.Provider
                      value={{ receiveLightning, outcomeOf: () => undefined, errorOf: () => undefined } as never}
                    >
                      {statefulFlow ? (
                        <ReceiveFlow satoshis={satoshis} recv={recv}>
                          <ReceiveQRCode />
                        </ReceiveFlow>
                      ) : (
                        <ReceiveQRCode />
                      )}
                    </SwapsContext.Provider>
                  </LimitsContext.Provider>
                </WalletContext.Provider>
              </FlowContext.Provider>
            </NotificationsContext.Provider>
          </FiatContext.Provider>
        </ConfigContext.Provider>
      </AspContext.Provider>
    </NavigationContext.Provider>
  </ToastProvider>
)
const renderReceive = (satoshis = 0, config: Partial<Config> = {}, recv: object = {}, statefulFlow = false) =>
  render(receiveTree(satoshis, config, recv, statefulFlow))

let server: ReturnType<typeof fakeLnurlServer>
const serve = (opts: Parameters<typeof fakeLnurlServer>[0]) => {
  server = fakeLnurlServer(opts)
  vi.stubGlobal('fetch', server.fetch)
}

const copiedQr = async (): Promise<string> => {
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copy QR code' })))
  return copyToClipboard.mock.calls.at(-1)![0]
}

const qrLightning = async (): Promise<string | null> =>
  new URLSearchParams((await copiedQr()).split('?')[1]).get('lightning')

const callbacks = () =>
  server.fetch.mock.calls
    .map(([input]) => new URL(String(input)))
    .filter((url) => url.pathname.startsWith('/callback/'))

beforeEach(() => {
  receiveLightning.mockReset()
  copyToClipboard.mockClear()
  vi.stubEnv('VITE_LNURL_SERVER', LNURL_BASE)
  vi.stubEnv('VITE_LNURL_DOMAIN', '')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('Receive screen, rail composition', () => {
  it('negotiates through the swap rail and never calls an lnurl-server when none is configured', async () => {
    vi.stubEnv('VITE_LNURL_SERVER', '')
    serve({ modes: ['self'] })
    receiveLightning.mockResolvedValue({ id: 'swap-id', invoice: 'lnbc10mock' })
    renderReceive(10_000)

    await waitFor(() => expect(receiveLightning).toHaveBeenCalledWith(10_000))
    expect(server.fetch).not.toHaveBeenCalled()
    expect(screen.queryByText(/lightning address/i)).not.toBeInTheDocument()
  })

  it('does not negotiate a swap when an lnurl-server is configured', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')] })
    renderReceive(10_000)

    expect(await screen.findByText('alice@lnurl.test')).toBeInTheDocument()
    expect(receiveLightning).not.toHaveBeenCalled()
  })

  it('falls back to the swap rail when the configured lnurl-server is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    receiveLightning.mockResolvedValue({ id: 'swap-id', invoice: 'lnbc10mock' })
    renderReceive(10_000)

    await waitFor(() => expect(receiveLightning).toHaveBeenCalledWith(10_000))
    expect(await screen.findByText(/^Lightning address unavailable: /)).toBeInTheDocument()
  })

  it.each([
    { label: 'API-keyed', modes: ['self', 'random', 'session'], requireApiKey: true },
    { label: 'random-only', modes: ['random'] },
    { label: 'admin-only', modes: ['admin'] },
    { label: 'admin and random', modes: ['admin', 'random'] },
  ])('uses a swap invoice when $label onboarding offers no claim control', async ({ modes, requireApiKey }) => {
    serve({ modes, requireApiKey })
    const invoice = fakeInvoice(10_000_000)
    receiveLightning.mockResolvedValue({ id: 'fallback-swap', invoice, payAmount: 10_000 })
    renderReceive(10_000, {}, {}, true)

    await waitFor(() => expect(receiveLightning).toHaveBeenCalledWith(10_000))
    await waitFor(async () => expect(await qrLightning()).toBe(invoice))
    expect(screen.queryByPlaceholderText('Choose a name')).not.toBeInTheDocument()
    expect(server.calls('POST', '/lnurl/address')).toHaveLength(0)
  })

  it('does not negotiate a swap while LNURL discovery is still loading', async () => {
    serve({ modes: ['self'] })
    const inner = server.fetch
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      if (new URL(String(input)).pathname === '/lnurl/domain') await gate
      return inner(input, init)
    })
    renderReceive(10_000)

    try {
      await waitFor(async () => expect(await qrLightning()).toMatch(/^lnurl1/i))
      expect(receiveLightning).not.toHaveBeenCalled()
    } finally {
      await act(async () => release())
    }
    await screen.findByPlaceholderText('Choose a name')
    expect(receiveLightning).not.toHaveBeenCalled()
  })

  it('shows the lightning address in the QR when Lightning is selected', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')] })
    renderReceive()

    await screen.findByText('alice@lnurl.test')
    fireEvent.click(screen.getByText('Lightning'))
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copy QR code' })))

    expect(copyToClipboard.mock.calls.at(-1)![0]).toBe('alice@lnurl.test')
  })

  it('shows the lightning address on Unified and Lightning only, and copies it on tap', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')] })
    renderReceive()

    const address = await screen.findByText('alice@lnurl.test')
    await act(async () => fireEvent.click(address))
    expect(copyToClipboard).toHaveBeenLastCalledWith('alice@lnurl.test')
    fireEvent.click(screen.getByText('Arkade'))
    expect(screen.queryByText('alice@lnurl.test')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Lightning'))
    expect(screen.getByText('alice@lnurl.test')).toBeInTheDocument()
  })

  it('shows a nameless receiver its LNURL when Lightning is selected', async () => {
    serve({ modes: ['session'], addresses: [namelessAddress()] })
    renderReceive()

    await waitFor(async () => expect(await qrLightning()).toMatch(/^lnurl1/i))
    const lnurl = await qrLightning()
    fireEvent.click(screen.getByText('Lightning'))

    expect(lnurl).toMatch(/^lnurl1/i)
    expect(await copiedQr()).toBe(lnurl)
  })

  it.each([
    ['named', namedAddress('alice')],
    ['nameless', namelessAddress()],
  ] as const)('pays an amount at the invoice its LNURL issues on the lightning rail, %s', async (_, address) => {
    serve({ modes: ['self', 'session'], addresses: [address] })
    renderReceive(10_000)

    await waitFor(() => expect(callbacks()).toHaveLength(1))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copy QR code' })).toBeEnabled())
    expect(await qrLightning()).toBe(fakeInvoice(10_000_000))
    fireEvent.click(screen.getByText('Lightning'))
    expect(await copiedQr()).toBe(fakeInvoice(10_000_000))
    expect(callbacks()[0].searchParams.get('paymentOption')).toBe('lightning')
  })

  it('asks its LNURL for no further invoice once the payment arrives', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')] })
    const addListener = vi.mocked(navigator.serviceWorker.addEventListener)
    addListener.mockClear()
    renderReceive(10_000, {}, {}, true)
    await waitFor(() => expect(callbacks()).toHaveLength(1))

    const payment = { data: { type: 'VTXO_UPDATE', payload: { newVtxos: [{ value: 9_990 }] } } } as MessageEvent
    await act(async () => {
      for (const [type, listener] of addListener.mock.calls)
        if (type === 'message') (listener as EventListener)(payment)
      await new Promise((resolve) => setTimeout(resolve, 300))
    })

    expect(callbacks()).toHaveLength(1)
  })

  it("shows its LNURL's invoice, not a swap invoice an earlier visit left in the flow", async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')] })
    renderReceive(10_000, {}, { invoice: 'lnbc10staleswap' })

    await waitFor(() => expect(callbacks()).toHaveLength(1))
    await waitFor(async () => expect(await qrLightning()).toBe(fakeInvoice(10_000_000)))
  })

  it('keeps the address on the Lightning tab, and says why, when no invoice comes back', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')], invoiceError: 'below the corridor minimum' })
    renderReceive(10_000)

    expect(await screen.findByText(/below the corridor minimum/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Lightning'))
    expect(await copiedQr()).toBe('alice@lnurl.test')
  })
  it('copies a single-address method outright, without the copy sheet', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')] })
    renderReceive(10_000)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copy QR code' })).toBeEnabled())

    fireEvent.click(screen.getByText('Arkade'))
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copy' })))

    expect(copyToClipboard).toHaveBeenLastCalledWith(DECODABLE_ARK)
    expect(screen.queryByText('Copy address')).not.toBeInTheDocument()
  })
})

describe('Receive screen, lnurl onboarding', () => {
  const controls = {
    self: () => screen.queryByPlaceholderText('Choose a name'),
    random: () => screen.queryByRole('button', { name: 'Pick one for me' }),
    admin: () => screen.queryByText('I have a claim code'),
  }
  const claims = () => server.calls('POST', '/lnurl/address')

  it('registers the wallet LNURL on its own, so the first QR already carries it', async () => {
    serve({ modes: ['self', 'session'] })
    renderReceive()

    expect(await screen.findByRole('button', { name: 'Add a name' })).toBeInTheDocument()
    expect(JSON.parse(claims()[0][1]!.body as string)).toMatchObject({ nameless: true })
    expect(screen.queryByText(/@lnurl\.test/)).not.toBeInTheDocument()
    expect(await qrLightning()).toMatch(/^lnurl1/i)
  })

  it('offers a name, never a claim code, when the server has no nameless mode', async () => {
    serve({ modes: ['self', 'random', 'admin'] })
    renderReceive()

    await screen.findByPlaceholderText('Choose a name')
    expect(controls.random()).not.toBeNull()
    expect(controls.admin()).toBeNull()
    expect(claims()).toHaveLength(0)
  })

  it('never offers a random name when the wallet already holds one beside its nameless LNURL', async () => {
    serve({ modes: ['self', 'random', 'session'], addresses: [namedAddress('alice'), namelessAddress()] })
    renderReceive()

    fireEvent.click(await screen.findByRole('button', { name: 'Add a name' }))
    expect(await screen.findByPlaceholderText('Choose a name')).toBeInTheDocument()
    await waitFor(() => expect(controls.random()).toBeNull())
  })

  it.each([[['admin']], [['random']], [['admin', 'random']]])(
    'leaves naming to Settings when the user cannot choose a name (%j)',
    async (modes) => {
      serve({ modes, addresses: [] })
      renderReceive()

      await waitFor(() => expect(server.calls('GET', '/lnurl/domain')).toHaveLength(1))
      await act(async () => {})
      for (const control of Object.values(controls)) expect(control()).toBeNull()
      expect(claims()).toHaveLength(0)
    },
  )

  it('claims nothing and offers no choice when the server requires an API key', async () => {
    serve({ modes: ['self', 'random', 'session'], requireApiKey: true })
    renderReceive()

    await waitFor(() => expect(server.calls('GET', '/lnurl/domain')).toHaveLength(1))
    await act(async () => {})
    for (const control of Object.values(controls)) expect(control()).toBeNull()
    expect(claims()).toHaveLength(0)
  })

  it('claims a chosen name and puts its LNURL in the QR', async () => {
    serve({ modes: ['self'] })
    renderReceive()

    fireEvent.change(await screen.findByPlaceholderText('Choose a name'), { target: { value: 'alice' } })
    fireEvent.click(screen.getByRole('button', { name: 'Claim name' }))

    expect(await screen.findByText('alice@lnurl.test')).toBeInTheDocument()
    expect((await qrLightning())?.toLowerCase()).toBe(
      encodeLnurl(`${LNURL_BASE}/.well-known/lnurlp/alice`).toLowerCase(),
    )
  })

  it('claims a server-picked name', async () => {
    serve({ modes: ['self', 'random'] })
    renderReceive()

    fireEvent.click(await screen.findByRole('button', { name: 'Pick one for me' }))

    expect(await screen.findByText('brave-otter@lnurl.test')).toBeInTheDocument()
  })

  it('shows the name when a nameless claim finds the identity already upgraded', async () => {
    serve({ modes: ['session'], sessionRow: namedAddress('erin', 'LNURL1SESSIONERIN') })
    renderReceive()

    expect(await screen.findByText('erin@lnurl.test')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add a name' })).not.toBeInTheDocument()
  })

  it('says why a claim failed and keeps the choices up', async () => {
    serve({ modes: ['self'], reject: { code: 'taken', error: 'username already taken' } })
    renderReceive()

    fireEvent.change(await screen.findByPlaceholderText('Choose a name'), { target: { value: 'alice' } })
    fireEvent.click(screen.getByRole('button', { name: 'Claim name' }))

    expect(await screen.findByText('That name is already taken.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Claim name' })).toBeInTheDocument()
  })
})

describe('Receive screen, naming a nameless receiver', () => {
  it('keeps the same LNURL in the QR after adding a name', async () => {
    serve({ modes: ['self', 'session'], addresses: [namelessAddress()] })
    renderReceive()

    fireEvent.click(await screen.findByRole('button', { name: 'Add a name' }))
    const before = await qrLightning()
    expect(before).toMatch(/^lnurl1/i)
    fireEvent.change(screen.getByPlaceholderText('Choose a name'), { target: { value: 'dave' } })
    fireEvent.click(screen.getByRole('button', { name: 'Claim name' }))

    expect(await screen.findByText('dave@lnurl.test')).toBeInTheDocument()
    expect(await qrLightning()).toBe(before)
    expect(server.calls('PATCH', '/lnurl/address/sess1')).toHaveLength(1)
  })

  it('keeps the LNURL in the QR when the naming choices cannot be loaded', async () => {
    serve({ modes: ['self'], addresses: [namelessAddress()], capabilitiesFail: true })
    renderReceive()

    expect(await screen.findByText('domain lookup failed')).toBeInTheDocument()
    expect(await qrLightning()).toMatch(/^lnurl1/i)
    expect(screen.queryByRole('button', { name: 'Add a name' })).not.toBeInTheDocument()
  })

  it.each([[['session']], [['admin', 'random', 'session']]])(
    'offers no "Add a name" when the user cannot choose one (%j)',
    async (modes) => {
      serve({ modes, addresses: [namelessAddress()] })
      renderReceive()

      await waitFor(() => expect(server.calls('GET', '/lnurl/domain')).toHaveLength(1))
      expect(await qrLightning()).toMatch(/^lnurl1/i)
      expect(screen.queryByRole('button', { name: 'Add a name' })).not.toBeInTheDocument()
    },
  )
})

describe('Receive screen, token rails', () => {
  const tokensOn = { receiveViaTokens: true }
  const payRequests = () => server.calls('GET', '/.well-known/lnurlp/alice')
  const tokenQuotes = () => callbacks().filter((url) => url.searchParams.get('paymentOption')?.startsWith('ff-'))
  const tokenSelect = () => screen.queryByRole('button', { name: 'Pay with stablecoins' })
  const openTokenSheet = async () => {
    fireEvent.click(await screen.findByRole('button', { name: 'Pay with stablecoins' }))
    return screen.findByRole('radiogroup')
  }
  const pick = async (label: string) => {
    fireEvent.click(within(await openTokenSheet()).getByText(label))
  }

  it('renders a USDT (Arbitrum One) method with an EIP-681 value', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')], tokens: true })
    renderReceive(20_000, tokensOn)

    await pick('USDT (Arbitrum One)')

    expect(await screen.findByText('Send exactly 17.156 USDT on Arbitrum One')).toBeInTheDocument()
    expect(screen.getByText(/^Quote by FixedFloat, valid for \d+:\d\d$/)).toBeInTheDocument()
    expect(await copiedQr()).toBe(arbitrumUri(20_000_000))
  })

  it('renders a tron option with the bare address and no deeplink', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')], tokens: true })
    renderReceive(20_000, tokensOn)

    await pick('USDT (Tron)')

    expect(await screen.findByText('Send exactly 17.156 USDT on Tron')).toBeInTheDocument()
    expect(await copiedQr()).toBe(TOKEN_DEPOSITS['ff-usdttrc'])
  })

  it('copies the deposit address and the exact amount, never the payment URI', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')], tokens: true })
    renderReceive(20_000, tokensOn)
    await pick('USDT (Arbitrum One)')
    await screen.findByText('Send exactly 17.156 USDT on Arbitrum One')

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copy' })))
    expect(copyToClipboard).toHaveBeenLastCalledWith(TOKEN_DEPOSITS['ff-usdtarbitrum'])
    const amountCopy = await screen.findByTestId('token-amount-address-copy')
    expect(screen.queryByTestId('bip21-address-copy')).not.toBeInTheDocument()
    expect(screen.queryByTestId('ark-address-copy')).not.toBeInTheDocument()

    await act(async () => fireEvent.click(amountCopy))
    expect(copyToClipboard).toHaveBeenLastCalledWith('17.156')
  })

  describe('on a phone', () => {
    beforeEach(() => (browser.mobile = true))
    afterEach(() => (browser.mobile = false))

    it('opens the payment URI in the installed wallet', async () => {
      serve({ modes: ['self'], addresses: [namedAddress('alice')], tokens: true })
      renderReceive(20_000, tokensOn)
      await pick('USDT (Arbitrum One)')

      expect(await screen.findByRole('link', { name: 'Open in wallet' })).toHaveAttribute(
        'href',
        arbitrumUri(20_000_000),
      )
    })

    it('offers no wallet link for a bare Tron address', async () => {
      serve({ modes: ['self'], addresses: [namedAddress('alice')], tokens: true })
      renderReceive(20_000, tokensOn)
      await pick('USDT (Tron)')

      await screen.findByText('Send exactly 17.156 USDT on Tron')
      expect(screen.queryByRole('link', { name: 'Open in wallet' })).not.toBeInTheDocument()
    })
  })

  it('renders a simulated Solana option with a Solana Pay value', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')], simulated: true })
    renderReceive(20_000, tokensOn)

    await pick('USDT (Solana Devnet)')

    expect(await screen.findByText('Send exactly 17.156 USDT on Solana Devnet')).toBeInTheDocument()
    expect(screen.getByText(/^Quote by Simulated, valid for \d+:\d\d$/)).toBeInTheDocument()
    expect(await copiedQr()).toBe(solanaUri(20_000_000))
  })

  it('offers no token payment actions after the quote expires', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')], tokens: true, quoteTtlMs: 120_000 })
    browser.mobile = true
    share.can = true
    onTestFinished(() => {
      browser.mobile = false
      share.can = false
    })
    renderReceive(20_000, tokensOn)
    await pick('USDT (Arbitrum One)')
    await screen.findByText('Send exactly 17.156 USDT on Arbitrum One')
    expect(screen.getByRole('link', { name: 'Open in wallet' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Share' })).toBeEnabled()
    const from = qrValues.length

    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 120_000)
    onTestFinished(() => clock.mockRestore())
    act(() => document.dispatchEvent(new Event('visibilitychange')))

    expect(screen.queryByText(/Send exactly/)).not.toBeInTheDocument()
    expect(qrValues.slice(from)).not.toContain(arbitrumUri(20_000_000))
    expect(screen.queryByRole('link', { name: 'Open in wallet' })).not.toBeInTheDocument()
    expect(screen.queryByTestId('token-address-copy')).not.toBeInTheDocument()
    expect(screen.queryByTestId('token-amount-address-copy')).not.toBeInTheDocument()
    expect(
      screen.queryAllByRole('button', { name: 'Copy QR code' }).filter((b) => !b.hasAttribute('disabled')),
    ).toEqual([])
    expect(screen.queryAllByRole('button', { name: 'Share' }).filter((b) => !b.hasAttribute('disabled'))).toEqual([])
    expect(tokenQuotes()).toHaveLength(1)
  })

  it('retries an expired token quote only on explicit action and hides the old deposit while waiting', async () => {
    const options = {
      modes: ['self'],
      addresses: [namedAddress('alice')],
      tokens: true,
      quoteTtlMs: 120_000,
      tokenDestination: TOKEN_DEPOSITS['ff-usdtarbitrum'],
    }
    serve(options)
    share.can = true
    onTestFinished(() => {
      share.can = false
    })
    renderReceive(20_000, tokensOn)
    await pick('USDT (Arbitrum One)')
    await screen.findByText('Send exactly 17.156 USDT on Arbitrum One')
    expect(screen.getByRole('button', { name: 'Share' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Get a new quote' })).not.toBeInTheDocument()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copy' })))
    expect(await screen.findByTestId('token-address-copy')).toBeInTheDocument()
    expect(screen.getByTestId('token-amount-address-copy')).toBeInTheDocument()
    copyToClipboard.mockClear()
    const from = qrValues.length
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 120_000)
    onTestFinished(() => clock.mockRestore())
    act(() => document.dispatchEvent(new Event('visibilitychange')))

    expect(screen.queryByTestId('token-address-copy')).not.toBeInTheDocument()
    expect(screen.queryByTestId('token-amount-address-copy')).not.toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Share' })).toBeDisabled()
    expect(tokenQuotes()).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'USDT (Arbitrum One)' }))
    fireEvent.click(within(await screen.findByRole('radiogroup')).getByText('USDT (Arbitrum One)'))
    expect(tokenQuotes()).toHaveLength(1)
    const pending = holdQuotes(server, 'ff-usdtarbitrum')
    options.tokenDestination = `0x${'cd'.repeat(20)}`

    fireEvent.click(screen.getByRole('button', { name: 'Get a new quote' }))
    await waitFor(() => expect(pending.held).toHaveLength(1))
    expect(screen.queryByRole('button', { name: 'Get a new quote' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Send exactly/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Share' })).toBeDisabled()
    expect(qrValues.slice(from)).not.toContain(arbitrumUri(20_000_000))
    expect(copyToClipboard).not.toHaveBeenCalled()

    pending.release()
    await screen.findByText('Send exactly 17.156 USDT on Arbitrum One')
    expect(await copiedQr()).toBe(`0x${'cd'.repeat(20)}`)
    expect(tokenQuotes()).toHaveLength(2)
    expect(tokenQuotes().map((url) => url.searchParams.get('paymentOption'))).toEqual([
      'ff-usdtarbitrum',
      'ff-usdtarbitrum',
    ])
    expect(screen.queryByRole('button', { name: 'Get a new quote' })).not.toBeInTheDocument()
  })

  it('retries a transient token failure only on explicit action for the selected rail', async () => {
    const tokenErrors: Record<string, string> = { 'ff-usdtarbitrum': 'provider temporarily busy' }
    serve({ modes: ['self'], addresses: [namedAddress('alice')], tokens: true, tokenErrors })
    renderReceive(20_000, tokensOn)
    await pick('USDT (Arbitrum One)')
    await screen.findByText(/No quote for this token: .*temporarily busy/)
    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Share' })).toBeDisabled()
    expect(tokenQuotes()).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'USDT (Arbitrum One)' }))
    fireEvent.click(within(await screen.findByRole('radiogroup')).getByText('USDT (Arbitrum One)'))
    expect(tokenQuotes()).toHaveLength(1)
    delete tokenErrors['ff-usdtarbitrum']
    const pending = holdQuotes(server, 'ff-usdtarbitrum')

    fireEvent.click(screen.getByRole('button', { name: 'Get a new quote' }))
    await waitFor(() => expect(pending.held).toHaveLength(1))
    expect(screen.queryByRole('button', { name: 'Get a new quote' })).not.toBeInTheDocument()
    expect(screen.queryByText(/No quote for this token/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled()
    pending.release()

    await screen.findByText('Send exactly 17.156 USDT on Arbitrum One')
    expect(await copiedQr()).toBe(arbitrumUri(20_000_000))
    expect(tokenQuotes()).toHaveLength(2)
    expect(tokenQuotes().map((url) => url.searchParams.get('paymentOption'))).toEqual([
      'ff-usdtarbitrum',
      'ff-usdtarbitrum',
    ])
    expect(screen.queryByRole('button', { name: 'Get a new quote' })).not.toBeInTheDocument()
  })

  it('refuses a required Solana memo without exposing a token destination or QR', async () => {
    serve({
      modes: ['self'],
      addresses: [namedAddress('alice')],
      simulated: true,
      tokenTag: 'invoice',
      paymentURI: `${solanaUri(20_000_000)}&memo=invoice`,
    })
    renderReceive(20_000, tokensOn)
    const from = qrValues.length
    await pick('USDT (Solana Devnet)')

    expect(await screen.findByText(/No quote for this token: .*memo/)).toBeInTheDocument()
    expect(screen.queryByText(/Send exactly/)).not.toBeInTheDocument()
    expect(screen.queryByTestId('token-address-copy')).not.toBeInTheDocument()
    expect(qrValues.slice(from).some((v) => v.includes(TOKEN_DEPOSITS['ffsim-usdtsol']))).toBe(false)
    expect(screen.queryAllByRole('button', { name: 'Share' }).filter((b) => !b.hasAttribute('disabled'))).toEqual([])
  })

  it('shows no QR for the old amount while the new amount is quoted', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')], tokens: true })
    const { rerender } = renderReceive(20_000, tokensOn)
    await pick('USDT (Arbitrum One)')
    expect(await screen.findByText('Send exactly 17.156 USDT on Arbitrum One')).toBeInTheDocument()
    const pending = holdQuotes(server, 'ff-usdtarbitrum')
    const from = qrValues.length

    rerender(receiveTree(30_000, tokensOn))
    await waitFor(() => expect(pending.held).toHaveLength(1))

    expect(qrValues.slice(from)).not.toContain(arbitrumUri(20_000_000))
    expect(screen.queryByText(/Send exactly/)).not.toBeInTheDocument()
    pending.release()
    expect(await screen.findByText('Send exactly 25.734 USDT on Arbitrum One')).toBeInTheDocument()
    expect(await copiedQr()).toBe(arbitrumUri(30_000_000))
  })

  it('renders nothing when no token option is advertised', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')] })
    renderReceive(20_000, tokensOn)

    // One fetch: both rail hooks share the receiver's memoised payRequest (client 0.5.2).
    await waitFor(() => expect(payRequests()).toHaveLength(1))
    await waitFor(() => expect(callbacks()).toHaveLength(1))
    expect(tokenSelect()).not.toBeInTheDocument()
  })

  it('asks for no token quote until a token method is picked', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')], tokens: true })
    renderReceive(20_000, tokensOn)

    await screen.findByRole('button', { name: 'Pay with stablecoins' })
    await waitFor(() => expect(callbacks()).toHaveLength(1))
    expect(tokenQuotes()).toHaveLength(0)
  })

  it('offers only the token methods whose bounds hold the amount', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')], tokens: true })
    renderReceive(5_000, tokensOn)

    const sheet = await openTokenSheet()
    expect(
      within(sheet)
        .getAllByRole('radio')
        .map((o) => o.closest('label')?.textContent),
    ).toEqual(['USDT (Arbitrum One)'])
  })

  it('offers no token method without an amount', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')], tokens: true })
    renderReceive(0, tokensOn)

    await waitFor(() => expect(payRequests()).toHaveLength(1))
    await screen.findByText('alice@lnurl.test')
    expect(tokenSelect()).not.toBeInTheDocument()
  })

  it('explains an expired quote, and offers a new one, where the code was', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')], tokens: true, quoteTtlMs: 120_000 })
    share.can = true
    onTestFinished(() => {
      share.can = false
    })
    const { container } = renderReceive(20_000, tokensOn)
    await pick('USDT (Arbitrum One)')
    await screen.findByText('Send exactly 17.156 USDT on Arbitrum One')
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 120_000)
    onTestFinished(() => clock.mockRestore())

    act(() => document.dispatchEvent(new Event('visibilitychange')))

    const stage = container.querySelector('.receive-invoice-stage')!
    expect(within(stage as HTMLElement).getByText('Quote expired')).toBeInTheDocument()
    expect(within(stage as HTMLElement).getByText(/no longer valid\. Do not send to it/)).toBeInTheDocument()
    expect(within(stage as HTMLElement).getByRole('button', { name: 'Get a new quote' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Copy QR code' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Share' })).toBeDisabled()
  })

  it('goes back from a stablecoin to the code shown before it', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')], tokens: true })
    renderReceive(20_000, tokensOn)
    fireEvent.click(await screen.findByRole('tab', { name: 'Lightning' }))
    await pick('USDT (Arbitrum One)')
    await screen.findByText('Send exactly 17.156 USDT on Arbitrum One')

    fireEvent.click(screen.getByRole('button', { name: 'Back to Lightning' }))

    expect(screen.getByRole('tab', { name: 'Lightning' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('button', { name: 'Back to Lightning' })).not.toBeInTheDocument()
    expect(await copiedQr()).toMatch(/^lnbc/i)
  })

  it('says why a token has no quote', async () => {
    serve({
      modes: ['self'],
      addresses: [namedAddress('alice')],
      tokens: true,
      tokenErrors: { 'ff-usdtarbitrum': 'paymentOption ff-usdtarbitrum is busy, try again shortly' },
    })
    share.can = true
    onTestFinished(() => {
      share.can = false
    })
    renderReceive(20_000, tokensOn)

    await pick('USDT (Arbitrum One)')

    expect(await screen.findByText(/No quote for this token: .*busy/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Get a new quote' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Copy QR code' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Share' })).toBeDisabled()
  })

  it('token rails are absent when receiveViaTokens is off', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')], tokens: true })
    renderReceive(20_000)

    await waitFor(() => expect(callbacks()).toHaveLength(1))
    expect(tokenSelect()).not.toBeInTheDocument()
    expect(payRequests()).toHaveLength(1)
  })
})
