import type { NetworkName } from '@arkade-os/sdk'
import { MNEMONIC_STORAGE_KEY, NSEC_STORAGE_KEY } from './storageKeys'
import type { Wallet } from './types'
import { hasSecret } from './secretStore'

export const isNativeWallet = (wallet: Wallet): boolean => wallet.signer?.type === 'native'
export const supportsServerLnurl = (wallet: Wallet): boolean => !isNativeWallet(wallet)

export function assertNativeWalletAvailable(wallet: Wallet): void {
  if (hasSecret(MNEMONIC_STORAGE_KEY) || hasSecret(NSEC_STORAGE_KEY))
    throw new Error('A software wallet is stored here. Reset it explicitly before connecting a card.')
  if (wallet.pubkey && !isNativeWallet(wallet))
    throw new Error('A different wallet is stored here. Reset it explicitly before connecting a card.')
}

export function nativeWalletRecord(
  wallet: Wallet,
  connection: { publicKey: string; name: string },
  network: NetworkName,
): Wallet {
  if (!/^(02|03)[0-9a-f]{64}$/i.test(connection.publicKey)) throw new Error('Invalid card public key')
  assertNativeWalletAvailable(wallet)
  if (isNativeWallet(wallet)) {
    if (wallet.signer?.publicKey !== wallet.pubkey || wallet.pubkey !== connection.publicKey)
      throw new Error('This is a different card. Reconnect the Satochip used by this wallet.')
    if (wallet.network && wallet.network !== network)
      throw new Error('This wallet belongs to another network. Switch back before reconnecting the card.')
  }
  return {
    ...wallet,
    network,
    pubkey: connection.publicKey,
    signer: { type: 'native', name: connection.name, publicKey: connection.publicKey },
  }
}
