import { useContext, useEffect, useState } from 'react'
import Header from './Header'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import Content from '../../components/Content'
import ErrorMessage from '../../components/Error'
import FlexCol from '../../components/FlexCol'
import FlexRow from '../../components/FlexRow'
import Padded from '../../components/Padded'
import Paste from '../../components/Paste'
import Shadow from '../../components/Shadow'
import Text, { TextSecondary } from '../../components/Text'
import WarningBox from '../../components/Warning'
import { Textarea } from '@/components/ui/textarea'
import { AspContext } from '../../providers/asp'
import { AssetSwapsContext } from '../../providers/assetSwaps'
import { useToast } from '../../components/Toast'
import { prettyAgo } from '../../lib/format'
import { getPinnedSolverCards, pinSolverCard, unpinSolverCard, type PinnedSolverCard } from '../../lib/swap/solverCards'
import { isNetwork } from '@arkade-os/solver-discovery'

// hero component to explain what manual solver registration is for
function Hero() {
  return (
    <FlexCol gap='0.5rem'>
      <Text bold>Add a solver manually</Text>
      <Text small thin wrap>
        Swap markets normally come from the public solver registry. A solver that prefers to stay unlisted can hand you
        its card.json instead — paste it below to use its markets on this wallet only.
      </Text>
    </FlexCol>
  )
}

function PinnedCard({ pinned, onRemove }: { pinned: PinnedSolverCard; onRemove: (name: string) => void }) {
  const { card } = pinned
  const pairs = card.markets.map((market) => market.pair).join(', ')
  return (
    <Shadow lighter fat testId={`pinned-solver-${card.name}`}>
      <FlexCol gap='0.5rem'>
        <FlexRow between>
          <Text>{card.name}</Text>
          <Text color='neutral-500' tiny>
            added {prettyAgo(pinned.addedAt)}
          </Text>
        </FlexRow>
        <hr className='dashed' />
        <FlexRow between>
          <TextSecondary>
            {card.markets.length} {card.markets.length === 1 ? 'market' : 'markets'}: {pairs}
          </TextSecondary>
          <button type='button' onClick={() => onRemove(card.name)} aria-label={`Remove solver ${card.name}`}>
            <Text tiny>Remove</Text>
          </button>
        </FlexRow>
      </FlexCol>
    </Shadow>
  )
}

export default function Solvers() {
  const { aspInfo } = useContext(AspContext)
  const { refreshMarkets } = useContext(AssetSwapsContext)
  const { toast } = useToast()

  // discovery only understands the SDK's network names — anything else (e.g.
  // a testnet ASP) must not offer the form, or pins would persist but never
  // produce a market
  const network = isNetwork(aspInfo.network) ? aspInfo.network : undefined

  const [cardJson, setCardJson] = useState('')
  const [error, setError] = useState('')
  const [pinned, setPinned] = useState<PinnedSolverCard[]>([])

  // aspInfo.network resolves async on boot, so the list must re-read when it
  // lands (or changes) rather than freeze whatever value the screen mounted with
  useEffect(() => {
    setPinned(network ? getPinnedSolverCards(network) : [])
  }, [network])

  const handleAdd = () => {
    if (!network) return
    let parsed: unknown
    try {
      parsed = JSON.parse(cardJson)
    } catch {
      setError('Not valid JSON — paste the solver card.json exactly as published')
      return
    }
    const result = pinSolverCard(network, parsed)
    if (!result.ok) {
      setError(`Invalid card: ${result.errors.slice(0, 3).join('; ')}`)
      return
    }
    setError('')
    setCardJson('')
    setPinned(getPinnedSolverCards(network))
    refreshMarkets()
    toast(`Solver "${result.card.name}" added`)
  }

  const handleRemove = (name: string) => {
    if (!network) return
    unpinSolverCard(network, name)
    setPinned(getPinnedSolverCards(network))
    refreshMarkets()
    toast(`Solver "${name}" removed`)
  }

  const handlePaste = (data: string) => {
    setError('')
    setCardJson(data)
  }

  if (!network) {
    return (
      <>
        <Header text='Solvers' back />
        <Content>
          <Padded>
            <WarningBox
              text={
                aspInfo.network
                  ? 'Solver cards are not supported on this network.'
                  : 'Connect to a server first to manage solvers for its network.'
              }
            />
          </Padded>
        </Content>
      </>
    )
  }

  return (
    <>
      <Header text='Solvers' back />
      <Content>
        <Padded>
          <FlexCol gap='1rem' padding='0 0 24px 0'>
            <Shadow fat purple>
              <Hero />
            </Shadow>
            {pinned.map((entry) => (
              <PinnedCard key={entry.card.name} pinned={entry} onRemove={handleRemove} />
            ))}
            <FlexCol gap='0.5rem'>
              <FlexRow between>
                <Text small>Solver card.json for {network}</Text>
                <Paste onPaste={handlePaste} />
              </FlexRow>
              <Textarea
                aria-label='Solver card JSON'
                className='min-h-40 font-mono'
                onChange={(event) => {
                  setError('')
                  setCardJson(event.target.value)
                }}
                placeholder='{ "version": 0, "name": "my-solver", "markets": [ … ] }'
                value={cardJson}
              />
              <ErrorMessage error={Boolean(error)} text={error} />
            </FlexCol>
            <WarningBox text='Only add cards from solvers you trust: prices come from the feed URL the card advertises.' />
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button onClick={handleAdd} label='Add solver' disabled={!cardJson.trim()} />
      </ButtonsOnBottom>
    </>
  )
}
