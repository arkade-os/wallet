// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import {
  InMemoryContractRepository,
  InMemoryWalletRepository,
  MnemonicIdentity,
  RestArkProvider,
  RestIndexerProvider,
  SingleKey,
} from '@arkade-os/sdk'
import { ForegroundWallet } from '../../lib/walletRuntime'

const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const serverKey = '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
afterEach(() => vi.unstubAllGlobals())

it.each(['hd', 'static'] as const)(
  'creates a real native foreground wallet with software mode %s',
  async (walletMode) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ vtxos: [], subscriptionId: 'fixture' }), {
            headers: { 'Content-Type': 'application/json' },
          }),
      ),
    )
    vi.stubGlobal(
      'EventSource',
      class {
        addEventListener() {}
        removeEventListener() {}
        close() {}
      },
    )
    const arkProvider = new RestArkProvider('http://localhost:7070')
    vi.spyOn(arkProvider, 'getInfo').mockResolvedValue({
      signerPubkey: serverKey,
      forfeitPubkey: serverKey,
      vtxoTreeExpiry: 144n,
      unilateralExitDelay: 144n,
      boardingExitDelay: 144n,
      network: 'mutinynet',
      dust: 1000n,
      forfeitAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
      checkpointTapscript: '039d0440b2752079be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ac',
      deprecatedSigners: [],
      digest: '00'.repeat(32),
      fees: {
        intentFee: { offchainInput: '0', offchainOutput: '0', onchainInput: '0', onchainOutput: '0' },
        txFeeRate: '0',
      },
      serviceStatus: {},
      sessionDuration: 60n,
      utxoMaxAmount: -1n,
      utxoMinAmount: 1000n,
      vtxoMaxAmount: -1n,
      vtxoMinAmount: 1000n,
      version: '0.0.0-fixture',
    })
    const indexerProvider = new RestIndexerProvider('http://localhost:7070')
    const wallet = await ForegroundWallet.create({
      identity:
        walletMode === 'hd'
          ? MnemonicIdentity.fromMnemonic(mnemonic, { isMainnet: false })
          : SingleKey.fromPrivateKey(new Uint8Array(32).fill(7)),
      walletMode,
      arkProvider,
      indexerProvider,
      lazyInitialization: true,
      settlementConfig: false,
      storage: {
        walletRepository: new InMemoryWalletRepository(),
        contractRepository: new InMemoryContractRepository(),
      },
    })
    try {
      expect(wallet).toBeInstanceOf(ForegroundWallet)
      expect((await wallet.getAddress()).startsWith('tark1')).toBe(true)
      if (walletMode === 'hd') {
        expect(await wallet.getCurrentSigningDescriptor()).toMatch(/\/0\/0\)$/)
        expect(await wallet.getUsedSigningDescriptors()).toHaveLength(1)
      } else expect(await wallet.getCurrentSigningDescriptor()).toBeUndefined()
    } finally {
      await wallet.clear()
    }
  },
)
