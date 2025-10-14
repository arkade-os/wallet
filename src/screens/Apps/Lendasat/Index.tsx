import { useContext, useEffect, useRef } from 'react'
import Padded from '../../../components/Padded'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import { SettingsIconLight } from '../../../icons/Settings'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import { AddressType, type LoanAsset, WalletProvider } from '@lendasat/lendasat-wallet-bridge'
import { LimitsContext } from '../../../providers/limits'
import { FlowContext } from '../../../providers/flow'
import { getPrivateKey } from '../../../lib/privateKey'
import * as secp from '@noble/secp256k1'
import { sha256} from '@noble/hashes/sha2.js';
import * as utils from '@noble/hashes/utils.js';
const { bytesToHex } = utils;


export default function AppLendasat() {
  const { navigate } = useContext(NavigationContext)
  const { wallet, svcWallet } = useContext(WalletContext)
  const { validUtxoTx, validVtxoTx, utxoTxsAllowed, vtxoTxsAllowed } = useContext(LimitsContext)

  const { recvInfo, } = useContext(FlowContext)
  const { boardingAddr, offchainAddr, satoshis } = recvInfo
  const address = validUtxoTx(satoshis) && utxoTxsAllowed() ? boardingAddr : ''
  const arkAddress = validVtxoTx(satoshis) && vtxoTxsAllowed() ? offchainAddr : ''

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    const provider = new WalletProvider(
      {

        capabilities: {
          bitcoin: {
            signPsbt: true,
            sendBitcoin: true,
          },
          loanAssets: {
            supportedAssets: [],
            canReceive: false, // Not implemented
            canSend: false, // Not yet implemented
          },
          nostr: {
            hasNpub: false, // Not available in this integration
          },
          ark: {
            canSend: true,
            canReceive: true,
          },
        },
        async onSendToAddress(address: string, amount: number, asset: 'bitcoin' | LoanAsset): Promise<string> {
          switch (asset) {
            case 'bitcoin':
              const txId = await svcWallet?.sendBitcoin({ amount: amount, address: address })
              if (txId) {
                return txId
              } else {
                throw new Error('Unable to send bitcoin')
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
          if (!wallet.pubkey) {
            throw new Error('No public key available')
          }
          return wallet.pubkey
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
              throw address

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
        onSignPsbt: (psbt: string) => {
          console.log(`Called sign psbt ${psbt}`)
          // TODO: Implement PSBT signing
          return null as any
        },
        async onSignMessage(message: string): Promise<string> {
          if (!svcWallet) {
            throw new Error('Wallet not initialized');
          }

          // Get the private key from storage
          // TODO: this doesn't seem to work
          const password = prompt('Password')
          if (password == null) throw new Error('Password required for signing')
          const privkey = await getPrivateKey(password)

          // Hash the message with SHA256
          const messageHash = sha256(new TextEncoder().encode(message))

          // Sign with ECDSA (DER Format)
          const signature = secp.sign(messageHash, privkey, { format: 'der' })

          // Return signature as hex string
          return bytesToHex(signature);
        },
      },
      ['http://localhost:5173'],
    )

    provider.listen(iframeRef.current);

    return () => {
      provider.destroy();
    };
  }, [wallet.pubkey, svcWallet]);

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
              src="http://localhost:5173"
              title="Lendasat"
              className="lendasat-iframe"
              allow="clipboard-write; clipboard-read"
              style={{ height: '100%' }}
            />
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
