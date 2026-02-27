import { useContext, useEffect } from 'react'
import { FlowContext } from '../../../providers/flow'
import { NotificationsContext } from '../../../providers/notifications'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import Success from '../../../components/Success'
import FlexCol from '../../../components/FlexCol'
import FlexRow from '../../../components/FlexRow'
import Padded from '../../../components/Padded'
import Shadow from '../../../components/Shadow'
import Text from '../../../components/Text'
import AssetAvatar from '../../../components/AssetAvatar'
import SuccessIcon from '../../../icons/Success'
import { formatAssetAmount, prettyAmount } from '../../../lib/format'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { WalletContext } from '../../../providers/wallet'

export default function SendSuccess() {
  const { config, useFiat } = useContext(ConfigContext)
  const { toFiat } = useContext(FiatContext)
  const { sendInfo } = useContext(FlowContext)
  const { notifyPaymentSent } = useContext(NotificationsContext)
  const { assetMetadataCache } = useContext(WalletContext)

  const isAssetSend = Boolean(sendInfo.assets?.length)
  const assetId = sendInfo.assets?.[0]?.assetId
  const assetMeta = assetId ? assetMetadataCache.get(assetId) : undefined
  const assetName = assetMeta?.metadata?.name ?? 'Unknown Asset'
  const assetTicker = assetMeta?.metadata?.ticker ?? ''
  const assetIcon = assetMeta?.metadata?.icon
  const assetAmountValue = sendInfo.assets?.[0]?.amount ?? 0
  const assetDecimals = assetMeta?.metadata?.decimals ?? 8

  // Show payment sent notification
  useEffect(() => {
    if (sendInfo.total) notifyPaymentSent(sendInfo.total)
  }, [sendInfo.total])

  const totalSats = sendInfo.total ?? 0
  const displayAmount = isAssetSend
    ? `${formatAssetAmount(assetAmountValue, assetDecimals)} ${assetTicker}`
    : useFiat
      ? prettyAmount(toFiat(totalSats), config.fiat)
      : prettyAmount(totalSats)

  if (isAssetSend) {
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

              <Shadow border>
                <FlexRow between padding='0.75rem'>
                  <FlexRow>
                    <AssetAvatar
                      icon={assetIcon}
                      ticker={assetTicker}
                      name={assetName}
                      size={32}
                      assetId={assetId}
                      clickable
                    />
                    <FlexCol gap='0'>
                      <Text bold>{assetName}</Text>
                      {assetTicker ? (
                        <Text color='dark50' smaller>
                          {assetTicker}
                        </Text>
                      ) : null}
                    </FlexCol>
                  </FlexRow>
                  <Text>{formatAssetAmount(assetAmountValue, assetDecimals)}</Text>
                </FlexRow>
              </Shadow>

              <Text centered color='dark70' thin small wrap>
                {displayAmount} sent successfully
              </Text>
            </FlexCol>
          </Padded>
        </Content>
      </>
    )
  }

  return (
    <>
      <Header text='Success' />
      <Content>
        <Success headline='Payment sent!' text={`${displayAmount} sent successfully`} />
      </Content>
    </>
  )
}
