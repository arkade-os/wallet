import { useContext, useState } from 'react'
import { BIP322, getNetwork, type NetworkName } from '@arkade-os/sdk'
import { p2tr } from '@scure/btc-signer'
import { WalletContext } from '../../providers/wallet'
import Header from './Header'
import Content from '../../components/Content'
import Padded from '../../components/Padded'
import FlexCol from '../../components/FlexCol'
import Text from '../../components/Text'
import Button from '../../components/Button'
import ErrorMessage from '../../components/Error'
import NativeWalletBackup from '../../components/NativeWalletBackup'
import NativeCardConnectSheet from '../../components/NativeCardConnectSheet'
import { canRequestNativeSigning } from '../../lib/nativeSignerAvailability'

export default function HardwareBackup() {
  const { wallet, svcWallet } = useContext(WalletContext)
  const [checking, setChecking] = useState(false)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState('')
  const [cardSheetOpen, setCardSheetOpen] = useState(false)

  const verifyCard = async () => {
    if (!svcWallet || checking) return
    if (!canRequestNativeSigning(wallet.pubkey)) {
      setCardSheetOpen(true)
      return
    }
    setChecking(true)
    setVerified(false)
    setError('')
    try {
      const network = getNetwork(wallet.network as NetworkName)
      const message = 'Arkade Satochip native signer check'
      const address = p2tr(await svcWallet.identity.xOnlyPublicKey(), undefined, network).address!
      const proof = await BIP322.sign(message, svcWallet.identity, network)
      if (!BIP322.verify(message, proof, address, network)) throw new Error('Card signature verification failed')
      setVerified(true)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to verify the card signature')
    } finally {
      setChecking(false)
    }
  }
  return (
    <>
      <Header text='Satochip recovery' back />
      <Content>
        <Padded>
          <FlexCol gap='1rem'>
            <NativeWalletBackup />
            <Button
              label={checking ? 'Waiting for card…' : 'Verify card signing'}
              loading={checking}
              disabled={!svcWallet || checking}
              onClick={verifyCard}
            />
            <Text small color='neutral-600' wrap>
              Sign a local proof with your card. No funds are sent.
            </Text>
            <ErrorMessage error={Boolean(error)} text={error} />
            {verified ? <Text wrap>Signature verified. No transaction was broadcast.</Text> : null}
            <Text color='neutral-600' wrap>
              Keep your card’s recovery words and PIN recovery code safe. The app cannot recover or export them.
            </Text>
            <Text bold wrap>
              Back up pending payments
            </Text>
            <Text color='neutral-600' wrap>
              Save an encrypted wallet backup before resetting this app. Your card backup alone does not include pending
              swap recovery details.
            </Text>
            <Text small copy={wallet.pubkey} wrap>
              Public key: {wallet.pubkey}
            </Text>
          </FlexCol>
        </Padded>
      </Content>
      <NativeCardConnectSheet
        isOpen={cardSheetOpen}
        onClose={() => setCardSheetOpen(false)}
        onConnected={() => {
          setCardSheetOpen(false)
          setError('')
        }}
      />
    </>
  )
}
