import { useContext } from 'react'
import { ConfigContext } from '../providers/config'
import { FiatContext } from '../providers/fiat'
import { WalletContext } from '../providers/wallet'
import { BITCOIN_SYMBOL, formatBitcoinAmountParts, formatFiatAmountParts } from '../lib/format'
import { usePortfolioFiat } from './usePortfolioFiat'
import { FIAT_SYMBOLS } from '../lib/fiat'
import { maskedFiat } from '../components/PrivacyAmount'
import { Currencies, Unit } from '../lib/types'

export function usePortfolioBalanceDisplay() {
  const { config } = useContext(ConfigContext)
  const { fiatDecimals, toFiat } = useContext(FiatContext)
  const { dataReady, satsPreview } = useContext(WalletContext)
  const { totalFiat, totalSats } = usePortfolioFiat()
  const decimals = fiatDecimals()
  const priceReady = config.currency === Currencies.BTC || toFiat(100_000_000) > 0
  const sats = dataReady ? totalSats : satsPreview
  const maskedBtc = config.unit === Unit.BIP177 ? `${config.unit}••••` : `•••• ${config.unit}`

  if (!dataReady && satsPreview === undefined && totalSats === 0) {
    return {
      balance: '',
      maskedBalance: '••••',
      unit: '',
      secondaryBalance: '',
      secondaryUnit: '',
      maskedSecondary: maskedBtc,
      showSecondary: false,
    }
  }

  if (!priceReady) {
    const bitcoin = formatBitcoinAmountParts(sats ?? totalSats, config.unit, {
      maximumFractionDigits: config.unit === Unit.SATS ? 0 : 8,
      minimumFractionDigits: config.unit === Unit.SATS ? 0 : 8,
    })
    return {
      balance: bitcoin.amount,
      maskedBalance: maskedBtc,
      unit: bitcoin.unit,
      secondaryBalance: '',
      secondaryUnit: '',
      maskedSecondary: maskedBtc,
      showSecondary: false,
    }
  }

  const { amount: balance, unit } = formatFiatAmountParts(totalFiat, config.currency, {
    bitcoinUnit: config.unit,
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  })

  // Secondary line: the same total expressed in the configured bitcoin unit.
  const secondary = formatBitcoinAmountParts(totalSats, config.unit, {
    maximumFractionDigits: config.unit === Unit.SATS ? 0 : 8,
    minimumFractionDigits: config.unit === Unit.SATS ? 0 : 8,
  })

  const maskedBalance =
    config.currency === Currencies.BTC
      ? config.unit === Unit.BIP177
        ? `${config.unit}••••`
        : `•••• ${config.unit}`
      : FIAT_SYMBOLS[config.currency]
        ? maskedFiat(FIAT_SYMBOLS[config.currency])
        : `•••• ${config.currency}`

  const maskedSecondary =
    config.unit === Unit.BIP177
      ? `${BITCOIN_SYMBOL}••••`
      : `•••• ${config.unit === Unit.SATS ? (totalSats === 1 ? 'sat' : 'sats') : config.unit}`

  // When the currency is BTC both lines show the same total; hide the
  // redundant secondary line.
  const showSecondary = config.currency !== Currencies.BTC

  return {
    balance,
    maskedBalance,
    unit,
    secondaryBalance: secondary.amount,
    secondaryUnit: secondary.unit,
    maskedSecondary,
    showSecondary,
  }
}
