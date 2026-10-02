import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SingleKey, Transaction } from '@arkade-os/sdk'
import { TaxiClient } from '@arkade-taxi/client'
import { base64, hex } from '@scure/base'
import { FailedDirectTaxi, PendingDirectTaxi, getPendingDirectTaxi, sendDirectTaxi } from '../../lib/directTaxiSend'
import { ASSET_ID, BITCOIN_INFO, KEYS, RECEIVER_ADDRESS, TAXI_URL, taxiFetch, withRule } from './receiverTaxiFixtures'

// jsdom has no IndexedDB, and a send reads the funding reservations from this repository.
vi.mock('../../lib/swapRepository', async (importOriginal) => {
  const { InMemoryAssetSwapRepository } = await vi.importActual<typeof import('@arkade-os/swap')>('@arkade-os/swap')
  return {
    ...(await importOriginal<typeof import('../../lib/swapRepository')>()),
    assetSwapRepository: new InMemoryAssetSwapRepository(),
  }
})
vi.mock('@arkade-taxi/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@arkade-taxi/client')>()),
  signSponsoredPayment: vi.fn(async () => 'signed'),
}))

const wallet = { identity: SingleKey.fromRandomBytes() }
const TXID = 'a'.repeat(64)
const FAILED = {
  transferId: 't-1',
  state: 'locking',
  submissionPhase: 'failed',
  failureCode: 'lockup_submission_invalid_provider_response',
  failureDetail: 'server checkpoint 0 changed unsigned fields or metadata',
  updatedAt: 1,
}
const LOCKED = { transferId: 't-1', state: 'locked', outpoint: { txid: TXID, vout: 0 }, updatedAt: 2 }
const NOT_DELIVERED = 'It has not been delivered yet; the Taxi operator may still complete it.'

let key = ''
const storedPayment = async (over: Record<string, unknown> = {}) => {
  const senderKey = hex.encode(await wallet.identity.xOnlyPublicKey())
  key = `directTaxiPending:regtest:${senderKey}`
  const record = {
    network: 'regtest',
    senderKey,
    taxiUrl: TAXI_URL,
    operatorKey: KEYS.operator,
    transferId: 't-1',
    expectedTxid: TXID,
    expectedVout: 0,
    mode: 'recycle',
    receiverAddress: RECEIVER_ADDRESS,
    assetId: ASSET_ID,
    assetAmount: '1',
    ...over,
  }
  localStorage.setItem(key, JSON.stringify(record))
  return (await getPendingDirectTaxi(wallet, 'regtest'))!
}

const statusPolls = (fetch: ReturnType<typeof taxiFetch>) =>
  fetch.mock.calls.map(([url]) => String(url)).filter((url) => url.includes('transfers/'))

beforeEach(() => localStorage.clear())
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('checking a Taxi payment that is still on record', () => {
  it('stops at a failed submission and shows its detail, keeping the record', async () => {
    const fetch = taxiFetch({ statuses: [FAILED] })
    vi.stubGlobal('fetch', fetch)
    const failed = await (await storedPayment()).resume().catch((error: unknown) => error)
    expect(failed).toBeInstanceOf(FailedDirectTaxi)
    expect(failed).toMatchObject({
      name: 'FailedDirectTaxi',
      failureCode: FAILED.failureCode,
      message:
        'Taxi could not submit this payment: server checkpoint 0 changed unsigned fields or metadata ' +
        `(lockup_submission_invalid_provider_response). ${NOT_DELIVERED}`,
    })
    expect(statusPolls(fetch)).toEqual([`${TAXI_URL}/v1/transfers/t-1`])
    expect(localStorage.getItem(key)).not.toBeNull()
  })

  it('forgets a failed payment only when asked, once the Taxi still reports the failure', async () => {
    const fetch = taxiFetch({ statuses: [{ ...FAILED, failureDetail: undefined }] })
    vi.stubGlobal('fetch', fetch)
    const failed = (await (await storedPayment()).resume().catch((error: unknown) => error)) as FailedDirectTaxi
    expect(failed.message).toBe(
      `Taxi could not submit this payment (lockup_submission_invalid_provider_response). ${NOT_DELIVERED}`,
    )
    expect(localStorage.getItem(key)).not.toBeNull()
    expect(await failed.forget()).toBeUndefined()
    expect(statusPolls(fetch)).toHaveLength(2)
    expect(localStorage.getItem(key)).toBeNull()
  })

  it('reports a failed payment that has since landed, instead of forgetting it', async () => {
    vi.stubGlobal('fetch', taxiFetch({ statuses: [FAILED, LOCKED] }))
    const failed = (await (await storedPayment()).resume().catch((error: unknown) => error)) as FailedDirectTaxi
    expect(await failed.forget()).toBe(TXID)
    expect(localStorage.getItem(key)).toBeNull()
  })

  it('refuses to forget a payment no longer on record, rather than calling it forgotten', async () => {
    vi.stubGlobal('fetch', taxiFetch({ statuses: [FAILED] }))
    const failed = (await (await storedPayment()).resume().catch((error: unknown) => error)) as FailedDirectTaxi
    localStorage.removeItem(key)
    await expect(failed.forget()).rejects.toThrow(
      'This Taxi payment is no longer on record; check your history before sending again',
    )
  })

  it('keeps polling through a failure code on a live phase, which the Taxi retries', async () => {
    const retrying = { ...FAILED, submissionPhase: 'prepared', failureCode: 'lockup_submission_prepared_ambiguous' }
    vi.stubGlobal('fetch', taxiFetch({ statuses: [retrying, LOCKED] }))
    expect(await (await storedPayment()).resume()).toBe(TXID)
    expect(localStorage.getItem(key)).toBeNull()
  })

  it('still calls an unreachable status ambiguous, and keeps the record', async () => {
    const reachable = taxiFetch()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.includes('transfers/')) throw new TypeError('Failed to fetch')
        return reachable(url, init)
      }),
    )
    const pending = await (await storedPayment()).resume().catch((error: unknown) => error)
    expect(pending).toBeInstanceOf(PendingDirectTaxi)
    expect(pending).not.toBeInstanceOf(FailedDirectTaxi)
    expect((pending as Error).message).toBe('Payment may have been submitted; retry checks the same transfer')
    expect(localStorage.getItem(key)).not.toBeNull()
  })

  it('stops the same way for a sponsored payment, polling its own status', async () => {
    const fetch = taxiFetch({ statuses: [FAILED] })
    vi.stubGlobal('fetch', fetch)
    const failed = await (await storedPayment({ mode: 'sponsored' })).resume().catch((error: unknown) => error)
    expect(failed).toBeInstanceOf(FailedDirectTaxi)
    expect(statusPolls(fetch)).toEqual([`${TAXI_URL}/v1/sponsored-transfers/t-1`])
  })
})

