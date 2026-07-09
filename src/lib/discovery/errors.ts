// Distinct error types so UIs can explain *why* a pair is unpriceable
// instead of showing a generic failure.

/** A registry index, solver card, or field failed schema validation. */
export class DiscoveryValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DiscoveryValidationError'
  }
}

/** An index was fetched for one network but declares another (e.g. mainnet wallet reading signet). */
export class NetworkMismatchError extends DiscoveryValidationError {
  readonly expected: string
  readonly actual: string

  constructor(expected: string, actual: string) {
    super(`discovery index network mismatch: expected "${expected}", got "${actual}"`)
    this.name = 'NetworkMismatchError'
    this.expected = expected
    this.actual = actual
  }
}

/** No source lists any market for the requested pair. */
export class NoMarketError extends Error {
  readonly pair: string

  constructor(pair: string) {
    super(`no market found for pair ${pair}`)
    this.name = 'NoMarketError'
    this.pair = pair
  }
}

/** Markets exist for the pair, but none accepts the requested trade size. */
export class MarketSizeError extends Error {
  readonly pair: string
  readonly baseAmount: bigint

  constructor(pair: string, baseAmount: bigint) {
    super(`no market for pair ${pair} accepts a base amount of ${baseAmount}`)
    this.name = 'MarketSizeError'
    this.pair = pair
    this.baseAmount = baseAmount
  }
}

/** Every followed registry and local card failed to load — nothing to price from. */
export class AllSourcesFailedError extends Error {
  readonly errors: Error[]

  constructor(errors: Error[]) {
    super(`all ${errors.length} discovery source(s) failed: ${errors.map((e) => e.message).join('; ')}`)
    this.name = 'AllSourcesFailedError'
    this.errors = errors
  }
}

/**
 * A market's price feed could not be fetched. `maybeCors` is set when the
 * failure looks like a browser-side CORS block (fetch rejects with a TypeError
 * and no status), so UIs can explain that the feed is not browser-fetchable.
 */
export class FeedUnreachableError extends Error {
  readonly feedUrl: string
  readonly maybeCors: boolean
  readonly status?: number

  constructor(feedUrl: string, opts: { maybeCors?: boolean; status?: number; cause?: unknown } = {}) {
    const reason = opts.maybeCors
      ? 'blocked by the browser (possibly CORS)'
      : opts.status !== undefined
        ? `HTTP ${opts.status}`
        : 'unreachable'
    super(`price feed ${feedUrl} is ${reason}`)
    this.name = 'FeedUnreachableError'
    this.feedUrl = feedUrl
    this.maybeCors = opts.maybeCors ?? false
    this.status = opts.status
  }
}

/** The price feed responded, but no numeric price could be extracted from the body. */
export class FeedParseError extends Error {
  readonly feedUrl: string

  constructor(feedUrl: string, detail: string) {
    super(`could not parse a price from feed ${feedUrl}: ${detail}`)
    this.name = 'FeedParseError'
    this.feedUrl = feedUrl
  }
}
