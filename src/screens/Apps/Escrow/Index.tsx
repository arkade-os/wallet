import { useContext, useMemo } from 'react'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils'
import { hashes } from '@noble/secp256k1'
import { sha256 } from '@noble/hashes/sha2.js'
import { Transaction } from '@scure/btc-signer'

import Header from '../../../components/Header'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { ArkadeIdentityHandlers, ArkadeIframeHost } from './ArkadeIframeHost'
import { WalletContext } from '../../../providers/wallet'
import { FlowContext } from '../../../providers/flow'

// Needed to sign the message, perhaps to be lifted up int App structure?
hashes.sha256 = sha256

export default function AppEscrow() {
  const { navigate } = useContext(NavigationContext)

  const { svcWallet } = useContext(WalletContext)
  const { setSendInfo } = useContext(FlowContext)

  async function getXOnlyPublicKey() {
    const xpubkey = await svcWallet?.identity.xOnlyPublicKey()
    return xpubkey ?? null
  }

  async function getArkWalletAddress() {
    return svcWallet?.getAddress()
  }

  async function sign(tx: Transaction, inputIndexes?: number[]): Promise<Transaction> {
    if (!svcWallet) throw new Error('Wallet not initialized')
    return svcWallet.identity.sign(tx, inputIndexes)
  }
  async function signerSession() {
    throw new Error('Not implemented')
  }
  async function signin(hexToSign: string) {
    if (!svcWallet) throw new Error('Wallet not initialized')
    const signatureBytes = await svcWallet.identity.signMessage(hexToBytes(hexToSign), 'schnorr')
    return bytesToHex(signatureBytes)
  }
  async function signout() {
    return { ok: true }
  }
  async function fundAddress(address: string, amount: number) {
    setSendInfo({ arkAddress: address, satoshis: amount, text: 'Funding escrow address' })
    navigate(Pages.SendDetails)
  }

  const handlers: ArkadeIdentityHandlers = useMemo(
    () => ({
      sign,
      signerSession,
      signin,
      signout,
      getXOnlyPublicKey,
      getArkWalletAddress,
      fundAddress,
    }),
    [],
  )

  return (
    <>
      <Header text='Escrow on Ark' back={() => navigate(Pages.Apps)} />
      <ArkadeIframeHost
        src='http://localhost:3001/'
        allowedChildOrigins={['http://localhost:3001']}
        handlers={handlers}
      />
    </>
  )
}
