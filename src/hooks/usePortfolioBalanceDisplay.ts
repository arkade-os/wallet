import { useContext } from 'react'
import { ConfigContext } from '../providers/config'
import { FiatContext } from '../providers/fiat'
import { WalletContext } from '../providers/wallet'
import { BITCOIN_SYMBOL, formatBitcoinAmountParts, formatFiatAmountParts } from '../lib/format'
import { usePortfolioFiat } from './usePortfolioFiat'
import { FIAT_SYMBOLS } from '../lib/fiat'
import { maskedFiat } from '../components/PrivacyAmount'
import { Currencies, Unit } from '../lib/types'
import { useBalanceLead } from '../lib/balanceLead'

export function usePortfolioBalanceDisplay() {
  const { config } = useContext(ConfigContext)
  const { fiatDecimals, toFiat } = useContext(FiatContext)
  const { booting, dataReady, satsPreview } = useContext(WalletContext)
  const { totalFiat, totalSats } = usePortfolioFiat()
  const decimals = fiatDecimals()
  const priceReady = config.currency === Currencies.BTC || toFiat(100_000_000) > 0
  const maskedBtc = config.unit === Unit.BIP177 ? `${config.unit}••••` : `•••• ${config.unit}`

  if (booting && !dataReady && satsPreview === undefined && totalSats === 0) {
    return {
      balance: '',
      maskedBalance: '••••',
      unit: '',
      secondaryBalance: '',
      secondaryUnit: '',
      maskedSecondary: maskedBtc,
      showSecondary: false,
      canSwitch: false,
    }
  }

  if (!priceReady) {
    const bitcoin = formatBitcoinAmountParts(totalSats, config.unit, {
      maximumFractionDigits: config.unit === Unit.SATS ? 0 : 8,
      minimumFractionDigits: config.unit === Unit.SATS ? 0 : 8,
    })
    return {
      balance: bitcoin.amount,
      maskedBalance: maskedBtc,
      unit: config.showBalance ? bitcoin.unit : '',
      secondaryBalance: '',
      secondaryUnit: '',
      maskedSecondary: maskedBtc,
      showSecondary: false,
      canSwitch: false,
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

  const showSecondary = config.currency !== Currencies.BTC
  const lead = useBalanceLead()
  const canSwitch = showSecondary
  const bitcoinFirst = canSwitch && lead === 'bitcoin'

  // Masked values already include their unit, so omit the separate unit span while hidden.
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
