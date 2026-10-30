import { consoleError } from './logs'

/**
 * How long to wait before asking Electrum again after the worker's one-shot
 * boarding refresh. That pass is not retried by the SDK, and its request
 * timeout is 10s, so the first wait lets it finish or fail before this one starts.
 */
const BOARDING_RETRY_DELAYS_MS = [12_000, 5_000, 10_000, 20_000]

type BoardingBalance = { boarding?: { loaded?: boolean } }

export type BoardingReader = {
  getBalance?: () => Promise<BoardingBalance>
  getBoardingUtxos?: () => Promise<unknown>
}

const abortableSleep = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    if (signal.aborted) {
      resolve()
      return
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      resolve()
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })

/**
 * Refetch boarding coins when the worker's background refresh did not mark
 * them loaded. `getBoardingUtxos` throws when Electrum fails, which keeps a
 * dead host from replacing the stored set with an empty one.
 *
 * Stops after a successful fetch even though the worker's `boarding.loaded`
 * flag stays false: that flag is only set by the background refresh, and the
 * coins are already in the repository `getBalance` reads.
 */
export const retryBoardingFetch = async (
  wallet: BoardingReader,
  signal: AbortSignal,
  onFetched: () => void,
  wait: (ms: number, signal: AbortSignal) => Promise<void> = abortableSleep,
): Promise<void> => {
  if (typeof wallet.getBalance !== 'function' || typeof wallet.getBoardingUtxos !== 'function') return
  const getBalance = wallet.getBalance.bind(wallet)
  const getBoardingUtxos = wallet.getBoardingUtxos.bind(wallet)
  for (const delay of BOARDING_RETRY_DELAYS_MS) {
    await wait(delay, signal)
    if (signal.aborted) return
    try {
      const balance = await getBalance()
      if (balance.boarding?.loaded !== false) return
      await getBoardingUtxos()
      if (!signal.aborted) onFetched()
      return
    } catch (err) {
      consoleError(err, 'Electrum boarding lookup failed')
    }
  }
}
