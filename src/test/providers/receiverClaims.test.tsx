import { createElement, useContext } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExtendedVirtualCoin } from '@arkade-os/sdk'
import type { AssetSwap } from '@arkade-os/swap'
import type { CovenantTransfer } from '@arkade-taxi/client'
import { hex } from '@scure/base'
import { AspContext } from '../../providers/asp'
import { WalletContext } from '../../providers/wallet'
import { ReceiverClaimsContext, ReceiverClaimsProvider } from '../../providers/receiverClaims'
import { rememberReceiverTaxi } from '../../lib/storage'
import { assetSwapRepository } from '../../lib/swapRepository'
import { offerKey, type ClaimClient, type ClaimWatch, type VerifiedClaim } from '../../lib/receiverClaims'
import { readTaxiActivity, recordTaxiActivity } from '../../lib/taxiActivity'
import { mockAspContextValue, mockSvcWallet, mockWalletContextValue } from '../screens/mocks'
import { BOB_ADDRESS, assetFareClaim, coins, satsFareClaim } from '../lib/receiverClaimsFixtures'
import { ASSET_ID, KEYS, TAXI_URL } from '../lib/receiverTaxiFixtures'

const pollTaxiActivity = vi.hoisted(() => vi.fn(async () => {}))
const refreshTaxiActivity = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('../../lib/taxiActivity', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/taxiActivity')>()),
  pollTaxiActivity,
  refreshTaxiActivity,
}))

// jsdom has no IndexedDB, and the claim reads the funding reservations from this repository.
vi.mock('../../lib/swapRepository', async (importOriginal) => {
  const { InMemoryAssetSwapRepository } = await vi.importActual<typeof import('@arkade-os/swap')>('@arkade-os/swap')
  return {
    ...(await importOriginal<typeof import('../../lib/swapRepository')>()),
    assetSwapRepository: new InMemoryAssetSwapRepository(),
  }
})

const stop = vi.hoisted(() => vi.fn())
const watchReceiverClaims = vi.hoisted(() => vi.fn<(watch: ClaimWatch) => () => void>(() => stop))
vi.mock('../../lib/receiverClaims', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/receiverClaims')>()),
  watchReceiverClaims,
}))

// Every frame the sheet renders, so a frame pairing one offer with another's plan is visible.
const sheet = vi.hoisted(() => ({ frames: [] as { transferId: string; plan?: unknown }[], explode: false }))
vi.mock('../../screens/Wallet/Receive/ClaimSheet', async (importOriginal) => {
  const { default: ClaimSheet } = await importOriginal<typeof import('../../screens/Wallet/Receive/ClaimSheet')>()
  return {
    default: (props: Parameters<typeof ClaimSheet>[0]) => {
      sheet.frames.push({ transferId: props.claim.transferId, plan: props.plan })
      if (sheet.explode) throw new Error('the sheet broke')
      return createElement(ClaimSheet, props)
    },
  }
})

const TAXI = { network: 'regtest', url: TAXI_URL, operatorKey: KEYS.operator }
let spendable: () => Promise<ExtendedVirtualCoin[]>
const svcWallet = {
  ...mockSvcWallet,
  getAddress: async () => BOB_ADDRESS,
  getSpendableVtxos: () => spendable(),
}

const Probe = () => {
  const { claimable, openClaim } = useContext(ReceiverClaimsContext)
  const [first] = claimable
  return (
    <button type='button' data-testid='probe' onClick={() => first && openClaim(first)}>
      {[...claimable].join(',')}
    </button>
  )
}

const JOURNAL = {
  network: 'regtest',
  taxiUrl: TAXI_URL,
  operatorKey: KEYS.operator,
  transferId: 'tr-journal',
  expectedTxid: 'a'.repeat(64),
  expectedVout: 0,
  mode: 'recycle',
  receiverAddress: BOB_ADDRESS,
  assetId: ASSET_ID,
  assetAmount: '1',
  attempt: {
    kind: 'covenant',
    quote: { params: { topup: '330' }, fare: { currency: 'sats', units: '0' }, expiresAt: 2_000 },
  },
}

const tree = (wallet: { initialized?: boolean; authState?: string } = {}, network = 'regtest') => (
  <AspContext.Provider
    value={{ ...mockAspContextValue, aspInfo: { ...mockAspContextValue.aspInfo, network, signerPubkey: KEYS.server } }}
  >
    <WalletContext.Provider
      value={{ ...mockWalletContextValue, svcWallet, initialized: true, authState: 'authenticated', ...wallet } as any}
    >
      <ReceiverClaimsProvider>
        <div data-testid='app' />
        <Probe />
      </ReceiverClaimsProvider>
    </WalletContext.Provider>
  </AspContext.Provider>
)

