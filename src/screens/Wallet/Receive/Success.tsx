import { useContext, useEffect, useState } from 'react'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import Padded from '../../../components/Padded'
import Text from '../../../components/Text'
import SuccessIcon from '../../../icons/Success'
import Success from '../../../components/Success'
import { NotificationsContext } from '../../../providers/notifications'
import { FlowContext } from '../../../providers/flow'
import Header from '../../../components/Header'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { prettyAmount, prettyFiatAmount } from '../../../lib/format'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { WalletContext } from '../../../providers/wallet'
import { consoleError } from '../../../lib/logs'
import type { AssetDetails } from '@arkade-os/sdk'
import AssetCard from '../../../components/AssetCard'
import { prettyAssetAmount } from '../../../lib/assets'

export default function ReceiveSuccess() {
  const { config, useFiat } = useContext(ConfigContext)
  const { toFiat } = useContext(FiatContext)
  const { recvInfo } = useContext(FlowContext)
  const { notifyPaymentReceived } = useContext(NotificationsContext)
  const { assetMetadataCache, setCacheEntry, svcWallet } = useContext(WalletContext)
  const { navigate } = useContext(NavigationContext)

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
            const moderated = setCacheEntry(a.assetId, details)
            setAssetDetails((prev) => new Map([...prev, [a.assetId, moderated]]))
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
        const amount = prettyAssetAmount(a.amount, meta?.decimals ?? 0)
        const ticker = meta?.ticker ?? meta?.name ?? 'assets'
        return `${amount} ${ticker}`
      })
      notifyPaymentReceived(recvInfo.satoshis, labels.join(', '))
    } else {
      notifyPaymentReceived(recvInfo.satoshis)
    }
  }, [assetDetails])

  const displayAmount = useFiat
    ? prettyFiatAmount(toFiat(recvInfo.satoshis), config.fiat)
    : prettyAmount(recvInfo.satoshis)

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
                  <AssetCard
                    assetId={a.assetId}
                    balance={a.amount}
                    decimals={meta?.decimals ?? 0}
                    icon={icon}
                    name={name}
                    ticker={ticker}
                  />
                )
              })}

              <Text centered color='dark70' thin small wrap>
                {displayAmount}
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
        <Success headline='Payment received!' text={`${displayAmount} received successfully`} />
      </Content>
      <ButtonsOnBottom>
        <Button label='Sounds good' onClick={() => navigate(Pages.Wallet)} />
      </ButtonsOnBottom>
    </>
  )
}
