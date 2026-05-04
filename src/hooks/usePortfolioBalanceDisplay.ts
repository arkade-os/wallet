import { useContext } from 'react'
import { ConfigContext } from '../providers/config'
import { FiatContext } from '../providers/fiat'
import { FIAT_SYMBOLS } from '../lib/fiat'
import { prettyNumber } from '../lib/format'
import { usePortfolioFiat } from './usePortfolioFiat'

export function usePortfolioBalanceDisplay() {
  const { config } = useContext(ConfigContext)
  const { fiatDecimals } = useContext(FiatContext)
  const { totalFiat } = usePortfolioFiat()

  const fiatSymbol = FIAT_SYMBOLS[config.fiat] ?? ''
  const fiatBalanceRaw = prettyNumber(totalFiat, fiatDecimals(), true, fiatDecimals())
  const balance = fiatSymbol && fiatBalanceRaw ? `${fiatSymbol}${fiatBalanceRaw}` : fiatBalanceRaw
  const unit = fiatSymbol ? '' : config.fiat

  return { balance, unit }
}
