import { useContext } from 'react'
import { prettyAmount } from '../lib/format'
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
  const { toUSD } = useContext(FiatContext)

  const toggleShow = () => updateConfig({ ...config, showBalance: !config.showBalance })
  const toggleFiat = () => updateConfig({ ...config, showFiat: !config.showFiat })

  return (
    <FlexCol gap='4px' margin='3rem 0 2rem 0'>
      <Text color='dark50' smaller>
        My balance
      </Text>
      <FlexRow>
        <Text bigger>{prettyAmount(amount, config.showBalance, config.showFiat, toUSD)}</Text>
        <div onClick={toggleShow} style={{ cursor: 'pointer' }}>
          <EyeIcon />
        </div>
      </FlexRow>
      <div onClick={toggleFiat} style={{ cursor: 'pointer' }}>
        <Text color='dark80'>{prettyAmount(amount, config.showBalance, !config.showFiat, toUSD)}</Text>
      </div>
    </FlexCol>
  )
}
