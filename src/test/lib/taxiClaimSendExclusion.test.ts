import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  InMemoryBatchRegistrationRepository,
  InMemoryContractRepository,
  InMemoryWalletRepository,
  ProviderUnavailableError,
  SingleKey,
  Wallet,
  type ArkadeInfo,
  type ExtendedVirtualCoin,
  type IndexerProvider,
  type OnchainProvider,
  type OperatorProvider,
  type Outpoint,
  type VtxoReservationRepository,
} from '@arkade-os/sdk'
import type { RecyclePlan, VerifiedClaim } from '@arkade-taxi/client/wallet'
import { sendOffChain } from '../../lib/asp'
import { reconcileTaxiInputReservations, reserveTaxiClaim } from '../../lib/taxiInputReservations'

const SERVER_KEY = '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
const SERVER = 'http://arkd.test'
const HOUR = 3_600_000
const key = ({ txid, vout }: Outpoint) => `${txid}:${vout}`

const arkInfo = (): ArkadeInfo => ({
  boardingExitDelay: 144n,
  checkpointTapscript: '039d0440b2752079be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ac',
  deprecatedSigners: [],
  digest: 'd',
  dust: 1000n,
  fees: { intentFee: {}, txFeeRate: '0' },
  forfeitAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
  forfeitPubkey: SERVER_KEY,
  network: 'mutinynet',
  serviceStatus: {},
  sessionDuration: 3600n,
  signerPubkey: SERVER_KEY,
  unilateralExitDelay: 144n,
  utxoMaxAmount: -1n,
  utxoMinAmount: 0n,
  version: '1',
  vtxoMaxAmount: -1n,
  vtxoMinAmount: 0n,
})

// The worker keeps these holds on IndexedDB; the SDK ships no in-memory store with the same contract.
const reservationStore = (): VtxoReservationRepository => {
  const rows = new Map<string, Outpoint[]>()
  const same = (a: readonly Outpoint[], b: readonly Outpoint[]) => a.map(key).sort().join() === b.map(key).sort().join()
  return {
    version: 2,
    getReservations: async () => [...rows].map(([id, outpoints]) => ({ id, outpoints })),
    saveReservation: async ({ id, outpoints }) => void rows.set(id, outpoints),
    deleteReservation: async (id) => void rows.delete(id),
    deleteReservationIfMatches: async (id, expected) => same(rows.get(id) ?? [], expected) && rows.delete(id),
  }
}

/** The worker's wallet: durable holds, no concurrentSpending. Three 10,000-sat coins on its own script. */
async function fundedWallet(intentRepository = new InMemoryBatchRegistrationRepository()) {
  const walletRepository = new InMemoryWalletRepository()
  const wallet = await Wallet.create({
    identity: SingleKey.fromHex('ce66c68f8875c0c98a502c666303dc183a21600130013c06f9d1edf60207abf2'),
    arkProvider: { getInfo: async () => arkInfo() } as Partial<OperatorProvider> as OperatorProvider,
    indexerProvider: {
      getVtxos: async () => {
        throw new ProviderUnavailableError('operator down')
      },
      subscribeForScripts: async () => 'sub-1',
      unsubscribeForScripts: async () => undefined,
      getSubscription: async function* () {},
    } as Partial<IndexerProvider> as IndexerProvider,
    onchainProvider: {
      getCoins: async () => [],
      getTransactions: async () => [],
      getTxOutspends: async () => [],
      getChainTip: async () => ({ height: 1_000, hash: '00'.repeat(32), time: 0 }),
    } as Partial<OnchainProvider> as OnchainProvider,
    storage: {
      walletRepository,
      contractRepository: new InMemoryContractRepository(),
      intentRepository,
      vtxoReservationRepository: reservationStore(),
    },
    settlementConfig: false,
  })
  const coins = ['aa', 'bb', 'cc'].map(
    (fill, i) =>
      ({
        txid: fill.repeat(32),
        vout: 0,
        value: 10_000,
        status: { confirmed: true },
        createdAt: new Date(),
        isUnrolled: false,
        isSpent: false,
        isSwept: false,
        isPreconfirmed: false,
        commitmentTxIds: [],
        spentBy: '',
        expiresAt: new Date(Date.now() + (i + 1) * 10 * HOUR),
        script: wallet.defaultContractScript,
        forfeitTapLeafScript: [new Uint8Array(32), new Uint8Array(33)],
        proofTapLeafScript: [new Uint8Array(32), new Uint8Array(34)],
        tapTree: new Uint8Array(64),
      }) as unknown as ExtendedVirtualCoin,
  )
  const to = await wallet.getAddress()
  await walletRepository.saveVtxos(to, coins)
  // Parks the signing-and-network tail, below every exclusion check, as the SDK's own concurrency suite does.
  const submits: { inputs: string[]; finish: () => void }[] = []
  const tail = wallet as unknown as { _buildAndSubmitOffchainTx: (inputs: Outpoint[]) => Promise<unknown> }
  vi.spyOn(tail, '_buildAndSubmitOffchainTx').mockImplementation(
    (inputs) =>
      new Promise((resolve) => {
        const arkTxid = String(submits.length + 1).repeat(64)
        submits.push({ inputs: inputs.map(key), finish: () => resolve({ arkTxid, signedCheckpointTxs: [] }) })
      }),
  )
  return { wallet, coins, submits, to }
}

