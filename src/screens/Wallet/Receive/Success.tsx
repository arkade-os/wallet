import { useContext, useEffect, useState } from 'react'
import WalletSuccessSplash from '../../../components/WalletSuccessSplash'
import { NotificationsContext } from '../../../providers/notifications'
import { FlowContext } from '../../../providers/flow'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { prettyAmount, prettyFiatAmount } from '../../../lib/format'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { WalletContext } from '../../../providers/wallet'
import { consoleError } from '../../../lib/logs'
import type { AssetDetails } from '@arkade-os/sdk'
import { prettyAssetAmount } from '../../../lib/assets'

function formatAssetLabel(a: { assetId: string; amount: bigint }, details: AssetDetails | undefined) {
  const meta = details?.metadata
  const amount = prettyAssetAmount(a.amount, meta?.decimals ?? 0)
  const ticker = meta?.ticker ?? meta?.name ?? 'assets'
  return `${amount} ${ticker}`
}

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
      const labels = receivedAssets.map((a) => formatAssetLabel(a, assetDetails.get(a.assetId)))
      notifyPaymentReceived(recvInfo.satoshis, labels.join(', '))
    } else {
      notifyPaymentReceived(recvInfo.satoshis)
    }
  }, [assetDetails])

  const displayAmount = useFiat
    ? prettyFiatAmount(toFiat(recvInfo.satoshis), config.currency, { bitcoinUnit: config.unit })
    : prettyAmount(recvInfo.satoshis)

  const displayText = isAssetReceive
    ? receivedAssets.map((a) => formatAssetLabel(a, assetDetails.get(a.assetId))).join(', ')
    : `${displayAmount} received successfully`

  return (
    <WalletSuccessSplash
      headline='Payment received'
      text={displayText}
      ariaLabel='Payment received successfully. Tap to go home.'
      onDone={() => navigate(Pages.Wallet)}
    />
  )
}
