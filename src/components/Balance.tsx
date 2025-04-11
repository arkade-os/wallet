import { useContext } from 'react'
import { prettyAmount, prettyHide } from '../lib/format'
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

  const satsBalance = config.showBalance ? prettyAmount(amount) : prettyHide(amount)
  const fiatBalance = config.showBalance ? prettyAmount(fiatAmount, config.fiat) : prettyHide(fiatAmount, config.fiat)

  const toggleShow = () => updateConfig({ ...config, showBalance: !config.showBalance })

  return (
    <FlexCol gap='0' margin='3rem 0 2rem 0'>
      <Text color='dark50' smaller>
        My balance
      </Text>
      <FlexRow>
        <Text bigger>{satsBalance}</Text>
        <div onClick={toggleShow} style={{ cursor: 'pointer' }}>
          <EyeIcon />
        </div>
      </FlexRow>
      <Text color='dark80'>{fiatBalance}</Text>
    </FlexCol>
  )
}
