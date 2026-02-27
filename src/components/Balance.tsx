import { useContext } from 'react'
import { prettyAmount, prettyHide, prettyNumber } from '../lib/format'
import { CurrencyDisplay, DisplayMode, Satoshis } from '../lib/types'
import { FiatContext } from '../providers/fiat'
import Text from './Text'
import FlexCol from './FlexCol'
import FlexRow from './FlexRow'
import EyeIcon from '../icons/Eye'
import { ConfigContext } from '../providers/config'
import { hapticTap } from '../lib/haptics'

interface BalanceProps {
  amount: Satoshis
}

export default function Balance({ amount }: BalanceProps) {
  const { config, updateConfig } = useContext(ConfigContext)
  const { toFiat } = useContext(FiatContext)

  const fiatAmount = toFiat(amount)

  const isBitcoinMain = config.currencyDisplay !== CurrencyDisplay.Fiat
  const isFiatMain = config.currencyDisplay === CurrencyDisplay.Fiat
  const showBoth = config.currencyDisplay === CurrencyDisplay.Both

  const satsDisplay = config.showBalance ? prettyAmount(amount, config) : prettyHide(amount, config)
  const fiatDisplay = config.showBalance ? prettyNumber(fiatAmount, 2) : prettyHide(fiatAmount)

  const mainBalance = isFiatMain ? fiatDisplay : satsDisplay
  const otherBalance = isFiatMain ? satsDisplay : fiatDisplay

  const toggleShow = () => updateConfig({ ...config, showBalance: !config.showBalance })

  const toggleDisplayMode = () => {
    hapticTap()
    const newMode = config.displayMode === DisplayMode.BTC ? DisplayMode.Base : DisplayMode.BTC
    updateConfig({ ...config, displayMode: newMode })
  }

  return (
    <FlexCol gap='0' margin='3rem 0 2rem 0'>
      <Text color='dark50' smaller>
        My balance
      </Text>
      <FlexRow>
        {isBitcoinMain ? (
          <div onClick={toggleDisplayMode} style={{ cursor: 'pointer' }}>
            <Text bigger heading medium className='bitcoin-symbol'>
              {mainBalance}
            </Text>
          </div>
        ) : (
          <>
            <Text bigger heading medium>
              {mainBalance}
            </Text>
            <div style={{ paddingTop: ' 0.75rem' }}>
              <Text heading>{config.fiat}</Text>
            </div>
          </>
        )}
        <div onClick={toggleShow} style={{ cursor: 'pointer' }}>
          <EyeIcon />
        </div>
      </FlexRow>
      {showBoth ? (
        <FlexRow>
          {isBitcoinMain ? (
            <>
              <Text color='dark80'>{otherBalance}</Text>
              <Text small>{config.fiat}</Text>
            </>
          ) : (
            <Text color='dark80' className='bitcoin-symbol'>
              {otherBalance}
            </Text>
          )}
        </FlexRow>
      ) : null}
    </FlexCol>
  )
}
