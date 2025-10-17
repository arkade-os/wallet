import { useContext, useEffect, useRef, useState } from 'react'
import Padded from '../../../components/Padded'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import { SettingsIconLight } from '../../../icons/Settings'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import { AddressType, type LoanAsset, WalletProvider } from '@lendasat/lendasat-wallet-bridge'
import { sha256 } from '@noble/hashes/sha2.js'
import * as utils from '@noble/hashes/utils.js'
import * as secp from '@noble/secp256k1'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { hmac } from '@noble/hashes/hmac.js'
import { collaborativeExit, getReceivingAddresses } from '../../../lib/asp'
import { Transaction } from '@scure/btc-signer'
import { isArkAddress, isBTCAddress } from '../../../lib/address'

const { bytesToHex, hexToBytes } = utils

// Set up SHA256 for @noble/secp256k1
secp.hashes.sha256 = sha256
secp.hashes.hmacSha256 = (key, msg) => hmac(sha256, key, msg)

export default function AppLendasat() {
  const { navigate } = useContext(NavigationContext)
  const { wallet, svcWallet } = useContext(WalletContext)
  const [arkAddress, setArkAddress] = useState<string | null>(null)
  const [boardingAddress, setBoardingAddress] = useState<string | null>(null)

  useEffect(() => {
    const loadAddress = async () => {
      if (svcWallet) {
        const addresses = await getReceivingAddresses(svcWallet)
        setArkAddress(addresses.offchainAddr)
        setBoardingAddress(addresses.boardingAddr)
      }
    }
    loadAddress()
  }, [svcWallet])

  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (!iframeRef.current || !arkAddress || !boardingAddress) return

    const provider = new WalletProvider(
      {
        capabilities: () => {
          return {
            bitcoin: {
              signPsbt: true,
              sendBitcoin: true,
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
        async onSendToAddress(address: string, amount: number, asset: 'bitcoin' | LoanAsset): Promise<string> {
          if (!svcWallet) {
            throw Error('Wallet not initialized')
          }

          switch (asset) {
            case 'bitcoin':
              if (isArkAddress(address)) {
                const txId = await svcWallet?.sendBitcoin({ amount: amount, address: address })
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
              throw new Error('Unable to send non btc assets')
            case 'Usd':
            case 'Eur':
            case 'Chf':
            case 'Mxn':
              throw new Error('Unable to send fiat')
          }
        },
        onGetPublicKey: async () => {
          if (!svcWallet) {
            throw new Error('Wallet not initialized')
          }

          const pk = await svcWallet.identity.compressedPublicKey()
          return bytesToHex(pk)
        },
        onGetDerivationPath: () => {
          console.log(`Called on get derivation path`)
          // this is just a dummy one as arkade wallet uses a single key
          return "m/84'/0'/0'/0/0"
        },
        onGetAddress: async (addressType: AddressType, asset?: LoanAsset) => {
          console.log(`Called on get address: type=${addressType}, asset=${asset}`)

          switch (addressType) {
            case AddressType.ARK:
              return arkAddress

            case AddressType.BITCOIN:
              return boardingAddress

            case AddressType.LOAN_ASSET:
              throw new Error(`Unsupported address type: ${addressType}`)

            default:
              throw new Error(`Unknown address type: ${addressType}`)
          }
        },
        onGetNpub: () => {
          console.log(`Called on get npub`)
          // Optional - returning null for now
          throw new Error(`NPubs are not supported`)
        },
        onSignPsbt: async (psbt: string) => {
          if (!svcWallet) {
            throw Error('Wallet not initialized')
          }
          const psbtBytes = hexToBytes(psbt)
          const tx = Transaction.fromPSBT(psbtBytes, { allowUnknown: true })
          const signedTx = await svcWallet.identity.sign(tx)
          const signedTxBytes = signedTx.toPSBT()

          return bytesToHex(signedTxBytes)
        },
        async onSignMessage(message: string): Promise<string> {
          if (!svcWallet) {
            throw new Error('Wallet not initialized')
          }

          // Hash the message with SHA256
          const messageHash = sha256(new TextEncoder().encode(message))

          // Get signature in compact format (64 bytes: r + s)
          const signatureBytes = await svcWallet.identity.signMessage(messageHash, 'ecdsa')

          // Convert compact signature to DER format using @noble/curves/secp256k1
          // The Signature class from @noble/curves supports DER encoding
          const sig = secp256k1.Signature.fromBytes(signatureBytes)
          return sig.toHex('der')
        },
      },
      [import.meta.env.VITE_LENDASAT_IFRAME_URL || 'https://iframe.lendasat.com'],
    )

    provider.listen(iframeRef.current)

    return () => {
      provider.destroy()
    }
  }, [wallet.pubkey, svcWallet, arkAddress])

  return (
    <>
      <Header
        auxFunc={() => navigate(Pages.AppLendasat)}
        auxIcon={<SettingsIconLight />}
        text='Lendasat'
        back={() => navigate(Pages.Apps)}
      />
      <Content>
        <Padded>
          <FlexCol gap='2rem' between>
            <iframe
              ref={iframeRef}
              src={import.meta.env.VITE_LENDASAT_IFRAME_URL || 'https://iframe.lendasat.com'}
              title='Lendasat'
              className='lendasat-iframe'
              allow='clipboard-write; clipboard-read'
              style={{ height: '100%' }}
            />
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
