import { useContext, useEffect, useState } from 'react'
import Header from './Header'
import Content from '../../components/Content'
import Padded from '../../components/Padded'
import FlexCol from '../../components/FlexCol'
import Text, { TextSecondary } from '../../components/Text'
import Button from '../../components/Button'
import { WalletContext } from '../../providers/wallet'
import { ConfigContext } from '../../providers/config'
import { AspContext } from '../../providers/asp'
import { LightningContext } from '../../providers/lightning'
import { getReceivingAddresses } from '../../lib/asp'
import { Addresses } from '../../lib/types'
import { getWebExplorerURL } from '../../lib/explorers'
import { NetworkName } from '@arkade-os/sdk'
import ChatwootWidget from '../../components/ChatWoot'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'

export default function Support() {
  const { aspInfo } = useContext(AspContext)
  const { config } = useContext(ConfigContext)
  const { swapProvider } = useContext(LightningContext)
  const { wallet, svcWallet } = useContext(WalletContext)

  const [addresses, setAddresses] = useState<Addresses>()
  const [supportChatLoaded, setSupportChatLoaded] = useState(false)

  // Fetch wallet addresses
  useEffect(() => {
    if (svcWallet) {
      getReceivingAddresses(svcWallet)
        .then(setAddresses)
        .catch((err) => console.error('Failed to get addresses:', err))
    }
  }, [svcWallet])

  // Wait for Chatwoot to load
  useEffect(() => {
    const event = 'chatwoot:ready'
    const eventHandler = () => {
      setSupportChatLoaded(true)
      window.$chatwoot?.toggleBubbleVisibility('hide')
    }
    window.addEventListener(event, eventHandler)
    return () => window.removeEventListener(event, eventHandler)
  }, [])

  useEffect(() => {
    if (!addresses || !supportChatLoaded || !window.$chatwoot || !wallet.pubkey) return

    // Set user identifier (using wallet pubkey)
    const userIdentifier = wallet.pubkey.substring(0, 16)
    window.$chatwoot.setUser(userIdentifier, { name: `User ${userIdentifier}` })

    // Set custom attributes including addresses and service URLs
    window.$chatwoot.setCustomAttributes({
      wallet_pubkey: wallet.pubkey,
      network: wallet.network || 'not available',
      location_origin: window.location.origin,
      ark_address: addresses.offchainAddr || 'not available',
      boltz_url: swapProvider?.getApiUrl() || 'not available',
      indexer_url: aspInfo.url || config.aspUrl || 'not available',
      btc_boarding_address: addresses.boardingAddr || 'not available',
      ark_server_url: aspInfo.url || config.aspUrl || 'not available',
      app_version: import.meta.env.VITE_APP_VERSION || 'not available',
      lendasat_url: import.meta.env.VITE_LENDASAT_IFRAME_URL || 'not available',
      lendaswap_url: import.meta.env.VITE_LENDASWAP_IFRAME_URL || 'not available',
      explorer_url: wallet.network ? getWebExplorerURL(wallet.network as NetworkName) : 'not available',
    })
  }, [addresses, supportChatLoaded, wallet.pubkey, window.$chatwoot])

  const handleOpenChat = () => {
    if (window.$chatwoot) window.$chatwoot.toggle('open')
  }

  const Section = ({ title, text }: { title: string; text: string }) => (
    <FlexCol gap='0.5rem'>
      <Text thin>{title}</Text>
      <TextSecondary>{text}</TextSecondary>
    </FlexCol>
  )

  return (
    <>
      <Header text='Support' back />
      <Content>
        <Padded>
          <FlexCol gap='1rem'>
            <Section
              title='Customer support'
              text='Get help with your wallet, report bugs, or ask questions. Our support team is here to assist you.'
            />
            <Section
              title='Secure Chat'
              text='Your conversations are secure and private. Chat history is maintained across sessions.'
            />
            <Section
              title='Bug Reports'
              text='Report any issues or bugs you encounter. Include steps to reproduce the problem for faster resolution.'
            />
            <Section
              title='Track Progress'
              text='All your support tickets and conversations are saved. You can view past conversations anytime.'
            />
            <ChatwootWidget />
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button label='Open Support Chat' onClick={handleOpenChat} />
      </ButtonsOnBottom>
    </>
  )
}
