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
import { formatAssetAmount, prettyAmount } from '../../../lib/format'
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

  const receivedAssets = recvInfo.receivedAssets ?? []
  const isAssetReceive = receivedAssets.length > 0

  const [assetDetails, setAssetDetails] = useState<Map<string, AssetDetails>>(() => {
    const entries: [string, AssetDetails][] = []
    for (const a of receivedAssets) {
      const cached = assetMetadataCache.get(a.assetId)
      if (cached) entries.push([a.assetId, cached])
    }
    return new Map(entries)
  })

  // Fetch and cache asset metadata if not already cached
  useEffect(() => {
    if (!receivedAssets.length || !svcWallet || assetDetails.size === receivedAssets.length) return

    for (const a of receivedAssets) {
      if (assetDetails.has(a.assetId)) continue
      svcWallet.assetManager
        .getAssetDetails(a.assetId)
        .then((details) => {
          if (details) {
            setCacheEntry(a.assetId, details)
            setAssetDetails((prev) => new Map([...prev, [a.assetId, details]]))
          }
        })
        .catch((err) => consoleError(err, 'error fetching asset details'))
    }
  }, [receivedAssets, svcWallet])

  // Notify once all metadata is loaded (or immediately for non-asset receives)
  useEffect(() => {
    if (isAssetReceive) {
      if (assetDetails.size < receivedAssets.length) return
      const labels = receivedAssets.map((a) => {
        const meta = assetDetails.get(a.assetId)?.metadata
        const amount = formatAssetAmount(a.amount, meta?.decimals ?? 0)
        const ticker = meta?.ticker ?? meta?.name ?? 'assets'
        return `${amount} ${ticker}`
      })
      notifyPaymentReceived(recvInfo.satoshis, labels.join(', '))
    } else {
      notifyPaymentReceived(recvInfo.satoshis)
    }
  }, [assetDetails])

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

              {receivedAssets.map((a) => {
                const meta = assetDetails.get(a.assetId)?.metadata
                const name = meta?.name ?? 'Unknown Asset'
                const ticker = meta?.ticker ?? ''
                const icon = meta?.icon

                return (
                  <Shadow border key={a.assetId}>
                    <FlexRow between padding='0.75rem'>
                      <FlexRow>
                        <AssetAvatar icon={icon} ticker={ticker} name={name} size={32} assetId={a.assetId} clickable />
                        <FlexCol gap='0'>
                          <Text bold>{name}</Text>
                          {ticker ? (
                            <Text color='dark50' smaller>
                              {ticker}
                            </Text>
                          ) : null}
                        </FlexCol>
                      </FlexRow>
                      <Text bold>{formatAssetAmount(a.amount, meta?.decimals ?? 0)}</Text>
                    </FlexRow>
                  </Shadow>
                )
              })}

              <Text centered color='dark70' thin small wrap>
                {displayAmount}
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
