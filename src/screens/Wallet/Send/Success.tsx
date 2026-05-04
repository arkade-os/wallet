import { useContext, useEffect } from 'react'
import { FlowContext } from '../../../providers/flow'
import { NotificationsContext } from '../../../providers/notifications'
import { NavigationContext, Pages } from '../../../providers/navigation'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Success from '../../../components/Success'
import FlexCol from '../../../components/FlexCol'
import Padded from '../../../components/Padded'
import Text from '../../../components/Text'
import SuccessIcon from '../../../icons/Success'
import { prettyAmount, prettyFiatAmount } from '../../../lib/format'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { WalletContext } from '../../../providers/wallet'
import AssetCard from '../../../components/AssetCard'
import { prettyAssetAmount } from '../../../lib/assets'

export default function SendSuccess() {
  const { config, useFiat } = useContext(ConfigContext)
  const { toFiat } = useContext(FiatContext)
  const { sendInfo } = useContext(FlowContext)
  const { notifyPaymentSent } = useContext(NotificationsContext)
  const { assetMetadataCache } = useContext(WalletContext)
  const { navigate } = useContext(NavigationContext)

  const isAssetSend = Boolean(sendInfo.assets?.length)
  const assetId = sendInfo.assets?.[0]?.assetId
  const assetMeta = assetId ? assetMetadataCache.get(assetId) : undefined
  const assetName = assetMeta?.metadata?.name ?? 'Unknown Asset'
  const assetTicker = assetMeta?.metadata?.ticker ?? ''
  const assetIcon = assetMeta?.metadata?.icon
  const assetAmountValue = sendInfo.assets?.[0]?.amount ?? BigInt(0)
  const assetDecimals = assetMeta?.metadata?.decimals ?? 8

  // Show payment sent notification
  useEffect(() => {
    if (sendInfo.total) notifyPaymentSent(sendInfo.total)
  }, [sendInfo.total])

  const totalSats = sendInfo.total ?? 0
  const displayAmount = isAssetSend
    ? `${prettyAssetAmount(assetAmountValue, assetDecimals)} ${assetTicker}`
    : useFiat
      ? prettyFiatAmount(toFiat(totalSats), config.fiat)
      : prettyAmount(totalSats)

  if (isAssetSend && assetId) {
    return (
      <>
        <Header text='Success' />
        <Content>
          <Padded>
            <FlexCol gap='1.5rem' centered padding='1rem 0 0 0'>
              <SuccessIcon small />
              <Text centered big bold>
                Payment sent!
              </Text>
              <AssetCard
                assetId={assetId}
                balance={assetAmountValue}
                decimals={assetDecimals}
                icon={assetIcon}
                name={assetName}
                ticker={assetTicker}
              />
              <Text centered color='dark70' thin small wrap>
                {displayAmount} sent successfully
              </Text>
            </FlexCol>
          </Padded>
        </Content>
        <ButtonsOnBottom>
          <Button label='Sounds good' onClick={() => navigate(Pages.Wallet)} />
        </ButtonsOnBottom>
      </>
    )
  }

  return (
    <>
      <Header text='Success' />
      <Content>
        <Success headline='Payment sent!' text={`${displayAmount} sent successfully`} />
      </Content>
      <ButtonsOnBottom>
        <Button label='Sounds good' onClick={() => navigate(Pages.Wallet)} />
      </ButtonsOnBottom>
    </>
  )
}
