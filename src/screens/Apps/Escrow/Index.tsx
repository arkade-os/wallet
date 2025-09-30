import { useContext, useMemo, useState } from 'react'
import Header from '../../../components/Header'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { ArkadeIdentityHandlers, ArkadeIframeHost } from './ArkadeIframeHost'
import { WalletContext } from '../../../providers/wallet'
import { getPrivateKey } from '../../../lib/privateKey'
import { schnorr } from '@noble/curves/secp256k1'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils'

export default function AppEscrow() {
  // const { signin, signout, isSignedIn } = useContext(EscrowContext)
  const { navigate } = useContext(NavigationContext)
  const { svcWallet } = useContext(WalletContext)

  const [isSignedIn, setIsSignedIn] = useState(false)

  const performSignIn = async () => {
    const password = prompt('Enter your password')
    console.log('got the password!', password)

    if (password) {
      try {
        console.log('sing igg!', password)

        // await signin(password)
      } catch (err) {
        console.error(err)
        alert('Invalid password')
      }
    }
  }

  async function xOnlyPublicKey() {
    return svcWallet?.xOnlyPublicKey() ?? null
  }

  async function sign(tx: unknown, inputIndexes?: number[]) {
    throw new Error('Not implemented')
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

  const handlers: ArkadeIdentityHandlers = useMemo(
    () => ({
      sign,
      signerSession,
      signin,
      signout,
      xOnlyPublicKey,
    }),
    [],
  )

  return (
    <>
      <Header
        // auxFunc={() => navigate(Pages.AppBoltzSettings)}
        // auxIcon={<SettingsIconLight />}
        text='Escrow on Ark'
        back={() => navigate(Pages.Apps)}
      />
      <ArkadeIframeHost
        src='http://localhost:3001/'
        allowedChildOrigins={['http://localhost:3001']}
        handlers={handlers}
      />
    </>
  )
}
