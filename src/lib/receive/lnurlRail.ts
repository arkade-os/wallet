import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from '../../providers/language'
import {
  arkadeLnurl,
  encodeLnurl,
  type ArkadeLnurl,
  type ArkadeSigner,
  type ClaimOptions,
  type NameOptions,
  type Receiver,
} from '@arkade-os/lnurl-client/arkade'
import {
  createLnurlClient,
  deriveSessionId,
  LnurlError,
  type AddressListEntry,
  type DomainCapabilities,
  type PaymentOption,
  type PaymentSyncStore,
  type PayRequest,
} from '@arkade-os/lnurl-client'
import { ArkAddress } from '@arkade-os/sdk'
import { hex } from '@scure/base'
import { consoleError } from '../logs'
import { extractError } from '../error'
import { fromRuntimeEnv } from '../constants'
import { lnurlPaymentSyncStore } from '../lnurlPaymentRepository'

const lnurlClient = createLnurlClient()

/**
 * The server this build offers addresses at, or undefined when none is set.
 *
 * Configured rather than defaulted: which lnurl-server a wallet trusts with its
 * receive identity is not a choice to bake into a binary, and a wrong default
 * would be a bearer credential handed to someone the user never picked.
 * `VITE_LNURL_DOMAIN` is only needed where the LUD-16 domain differs from the
 * API host, which is the unusual case.
 */
export const configuredLnurlServer = () => {
  const baseUrl = fromRuntimeEnv(import.meta.env.VITE_LNURL_SERVER?.trim())
  if (!baseUrl) return undefined
  try {
    const domain = (
      fromRuntimeEnv(import.meta.env.VITE_LNURL_DOMAIN?.trim()) || new URL(baseUrl).hostname
    ).toLowerCase()
    return { baseUrl, domain }
  } catch {
    return undefined
  }
}

/** The facade bound to this build's server and receive identity, or undefined
 *  when unconfigured — claiming, discovery and payer routing all go through it. */
export function lnurlReceiver(deps: {
  identity: ArkadeSigner
  arkadeAddress: string
  boardingAddress?: string
  store?: PaymentSyncStore
}): ArkadeLnurl | undefined {
  const server = configuredLnurlServer()
  if (!server) return undefined
  return arkadeLnurl({ ...deps, baseUrl: server.baseUrl, domain: server.domain })
}

/** What a payer can send on each bitcoin rail, in sats, as the receiver's own payRequest advertises it.
 *  Token options are not rails of their own here: their `type` is a chain namespace. */
export function lnurlRailLimits(payRequest: PayRequest) {
  const options: PaymentOption[] = payRequest.paymentOptions ?? [{ id: 'lightning', type: 'lightning' }]
  return options
    .filter((o) => o.available !== false && o.asset === undefined)
    .map((o) => ({
      type: o.type,
      min: Math.ceil((o.minSendable ?? payRequest.minSendable) / 1000),
      max: Math.floor((o.maxSendable ?? payRequest.maxSendable) / 1000),
    }))
}

export type LnurlRailType = 'lightning' | 'arkade' | 'onchain'
type PerRail = Partial<Record<LnurlRailType, string>>

const sameOperator = (a: string, b: string) => {
  try {
    const [x, y] = [ArkAddress.decode(a), ArkAddress.decode(b)]
    return x.hrp === y.hrp && hex.encode(x.serverPubKey) === hex.encode(y.serverPubKey)
  } catch {
    return false
  }
}

/** What any payer resolving the receiver's LNURL gets for `amountSat` on each rail: an invoice, or a destination. */
export async function resolveLnurlRails(
  receiver: Receiver,
  amountSat: number,
  rails: LnurlRailType[],
  own: { arkade: string; onchain: string },
) {
  const payRequest = await receiver.payRequest()
  return Promise.allSettled(
    rails.map(async (rail) => {
      const paymentOption = payRequest.paymentOptions?.find((o) => o.type === rail && o.available !== false)?.id
      if (!paymentOption && rail !== 'lightning') throw new LnurlError(`the LNURL offers no ${rail} rail`)
      const result = await lnurlClient.requestInvoice(payRequest, { amountSat, paymentOption })
      const target = result.kind === 'bolt11' ? result.pr : result.paymentDestination
      if (!target || (result.kind === 'bolt11') !== (rail === 'lightning')) {
        throw new LnurlError(`the LNURL answered the ${rail} rail with nothing payable on it`)
      }
      // On-chain must be the boarding address this wallet registered. Arkade is checked only to be on this
      // operator: a dishonest server could still hand out another user's address there, so that part stays trust.
      if (rail === 'onchain' && target !== own.onchain) {
        throw new LnurlError("the LNURL gave an on-chain address that is not this wallet's")
      }
      if (rail === 'arkade' && !sameOperator(target, own.arkade)) {
        throw new LnurlError('the LNURL gave an Arkade address on another operator')
      }
      return target
    }),
  )
}

