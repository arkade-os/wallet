import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { toXOnlySignerHex, type IWallet, type NetworkName } from '@arkade-os/sdk'
import { hex } from '@scure/base'
import ErrorBoundary from '../components/ErrorBoundary'
import SheetModal from '../components/SheetModal'
import ClaimSheet from '../screens/Wallet/Receive/ClaimSheet'
import { AspContext } from './asp'
import { WalletContext } from './wallet'
import { extractError } from '../lib/error'
import { consoleError } from '../lib/logs'
import {
  ClaimSpent,
  claimKey,
  claimVerified,
  deliveredAssetId,
  offerKey,
  planReceiverClaim,
  taxiActivityFromOffer,
  walletClaimWatch,
  watchReceiverClaims,
  type ClaimPlan,
  type VerifiedClaim,
} from '../lib/receiverClaims'
import { readReceiverTaxis, rememberReceiverTaxi, type RememberedTaxi } from '../lib/storage'
import { assetSwapRepository, unreservedCoins } from '../lib/swapRepository'
import { getEmulatorPubkeyForNetwork, getReceiverTaxiUrlForNetwork } from '../lib/constants'
import { taxiClient } from '../lib/receiverTaxi'
import { getPendingDirectTaxi, taxiActivityFromPending } from '../lib/directTaxiSend'
import { pollTaxiActivity, readTaxiActivity, recordTaxiActivity, refreshTaxiActivity } from '../lib/taxiActivity'
import { isCanonicalTxid } from '../lib/carrierActivity'

const TAXI_STATUS_POLL_MS = 30_000

interface ReceiverClaimsContextProps {
  /** Record a Taxi this wallet named in a request, so its claims are watched from now on. */
  remember: (taxi: RememberedTaxi) => void
  /** The `offerKey` of every verified delivery waiting to be claimed. */
  claimable: ReadonlySet<string>
  /** Put this delivery's claim sheet back in front of the user, even one he put off. */
  openClaim: (key: string) => void
}

export const ReceiverClaimsContext = createContext<ReceiverClaimsContextProps>({
  remember: (taxi) => void rememberReceiverTaxi(taxi),
  claimable: new Set(),
  openClaim: () => {},
})

const without = (set: ReadonlySet<string>, id: string): ReadonlySet<string> => {
  if (!set.has(id)) return set
  const next = new Set(set)
  next.delete(id)
  return next
}

/** Watches the claim feed of every Taxi this wallet has named, keeps history's Taxi records current, and asks before
 * claiming anything. */
