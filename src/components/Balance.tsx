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

export default function Balance({ amount }: BalanceProps) {
  const { config, updateConfig } = useContext(ConfigContext)
  const { toFiat } = useContext(FiatContext)

  const fiatAmount = toFiat(amount)

  const satsBalance = config.showBalance ? prettyNumber(amount) : prettyHide(amount)
  const fiatBalance = config.showBalance ? prettyNumber(fiatAmount, 2) : prettyHide(fiatAmount, config.fiat)

  const toggleShow = () => updateConfig({ ...config, showBalance: !config.showBalance })

  return (
    <FlexCol gap='0' margin='3rem 0 2rem 0'>
      <Text color='dark50' smaller>
        My balance
      </Text>
      <FlexRow>
        <Text bigger>{satsBalance.replace(' SATS', '')}</Text>
        <div style={{ paddingTop: ' 0.75rem' }}>
          <Text>SATS</Text>
        </div>
        <div onClick={toggleShow} style={{ cursor: 'pointer' }}>
          <EyeIcon />
        </div>
      </FlexRow>
      <FlexRow>
        <Text color='dark80'>{fiatBalance.replace(` ${config.fiat}`, '')}</Text>
        <Text small>{config.fiat}</Text>
      </FlexRow>
    </FlexCol>
  )
}
