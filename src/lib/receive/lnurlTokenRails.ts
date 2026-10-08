import { useEffect, useMemo, useState } from 'react'
import type { Receiver } from '@arkade-os/lnurl-client/arkade'
import { createLnurlClient, LnurlError, tokenOptions, type PayRequest, type TokenOption } from '@arkade-os/lnurl-client'
import { centsToUnits } from '../assets'
import { consoleError } from '../logs'
import { extractError } from '../error'
import { chainLabel } from './chainLabels'

const lnurlClient = createLnurlClient()

// A quote with under a minute left cannot be paid in time, and on a skewed clock re-asking at
// expiry would spend a provider order and a solver swap on every answer.
const MIN_QUOTE_MS = 60_000
const MAX_TIMEOUT_MS = 2 ** 31 - 1

export type LnurlTokenRail = TokenOption & { chain: string; provider: string }

interface Asked {
  optionId: string
  amountSat: number
  round: number
}

export interface LnurlTokenQuote {
  optionId: string
  /** What the QR carries: the EIP-681 or Solana Pay URI, or the bare address on Tron, which has none. */
  value: string
  destination: string
  /** The exact amount to send, in whole tokens. */
  amount: string
  expiresAt: number
}

/** A quote's base units as an exact amount of whole tokens, or undefined for anything but a plain
 *  positive integer: the payer is told to send exactly this. */
export const wholeTokens = (baseUnits: unknown, decimals: number): string | undefined =>
  typeof baseUnits === 'string' && /^[1-9]\d*$/.test(baseUnits) ? centsToUnits(BigInt(baseUnits), decimals) : undefined

/** The token options a payer is offered: up, verifiable, naming the third party that holds the
 *  deposit, and, given an amount, accepting it. */
export function lnurlTokenRails(payRequest: PayRequest, amountSat?: number): LnurlTokenRail[] {
  const msat = (amountSat ?? 0) * 1000
  return tokenOptions(payRequest).flatMap((o): LnurlTokenRail[] => {
    const inBounds =
      amountSat === undefined ||
      (msat >= (o.minSendable ?? payRequest.minSendable) && msat <= (o.maxSendable ?? payRequest.maxSendable))
    // centsToUnits is exact only up to 18 decimals, and the amount shown is what the payer sends.
    const offered = o.available && o.verifiable !== false && o.unit.decimals <= 18 && inBounds
    return offered && o.provider ? [{ ...o, chain: chainLabel(o.asset.chainId), provider: o.provider }] : []
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
  const [payRequest, setPayRequest] = useState<PayRequest>()
  const [answer, setAnswer] = useState<{ asked: Asked; quote?: LnurlTokenQuote; error?: string }>()
  const [round, setRound] = useState(0)

  useEffect(() => {
    setPayRequest(undefined)
    if (!enabled || !receiver) return
    let stale = false
    receiver
      .payRequest()
      .then((next) => {
        if (!stale) setPayRequest(next)
      })
      .catch((err) => consoleError(err, 'lnurl token options failed'))
    return () => {
      stale = true
    }
  }, [receiver, enabled])

  const rails = useMemo(
    () => (payRequest && amountSat > 0 ? lnurlTokenRails(payRequest, amountSat) : []),
    [payRequest, amountSat],
  )
  const rail = rails.find((r) => r.id === selected)

  useEffect(() => {
    if (!payRequest || !rail) return
    const asked = { optionId: rail.id, amountSat, round }
    let stale = false
    let expiry: ReturnType<typeof setTimeout> | undefined
    lnurlClient
      .requestInvoice(payRequest, { amountSat, paymentOption: rail.id })
      .then((result) => {
        if (stale) return
        // The client has already checked the option, the address's chain and a whole amount of the token.
        if (result.kind !== 'destination' || !result.paymentDestination || !result.paymentQuote) {
          throw new LnurlError(`the LNURL answered ${rail.id} with nothing payable on it`)
        }
        if (result.paymentDestinationTag) throw new LnurlError('the deposit needs a memo this QR cannot carry')
        const expiresAt = Date.parse(result.paymentQuote.expiresAt ?? '')
        if (!(expiresAt - Date.now() >= MIN_QUOTE_MS)) {
          throw new LnurlError("the quote expires too soon to pay; check the device's clock")
        }
        const amount = wholeTokens(result.paymentQuote.payment.amount, rail.unit.decimals)
        if (!amount) throw new LnurlError("the quote's amount is unreadable")
        const quote = {
          optionId: rail.id,
          value: result.paymentURI ?? result.paymentDestination,
          destination: result.paymentDestination,
          amount,
          expiresAt,
        }
        setAnswer({ asked, quote })
        expiry = setTimeout(() => setRound((n) => n + 1), Math.min(expiresAt - Date.now(), MAX_TIMEOUT_MS))
      })
      .catch((err) => {
        if (stale) return
        consoleError(err, `lnurl ${rail.id} quote failed`)
        setAnswer({ asked, error: extractError(err) })
      })
    return () => {
      stale = true
      clearTimeout(expiry)
      // Not kept for a return to these inputs: with its timer cleared it could expire unseen.
      setAnswer(undefined)
    }
  }, [payRequest, amountSat, rail?.id, round])

  // The render after an amount, option or expiry change runs before the effect asks again, so a held
  // answer counts only for the inputs it was asked with; anything else is a deposit for another payment.
  const current =
    answer && answer.asked.optionId === rail?.id && answer.asked.amountSat === amountSat && answer.asked.round === round
      ? answer
      : undefined
  return { rails, quote: current?.quote, quoting: Boolean(rail) && !current, error: current?.error ?? '' }
}
