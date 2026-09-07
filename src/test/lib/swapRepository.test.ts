// @vitest-environment node
// node rather than jsdom: the SDK's connection manager resolves the global
// through `self`, which jsdom defines without an `indexedDB` on it.
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { IndexedDbAssetSwapRepository, type AssetSwap, type RfqSwapRecord } from '@arkade-os/swap'
import { SafariSafeAssetSwapRepository } from '../../lib/swapRepository'

/**
 * WebKit's transaction lifetime: a transaction goes inactive the moment the
 * script that created it yields, BEFORE the microtask queue drains — so a
 * request issued after any `await`, even of an already-settled promise, throws
 * `TransactionInactiveError`. Chrome and Firefox deactivate at the end of the
 * microtask checkpoint instead. fake-indexeddb follows the latter, so the
 * former is emulated here: every store handed out by a transaction refuses
 * requests once a microtask has passed since the transaction was created.
 */
const REQUESTS = new Set(['add', 'clear', 'count', 'delete', 'get', 'getAll', 'getAllKeys', 'getKey', 'put'])
const originalTransaction = IDBDatabase.prototype.transaction

const emulateWebKitDeactivation = () => {
  IDBDatabase.prototype.transaction = function (this: IDBDatabase, ...args: Parameters<IDBDatabase['transaction']>) {
    const tx = originalTransaction.apply(this, args)
    let active = true
    queueMicrotask(() => {
      active = false
    })
    const objectStore = tx.objectStore.bind(tx)
    tx.objectStore = (name: string) =>
      new Proxy(objectStore(name), {
        get(target, prop) {
          const value = Reflect.get(target, prop, target)
          if (typeof value !== 'function') return value
          return (...params: unknown[]) => {
            if (!active && typeof prop === 'string' && REQUESTS.has(prop)) {
              throw new DOMException(
                'Failed to execute request: the transaction is not active.',
                'TransactionInactiveError',
              )
            }
            return value.apply(target, params)
          }
        },
      })
    return tx
  }
}

const restoreTransaction = () => {
  IDBDatabase.prototype.transaction = originalTransaction
}

let dbCounter = 0
const freshDbName = () => `swap-repository-test-${Date.now()}-${dbCounter++}`

const swap: AssetSwap = {
  id: 'funding-txid',
  fromAsset: 'btc',
  toAsset: 'asset-beta',
  fromAmount: '10000',
  toAmount: '500',
  swapAddress: 'tark1q...',
  swapPkScript: `5120${'ab'.repeat(32)}`,
  offerHex: '0100',
  fundingTxid: 'funding-txid',
  status: 'pending',
  createdAt: 1,
}

const rfqSwap = { rfqId: 'rfq-1', state: 'pending' } as unknown as RfqSwapRecord

describe('SafariSafeAssetSwapRepository', () => {
  describe.each([
    ['WebKit transaction lifetime', emulateWebKitDeactivation],
    ['spec transaction lifetime', () => {}],
  ])('under the %s', (_label, arrange) => {
    let repository: SafariSafeAssetSwapRepository

    beforeEach(() => {
      arrange()
      repository = new SafariSafeAssetSwapRepository(freshDbName())
    })

    afterEach(async () => {
      restoreTransaction()
      await repository[Symbol.asyncDispose]()
    })

    it('reads back the swaps the package wrote', async () => {
      await repository.saveSwap(swap)
      expect(await repository.getAllSwaps()).toEqual([swap])
    })

    it('reads back RFQ swap records by id and in bulk', async () => {
      await repository.saveRfqSwap(rfqSwap)
      expect(await repository.getRfqSwap('rfq-1')).toEqual(rfqSwap)
      expect(await repository.getRfqSwap('rfq-2')).toBeUndefined()
      expect(await repository.getAllRfqSwaps()).toEqual([rfqSwap])
    })

    it('reads back the scanned txids', async () => {
      await repository.markTxidsScanned(['a', 'b'])
      expect(await repository.getScannedTxids()).toEqual(new Set(['a', 'b']))
    })

    it('reads back the markets cache under the key the package writes', async () => {
      const entry = { markets: [], fetchedAt: 42 }
      await repository.saveCachedMarkets('bitcoin', 'https://registry', entry)
      expect(await repository.getCachedMarkets('bitcoin', 'https://registry')).toEqual(entry)
      expect(await repository.getCachedMarkets('bitcoin', 'https://other')).toBeUndefined()
    })

    it('reads an empty store after clear', async () => {
      await repository.saveSwap(swap)
      await repository.clear()
      expect(await repository.getAllSwaps()).toEqual([])
    })
  })

  // The reason the subclass exists. When this starts failing the package has
  // fixed its reads and the subclass can go.
  it("documents that the package's own reads break under the WebKit lifetime", async () => {
    emulateWebKitDeactivation()
    const repository = new IndexedDbAssetSwapRepository(freshDbName())
    try {
      await repository.saveSwap(swap)
      await expect(repository.getAllSwaps()).rejects.toMatchObject({ name: 'TransactionInactiveError' })
    } finally {
      restoreTransaction()
      await repository[Symbol.asyncDispose]()
    }
  })
})