/** `resolveLnurlRails` for the amount being requested, asked again whenever it changes. Lightning
 *  always goes through the LNURL; the Arkade and on-chain legs only when `allRails` is set. */
export function useLnurlRails(
  receiver: Receiver | undefined,
  amountSat: number,
  allRails: boolean,
  own: { arkade: string; onchain: string },
) {
  const { arkade: ownArkade, onchain: ownOnchain } = own
  const [targets, setTargets] = useState<PerRail>({})
  const [errors, setErrors] = useState<PerRail>({})
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    setTargets({})
    setErrors({})
    setGenerating(Boolean(receiver) && amountSat > 0)
    if (!receiver || amountSat <= 0) return
    // A leg whose own address hasn't loaded yet would be refused as foreign; ask for it once it has.
    const rails: LnurlRailType[] = [
      'lightning',
      ...(allRails && ownArkade ? (['arkade'] as const) : []),
      ...(allRails && ownOnchain ? (['onchain'] as const) : []),
    ]
    let stale = false
    resolveLnurlRails(receiver, amountSat, rails, { arkade: ownArkade, onchain: ownOnchain })
      .then((results) => {
        if (stale) return
        const resolved: PerRail = {}
        const failed: PerRail = {}
        results.forEach((result, i) => {
          if (result.status === 'fulfilled') resolved[rails[i]] = result.value
          else {
            consoleError(result.reason, `lnurl ${rails[i]} request failed`)
            failed[rails[i]] = extractError(result.reason)
          }
        })
        setTargets(resolved)
        setErrors(failed)
      })
      .catch((err) => {
        if (stale) return
        consoleError(err, 'lnurl payRequest failed')
        setErrors(Object.fromEntries(rails.map((rail) => [rail, extractError(err)])))
      })
      .finally(() => {
        if (!stale) setGenerating(false)
      })
    return () => {
      stale = true
    }
  }, [receiver, amountSat, allRails, ownArkade, ownOnchain])

  return { targets, errors, generating }
}

const CLAIM_ERROR_KEYS: Partial<Record<string, string>> = {
  taken: 'receive.claimTaken',
  invalid_username: 'receive.claimNotAllowed',
  blacklisted: 'receive.claimNotAllowed',
  invalid_claim: 'receive.claimCodeInvalid',
  forbidden_mode: 'receive.claimModeUnavailable',
  limit_reached: 'receive.claimRateLimited',
}

/** User-facing text for a failed claim, keyed off the server's machine code
 *  where one exists so the message survives its wording changing. */
export const lnurlClaimErrorMessage = (error: unknown, t: (key: string) => string): string => {
  if (error instanceof LnurlError && error.code) {
    const key = CLAIM_ERROR_KEYS[error.code]
    if (key) return t(key)
  }
  return error instanceof Error ? error.message : t('receive.lnaddressClaimFailed')
}

/** A server allocation mode, as offered to the user. `admin` is a claim code for a reserved name. */
export type OnboardingChoice = 'self' | 'random' | 'admin' | 'session'

const CHOICE_ORDER: OnboardingChoice[] = ['self', 'random', 'admin', 'session']

/** The choices this server allows. None when it wants an API key, which the facade cannot send. */
export const onboardingChoices = (capabilities: DomainCapabilities): OnboardingChoice[] =>
  capabilities.requireApiKey ? [] : CHOICE_ORDER.filter((mode) => capabilities.allocationModes.includes(mode))

export interface LnurlRail {
  status: 'off' | 'loading' | 'onboarding' | 'ready' | 'failed'
  receiver: Receiver | undefined
  /** What the QR carries: the receiver's LNURL, or the wallet-id LNURL while it is still being registered. */
  lnurl: string | undefined
  choices: OnboardingChoice[]
  busy: boolean
  error: string
  claim: (opts: ClaimOptions) => Promise<void>
  upgrade: (opts: NameOptions) => Promise<void>
  /** Every address this identity owns on the server, nameless ones included. */
  addresses: () => Promise<AddressListEntry[]>
}

