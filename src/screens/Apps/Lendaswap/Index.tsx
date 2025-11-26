import { useContext, useEffect, useRef, useState } from 'react'
import Padded from '../../../components/Padded'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import { WalletProvider, type LoanAsset, AddressType } from '@lendasat/lendasat-wallet-bridge'
import { collaborativeExit, getReceivingAddresses } from '../../../lib/asp'
import { isArkAddress, isBTCAddress } from '../../../lib/address'

const IFRAME_URL = import.meta.env.VITE_LENDASWAP_IFRAME_URL || 'https://swap.lendasat.com'

export default function AppLendaswap() {
  const { navigate } = useContext(NavigationContext)
  const { svcWallet } = useContext(WalletContext)
  const [arkAddress, setArkAddress] = useState<string | null>(null)

  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const loadAddress = async () => {
      if (svcWallet) {
        try {
          const addresses = await getReceivingAddresses(svcWallet)
          setArkAddress(addresses.offchainAddr)
        } catch (error) {
          console.error('Failed to load Ark address:', error)
        }
      }
    }
    loadAddress()
  }, [svcWallet])

  useEffect(() => {
    if (!iframeRef.current) return

    const provider = new WalletProvider(
      {
        capabilities: () => {
          return {
            bitcoin: {
              signPsbt: false,
              sendBitcoin: false,
            },
            loanAssets: {
              supportedAssets: [],
              canReceive: false,
              canSend: false,
            },
            nostr: {
              hasNpub: false,
            },
            ark: {
              canSend: true,
              canReceive: true,
            },
          }
        },
        async onGetAddress(addressType: AddressType): Promise<string> {
          switch (addressType) {
            case AddressType.BITCOIN:
            case AddressType.LOAN_ASSET:
              throw Error('Address type not supported')
            case AddressType.ARK:
              if (!arkAddress) throw new Error('Ark address not yet loaded')
              return arkAddress
          }
        },
        async onSendToAddress(address: string, amount: number, asset: 'bitcoin' | LoanAsset): Promise<string> {
          if (!svcWallet) {
            throw Error('Wallet not initialized')
          }

          if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
            throw new Error('Invalid amount')
          }

          switch (asset) {
            case 'bitcoin':
              if (isArkAddress(address)) {
                const txId = await svcWallet?.sendBitcoin({ amount, address })
                if (txId) {
                  return txId
                } else {
                  throw new Error('Unable to send bitcoin')
                }
              } else if (isBTCAddress(address)) {
                return await collaborativeExit(svcWallet, amount, address)
              } else {
                throw Error(`Unsupported address ${address}`)
              }
            case 'UsdcPol':
            case 'UsdtPol':
            case 'UsdcEth':
            case 'UsdtEth':
            case 'UsdcStrk':
            case 'UsdtStrk':
            case 'UsdcSol':
            case 'UsdtSol':
            case 'UsdtLiquid':
              throw new Error('Not implemented for Lendaswap')
            case 'Usd':
            case 'Eur':
            case 'Chf':
            case 'Mxn':
              throw new Error('Not implemented for Lendaswap')
          }
        },
      },
      [IFRAME_URL],
    )

    provider.listen(iframeRef.current)

    return () => {
      provider.destroy()
    }
  }, [svcWallet, arkAddress])

  return (
    <>
      <Header text='Lendaswap' back={() => navigate(Pages.Apps)} />
      <Content>
        <Padded>
          <FlexCol gap='2rem' between>
            <iframe
              ref={iframeRef}
              src={IFRAME_URL}
              title='Lendaswap'
              className='lendaswap-iframe'
              allow='clipboard-write; clipboard-read'
              style={{ height: '100%' }}
            />
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
