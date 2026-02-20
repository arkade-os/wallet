import { useContext } from 'react'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import FlexCol from '../../../components/FlexCol'
import FlexRow from '../../../components/FlexRow'
import Padded from '../../../components/Padded'
import Shadow from '../../../components/Shadow'
import Text, { TextSecondary } from '../../../components/Text'
import AssetAvatar from '../../../components/AssetAvatar'
import SuccessIcon from '../../../icons/Success'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { FlowContext } from '../../../providers/flow'
import { WalletContext } from '../../../providers/wallet'
import { formatAssetAmount } from '../../../lib/format'

export default function AppAssetMintSuccess() {
  const { navigate } = useContext(NavigationContext)
  const { assetInfo } = useContext(FlowContext)
  const { assetMetadataCache } = useContext(WalletContext)

  const assetId = assetInfo.assetId ?? ''
  const details = assetInfo.details ?? assetMetadataCache.get(assetId)
  const meta = details?.metadata
  const name = meta?.name ?? 'Unknown Asset'
  const ticker = meta?.ticker ?? ''
  const decimals = meta?.decimals ?? 8
  const supply = details?.supply
  const icon = meta?.icon

  const handleViewAsset = () => {
    navigate(Pages.AppAssetDetail)
  }

  return (
    <>
      <Header text='Asset Created' />
      <Content>
        <Padded>
          <FlexCol gap='1.5rem' centered padding='1rem 0 0 0'>
            <SuccessIcon small />
            <Text centered big bold>
              Asset minted!
            </Text>

            <Shadow border>
              <FlexRow between padding='0.75rem'>
                <FlexRow>
                  <AssetAvatar icon={icon} ticker={ticker} name={name} size={32} />
                  <FlexCol gap='0'>
                    <Text bold>{name}</Text>
                    {ticker ? (
                      <Text color='dark50' smaller>
                        {ticker}
                      </Text>
                    ) : null}
                  </FlexCol>
                </FlexRow>
                <Text>{typeof supply === 'number' ? formatAssetAmount(supply, decimals) : 'Unknown'}</Text>
              </FlexRow>
            </Shadow>

            <FlexCol gap='0.25rem' centered>
              <Text copy={assetId} color='dark50' smaller>
                {assetId.slice(0, 12)}...{assetId.slice(-12)}
              </Text>
              <TextSecondary centered>Asset ID (tap to copy)</TextSecondary>
            </FlexCol>
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button label='View Asset' onClick={handleViewAsset} />
        <Button label='Back to Assets' onClick={() => navigate(Pages.AppAssets)} secondary />
      </ButtonsOnBottom>
    </>
  )
}
