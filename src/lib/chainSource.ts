/**
 * The wallet's Bitcoin-L1 view, as `@arkade-os/swap` asks for it.
 *
 * The package is backend-free by design: it derives the onchain HTLC, decides
 * when the fill is claimable, and builds the claim — but every read and the
 * broadcast belong to the caller. This is that caller, over esplora, which the
 * wallet already points at per network for its unilateral-exit history.
 *
 * Two things here are less obvious than they look.
 *
 * **Outputs are looked up by ADDRESS, not by script hash.** `getScriptUtxos`
 * is handed a `pkScript`, and esplora does expose `/scripthash/:hash/utxo` —
 * but that hash is byte-reversed by convention, and getting the endianness
 * wrong returns an empty list rather than an error. An empty list is exactly
 * what "not funded yet" looks like, so the mistake would not surface as a bug;
 * it would surface as a claim window that quietly expired. Decoding the script
 * to its address costs one pure call and cannot fail silently.
 *
 * **Median-time-past, not the tip's timestamp.** Consensus matures a
 * `OP_CHECKLOCKTIMEVERIFY` leaf against MTP — the median of the last eleven
 * block timestamps — which lags the tip by roughly an hour. Comparing a
 * locktime against the tip's own timestamp would call a leaf mature before the
 * network does, and `classifyOnchainHtlc` would report `refundable` while the
 * claim was in fact still open.
 */
import * as btc from '@scure/btc-signer'
import type { ChainSource, ChainUtxo, OnchainNetwork } from '@arkade-os/swap'

/** How many timestamps consensus takes the median of. */
const MTP_WINDOW = 11

/**
 * How long any single esplora request may take.
 *
 * Not politeness — `RfqSwapManager` awaits these reads and the claim they lead
 * to before it schedules its next pass, so one request that never settles stops
 * the swap being driven at all. On this corridor that is the failure with a
 * deadline attached: the claim window shuts while the wallet waits on a socket.
 * A rejection is recoverable (the next pass retries); a hang is not.
 */
export const ESPLORA_TIMEOUT_MS = 15_000

/**
 * `fetch` with a deadline, cancelled at both ends.
 *
 * The signal is what stops a real request; the race is what stops WAITING on
 * one — an implementation that ignores `signal`, and every injected test double,
 * would otherwise leave the promise pending forever. Belt and braces, because
 * only one of the two is under this file's control.
 */
const withDeadline = async (
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit = {},
  timeoutMs = ESPLORA_TIMEOUT_MS,
): Promise<Response> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await Promise.race([
      fetchImpl(url, { ...init, signal: controller.signal }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`esplora did not answer within ${timeoutMs}ms`)), timeoutMs),
      ),
    ])
  } finally {
    clearTimeout(timer)
  }
}

/**
 * The default transport: a bare call to the global, not a reference to it.
 *
 * `fetchImpl = fetch` would capture the function object and call it detached.
 * Browsers happen to tolerate that for a Window operation, but the tolerance is
 * a WebIDL detail rather than something this file should be relying on, and it
 * costs nothing to call `fetch` the same way every other module here does.
 */
const globalFetch: typeof fetch = (input, init) => fetch(input, init)

const NETWORKS: Record<OnchainNetwork, typeof btc.NETWORK> = {
  bitcoin: btc.NETWORK,
  testnet: btc.TEST_NETWORK,
  regtest: { bech32: 'bcrt', pubKeyHash: 0x6f, scriptHash: 0xc4, wif: 0xef },
}

interface EsploraUtxo {
  txid: string
  vout: number
  value: number
  status?: { confirmed?: boolean; block_height?: number }
}

interface EsploraBlock {
  height: number
  timestamp: number
}

/**
 * An esplora-backed `ChainSource`.
 *
 * `baseUrl` is the REST root including `/api` where the deployment uses one —
 * the same string `getRestApiExplorerURL` returns. `fetchImpl` is injectable so
 * the unit tests can drive every branch without a network.
 */
