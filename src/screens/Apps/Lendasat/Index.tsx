import { useContext, useEffect, useRef } from 'react'
import Padded from '../../../components/Padded'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import { SettingsIconLight } from '../../../icons/Settings'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { WalletProvider, AddressType, type LoanAsset } from 'wallet-bridge'

export default function AppLendasat() {
  const { navigate } = useContext(NavigationContext)

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    const provider = new WalletProvider(
      {
        onGetPublicKey: () => {
          console.log(`Called on get pk`);
          // TODO: Implement public key retrieval
          return null as any;
        },
        onGetDerivationPath: () => {
          console.log(`Called on get derivation path`);
          // TODO: Implement derivation path retrieval
          return null as any;
        },
        onGetAddress: (addressType: AddressType, asset?: LoanAsset) => {
          console.log(
            `Called on get address: type=${addressType}, asset=${asset}`,
          );
          // TODO: Implement address retrieval
          return null as any;
        },
        onGetNpub: () => {
          console.log(`Called on get npub`);
          // TODO: Implement Nostr npub retrieval
          return null as any;
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
        },
      },
      ['http://localhost:5173'],
    );

    provider.listen(iframeRef.current);

    return () => {
      provider.destroy();
    };
  }, []);

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
          <FlexCol gap='2rem'>
            <iframe
              ref={iframeRef}
              src="http://localhost:5173"
              title="Lendasat"
              className="lendasat-iframe"
            />
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