export const ReceiverClaimsProvider = ({ children }: { children: ReactNode }) => {
  const { aspInfo } = useContext(AspContext)
  const { svcWallet, assetMetadataCache, reloadWallet, initialized, authState } = useContext(WalletContext)
  // As App decides: only 'locked' routes to Unlock (App.tsx:109, :137), so 'passwordless', the state
  // a new or restored wallet runs in, counts. Locking also clears `initialized` but keeps `svcWallet`
  // and its identity alive (wallet.tsx:1007-1020), so the wallet object says nothing about the lock.
  const unlocked = Boolean(initialized) && authState !== 'locked'
  const unlockedRef = useRef(unlocked)
  useLayoutEffect(() => {
    unlockedRef.current = unlocked
  }, [unlocked])
  const [taxisVersion, setTaxisVersion] = useState(0)
  const [offers, setOffers] = useState<VerifiedClaim[]>([])
  const claimedRef = useRef(new Set<string>())
  const [declined, setDeclined] = useState<ReadonlySet<string>>(new Set())
  const [requested, setRequested] = useState<string>()
  const [spent, setSpent] = useState<ReadonlySet<string>>(new Set())
  const [planned, setPlanned] = useState<{ key: string; plan: ClaimPlan }>()
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState('')

  const remember = useCallback((taxi: RememberedTaxi) => {
    if (rememberReceiverTaxi(taxi)) setTaxisVersion((version) => version + 1)
  }, [])

  useEffect(() => {
    const network = aspInfo.network as NetworkName
    const url = getReceiverTaxiUrlForNetwork(network)
    const emulatorKey = getEmulatorPubkeyForNetwork(network)
    if (!unlocked || !aspInfo.url || !url || !emulatorKey) return
    if (readReceiverTaxis().some((taxi) => taxi.network === network && taxi.url === url)) return
    let stopped = false
    taxiClient(url, fetch)
      .info()
      .then((info) => {
        if (stopped) return
        if (info.serverKey !== toXOnlySignerHex(aspInfo.signerPubkey) || info.emulatorKey !== hex.encode(emulatorKey))
          throw new Error('Configured Taxi uses a different Arkade server or co-signer')
        remember({ network, url, operatorKey: info.operatorKey })
      })
      .catch((err) => consoleError(err, 'could not watch configured Taxi'))
    return () => {
      stopped = true
    }
  }, [unlocked, aspInfo.url, aspInfo.network, aspInfo.signerPubkey, remember])

  useEffect(() => {
    setOffers([])
    setPlanned(undefined)
    if (!unlocked || !svcWallet || !aspInfo.url) return
    const taxis = readReceiverTaxis().filter((taxi) => taxi.network === aspInfo.network)
    if (taxis.length === 0) return
    let stop: (() => void) | undefined
    let stopped = false
    svcWallet
      .getAddress()
      .then((receiverAddress) => {
        if (stopped) return
        stop = watchReceiverClaims(
          walletClaimWatch({
            aspInfo,
            taxis,
            receiverAddress,
            onOffer: (offer) => {
              const key = offerKey(offer)
              if (claimedRef.current.has(key)) return
              recordTaxiActivity(taxiActivityFromOffer(offer))
              setOffers((prev) => (prev.some((other) => offerKey(other) === key) ? prev : [...prev, offer]))
              setDeclined((prev) => without(prev, key))
            },
            onGone: (key) => {
              setOffers((prev) => prev.filter((offer) => offerKey(offer) !== key))
              const record = readTaxiActivity(aspInfo.network).find(
                (r) => r.role === 'receiver' && claimKey(r.taxiUrl, r.transferId) === key,
              )
              if (record) refreshTaxiActivity(record).catch((err) => consoleError(err, `could not re-read ${key}`))
            },
          }),
        )
      })
      .catch((err) => consoleError(err, 'could not watch Taxi claims'))
    return () => {
      stopped = true
      stop?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked, svcWallet, aspInfo.url, aspInfo.network, taxisVersion])

  useEffect(() => {
    if (!unlocked || !svcWallet) return
    const network = aspInfo.network
    let stopped = false
    const poll = () => {
      if (!stopped && document.visibilityState === 'visible') pollTaxiActivity(network).catch(consoleError)
    }
    // A journal written before this store existed has no record yet; the rank rule keeps a newer one as it is.
    getPendingDirectTaxi(svcWallet, network)
      .then((pending) => {
        const createdAt = pending?.record.attempt?.quote.expiresAt ?? Math.floor(Date.now() / 1000)
        if (pending) recordTaxiActivity(taxiActivityFromPending(pending.record, createdAt))
      })
      .catch((err) => consoleError(err, 'could not read the pending Taxi payment'))
      .finally(poll)
    const timer = setInterval(poll, TAXI_STATUS_POLL_MS)
    window.addEventListener('focus', poll)
    document.addEventListener('visibilitychange', poll)
    return () => {
      stopped = true
      clearInterval(timer)
      window.removeEventListener('focus', poll)
      document.removeEventListener('visibilitychange', poll)
    }
  }, [unlocked, svcWallet, aspInfo.network])

  useEffect(() => {
    const reoffer = () => {
      if (document.visibilityState === 'visible') setDeclined(new Set())
    }
    window.addEventListener('focus', reoffer)
    document.addEventListener('visibilitychange', reoffer)
    return () => {
      window.removeEventListener('focus', reoffer)
      document.removeEventListener('visibilitychange', reoffer)
    }
  }, [])

  const current = unlocked
    ? (offers.find((offer) => offerKey(offer) === requested) ?? offers.find((offer) => !declined.has(offerKey(offer))))
    : undefined
  const currentKey = current && offerKey(current)
  const plan = planned && planned.key === currentKey ? planned.plan : undefined

  const planFor = async (offer: VerifiedClaim): Promise<ClaimPlan> => {
    const coins = await unreservedCoins(svcWallet!, assetSwapRepository)
    return planReceiverClaim(offer.claim, coins)
  }

  useEffect(() => {
    setError('')
    if (!current || !svcWallet) return
    let cancelled = false
    planFor(current)
      .then((next) => {
        if (!cancelled) setPlanned({ key: offerKey(current), plan: next })
      })
      .catch((err) => {
        if (!cancelled) setError(extractError(err))
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey, svcWallet])

  const decline = () => {
    if (currentKey) setDeclined((prev) => new Set(prev).add(currentKey))
    setRequested(undefined)
  }

  const openClaim = useCallback((key: string) => {
    setDeclined((prev) => without(prev, key))
    setRequested(key)
  }, [])

  const claim = async () => {
    const offer = current
    if (!offer || !svcWallet || !unlockedRef.current || spent.has(offerKey(offer))) return
    const key = offerKey(offer)
    const id = offer.claim.transferId
    setClaiming(true)
    setError('')
    try {
      // The coin shown may be gone by now, and a recycle that fails cannot be retried on this page.
      const fresh = await planFor(offer)
      setPlanned({ key, plan: fresh })
      if (fresh.kind === 'wait-for-reclaim' || !unlockedRef.current) return
      const claimTxid = await claimVerified(offer, fresh, (svcWallet as IWallet).identity)
      recordTaxiActivity({
        ...taxiActivityFromOffer(offer),
        state: fresh.kind === 'purchase' ? 'purchased' : 'recycled',
        ...(isCanonicalTxid(claimTxid) ? { claimTxid } : {}),
        updatedAt: Math.floor(Date.now() / 1000),
      })
      claimedRef.current.add(key)
      setOffers((prev) => prev.filter((other) => other !== offer))
      reloadWallet().catch(consoleError)
    } catch (err) {
      consoleError(err, `claiming Taxi transfer ${id} failed`)
      if (err instanceof ClaimSpent) setSpent((prev) => new Set(prev).add(key))
      setError(extractError(err))
    } finally {
      setClaiming(false)
    }
  }

  const assetId = current && deliveredAssetId(current.claim)
  const metadata = assetId ? assetMetadataCache.get(assetId)?.metadata : undefined
  const claimable = useMemo(() => new Set(offers.map(offerKey)), [offers])
  const value = useMemo(() => ({ remember, claimable, openClaim }), [remember, claimable, openClaim])

  return (
    <ReceiverClaimsContext.Provider value={value}>
      {children}
      {unlocked ? (
        <ErrorBoundary>
          <SheetModal isOpen={Boolean(current)} onClose={decline}>
            {current ? (
              <ClaimSheet
                claim={current.claim}
                plan={plan}
                asset={metadata?.ticker ? { ticker: metadata.ticker, decimals: metadata.decimals } : undefined}
                claiming={claiming}
                spent={spent.has(offerKey(current))}
                error={error}
                onClaim={claim}
                onDismiss={decline}
              />
            ) : null}
          </SheetModal>
        </ErrorBoundary>
      ) : null}
    </ReceiverClaimsContext.Provider>
  )
}
