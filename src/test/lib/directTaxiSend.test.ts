import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SingleKey, Transaction } from '@arkade-os/sdk'
import { TaxiClient, verifyQuote } from '@arkade-taxi/client'
import { base64, hex } from '@scure/base'
import {
  FailedDirectTaxi,
  PendingDirectTaxi,
  getPendingDirectTaxi,
  selectSatsForTaxi,
  sendDirectTaxi,
} from '../../lib/directTaxiSend'
import { assetSwapRepository } from '../../lib/swapRepository'
import {
  ASSET_ID,
  BITCOIN_INFO,
  KEYS,
  RECEIVER_ADDRESS,
  TAXI_URL,
  legacyBitcoinQuote,
  senderCoin,
  taxiFetch,
  withRule,
} from './receiverTaxiFixtures'

// jsdom has no IndexedDB, and a send reads the funding reservations from this repository.
vi.mock('../../lib/swapRepository', async (importOriginal) => {
  const { InMemoryAssetSwapRepository } = await vi.importActual<typeof import('@arkade-os/swap')>('@arkade-os/swap')
  return {
    ...(await importOriginal<typeof import('../../lib/swapRepository')>()),
    assetSwapRepository: new InMemoryAssetSwapRepository(),
  }
})
vi.mock('@arkade-taxi/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@arkade-taxi/client')>()
  return {
    ...actual,
    signLockup: vi.fn(async () => 'signed'),
    signSponsoredPayment: vi.fn(async () => 'signed'),
    verifyQuote: vi.fn(actual.verifyQuote),
  }
})

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

