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
import { BackupContext } from '../../../providers/backup'
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
const backupAndUpdateConfig = vi.fn<(config: Config) => void>()
const updateConfig = vi.fn<(config: Config) => void>()
const backupConfig = vi.fn<(config: Config) => Promise<void>>(async () => {})
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

const receiveTree = (
  satoshis = 0,
  config: Partial<Config> = {},
  setRecvInfo: (info: { satoshis: number }) => void = vi.fn(),
  recv: object = {},
  statefulFlow = false,
) => (
  <ToastProvider>
    <NavigationContext.Provider value={mockNavigationContextValue}>
      <AspContext.Provider value={mockAspContextValue as never}>
        <ConfigContext.Provider
          value={
            {
              ...mockConfigContextValue,
              updateConfig,
              config: { ...mockConfigContextValue.config, ...config },
            } as never
          }
        >
          <FiatContext.Provider value={{ ...mockFiatContextValue, toFiatAmount: atMarket } as never}>
            <NotificationsContext.Provider value={{ notifyPaymentReceived: () => {} } as never}>
              <FlowContext.Provider
                value={
                  {
                    ...mockFlowContextValue,
                    setRecvInfo,
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
                      <BackupContext.Provider value={{ backupAndUpdateConfig, backupConfig } as never}>
                        {statefulFlow ? (
                          <ReceiveFlow satoshis={satoshis} recv={recv}>
                            <ReceiveQRCode />
                          </ReceiveFlow>
                        ) : (
                          <ReceiveQRCode />
                        )}
                      </BackupContext.Provider>
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
  render(receiveTree(satoshis, config, vi.fn(), recv, statefulFlow))
// Keeps the amount the screen sets, for flows that clear or change it through the screen's own buttons.
function LiveAmount({ initial, config }: { initial: number; config: Partial<Config> }) {
  const [satoshis, setSatoshis] = useState(initial)
  return receiveTree(satoshis, config, (info) => setSatoshis(info.satoshis))
}
const pickMethod = async (label: string | RegExp) => {
  fireEvent.click(await screen.findByRole('button', { name: /Showing/ }))
  fireEvent.click(await screen.findByRole('radio', { name: label }))
}
// A named receiver's address previews the Lightning address and Lightning rows in the open selector.
const selectorShows = async (address: string) => {
  fireEvent.click(await screen.findByRole('button', { name: /Showing/ }))
  return (await screen.findAllByText(address))[0]
}
const copyPart = async (testId: string) => {
  // Found outside act: inside it, the state updates that reveal the row are held back.
  const button = await screen.findByTestId(`${testId}-address-copy`)
  await act(async () => fireEvent.click(button))
}

let server: ReturnType<typeof fakeLnurlServer>
const serve = (opts: Parameters<typeof fakeLnurlServer>[0]) => {
  server = fakeLnurlServer(opts)
  vi.stubGlobal('fetch', server.fetch)
}

const copiedQr = async (): Promise<string> => {
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copy QR code' })))
  const value = copyToClipboard.mock.calls.at(-1)![0]
  expect(typeof value).toBe('string')
  return value
}

const qrLightning = async (): Promise<string | null> =>
  new URLSearchParams((await copiedQr()).split('?')[1]).get('lightning')

const callbacks = () =>
  server.fetch.mock.calls
    .map(([input]) => new URL(String(input)))
    .filter((url) => url.pathname.startsWith('/callback/'))

beforeEach(() => {
  receiveLightning.mockReset()
  backupAndUpdateConfig.mockClear()
  updateConfig.mockClear()
  backupConfig.mockClear()
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

    expect(await selectorShows('alice@lnurl.test')).toBeInTheDocument()
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

  it('links the lightning address in the QR, and remembers the mode, when Lightning address is picked', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')] })
    renderReceive()

    await pickMethod(/Lightning address/)

    expect(await copiedQr()).toBe('bitcoin:?lightning=alice@lnurl.test')
    expect(backupAndUpdateConfig).toHaveBeenLastCalledWith(expect.objectContaining({ receiveUnifiedMode: 'lnaddress' }))
  })

  it('opens in the remembered Lightning address mode with the bare address in the QR', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')] })
    renderReceive(0, { receiveUnifiedMode: 'lnaddress', receiveQrForm: { lnaddress: 'lnaddress' } })

    await screen.findByRole('button', { name: /Showing.*Lightning address/ })
    expect(await copiedQr()).toBe('alice@lnurl.test')
    expect(screen.getByText('Lightning wallets only · a phone camera may not open it')).toBeInTheDocument()
  })

  it('shows a nameless receiver its LNURL when that part is picked', async () => {
    serve({ modes: ['session'], addresses: [namelessAddress()] })
    renderReceive(0, { receiveQrForm: { full: 'lnurl' } })

    await waitFor(async () => expect(await copiedQr()).toMatch(/^lnurl1/i))
    fireEvent.click(screen.getByRole('button', { name: /Showing/ }))
    expect(screen.queryByRole('radio', { name: /Lightning address/ })).not.toBeInTheDocument()
  })

  it('offers a nameless receiver Lightning, which puts its LNURL in the QR', async () => {
    serve({ modes: ['session'], addresses: [namelessAddress()] })
    renderReceive()

    await pickMethod(/^Lightning\s*LNURL$/)

    expect(await copiedQr()).toMatch(/^lightning:lnurl1/i)
    expect(screen.getByText('Reusable · the payer picks the amount')).toBeInTheDocument()
  })

  it('puts lightning:<invoice> in the QR and the payment link row for Lightning with an amount', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')] })
    renderReceive(10_000)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copy QR code' })).toBeEnabled())

    await pickMethod(/^Lightning/)

    const link = `lightning:${fakeInvoice(10_000_000)}`
    await waitFor(async () => expect(await copiedQr()).toBe(link))
    await copyPart('bip21')
    expect(copyToClipboard).toHaveBeenLastCalledWith(link)
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
    await copyPart('invoice')
    expect(copyToClipboard).toHaveBeenLastCalledWith(fakeInvoice(10_000_000))
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

  it('shows Full details, and says why, when no invoice comes back', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')], invoiceError: 'below the corridor minimum' })
    renderReceive(10_000)

    expect(await screen.findByText(/below the corridor minimum/)).toBeInTheDocument()
    await pickMethod(/Lightning invoice/)
    expect(screen.getByRole('button', { name: /Showing.*Full details/ })).toBeInTheDocument()
    expect(await qrLightning()).toBeNull()
  })
  it('copies any part without changing the QR', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')] })
    renderReceive(10_000)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copy QR code' })).toBeEnabled())
    await pickMethod('Arkade')
    const inQrBefore = await copiedQr()
    await copyPart('ark')
    expect(copyToClipboard).toHaveBeenLastCalledWith(DECODABLE_ARK)
    expect(await copiedQr()).toBe(inQrBefore)
  })

  it('puts the tapped part in the QR and remembers it', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')] })
    renderReceive(10_000)
    await pickMethod('Arkade')
    fireEvent.click(await screen.findByRole('radio', { name: /Arkade address/ }))
    await waitFor(() =>
      expect(updateConfig).toHaveBeenLastCalledWith(expect.objectContaining({ receiveQrForm: { ark: 'ark' } })),
    )
  })

  it('backs a run of part picks up once, with the last one', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')] })
    renderReceive(10_000)
    await pickMethod('Arkade')
    fireEvent.click(await screen.findByRole('radio', { name: /Arkade address/ }))
    fireEvent.click(screen.getByRole('radio', { name: /Payment link/ }))
    fireEvent.click(screen.getByRole('radio', { name: /Arkade address/ }))

    expect(updateConfig).toHaveBeenCalledTimes(3)
    expect(backupConfig).not.toHaveBeenCalled()
    await waitFor(() => expect(backupConfig).toHaveBeenCalledTimes(1), { timeout: 2000 })
    expect(backupConfig).toHaveBeenLastCalledWith(expect.objectContaining({ receiveQrForm: { ark: 'ark' } }))
  })

  it('backs up the config as it is when the picks settle, keeping a mode picked meanwhile', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')] })
    function LiveConfig() {
      const [config, setConfig] = useState<Partial<Config>>({})
      updateConfig.mockImplementation(setConfig)
      backupAndUpdateConfig.mockImplementation(setConfig)
      return receiveTree(0, config)
    }
    try {
      render(<LiveConfig />)
      await pickMethod('Arkade')
      fireEvent.click(await screen.findByRole('radio', { name: /Arkade address/ }))
      await pickMethod(/Lightning address/)

      await waitFor(() => expect(backupConfig).toHaveBeenCalledTimes(1), { timeout: 2000 })
      expect(backupConfig).toHaveBeenLastCalledWith(
        expect.objectContaining({ receiveUnifiedMode: 'lnaddress', receiveQrForm: { ark: 'ark' } }),
      )
    } finally {
      updateConfig.mockReset()
      backupAndUpdateConfig.mockReset()
    }
  })

  it('gives the LNURL and the Lightning address rows their own copy buttons', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')] })
    renderReceive()
    await pickMethod(/^Lightning/)

    await copyPart('lnaddress')
    expect(copyToClipboard).toHaveBeenLastCalledWith('alice@lnurl.test')
    await copyPart('lnurl')
    expect(copyToClipboard.mock.calls.at(-1)![0]).toMatch(/^lnurl1/i)
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

    expect(await selectorShows('alice@lnurl.test')).toBeInTheDocument()
    expect((await qrLightning())?.toLowerCase()).toBe(
      encodeLnurl(`${LNURL_BASE}/.well-known/lnurlp/alice`).toLowerCase(),
    )
  })

  it('claims a server-picked name', async () => {
    serve({ modes: ['self', 'random'] })
    renderReceive()

    fireEvent.click(await screen.findByRole('button', { name: 'Pick one for me' }))

    expect(await selectorShows('brave-otter@lnurl.test')).toBeInTheDocument()
  })

  it('shows the name when a nameless claim finds the identity already upgraded', async () => {
    serve({ modes: ['session'], sessionRow: namedAddress('erin', 'LNURL1SESSIONERIN') })
    renderReceive()

    expect(await selectorShows('erin@lnurl.test')).toBeInTheDocument()
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

    expect(await selectorShows('dave@lnurl.test')).toBeInTheDocument()
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
  const tokenSelect = async () => {
    fireEvent.click(await screen.findByRole('button', { name: /Showing/ }))
    return screen.queryByRole('radio', { name: /Stablecoins/ })
  }
  const openTokenSheet = async () => {
    await pickMethod('Stablecoins')
    return (await screen.findByTestId('select-option-0')).closest<HTMLElement>('[role="radiogroup"]')!
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
    expect(screen.getByRole('button', { name: /Showing.*USDT on Arbitrum One/ })).toBeInTheDocument()
    expect(await copiedQr()).toBe(arbitrumUri(20_000_000))
  })

  it('shows an expired quote with no deposit to scan, share or copy until a new one is asked for', async () => {
    share.can = true
    onTestFinished(() => {
      share.can = false
    })
    serve({ modes: ['self'], addresses: [namedAddress('alice')], tokens: true })
    renderReceive(20_000, tokensOn)
    await pick('USDT (Arbitrum One)')
    await screen.findByText('Send exactly 17.156 USDT on Arbitrum One')
    expect(screen.getByRole('button', { name: 'Share' })).toBeEnabled()
    const deposit = TOKEN_DEPOSITS['ff-usdtarbitrum']
    const from = qrValues.length

    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 16 * 60_000)
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    clock.mockRestore()

    expect(screen.getByText('Quote expired')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Get a new quote' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Copy QR code' })).not.toBeInTheDocument()
    expect(screen.queryByTestId('token-address-copy')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Share' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Share' }))
    expect(share.shareData).not.toHaveBeenCalled()

    const pending = holdQuotes(server, 'ff-usdtarbitrum')
    fireEvent.click(screen.getByRole('button', { name: 'Get a new quote' }))
    await waitFor(() => expect(pending.held).toHaveLength(1))
    expect(screen.queryByText('Quote expired')).not.toBeInTheDocument()
    expect(screen.getByText('Getting quote…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Share' })).toBeDisabled()
    expect(qrValues.slice(from).filter((v) => v.includes(deposit))).toEqual([])

    pending.release()
    expect(await screen.findByText('Send exactly 17.156 USDT on Arbitrum One')).toBeInTheDocument()
    expect(tokenQuotes()).toHaveLength(2)
  })

  it('renders a tron option with the bare address and no deeplink', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')], tokens: true })
    renderReceive(20_000, tokensOn)

    await pick('USDT (Tron)')

    expect(await screen.findByText('Send exactly 17.156 USDT on Tron')).toBeInTheDocument()
    expect(await copiedQr()).toBe(TOKEN_DEPOSITS['ff-usdttrc'])
  })

  it('copies the deposit address and the exact amount from their rows', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')], tokens: true })
    renderReceive(20_000, tokensOn)
    await pick('USDT (Arbitrum One)')
    await screen.findByText('Send exactly 17.156 USDT on Arbitrum One')

    await copyPart('token')
    expect(copyToClipboard).toHaveBeenLastCalledWith(TOKEN_DEPOSITS['ff-usdtarbitrum'])
    expect(screen.queryByTestId('ark-address-copy')).not.toBeInTheDocument()
    await copyPart('token-amount')
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

    it('asks for an amount on the keypad before offering stablecoins', async () => {
      serve({ modes: ['self'], addresses: [namedAddress('alice')], tokens: true })
      renderReceive(0, tokensOn)
      await pickMethod(/Stablecoins/)

      expect(await screen.findByText('Set an amount first')).toBeInTheDocument()
      expect(screen.getByText(/Stablecoin payments are quoted for an exact amount/)).toBeInTheDocument()
      expect(screen.getByTestId('keyboard-amount')).toBeInTheDocument()
    })

    it('preserves an amount draft when the token quote expires while the keypad is open', async () => {
      serve({ modes: ['self'], addresses: [namedAddress('alice')], tokens: true })
      renderReceive(20_000, tokensOn)
      await pick('USDT (Arbitrum One)')
      await screen.findByText('Send exactly 17.156 USDT on Arbitrum One')

      fireEvent.click(screen.getByRole('button', { name: 'Edit amount' }))
      const keypad = await screen.findByTestId('keyboard-amount')
      const initial = keypad.textContent
      fireEvent.click(screen.getByTestId('keyboard-1'))
      const edited = keypad.textContent
      expect(edited).not.toBe(initial)

      const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 16 * 60_000)
      try {
        act(() => document.dispatchEvent(new Event('visibilitychange')))
        expect(screen.getByTestId('keyboard-amount').textContent).toBe(edited)
      } finally {
        clock.mockRestore()
      }
    })

    it('drops a token pick when the amount is cleared, so a new amount places no order', async () => {
      serve({ modes: ['self'], addresses: [namedAddress('alice')], tokens: true })
      render(<LiveAmount initial={20_000} config={tokensOn} />)
      await pick('USDT (Arbitrum One)')
      await screen.findByText('Send exactly 17.156 USDT on Arbitrum One')

      fireEvent.click(screen.getByRole('button', { name: 'Edit amount' }))
      fireEvent.click(await screen.findByTestId('clear-amount'))
      fireEvent.click(await screen.findByRole('button', { name: 'Add amount' }))
      for (const key of '3000000') fireEvent.click(await screen.findByTestId(`keyboard-${key}`))
      fireEvent.click(screen.getByTestId('save-amount'))

      expect(await screen.findByRole('button', { name: /Showing.*Unified · Full details/ })).toBeInTheDocument()
      await waitFor(async () => expect(await qrLightning()).toBe(fakeInvoice(30_000_000)))
      expect(tokenQuotes()).toHaveLength(1)
      expect(screen.queryByText(/Send exactly/)).not.toBeInTheDocument()
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
    expect(screen.getByTestId('token-address-copy')).toBeVisible()
    expect(screen.getByTestId('token-amount-address-copy')).toBeVisible()
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
    expect(await tokenSelect()).not.toBeInTheDocument()
  })

  it('asks for no token quote until a token method is picked', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')], tokens: true })
    renderReceive(20_000, tokensOn)

    fireEvent.click(await screen.findByRole('button', { name: /Showing/ }))
    expect(await screen.findByRole('radio', { name: 'Stablecoins' })).toBeInTheDocument()
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

  it('asks for an amount before offering stablecoins', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')], tokens: true })
    renderReceive(0, tokensOn)
    await pickMethod(/Stablecoins/)
    expect(await screen.findByText('Set an amount first')).toBeInTheDocument()
    expect(tokenQuotes()).toHaveLength(0)
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
    expect(screen.getByRole('button', { name: 'Copy QR code' })).toBeDisabled()
    expect(screen.queryByTestId('token-address-copy')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Share' })).toBeDisabled()
  })

  it('token rails are absent when receiveViaTokens is off', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')], tokens: true })
    renderReceive(20_000)

    await waitFor(() => expect(callbacks()).toHaveLength(1))
    expect(await tokenSelect()).not.toBeInTheDocument()
    expect(payRequests()).toHaveLength(1)
  })
})
