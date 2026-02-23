import { useContext, useEffect, useState } from 'react'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import FlexRow from '../../../components/FlexRow'
import Padded from '../../../components/Padded'
import Shadow from '../../../components/Shadow'
import Text from '../../../components/Text'
import AssetAvatar from '../../../components/AssetAvatar'
import SuccessIcon from '../../../icons/Success'
import Success from '../../../components/Success'
import { NotificationsContext } from '../../../providers/notifications'
import { FlowContext } from '../../../providers/flow'
import Header from '../../../components/Header'
import { prettyAmount } from '../../../lib/format'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { WalletContext } from '../../../providers/wallet'
import { consoleError } from '../../../lib/logs'
import type { AssetDetails } from '@arkade-os/sdk'

export default function ReceiveSuccess() {
  const { config, useFiat } = useContext(ConfigContext)
  const { toFiat } = useContext(FiatContext)
  const { recvInfo } = useContext(FlowContext)
  const { notifyPaymentReceived } = useContext(NotificationsContext)
  const { assetMetadataCache, setCacheEntry, svcWallet } = useContext(WalletContext)

  const isAssetReceive = Boolean(recvInfo.assetId)
  const assetId = recvInfo.assetId ?? ''

  const [assetDetails, setAssetDetails] = useState<AssetDetails | undefined>(
    assetId ? assetMetadataCache.get(assetId) : undefined,
  )

  useEffect(() => {
    notifyPaymentReceived(recvInfo.satoshis)
  }, [])

  // Fetch and cache asset metadata if not already cached
  useEffect(() => {
    if (!assetId || !svcWallet || assetDetails) return

    svcWallet.assetManager
      .getAssetDetails(assetId)
      .then((details) => {
        if (details) {
          setCacheEntry(assetId, details)
          setAssetDetails(details)
        }
      })
      .catch((err) => consoleError(err, 'error fetching asset details'))
  }, [assetId, svcWallet])

  const meta = assetDetails?.metadata
  const assetName = meta?.name ?? 'Unknown Asset'
  const assetTicker = meta?.ticker ?? ''
  const assetIcon = meta?.icon

  const displayAmount = useFiat ? prettyAmount(toFiat(recvInfo.satoshis), config.fiat) : prettyAmount(recvInfo.satoshis)

  if (isAssetReceive) {
    return (
      <>
        <Header text='Success' />
        <Content>
          <Padded>
            <FlexCol gap='1.5rem' centered padding='1rem 0 0 0'>
              <SuccessIcon small />
              <Text centered big bold>
                Payment received!
              </Text>

              <Shadow border>
                <FlexRow between padding='0.75rem'>
                  <FlexRow>
                    <AssetAvatar icon={assetIcon} ticker={assetTicker} name={assetName} size={32} />
                    <FlexCol gap='0'>
                      <Text bold>{assetName}</Text>
                      {assetTicker ? (
                        <Text color='dark50' smaller>
                          {assetTicker}
                        </Text>
                      ) : null}
                    </FlexCol>
                  </FlexRow>
                </FlexRow>
              </Shadow>

              <Text centered color='dark70' thin small wrap>
                Asset received successfully
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
        <Success headline='Payment received!' text={`${displayAmount} received successfully`} />
      </Content>
    </>
  )
}
