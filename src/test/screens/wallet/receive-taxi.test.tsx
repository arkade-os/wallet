import { useState } from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ArkAddress, type ExtendedVirtualCoin } from '@arkade-os/sdk'
import { hex } from '@scure/base'
import { AspContext } from '../../../providers/asp'
import { ConfigContext } from '../../../providers/config'
import { FlowContext } from '../../../providers/flow'
import { LimitsContext } from '../../../providers/limits'
import { NavigationContext } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import ReceiveQRCode from '../../../screens/Wallet/Receive/QrCode'
import { getReceiverTaxiUrlForNetwork } from '../../../lib/constants'
import { readReceiverTaxis } from '../../../lib/storage'
import {
  mockAspContextValue,
  mockConfigContextValue,
  mockFlowContextValue,
  mockLimitsContextValue,
  mockNavigationContextValue,
  mockSvcWallet,
  mockWalletContextValue,
} from '../mocks'
import {
  ASSET_ID,
  BITCOIN_INFO,
  INFO,
  KEYS,
  RECEIVER_ADDRESS,
  TAXI_URL,
  WIRE_ASSET_ID,
  taxiFetch,
  withRule,
} from '../../lib/receiverTaxiFixtures'
import ClaimSheet from '../../../screens/Wallet/Receive/ClaimSheet'
import { planReceiverClaim } from '../../../lib/receiverClaims'
import { assetFareClaim, bitcoinClaim, coins, satsFareClaim } from '../../lib/receiverClaimsFixtures'

vi.mock('qr', () => ({
  default: () => Array.from({ length: 21 }, () => new Uint8Array(21).fill(1)),
}))
vi.mock('../../../lib/swapMarkets', async (original) => ({
  ...(await original<typeof import('../../../lib/swapMarkets')>()),
  discoverMarkets: vi.fn(async () => []),
}))
// jsdom has no IndexedDB, and the claim-coin check reads the funding reservations from this repository.
vi.mock('../../../lib/swapRepository', async (importOriginal) => {
  const { InMemoryAssetSwapRepository } = await vi.importActual<typeof import('@arkade-os/swap')>('@arkade-os/swap')
  return {
    ...(await importOriginal<typeof import('../../../lib/swapRepository')>()),
    assetSwapRepository: new InMemoryAssetSwapRepository(),
  }
})

const RECEIVER_SCRIPT = hex.encode(ArkAddress.decode(RECEIVER_ADDRESS).pkScript)
let spendable: ExtendedVirtualCoin[] = []
const svcWallet = { ...mockSvcWallet, getSpendableVtxos: async () => spendable }

beforeEach(() => {
  if (!globalThis.PointerEvent) vi.stubGlobal('PointerEvent', MouseEvent)
})

beforeAll(() => {
  if (!navigator.serviceWorker) {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { addEventListener: vi.fn(), removeEventListener: vi.fn(), ready: Promise.resolve({}) },
      writable: true,
    })
  }
})

// The dust the fixture Taxi lends: a Taxi on another server's dust would not quote this wallet.
const aspInfo = { ...mockAspContextValue.aspInfo, signerPubkey: KEYS.server, dust: 330n }

let reconnectWallet = () => {}
let changeReceiveRequest: (request: { assetId?: string; satoshis?: number }) => void = () => {}
const Wallet = ({ children }: { children: React.ReactNode }) => {
  const [wallet, setWallet] = useState(svcWallet)
  reconnectWallet = () => setWallet({ ...svcWallet })
  return (
    <WalletContext.Provider value={{ ...mockWalletContextValue, svcWallet: wallet } as any}>
      {children}
    </WalletContext.Provider>
  )
}

