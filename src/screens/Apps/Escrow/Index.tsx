import { useContext, useEffect, useMemo, useState } from 'react'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils'
import { hashes } from '@noble/secp256k1'
import { sha256 } from '@noble/hashes/sha2.js'
import { Transaction } from '@scure/btc-signer'

import Header from '../../../components/Header'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { ArkadeIdentityHandlers, ArkadeIframeHost } from './ArkadeIframeHost'
import { WalletContext } from '../../../providers/wallet'
import { FlowContext } from '../../../providers/flow'
import { Network } from '@arkade-os/boltz-swap'
import { AspContext } from '../../../providers/asp'

// Needed to sign the message, perhaps to be lifted up int App structure?
hashes.sha256 = sha256

const BASE_URLS: Record<Network, string | null> = {
  bitcoin: import.meta.env.VITE_ARK_ESCROW_URL ?? null,
  mutinynet: 'https://api.escrow.mutinynet.arkade.sh/client/',
  signet: null,
  regtest: 'http://localhost:3002/client',
}

export default function AppEscrow() {
  const { navigate } = useContext(NavigationContext)
  const { svcWallet } = useContext(WalletContext)
  const { setSendInfo } = useContext(FlowContext)
  const { aspInfo } = useContext(AspContext)

  const [escrowAppUrl, setEscrowAppUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!aspInfo.network || !svcWallet) return
    const baseUrl = BASE_URLS[aspInfo.network as Network]
    if (!baseUrl) return // No escrow app for this network
    setEscrowAppUrl(baseUrl)
  }, [aspInfo])

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
  async function fundAddress(address: string, amount: number): Promise<void> {
    setSendInfo({
      arkAddress: address,
      satoshis: amount,
      text: 'Funding escrow address',
      address: undefined,
      invoice: undefined,
      lnUrl: undefined,
      pendingSwap: undefined,
    })
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
    [svcWallet, navigate, setSendInfo],
  )

  return (
    <>
      <Header text='Escrow on Ark' back={() => navigate(Pages.Apps)} />
      {escrowAppUrl !== null && (
        <ArkadeIframeHost src={escrowAppUrl} allowedChildOrigins={[new URL(escrowAppUrl).origin]} handlers={handlers} />
      )}
    </>
  )
}
