import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { IWallet } from '@arkade-os/sdk'
import ErrorBoundary from '../components/ErrorBoundary'
import SheetModal from '../components/SheetModal'
import ClaimSheet from '../screens/Wallet/Receive/ClaimSheet'
import { AspContext } from './asp'
import { WalletContext } from './wallet'
import { extractError } from '../lib/error'
import { consoleError } from '../lib/logs'
import {
  ClaimSpent,
  claimVerified,
  deliveredAssetId,
  offerKey,
  planReceiverClaim,
  walletClaimWatch,
  watchReceiverClaims,
  type ClaimPlan,
  type VerifiedClaim,
} from '../lib/receiverClaims'
import { readReceiverTaxis, rememberReceiverTaxi, type RememberedTaxi } from '../lib/storage'

interface ReceiverClaimsContextProps {
  /** Record a Taxi this wallet named in a request, so its claims are watched from now on. */
  remember: (taxi: RememberedTaxi) => void
}

export const ReceiverClaimsContext = createContext<ReceiverClaimsContextProps>({
  remember: (taxi) => void rememberReceiverTaxi(taxi),
})

const without = (set: ReadonlySet<string>, id: string): ReadonlySet<string> => {
  if (!set.has(id)) return set
  const next = new Set(set)
  next.delete(id)
  return next
}

/** Watches the claim feed of every Taxi this wallet has named, and asks before claiming anything. */
export const ReceiverClaimsProvider = ({ children }: { children: ReactNode }) => {
  const { aspInfo } = useContext(AspContext)
  const { svcWallet, assetMetadataCache, reloadWallet, initialized, authState } = useContext(WalletContext)
  // As App decides: only 'locked' routes to Unlock (App.tsx:109, :137), so 'passwordless', the state
  // a new or restored wallet runs in, counts. Locking also clears `initialized` but keeps `svcWallet`
  // and its identity alive (wallet.tsx:1007-1020), so the wallet object says nothing about the lock.
  const unlocked = Boolean(initialized) && authState !== 'locked'
  const unlockedRef = useRef(unlocked)
  unlockedRef.current = unlocked
  const [taxisVersion, setTaxisVersion] = useState(0)
  const [offers, setOffers] = useState<VerifiedClaim[]>([])
  const [declined, setDeclined] = useState<ReadonlySet<string>>(new Set())
  const [spent, setSpent] = useState<ReadonlySet<string>>(new Set())
  const [planned, setPlanned] = useState<{ key: string; plan: ClaimPlan }>()
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState('')

  const remember = useCallback((taxi: RememberedTaxi) => {
    if (rememberReceiverTaxi(taxi)) setTaxisVersion((version) => version + 1)
  }, [])

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
              setOffers((prev) => (prev.some((other) => offerKey(other) === key) ? prev : [...prev, offer]))
              setDeclined((prev) => without(prev, key))
            },
            onGone: (key) => setOffers((prev) => prev.filter((offer) => offerKey(offer) !== key)),
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

  const current = unlocked ? offers.find((offer) => !declined.has(offerKey(offer))) : undefined
  const currentKey = current && offerKey(current)
  const plan = planned && planned.key === currentKey ? planned.plan : undefined

  const planFor = async (offer: VerifiedClaim): Promise<ClaimPlan> => {
    const coins = await svcWallet!.getSpendableVtxos({ withRecoverable: false })
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
  }

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
      if (fresh.kind !== 'recycle' || !unlockedRef.current) return
      await claimVerified(offer, fresh, (svcWallet as IWallet).identity)
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
  const value = useMemo(() => ({ remember }), [remember])

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