describe('a new Taxi payment the Taxi then fails to submit', () => {
  it('stops at the failure on its first status check, keeping the record', async () => {
    vi.stubEnv('VITE_EMULATOR_PUBKEY', KEYS.emulator)
    vi.stubGlobal('navigator', { locks: { request: (_: string, run: () => unknown) => run() } })
    const assetFare = { id: 'share', currency: 'sameAsset', pricing: { kind: 'flat', units: '0' } }
    const fetch = taxiFetch({ info: withRule({ fares: [assetFare] }), statuses: [FAILED] })
    vi.stubGlobal('fetch', fetch)
    const tx = new Transaction()
    tx.addInput({ txid: 'b'.repeat(64), index: 0 })
    tx.addOutput({ script: new Uint8Array([0x51, 0x20, ...hex.decode(KEYS.receiver)]), amount: 330n })
    const arkTx = base64.encode(tx.toPSBT())
    const txid = Transaction.fromPSBT(base64.decode(arkTx)).id
    vi.spyOn(TaxiClient.prototype, 'requestVerifiedSponsoredQuote').mockResolvedValue({
      verified: {
        quote: { transferId: 't-1', fare: { currency: 'asset', units: '0' }, expiresAt: Date.now() / 1000 + 600 },
        params: { operatorKey: hex.decode(KEYS.operator), contribution: 329n },
        envelope: { arkTx, covenantOutputIndex: 0 },
      },
      senderInputs: [],
    } as never)
    vi.spyOn(TaxiClient.prototype, 'submitSponsoredLockup').mockResolvedValue({ txid, outpoint: { txid, vout: 0 } })
    const coin = { txid: 'c'.repeat(64), vout: 0, value: 1, assets: [{ assetId: ASSET_ID, amount: 1n }] }
    const send = sendDirectTaxi({
      wallet: { identity: wallet.identity, getSpendableVtxos: async () => [coin] } as never,
      aspInfo: {
        network: 'regtest',
        signerPubkey: KEYS.server,
        dust: 330n,
        vtxoMinAmount: 1n,
        checkpointTapscript: '',
      },
      taxi: { url: TAXI_URL },
      receiverAddress: RECEIVER_ADDRESS,
      assetId: ASSET_ID,
      amount: 1n,
      mode: 'sponsored',
      confirmPayment: async () => true,
    } as never)
    await expect(send).rejects.toBeInstanceOf(FailedDirectTaxi)
    expect(statusPolls(fetch)).toEqual([`${TAXI_URL}/v1/sponsored-transfers/t-1`])
    const senderKey = hex.encode(await wallet.identity.xOnlyPublicKey())
    expect(JSON.parse(localStorage.getItem(`directTaxiPending:regtest:${senderKey}`)!)).toMatchObject({
      transferId: 't-1',
      expectedTxid: txid,
    })
  })
})

describe('sending sub-dust bitcoin through the Taxi', () => {
  it('refuses before asking any Taxi, until the client can bind an exact amount', async () => {
    const fetch = taxiFetch({ info: BITCOIN_INFO })
    vi.stubGlobal('fetch', fetch)
    vi.stubGlobal('navigator', { locks: { request: (_: string, run: () => unknown) => run() } })
    const send = sendDirectTaxi({
      wallet: wallet as never,
      aspInfo: { network: 'regtest' } as never,
      taxi: { url: TAXI_URL },
      receiverAddress: RECEIVER_ADDRESS,
      amount: 100n,
      mode: 'recycle',
      confirmPayment: vi.fn(),
    })
    await expect(send).rejects.toThrow("This wallet can't send an exact sub-dust amount through Taxi yet")
    expect(fetch).not.toHaveBeenCalled()
  })
})
