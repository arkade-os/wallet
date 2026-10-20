import { useContext, useEffect, useRef } from 'react'
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
import { appSendNeedsDriver, onchainSendNeedsDriver, WALLET_EXIT_RAIL } from '../../../lib/sendRouter'
import { SwapsContext } from '../../../providers/swaps'
import { AspContext } from '../../../providers/asp'
import { useTranslation } from '../../../providers/language'
import { appIntentHandoff, callbackHost, redirectToCallback } from '../../../lib/appIntent'

export default function SendSuccess() {
  const { config, useFiat } = useContext(ConfigContext)
  const { toFiat } = useContext(FiatContext)
  const { appIntent, sendInfo, setAppIntent } = useContext(FlowContext)
  const { notifyPaymentSent } = useContext(NotificationsContext)
  const { assetMetadataCache, isVerifiedAsset } = useContext(WalletContext)
  const { navigate } = useContext(NavigationContext)
  const { aspInfo } = useContext(AspContext)
  const { t } = useTranslation()
  const { outcomeOf } = useContext(SwapsContext)
  const handedOff = useRef(false)
  const needsDriver = onchainSendNeedsDriver(sendInfo, outcomeOf)
  const appNeedsDriver = appSendNeedsDriver(appIntent, sendInfo, outcomeOf)
  const pendingWarning = t('send.pendingOnchain')

  const isAssetSend = Boolean(sendInfo.account || sendInfo.assets?.length)
  const assetId = sendInfo.account?.assetId ?? sendInfo.assets?.[0]?.assetId
  const assetMeta = assetId ? assetMetadataCache.get(assetId) : undefined
  const assetPresentation = sendInfo.account
    ? { name: sendInfo.account.ticker, ticker: sendInfo.account.ticker }
    : rawAssetPresentation(assetMeta?.metadata, t('send.unknownAsset'))
  const designatedCurrency = sendInfo.account
    ? undefined
    : verifiedDesignatedCurrency(aspInfo.network, assetId, isVerifiedAsset)
  // name only — the ticker already rides with the balance on AssetCard's left column
  const assetName = accountAssetLabel(designatedCurrency, { name: assetPresentation.name, ticker: '' })
  const assetTicker = assetPresentation.ticker
  const assetIcon = assetPresentation.icon
  const assetAmountValue = sendInfo.account?.amount ?? sendInfo.assets?.[0]?.amount ?? BigInt(0)
  const assetDecimals = sendInfo.account?.decimals ?? assetMeta?.metadata?.decimals ?? 0

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

  // Reached ON the funding now, so "sent" would be false as it is read: the
  // on-chain corridor still owes an L1 confirmation. An Arkade send does not.
  // Which rail paid decides that, not the destination's shape: the exit owes no
  // claim at all. An unknown rail keeps the cautious wording.
  const paidOutright = sendInfo.railId === WALLET_EXIT_RAIL
  const isOnchainSend = Boolean(sendInfo.address) && !sendInfo.arkAddress && !sendInfo.invoice && !paidOutright
  const isSwapSend = Boolean(sendInfo.invoice) || isOnchainSend
  const returnHost = appIntent?.status === 'send' && appIntent.callback ? callbackHost(appIntent.callback) : ''
  const headline = isSwapSend ? t('send.paymentOnTheWay') : t('send.paymentSent')
  // Only on-chain, and not a hedge: THIS wallet holds the L1 claim key and the
  // drive spending it runs in the page, so a closed tab forfeits the fill.
  const detail =
    appNeedsDriver && appIntent?.status === 'send' && appIntent.committedOnchain?.swapId !== sendInfo.swapId
      ? pendingWarning
      : isOnchainSend && (!appIntent || needsDriver)
        ? t('send.onTheWayKeepOpen', { amount: displayAmount })
        : returnHost
          ? t('appIntent.sentReturn', { amount: displayAmount, host: returnHost })
          : isSwapSend
            ? t('send.onTheWay', { amount: displayAmount })
            : t('send.sentSuccessfully', { amount: displayAmount })

  const finish = () => {
    if (appNeedsDriver) {
      navigate(Pages.Wallet)
      return
    }
    if (handedOff.current) return
    handedOff.current = true
    const handoff = appIntentHandoff(appIntent, 'sent', sendInfo.txid)
    if (appIntent?.status === 'send') setAppIntent(undefined)
    if (handoff) {
      redirectToCallback(handoff.callback, handoff.params)
      return
    }
    navigate(Pages.Wallet)
  }

  if (isAssetSend && assetId) {
    return (
      <>
        <Header text={t('transaction.success')} />
        <Content>
          <Padded>
            <FlexCol gap='1.5rem' centered padding='1rem 0 0 0'>
              <SuccessIcon small />
              <Text centered big bold>
                {t('send.paymentSent')}!
              </Text>
              <AssetCard
                assetId={assetId}
                balance={assetAmountValue}
                exactAmount
                decimals={assetDecimals}
                icon={assetIcon}
                name={assetName}
                ticker={assetTicker}
                logoTicker={designatedCurrency}
              />
              <Text centered color='neutral-700' thin small wrap>
                {appNeedsDriver ? pendingWarning : t('send.sentSuccessfully', { amount: displayAmount })}
              </Text>
            </FlexCol>
          </Padded>
        </Content>
        <ButtonsOnBottom>
          <Button
            label={returnHost ? t('appIntent.returnTo', { host: returnHost }) : t('transaction.soundsGood')}
            onClick={finish}
          />
        </ButtonsOnBottom>
      </>
    )
  }

  return (
    <WalletSuccessSplash
      headline={headline}
      text={detail}
      ariaLabel={`${headline}. ${t('wallet.tapToGoHome')}`}
      onDone={finish}
    />
  )
}
