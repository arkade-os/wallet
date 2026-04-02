import { useContext, useEffect, useState } from 'react'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import FlexRow from '../../../components/FlexRow'
import Header from '../../../components/Header'
import Padded from '../../../components/Padded'
import Shadow from '../../../components/Shadow'
import Text from '../../../components/Text'
import SwapIcon from '../../../icons/Swap'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { FlowContext, emptyBancoInfo } from '../../../providers/flow'
import { WalletContext } from '../../../providers/wallet'
import { consoleError } from '../../../lib/logs'
import { prettyNumber, prettyAgo } from '../../../lib/format'
import { IonInput } from '@ionic/react'
import { BancoContext } from '../../../providers/banco'

interface PairConfig {
  base: string
  quote: string
  priceFeedUrl: string
}

function parsePairs(): PairConfig[] {
  const raw = import.meta.env.VITE_BANCO_PAIRS
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function assetLabel(asset: string): string {
  if (asset.toLowerCase() === 'btc') return 'BTC'
  if (asset.length > 12) return asset.slice(0, 6) + '\u2026' + asset.slice(-4)
  return asset.toUpperCase()
}

const PAIRS = parsePairs()

export default function AppBanco() {
  const { navigate } = useContext(NavigationContext)
  const { setBancoInfo } = useContext(FlowContext)
  const { balance } = useContext(WalletContext)
  const { swaps, setSelectedSwapId } = useContext(BancoContext)

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [receiveAmount, setReceiveAmount] = useState('')
  const [price, setPrice] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [loadingPrice, setLoadingPrice] = useState(false)

  const pair = PAIRS[selectedIndex]
  const baseAsset = pair ? (flipped ? pair.quote : pair.base) : ''
  const quoteAsset = pair ? (flipped ? pair.base : pair.quote) : ''

  useEffect(() => {
    setBancoInfo(emptyBancoInfo)
  }, [])

  // Fetch price from feed
  useEffect(() => {
    if (!pair) {
      setError('No pairs configured (set VITE_BANCO_PAIRS)')
      return
    }
    setLoadingPrice(true)
    setError('')
    setPrice(null)
    fetch(pair.priceFeedUrl)
      .then((r) => r.json())
      .then((data) => {
        const p = data.price ?? data.rate ?? data.last
        if (typeof p !== 'number' || p <= 0) throw new Error('Invalid price data')
        setPrice(p)
      })
      .catch((err) => {
        consoleError(err, 'error fetching price feed')
        setError('Unable to fetch price')
      })
      .finally(() => setLoadingPrice(false))
  }, [selectedIndex])

  const effectivePrice = price ? (flipped ? 1 / price : price) : null

  const handlePayChange = (value: string) => {
    setPayAmount(value)
    if (!effectivePrice || !value || Number(value) <= 0) {
      setReceiveAmount('')
      return
    }
    setReceiveAmount(prettyNumber(Number(value) * effectivePrice, 8, false))
  }

  const handleFlip = () => {
    setFlipped((f) => !f)
    setPayAmount('')
    setReceiveAmount('')
  }

  const handleSelectPair = (i: number) => {
    setSelectedIndex(i)
    setFlipped(false)
    setPayAmount('')
    setReceiveAmount('')
  }

  const handleSwap = () => {
    if (!pair) return
    const pay = Number(payAmount)
    const receive = Number(receiveAmount)
    if (pay <= 0 || receive <= 0) return

    setBancoInfo({
      payAmount: pay,
      payAsset: baseAsset.toLowerCase() === 'btc' ? '' : baseAsset,
      receiveAmount: receive,
      receiveAsset: quoteAsset.toLowerCase() === 'btc' ? '' : quoteAsset,
      pair: `${assetLabel(baseAsset)}/${assetLabel(quoteAsset)}`,
    })

    navigate(Pages.AppBancoSwap)
  }

  const pay = Number(payAmount) || 0
  const disabledReason = !pair
    ? 'No pairs configured'
    : loadingPrice
      ? 'Loading price...'
      : error
        ? error
        : pay <= 0
          ? 'Enter an amount'
          : baseAsset.toLowerCase() === 'btc' && pay > balance
            ? 'Insufficient balance'
            : undefined

  const inputStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 600,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    width: '100%',
    color: 'var(--black)',
    fontFamily: 'inherit',
  }

  return (
    <>
      <Header text='Banco' back />
      <Content>
        <Padded>
          <FlexCol gap='0.75rem'>
            {/* Pair tabs */}
            {PAIRS.length > 1 ? (
              <FlexRow gap='0.5rem'>
                {PAIRS.map((p, i) => (
                  <Shadow
                    key={`${p.base}-${p.quote}`}
                    border={i === selectedIndex}
                    lighter={i !== selectedIndex}
                    onClick={() => handleSelectPair(i)}
                  >
                    <FlexRow centered padding='0.25rem'>
                      <Text small bold={i === selectedIndex}>
                        {assetLabel(p.base)}/{assetLabel(p.quote)}
                      </Text>
                    </FlexRow>
                  </Shadow>
                ))}
              </FlexRow>
            ) : null}

            {/* You pay */}
            <Shadow lighter testId='banco-pay-card'>
              <FlexCol padding='0.25rem' gap='0.25rem'>
                <Text smaller color='dark50'>
                  You pay
                </Text>
                <FlexRow between alignItems='center'>
                  <IonInput
                    type='number'
                    inputMode='decimal'
                    placeholder='0'
                    value={payAmount}
                    onIonInput={(e) => handlePayChange(String(e.detail.value ?? ''))}
                    style={inputStyle}
                    data-testid='banco-pay-amount'
                  />
                  <Shadow border flex>
                    <FlexRow centered padding='0 0.25rem'>
                      <Text bold small>
                        {assetLabel(baseAsset)}
                      </Text>
                    </FlexRow>
                  </Shadow>
                </FlexRow>
              </FlexCol>
            </Shadow>

            {/* Flip direction */}
            <FlexRow centered>
              <div onClick={handleFlip} style={{ cursor: 'pointer', padding: '0.25rem' }} data-testid='banco-flip'>
                <SwapIcon />
              </div>
            </FlexRow>

            {/* You receive */}
            <Shadow lighter testId='banco-receive-card'>
              <FlexCol padding='0.25rem' gap='0.25rem'>
                <Text smaller color='dark50'>
                  You receive
                </Text>
                <FlexRow between alignItems='center'>
                  <Text big testId='banco-receive-amount'>
                    {receiveAmount || '0'}
                  </Text>
                  <Shadow border flex>
                    <FlexRow centered padding='0 0.25rem'>
                      <Text bold small>
                        {assetLabel(quoteAsset)}
                      </Text>
                    </FlexRow>
                  </Shadow>
                </FlexRow>
              </FlexCol>
            </Shadow>

            {/* Rate */}
            {effectivePrice ? (
              <FlexRow centered>
                <Text small color='dark50'>
                  1 {assetLabel(baseAsset)} = {prettyNumber(effectivePrice, 8)} {assetLabel(quoteAsset)}
                </Text>
              </FlexRow>
            ) : null}
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        {disabledReason ? (
          <Text centered smaller color='dark50'>
            {disabledReason}
          </Text>
        ) : null}
        <Button label='Swap' onClick={handleSwap} disabled={Boolean(disabledReason)} />
      </ButtonsOnBottom>
      {swaps.length > 0 ? (
        <Content>
          <Padded>
            <FlexCol gap='0.25rem'>
              <Text smaller color='dark50'>
                RECENT SWAPS
              </Text>
              {swaps.map((swap) => (
                <div
                  key={swap.id}
                  onClick={() => {
                    setSelectedSwapId(swap.id)
                    navigate(Pages.AppBancoDetail)
                  }}
                  style={{ cursor: 'pointer', borderTop: '1px solid var(--dark10)', paddingTop: '0.5rem' }}
                >
                  <FlexRow between>
                    <FlexCol gap='0.125rem'>
                      <Text small bold>
                        {swap.payAsset || 'BTC'} → {swap.receiveAsset || 'BTC'}
                      </Text>
                      <Text smaller color='dark50'>
                        {swap.payAmount} → {swap.receiveAmount}
                      </Text>
                    </FlexCol>
                    <FlexCol gap='0.125rem' end>
                      <Text
                        smaller
                        bold
                        color={swap.status === 'fulfilled' ? 'green' : swap.status === 'pending' ? 'yellow' : 'red'}
                      >
                        {swap.status.charAt(0).toUpperCase() + swap.status.slice(1)}
                      </Text>
                      <Text smaller color='dark50'>
                        {prettyAgo(Math.floor(swap.createdAt / 1000))}
                      </Text>
                    </FlexCol>
                  </FlexRow>
                </div>
              ))}
            </FlexCol>
          </Padded>
        </Content>
      ) : null}
    </>
  )
}