export const esploraChainSource = (
  baseUrl: string,
  network: OnchainNetwork,
  fetchImpl: typeof fetch = globalFetch,
): ChainSource => {
  const root = baseUrl.replace(/\/+$/, '')

  const get = async (path: string): Promise<Response> => {
    const response = await withDeadline(fetchImpl, `${root}${path}`)
    if (!response.ok) throw new Error(`esplora ${path} failed: ${response.status}`)
    return response
  }

  const json = async <T>(path: string): Promise<T> => (await get(path)).json() as Promise<T>

  /** The chain tip's height — the anchor both block reads start from. */
  const tipHeight = async (): Promise<number> => {
    const height = Number((await (await get('/blocks/tip/height')).text()).trim())
    if (!Number.isInteger(height) || height < 0) throw new Error('esplora returned no usable tip height')
    return height
  }

  return {
    async getScriptUtxos(pkScript: Uint8Array): Promise<ChainUtxo[]> {
      const address = btc.Address(NETWORKS[network]).encode(btc.OutScript.decode(pkScript))
      const [utxos, tip] = await Promise.all([json<EsploraUtxo[]>(`/address/${address}/utxo`), tipHeight()])
      return utxos.map((utxo) => ({
        txid: utxo.txid,
        vout: utxo.vout,
        amount: BigInt(utxo.value),
        // An unconfirmed output is zero confirmations, not one: it is exactly
        // the depth `minConfirmations` is being compared against, and calling
        // a mempool output "1 deep" would let a 1-confirmation policy claim
        // against a transaction that can still be replaced.
        confirmations:
          utxo.status?.confirmed && typeof utxo.status.block_height === 'number'
            ? Math.max(0, tip - utxo.status.block_height + 1)
            : 0,
      }))
    },

    async getSpendingTx(txid: string, vout: number): Promise<{ txHex: string } | null> {
      const outspend = await json<{ spent?: boolean; txid?: string }>(`/tx/${txid}/outspend/${vout}`)
      if (!outspend.spent || !outspend.txid) return null
      return { txHex: (await (await get(`/tx/${outspend.txid}/hex`)).text()).trim() }
    },

    async broadcast(txHex: string): Promise<string> {
      const response = await withDeadline(fetchImpl, `${root}/tx`, { method: 'POST', body: txHex })
      const body = (await response.text()).trim()
      if (!response.ok) throw new Error(`esplora rejected the transaction: ${body || response.status}`)
      return body
    },

    async getMtp(): Promise<number> {
      // `/blocks` answers with the ten newest; MTP needs eleven, so the second
      // page is fetched from where the first ends. Sorting by height rather
      // than trusting the order means a deployment that pages differently
      // still yields the right window.
      const newest = await json<EsploraBlock[]>('/blocks')
      if (newest.length === 0) throw new Error('esplora returned no blocks')
      const oldest = Math.min(...newest.map((block) => block.height))
      const older = oldest > 0 ? await json<EsploraBlock[]>(`/blocks/${oldest - 1}`) : []
      const timestamps = [...newest, ...older]
        .sort((a, b) => b.height - a.height)
        .slice(0, MTP_WINDOW)
        .map((block) => block.timestamp)
        .sort((a, b) => a - b)
      // Fewer than eleven blocks exist only on a fresh regtest chain; the
      // median of what there is, is what consensus uses there too.
      return timestamps[Math.floor(timestamps.length / 2)]
    },
  }
}

/** The floor, and what an unusable estimate falls back to. One sat/vB is the
 * default relay minimum: below it the claim would not propagate at all. */
export const MIN_CLAIM_FEE_RATE = 1

/**
 * A fee rate for the L1 claim, sat/vB.
 *
 * Deliberately NOT part of `ChainSource`: the package does not ask for one, and
 * this is a policy choice rather than an observation. The two-block bucket is
 * the target because the claim races a deadline — `claimOnchainFill` already
 * refuses inside `ONCHAIN_CLAIM_MARGIN_SECONDS` of the refund leaf, so a claim
 * that sits unconfirmed is a claim that loses the fill.
 *
 * Never throws. An esplora that cannot answer must not stop a claim that is
 * otherwise ready; the floor still relays.
 */
export const claimFeeRate = async (baseUrl: string, fetchImpl: typeof fetch = globalFetch): Promise<number> => {
  try {
    const response = await withDeadline(fetchImpl, `${baseUrl.replace(/\/+$/, '')}/fee-estimates`)
    if (!response.ok) return MIN_CLAIM_FEE_RATE
    const estimates = (await response.json()) as Record<string, number>
    const target = estimates['2'] ?? estimates['1'] ?? estimates['3']
    return typeof target === 'number' && Number.isFinite(target) && target > MIN_CLAIM_FEE_RATE
      ? Math.ceil(target)
      : MIN_CLAIM_FEE_RATE
  } catch {
    return MIN_CLAIM_FEE_RATE
  }
}
