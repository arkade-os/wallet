import { beforeEach, describe, expect, it } from 'vitest'
import { nativeWalletRecord } from '../../lib/nativeWallet'
import { MNEMONIC_STORAGE_KEY, NSEC_STORAGE_KEY } from '../../lib/storageKeys'
import type { Wallet } from '../../lib/types'

const publicKey = `02${'11'.repeat(32)}`
const connection = { publicKey, name: 'Satochip' }
const emptyWallet: Wallet = { nextRollover: 0, network: '' }

beforeEach(() => localStorage.clear())

describe('native wallet binding', () => {
  it('stores only public card metadata and the selected network', () => {
    const wallet = nativeWalletRecord(emptyWallet, connection, 'mutinynet')
    expect(wallet).toEqual({
      nextRollover: 0,
      network: 'mutinynet',
      pubkey: publicKey,
      signer: { type: 'native', name: 'Satochip', publicKey },
    })
    expect(localStorage.length).toBe(0)
    expect(nativeWalletRecord(wallet, connection, 'mutinynet')).toEqual(wallet)
  })

  it.each([MNEMONIC_STORAGE_KEY, NSEC_STORAGE_KEY])('does not overwrite software credentials in %s', (key) => {
    localStorage.setItem(key, 'existing encrypted secret')
    expect(() => nativeWalletRecord(emptyWallet, connection, 'mutinynet')).toThrow('software wallet')
    expect(localStorage.getItem(key)).toBe('existing encrypted secret')
  })

  it('requires an explicit reset before replacing a software wallet', () => {
    expect(() => nativeWalletRecord({ ...emptyWallet, pubkey: publicKey }, connection, 'mutinynet')).toThrow(
      'different wallet',
    )
  })

  it('rejects a changed card, corrupt public binding and changed network', () => {
    const wallet = nativeWalletRecord(emptyWallet, connection, 'mutinynet')
    expect(() => nativeWalletRecord(wallet, { ...connection, publicKey: `03${'22'.repeat(32)}` }, 'mutinynet')).toThrow(
      'different card',
    )
    expect(() => nativeWalletRecord({ ...wallet, pubkey: `03${'22'.repeat(32)}` }, connection, 'mutinynet')).toThrow(
      'different card',
    )
    expect(() => nativeWalletRecord(wallet, connection, 'regtest')).toThrow('another network')
  })

  it.each(['', '04' + '11'.repeat(64), '02nothex'])('rejects malformed public key %s', (publicKey) => {
    expect(() => nativeWalletRecord(emptyWallet, { ...connection, publicKey }, 'mutinynet')).toThrow('public key')
  })
})
