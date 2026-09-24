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
  // App's own test before it shows the wallet (App.tsx:180). Locking keeps `svcWallet` and its
  // identity alive (wallet.tsx:1007-1020), so the wallet object alone says nothing about the lock.
  const unlocked = Boolean(initialized) && authState === 'authenticated'
  const unlockedRef = useRef(unlocked)
  unlockedRef.current = unlocked
  const [taxisVersion, setTaxisVersion] = useState(0)
  const [offers, setOffers] = useState<VerifiedClaim[]>([])
  const [declined, setDeclined] = useState<ReadonlySet<string>>(new Set())
  const [spent, setSpent] = useState<ReadonlySet<string>>(new Set())
  const [planned, setPlanned] = useState<{ transferId: string; plan: ClaimPlan }>()
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
              const id = offer.claim.transferId
              setOffers((prev) => (prev.some(({ claim }) => claim.transferId === id) ? prev : [...prev, offer]))
              setDeclined((prev) => without(prev, id))
            },
            onGone: (transferId) => setOffers((prev) => prev.filter(({ claim }) => claim.transferId !== transferId)),
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

  const current = unlocked ? offers.find(({ claim }) => !declined.has(claim.transferId)) : undefined
  const currentId = current?.claim.transferId
  const plan = planned && planned.transferId === currentId ? planned.plan : undefined

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
        if (!cancelled) setPlanned({ transferId: current.claim.transferId, plan: next })
      })
      .catch((err) => {
        if (!cancelled) setError(extractError(err))
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId, svcWallet])

  const decline = () => {
    if (currentId) setDeclined((prev) => new Set(prev).add(currentId))
  }

  const claim = async () => {
    const offer = current
    if (!offer || !svcWallet || !unlockedRef.current || spent.has(offer.claim.transferId)) return
    const id = offer.claim.transferId
    setClaiming(true)
    setError('')
    try {
      // The coin shown may be gone by now, and a recycle that fails cannot be retried on this page.
      const fresh = await planFor(offer)
      setPlanned({ transferId: id, plan: fresh })
      if (fresh.kind !== 'recycle' || !unlockedRef.current) return
      await claimVerified(offer, fresh, (svcWallet as IWallet).identity)
      setOffers((prev) => prev.filter((other) => other !== offer))
      reloadWallet().catch(consoleError)
    } catch (err) {
      consoleError(err, `claiming Taxi transfer ${id} failed`)
      if (err instanceof ClaimSpent) setSpent((prev) => new Set(prev).add(id))
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
                spent={spent.has(current.claim.transferId)}
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
