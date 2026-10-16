import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from '../../providers/language'
import {
  arkadeLnurl,
  bootstrapReceiver,
  encodeLnurl,
  resolveLnurlRails,
  type ArkadeLnurl,
  type ArkadeSigner,
  type ClaimOptions,
  type NameOptions,
  type LnurlRailType,
  type Receiver,
} from '@arkade-os/lnurl-client/arkade'
import {
  createLnurlClient,
  deriveSessionId,
  LnurlError,
  type AddressListEntry,
  type DomainCapabilities,
  type PaymentSyncStore,
} from '@arkade-os/lnurl-client'
import { consoleError } from '../logs'
import { extractError } from '../error'
import { fromRuntimeEnv } from '../constants'
import { lnurlPaymentSyncStore } from '../lnurlPaymentRepository'

export { lnurlRailLimits, resolveLnurlRails, type LnurlRailType } from '@arkade-os/lnurl-client/arkade'

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
  const baseUrl = fromRuntimeEnv(import.meta.env.VITE_LNURL_SERVER?.trim())?.replace(/\/+$/, '')
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

type PerRail = Partial<Record<LnurlRailType, string>>

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
  const currentTranslation = useRef(t)
  useLayoutEffect(() => {
    current.current = facade
    currentTranslation.current = t
  }, [facade, t])

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
      const result = await bootstrapReceiver(
        {
          owned: async () => {
            const owned = await facade.owned()
            if (stale) throw new Error('LNURL discovery is no longer current')
            if (owned) setReceiver(owned)
            return owned
          },
          capabilities: () => facade.capabilities(),
          claim: async (opts) => {
            if (stale) throw new Error('LNURL discovery is no longer current')
            return facade.claim(opts)
          },
        },
        { autoClaimNameless: true },
      )
      if (stale) return
      if (result.capabilities) setChoices(onboardingChoices(result.capabilities))
      if (result.kind === 'ready') {
        setReceiver(result.receiver)
        if ('capabilitiesError' in result) {
          setError(lnurlClaimErrorMessage(result.capabilitiesError, currentTranslation.current))
        }
        if (result.claimed) {
          result.receiver.sync().catch((err) => consoleError(err, 'lnurl activity sync after claim failed'))
        }
      }
    }
    load()
      .catch((err) => {
        if (stale) return
        consoleError(err, 'lnurl address lookup failed')
        setError(lnurlClaimErrorMessage(err, currentTranslation.current))
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
      if (current.current === owner) setError(lnurlClaimErrorMessage(err, currentTranslation.current))
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