const offer = {
  taxi: { url: 'https://taxi.test' },
  claim: { transferId: 'delivery', claim: { outpoint: { txid: 'dd'.repeat(32), vout: 0 } } },
} as unknown as VerifiedClaim
const asReservationWallet = (wallet: Wallet) => wallet as unknown as Parameters<typeof reserveTaxiClaim>[0]
const claim = (wallet: Wallet, coin: ExtendedVirtualCoin) =>
  reserveTaxiClaim(asReservationWallet(wallet), 'regtest', SERVER, offer, { kind: 'recycle', coin } as RecyclePlan)

describe('a Taxi recycle claim and an ordinary send never select the same coin', () => {
  beforeEach(() => localStorage.clear())

  it('keeps a send off the coin a claim holds', async () => {
    const control = await fundedWallet()
    const unheld = sendOffChain(control.wallet, 2_000, control.to)
    await vi.waitFor(() => expect(control.submits).toHaveLength(1))
    const [picked] = control.submits[0].inputs
    control.submits[0].finish()
    await unheld
    await control.wallet.dispose()

    const { wallet, coins, submits, to } = await fundedWallet()
    await claim(wallet, coins.find((coin) => key(coin) === picked)!)
    await expect(sendOffChain(wallet, 25_000, to)).rejects.toThrow()
    expect(submits).toHaveLength(0)
    const sending = sendOffChain(wallet, 2_000, to)
    await vi.waitFor(() => expect(submits).toHaveLength(1))
    expect(submits[0].inputs).not.toContain(picked)
    submits[0].finish()
    await sending
    await wallet.dispose()
  })

  it('refuses a claim on the coin a send is submitting, and leaves no hold behind', async () => {
    const { wallet, coins, submits, to } = await fundedWallet()
    const sending = sendOffChain(wallet, 2_000, to)
    await vi.waitFor(() => expect(submits).toHaveLength(1))
    const coin = coins.find((candidate) => key(candidate) === submits[0].inputs[0])!
    await expect(claim(wallet, coin)).rejects.toMatchObject({ name: 'VtxoReservedError', holder: 'in-flight' })
    submits[0].finish()
    await sending
    await reconcileTaxiInputReservations(asReservationWallet(wallet), 'regtest', SERVER)
    expect(localStorage.length).toBe(0)
    expect(wallet.isVtxoReserved(coin)).toBe(false)
    expect(submits).toHaveLength(1)
    await wallet.dispose()
  })

  it('refuses a send whose picked coin a claim holds before the send marks it', async () => {
    const intents = new InMemoryBatchRegistrationRepository()
    const { wallet, coins, submits, to } = await fundedWallet(intents)
    let open!: () => void
    const gate = new Promise<void>((resolve) => (open = resolve))
    const tail = wallet as unknown as { _submitOffchainSpend: (inputs: Outpoint[], ...rest: unknown[]) => unknown }
    const submit = tail._submitOffchainSpend.bind(wallet)
    const picked = new Promise<Outpoint>((resolve) =>
      vi.spyOn(tail, '_submitOffchainSpend').mockImplementation((inputs, ...rest) => {
        const read = intents.getLockedVtxoOutpoints.bind(intents)
        vi.spyOn(intents, 'getLockedVtxoOutpoints').mockImplementation(() => gate.then(read))
        resolve(inputs[0])
        return submit(inputs, ...rest)
      }),
    )
    const sending = sendOffChain(wallet, 2_000, to)
    const selected = key(await picked)
    const coin = coins.find((candidate) => key(candidate) === selected)!
    const claiming = claim(wallet, coin)
    await vi.waitFor(() => expect(wallet.isVtxoReserved(coin)).toBe(true))
    open()
    await expect(sending).rejects.toMatchObject({ name: 'VtxoReservedError', holder: 'held' })
    await claiming
    expect(submits).toHaveLength(0)
    await wallet.dispose()
  })
})
