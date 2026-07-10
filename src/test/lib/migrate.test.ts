import { describe, expect, it } from 'vitest'
import { hex } from '@scure/base'
import * as secp from '@noble/secp256k1'
import { computeNewWalletAddress } from '../../lib/migrate'
import { decodeArkAddress, isArkAddress } from '../../lib/address'
import { AspInfo } from '../../providers/asp'

const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const otherMnemonic = 'legal winner thank year wave sausage worth useful legal winner thank yellow'

const signerPubkey = hex.encode(secp.getPublicKey(new Uint8Array(32).fill(5), true))

const aspInfo = (network: string): AspInfo =>
  ({
    signerPubkey,
    unilateralExitDelay: BigInt(144),
    network,
    unreachable: false,
  }) as unknown as AspInfo

describe('computeNewWalletAddress (seed→passkey migration)', () => {
  it('produces a valid tark address on test networks', async () => {
    const address = await computeNewWalletAddress(testMnemonic, aspInfo('mutinynet'), false)
    expect(address.startsWith('tark1')).toBe(true)
    expect(isArkAddress(address)).toBe(true)
    // encodes the server signer key the active wallet would use
    expect(decodeArkAddress(address).serverPubKey).toBe(signerPubkey.slice(2))
  })

  it('produces a valid ark address on mainnet', async () => {
    const address = await computeNewWalletAddress(testMnemonic, aspInfo('bitcoin'), false)
    expect(address.startsWith('ark1')).toBe(true)
    expect(isArkAddress(address)).toBe(true)
  })

  it('is deterministic per mnemonic and differs across mnemonics and networks', async () => {
    const a1 = await computeNewWalletAddress(testMnemonic, aspInfo('mutinynet'), false)
    const a2 = await computeNewWalletAddress(testMnemonic, aspInfo('mutinynet'), false)
    const b = await computeNewWalletAddress(otherMnemonic, aspInfo('mutinynet'), false)
    const main = await computeNewWalletAddress(testMnemonic, aspInfo('bitcoin'), false)
    expect(a1).toBe(a2)
    expect(a1).not.toBe(b)
    expect(a1).not.toBe(main)
  })

  it('refuses to compute without server info', async () => {
    const bad = { ...aspInfo('mutinynet'), signerPubkey: '' } as AspInfo
    await expect(computeNewWalletAddress(testMnemonic, bad, false)).rejects.toThrow('server info unavailable')
  })
})
