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
  useSyncExternalStore,
} from 'react'
import { toXOnlySignerHex, type IWallet, type NetworkName } from '@arkade-os/sdk'
import { hex } from '@scure/base'
import { TaxiClaimQueue, type ClaimQueueSnapshot } from '@arkade-os/taxi'
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
  deliveredAssetId,
  offerKey,
  receiverFareOf,
  taxiActivityFromOffer,
  walletClaimWatch,
  watchReceiverClaims,
} from '../lib/receiverClaims'
import { readReceiverTaxis, rememberReceiverTaxi, type RememberedTaxi } from '../lib/storage'
import { assetSwapRepository, unreservedCoins } from '../lib/swapRepository'
import { getEmulatorPubkeyForNetwork, getReceiverTaxiUrlForNetwork } from '../lib/constants'
import { taxiClient } from '../lib/receiverTaxi'
import { getPendingDirectTaxi, taxiActivityFromPending, withTaxiPaymentLock } from '../lib/directTaxiSend'
import { pollTaxiActivity, readTaxiActivity, recordTaxiActivity, refreshTaxiActivity } from '../lib/taxiActivity'
import { isCanonicalTxid } from '../lib/carrierActivity'

const TAXI_STATUS_POLL_MS = 30_000
const EMPTY_QUEUE: ClaimQueueSnapshot = { offers: [], plans: new Map(), errors: new Map(), spent: new Set() }
const emptySnapshot = () => EMPTY_QUEUE
const noSubscribe = () => () => {}

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
  const [declined, setDeclined] = useState<ReadonlySet<string>>(new Set())
  const [requested, setRequested] = useState<string>()
  const reloadRef = useRef(reloadWallet)
  useLayoutEffect(() => {
    reloadRef.current = reloadWallet
  }, [reloadWallet])
  const identity = (svcWallet as IWallet | undefined)?.identity
  const [queue, setQueue] = useState<TaxiClaimQueue>()
  const activeQueue = useRef<TaxiClaimQueue>()
  useLayoutEffect(() => {
    if (!svcWallet || !identity || !aspInfo.url) {
      setQueue(undefined)
      return
    }
    const network = aspInfo.network
    const next = new TaxiClaimQueue({
      identity,
      automatic: autoClaimsRef.current,
      allowed: () => unlockedRef.current,
      getCoins: async () => {
        const [coins, pending] = await Promise.all([
          unreservedCoins(svcWallet, assetSwapRepository),
          getPendingDirectTaxi(svcWallet, network),
        ])
        const held = new Set(pending?.record.attempt?.senderInputs?.map(({ txid, vout }) => `${txid}:${vout}`) ?? [])
        return coins.filter((coin) => !held.has(`${coin.txid}:${coin.vout}`))
      },
      coordinate: navigator.locks ? (run) => withTaxiPaymentLock(svcWallet, network, run) : undefined,
      reload: () => reloadRef.current().catch(consoleError),
      recordClaim: (offer, plan, claimTxid) => {
        try {
          recordTaxiActivity({
            ...taxiActivityFromOffer(offer),
            state: plan.kind === 'purchase' ? 'purchased' : 'recycled',
            ...(isCanonicalTxid(claimTxid) ? { claimTxid } : {}),
            updatedAt: Math.floor(Date.now() / 1000),
          })
        } finally {
          if (activeQueue.current === next) setRequested((prev) => (prev === offerKey(offer) ? undefined : prev))
        }
      },
      onError: (err, key) => consoleError(err, `claiming Taxi transfer ${key} failed`),
    })
    next.setActive(unlockedRef.current)
    activeQueue.current = next
    setQueue(next)
    return () => {
      activeQueue.current = undefined
      next.dispose()
    }
  }, [svcWallet, identity, aspInfo.url, aspInfo.network, aspInfo.signerPubkey, aspInfo.checkpointTapscript])
  useLayoutEffect(() => {
    queue?.setActive(unlocked)
  }, [queue, unlocked])
  useLayoutEffect(() => {
    queue?.setAutomatic(autoClaims)
  }, [queue, autoClaims])
  const { offers, busy, plans, errors, spent } = useSyncExternalStore(
    queue?.subscribe ?? noSubscribe,
    queue?.snapshot ?? emptySnapshot,
  )
  useEffect(() => queue?.wake(), [queue, vtxos])

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
    if (!queue || !unlocked || !svcWallet || !aspInfo.url) return
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
            initialOffers: queue.snapshot().offers,
            onOffer: (offer) => {
              if (stopped) return
              const key = offerKey(offer)
              try {
                recordTaxiActivity(taxiActivityFromOffer(offer))
              } catch (err) {
                consoleError(err)
              }
              queue.offer(offer)
              setDeclined((prev) => without(prev, key))
            },
            onGone: (key) => {
              if (stopped) return
              queue.withdraw(key)
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
  }, [queue, unlocked, svcWallet, aspInfo.url, aspInfo.network, taxisVersion])

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
        queue?.wake()
      }
    }
    window.addEventListener('focus', reoffer)
    document.addEventListener('visibilitychange', reoffer)
    return () => {
      window.removeEventListener('focus', reoffer)
      document.removeEventListener('visibilitychange', reoffer)
    }
  }, [queue])

  const current = unlocked
    ? requested !== undefined
      ? offers.find((offer) => offerKey(offer) === requested)
      : offers.find((offer) => !declined.has(offerKey(offer)))
    : undefined
  const currentKey = current && offerKey(current)
  const plan = currentKey ? plans.get(currentKey) : undefined
  const failure = currentKey ? errors.get(currentKey) : undefined
  const error = failure ? extractError(failure instanceof ClaimSpent ? failure.reason : failure) : ''
  const claiming = Boolean(busy)
  const showClaim =
    Boolean(current) &&
    (!autoClaims ||
      requested !== undefined ||
      spent.has(currentKey!) ||
      Boolean(error) ||
      (receiverFareOf(current!.claim)?.units ?? 0n) !== 0n ||
      plan?.kind === 'wait-for-reclaim')

  const decline = () => {
    if (currentKey) setDeclined((prev) => new Set(prev).add(currentKey))
    setRequested(undefined)
  }

  const openClaim = useCallback((key: string) => {
    setDeclined((prev) => without(prev, key))
    setRequested(key)
  }, [])

  const claim = () => {
    if (currentKey && !busy) queue?.claim(currentKey).catch(consoleError)
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
