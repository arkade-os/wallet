import { useContext, useEffect, useState } from 'react'
import Padded from '../../../components/Padded'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import LoadingLogo from '../../../components/LoadingLogo'
import Text from '../../../components/Text'
import { WalletContext } from '../../../providers/wallet'
import { getReceivingAddresses } from '../../../lib/asp'
import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex } from '@noble/hashes/utils.js'
import { NavigationContext } from '../../../providers/navigation'

export default function AppDfx() {
  const { goBack } = useContext(NavigationContext)
  const { svcWallet } = useContext(WalletContext)
  const [dfxUrl, setDfxUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const authenticate = async () => {
      if (!svcWallet) return

      try {
        const { offchainAddr } = await getReceivingAddresses(svcWallet)

        const message = `By_signing_this_message,_you_confirm_that_you_are_the_sole_owner_of_the_provided_Blockchain_address._Your_ID:_${offchainAddr}`
        const messageHash = sha256(new TextEncoder().encode(message))
        const signatureBytes = await svcWallet.identity.signMessage(messageHash, 'ecdsa')
        const signature = bytesToHex(signatureBytes)

        setDfxUrl(
          `https://app.dfx.swiss/buy/?address=${encodeURIComponent(offchainAddr)}&signature=${signature}&wallet=Arkade&headless=true`,
        )
      } catch {
        setError(true)
      }
    }
    authenticate()
  }, [svcWallet])

  if (!dfxUrl && !error) return <LoadingLogo text='Connecting to DFX...' />

  return (
    <>
      <Header text='DFX' back={goBack} />
      <Content>
        <Padded>
          <FlexCol gap='2rem' between>
            {error ? (
              <Text color='neutral-800' small thin wrap centered>
                Failed to connect to DFX. Please go back and try again.
              </Text>
            ) : (
              <iframe src={dfxUrl!} title='DFX' allow='clipboard-write; clipboard-read' style={{ height: '100%' }} />
            )}
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
