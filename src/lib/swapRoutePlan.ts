import { isBtcAsset, parseAssetId, type AssetId, type Quote, type QuoteInput } from '@arkade-os/swap'

export type SwapRouteRequest = { from: AssetId; to: AssetId; amount: bigint; amountOn: 'give' | 'take' }
export type DirectedSwapEdge = { from: AssetId; to: AssetId }
export type SwapRoutePlan = { id: string; quotes: readonly Quote[]; expiresAt: number }

const MAX_LEGS = 3
const MAX_QUOTES = 8

function endpointOf(asset: AssetId) {
  const { rail, reference } = parseAssetId(asset)
  if (rail === 'arkade') return { network: reference, corridor: 'arkade' }
  if (rail === 'bolt11' && isBtcAsset(asset)) return { network: reference, corridor: 'lightning' }
  if (rail === 'bitcoin' && isBtcAsset(asset)) return { network: reference, corridor: 'onchain' }
  throw new Error('This asset is unavailable on the requested route')
}

function quoteExpiry(quote: Quote) {
  const give = quote.route.give.instrument
  const take = quote.route.take.instrument
  return Math.min(
    quote.expiresAt,
    quote.assetPayment?.validUntil ?? Infinity,
    give.kind === 'invoice' ? give.expiresAt : Infinity,
    take.kind === 'invoice' ? take.expiresAt : Infinity,
  )
}

function assertQuote(quote: Quote) {
  const give = endpointOf(quote.give.asset)
  const take = endpointOf(quote.take.asset)
  if (
    quote.market.backend !== 'rfq' ||
    quote.give.asset === quote.take.asset ||
    give.network !== take.network ||
    give.corridor === 'onchain' ||
    quote.route.give.asset !== quote.give.asset ||
    quote.route.take.asset !== quote.take.asset ||
    quote.route.give.corridor !== give.corridor ||
    quote.route.take.corridor !== take.corridor ||
    typeof quote.give.amount !== 'bigint' ||
    typeof quote.take.amount !== 'bigint' ||
    quote.give.amount <= 0n ||
    quote.take.amount <= 0n
  ) {
    throw new Error('The quote does not match a firm swap leg')
  }
  const source = quote.route.give.instrument
  const target = quote.route.take.instrument
  if (
    (give.corridor === 'arkade' && source.kind !== 'wallet') ||
    (give.corridor === 'lightning' &&
      (source.kind !== 'invoice' ||
        source.amount !== quote.give.amount ||
        quote.artifact?.kind !== 'invoice' ||
        quote.artifact.bolt11 !== source.bolt11)) ||
    (take.corridor === 'arkade' && target.kind === 'invoice') ||
    (take.corridor === 'lightning' && target.kind !== 'invoice') ||
    (take.corridor === 'onchain' && target.kind !== 'address') ||
    (target.kind !== 'wallet' && target.amount !== undefined && target.amount !== quote.take.amount)
  ) {
    throw new Error('The quote has an invalid funding or delivery instrument')
  }
  const expiry = quoteExpiry(quote)
  if (!Number.isSafeInteger(expiry) || expiry <= Math.floor(Date.now() / 1_000)) {
    throw new Error('A swap quote in this route has expired')
  }
  return expiry
}

/** The caller verifies the final invoice or recipient against the payment request. */
export function assertJoinedQuotes(quotes: readonly Quote[]): number {
  if (!quotes.length) throw new Error('A swap route needs at least one quote')
  const visited = new Set([quotes[0].give.asset])
  const ids = new Set<string>()
  let expiry = Infinity
  for (const [index, quote] of quotes.entries()) {
    expiry = Math.min(expiry, assertQuote(quote))
    if (!quote.id || ids.has(quote.id) || visited.has(quote.take.asset)) throw new Error('The swap route has a loop')
    ids.add(quote.id)
    visited.add(quote.take.asset)
    if (index === 0) continue
    const previous = quotes[index - 1]
    if (
      previous.take.asset !== quote.give.asset ||
      previous.take.amount !== quote.give.amount ||
      previous.route.take.corridor !== 'arkade' ||
      quote.route.give.corridor !== 'arkade' ||
      previous.route.take.instrument.kind !== 'wallet' ||
      quote.route.give.instrument.kind !== 'wallet'
    ) {
      throw new Error('Adjacent swaps must join at an exact wallet balance')
    }
  }
  return expiry
}

