import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { IWallet } from '@arkade-os/sdk'
import SheetModal from '../components/SheetModal'
import ClaimSheet from '../screens/Wallet/Receive/ClaimSheet'
import { AspContext } from './asp'
import { WalletContext } from './wallet'
import { extractError } from '../lib/error'
import { consoleError } from '../lib/logs'
import {
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

/** Watches the claim feed of every Taxi this wallet has named, and asks before claiming anything. */
export const ReceiverClaimsProvider = ({ children }: { children: ReactNode }) => {
  const { aspInfo } = useContext(AspContext)
  const { svcWallet, assetMetadataCache, reloadWallet } = useContext(WalletContext)
  const [taxisVersion, setTaxisVersion] = useState(0)
  const [offers, setOffers] = useState<VerifiedClaim[]>([])
  const [declined, setDeclined] = useState<ReadonlySet<string>>(new Set())
  const [plan, setPlan] = useState<ClaimPlan>()
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState('')

  const remember = useCallback((taxi: RememberedTaxi) => {
    if (rememberReceiverTaxi(taxi)) setTaxisVersion((version) => version + 1)
  }, [])

  useEffect(() => {
    setOffers([])
    if (!svcWallet || !aspInfo.url) return
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
            onOffer: (offer) =>
              setOffers((prev) =>
                prev.some(({ claim }) => claim.transferId === offer.claim.transferId) ? prev : [...prev, offer],
              ),
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
  }, [svcWallet, aspInfo.url, aspInfo.network, taxisVersion])

  const current = offers.find(({ claim }) => !declined.has(claim.transferId))
  const currentId = current?.claim.transferId

  useEffect(() => {
    setPlan(undefined)
    setError('')
    if (!current || !svcWallet) return
    let cancelled = false
    svcWallet
      .getSpendableVtxos({ withRecoverable: false })
      .then((coins) => {
        if (!cancelled) setPlan(planReceiverClaim(current.claim, coins))
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
    if (!current || !svcWallet || plan?.kind !== 'recycle') return
    setClaiming(true)
    setError('')
    try {
      await claimVerified(current, plan, (svcWallet as IWallet).identity)
      setOffers((prev) => prev.filter((offer) => offer !== current))
      reloadWallet().catch(consoleError)
    } catch (err) {
      consoleError(err, `claiming Taxi transfer ${current.claim.transferId} failed`)
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
      <SheetModal isOpen={Boolean(current)} onClose={decline}>
        {current ? (
          <ClaimSheet
            claim={current.claim}
            plan={plan}
            asset={metadata?.ticker ? { ticker: metadata.ticker, decimals: metadata.decimals } : undefined}
            claiming={claiming}
            error={error}
            onClaim={claim}
            onDismiss={decline}
          />
        ) : null}
      </SheetModal>
    </ReceiverClaimsContext.Provider>
  )
}
