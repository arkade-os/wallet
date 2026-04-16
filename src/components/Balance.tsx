import { useContext } from 'react'
import { prettyHide, prettyNumber } from '../lib/format'
import { FIAT_SYMBOLS } from '../lib/fiat'
import { CurrencyDisplay, Satoshis } from '../lib/types'
import { FiatContext } from '../providers/fiat'
import Text from './Text'
import FlexCol from './FlexCol'
import FlexRow from './FlexRow'
import EyeIcon from '../icons/Eye'
import { ConfigContext } from '../providers/config'

interface BalanceProps {
  amount: Satoshis
}

export default function Balance({ amount }: BalanceProps) {
  const { config, updateConfig } = useContext(ConfigContext)
  const { toFiat, fiatDecimals } = useContext(FiatContext)

  const fiatAmount = toFiat(amount)
  const showFiat = config.currencyDisplay === CurrencyDisplay.Fiat
  const fiatSymbol = FIAT_SYMBOLS[config.fiat]

  const satsBalance = config.showBalance ? prettyNumber(amount) : prettyHide(amount, '')
  const fiatBalanceRaw = config.showBalance
    ? prettyNumber(fiatAmount, fiatDecimals(), true, fiatDecimals())
    : prettyHide(fiatAmount, '')
  // prettyHide returns '' for a zero balance; skip the symbol prefix to avoid a lone "$".
  const fiatBalance = fiatSymbol && fiatBalanceRaw ? `${fiatSymbol}${fiatBalanceRaw}` : fiatBalanceRaw
  const fiatUnit = fiatSymbol ? '' : config.fiat

  const mainBalance = showFiat ? fiatBalance : satsBalance
  const otherBalance = showFiat ? satsBalance : fiatBalance
  const satsUnit = amount === 1 ? 'SAT' : 'SATS'
  const mainUnit = showFiat ? fiatUnit : satsUnit
  const otherUnit = showFiat ? satsUnit : fiatUnit

  const showBoth = config.currencyDisplay === CurrencyDisplay.Both
  const toggleShow = () => updateConfig({ ...config, showBalance: !config.showBalance })

  return (
    <FlexCol gap='0' margin='2.5rem 0 1rem 0'>
      <FlexRow alignItems='baseline'>
        <Text bigger heading medium>
          {mainBalance}
        </Text>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {mainUnit ? <Text heading>{mainUnit}</Text> : null}
          <button
            type='button'
            onClick={toggleShow}
            aria-label={config.showBalance ? 'Hide balance' : 'Show balance'}
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.25rem',
              background: 'none',
              border: 'none',
              color: 'inherit',
            }}
          >
            <EyeIcon size={16} />
          </button>
        </div>
      </FlexRow>
      {showBoth ? (
        <FlexRow alignItems='baseline'>
          <Text color='dark80'>{otherBalance}</Text>
          <Text small>{otherUnit}</Text>
        </FlexRow>
      ) : null}
    </FlexCol>
  )
}
