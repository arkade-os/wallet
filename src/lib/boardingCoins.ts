export const outpointOf = (coin: { txid: string; vout: number }): string => `${coin.txid}:${coin.vout}`

/**
 * Coins in `incoming` whose outpoint is not already in `known`.
 * Every incoming outpoint is added to `known`, so a later snapshot of the
 * same set yields nothing.
 */
export const takeFreshCoins = <T extends { txid: string; vout: number }>(known: Set<string>, incoming: T[]): T[] => {
  const fresh: T[] = []
  for (const coin of incoming) {
    const key = outpointOf(coin)
    if (known.has(key)) continue
    known.add(key)
    fresh.push(coin)
  }
  return fresh
}
