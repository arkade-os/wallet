import { useContext } from 'react'
import { ConfigContext } from '../providers/config'
import { FiatContext } from '../providers/fiat'
import { BITCOIN_SYMBOL, formatBitcoinAmountParts, formatFiatAmountParts } from '../lib/format'
import { usePortfolioFiat } from './usePortfolioFiat'
import { FIAT_SYMBOLS } from '../lib/fiat'
import { maskedFiat } from '../components/PrivacyAmount'
import { Currencies, Unit } from '../lib/types'

export function usePortfolioBalanceDisplay() {
  const { config } = useContext(ConfigContext)
  const { fiatDecimals } = useContext(FiatContext)
  const { totalFiat, totalSats } = usePortfolioFiat()
  const decimals = fiatDecimals()

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
