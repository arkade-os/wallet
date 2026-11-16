import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAssetPayment, readAssetPayment, storeAssetPayment } from '../../lib/pendingAssetPayment'
import { getPendingAssetPayment, sendDirectTaxi } from '../../lib/directTaxiSend'
import type { IWallet } from '@arkade-os/sdk'
import type { AspInfo } from '../../providers/asp'

const pending = {
  quoteId: 'quote-1',
  arkAddress: 'original-recipient',
  assetId: 'asset',
  amount: '500',
  payAmountSats: '1000',
}
const wallet = (byte: number) =>
  ({ identity: { xOnlyPublicKey: async () => new Uint8Array(32).fill(byte) } }) as IWallet
const locks = vi.fn(async (_key: string, run: () => Promise<unknown>) => run())

beforeEach(() => {
  localStorage.clear()
  locks.mockClear()
  Object.defineProperty(navigator, 'locks', { value: { request: locks }, configurable: true })
})

describe('durable pending asset payments', () => {
  it('isolates wallet identity and network when reading a pending payment', async () => {
    storeAssetPayment('01'.repeat(32), 'regtest', pending)
    expect(await getPendingAssetPayment(wallet(1), 'regtest')).toEqual(pending)
    expect(await getPendingAssetPayment(wallet(2), 'regtest')).toBeUndefined()
    expect(await getPendingAssetPayment(wallet(1), 'bitcoin')).toBeUndefined()
    expect(locks).not.toHaveBeenCalled()
  })
  it.each(['{}', 'null', '{', JSON.stringify({ ...pending, amount: '1.5' })])(
    'fails closed on corrupt state %s',
    (raw) => {
      storeAssetPayment('sender', 'network', pending)
      localStorage.setItem(localStorage.key(0)!, raw)
      expect(() => readAssetPayment('sender', 'network')).toThrow()
      expect(localStorage.getItem(localStorage.key(0)!)).toBe(raw)
    },
  )
  it('rejects silently dropped writes and cannot clear another quote', () => {
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {})
    expect(() => storeAssetPayment('sender', 'network', pending)).toThrow('Cannot retain')
    write.mockRestore()
    storeAssetPayment('sender', 'network', pending)
    expect(() => clearAssetPayment('sender', 'network', 'another')).toThrow('changed')
    expect(readAssetPayment('sender', 'network')).toEqual(pending)
  })
  it('can read pending state without Web Locks but refuses a new Taxi send', async () => {
    Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true })
    storeAssetPayment('01'.repeat(32), 'regtest', pending)
    expect(await getPendingAssetPayment(wallet(1), 'regtest')).toEqual(pending)
    await expect(
      sendDirectTaxi({
        wallet: wallet(1),
        aspInfo: { network: 'regtest' } as AspInfo,
        taxi: { url: 'https://taxi.example' },
        receiverAddress: 'new-recipient',
        assetId: 'another-asset',
        amount: 1n,
        mode: 'purchase',
        confirmPayment: async () => true,
      }),
    ).rejects.toThrow('cannot safely coordinate')
    expect(readAssetPayment('01'.repeat(32), 'regtest')).toEqual(pending)
  })
  it('refuses a new direct Taxi send using spare funds while native RFQ is unresolved', async () => {
    storeAssetPayment('01'.repeat(32), 'regtest', pending)
    await expect(
      sendDirectTaxi({
        wallet: wallet(1),
        aspInfo: { network: 'regtest' } as AspInfo,
        taxi: { url: 'https://taxi.example' },
        receiverAddress: 'new-recipient',
        assetId: 'another-asset',
        amount: 1n,
        mode: 'purchase',
        confirmPayment: async () => true,
      }),
    ).rejects.toThrow('Check asset payment')
    expect(readAssetPayment('01'.repeat(32), 'regtest')).toEqual(pending)
  })
})
