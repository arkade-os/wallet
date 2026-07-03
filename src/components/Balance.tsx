import { useContext } from 'react'
import { prettyBitcoinAmount, prettyFiatAmount, prettyFiatHide } from '../lib/format'
import { Currencies } from '../lib/types'
import { FiatContext } from '../providers/fiat'
import Text from './Text'
import FlexCol from './FlexCol'
import FlexRow from './FlexRow'
import EyeIcon from '../icons/Eye'
import { ConfigContext } from '../providers/config'

interface BalanceProps {
  amount: number
}

export default function Balance({ amount }: BalanceProps) {
  const { config, updateConfig } = useContext(ConfigContext)
  const { toFiat, fiatDecimals } = useContext(FiatContext)

  const currencyAmount = toFiat(amount)
  const mainValue = config.showBalance
    ? config.fiat === Currencies.BTC
      ? prettyBitcoinAmount(amount, config.unit)
      : prettyFiatAmount(currencyAmount, config.fiat, {
          maximumFractionDigits: fiatDecimals(),
          minimumFractionDigits: fiatDecimals(),
        })
    : prettyFiatHide(currencyAmount, config.fiat, { bitcoinUnit: config.unit })
  const [mainBalance, mainUnit = ''] = mainValue.split(' ')
  const toggleShow = () => updateConfig({ ...config, showBalance: !config.showBalance })

  return (
    <FlexCol gap='0' margin='2.5rem 0 1rem 0'>
      <FlexRow alignItems='baseline'>
        <Text bigger heading medium testId='main-balance'>
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
    </FlexCol>
  )
}
