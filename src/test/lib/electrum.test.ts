import { afterEach, describe, expect, it, vi } from 'vitest'

const { ElectrumWS } = vi.hoisted(() => ({ ElectrumWS: vi.fn() }))
vi.mock('ws-electrumx-client', () => ({ ElectrumWS }))

import {
  ELECTRUM_WS_URL,
  InMemoryContractRepository,
  InMemoryWalletRepository,
  MessageBus,
  ReadonlyWallet,
  RestArkProvider,
  Wallet,
} from '@arkade-os/sdk'
import { electrumProvider } from '../../lib/electrum'

afterEach(() => vi.unstubAllGlobals())

describe('electrumProvider', () => {
  it('opens one connection per network, however often the worker re-inits', () => {
    expect(electrumProvider('regtest')).toBe(electrumProvider('regtest'))
    expect(electrumProvider('mutinynet')).not.toBe(electrumProvider('regtest'))
    expect(ElectrumWS.mock.calls).toEqual([[ELECTRUM_WS_URL.regtest], [ELECTRUM_WS_URL.mutinynet]])
  })

  it.each(['single-key', 'readonly-single-key'] as const)(
    'keeps the Electrum provider across worker reinitialization with a %s identity',
    async (type) => {
      const addEventListener = vi.fn()
      vi.stubGlobal('self', { addEventListener, removeEventListener: vi.fn(), setTimeout, clearTimeout })
      vi.spyOn(RestArkProvider.prototype, 'getInfo').mockResolvedValue({ network: 'regtest' } as Awaited<
        ReturnType<RestArkProvider['getInfo']>
      >)
      const createWallet = vi.spyOn(Wallet, 'create').mockResolvedValue({} as Wallet)
      const createReadonlyWallet = vi.spyOn(ReadonlyWallet, 'create').mockResolvedValue({} as ReadonlyWallet)
      const bus = new MessageBus(new InMemoryWalletRepository(), new InMemoryContractRepository(), {
        messageHandlers: [],
        onchainProvider: electrumProvider,
      })
      await bus.start()
      try {
        const onMessage = addEventListener.mock.calls.find(([event]) => event === 'message')![1]
        const source = { postMessage: vi.fn() }
        const config = {
          arkServer: { url: 'http://localhost:7070' },
          wallet:
            type === 'single-key'
              ? { type, privateKey: '01'.repeat(32) }
              : { type, publicKey: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798' },
          delegateeUrl: 'http://localhost:7280',
          lazyInitialization: true,
        }
        for (const id of ['init', 'restart']) {
          await onMessage({ data: { id, tag: 'INITIALIZE_MESSAGE_BUS', config }, source })
          expect(source.postMessage).toHaveBeenLastCalledWith({ id, tag: 'INITIALIZE_MESSAGE_BUS' })
        }
        const factory = type === 'single-key' ? createWallet : createReadonlyWallet
        expect(factory).toHaveBeenCalledTimes(2)
        for (const [options] of factory.mock.calls) {
          expect(options).toEqual(
            expect.objectContaining({
              onchainProvider: electrumProvider('regtest'),
              lazyInitialization: true,
              delegateeProvider: expect.anything(),
            }),
          )
        }
      } finally {
        await bus.stop()
      }
    },
  )
})
