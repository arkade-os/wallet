import { useContext, type ReactNode } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CovenantSpendBusyError } from '@arkade-taxi/client'
import type { ClaimWatch } from '@arkade-taxi/client/wallet'
import { AspContext } from '../../providers/asp'
import { ConfigContext } from '../../providers/config'
import { WalletContext } from '../../providers/wallet'
import { ReceiverClaimsContext, ReceiverClaimsProvider } from '../../providers/receiverClaims'
import { claimKey, type walletClaimWatch } from '../../lib/receiverClaims'
import { translations } from '../../lib/i18n'
import { rememberReceiverTaxi } from '../../lib/storage'
import { mockAspContextValue, mockConfigContextValue, mockWalletContextValue } from '../screens/mocks'

const TAXI = 'https://taxi.test'
const OPERATOR = 'ab'.repeat(32)
const OWN = 'tark1ownaddress'
const RENEWAL = 'tark1renewalcontract'
const ROTATED = 'tark1rotatedkeyrenewal'

const feed = vi.hoisted(() => ({ claims: [] as unknown[], subscribed: [] as string[], purchase: vi.fn() }))

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
          purchase: feed.purchase,
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
vi.mock('../../screens/Wallet/Receive/ClaimSheet', () => ({
  default: ({ plan, claiming, spent, error, onClaim }: Record<string, unknown> & { onClaim: () => void }) => (
    <>
      <output data-testid='claim-error'>{error as string}</output>
      <button disabled={!plan || Boolean(claiming) || Boolean(spent)} onClick={onClaim}>
        Claim
      </button>
    </>
  ),
}))
vi.mock('../../components/SheetModal', () => ({
  default: ({ isOpen, children }: { isOpen: boolean; children?: ReactNode }) =>
    isOpen ? <div data-testid='sheet-modal'>{children}</div> : null,
}))

const claimFor = (receiverAddress: string, transferId = 't1') => ({
  transferId,
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
const claimButton = () => screen.getByRole('button', { name: 'Claim' })

describe('Taxi claim watch', () => {
  beforeEach(() => {
    localStorage.clear()
    feed.claims = []
    feed.subscribed = []
    feed.purchase.mockReset()
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

  it('watches the renewal contract the session shows even when it belongs to a rotated key', async () => {
    feed.claims = [claimFor(ROTATED)]
    const rotated = { ...row('renewal', ROTATED), metadata: { signingDescriptor: "tr([00000000/86'/1'/0']xpub/0/1)" } }
    renderClaims({ svcWallet: walletWith(async () => [rotated]), executorRenewalAddress: ROTATED })

    await waitFor(() => expect(offered()).toHaveTextContent(claimKey(TAXI, 't1')))
    expect(feed.subscribed.sort()).toEqual([OWN, ROTATED].sort())
  })

  it('adds a renewal contract shown later to the watch, and leaves the wallet alone when the session clears it', async () => {
    feed.claims = [claimFor(RENEWAL)]
    const getAddress = vi.fn(async () => OWN)
    const view = renderClaims({ svcWallet: { ...walletWith(async () => []), getAddress } })
    await waitFor(() => expect(feed.subscribed).toEqual([OWN]))

    view.rerenderWith({ executorRenewalAddress: RENEWAL })
    await waitFor(() => expect(offered()).toHaveTextContent(claimKey(TAXI, 't1')))

    view.rerenderWith({ executorRenewalAddress: undefined })
    await act(async () => {})
    expect(getAddress).toHaveBeenCalledTimes(1)
    expect(feed.subscribed.sort()).toEqual([OWN, RENEWAL].sort())
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

  it('watches the renewal contracts of its own key in any wallet mode, never those of a rotated key', async () => {
    feed.claims = [claimFor(RENEWAL), claimFor(ROTATED, 't2')]
    const rotated = { ...row('renewal', ROTATED), metadata: { signingDescriptor: "tr([00000000/86'/1'/0']xpub/0/1)" } }
    renderClaims({ svcWallet: walletWith(async () => [row('renewal', RENEWAL), rotated]) }, { walletMode: 'hd' })

    await waitFor(() => expect(offered()).toHaveTextContent(claimKey(TAXI, 't1')))
    await act(async () => {})
    expect(offered()).not.toHaveTextContent(claimKey(TAXI, 't2'))
    expect(feed.subscribed.sort()).toEqual([OWN, RENEWAL].sort())
  })

  it('leaves a claim refused for a batch-registered coin unspent and claimable again', async () => {
    feed.claims = [claimFor(OWN)]
    feed.purchase
      .mockRejectedValueOnce(new CovenantSpendBusyError([`${'22'.repeat(32)}:0`], new Error('VTXO_ALREADY_REGISTERED')))
      .mockResolvedValueOnce('33'.repeat(32))
    renderClaims({ svcWallet: walletWith(async () => []) })
    await waitFor(() => expect(claimButton()).toBeEnabled())

    fireEvent.click(claimButton())
    await waitFor(() =>
      expect(screen.getByTestId('claim-error')).toHaveTextContent(translations.en.transaction.taxiClaimBusy),
    )
    await waitFor(() => expect(claimButton()).toBeEnabled())
    expect(offered()).toHaveTextContent(claimKey(TAXI, 't1'))

    fireEvent.click(claimButton())
    await waitFor(() => expect(offered()).toBeEmptyDOMElement())
    expect(feed.purchase).toHaveBeenCalledTimes(2)
  })
})
