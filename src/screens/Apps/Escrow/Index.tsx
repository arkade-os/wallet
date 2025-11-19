import { useContext, useEffect, useState } from 'react'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js'
import { hashes } from '@noble/secp256k1'
import { sha256 } from '@noble/hashes/sha2.js'
import { Transaction } from '@scure/btc-signer'

import Header from '../../../components/Header'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { ArkadeIframeHost } from './ArkadeIframeHost'
import { WalletContext } from '../../../providers/wallet'
import { FlowContext } from '../../../providers/flow'
import { Network } from '@arkade-os/boltz-swap'
import { AspContext } from '../../../providers/asp'
import { base64 } from '@scure/base'
import makeMessageHandler from './RpcHandler'

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
  }, [aspInfo, svcWallet])

  async function getXOnlyPublicKey() {
    const xpubkey = await svcWallet?.identity.xOnlyPublicKey()
    return xpubkey ?? null
  }

  async function getArkWalletAddress() {
    return svcWallet?.getAddress()
  }

  async function getArkWalletBalance() {
    return svcWallet?.getBalance()
  }

  async function signArkTransaction(base64Tx: string, base64Checkpoints: string[]) {
    if (!svcWallet) throw new Error('Wallet not initialized')
    const tx = Transaction.fromPSBT(base64.decode(base64Tx), { allowUnknown: true })
    const checkpoints = base64Checkpoints.map((_) => base64.decode(_))
    const signedTx = await svcWallet.identity.sign(tx)
    const signedCheckpoints = await Promise.all(
      checkpoints.map(async (cp) => {
        const signed = await svcWallet.identity.sign(Transaction.fromPSBT(cp, { allowUnknown: true }), [0])
        return base64.encode(signed.toPSBT())
      }),
    )
    return {
      signedTx: base64.encode(signedTx.toPSBT()),
      signedCheckpoints,
    }
  }
  async function signLoginChallenge(hexToSign: string) {
    if (!svcWallet) throw new Error('Wallet not initialized')
    const signatureBytes = await svcWallet.identity.signMessage(hexToBytes(hexToSign), 'schnorr')
    return bytesToHex(signatureBytes)
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

  const handlers = useMemo(
    () =>
      makeMessageHandler({
        getXOnlyPublicKey,
        signLoginChallenge,
        getArkWalletAddress,
        getArkWalletBalance,
        signArkTransaction,
        fundAddress,
      }),
    [svcWallet, navigate, setSendInfo],
  )

  const allowedOrigins = Object.values(BASE_URLS)
    .filter((_) => _ !== null)
    .map((url) => new URL(url).origin)

  return (
    <>
      <Header text='Escrow on Ark' back={() => navigate(Pages.Apps)} />
      {escrowAppUrl !== null && (
        <ArkadeIframeHost src={escrowAppUrl} allowedChildOrigins={allowedOrigins} messageHandler={handlers} />
      )}
    </>
  )
}
