import { useContext } from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ClaimWatch } from '@arkade-taxi/client/wallet'
import { AspContext } from '../../providers/asp'
import { ConfigContext } from '../../providers/config'
import { WalletContext } from '../../providers/wallet'
import { ReceiverClaimsContext, ReceiverClaimsProvider } from '../../providers/receiverClaims'
import { claimKey, type walletClaimWatch } from '../../lib/receiverClaims'
import { rememberReceiverTaxi } from '../../lib/storage'
import { mockAspContextValue, mockConfigContextValue, mockWalletContextValue } from '../screens/mocks'

const TAXI = 'https://taxi.test'
const OPERATOR = 'ab'.repeat(32)
const OWN = 'tark1ownaddress'
const RENEWAL = 'tark1renewalcontract'

const feed = vi.hoisted(() => ({ claims: [] as unknown[], subscribed: [] as string[] }))

// The real watch and triage; only the Taxi's stream is stubbed, and it lists every claim whatever was asked.
vi.mock('../../lib/receiverClaims', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/receiverClaims')>()
  return {
    ...actual,
    walletClaimWatch: (args: Parameters<typeof walletClaimWatch>[0]): ClaimWatch => ({
      ...args,
      clientFor: () =>
        ({
          subscribeClaims: ({
            receiverAddresses,
            onSnapshot,
          }: {
            receiverAddresses: string[]
            onSnapshot: (snapshot: { claims: unknown[] }) => void
          }) => {
            feed.subscribed.push(...receiverAddresses)
            queueMicrotask(() => onSnapshot({ claims: feed.claims }))
            return () => {}
          },
          verifyIncomingClaim: async () => ({}),
        }) as never,
      trust: {} as never,
      spendConfig: async () => ({}) as never,
    }),
  }
})
vi.mock('../../lib/taxiActivity', () => ({
  pollTaxiActivity: async () => {},
  readTaxiActivity: () => [],
  recordTaxiActivity: () => {},
  refreshTaxiActivity: async () => {},
}))
vi.mock('../../lib/directTaxiSend', () => ({
  getPendingDirectTaxi: async () => undefined,
  taxiActivityFromPending: () => ({}),
  withTaxiPaymentLock: async (_wallet: unknown, _network: string, run: () => unknown) => run(),
}))
vi.mock('../../lib/taxiInputReservations', () => ({
  reconcileTaxiInputReservations: async () => {},
  reserveTaxiClaim: async () => {},
}))
vi.mock('../../lib/swapRepository', () => ({ unreservedCoins: async () => [] }))
vi.mock('../../screens/Wallet/Receive/ClaimSheet', () => ({ default: () => null }))
vi.mock('../../components/SheetModal', () => ({ default: () => null }))

const claimFor = (receiverAddress: string) => ({
  transferId: 't1',
  receiverAddress,
  state: 'locked',
  claimable: true,
  updatedAt: 1,
  claim: {
    params: { operatorKey: OPERATOR, receiverKey: '11'.repeat(32), dust: '330', paymentSats: '100', topup: '330' },
    outpoint: { txid: '22'.repeat(32), vout: 0 },
  },
})
const row = (template: string, address: string) => ({ type: 'executor', params: { template }, address })
const walletWith = (rows: () => Promise<unknown[]>) => ({
  identity: {},
  getAddress: async () => OWN,
  getContractManager: async () => ({ getContracts: async () => rows() }),
})

function Claimable() {
  const { claimable } = useContext(ReceiverClaimsContext)
  return <output data-testid='claimable'>{[...claimable].join('|')}</output>
}

const renderClaims = (wallet: Record<string, unknown>, config: Record<string, unknown> = {}) => {
  const tree = (overrides: Record<string, unknown> = {}) => (
    <AspContext.Provider value={mockAspContextValue as never}>
      <ConfigContext.Provider
        value={
          {
            ...mockConfigContextValue,
            config: { ...mockConfigContextValue.config, ...config },
            configLoaded: true,
          } as never
        }
      >
        <WalletContext.Provider
          value={
            {
              ...mockWalletContextValue,
              initialized: true,
              authState: 'authenticated',
              reloadWallet: async () => {},
              ...wallet,
              ...overrides,
            } as never
          }
        >
          <ReceiverClaimsProvider>
            <Claimable />
          </ReceiverClaimsProvider>
        </WalletContext.Provider>
      </ConfigContext.Provider>
    </AspContext.Provider>
  )
  const view = render(tree())
  return { ...view, rerenderWith: (overrides: Record<string, unknown>) => view.rerender(tree(overrides)) }
}

const offered = () => screen.getByTestId('claimable')

describe('Taxi claim watch', () => {
  beforeEach(() => {
    localStorage.clear()
    feed.claims = []
    feed.subscribed = []
    rememberReceiverTaxi({ network: mockAspContextValue.aspInfo.network, url: TAXI, operatorKey: OPERATOR })
  })

  it('offers a claim bound to the Executor renewal contract the wallet showed', async () => {
    feed.claims = [claimFor(RENEWAL)]
    renderClaims({ svcWallet: walletWith(async () => [row('renewal', RENEWAL), row('boarding', 'tark1boarding')]) })

    await waitFor(() => expect(offered()).toHaveTextContent(claimKey(TAXI, 't1')))
    expect(feed.subscribed.sort()).toEqual([OWN, RENEWAL].sort())
  })

  it('picks up a renewal contract registered after the watch started', async () => {
    let rows: unknown[] = []
    feed.claims = [claimFor(RENEWAL)]
    const view = renderClaims({ svcWallet: walletWith(async () => rows), executorSettledCount: 0 })
    await waitFor(() => expect(feed.subscribed).toEqual([OWN]))
    expect(offered()).toBeEmptyDOMElement()

    rows = [row('renewal', RENEWAL)]
    view.rerenderWith({ executorSettledCount: 1 })

    await waitFor(() => expect(offered()).toHaveTextContent(claimKey(TAXI, 't1')))
  })

  it('keeps watching its own address when the contract repository cannot be read', async () => {
    feed.claims = [claimFor(OWN)]
    const svcWallet = {
      ...walletWith(async () => []),
      getContractManager: async () => Promise.reject(new Error('contract repository unavailable')),
    }
    renderClaims({ svcWallet })

    await waitFor(() => expect(offered()).toHaveTextContent(claimKey(TAXI, 't1')))
    expect(feed.subscribed).toEqual([OWN])
  })

  it('watches only the own address of an HD wallet, which never shows a renewal contract', async () => {
    feed.claims = [claimFor(RENEWAL)]
    renderClaims({ svcWallet: walletWith(async () => [row('renewal', RENEWAL)]) }, { walletMode: 'hd' })

    await waitFor(() => expect(feed.subscribed).toEqual([OWN]))
    await act(async () => {})
    expect(offered()).toBeEmptyDOMElement()
  })
})
