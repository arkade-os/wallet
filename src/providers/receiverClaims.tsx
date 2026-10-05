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
import { ConfigContext } from './config'
import { AspContext } from './asp'
import { WalletContext } from './wallet'
import { extractError } from '../lib/error'
import { consoleError } from '../lib/logs'
import {
  ClaimSpent,
  claimKey,
  claimVerified,
  guardedClaimIdentity,
  deliveredAssetId,
  offerKey,
  isFreeReceiverClaim,
  receiverFareOf,
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
import { getPendingDirectTaxi, taxiActivityFromPending, withTaxiPaymentLock } from '../lib/directTaxiSend'
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
 * charging a receiver. Free claims are processed sequentially. */
export const ReceiverClaimsProvider = ({ children }: { children: ReactNode }) => {
  const { aspInfo } = useContext(AspContext)
  const { config, configLoaded } = useContext(ConfigContext)
  const autoClaims = configLoaded && config.autoClaimFreeTaxi !== false && Boolean(navigator.locks)
  const autoClaimsRef = useRef(autoClaims)
  useLayoutEffect(() => {
    autoClaimsRef.current = autoClaims
  }, [autoClaims])
  const { svcWallet, assetMetadataCache, reloadWallet, initialized, authState, vtxos } = useContext(WalletContext)
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
  const [wake, setWake] = useState(0)
  const session = useRef(0)
  const offersRef = useRef<VerifiedClaim[]>([])
  const busy = useRef(false)
  const mountedRef = useRef(true)
  const coinsRef = useRef(vtxos)
  coinsRef.current = vtxos
  const wakeRef = useRef(wake)
  wakeRef.current = wake
  useLayoutEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])
  const spentRef = useRef(new Set<string>())
  const consumed = useRef(new Set<string>())
  useLayoutEffect(() => {
    session.current++
    offersRef.current = []
    return () => {
      session.current++
      offersRef.current = []
    }
  }, [unlocked, svcWallet, aspInfo.url, aspInfo.network])

  useLayoutEffect(() => {
    claimedRef.current.clear()
    spentRef.current.clear()
    consumed.current.clear()
    setSpent(new Set())
  }, [svcWallet, aspInfo.url, aspInfo.network])

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
    setOffers(offersRef.current)
    if (offersRef.current.length === 0) setPlanned(undefined)
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
            initialOffers: offersRef.current,
            onOffer: (offer) => {
              if (stopped) return
              const key = offerKey(offer)
              if (claimedRef.current.has(key)) return
              try {
                recordTaxiActivity(taxiActivityFromOffer(offer))
              } catch (err) {
                consoleError(err)
              }
              if (!offersRef.current.some((other) => offerKey(other) === key)) {
                offersRef.current = [...offersRef.current, offer]
                setOffers(offersRef.current)
              }
              setWake((value) => value + 1)
              setDeclined((prev) => without(prev, key))
            },
            onGone: (key) => {
              if (stopped) return
              offersRef.current = offersRef.current.filter((offer) => offerKey(offer) !== key)
              setOffers(offersRef.current)
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
      if (document.visibilityState === 'visible') {
        setDeclined(new Set())
        setWake((value) => value + 1)
      }
    }
    window.addEventListener('focus', reoffer)
    document.addEventListener('visibilitychange', reoffer)
    return () => {
      window.removeEventListener('focus', reoffer)
      document.removeEventListener('visibilitychange', reoffer)
    }
  }, [])

  const current = unlocked
    ? requested !== undefined
      ? offers.find((offer) => offerKey(offer) === requested)
      : offers.find((offer) => !declined.has(offerKey(offer)))
    : undefined
  const currentKey = current && offerKey(current)
  const plan = planned && planned.key === currentKey ? planned.plan : undefined
  const showClaim =
    Boolean(current) &&
    (!autoClaims ||
      requested !== undefined ||
      spent.has(currentKey!) ||
      Boolean(error) ||
      (receiverFareOf(current!.claim)?.units ?? 0n) !== 0n ||
      plan?.kind === 'wait-for-reclaim')

  const planFor = async (offer: VerifiedClaim): Promise<ClaimPlan> => {
    const wallet = svcWallet!
    const [coins, pending] = await Promise.all([
      unreservedCoins(wallet, assetSwapRepository),
      getPendingDirectTaxi(wallet, aspInfo.network),
    ])
    const held = new Set(pending?.record.attempt?.senderInputs?.map(({ txid, vout }) => `${txid}:${vout}`) ?? [])
    return planReceiverClaim(
      offer.claim,
      coins.filter(
        (coin) => !consumed.current.has(`${coin.txid}:${coin.vout}`) && !held.has(`${coin.txid}:${coin.vout}`),
      ),
    )
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

  const runClaim = async (offer: VerifiedClaim, automatic: boolean, generation: number) => {
    const key = offerKey(offer)
    const valid = () => session.current === generation && unlockedRef.current && offersRef.current.includes(offer)
    if (!svcWallet || !valid() || spentRef.current.has(key) || claimedRef.current.has(key)) return
    const execute = async () => {
      try {
        if (!valid() || (automatic && !autoClaimsRef.current)) return
        const fresh = await planFor(offer)
        if (!valid() || (automatic && !autoClaimsRef.current)) return
        if (currentKey === key) setPlanned({ key, plan: fresh })
        if (fresh.kind === 'wait-for-reclaim' || (automatic && !isFreeReceiverClaim(offer.claim, fresh))) return
        if (fresh.kind === 'recycle') consumed.current.add(`${fresh.coin.txid}:${fresh.coin.vout}`)
        setClaiming(true)
        setError('')
        const identity = guardedClaimIdentity(
          (svcWallet as IWallet).identity,
          () => valid() && (!automatic || autoClaimsRef.current),
        )
        const claimTxid = await claimVerified(offer, fresh, identity)
        try {
          recordTaxiActivity({
            ...taxiActivityFromOffer(offer),
            state: fresh.kind === 'purchase' ? 'purchased' : 'recycled',
            ...(isCanonicalTxid(claimTxid) ? { claimTxid } : {}),
            updatedAt: Math.floor(Date.now() / 1000),
          })
        } catch (err) {
          consoleError(err, 'could not record the Taxi claim')
        }
        if (session.current !== generation) return
        claimedRef.current.add(key)
        offersRef.current = offersRef.current.filter((other) => offerKey(other) !== key)
        setOffers(offersRef.current)
        setRequested((prev) => (prev === key ? undefined : prev))
        await reloadWallet().catch(consoleError)
      } catch (err) {
        consoleError(err, `claiming Taxi transfer ${offer.claim.transferId} failed`)
        if (session.current !== generation) return
        if (err instanceof ClaimSpent) {
          spentRef.current.add(key)
          setSpent(new Set(spentRef.current))
        }
        if (currentKey === key) setError(extractError(err))
      }
    }
    try {
      if (navigator.locks) await withTaxiPaymentLock(svcWallet, aspInfo.network, execute)
      else if (!automatic) await execute()
    } catch (err) {
      consoleError(err, 'could not coordinate the Taxi claim')
      if (session.current === generation && currentKey === key) setError(extractError(err))
    }
  }

  const claim = async () => {
    if (!current || busy.current) return
    busy.current = true
    try {
      await runClaim(current, false, session.current)
    } finally {
      busy.current = false
      setClaiming(false)
      setWake((value) => value + 1)
    }
  }

  useEffect(() => {
    if (!autoClaims || !unlocked || !svcWallet || busy.current) return
    const generation = session.current
    const tried = new Set<string>()
    const startedWake = wakeRef.current
    const startedCoins = coinsRef.current
    busy.current = true
    const drain = async () => {
      try {
        while (session.current === generation && unlockedRef.current && autoClaimsRef.current) {
          const next = offersRef.current.find(
            (offer) =>
              !tried.has(offerKey(offer)) &&
              !spentRef.current.has(offerKey(offer)) &&
              (receiverFareOf(offer.claim)?.units ?? 0n) === 0n,
          )
          if (!next) break
          tried.add(offerKey(next))
          await runClaim(next, true, generation)
        }
      } finally {
        busy.current = false
        if (mountedRef.current) {
          setClaiming(false)
          if (session.current !== generation || startedWake !== wakeRef.current || startedCoins !== coinsRef.current)
            setWake((value) => value + 1)
        }
      }
    }
    drain().catch(consoleError)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offers, wake, vtxos, unlocked, svcWallet, aspInfo.network, aspInfo.url, autoClaims])

  const assetId = current && deliveredAssetId(current.claim)
  const metadata = assetId ? assetMetadataCache.get(assetId)?.metadata : undefined
  const claimable = useMemo(() => new Set(offers.map(offerKey)), [offers])
  const value = useMemo(() => ({ remember, claimable, openClaim }), [remember, claimable, openClaim])

  return (
    <ReceiverClaimsContext.Provider value={value}>
      {children}
      {unlocked ? (
        <ErrorBoundary>
          <SheetModal isOpen={showClaim} onClose={decline}>
            {current && showClaim ? (
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