export function useLnurlRail(deps: {
  enabled: boolean
  identity?: ArkadeSigner
  arkadeAddress?: string
  boardingAddress?: string
}): LnurlRail {
  const { enabled, identity, arkadeAddress, boardingAddress } = deps
  const { t } = useTranslation()
  const facade = useMemo(
    () =>
      enabled && identity && arkadeAddress
        ? lnurlReceiver({ identity, arkadeAddress, boardingAddress, store: lnurlPaymentSyncStore })
        : undefined,
    [enabled, identity, arkadeAddress, boardingAddress],
  )
  const [receiver, setReceiver] = useState<Receiver>()
  const [choices, setChoices] = useState<OnboardingChoice[]>([])
  const [loadedFor, setLoadedFor] = useState<ArkadeLnurl>()
  const [loadFailed, setLoadFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [walletLnurl, setWalletLnurl] = useState<string>()
  const current = useRef(facade)
  useLayoutEffect(() => {
    current.current = facade
  }, [facade])

  useEffect(() => {
    setReceiver(undefined)
    setChoices([])
    setError('')
    setLoadFailed(false)
    setBusy(false)
    setWalletLnurl(undefined)
    if (!facade) return
    let stale = false
    // The wallet id is derived locally, so the QR need not wait on the server's round trips.
    // ponytail: a payer scanning before registration lands gets "no longer active"; retrying succeeds.
    const baseUrl = configuredLnurlServer()?.baseUrl
    facade
      .token()
      .then((token) => !stale && baseUrl && setWalletLnurl(encodeLnurl(`${baseUrl}/lnurl/${deriveSessionId(token)}`)))
      .catch(() => {}) // load() reports the same failure
    const load = async () => {
      const owned = await facade.owned()
      if (stale) return
      // A named receiver needs no choices; a nameless one needs them for "Add a name".
      if (owned?.lightningAddress) return setReceiver(owned)
      if (!owned) {
        const offered = onboardingChoices(await facade.capabilities())
        if (stale) return
        setChoices(offered)
        // Not a name: the LNURL encodes the wallet id. Registering it lets the server answer it offline, with the
        // Arkade and on-chain rails bound, so the first QR already works. The server returns an existing row on repeat.
        if (!offered.includes('session')) return
        const claimed = await facade.claim({ nameless: true })
        if (stale) return
        setReceiver(claimed)
        claimed.sync().catch((err) => consoleError(err, 'lnurl activity sync after claim failed'))
        return
      }
      setReceiver(owned)
      // Already payable: failing to learn how to name it must not cost the QR its LNURL.
      const capabilities = await facade.capabilities().catch((err) => {
        if (!stale) setError(lnurlClaimErrorMessage(err, t))
        return undefined
      })
      if (!stale && capabilities) setChoices(onboardingChoices(capabilities))
    }
    load()
      .catch((err) => {
        if (stale) return
        consoleError(err, 'lnurl address lookup failed')
        setError(lnurlClaimErrorMessage(err, t))
        setLoadFailed(true)
      })
      .finally(() => {
        if (!stale) setLoadedFor(facade)
      })
    return () => {
      stale = true
    }
  }, [facade])

  const run = async (action: () => Promise<Receiver>, syncAfter: boolean) => {
    const owner = facade
    setBusy(true)
    setError('')
    try {
      const next = await action()
      if (current.current !== owner) return
      setReceiver(next)
      // The startup sync listed addresses before this one existed; without this a
      // payment arriving this session stays unattributed until the next start.
      if (syncAfter) next.sync().catch((err) => consoleError(err, 'lnurl activity sync after claim failed'))
    } catch (err) {
      consoleError(err, 'lnurl claim failed')
      if (current.current === owner) setError(lnurlClaimErrorMessage(err, t))
    } finally {
      if (current.current === owner) setBusy(false)
    }
  }

  const status: LnurlRail['status'] = !facade
    ? 'off'
    : loadedFor !== facade
      ? 'loading'
      : loadFailed
        ? 'failed'
        : receiver
          ? 'ready'
          : 'onboarding'

  return {
    status,
    receiver,
    lnurl: receiver?.lnurl ?? (status === 'loading' ? walletLnurl : undefined),
    choices,
    busy,
    error,
    claim: async (opts) => {
      if (facade) await run(() => facade.claim(opts), true)
    },
    upgrade: async (opts) => {
      if (receiver) await run(() => receiver.upgrade(opts), false)
    },
    addresses: async () => {
      const server = configuredLnurlServer()
      if (!facade || !server) return []
      const all = await createLnurlClient({ baseUrl: server.baseUrl }).listAddresses(await facade.token())
      return all.filter((a) => a.domain.toLowerCase() === server.domain)
    },
  }
}
