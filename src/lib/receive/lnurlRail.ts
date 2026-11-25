import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from '../../providers/language'
import {
  arkadeLnurl,
  bootstrapReceiver,
  resolveLnurlRails,
  type ArkadeLnurl,
  type ArkadeSigner,
  type ClaimOptions,
  type NameOptions,
  type LnurlRailType,
  type Receiver,
} from '@arkade-os/lnurl-client/arkade'
import {
  LnurlError,
  type AddressListEntry,
  type DomainCapabilities,
  type LnurlAddressErrorCode,
  type PaymentSyncStore,
} from '@arkade-os/lnurl-client'
import { consoleError } from '../logs'
import { extractError } from '../error'
import { fromRuntimeEnv } from '../constants'
import { lnurlPaymentSyncStore } from '../lnurlPaymentRepository'

export { lnurlRailLimits, type LnurlRailType } from '@arkade-os/lnurl-client/arkade'

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

// Literal t() calls, so the i18n check sees each key in use.
const claimErrorMessages = (t: (key: string) => string): Partial<Record<LnurlAddressErrorCode, string>> => ({
  taken: t('receive.claimTaken'),
  invalid_username: t('receive.claimNotAllowed'),
  blacklisted: t('receive.claimNotAllowed'),
  invalid_claim: t('receive.claimCodeInvalid'),
  username_required: t('receive.claimCodeNeedsName'),
  forbidden_mode: t('receive.claimModeUnavailable'),
  limit_reached: t('receive.claimRateLimited'),
})

/** User-facing text for a failed claim, keyed off the server's machine code
 *  where one exists so the message survives its wording changing. */
export const lnurlClaimErrorMessage = (error: unknown, t: (key: string) => string): string => {
  if (error instanceof LnurlError && error.code) {
    const message = claimErrorMessages(t)[error.code as LnurlAddressErrorCode]
    if (message) return message
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
  /** Whether the identity holds a named address, the receiver's or another one. */
  ownsName: boolean
  /** The receiver it claimed, or undefined when the claim was refused. */
  claim: (opts: ClaimOptions) => Promise<Receiver | undefined>
  upgrade: (opts: NameOptions) => Promise<void>
  /** Every address this identity owns on the server, nameless ones included. */
  addresses: () => Promise<AddressListEntry[]>
}

export function useLnurlRail(deps: {
  enabled: boolean
  identity?: ArkadeSigner
  arkadeAddress?: string
  boardingAddress?: string
  /** Handle of the address to receive on when the identity owns several. */
  primary?: string
}): LnurlRail {
  const { enabled, identity, arkadeAddress, boardingAddress, primary } = deps
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
  const [namedElsewhere, setNamedElsewhere] = useState(false)
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
    facade
      .sessionLnurl()
      .then((lnurl) => !stale && setWalletLnurl(lnurl))
      .catch(() => {}) // load() reports the same failure
    const load = async () => {
      const result = await bootstrapReceiver(
        {
          owned: async () => {
            const owned = await facade.owned({ handle: primary || undefined })
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a new primary switches below, without a reload
  }, [facade])

  // Switches in place rather than re-bootstrapping, so the screen never falls back to "no address yet".
  useEffect(() => {
    if (!facade || loadedFor !== facade || !primary || !receiver || receiver.handle === primary) return
    let stale = false
    facade
      .owned({ handle: primary })
      .then((next) => !stale && next && setReceiver(next))
      .catch((err) => consoleError(err, 'lnurl primary address switch failed'))
    return () => {
      stale = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when the choice changes, not on every receiver
  }, [facade, loadedFor, primary])

  // A nameless receiver can sit beside a named address (the session one is picked first), so look once.
  useEffect(() => {
    setNamedElsewhere(false)
    if (!facade || !receiver || receiver.lightningAddress) return
    let stale = false
    facade
      .addresses()
      .then((all) => !stale && setNamedElsewhere(all.some((a) => a.status === 'active' && a.lightningAddress)))
      .catch((err) => consoleError(err, 'lnurl address list failed'))
    return () => {
      stale = true
    }
  }, [facade, receiver])

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
      return next
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
    ownsName: Boolean(receiver?.lightningAddress) || namedElsewhere,
    claim: async (opts) => {
      if (!facade) return undefined
      const claimed = await run(() => facade.claim(opts), true)
      if (claimed) return claimed
      // A claim can register its address and then fail to bind it; a refresh binds whatever was left unbound,
      // and a wallet with no address yet adopts the one it finds, which is the one it just claimed.
      const hadReceiver = Boolean(receiver)
      facade
        .owned({ refresh: true })
        .then((next) => {
          if (!next || hadReceiver || current.current !== facade) return
          setReceiver(next)
          setError('')
        })
        .catch(() => {})
      return undefined
    },
    upgrade: async (opts) => {
      if (receiver) await run(() => receiver.upgrade(opts), false)
    },
    addresses: async () => (facade ? facade.addresses() : []),
  }
}
