import { useContext } from 'react'
import { prettyHide, prettyNumber } from '../lib/format'
import { Satoshis } from '../lib/types'
import { FiatContext } from '../providers/fiat'
import Text from './Text'
import FlexCol from './FlexCol'
import FlexRow from './FlexRow'
import EyeIcon from '../icons/Eye'
import { ConfigContext } from '../providers/config'

interface BalanceProps {
  amount: Satoshis
}

// Fiat-primary balance with sats shown as a smaller secondary line.
// Privacy: `config.showBalance` toggles the eye-mask for both figures.
export default function Balance({ amount }: BalanceProps) {
  const { config, updateConfig } = useContext(ConfigContext)
  const { toFiat, fiatDecimals } = useContext(FiatContext)

  const fiatAmount = toFiat(amount)
  const satsUnit = amount === 1 ? 'SAT' : 'SATS'

  const satsBalance = config.showBalance ? prettyNumber(amount) : prettyHide(amount, '')
  const fiatBalance = config.showBalance
    ? prettyNumber(fiatAmount, fiatDecimals(), true, fiatDecimals())
    : prettyHide(fiatAmount, '')

  const toggleShow = () => updateConfig({ ...config, showBalance: !config.showBalance })

  return (
    <FlexCol gap='0' margin='2.5rem 0 1rem 0'>
      <FlexRow alignItems='baseline'>
        <Text bigger heading medium>
          {fiatBalance}
        </Text>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Text heading>{config.fiat}</Text>
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
      <FlexRow alignItems='baseline'>
        <Text color='dark80'>{satsBalance}</Text>
        <Text small>{satsUnit}</Text>
      </FlexRow>
    </FlexCol>
  )
}
