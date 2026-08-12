import { useContext, useEffect } from 'react'
import { FlowContext } from '../../../providers/flow'
import { NotificationsContext } from '../../../providers/notifications'
import { NavigationContext, Pages } from '../../../providers/navigation'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import FlexCol from '../../../components/FlexCol'
import Padded from '../../../components/Padded'
import Text from '../../../components/Text'
import WalletSuccessSplash from '../../../components/WalletSuccessSplash'
import SuccessIcon from '../../../icons/Success'
import { prettyAmount, prettyCurrencyAssetAmount, prettyFiatAmount } from '../../../lib/format'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { WalletContext } from '../../../providers/wallet'
import AssetCard from '../../../components/AssetCard'
import { accountAssetLabel, rawAssetPresentation, verifiedDesignatedCurrency } from '../../../lib/accountAssets'
import { AspContext } from '../../../providers/asp'

export default function SendSuccess() {
  const { config, useFiat } = useContext(ConfigContext)
  const { toFiat } = useContext(FiatContext)
  const { sendInfo } = useContext(FlowContext)
  const { notifyPaymentSent } = useContext(NotificationsContext)
  const { assetMetadataCache, isVerifiedAsset } = useContext(WalletContext)
  const { navigate } = useContext(NavigationContext)
  const { aspInfo } = useContext(AspContext)

  const isAssetSend = Boolean(sendInfo.account || sendInfo.assets?.length)
  const assetId = sendInfo.account?.assetId ?? sendInfo.assets?.[0]?.assetId
  const assetMeta = assetId ? assetMetadataCache.get(assetId) : undefined
  const assetPresentation = sendInfo.account
    ? { name: sendInfo.account.ticker, ticker: sendInfo.account.ticker }
    : rawAssetPresentation(assetMeta?.metadata, 'Unknown asset')
  const designatedCurrency = sendInfo.account
    ? undefined
    : verifiedDesignatedCurrency(aspInfo.network, assetId, isVerifiedAsset)
  // name only — the ticker already rides with the balance on AssetCard's left column
  const assetName = accountAssetLabel(designatedCurrency, { name: assetPresentation.name, ticker: '' })
  const assetTicker = assetPresentation.ticker
  const assetIcon = assetPresentation.icon
  const assetAmountValue = sendInfo.account?.amount ?? sendInfo.assets?.[0]?.amount ?? BigInt(0)
  const assetDecimals = sendInfo.account?.decimals ?? assetMeta?.metadata?.decimals ?? 8

  // Show payment sent notification
  useEffect(() => {
    if (sendInfo.total) notifyPaymentSent(sendInfo.total)
  }, [sendInfo.total])

  const totalSats = sendInfo.total ?? 0
  // currency formatting keys on the ticker string; a spoofed "USD" mint must
  // not earn it (account sends are designated, hence verified by id)
  const trustedTicker = sendInfo.account || (assetId && isVerifiedAsset(assetId)) ? assetTicker : undefined
  const displayAmount = isAssetSend
    ? `${prettyCurrencyAssetAmount(assetAmountValue, assetDecimals, trustedTicker)} ${assetTicker}`
    : useFiat
      ? prettyFiatAmount(toFiat(totalSats), config.currency, { bitcoinUnit: config.unit })
      : prettyAmount(totalSats)

  // A Lightning send is committed, not completed: the covenant is funded and
  // the solver still has to pay the invoice. It settles or it refunds, both
  // without us, so this is not a pending-failure warning — it is simply the
  // accurate word. An Arkade send, by contrast, really is sent.
  const isLightningSend = Boolean(sendInfo.invoice)
  const headline = isLightningSend ? 'Payment is on the way' : 'Payment sent'
  const detail = isLightningSend ? `${displayAmount} on the way` : `${displayAmount} sent successfully`

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
                logoTicker={designatedCurrency}
              />
              <Text centered color='neutral-700' thin small wrap>
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
    <WalletSuccessSplash
      headline={headline}
      text={detail}
      ariaLabel={`${headline}. Tap to go home.`}
      onDone={() => navigate(Pages.Wallet)}
    />
  )
}