const offerOf = (claim = satsFareClaim(7n), recycle = vi.fn(async () => 'f'.repeat(64)), taxi = TAXI) => ({
  recycle,
  verified: {
    taxi,
    claim,
    transfer: { transferId: claim.transferId } as unknown as CovenantTransfer,
    client: {
      info: vi.fn(),
      subscribeClaims: vi.fn(),
      verifyIncomingClaim: vi.fn(),
      recycle,
    } as unknown as ClaimClient,
  } satisfies VerifiedClaim,
})

const latestWatch = () => watchReceiverClaims.mock.calls.at(-1)![0]
const offer = (verified: VerifiedClaim) => act(() => latestWatch().onOffer(verified))
const claimButton = () => screen.getByRole('button', { name: 'Claim' })
// A click alone: the drawer's drag handlers need pointer capture, which jsdom lacks.
const press = (name: string) => fireEvent.click(screen.getByRole('button', { name }))

const mounted = async (wallet = {}) => {
  const view = render(tree(wallet))
  await waitFor(() => expect(watchReceiverClaims).toHaveBeenCalled())
  return view
}

describe('ReceiverClaimsProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    stop.mockClear()
    watchReceiverClaims.mockClear()
    pollTaxiActivity.mockClear()
    refreshTaxiActivity.mockClear()
    sheet.frames = []
    sheet.explode = false
    spendable = async () => coins([1000n])
    rememberReceiverTaxi(TAXI)
    rememberReceiverTaxi({ network: 'mutinynet', url: 'https://taxi.other.example', operatorKey: KEYS.operator })
  })

  it("watches this network's remembered Taxis, and stops on a network change and on unmount", async () => {
    const { rerender, unmount } = await mounted()
    expect(latestWatch()).toMatchObject({ taxis: [TAXI], receiverAddress: BOB_ADDRESS })
    rerender(tree({}, 'mutinynet'))
    await waitFor(() => expect(watchReceiverClaims).toHaveBeenCalledTimes(2))
    expect(stop).toHaveBeenCalledTimes(1)
    unmount()
    expect(stop).toHaveBeenCalledTimes(2)
  })

  it('puts a verified claim in front of the user and claims nothing until he confirms', async () => {
    await mounted()
    const { verified, recycle } = offerOf()
    offer(verified)
    expect(await screen.findByTestId('unclaimed-note')).toBeInTheDocument()
    await waitFor(() => expect(claimButton()).toBeEnabled())
    expect(recycle).not.toHaveBeenCalled()
    press('Claim')
    await waitFor(() => expect(recycle).toHaveBeenCalledTimes(1))
  })

  it('does not offer a claimed delivery again after another feed event', async () => {
    await mounted()
    const { verified, recycle } = offerOf()
    offer(verified)
    await waitFor(() => expect(claimButton()).toBeEnabled())
    press('Claim')
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Claim' })).toBeNull())

    offer(verified)
    expect(screen.queryByRole('button', { name: 'Claim' })).toBeNull()
    expect(recycle).toHaveBeenCalledTimes(1)
  })

  it('watches nothing and shows nothing while the wallet is locked, and resumes once it is unlocked', async () => {
    const { rerender } = await mounted()
    offer(offerOf().verified)
    await waitFor(() => expect(claimButton()).toBeEnabled())

    rerender(tree({ initialized: false, authState: 'locked' }))
    expect(stop).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Claim' })).toBeNull())
    expect(screen.queryByTestId('unclaimed-note')).toBeNull()

    rerender(tree())
    await waitFor(() => expect(watchReceiverClaims).toHaveBeenCalledTimes(2))
  })

  it('never starts watching a wallet that has not been unlocked', async () => {
    render(tree({ initialized: false, authState: 'locked' }))
    await act(async () => {})
    expect(watchReceiverClaims).not.toHaveBeenCalled()
  })

  it('watches nothing for a wallet marked locked even while it still reads as initialized', async () => {
    render(tree({ initialized: true, authState: 'locked' }))
    await act(async () => {})
    expect(watchReceiverClaims).not.toHaveBeenCalled()
  })

  it('watches and offers claims in a passwordless wallet, the state a new or restored wallet runs in', async () => {
    await mounted({ authState: 'passwordless' })
    const { verified, recycle } = offerOf()
    offer(verified)
    expect(await screen.findByTestId('unclaimed-note')).toBeInTheDocument()
    await waitFor(() => expect(claimButton()).toBeEnabled())
    press('Claim')
    await waitFor(() => expect(recycle).toHaveBeenCalledTimes(1))
  })

  it('keeps the offers of two Taxis apart when they reuse one transfer id', async () => {
    await mounted()
    const other = { ...TAXI, url: 'https://taxi.second.example' }
    const first = offerOf(satsFareClaim(7n)).verified
    const second = offerOf(satsFareClaim(7n), undefined, other).verified
    offer(first)
    offer(second)
    act(() => latestWatch().onGone(offerKey(first)))
    await waitFor(() => expect(claimButton()).toBeEnabled())
    press('Claim')
    await waitFor(() => expect(second.client.recycle).toHaveBeenCalledTimes(1))
    expect(first.client.recycle).not.toHaveBeenCalled()
  })

  it('refuses to sign when the wallet locks while the claim re-reads the coins', async () => {
    const { rerender } = await mounted()
    const { verified, recycle } = offerOf()
    offer(verified)
    await waitFor(() => expect(claimButton()).toBeEnabled())
    let release: (value: ExtendedVirtualCoin[]) => void = () => {}
    spendable = () => new Promise((resolve) => (release = resolve))
    press('Claim')
    rerender(tree({ initialized: false, authState: 'locked' }))
    await act(async () => release(coins([1000n])))
    expect(recycle).not.toHaveBeenCalled()
  })

  it("never renders an offer with another offer's plan when the one on screen is withdrawn", async () => {
    await mounted()
    const first = offerOf(satsFareClaim(7n)).verified
    const second = offerOf(assetFareClaim(9n)).verified
    offer(first)
    offer(second)
    await waitFor(() => expect(claimButton()).toBeEnabled())
    const firstPlan = sheet.frames.at(-1)!.plan
    expect(firstPlan).toBeDefined()
    act(() => latestWatch().onGone(offerKey(first)))
    await waitFor(() => expect(sheet.frames.at(-1)).toMatchObject({ transferId: second.claim.transferId }))
    const secondFrames = sheet.frames.filter(({ transferId }) => transferId === second.claim.transferId)
    expect(secondFrames.some(({ plan }) => plan === firstPlan)).toBe(false)
  })

  it('closes an explicitly requested claim when it disappears instead of opening another delivery', async () => {
    await mounted()
    const first = offerOf(satsFareClaim(7n)).verified
    const second = offerOf(assetFareClaim(9n)).verified
    offer(first)
    offer(second)
    await waitFor(() => expect(claimButton()).toBeEnabled())
    fireEvent.click(screen.getByTestId('probe'))
    act(() => latestWatch().onGone(offerKey(first)))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Claim' })).toBeNull())
    expect(sheet.frames.some(({ transferId }) => transferId === second.claim.transferId)).toBe(false)
    fireEvent.click(screen.getByTestId('probe'))
    await waitFor(() => expect(sheet.frames.at(-1)?.transferId).toBe(second.claim.transferId))
  })

  it('offers the next delivery after an explicitly requested claim succeeds', async () => {
    await mounted()
    const first = offerOf(satsFareClaim(7n)).verified
    const second = offerOf(assetFareClaim(9n)).verified
    offer(first)
    offer(second)
    await waitFor(() => expect(claimButton()).toBeEnabled())
    fireEvent.click(screen.getByTestId('probe'))
    press('Claim')
    await waitFor(() => expect(first.client.recycle).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(sheet.frames.at(-1)?.transferId).toBe(second.claim.transferId))
  })

  it('plans the claim again from the coins as they are when the user confirms', async () => {
    await mounted()
    const { verified, recycle } = offerOf()
    offer(verified)
    await waitFor(() => expect(claimButton()).toBeEnabled())
    spendable = async () => coins([2000n, 500n])
    press('Claim')
    await waitFor(() => expect(recycle).toHaveBeenCalledTimes(1))
    const [, input] = recycle.mock.calls[0] as unknown as Parameters<ClaimClient['recycle']>
    expect(input.input).toMatchObject({ vout: 1, value: 500n })
  })

  it.each(['prepared', 'submitted'])(
    'never merges a coin a %s funding holds, choosing the next one that covers the fare',
    async (state) => {
      spendable = async () => coins([1000n, 2000n])
      const held = { fundingIntent: { state, inputs: [{ txid: 'c'.repeat(64), vout: 0 }] } } as unknown as AssetSwap
      const reservations = vi.spyOn(assetSwapRepository, 'getAllSwaps').mockResolvedValue([held])
      try {
        await mounted()
        const { verified, recycle } = offerOf()
        offer(verified)
        await waitFor(() => expect(claimButton()).toBeEnabled())
        press('Claim')
        await waitFor(() => expect(recycle).toHaveBeenCalledTimes(1))
        const [, input] = recycle.mock.calls[0] as unknown as Parameters<ClaimClient['recycle']>
        expect(input.input).toMatchObject({ vout: 1, value: 2000n })
      } finally {
        reservations.mockRestore()
      }
    },
  )

  it('after a failed recycle, says to reload to retry and offers no second attempt', async () => {
    await mounted()
    const { verified, recycle } = offerOf(
      satsFareClaim(7n),
      vi.fn(async (): Promise<string> => {
        throw new Error('receiver funding input is not independently spendable')
      }),
    )
    offer(verified)
    await waitFor(() => expect(claimButton()).toBeEnabled())
    press('Claim')
    expect(await screen.findByTestId('claim-spent')).toHaveTextContent(/reload/i)
    expect(claimButton()).toBeDisabled()
    press('Claim')
    expect(recycle).toHaveBeenCalledTimes(1)
  })

  it('puts a declined offer back on the next focus and on the next feed event about it', async () => {
    await mounted()
    const { verified } = offerOf()
    offer(verified)
    await screen.findByTestId('unclaimed-note')
    press('Not now')
    await waitFor(() => expect(screen.queryByTestId('unclaimed-note')).toBeNull())
    act(() => void window.dispatchEvent(new Event('focus')))
    expect(await screen.findByTestId('unclaimed-note')).toBeInTheDocument()

    press('Not now')
    await waitFor(() => expect(screen.queryByTestId('unclaimed-note')).toBeNull())
    offer(verified)
    expect(await screen.findByTestId('unclaimed-note')).toBeInTheDocument()
  })

  it('records a verified delivery, and then its claim with the claim transaction', async () => {
    await mounted()
    offer(offerOf().verified)
    expect(readTaxiActivity('regtest')).toMatchObject([{ role: 'receiver', transferId: 'tr-sats-7', state: 'locked' }])
    await waitFor(() => expect(claimButton()).toBeEnabled())
    press('Claim')
    await waitFor(() =>
      expect(readTaxiActivity('regtest')).toMatchObject([{ state: 'recycled', claimTxid: 'f'.repeat(64) }]),
    )
  })

  it('lists a delivery put off with Not now as claimable, and reopens it when asked', async () => {
    await mounted()
    const { verified } = offerOf()
    offer(verified)
    await screen.findByTestId('unclaimed-note')
    press('Not now')
    await waitFor(() => expect(screen.queryByTestId('unclaimed-note')).toBeNull())
    expect(screen.getByTestId('probe')).toHaveTextContent(offerKey(verified))
    fireEvent.click(screen.getByTestId('probe'))
    expect(await screen.findByTestId('unclaimed-note')).toBeInTheDocument()
  })

  it('re-reads a delivery its Taxi withdraws', async () => {
    await mounted()
    const { verified } = offerOf()
    offer(verified)
    act(() => latestWatch().onGone(offerKey(verified)))
    expect(refreshTaxiActivity).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'receiver', transferId: verified.claim.transferId }),
    )
  })

  it('records a journaled payment once unlocked, and never over a newer state', async () => {
    const senderKey = hex.encode(await svcWallet.identity.xOnlyPublicKey())
    localStorage.setItem(`directTaxiPending:regtest:${senderKey}`, JSON.stringify({ ...JOURNAL, senderKey }))
    const { unmount } = await mounted()
    await waitFor(() =>
      expect(readTaxiActivity('regtest')).toMatchObject([{ role: 'sender', state: 'quoted', createdAt: 2_000 }]),
    )
    unmount()
    recordTaxiActivity({ ...readTaxiActivity('regtest')[0], state: 'locked', updatedAt: 3_000 })
    await mounted()
    await waitFor(() => expect(pollTaxiActivity).toHaveBeenCalledTimes(2))
    expect(readTaxiActivity('regtest')).toMatchObject([{ state: 'locked', createdAt: 2_000 }])
  })

  it('polls Taxi records once unlocked and every 30 s while visible, and never once locked', async () => {
    vi.useFakeTimers()
    try {
      const { rerender } = render(tree())
      await vi.waitFor(() => expect(pollTaxiActivity).toHaveBeenCalledTimes(1))
      expect(pollTaxiActivity).toHaveBeenCalledWith('regtest')
      await act(async () => void vi.advanceTimersByTime(30_000))
      expect(pollTaxiActivity).toHaveBeenCalledTimes(2)
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
      await act(async () => void vi.advanceTimersByTime(30_000))
      expect(pollTaxiActivity).toHaveBeenCalledTimes(2)
      delete (document as { visibilityState?: string }).visibilityState
      rerender(tree({ initialized: false, authState: 'locked' }))
      await act(async () => void vi.advanceTimersByTime(60_000))
      expect(pollTaxiActivity).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps the wallet running when the claim sheet itself throws', async () => {
    await mounted()
    sheet.explode = true
    offer(offerOf().verified)
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByTestId('app')).toBeInTheDocument()
  })
})
