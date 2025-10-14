import { useContext, useMemo } from 'react'
import Header from '../../../components/Header'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { ArkadeIdentityHandlers, ArkadeIframeHost } from './ArkadeIframeHost'
import { WalletContext } from '../../../providers/wallet'
import { getPrivateKey } from '../../../lib/privateKey'
import { schnorr } from '@noble/curves/secp256k1'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils'
import { Transaction } from '@scure/btc-signer'
import { FlowContext } from '../../../providers/flow'

export default function AppEscrow() {
  const { navigate } = useContext(NavigationContext)

  const { svcWallet, wallet } = useContext(WalletContext)
  const { setSendInfo } = useContext(FlowContext)

  async function getXOnlyPublicKey() {
    return svcWallet?.identity.xOnlyPublicKey()
  }

  async function getArkWalletAddress() {
    return svcWallet?.getAddress()
  }

  async function sign(tx: Transaction, inputIndexes?: number[]): Promise<Transaction> {
    if (!svcWallet) throw new Error('Wallet not initialized')
    const signed = await svcWallet.identity.sign(tx, inputIndexes)
    return signed
  }
  async function signerSession() {
    throw new Error('Not implemented')
  }
  async function signin(hexToSign: string) {
    const password = prompt('Password')
    if (!password) throw new Error('Wrong password')
    const privkey = await getPrivateKey(password)
    const signatureBytes = schnorr.sign(hexToBytes(hexToSign), privkey)
    return bytesToHex(signatureBytes)
  }
  async function signout() {
    return { ok: true }
  }
  async function fundAddress(address: string, amount: number) {
    setSendInfo({ arkAddress: address, satoshis: amount, text: 'Funding escrow address' })
    navigate(Pages.SendDetails)
    // const walletTab = document.querySelector('ion-tab[tab="wallet"]')
    // if (walletTab) {
    //   walletTab.className = walletTab.className
    //     .split(' ')
    //     .filter((c) => c !== 'tab-hidden')
    //     .join(' ')
    // }
    return Promise.resolve()
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
