import { useContext } from 'react'
import { ConfigContext } from '../providers/config'
import { FiatContext } from '../providers/fiat'
import { formatFiatAmountParts } from '../lib/format'
import { usePortfolioFiat } from './usePortfolioFiat'

export function usePortfolioBalanceDisplay() {
  const { config } = useContext(ConfigContext)
  const { fiatDecimals } = useContext(FiatContext)
  const { totalFiat } = usePortfolioFiat()
  const decimals = fiatDecimals()

  const { amount: balance, unit } = formatFiatAmountParts(totalFiat, config.fiat, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  })

  return { balance, unit }
}
