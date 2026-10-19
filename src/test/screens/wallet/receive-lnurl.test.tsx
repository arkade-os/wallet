import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, configure, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  DECODABLE_ARK,
  LNURL_BASE,
  LNURL_DESTINATIONS,
  WALLET_BOARDING_ADDRESS,
  fakeInvoice,
  fakeLnurlServer,
  namedAddress,
  namelessAddress,
} from '../../lib/receive/fakeLnurlServer'

// Every wait here sits behind a receiver load (signing, then fetches), which a full parallel run stretches past 1s.
configure({ asyncUtilTimeout: 3_000 })

vi.mock('qr', () => ({ default: () => Array.from({ length: 21 }, () => new Uint8Array(21).fill(1)) }))
const copyToClipboard = vi.fn<(value: string) => Promise<void>>(async () => {})
vi.mock('../../../lib/clipboard', () => ({ copyToClipboard: (v: string) => copyToClipboard(v) }))

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

const renderReceive = (satoshis = 0, config: Partial<Config> = {}, recv: object = {}, statefulFlow = false) =>
  render(
    <ToastProvider>
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <AspContext.Provider value={mockAspContextValue as never}>
          <ConfigContext.Provider
            value={{ ...mockConfigContextValue, config: { ...mockConfigContextValue.config, ...config } } as never}
          >
            <FiatContext.Provider value={mockFiatContextValue as never}>
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
    </ToastProvider>,
  )

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

  it.each([
    ['named', namedAddress('alice')],
    ['nameless', namelessAddress()],
  ] as const)('routes every rail of an amount through the LNURL when set to, %s', async (_, address) => {
    serve({ modes: ['self', 'session'], addresses: [address] })
    renderReceive(10_000, { receiveViaLnurl: true })

    await waitFor(() => expect(callbacks()).toHaveLength(3))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copy QR code' })).toBeEnabled())
    fireEvent.click(screen.getByText('Arkade'))
    expect(await copiedQr()).toBe(LNURL_DESTINATIONS.arkade)
    fireEvent.click(screen.getByText('Bitcoin'))
    expect(await copiedQr()).toBe(LNURL_DESTINATIONS.onchain)
    expect(callbacks().map((url) => url.searchParams.get('paymentOption'))).toEqual(
      expect.arrayContaining(['lightning', 'arkade', 'onchain']),
    )
  })

  it("keeps the wallet's own addresses, and says why, when the LNURL gives no destination", async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')], destinationError: 'no covenant destinations' })
    renderReceive(10_000, { receiveViaLnurl: true })

    expect(await screen.findAllByText(/no covenant destinations/)).toHaveLength(2)
    fireEvent.click(screen.getByText('Arkade'))
    expect(await copiedQr()).toBe(DECODABLE_ARK)
    fireEvent.click(screen.getByText('Bitcoin'))
    expect(await copiedQr()).toBe(WALLET_BOARDING_ADDRESS)
  })

  it('refuses an Arkade address on another operator and an on-chain address that is not its own', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')], foreignDestinations: true })
    renderReceive(10_000, { receiveViaLnurl: true })

    expect(await screen.findByText(/Arkade uses the wallet's own address: .*another operator/)).toBeInTheDocument()
    expect(screen.getByText(/Bitcoin uses the wallet's own address: .*not this wallet's/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Arkade'))
    expect(await copiedQr()).toBe(DECODABLE_ARK)
    fireEvent.click(screen.getByText('Bitcoin'))
    expect(await copiedQr()).toBe(WALLET_BOARDING_ADDRESS)
  })

  it('falls back only on the rail the LNURL cannot serve for the amount', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')] })
    renderReceive(5_000, { receiveViaLnurl: true })

    expect(await screen.findByText(/Bitcoin uses the wallet's own address: Amount must be/)).toBeInTheDocument()
    expect(screen.queryByText(/Arkade uses the wallet's own address/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Arkade'))
    expect(await copiedQr()).toBe(LNURL_DESTINATIONS.arkade)
    fireEvent.click(screen.getByText('Bitcoin'))
    expect(await copiedQr()).toBe(WALLET_BOARDING_ADDRESS)
  })
})

describe('Receive screen, lnurl onboarding', () => {
  const controls = {
    self: () => screen.queryByPlaceholderText('Choose a name'),
    random: () => screen.queryByRole('button', { name: 'Pick one for me' }),
    admin: () => screen.queryByPlaceholderText('Claim code'),
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
