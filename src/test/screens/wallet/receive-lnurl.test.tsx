import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { SingleKey } from '@arkade-os/sdk'
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
  LNURL_DESTINATIONS,
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

const receiveTree = (satoshis = 0, config: Partial<Config> = {}) => (
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
                    },
                  } as never
                }
              >
                <WalletContext.Provider value={{ ...mockWalletContextValue, svcWallet } as never}>
                  <LimitsContext.Provider value={mockLimitsContextValue}>
                    <SwapsContext.Provider value={{ receiveLightning, outcomeOf: () => undefined } as never}>
                      <ReceiveQRCode />
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
const renderReceive = (satoshis = 0, config: Partial<Config> = {}) => render(receiveTree(satoshis, config))

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

    await screen.findByText(/No name yet/)
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
    session: () => screen.queryByRole('button', { name: 'No name' }),
  }

  it.each(['self', 'random', 'admin', 'session'] as const)(
    'offers only the %s choice when only it is advertised',
    async (mode) => {
      serve({ modes: [mode] })
      renderReceive()

      await screen.findByText('Get a lightning address')
      for (const [other, control] of Object.entries(controls)) {
        // A claim code is always paired with the name it unlocks.
        const expected = other === mode || (mode === 'admin' && other === 'self')
        expect(control() !== null, other).toBe(expected)
      }
    },
  )

  it('offers no choice at all when the server requires an API key', async () => {
    serve({ modes: ['self', 'random', 'session'], requireApiKey: true })
    renderReceive()

    expect(await screen.findByText(/does not offer addresses/)).toBeInTheDocument()
    for (const control of Object.values(controls)) expect(control()).toBeNull()
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
    serve({ modes: ['random'] })
    renderReceive()

    fireEvent.click(await screen.findByRole('button', { name: 'Pick one for me' }))

    expect(await screen.findByText('brave-otter@lnurl.test')).toBeInTheDocument()
  })

  it('claims a reserved name with its claim code', async () => {
    serve({ modes: ['admin'] })
    renderReceive()

    fireEvent.change(await screen.findByPlaceholderText('Choose a name'), { target: { value: 'vip' } })
    fireEvent.change(screen.getByPlaceholderText('Claim code'), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'Claim name' }))

    expect(await screen.findByText('vip@lnurl.test')).toBeInTheDocument()
    const [, init] = server.calls('POST', '/lnurl/address')[0]
    expect(JSON.parse(init!.body as string)).toMatchObject({ username: 'vip', claimCode: 'secret' })
  })

  it('claims without a name: the QR carries the session LNURL and a name can be added', async () => {
    serve({ modes: ['self', 'session'] })
    renderReceive()

    fireEvent.click(await screen.findByRole('button', { name: 'No name' }))

    expect(await screen.findByRole('button', { name: 'Add a name' })).toBeInTheDocument()
    expect(screen.queryByText(/@lnurl\.test/)).not.toBeInTheDocument()
    expect(await qrLightning()).toMatch(/^lnurl1/i)
  })

  it('shows the name when a nameless claim finds the identity already upgraded', async () => {
    serve({ modes: ['session'], sessionRow: namedAddress('erin', 'LNURL1SESSIONERIN') })
    renderReceive()

    fireEvent.click(await screen.findByRole('button', { name: 'No name' }))

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
    expect(screen.queryByRole('button', { name: 'No name' })).not.toBeInTheDocument()
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

  it('offers no "Add a name" when the server allows no naming mode', async () => {
    serve({ modes: ['session'], addresses: [namelessAddress()] })
    renderReceive()

    await screen.findByText(/No name yet/)
    expect(await qrLightning()).toMatch(/^lnurl1/i)
    expect(screen.queryByRole('button', { name: 'Add a name' })).not.toBeInTheDocument()
  })
})

describe('Receive screen, token rails', () => {
  const tokensOn = { receiveViaLnurl: true, receiveViaTokens: true }
  const payRequests = () => server.calls('GET', '/.well-known/lnurlp/alice')
  const tokenQuotes = () => callbacks().filter((url) => url.searchParams.get('paymentOption')?.startsWith('ff-'))
  const tokenSelect = () => screen.queryByRole('combobox', { name: 'Pay with a token' })
  const pick = async (label: string) => {
    const select = await screen.findByRole('combobox', { name: 'Pay with a token' })
    const option = within(select).getByRole('option', { name: label }) as HTMLOptionElement
    fireEvent.change(select, { target: { value: option.value } })
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

  it('renders a simulated Solana option with a Solana Pay value', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')], simulated: true })
    renderReceive(20_000, tokensOn)

    await pick('USDT (Solana Devnet)')

    expect(await screen.findByText('Send exactly 17.156 USDT on Solana Devnet')).toBeInTheDocument()
    expect(screen.getByText(/^Quote by Simulated, valid for \d+:\d\d$/)).toBeInTheDocument()
    expect(await copiedQr()).toBe(solanaUri(20_000_000))
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

    await waitFor(() => expect(payRequests()).toHaveLength(2))
    await waitFor(() => expect(callbacks()).toHaveLength(3))
    expect(tokenSelect()).not.toBeInTheDocument()
  })

  it('asks for no token quote until a token method is picked', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')], tokens: true })
    renderReceive(20_000, tokensOn)

    await screen.findByRole('combobox', { name: 'Pay with a token' })
    await waitFor(() => expect(callbacks()).toHaveLength(3))
    expect(tokenQuotes()).toHaveLength(0)
  })

  it('offers only the token methods whose bounds hold the amount', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')], tokens: true })
    renderReceive(5_000, tokensOn)

    const select = await screen.findByRole('combobox', { name: 'Pay with a token' })
    expect(
      within(select)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Pay with a token', 'USDT (Arbitrum One)'])
  })

  it('offers no token method without an amount', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')], tokens: true })
    renderReceive(0, tokensOn)

    await waitFor(() => expect(payRequests()).toHaveLength(1))
    await screen.findByText('alice@lnurl.test')
    expect(tokenSelect()).not.toBeInTheDocument()
  })

  it('says why a token has no quote', async () => {
    serve({
      modes: ['self'],
      addresses: [namedAddress('alice')],
      tokens: true,
      tokenErrors: { 'ff-usdtarbitrum': 'paymentOption ff-usdtarbitrum is busy, try again shortly' },
    })
    renderReceive(20_000, tokensOn)

    await pick('USDT (Arbitrum One)')

    expect(await screen.findByText(/No quote for this token: .*busy/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy QR code' })).toBeDisabled()
  })

  it('token rails are absent when receiveViaTokens is off', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')], tokens: true })
    renderReceive(20_000, { receiveViaLnurl: true })

    await waitFor(() => expect(callbacks()).toHaveLength(3))
    expect(tokenSelect()).not.toBeInTheDocument()
    expect(payRequests()).toHaveLength(1)
  })

  it('token rails are absent when receiveViaLnurl is off even with receiveViaTokens on', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')], tokens: true })
    renderReceive(20_000, { receiveViaTokens: true })

    await waitFor(() => expect(callbacks()).toHaveLength(1))
    expect(tokenSelect()).not.toBeInTheDocument()
    expect(payRequests()).toHaveLength(1)
  })
})
