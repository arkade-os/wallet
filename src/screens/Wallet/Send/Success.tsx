import { useContext, useEffect } from 'react'
import { FlowContext } from '../../../providers/flow'
import { NotificationsContext } from '../../../providers/notifications'
import { NavigationContext, Pages } from '../../../providers/navigation'
import WalletSuccessSplash from '../../../components/WalletSuccessSplash'
import { prettyAmount, prettyFiatAmount } from '../../../lib/format'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { WalletContext } from '../../../providers/wallet'
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
  const assetTicker = assetMeta?.metadata?.ticker ?? ''
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
      ? prettyFiatAmount(toFiat(totalSats), config.fiat, { bitcoinUnit: config.currencyDisplay })
      : prettyAmount(totalSats)

  return (
    <WalletSuccessSplash
      headline='Payment sent'
      text={`${displayAmount} sent successfully`}
      ariaLabel='Payment sent successfully. Tap to go home.'
      onDone={() => navigate(Pages.Wallet)}
    />
  )
}
