import { useContext } from 'react'
import { prettyHide, prettyNumber } from '../lib/format'
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

  const satsBalance = config.showBalance ? prettyNumber(amount) : prettyHide(amount, '')
  const fiatBalance = config.showBalance ? prettyNumber(fiatAmount, fiatDecimals()) : prettyHide(fiatAmount, '')

  const mainBalance = showFiat ? fiatBalance : satsBalance
  const otherBalance = showFiat ? satsBalance : fiatBalance
  const satsUnit = amount === 1 ? 'SAT' : 'SATS'
  const mainUnit = showFiat ? config.fiat : satsUnit
  const otherUnit = showFiat ? satsUnit : config.fiat

  const toggleShow = () => updateConfig({ ...config, showBalance: !config.showBalance })

  return (
    <FlexCol gap='0' margin={showBoth ? '3rem 0 2rem 0' : '3rem 0 0.5rem 0'}>
      <Text color='dark50' smaller>
        My balance
      </Text>
      <FlexRow alignItems='baseline'>
        <Text bigger heading medium>
          {mainBalance}
        </Text>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Text heading>{mainUnit}</Text>
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
      {config.currencyDisplay === CurrencyDisplay.Both ? (
        <FlexRow alignItems='baseline'>
          <Text color='dark80'>{otherBalance}</Text>
          <Text small>{otherUnit}</Text>
        </FlexRow>
      ) : null}
    </FlexCol>
  )
}
