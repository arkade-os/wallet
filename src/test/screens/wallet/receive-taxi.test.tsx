import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
import { ASSET_ID, INFO, KEYS, RECEIVER_ADDRESS, TAXI_URL, taxiFetch } from '../../lib/receiverTaxiFixtures'

vi.mock('qr', () => ({
  default: () => Array.from({ length: 21 }, () => new Uint8Array(21).fill(1)),
}))

beforeAll(() => {
  if (!navigator.serviceWorker) {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { addEventListener: vi.fn(), removeEventListener: vi.fn(), ready: Promise.resolve({}) },
      writable: true,
    })
  }
})

const aspInfo = { ...mockAspContextValue.aspInfo, signerPubkey: KEYS.server }

const renderAssetReceive = () =>
  render(
    <NavigationContext.Provider value={mockNavigationContextValue}>
      <AspContext.Provider value={{ ...mockAspContextValue, aspInfo }}>
        <ConfigContext.Provider value={mockConfigContextValue as any}>
          <FlowContext.Provider
            value={
              {
                ...mockFlowContextValue,
                recvInfo: {
                  ...mockFlowContextValue.recvInfo,
                  assetId: ASSET_ID,
                  offchainAddr: RECEIVER_ADDRESS,
                  boardingAddr: 'bc1testaddr',
                },
              } as any
            }
          >
            <WalletContext.Provider value={{ ...mockWalletContextValue, svcWallet: mockSvcWallet } as any}>
              <LimitsContext.Provider value={mockLimitsContextValue}>
                <ReceiveQRCode />
              </LimitsContext.Provider>
            </WalletContext.Provider>
          </FlowContext.Provider>
        </ConfigContext.Provider>
      </AspContext.Provider>
    </NavigationContext.Provider>,
  )

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
    await userEvent.click(screen.getByRole('option', { name: /flat/i }))
    expect(screen.getByTestId('bip21').textContent).toContain('&taxifare=flat')
    expect(screen.getByTestId('bip21').textContent).toContain(`&taxikey=${KEYS.operator}`)
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
    await userEvent.click(screen.getByRole('option', { name: /flat/i }))
    expect(readReceiverTaxis()).toEqual([{ network: 'regtest', url: TAXI_URL, operatorKey: KEYS.operator }])
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
