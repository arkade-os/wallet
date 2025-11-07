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
  const { toFiat } = useContext(FiatContext)

  const fiatAmount = toFiat(amount)

  const satsBalance = config.showBalance ? prettyNumber(amount) : prettyHide(amount, '')
  const fiatBalance = config.showBalance ? prettyNumber(fiatAmount, 2) : prettyHide(fiatAmount, '')

  const otherBalance = config.currencyDisplay === CurrencyDisplay.Fiat ? satsBalance : fiatBalance
  const mainBalance = config.currencyDisplay === CurrencyDisplay.Fiat ? fiatBalance : satsBalance
  const otherUnit = config.currencyDisplay === CurrencyDisplay.Fiat ? 'SATS' : config.fiat
  const mainUnit = config.currencyDisplay === CurrencyDisplay.Fiat ? config.fiat : 'SATS'
  const showBoth = config.currencyDisplay === CurrencyDisplay.Both

  const toggleShow = () => updateConfig({ ...config, showBalance: !config.showBalance }, false)

  return (
    <FlexCol gap='0' margin='3rem 0 2rem 0'>
      <Text color='dark50' smaller>
        My balance
      </Text>
      <FlexRow>
        <Text bigger>{mainBalance}</Text>
        <div style={{ paddingTop: ' 0.75rem' }}>
          <Text>{mainUnit}</Text>
        </div>
        <div onClick={toggleShow} style={{ cursor: 'pointer' }}>
          <EyeIcon />
        </div>
      </FlexRow>
      {showBoth ? (
        <FlexRow>
          <Text color='dark80'>{otherBalance}</Text>
          <Text small>{otherUnit}</Text>
        </FlexRow>
      ) : null}
    </FlexCol>
  )
}