describe('Taxi settlement polling cadence', () => {
  const locking = { transferId: 't-1', state: 'locking', submissionPhase: 'claimed', updatedAt: 1 }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    vi.stubGlobal('fetch', taxiFetch())
  })
  afterEach(() => vi.useRealTimers())

  it('checks immediately, then gives a quick settlement one second before reading again', async () => {
    const status = vi.spyOn(TaxiClient.prototype, 'status').mockResolvedValueOnce(locking as never)
    status.mockResolvedValue(LOCKED as never)
    const payment = await storedPayment()
    const outcome = payment.resume()
    await vi.advanceTimersByTimeAsync(0)
    expect(status).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(999)
    expect(status).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    await expect(outcome).resolves.toBe(TXID)
    expect(status).toHaveBeenCalledTimes(2)
    expect(localStorage.getItem(key)).toBeNull()
  })

  it('limits a slow pending payment to ten reads within the thirty-second budget, keeping its journal', async () => {
    const reads: number[] = []
    vi.spyOn(TaxiClient.prototype, 'status').mockImplementation(async () => {
      reads.push(Date.now())
      await new Promise((resolve) => setTimeout(resolve, 800))
      return locking as never
    })
    const payment = await storedPayment()
    let finishedAt: number | undefined
    const outcome = payment.resume().catch((error: unknown) => {
      finishedAt = Date.now()
      return error
    })
    await vi.advanceTimersByTimeAsync(30_000)
    expect(finishedAt).toBe(30_000)
    expect(await outcome).toBeInstanceOf(PendingDirectTaxi)
    expect(reads[0]).toBe(0)
    expect(reads.length).toBeLessThanOrEqual(10)
    expect(reads.every((started) => started < 30_000)).toBe(true)
    expect(localStorage.getItem(key)).not.toBeNull()
  })

  it('stops on a reported failure after backing off, without another read or clearing the journal', async () => {
    const status = vi
      .spyOn(TaxiClient.prototype, 'status')
      .mockImplementation(async () => (Date.now() < 8_000 ? locking : FAILED) as never)
    const payment = await storedPayment()
    const outcome = payment.resume().catch((error: unknown) => error)
    await vi.advanceTimersByTimeAsync(8_000)
    expect(await outcome).toBeInstanceOf(FailedDirectTaxi)
    expect(status).toHaveBeenCalledTimes(5)
    await vi.advanceTimersByTimeAsync(8_000)
    expect(status).toHaveBeenCalledTimes(5)
    expect(localStorage.getItem(key)).not.toBeNull()
  })
})
describe('a new Taxi payment the Taxi then fails to submit', () => {
  it('refuses receiver-repaid modes when the request requires sender-funded delivery', async () => {
    await expect(
      sendDirectTaxi({ wallet, taxi: { url: TAXI_URL, payer: 'sender' }, assetId: ASSET_ID, mode: 'recycle' } as never),
    ).rejects.toThrow('requires sender-covered delivery')
  })
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
        quote: {
          transferId: 't-1',
          params: { contribution: '329' },
          fare: { currency: 'asset', units: '0' },
          expiresAt: Date.now() / 1000 + 600,
        },
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
  const send = (over: Record<string, unknown>) =>
    sendDirectTaxi({
      aspInfo: {
        network: 'regtest',
        signerPubkey: KEYS.server,
        dust: 330n,
        vtxoMinAmount: 1n,
        checkpointTapscript: '',
      },
      taxi: { url: TAXI_URL },
      receiverAddress: RECEIVER_ADDRESS,
      amount: 100n,
      mode: 'recycle',
      confirmPayment: async () => true,
      ...over,
    } as never)
  const lockup = () => {
    const tx = new Transaction()
    tx.addInput({ txid: 'b'.repeat(64), index: 0 })
    tx.addOutput({ script: new Uint8Array([0x51, 0x20, ...hex.decode(KEYS.receiver)]), amount: 330n })
    const arkTx = base64.encode(tx.toPSBT())
    return { arkTx, txid: Transaction.fromPSBT(base64.decode(arkTx)).id }
  }
  const locked = (txid: string) => ({ transferId: 't-1', state: 'locked', outpoint: { txid, vout: 0 }, updatedAt: 2 })
  const posts = (fetch: ReturnType<typeof taxiFetch>) => fetch.mock.calls.filter(([, init]) => init?.method === 'POST')
  const journalKeys = () => Object.keys(localStorage).filter((name) => name.startsWith('directTaxiPending'))

  beforeEach(() => {
    vi.stubEnv('VITE_EMULATOR_PUBKEY', KEYS.emulator)
    vi.stubGlobal('navigator', { locks: { request: (_: string, run: () => unknown) => run() } })
  })

  it('asks a Taxi for exactly the amount typed, and moves nothing when the quote ignores it', async () => {
    const senderKey = hex.encode(await wallet.identity.xOnlyPublicKey())
    const fetch = taxiFetch({ info: BITCOIN_INFO, transfer: legacyBitcoinQuote(senderKey) })
    vi.stubGlobal('fetch', fetch)
    const coin = await senderCoin(wallet.identity, 1_000)
    const confirmPayment = vi.fn()
    await expect(
      send({ wallet: { identity: wallet.identity, getSpendableVtxos: async () => [coin] }, confirmPayment }),
    ).rejects.toThrow("This Taxi can't carry an exact sub-dust amount")
    const [[url, init]] = posts(fetch)
    expect(url).toBe(`${TAXI_URL}/v1/transfers`)
    const body = JSON.parse(String(init!.body))
    expect(body).toMatchObject({ paymentSats: '100', senderSats: '1000', claimMode: 'recycle', fareId: 'sats' })
    expect(body).not.toHaveProperty('assetId')
    expect(body).not.toHaveProperty('assetUnits')
    expect(posts(fetch)).toHaveLength(1)
    expect(confirmPayment).not.toHaveBeenCalled()
    expect(journalKeys()).toEqual([])
  })

  it('quotes a recycle from plain unreserved coins, bound to the amount, and journals it in sats', async () => {
    const { arkTx, txid } = lockup()
    vi.stubGlobal('fetch', taxiFetch({ info: BITCOIN_INFO, statuses: [locked(txid)] }))
    const quote = vi.spyOn(TaxiClient.prototype, 'requestVerifiedQuote').mockResolvedValue({
      verified: {
        quote: {
          transferId: 't-1',
          params: { topup: '230' },
          fare: { currency: 'sats', units: '0' },
          expiresAt: Date.now() / 1000 + 600,
        },
        params: { operatorKey: hex.decode(KEYS.operator), topup: 230n },
        envelope: { arkTx, covenantOutputIndex: 0 },
      },
      senderInputs: [],
    } as never)
    let journaled: Record<string, unknown> = {}
    vi.spyOn(TaxiClient.prototype, 'submitLockup').mockImplementation(async () => {
      journaled = JSON.parse(localStorage.getItem(journalKeys()[0])!)
      return { txid, outpoint: { txid, vout: 0 } }
    })
    const reserved = { txid: 'd'.repeat(64), vout: 0, value: 400 }
    const assetCoin = { txid: 'd'.repeat(64), vout: 1, value: 330, assets: [{ assetId: ASSET_ID, amount: 5n }] }
    const plain = { txid: 'd'.repeat(64), vout: 2, value: 1_000 }
    vi.spyOn(assetSwapRepository, 'getAllSwaps').mockResolvedValue([
      { fundingIntent: { state: 'prepared', inputs: [{ txid: reserved.txid, vout: reserved.vout }] } },
    ] as never)
    const confirmPayment = vi.fn(async () => true)
    const coins = async () => [reserved, assetCoin, plain]
    await expect(
      send({ wallet: { identity: wallet.identity, getSpendableVtxos: coins }, confirmPayment }),
    ).resolves.toBe(txid)
    const [[args]] = quote.mock.calls
    expect(args).toMatchObject({
      selectedVtxos: [plain],
      paymentSats: 100n,
      fareId: 'sats',
      claimMode: 'recycle',
      expect: { maxTopupSats: 230n, maxFare: { currency: 'sats', units: 0n }, recoveryRecipient: 'sender' },
    })
    expect(args).not.toHaveProperty('assetId')
    expect(args).not.toHaveProperty('assetUnits')
    expect(confirmPayment).toHaveBeenCalledWith({
      mode: 'recycle',
      assetAmount: 100n,
      fareCurrency: 'sats',
      fareUnits: 0n,
      carrierSats: 230n,
    })
    expect(journaled).toMatchObject({
      assetAmount: '100',
      attempt: { kind: 'covenant', carrierCeiling: '230', maxFare: { currency: 'sats', units: '0' } },
    })
    expect(journaled).not.toHaveProperty('assetId')
  })

  it.each([false, true])(
    'funds a bitcoin payment from asset coins without losing holdings (aggregate: %s)',
    async (aggregate) => {
      const { arkTx, txid } = lockup()
      vi.stubGlobal('fetch', taxiFetch({ info: BITCOIN_INFO, statuses: [locked(txid)] }))
      const quote = vi.spyOn(TaxiClient.prototype, 'requestVerifiedQuote').mockResolvedValue({
        verified: {
          quote: {
            transferId: 't-1',
            params: { topup: '320' },
            fare: { currency: 'sats', units: '0' },
            expiresAt: Date.now() / 1000 + 600,
          },
          params: { operatorKey: hex.decode(KEYS.operator), topup: 320n },
          envelope: { arkTx, covenantOutputIndex: 0 },
        },
        senderInputs: [],
      } as never)
      vi.spyOn(TaxiClient.prototype, 'submitLockup').mockResolvedValue({ txid, outpoint: { txid, vout: 0 } })
      const usdt = { txid: 'd'.repeat(64), vout: 0, value: 330, assets: [{ assetId: ASSET_ID, amount: 3861n }] }
      const aas = {
        txid: 'd'.repeat(64),
        vout: 1,
        value: aggregate ? 330 : 660,
        assets: [{ assetId: 'f'.repeat(64) + '0000', amount: 1n }],
      }
      const reserved = { txid: 'd'.repeat(64), vout: 2, value: 1_000, assets: [{ assetId: ASSET_ID, amount: 100n }] }
      vi.spyOn(assetSwapRepository, 'getAllSwaps').mockResolvedValue([
        { fundingIntent: { state: 'prepared', inputs: [{ txid: reserved.txid, vout: reserved.vout }] } },
      ] as never)
      await expect(
        send({
          wallet: { identity: wallet.identity, getSpendableVtxos: async () => [usdt, aas, reserved] },
          amount: 10n,
        }),
      ).resolves.toBe(txid)
      expect(quote.mock.lastCall![0]).toMatchObject({
        selectedVtxos: aggregate ? [usdt, aas] : [aas],
        paymentSats: 10n,
        fareId: 'sats',
        expect: { maxTopupSats: 320n, maxFare: { currency: 'sats', units: 0n }, recoveryRecipient: 'sender' },
      })
      expect(quote.mock.lastCall![0].selectedVtxos).not.toContain(reserved)
      expect(quote.mock.lastCall![0]).not.toHaveProperty('assetId')
    },
  )

  it.each(['purchase', 'sponsored'])('refuses %s instead of increasing the receiver payment to dust', async (mode) => {
    const info = {
      ...BITCOIN_INFO,
      assetRules: BITCOIN_INFO.assetRules.map((rule) => (rule.assetId === null ? { ...rule, claim: 'either' } : rule)),
    }
    const fetch = taxiFetch({ info })
    vi.stubGlobal('fetch', fetch)
    await expect(send({ wallet, mode })).rejects.toThrow('Only recycle preserves an exact sub-dust amount')
    expect(posts(fetch)).toHaveLength(0)
    expect(journalKeys()).toEqual([])
  })

  it('resumes a stored payment the Taxi never received, bound again to its exact amount', async () => {
    const { arkTx, txid } = lockup()
    const quoted = { transferId: 't-1', state: 'quoted', updatedAt: 1 }
    vi.stubGlobal('fetch', taxiFetch({ info: BITCOIN_INFO, statuses: [quoted, locked(txid)] }))
    vi.mocked(verifyQuote).mockReturnValueOnce({
      quote: { transferId: 't-1' },
      envelope: { arkTx, covenantOutputIndex: 0 },
    } as never)
    const submit = vi
      .spyOn(TaxiClient.prototype, 'submitLockup')
      .mockResolvedValue({ txid, outpoint: { txid, vout: 0 } })
    const payment = await storedPayment({
      assetId: undefined,
      assetAmount: '100',
      expectedTxid: txid,
      attempt: {
        kind: 'covenant',
        signed: 'signed',
        senderInputs: [],
        serverKey: KEYS.server,
        emulatorKey: KEYS.emulator,
        serverUnrollScript: '',
        hrp: 'tark',
        vtxoMinAmount: '1',
        carrierCeiling: '230',
        maxFare: { currency: 'sats', units: '0' },
        quote: { transferId: 't-1', params: { topup: '230' }, fare: { currency: 'sats', units: '0' } },
        minLocktime: '0',
      },
    })
    await expect(payment.resume()).resolves.toBe(txid)
    const [args] = vi.mocked(verifyQuote).mock.lastCall!
    expect(args.expect).toMatchObject({
      paymentSats: 100n,
      maxTopupSats: 230n,
      maxFare: { currency: 'sats', units: 0n },
    })
    expect(args.expect.assetId).toBeUndefined()
    expect(args).not.toHaveProperty('assetUnits')
    expect(submit).toHaveBeenCalledWith(expect.anything(), 'signed')
  })
})