function* candidatePaths(request: SwapRouteRequest, edges: readonly DirectedSwapEdge[], network: string) {
  const graph = new Map<AssetId, Set<AssetId>>()
  for (const edge of edges) {
    if (edge.from === edge.to || edge.to === request.from || edge.from === request.to) continue
    try {
      const from = endpointOf(edge.from)
      const to = endpointOf(edge.to)
      if (from.network !== network || to.network !== network || to.corridor !== 'arkade') continue
      if (from.corridor !== 'arkade' && edge.from !== request.from) continue
    } catch {
      continue
    }
    const next = graph.get(edge.from) ?? new Set<AssetId>()
    next.add(edge.to)
    graph.set(edge.from, next)
  }
  const sorted = new Map([...graph].map(([from, next]) => [from, [...next].sort()]))

  function* visit(path: readonly AssetId[], remaining: number): Generator<readonly AssetId[]> {
    const node = path[path.length - 1]
    if (remaining === 1) {
      if (graph.get(node)?.has(request.to)) yield [...path, request.to]
      return
    }
    for (const next of sorted.get(node) ?? []) {
      if (next !== request.to && !path.includes(next)) yield* visit([...path, next], remaining - 1)
    }
  }

  for (let legs = 1; legs <= MAX_LEGS; legs++) yield* visit([request.from], legs)
}

export async function planSwapRoute(
  id: string,
  request: SwapRouteRequest,
  edges: readonly DirectedSwapEdge[],
  quote: (input: QuoteInput) => Promise<Quote>,
): Promise<SwapRoutePlan> {
  const source = endpointOf(request.from)
  const destination = endpointOf(request.to)
  if (
    !id ||
    source.network !== destination.network ||
    source.corridor === 'onchain' ||
    destination.corridor !== 'arkade' ||
    request.from === request.to ||
    typeof request.amount !== 'bigint' ||
    request.amount <= 0n ||
    (request.amountOn !== 'give' && request.amountOn !== 'take')
  ) {
    throw new Error('Invalid source, destination, or amount for this swap route')
  }

  const { amountOn } = request
  const forward = amountOn === 'give'
  const asked = new Map<string, Promise<Quote>>()
  const negotiate = (give: AssetId, take: AssetId, amount: bigint) => {
    const key = JSON.stringify([give, take, String(amount), amountOn])
    const existing = asked.get(key)
    if (existing) return existing
    if (asked.size >= MAX_QUOTES) throw new Error('The quote limit was reached')
    const input: QuoteInput = {
      give,
      take,
      amount,
      amountOn,
      ...(give === request.from && source.corridor === 'lightning' ? { via: 'lightning' } : {}),
    }
    const pending = Promise.resolve()
      .then(() => quote(input))
      .then((firm) => {
        assertQuote(firm)
        if (
          !firm.id ||
          firm.give.asset !== give ||
          firm.take.asset !== take ||
          firm[amountOn].amount !== amount ||
          firm.route.take.instrument.kind !== 'wallet'
        ) {
          throw new Error('The quote changed the requested swap terms')
        }
        return firm
      })
    asked.set(key, pending)
    return pending
  }

  let cause: unknown
  for (const path of candidatePaths(request, edges, source.network)) {
    if (asked.size >= MAX_QUOTES) break
    try {
      let needed = request.amount
      const legs = path.length - 1
      const quotes: Quote[] = []
      for (let step = 0; step < legs; step++) {
        const index = forward ? step : legs - step - 1
        const firm = await negotiate(path[index], path[index + 1], needed)
        quotes[index] = firm
        needed = forward ? firm.take.amount : firm.give.amount
      }
      return { id, quotes, expiresAt: assertJoinedQuotes(quotes) }
    } catch (error) {
      cause = error
    }
  }
  throw new Error('No firm swap route is available for these terms', { cause })
}