const renderAssetReceive = (request: { assetId?: string; satoshis?: number } = { assetId: ASSET_ID }) => {
  const ReceiveFlow = ({ children }: { children: React.ReactNode }) => {
    const [current, setCurrent] = useState(request)
    changeReceiveRequest = setCurrent
    return (
      <FlowContext.Provider
        value={
          {
            ...mockFlowContextValue,
            recvInfo: {
              ...mockFlowContextValue.recvInfo,
              ...current,
              offchainAddr: RECEIVER_ADDRESS,
              boardingAddr: 'bc1testaddr',
            },
          } as any
        }
      >
        {children}
      </FlowContext.Provider>
    )
  }
  return render(
    <NavigationContext.Provider value={mockNavigationContextValue}>
      <AspContext.Provider value={{ ...mockAspContextValue, aspInfo }}>
        <ConfigContext.Provider value={mockConfigContextValue as any}>
          <ReceiveFlow>
            <Wallet>
              <LimitsContext.Provider value={mockLimitsContextValue}>
                <ReceiveQRCode />
              </LimitsContext.Provider>
            </Wallet>
          </ReceiveFlow>
        </ConfigContext.Provider>
      </AspContext.Provider>
    </NavigationContext.Provider>,
  )
}

describe('the receiver names his own Taxi in an asset request', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubEnv('VITE_TAXI_URL', TAXI_URL)
    vi.stubEnv('VITE_EMULATOR_PUBKEY', KEYS.emulator)
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('offers the configured Taxi and its fares, and encodes the chosen one', async () => {
    vi.stubGlobal('fetch', taxiFetch())
    renderAssetReceive()
    await userEvent.click(await screen.findByRole('button', { name: /taxi/i }))
    await userEvent.click(screen.getByRole('radio', { name: 'Use Taxi' }))
    expect(screen.getByTestId('bip21').textContent).toContain('&taxifare=flat')
    expect(screen.getByTestId('bip21').textContent).toContain(`&taxikey=${KEYS.operator}`)
  })

  it('bounds an unanswered Taxi probe and shows it as unavailable after abort', async () => {
    const controller = new AbortController()
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal)
    const fetch = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal!.reason), { once: true })
        }),
    )
    vi.stubGlobal('fetch', fetch)
    renderAssetReceive()
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(timeout).toHaveBeenCalledWith(10_000)
    expect(fetch).toHaveBeenCalledWith(`${TAXI_URL}/v1/info`, expect.objectContaining({ signal: controller.signal }))
    act(() => controller.abort())
    expect(await screen.findByText("Taxi unavailable: it can't be reached")).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /taxi/i })).toBeNull()
    expect(screen.getByTestId('bip21').textContent).not.toContain('taxi=')
  })

  it('encodes no taxi params when the user leaves it off', async () => {
    vi.stubGlobal('fetch', taxiFetch())
    renderAssetReceive()
    await screen.findByRole('button', { name: /taxi/i })
    expect(screen.getByTestId('bip21').textContent).not.toContain('taxi=')
  })

  it('shows a paused Taxi as unavailable, with its reason, and encodes no taxi params', async () => {
    vi.stubGlobal('fetch', taxiFetch({ info: { ...INFO, paused: true, maxPerPaymentTopupSats: '0' } }))
    renderAssetReceive()
    expect(await screen.findByText(/taxi unavailable: it is paused/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /taxi/i })).toBeNull()
    expect(screen.getByTestId('bip21').textContent).not.toContain('taxi=')
  })

  it('does not offer a Taxi whose server key is not the one this wallet runs against', async () => {
    vi.stubGlobal('fetch', taxiFetch({ info: { ...INFO, serverKey: KEYS.other } }))
    renderAssetReceive()
    expect(await screen.findByText(/taxi unavailable/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /taxi/i })).toBeNull()
  })

  it('shows a Taxi that does not carry this asset as unavailable, and encodes no taxi params', async () => {
    vi.stubGlobal('fetch', taxiFetch({ info: withRule({ enabled: false }) }))
    renderAssetReceive()
    expect(await screen.findByText(/taxi unavailable: it doesn't carry this asset/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /taxi/i })).toBeNull()
    expect(screen.getByTestId('bip21').textContent).not.toContain('taxi=')
  })

  it('shows a Taxi offering only a token fare as unavailable, and encodes no taxi params', async () => {
    const tokenFare = { id: 'token', currency: 'token', assetId: WIRE_ASSET_ID, pricing: { kind: 'flat', units: '1' } }
    vi.stubGlobal('fetch', taxiFetch({ info: withRule({ fares: [tokenFare] }) }))
    renderAssetReceive()
    expect(await screen.findByText(/taxi unavailable: it offers no fare a receiver can pay/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /taxi/i })).toBeNull()
    expect(screen.getByTestId('bip21').textContent).not.toContain('taxi=')
  })

  it('offers only the fares the Taxi can price for the receiver, each at what it charges him', async () => {
    const fares = [
      { id: 'flat', currency: 'sats', pricing: { kind: 'flat', units: '7' } },
      { id: 'pct', currency: 'sats', pricing: { kind: 'proportional', bps: 100, minUnits: '5', maxUnits: null } },
      {
        id: 'share',
        currency: 'sameAsset',
        pricing: { kind: 'proportional', bps: 100, minUnits: '1', maxUnits: null },
      },
    ]
    vi.stubGlobal('fetch', taxiFetch({ info: withRule({ fares }) }))
    renderAssetReceive()
    await userEvent.click(await screen.findByRole('button', { name: /taxi/i }))
    expect(screen.getAllByRole('radio').map((option) => option.getAttribute('aria-label'))).toEqual([
      'No Taxi',
      'Use Taxi · 7 sats',
      'Use Taxi · 5 sats',
    ])
  })

  it('shows a Taxi that will not lend the whole dust as unavailable, and encodes no taxi params', async () => {
    vi.stubGlobal('fetch', taxiFetch({ info: { ...INFO, maxPerPaymentTopupSats: '0' } }))
    renderAssetReceive()
    expect(await screen.findByText(/taxi unavailable: it won't lend enough/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /taxi/i })).toBeNull()
    expect(screen.getByTestId('bip21').textContent).not.toContain('taxi=')
  })

  it('hides the option on a network with no Taxi, and asks no Taxi anything', async () => {
    vi.stubEnv('VITE_TAXI_URL', '')
    const fetch = taxiFetch()
    vi.stubGlobal('fetch', fetch)
    renderAssetReceive()
    expect((await screen.findByTestId('bip21')).textContent).toContain('assetid=')
    expect(screen.queryByText(/taxi/i)).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('remembers the Taxi a request names, with the operator key its /v1/info reported', async () => {
    vi.stubGlobal('fetch', taxiFetch())
    renderAssetReceive()
    expect(readReceiverTaxis()).toEqual([])
    await userEvent.click(await screen.findByRole('button', { name: /taxi/i }))
    await userEvent.click(screen.getByRole('radio', { name: 'Use Taxi' }))
    expect(readReceiverTaxis()).toEqual([{ network: 'regtest', url: TAXI_URL, operatorKey: KEYS.operator }])
  })
})

describe('the receiver names his Taxi for a sub-dust bitcoin request', () => {
  beforeEach(() => {
    localStorage.clear()
    spendable = coins([230n], RECEIVER_SCRIPT)
    vi.stubEnv('VITE_TAXI_URL', TAXI_URL)
    vi.stubEnv('VITE_EMULATOR_PUBKEY', KEYS.emulator)
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('automatically enables a free Taxi below dust, encodes its fare and remembers it', async () => {
    vi.stubGlobal('fetch', taxiFetch({ info: BITCOIN_INFO }))
    renderAssetReceive({ satoshis: 100 })
    await waitFor(() => expect(screen.getByTestId('bip21').textContent).toContain('&taxifare=sats'))
    expect(screen.getByTestId('bip21').textContent).toContain(
      `amount=0.000001&taxi=${encodeURIComponent(TAXI_URL)}&taxikey=${KEYS.operator}&taxifare=sats`,
    )
    expect(
      screen.getByText(
        'Taxi adds 230 sats to deliver a full 330-sat coin. To claim your 100 sats, use a coin of at least 230 sats from your wallet to repay Taxi. This is not a service fee.',
      ),
    ).toBeInTheDocument()
    expect(readReceiverTaxis()).toEqual([{ network: 'regtest', url: TAXI_URL, operatorKey: KEYS.operator }])
    expect(screen.queryByText(/\b0 sats\b/)).toBeNull()
  })

  it('preserves an explicit No Taxi choice when the wallet reconnects', async () => {
    vi.stubGlobal('fetch', taxiFetch({ info: BITCOIN_INFO }))
    renderAssetReceive({ satoshis: 50 })
    await waitFor(() => expect(screen.getByTestId('bip21').textContent).toContain('&taxifare=sats'))
    await userEvent.click(screen.getByRole('button', { name: /Taxi delivery/ }))
    await userEvent.click(screen.getByRole('radio', { name: 'No Taxi' }))
    act(() => reconnectWallet())
    expect(screen.getByTestId('bip21').textContent).not.toContain('taxi=')
    expect(screen.getByRole('button', { name: /Taxi delivery.*No Taxi/ })).toBeInTheDocument()
  })

  it('defaults a fresh sub-dust amount and removes Taxi params at dust', async () => {
    vi.stubGlobal('fetch', taxiFetch({ info: BITCOIN_INFO }))
    renderAssetReceive({ satoshis: 50 })
    await waitFor(() => expect(screen.getByTestId('bip21').textContent).toContain('&taxifare=sats'))
    await userEvent.click(screen.getByRole('button', { name: /Taxi delivery/ }))
    await userEvent.click(screen.getByRole('radio', { name: 'No Taxi' }))
    expect(screen.getByTestId('bip21').textContent).not.toContain('taxi=')
    act(() => changeReceiveRequest({ satoshis: 100 }))
    await waitFor(() => expect(screen.getByTestId('bip21').textContent).toContain('&taxifare=sats'))
    expect(screen.getByText(/To claim your 100 sats/)).toBeInTheDocument()
    act(() => changeReceiveRequest({ satoshis: 330 }))
    await waitFor(() => expect(screen.getByTestId('bip21').textContent).not.toContain('taxi='))
    expect(screen.queryByRole('button', { name: /Taxi delivery/ })).toBeNull()
  })

  it('warns a receiver with no coin at this address covering the top-up that he may not be able to claim', async () => {
    spendable = [...coins([229n], RECEIVER_SCRIPT), ...coins([1000n])]
    vi.stubGlobal('fetch', taxiFetch({ info: BITCOIN_INFO }))
    renderAssetReceive({ satoshis: 100 })
    await waitFor(() => expect(screen.getByTestId('bip21').textContent).toContain('&taxifare=sats'))
    expect(
      screen.getByText(
        'Taxi adds 230 sats to deliver a full 330-sat coin. To claim your 100 sats, use a coin of at least 230 sats from your wallet to repay Taxi. This is not a service fee. You do not currently have a compatible coin to claim it. If unclaimed, the payment can return to the payer.',
      ),
    ).toBeInTheDocument()
  })

  it('keeps the chosen Taxi, unasked, when the wallet comes back as a new instance', async () => {
    const fetch = taxiFetch({ info: BITCOIN_INFO })
    vi.stubGlobal('fetch', fetch)
    renderAssetReceive({ satoshis: 100 })
    await waitFor(() => expect(screen.getByTestId('bip21').textContent).toContain('&taxifare=sats'))
    const probes = fetch.mock.calls.length
    act(() => reconnectWallet())
    expect(await screen.findByRole('button', { name: /Taxi delivery.*Free/ })).toBeInTheDocument()
    expect(screen.getByTestId('bip21').textContent).toContain('&taxifare=sats')
    expect(fetch.mock.calls).toHaveLength(probes)
  })

  it('offers no Taxi for an amount at dust, and asks it nothing', async () => {
    const fetch = taxiFetch({ info: BITCOIN_INFO })
    vi.stubGlobal('fetch', fetch)
    renderAssetReceive({ satoshis: 330 })
    expect((await screen.findByTestId('bip21')).textContent).toContain('amount=0.0000033')
    expect(screen.queryByRole('button', { name: /taxi/i })).toBeNull()
    expect(screen.getByTestId('bip21').textContent).not.toContain('taxi=')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('says why a paused Taxi is unavailable, and encodes no taxi params', async () => {
    vi.stubGlobal('fetch', taxiFetch({ info: { ...BITCOIN_INFO, paused: true } }))
    renderAssetReceive({ satoshis: 100 })
    expect(await screen.findByText('Taxi unavailable: it is paused')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /taxi/i })).toBeNull()
    expect(screen.getByTestId('bip21').textContent).not.toContain('taxi=')
  })
})

describe('ClaimSheet', () => {
  it('shows a sub-dust bitcoin delivery as the sats sent, merged into his own coin', () => {
    const claim = bitcoinClaim(230n)
    render(<ClaimSheet claim={claim} plan={planReceiverClaim(claim, coins([1000n]))} />)
    expect(screen.getByText('100 sats arrived through your Taxi.')).toBeInTheDocument()
    expect(screen.getByTestId('claim-plan').textContent).toBe(
      'Your 1,000 sats coin merges with the delivery and comes back as 1,100 sats.',
    )
  })

  it('offers no claim of a bitcoin delivery until a coin covers its top-up', () => {
    const claim = bitcoinClaim(230n)
    render(<ClaimSheet claim={claim} plan={planReceiverClaim(claim, [])} />)
    expect(screen.getByTestId('claim-plan').textContent).toBe(
      'Claiming needs a coin of at least 230 sats, and you have none.',
    )
    expect(screen.getByRole('button', { name: 'Claim' })).toBeDisabled()
  })

  it('tells the user an unclaimed delivery returns to him with no fare charged', async () => {
    render(<ClaimSheet claim={satsFareClaim(7n)} />)
    expect(screen.getByTestId('unclaimed-note').textContent).toMatch(/returns to you .* no fare/i)
  })

  it('states a sats fare, with its number, as coming off his own merged coin', () => {
    const claim = satsFareClaim(7n)
    render(<ClaimSheet claim={claim} plan={planReceiverClaim(claim, coins([1000n]))} />)
    expect(screen.getByTestId('claim-fare').textContent).toMatch(/7 sats.*your own coin/i)
    expect(screen.getByTestId('claim-plan').textContent).toMatch(/1,000 sats.*993 sats/)
  })

  it('states an asset fare, in units, as coming out of the delivery', () => {
    const claim = assetFareClaim(9n)
    render(
      <ClaimSheet
        claim={claim}
        asset={{ ticker: 'TKN', decimals: 0 }}
        plan={planReceiverClaim(claim, coins([1000n]))}
      />,
    )
    expect(screen.getByTestId('claim-fare').textContent).toMatch(/9 TKN.*out of the delivery/i)
    expect(screen.getByTestId('claim-plan').textContent).toMatch(/491 TKN/)
  })

  it('offers no claim until a coin covers the fare, and says how large one must be', () => {
    const claim = satsFareClaim(7n)
    render(<ClaimSheet claim={claim} plan={planReceiverClaim(claim, coins([334n]))} />)
    expect(screen.getByRole('button', { name: 'Claim' })).toBeDisabled()
    expect(screen.getByTestId('claim-plan').textContent).toMatch(/337 sats/)
  })
})

describe('getReceiverTaxiUrlForNetwork', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('offers the mutinynet Taxi there and none on networks without one', () => {
    expect(getReceiverTaxiUrlForNetwork('mutinynet')).toBe('https://taxi.mutinynet.arkade.sh')
    expect(getReceiverTaxiUrlForNetwork('bitcoin')).toBeUndefined()
  })

  it('lets the environment name one for any network', () => {
    vi.stubEnv('VITE_TAXI_URL', TAXI_URL)
    expect(getReceiverTaxiUrlForNetwork('bitcoin')).toBe(TAXI_URL)
  })
})