describe('selectSatsForTaxi', () => {
  const plain = (value: number, vout: number) => ({ txid: 'c'.repeat(64), vout, value })

  it('prefers plain coins covering the amount, smallest first', () => {
    const assetCoin = { ...plain(50, 9), assets: [{ assetId: ASSET_ID, amount: 1n }] }
    expect(selectSatsForTaxi([plain(2_000, 1), assetCoin, plain(500, 2)], 100n, 1n, 330n)).toEqual([plain(500, 2)])
    expect(selectSatsForTaxi([plain(60, 1), plain(2_000, 2), plain(50, 3)], 100n, 1n, 330n)).toEqual([
      plain(50, 3),
      plain(60, 1),
    ])
  })

  it('leaves change of nothing or at least the Arkade minimum, taking another coin if it must', () => {
    expect(selectSatsForTaxi([plain(100, 1), plain(500, 2)], 100n, 10n, 330n)).toEqual([plain(100, 1)])
    expect(selectSatsForTaxi([plain(105, 1), plain(2_000, 2)], 100n, 10n, 330n)).toEqual([
      plain(105, 1),
      plain(2_000, 2),
    ])
    expect(() => selectSatsForTaxi([plain(105, 1)], 100n, 10n, 330n)).toThrow('Insufficient sats for this Taxi payment')
  })

  it('uses a larger asset coin while preserving a dust-sized sender change', () => {
    const usdt = { ...plain(330, 1), assets: [{ assetId: ASSET_ID, amount: 3861n }] }
    const aas = { ...plain(660, 2), assets: [{ assetId: 'f'.repeat(64) + '0000', amount: 1n }] }
    expect(selectSatsForTaxi([usdt, aas], 10n, 1n, 330n)).toEqual([aas])
    expect(aas.value - 10).toBe(650)
    expect(aas.assets).toEqual([{ assetId: 'f'.repeat(64) + '0000', amount: 1n }])
  })

  it('combines multiple asset coins into one spendable change when a single coin cannot cover it', () => {
    const usdt = { ...plain(330, 1), assets: [{ assetId: ASSET_ID, amount: 3861n }] }
    const aas = { ...plain(660, 2), assets: [{ assetId: 'f'.repeat(64) + '0000', amount: 1n }] }
    const selected = selectSatsForTaxi([usdt, aas], 650n, 1n, 330n)
    expect(selected).toEqual([usdt, aas])
    expect(selected.reduce((sum, coin) => sum + BigInt(coin.value), 0n) - 650n).toBe(340n)
    expect(selected.flatMap((coin) => coin.assets)).toEqual([...usdt.assets, ...aas.assets])
  })

  it('combines plain sats with asset funding but keeps plain-only funding preferred', () => {
    const plainCoin = plain(5, 1)
    const assetCoin = { ...plain(335, 2), assets: [{ assetId: ASSET_ID, amount: 5n }] }
    expect(selectSatsForTaxi([plainCoin, assetCoin], 10n, 1n, 330n)).toEqual([plainCoin, assetCoin])
    expect(selectSatsForTaxi([assetCoin, plain(1_000, 3)], 10n, 1n, 330n)).toEqual([plain(1_000, 3)])
  })

  it.each([10n, 330n])('does not sweep asset change or consume the asset carrier entirely at %s sats', (required) => {
    const assetCoin = { ...plain(330, 1), assets: [{ assetId: ASSET_ID, amount: 5n }] }
    expect(() => selectSatsForTaxi([assetCoin], required, 1n, 330n)).toThrow('spendable asset change')
  })

  it('keeps asset change at the greater of dust and the Arkade output minimum', () => {
    const assetCoin = { ...plain(660, 1), assets: [{ assetId: ASSET_ID, amount: 5n }] }
    expect(() => selectSatsForTaxi([assetCoin], 10n, 700n, 330n)).toThrow('spendable asset change')
  })

  it('refuses coins that cannot cover the amount', () => {
    expect(() => selectSatsForTaxi([plain(99, 1)], 100n, 1n, 330n)).toThrow('Insufficient sats for this Taxi payment')
  })
})
