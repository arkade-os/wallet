import { useContext } from 'react'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import Success from '../../../components/Success'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { FlowContext } from '../../../providers/flow'

export default function AppAssetMintSuccess() {
  const { navigate } = useContext(NavigationContext)
  const { assetInfo } = useContext(FlowContext)

  const handleViewAsset = () => {
    navigate(Pages.AppAssetDetail)
  }

  return (
    <>
      <Header text='Asset Created' />
      <Content>
        <Success
          headline='Asset minted!'
          text={assetInfo.assetId ? `Asset ID: ${assetInfo.assetId.slice(0, 16)}...` : 'Asset ID: unknown'}
        />
      </Content>
      <ButtonsOnBottom>
        <Button label='View Asset' onClick={handleViewAsset} />
        <Button label='Back to Assets' onClick={() => navigate(Pages.AppAssets)} secondary />
      </ButtonsOnBottom>
    </>
  )
}
