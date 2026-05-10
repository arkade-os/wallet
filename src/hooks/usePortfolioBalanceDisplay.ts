import { useContext } from 'react'
import { ConfigContext } from '../providers/config'
import { FiatContext } from '../providers/fiat'
import { formatFiatAmountParts } from '../lib/format'
import { usePortfolioFiat } from './usePortfolioFiat'
import { FIAT_SYMBOLS } from '../lib/fiat'
import { maskedFiat } from '../components/PrivacyAmount'

export function usePortfolioBalanceDisplay() {
  const { config } = useContext(ConfigContext)
  const { fiatDecimals } = useContext(FiatContext)
  const { totalFiat } = usePortfolioFiat()
  const decimals = fiatDecimals()

  const { amount: balance, unit } = formatFiatAmountParts(totalFiat, config.fiat, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  })

  const maskedBalance = FIAT_SYMBOLS[config.fiat] ? maskedFiat(FIAT_SYMBOLS[config.fiat]) : `•••• ${config.fiat}`

  return { balance, maskedBalance, unit }
}
