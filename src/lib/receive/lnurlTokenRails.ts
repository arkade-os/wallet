import { useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react'
import type { Receiver } from '@arkade-os/lnurl-client/arkade'
import {
  chainName,
  createLnurlClient,
  LnurlError,
  requestTokenQuote,
  tokenOptionAccepts,
  tokenOptions,
  type PayRequest,
  type TokenOption,
  type TokenQuote,
} from '@arkade-os/lnurl-client'
import { consoleError } from '../logs'
import { extractError } from '../error'
import { Currencies } from '../types'
import { FiatContext } from '../../providers/fiat'

const lnurlClient = createLnurlClient()

// A quote with under a minute left cannot be paid in time, and on a skewed clock re-asking at
// expiry would spend a provider order and a solver swap on every answer.
const MIN_QUOTE_MS = 60_000
const MAX_TIMEOUT_MS = 2 ** 31 - 1

export type LnurlTokenRail = TokenOption & { chain: string; provider: string }

interface Asked {
  lnurl: string
  optionId: string
  amountSat: number
  round: number
}

export type LnurlTokenQuote = Pick<TokenQuote, 'optionId' | 'value' | 'destination' | 'amount' | 'expiresAt'>

/** False when a USD stablecoin quote is outside 0.8x to 1.25x of what the requested sats are worth at the
 *  wallet's own price: the provider's spread is a few percent, so further off is a server misquoting.
 *  No price yet, or a unit that is not USD, gets no opinion. */
export function plausibleQuote(unit: string, tokens: string, requestedUsd: number): boolean {
  if (!['USDT', 'USDC'].includes(unit) || !(requestedUsd > 0)) return true
  const ratio = Number(tokens) / requestedUsd
  return ratio >= 0.8 && ratio <= 1.25
}

/** The token options a payer is offered: up, verifiable, naming the third party that holds the
 *  deposit, and, given an amount, accepting it. */
export function lnurlTokenRails(payRequest: PayRequest, amountSat?: number): LnurlTokenRail[] {
  return tokenOptions(payRequest).flatMap((o): LnurlTokenRail[] => {
    const inBounds = amountSat === undefined || tokenOptionAccepts(o, payRequest, amountSat)
    const offered = o.available && o.verifiable === true && o.unit.decimals <= 18 && inBounds
    // The client never returns an option without an asset; checked anyway, since its chain names the method.
    return offered && o.provider && o.asset ? [{ ...o, chain: chainName(o.asset.chainId), provider: o.provider }] : []
  })
}

/** The receiver's token rails for `amountSat`, and a quote for `selected` alone: each quote is a real
 *  provider order plus a solver swap, so none is asked for until an option is picked. */
export function useLnurlTokenRails(
  receiver: Receiver | undefined,
  amountSat: number,
  enabled: boolean,
  selected: string | undefined,
) {
  const { toFiatAmount } = useContext(FiatContext)
  const [fetched, setFetched] = useState<{ lnurl: string; payRequest: PayRequest }>()
  const [answer, setAnswer] = useState<{ asked: Asked; quote?: LnurlTokenQuote; error?: string }>()
  const [round, setRound] = useState(0)
  const [expiredRound, setExpiredRound] = useState<number>()
  const [, wake] = useReducer((n: number) => n + 1, 0)

  // A sleeping phone holds the expiry timer back, so waking re-checks the deadline itself.
  useEffect(() => {
    document.addEventListener('visibilitychange', wake)
    return () => document.removeEventListener('visibilitychange', wake)
  }, [])

  // Keyed on the LNURL, the receiver's identity: an upgrade keeps it, a different receiver never does.
  useEffect(() => {
    if (!enabled || !receiver) return
    const { lnurl } = receiver
    let stale = false
    receiver
      .payRequest()
      .then((payRequest) => {
        if (!stale) setFetched({ lnurl, payRequest })
      })
      .catch((err) => consoleError(err, 'lnurl token options failed'))
    return () => {
      stale = true
    }
  }, [receiver?.lnurl, enabled])

  const source = enabled && receiver && fetched?.lnurl === receiver.lnurl ? fetched : undefined
  const payRequest = source?.payRequest
  const rails = useMemo(
    () => (payRequest && amountSat > 0 ? lnurlTokenRails(payRequest, amountSat) : []),
    [payRequest, amountSat],
  )
  const rail = rails.find((r) => r.id === selected)

  useEffect(() => {
    if (!source || !rail) return
    const asked = { lnurl: source.lnurl, optionId: rail.id, amountSat, round }
    let stale = false
    let expiry: ReturnType<typeof setTimeout> | undefined
    requestTokenQuote(source.payRequest, rail, amountSat, { minLifetimeMs: MIN_QUOTE_MS, client: lnurlClient })
      .then((quote) => {
        if (stale) return
        if (quote.paymentDestinationTag) throw new LnurlError('the deposit needs a memo this QR cannot carry')
        if (!/^[1-9]\d*$/.test(quote.baseUnits)) throw new LnurlError("the quote's amount is unreadable")
        const { amount, expiresAt } = quote
        const usd = toFiatAmount(amountSat, Currencies.USD)
        if (!plausibleQuote(rail.unit.code, amount, usd)) {
          throw new LnurlError(
            `the quoted ${amount} ${rail.unit.code} is far from the ${usd.toFixed(2)} USD this amount is worth`,
          )
        }
        setAnswer({ asked, quote })
        // Expiry only marks the quote dead: a new one is a new provider order, placed on request.
        expiry = setTimeout(() => setExpiredRound(round), Math.min(expiresAt - Date.now(), MAX_TIMEOUT_MS))
      })
      .catch((err) => {
        if (stale) return
        consoleError(err, `lnurl ${rail.id} quote failed`)
        setAnswer({ asked, error: extractError(err) })
      })
    return () => {
      stale = true
      clearTimeout(expiry)
      // Neither carries over: the old timer is cleared (it could expire unseen), and an expiry marked this round
      // would kill the next inputs' quote.
      setAnswer(undefined)
      setExpiredRound(undefined)
    }
  }, [source, amountSat, rail?.id, round])

  // The render after a receiver, amount, option or expiry change runs before the effect asks again, so a
  // held answer counts only for the inputs it was asked with; anything else is a deposit for another payment.
  const current =
    answer &&
    answer.asked.lnurl === source?.lnurl &&
    answer.asked.optionId === rail?.id &&
    answer.asked.amountSat === amountSat &&
    answer.asked.round === round
      ? answer
      : undefined
  const expired = current?.quote !== undefined && (expiredRound === round || Date.now() >= current.quote.expiresAt)
  const regenerate = useCallback(() => setRound((n) => n + 1), [])
  return {
    rails,
    quote: expired ? undefined : current?.quote,
    quoting: Boolean(rail) && !current,
    error: current?.error ?? '',
    expired,
    regenerate,
    /** Whether option `id` would be offered for `sats`, so a caller can drop a pick before the amount lands. */
    offers: (sats: number, id?: string) =>
      Boolean(payRequest && sats > 0 && lnurlTokenRails(payRequest, sats).some((r) => r.id === id)),
  }
}
