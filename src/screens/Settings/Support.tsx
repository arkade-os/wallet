import { useContext, useEffect, useState } from 'react'
import { useIonToast } from '@ionic/react'
import Header from './Header'
import Content from '../../components/Content'
import Padded from '../../components/Padded'
import FlexCol from '../../components/FlexCol'
import Text, { TextSecondary } from '../../components/Text'
import Button from '../../components/Button'
import { getChatwootConfig, useChatwoot } from '../../lib/chatwoot'
import { WalletContext } from '../../providers/wallet'
import { ConfigContext } from '../../providers/config'
import { AspContext } from '../../providers/asp'
import { LightningContext } from '../../providers/lightning'
import SupportIcon from '../../icons/Support'
import Info from '../../components/Info'
import { getReceivingAddresses } from '../../lib/asp'
import { Addresses } from '../../lib/types'
import { getWebExplorerURL } from '../../lib/explorers'
import { NetworkName } from '@arkade-os/sdk'

export default function Support() {
  const { wallet, svcWallet } = useContext(WalletContext)
  const { config } = useContext(ConfigContext)
  const { aspInfo } = useContext(AspContext)
  const { swapProvider } = useContext(LightningContext)
  const [present] = useIonToast()
  const [addresses, setAddresses] = useState<Addresses>()
  const chatwootConfig = getChatwootConfig()

  const chatwoot = useChatwoot(chatwootConfig, {
    hideMessageBubble: false,
    position: 'right',
    locale: 'en',
    darkMode: config.theme.toLowerCase() as 'light' | 'auto',
  })

  // Fetch wallet addresses
  useEffect(() => {
    if (svcWallet) {
      getReceivingAddresses(svcWallet)
        .then(setAddresses)
        .catch((err) => console.error('Failed to get addresses:', err))
    }
  }, [svcWallet])

  // Set user information when Chatwoot is loaded
  useEffect(() => {
    if (chatwoot.isLoaded && wallet.pubkey && chatwootConfig && addresses) {
      // Set user identifier (using wallet pubkey)
      const userIdentifier = wallet.pubkey.substring(0, 16)
      chatwoot.setUser(userIdentifier, {
        name: `User ${userIdentifier}`,
      })

      // Get explorer URL for the network
      const explorerUrl = wallet.network ? getWebExplorerURL(wallet.network as NetworkName) : ''

      // Get app URLs
      const lendasatUrl = import.meta.env.VITE_LENDASAT_IFRAME_URL || 'not configured'
      const lendaswapUrl = import.meta.env.VITE_LENDASWAP_IFRAME_URL || 'not configured'
      const boltzUrl = swapProvider?.getApiUrl() || 'not configured'

      // Set custom attributes including addresses and service URLs
      chatwoot.setCustomAttributes({
        // Wallet information
        wallet_pubkey: wallet.pubkey,
        network: wallet.network || 'unknown',
        app_version: import.meta.env.VITE_APP_VERSION || 'unknown',
        // Addresses
        ark_address: addresses.offchainAddr || 'not available',
        btc_boarding_address: addresses.boardingAddr || 'not available',
        // Service URLs
        location_origin: window.location.origin,
        ark_server_url: aspInfo.url || config.aspUrl || 'not available',
        indexer_url: aspInfo.url || config.aspUrl || 'not available',
        explorer_url: explorerUrl || 'not available',
        boltz_url: boltzUrl,
        lendasat_url: lendasatUrl,
        lendaswap_url: lendaswapUrl,
      })
    }
  }, [
    chatwoot.isLoaded,
    wallet.pubkey,
    wallet.network,
    chatwootConfig,
    addresses,
    aspInfo.url,
    config.aspUrl,
    swapProvider,
  ])

  const handleOpenChat = () => {
    if (!chatwootConfig) {
      present({
        message: 'Support chat is not configured. Please contact the wallet provider.',
        duration: 3000,
        color: 'warning',
      })
      return
    }

    if (chatwoot.toggle) {
      chatwoot.toggle('open')
    } else {
      present({
        message: 'Support chat is loading. Please try again in a moment.',
        duration: 2000,
        color: 'medium',
      })
    }
  }

  return (
    <>
      <Header text='Support' back />
      <Content>
        <Padded>
          <FlexCol gap='2rem'>
            <FlexCol gap='1rem' centered>
              <div style={{ marginBottom: '1rem' }}>
                <SupportIcon />
              </div>
              <Text bold big>
                Customer Support
              </Text>
              <TextSecondary centered>
                Get help with your wallet, report bugs, or ask questions. Our support team is here to assist you.
              </TextSecondary>
            </FlexCol>

            {chatwootConfig ? (
              <FlexCol gap='1rem'>
                <Info
                  title='Secure Chat'
                  text='Your conversations are secure and private. Chat history is maintained across sessions.'
                />
                <Info
                  title='Bug Reports'
                  text='Report any issues or bugs you encounter. Include steps to reproduce the problem for faster resolution.'
                />
                <Info
                  title='Track Progress'
                  text='All your support tickets and conversations are saved. You can view past conversations anytime.'
                />
                <Button label='Open Support Chat' onClick={handleOpenChat} icon={<SupportIcon />} main />
              </FlexCol>
            ) : (
              <FlexCol gap='1rem'>
                <Info
                  title='Support Not Available'
                  text='Support chat is not configured for this wallet instance. Please contact your wallet provider for assistance.'
                />
              </FlexCol>
            )}
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
