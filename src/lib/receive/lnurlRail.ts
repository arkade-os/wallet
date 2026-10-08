import { useEffect, useMemo, useRef, useState } from 'react'
import {
  arkadeLnurl,
  type ArkadeLnurl,
  type ArkadeSigner,
  type ClaimOptions,
  type NameOptions,
  type Receiver,
} from '@arkade-os/lnurl-client/arkade'
import {
  createLnurlClient,
  LnurlError,
  type DomainCapabilities,
  type PaymentOption,
  type PaymentSyncStore,
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

/** What a payer can send on each rail, in sats, as the receiver's own payRequest advertises it. */
export async function lnurlRailLimits(receiver: Receiver) {
  const payRequest = await receiver.payRequest()
  const options: PaymentOption[] = payRequest.paymentOptions ?? [{ id: 'lightning', type: 'lightning' }]
  return options
    .filter((o) => o.available !== false)
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
      // An honest server answers onchain with the boarding address this wallet registered and arkade on its
      // own operator; a per-payment covenant's leaves can't be checked from here, so that part stays trust.
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
    const rails: LnurlRailType[] = allRails ? ['lightning', 'arkade', 'onchain'] : ['lightning']
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

const CLAIM_ERROR_MESSAGES: Record<string, string> = {
  taken: 'That name is already taken.',
  invalid_username: 'That name is not allowed here.',
  blacklisted: 'That name is not allowed here.',
  invalid_claim: 'That claim code is not valid.',
  forbidden_mode: 'This server does not offer that option.',
  limit_reached: 'Too many attempts — try again shortly.',
}

/** User-facing text for a failed claim, keyed off the server's machine code
 *  where one exists so the message survives its wording changing. */
export const lnurlClaimErrorMessage = (error: unknown): string => {
  if (error instanceof LnurlError && error.code) {
    const known = CLAIM_ERROR_MESSAGES[error.code]
    if (known) return known
  }
  return error instanceof Error ? error.message : 'Could not get a lightning address.'
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
  choices: OnboardingChoice[]
  busy: boolean
  error: string
  claim: (opts: ClaimOptions) => Promise<void>
  upgrade: (opts: NameOptions) => Promise<void>
}

export function useLnurlRail(deps: {
  enabled: boolean
  identity?: ArkadeSigner
  arkadeAddress?: string
  boardingAddress?: string
}): LnurlRail {
  const { enabled, identity, arkadeAddress, boardingAddress } = deps
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
  const current = useRef(facade)
  current.current = facade

  useEffect(() => {
    setReceiver(undefined)
    setChoices([])
    setError('')
    setLoadFailed(false)
    setBusy(false)
    if (!facade) return
    let stale = false
    const load = async () => {
      const owned = await facade.owned()
      if (stale) return
      setReceiver(owned)
      // A named receiver needs no choices; a nameless one needs them for "Add a name".
      if (owned?.lightningAddress) return
      if (!owned) {
        const capabilities = await facade.capabilities()
        if (!stale) setChoices(onboardingChoices(capabilities))
        return
      }
      // Already payable: failing to learn how to name it must not cost the QR its LNURL.
      const capabilities = await facade.capabilities().catch((err) => {
        if (!stale) setError(lnurlClaimErrorMessage(err))
        return undefined
      })
      if (!stale && capabilities) setChoices(onboardingChoices(capabilities))
    }
    load()
      .catch((err) => {
        if (stale) return
        consoleError(err, 'lnurl address lookup failed')
        setError(lnurlClaimErrorMessage(err))
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
      if (current.current === owner) setError(lnurlClaimErrorMessage(err))
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
    choices,
    busy,
    error,
    claim: async (opts) => {
      if (facade) await run(() => facade.claim(opts), true)
    },
    upgrade: async (opts) => {
      if (receiver) await run(() => receiver.upgrade(opts), false)
    },
  }
}
