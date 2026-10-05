import { createElement, useContext } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExtendedVirtualCoin, Identity } from '@arkade-os/sdk'
import type { AssetSwap } from '@arkade-os/swap'
import type { CovenantTransfer } from '@arkade-taxi/client'
import { hex } from '@scure/base'
import { ConfigContext } from '../../providers/config'
import { AspContext } from '../../providers/asp'
import { WalletContext } from '../../providers/wallet'
import { ReceiverClaimsContext, ReceiverClaimsProvider } from '../../providers/receiverClaims'
import { rememberReceiverTaxi } from '../../lib/storage'
import { withTaxiPaymentLock } from '../../lib/directTaxiSend'
import { assetSwapRepository } from '../../lib/swapRepository'
import { offerKey, type ClaimClient, type ClaimWatch, type VerifiedClaim } from '../../lib/receiverClaims'
import * as taxiActivity from '../../lib/taxiActivity'
import { readTaxiActivity, recordTaxiActivity } from '../../lib/taxiActivity'
import { mockAspContextValue, mockConfigContextValue, mockSvcWallet, mockWalletContextValue } from '../screens/mocks'
import { BOB_ADDRESS, assetFareClaim, bitcoinClaim, coins, satsFareClaim } from '../lib/receiverClaimsFixtures'
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
  const { claimable, openClaim, remember } = useContext(ReceiverClaimsContext)
  const [first] = claimable
  return (
    <>
      <button type='button' onClick={() => remember({ ...TAXI, url: 'https://taxi.additional.example' })}>
        Remember another Taxi
      </button>
      <button type='button' data-testid='probe' onClick={() => first && openClaim(first)}>
        {[...claimable].join(',')}
      </button>
    </>
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

const tree = (
  wallet: { initialized?: boolean; authState?: string; vtxos?: { spendable: unknown[]; spent: unknown[] } } = {},
  network = 'regtest',
  config: { autoClaimFreeTaxi?: boolean; configLoaded?: boolean } = {},
) => (
  <AspContext.Provider
    value={{ ...mockAspContextValue, aspInfo: { ...mockAspContextValue.aspInfo, network, signerPubkey: KEYS.server } }}
  >
    <WalletContext.Provider
      value={{ ...mockWalletContextValue, svcWallet, initialized: true, authState: 'authenticated', ...wallet } as any}
    >
      <ConfigContext.Provider
        value={
          {
            ...mockConfigContextValue,
            configLoaded: config.configLoaded ?? true,
            config: { ...mockConfigContextValue.config, autoClaimFreeTaxi: config.autoClaimFreeTaxi ?? true },
          } as any
        }
      >
        <ReceiverClaimsProvider>
          <div data-testid='app' />
          <Probe />
        </ReceiverClaimsProvider>
      </ConfigContext.Provider>
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

const mounted = async (wallet = {}, config = {}) => {
  const view = render(tree(wallet, 'regtest', config))
  await waitFor(() => expect(watchReceiverClaims).toHaveBeenCalled())
  return view
}

describe('ReceiverClaimsProvider', () => {
  beforeEach(() => {
    const locks = new Map<string, Promise<void>>()
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: {
        request: (name: string, run: () => Promise<unknown>) => {
          const next = (locks.get(name) ?? Promise.resolve()).then(run)
          locks.set(
            name,
            next.then(
              () => {},
              () => {},
            ),
          )
          return next
        },
      },
    })
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

  it.each([bitcoinClaim(280n), satsFareClaim(0n), assetFareClaim(0n)])(
    'automatically claims a verified free delivery',
    async (delivery) => {
      await mounted()
      const { verified, recycle } = offerOf(delivery)
      offer(verified)
      await waitFor(() => expect(recycle).toHaveBeenCalledTimes(1))
      await waitFor(() => expect(screen.getByTestId('probe')).not.toHaveTextContent(offerKey(verified)))
      expect(readTaxiActivity('regtest')).toMatchObject([{ state: 'recycled', claimTxid: 'f'.repeat(64) }])
    },
  )

  it('automatically purchases a free delivery without a funding coin', async () => {
    spendable = async () => []
    await mounted()
    const item = offerOf(bitcoinClaim(280n, 'purchase'))
    const purchase = vi.fn(async () => 'e'.repeat(64))
    item.verified.client.purchase = purchase
    offer(item.verified)
    await waitFor(() => expect(purchase).toHaveBeenCalledTimes(1))
    expect(item.recycle).not.toHaveBeenCalled()
  })

  it('continues past priced and waiting deliveries to another free claim', async () => {
    spendable = async () => []
    await mounted()
    const priced = offerOf()
    const waiting = offerOf(bitcoinClaim(280n))
    const free = offerOf(bitcoinClaim(270n, 'purchase'))
    const purchase = vi.fn(async () => 'e'.repeat(64))
    free.verified.client.purchase = purchase
    offer(priced.verified)
    offer(waiting.verified)
    offer(free.verified)
    await waitFor(() => expect(purchase).toHaveBeenCalledTimes(1))
    expect(priced.recycle).not.toHaveBeenCalled()
    expect(waiting.recycle).not.toHaveBeenCalled()
  })

  it('serializes claims, awaits wallet reload, and never reuses a stale consumed coin', async () => {
    let release: () => void = () => {}
    const reloadWallet = vi.fn(() => new Promise<void>((resolve) => (release = resolve)))
    await mounted({ reloadWallet })
    const first = offerOf(bitcoinClaim(280n))
    const second = offerOf(bitcoinClaim(270n))
    offer(first.verified)
    offer(second.verified)
    await waitFor(() => expect(first.recycle).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(reloadWallet).toHaveBeenCalledTimes(1))
    expect(second.recycle).not.toHaveBeenCalled()
    spendable = async () => coins([1000n, 1050n])
    await act(async () => release())
    await waitFor(() => expect(second.recycle).toHaveBeenCalledTimes(1))
    const [, input] = second.recycle.mock.calls[0] as unknown as Parameters<ClaimClient['recycle']>
    expect(input.input).toMatchObject({ vout: 1, value: 1050n })
    await act(async () => release())
  })

  it('resumes a waiting free claim on focus when a compatible coin appears', async () => {
    spendable = async () => []
    await mounted()
    const item = offerOf(bitcoinClaim(280n))
    offer(item.verified)
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent(offerKey(item.verified)))
    spendable = async () => coins([1000n])
    act(() => void window.dispatchEvent(new Event('focus')))
    await waitFor(() => expect(item.recycle).toHaveBeenCalledTimes(1))
  })

  it('never automatically retries a one-shot failure and continues to the next free offer', async () => {
    await mounted()
    const first = offerOf(
      bitcoinClaim(280n),
      vi.fn(async () => {
        throw new Error('claim failed')
      }),
    )
    const second = offerOf(bitcoinClaim(270n, 'purchase'))
    const purchase = vi.fn(async () => 'e'.repeat(64))
    second.verified.client.purchase = purchase
    offer(first.verified)
    offer(second.verified)
    await waitFor(() => expect(purchase).toHaveBeenCalledTimes(1))
    offer(first.verified)
    act(() => void window.dispatchEvent(new Event('focus')))
    await act(async () => {})
    expect(first.recycle).toHaveBeenCalledTimes(1)
    expect(await screen.findByTestId('claim-spent')).toBeInTheDocument()
  })

  it.each(['lock', 'network', 'unmount', 'withdraw'])(
    'does not sign a free claim after %s while its funding read is pending',
    async (change) => {
      const view = await mounted()
      let release: (value: ExtendedVirtualCoin[]) => void = () => {}
      const readFunding = vi.fn(() => new Promise<ExtendedVirtualCoin[]>((resolve) => (release = resolve)))
      spendable = readFunding
      const item = offerOf(bitcoinClaim(280n))
      offer(item.verified)
      await waitFor(() => expect(readFunding).toHaveBeenCalled())
      if (change === 'lock') view.rerender(tree({ initialized: false, authState: 'locked' }))
      if (change === 'network') view.rerender(tree({}, 'mutinynet'))
      if (change === 'unmount') view.unmount()
      if (change === 'withdraw') act(() => latestWatch().onGone(offerKey(item.verified)))
      await act(async () => release(coins([1000n])))
      expect(item.recycle).not.toHaveBeenCalled()
    },
  )

  it('coalesces duplicate events while a free claim is in flight', async () => {
    await mounted()
    let release: (txid: string) => void = () => {}
    const item = offerOf(
      bitcoinClaim(280n),
      vi.fn(() => new Promise<string>((resolve) => (release = resolve))),
    )
    offer(item.verified)
    await waitFor(() => expect(item.recycle).toHaveBeenCalledTimes(1))
    offer(item.verified)
    offer(item.verified)
    fireEvent.click(screen.getByTestId('probe'))
    press('Claim')
    await act(async () => release('f'.repeat(64)))
    offer(item.verified)
    expect(item.recycle).toHaveBeenCalledTimes(1)
  })

  it('excludes funding held by the direct Taxi payment journal from automatic claims', async () => {
    const senderKey = hex.encode(await svcWallet.identity.xOnlyPublicKey())
    localStorage.setItem(
      `directTaxiPending:regtest:${senderKey}`,
      JSON.stringify({
        ...JOURNAL,
        senderKey,
        attempt: { ...JOURNAL.attempt, senderInputs: [{ txid: 'c'.repeat(64), vout: 0 }] },
      }),
    )
    spendable = async () => coins([1000n, 2000n])
    await mounted()
    const item = offerOf(bitcoinClaim(280n))
    offer(item.verified)
    await waitFor(() => expect(item.recycle).toHaveBeenCalledTimes(1))
    const [, input] = item.recycle.mock.calls[0] as unknown as Parameters<ClaimClient['recycle']>
    expect(input.input).toMatchObject({ vout: 1, value: 2000n })
  })

  it('leaves a free recycle pending when all compatible coins are reserved', async () => {
    const reservations = vi
      .spyOn(assetSwapRepository, 'getAllSwaps')
      .mockResolvedValue([
        { fundingIntent: { state: 'submitted', inputs: [{ txid: 'c'.repeat(64), vout: 0 }] } } as unknown as AssetSwap,
      ])
    try {
      await mounted()
      const item = offerOf(bitcoinClaim(280n))
      offer(item.verified)
      await screen.findByTestId('claim-plan')
      await act(async () => {})
      expect(item.recycle).not.toHaveBeenCalled()
      expect(screen.getByTestId('probe')).toHaveTextContent(offerKey(item.verified))
    } finally {
      reservations.mockRestore()
    }
  })

  it('resumes waiting free claims when wallet coin state changes', async () => {
    spendable = async () => []
    const view = await mounted()
    const item = offerOf(bitcoinClaim(280n))
    offer(item.verified)
    await screen.findByTestId('claim-plan')
    spendable = async () => coins([1000n])
    view.rerender(tree({ vtxos: { spendable: coins([1000n]), spent: [] } }))
    await waitFor(() => expect(item.recycle).toHaveBeenCalledTimes(1))
  })

  it('keeps free claiming manual when automatic claims are disabled', async () => {
    await mounted({}, { autoClaimFreeTaxi: false })
    const item = offerOf(bitcoinClaim(280n))
    offer(item.verified)
    await waitFor(() => expect(claimButton()).toBeEnabled())
    expect(item.recycle).not.toHaveBeenCalled()
    press('Claim')
    await waitFor(() => expect(item.recycle).toHaveBeenCalledTimes(1))
  })

  it('waits for the configuration to load before automatically claiming', async () => {
    const view = await mounted({}, { configLoaded: false })
    const item = offerOf(bitcoinClaim(280n))
    offer(item.verified)
    await waitFor(() => expect(claimButton()).toBeEnabled())
    expect(item.recycle).not.toHaveBeenCalled()
    view.rerender(tree({}, 'regtest', { configLoaded: true }))
    await waitFor(() => expect(item.recycle).toHaveBeenCalledTimes(1))
  })

  it('does not sign if automatic claims are disabled while reading funding', async () => {
    const view = await mounted()
    let release: (value: ExtendedVirtualCoin[]) => void = () => {}
    const readFunding = vi.fn(() => new Promise<ExtendedVirtualCoin[]>((resolve) => (release = resolve)))
    spendable = readFunding
    const item = offerOf(bitcoinClaim(280n))
    offer(item.verified)
    await waitFor(() => expect(readFunding).toHaveBeenCalled())
    view.rerender(tree({}, 'regtest', { autoClaimFreeTaxi: false }))
    await act(async () => release(coins([1000n])))
    expect(item.recycle).not.toHaveBeenCalled()
  })

  it('waits behind the same wallet payment lock used by a concurrent Taxi send', async () => {
    await mounted()
    let release: () => void = () => {}
    let entered = false
    const held = withTaxiPaymentLock(
      svcWallet,
      'regtest',
      () =>
        new Promise<void>((resolve) => {
          entered = true
          release = resolve
        }),
    )
    await waitFor(() => expect(entered).toBe(true))
    const item = offerOf(bitcoinClaim(280n))
    offer(item.verified)
    await act(async () => {})
    expect(item.recycle).not.toHaveBeenCalled()
    await act(async () => {
      release()
      await held
    })
    await waitFor(() => expect(item.recycle).toHaveBeenCalledTimes(1))
  })

  it('keeps free claiming manual when the browser cannot coordinate wallet inputs', async () => {
    Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined })
    await mounted()
    const item = offerOf(bitcoinClaim(280n))
    offer(item.verified)
    await waitFor(() => expect(claimButton()).toBeEnabled())
    expect(item.recycle).not.toHaveBeenCalled()
    press('Claim')
    await waitFor(() => expect(item.recycle).toHaveBeenCalledTimes(1))
  })

  it('never repeats a successful financial claim when activity storage throws', async () => {
    const records = vi.spyOn(taxiActivity, 'recordTaxiActivity').mockImplementation(() => {
      throw new Error('storage full')
    })
    try {
      await mounted()
      const item = offerOf(bitcoinClaim(280n))
      offer(item.verified)
      await waitFor(() => expect(item.recycle).toHaveBeenCalledTimes(1))
      await waitFor(() => expect(screen.getByTestId('probe')).not.toHaveTextContent(offerKey(item.verified)))
      offer(item.verified)
      act(() => void window.dispatchEvent(new Event('focus')))
      await act(async () => {})
      expect(item.recycle).toHaveBeenCalledTimes(1)
    } finally {
      records.mockRestore()
    }
  })

  it.each(['lock', 'network', 'disabled', 'unmount', 'withdraw'])(
    'checks authorization at the actual signer after provider reads when %s',
    async (change) => {
      const view = await mounted()
      let release: () => void = () => {}
      let entered = false
      const sign = vi.spyOn(svcWallet.identity, 'sign').mockResolvedValue({} as never)
      try {
        const recycle = vi.fn(async (_transfer: CovenantTransfer, input: { identity: Identity }) => {
          entered = true
          await new Promise<void>((resolve) => (release = resolve))
          await input.identity.sign({} as never)
          return 'f'.repeat(64)
        })
        const item = offerOf(bitcoinClaim(280n), recycle as never)
        offer(item.verified)
        await waitFor(() => expect(entered).toBe(true))
        if (change === 'lock') view.rerender(tree({ initialized: false, authState: 'locked' }))
        if (change === 'network') view.rerender(tree({}, 'mutinynet'))
        if (change === 'disabled') view.rerender(tree({}, 'regtest', { autoClaimFreeTaxi: false }))
        if (change === 'unmount') view.unmount()
        if (change === 'withdraw') act(() => latestWatch().onGone(offerKey(item.verified)))
        await act(async () => release())
        expect(sign).not.toHaveBeenCalled()
      } finally {
        sign.mockRestore()
      }
    },
  )

  it('shows a free claim planning failure instead of silently hiding the delivery', async () => {
    spendable = vi.fn(async () => {
      throw new Error('funding read unavailable')
    })
    await mounted()
    const item = offerOf(bitcoinClaim(280n))
    offer(item.verified)
    expect(await screen.findByText('funding read unavailable')).toBeInTheDocument()
    expect(item.recycle).not.toHaveBeenCalled()
    const reads = (spendable as ReturnType<typeof vi.fn>).mock.calls.length
    await act(async () => {})
    expect((spendable as ReturnType<typeof vi.fn>).mock.calls.length).toBe(reads)
  })

  it('keeps an in-flight verified claim authorized when remembering another Taxi', async () => {
    await mounted()
    let release: () => void = () => {}
    let entered = false
    const sign = vi.spyOn(svcWallet.identity, 'sign').mockResolvedValue({} as never)
    try {
      const recycle = vi.fn(async (_transfer: CovenantTransfer, input: { identity: Identity }) => {
        entered = true
        await new Promise<void>((resolve) => (release = resolve))
        await input.identity.sign({} as never)
        return 'f'.repeat(64)
      })
      const item = offerOf(bitcoinClaim(280n), recycle as never)
      offer(item.verified)
      await waitFor(() => expect(entered).toBe(true))
      fireEvent.click(screen.getByRole('button', { name: 'Remember another Taxi' }))
      await waitFor(() => expect(watchReceiverClaims).toHaveBeenCalledTimes(2))
      offer({ ...item.verified })
      await act(async () => release())
      expect(sign).toHaveBeenCalledTimes(1)
      expect(recycle).toHaveBeenCalledTimes(1)
      expect(screen.queryByTestId('claim-spent')).toBeNull()
      expect(readTaxiActivity('regtest')).toMatchObject([{ state: 'recycled', claimTxid: 'f'.repeat(64) }])
    } finally {
      sign.mockRestore()
    }
  })

  it('keeps an existing paid claim visible when remembering another Taxi restarts the watch', async () => {
    await mounted()
    const item = offerOf()
    offer(item.verified)
    await waitFor(() => expect(claimButton()).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Remember another Taxi', hidden: true }))
    await waitFor(() => expect(watchReceiverClaims).toHaveBeenCalledTimes(2))
    offer(item.verified)
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent(offerKey(item.verified)))
    await waitFor(() => expect(claimButton()).toBeEnabled())
    expect(item.recycle).not.toHaveBeenCalled()
  })

  it('ignores callbacks from a stopped feed', async () => {
    const view = await mounted()
    const old = latestWatch()
    view.rerender(tree({}, 'mutinynet'))
    await waitFor(() => expect(watchReceiverClaims).toHaveBeenCalledTimes(2))
    const item = offerOf(bitcoinClaim(280n))
    act(() => old.onOffer(item.verified))
    await act(async () => {})
    expect(item.recycle).not.toHaveBeenCalled()
    expect(screen.getByTestId('probe')).not.toHaveTextContent(offerKey(item.verified))
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
