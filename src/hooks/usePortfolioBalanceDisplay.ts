import { useContext } from 'react'
import { ConfigContext } from '../providers/config'
import { FiatContext } from '../providers/fiat'
import { BITCOIN_SYMBOL, formatBitcoinAmountParts, formatFiatAmountParts } from '../lib/format'
import { usePortfolioFiat } from './usePortfolioFiat'
import { FIAT_SYMBOLS } from '../lib/fiat'
import { maskedFiat } from '../components/PrivacyAmount'
import { Currencies, Unit } from '../lib/types'
import { useBalanceLead } from '../lib/balanceLead'

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

  // A tap on the Home balance can put Bitcoin first; the currency then takes the secondary line.
  // With BTC as the currency both lines are Bitcoin already, so there is nothing to switch.
  const lead = useBalanceLead()
  const canSwitch = showSecondary
  const bitcoinFirst = canSwitch && lead === 'bitcoin'

  // A masked figure already carries its unit ("•••• BTC"), so while balances are hidden the separate
  // unit is left out; otherwise the line reads "•••• BTC BTC".
  const unitShown = (value: string) => (config.showBalance ? value : '')

  return bitcoinFirst
    ? {
        balance: secondary.amount,
        maskedBalance: maskedSecondary,
        unit: unitShown(secondary.unit),
        secondaryBalance: balance,
        secondaryUnit: unitShown(unit),
        maskedSecondary: maskedBalance,
        showSecondary,
        canSwitch,
      }
    : {
        balance,
        maskedBalance,
        unit: unitShown(unit),
        secondaryBalance: secondary.amount,
        secondaryUnit: unitShown(secondary.unit),
        maskedSecondary,
        showSecondary,
        canSwitch,
      }
}
