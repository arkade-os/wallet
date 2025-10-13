import { useContext, useEffect, useRef } from 'react'
import Padded from '../../../components/Padded'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import { SettingsIconLight } from '../../../icons/Settings'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import { WalletProvider, AddressType, type LoanAsset } from '@lendasat/lendasat-wallet-bridge'
import { LimitsContext } from '../../../providers/limits'
import { FlowContext } from '../../../providers/flow'
import Dexie from 'dexie'
import Promise = Dexie.Promise

export default function AppLendasat() {
  const { navigate } = useContext(NavigationContext)
  const { wallet, svcWallet } = useContext(WalletContext)
  const { validLnSwap, validUtxoTx, validVtxoTx, utxoTxsAllowed, vtxoTxsAllowed } = useContext(LimitsContext)

  const { recvInfo, setRecvInfo } = useContext(FlowContext)
  const { boardingAddr, offchainAddr, satoshis } = recvInfo
  const address = validUtxoTx(satoshis) && utxoTxsAllowed() ? boardingAddr : ''
  const arkAddress = validVtxoTx(satoshis) && vtxoTxsAllowed() ? offchainAddr : ''

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    const provider = new WalletProvider(
      {
        onSendToAddress(address: string, amount: number, asset: 'bitcoin' | LoanAsset): string | Promise<string> {
          throw new Error('not implemented yet');
        },
        onGetPublicKey: () => {
          console.log(`Called on get pk`);
          if (!wallet.pubkey) {
            throw new Error('No public key available');
          }
          return wallet.pubkey;
        },
        onGetDerivationPath: () => {
          console.log(`Called on get derivation path`);
          // this is just a dummy one as arkade wallet uses a single key
          return "m/84'/0'/0'/0/0";
        },
        onGetAddress: async (addressType: AddressType, asset?: LoanAsset) => {
          console.log(
            `Called on get address: type=${addressType}, asset=${asset}`,
          );

          switch (addressType) {
            case AddressType.ARK:
              return arkAddress;

            case AddressType.BITCOIN:
              throw address;

            case AddressType.LOAN_ASSET:
              throw new Error(`Unsupported address type: ${addressType}`);

            default:
              throw new Error(`Unknown address type: ${addressType}`);
          }
        },
        onGetNpub: () => {
          console.log(`Called on get npub`);
          // Optional - returning null for now
          throw new Error(`NPubs are not supported`);
        },
        onSignPsbt: (psbt: string) => {
          console.log(`Called sign psbt ${psbt}`);
          // TODO: Implement PSBT signing
          return null as any;
        },
        onGetApiKey: () => {
          console.log(`Called on get API key`);
          // TODO: Implement API key retrieval
          return 'lndst_sk_dee619e34a7e_NI2TUiMmYF9TcBavaFhUW0rZ63QOIsoldG1w0YdFMpR';
        }
      },
      ['http://localhost:5173'],
    );

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
