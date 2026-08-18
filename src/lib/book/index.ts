/**
 * The order book, as a portable module.
 *
 * Everything under `lib/book/` is framework-free on purpose: no React, no DOM,
 * no `import.meta.env`, no imports from `providers/` or `components/`. Every
 * endpoint, key and provider arrives as an argument. That is what lets the same
 * code back the wallet UI, a CLI, and an agent skill without a fork — the React
 * layer in `providers/orderBook.tsx` is a thin adapter over these calls, and
 * `scripts/` drives them directly from node.
 *
 * The shape of it:
 *
 *   types  the vocabulary and the arithmetic — pure, total, synchronous
 *   read   following the tx stream; no polling anywhere
 *   trade  posting a resting order, and taking someone else's
 *
 * Pulling an order is not here. It is `cancelOffer` from `@arkade-os/swap`,
 * already one call.
 */
export * from './types.ts'
export * from './read.ts'
export * from './trade.ts'
