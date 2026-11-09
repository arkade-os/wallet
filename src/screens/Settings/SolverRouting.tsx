import { useContext, useEffect, useState, useSyncExternalStore } from 'react'
import {
  assetIdOf,
  fromAtomic,
  marketCorridor,
  orderSolverMarkets,
  sideLimits,
  solverDirectionKey,
  solverId,
  type DiscoveredMarket,
  type Side,
  type SolverRoutingPreferences,
} from '@arkade-os/solver-discovery'
import { SwapsContext } from '@/providers/swaps'
import { useTranslation } from '@/providers/language'
import { solverUsage } from '@/lib/swapRecords'
import {
  readSolverRouting,
  saveSolverRouting,
  subscribeSolverRouting,
  getSolverRoutingVersion,
} from '@/lib/solverRouting'
import { prettyLongText } from '@/lib/format'
import FlexCol from '@/components/FlexCol'
import FlexRow from '@/components/FlexRow'
import Text, { TextSecondary } from '@/components/Text'
import Shadow from '@/components/Shadow'
import ErrorMessage from '@/components/Error'

const railNames = { arkade: 'Arkade', bolt11: 'Lightning', bitcoin: 'Bitcoin', eip155: 'EVM' }

type Candidate = { card: DiscoveredMarket; give: Side }
function DirectionRouting({
  candidates,
  network,
  direction,
}: {
  candidates: Candidate[]
  network: string
  direction: string
}) {
  const { t } = useTranslation()
  const { swaps } = useContext(SwapsContext)
  useSyncExternalStore(subscribeSolverRouting, getSolverRoutingVersion, getSolverRoutingVersion)
  const [usage, setUsage] = useState<Record<string, number>>({})
  const [error, setError] = useState('')
  const [usageError, setUsageError] = useState(false)
  useEffect(() => {
    let active = true
    void solverUsage(network, direction).then(
      (next) => {
        if (active) {
          setUsage(next)
          setUsageError(false)
        }
      },
      () => {
        if (active) setUsageError(true)
      },
    )
    return () => {
      active = false
    }
  }, [network, direction, swaps])
  const prefs = readSolverRouting(network, direction)
  const ordered = orderSolverMarkets(candidates, { network, preferences: { ...prefs, usage } })
  const save = (next: SolverRoutingPreferences) => {
    try {
      saveSolverRouting(network, direction, next)
      setError('')
    } catch {
      setError(t('solvers.failedSave'))
    }
  }
  const move = (index: number, delta: number) => {
    const ids = ordered.map(({ card }) => solverId(card, network))
    ;[ids[index], ids[index + delta]] = [ids[index + delta], ids[index]]
    save({ mode: 'manual', priority: ids })
  }
  const first = candidates[0]
  const giveAsset = first.give === 'base' ? first.card.base_asset : first.card.quote_asset
  const takeAsset = first.give === 'base' ? first.card.quote_asset : first.card.base_asset
  const directionLabel = `${railNames[marketCorridor(first.card, first.give)]} ${giveAsset.ticker} → ${railNames[marketCorridor(first.card, first.give === 'base' ? 'quote' : 'base')]} ${takeAsset.ticker}`
  return (
    <Shadow>
      <FlexCol padding='8px' gap='8px'>
        <Text bold wrap>
          {directionLabel}
        </Text>
        <TextSecondary>{network}</TextSecondary>
        <label className='settings-row'>
          <span>{t('solvers.orderBy')}</span>
          <select
            aria-label={`${t('solvers.orderBy')} ${directionLabel} (${network})`}
            value={prefs.mode ?? 'manual'}
            onChange={(event) => save({ ...prefs, mode: event.target.value as SolverRoutingPreferences['mode'] })}
          >
            <option value='manual'>{t('solvers.manualOrder')}</option>
            <option value='usage'>{t('solvers.mostUsed')}</option>
            <option value='cost'>{t('solvers.lowestCost')}</option>
          </select>
        </label>
        {prefs.mode === 'cost' ? <TextSecondary>{t('solvers.costEstimate')}</TextSecondary> : null}
        <ErrorMessage
          error={Boolean(error) || usageError}
          text={error || (usageError ? t('solvers.usageUnavailable') : '')}
        />
        {ordered.map(({ card, give }, index) => {
          const id = solverId(card, network)
          const fee = card.solver_fee?.[give]
          const flat = fee?.flat ?? (!card.solver_fee ? card.fee_flat : undefined)
          const flatAsset = fee ? (give === 'base' ? card.base_asset : card.quote_asset) : card.quote_asset
          const flatIsBtc = flatAsset.id === 'btc' || /\/slip44:[01]$/.test(assetIdOf(flatAsset) ?? '')
          const flatLabel = flat
            ? `${fromAtomic(BigInt(flat), flatIsBtc ? 0 : flatAsset.decimals)} ${flatIsBtc ? 'sats' : flatAsset.ticker}`
            : undefined
          return (
            <FlexCol key={id} gap='4px'>
              <Text>{card.solver}</Text>
              <TextSecondary>
                {card.discovery_pubkey ? prettyLongText(card.discovery_pubkey) : card.source} · {card.sourceType}
              </TextSecondary>
              <TextSecondary>
                {fee?.bps ?? card.fee_bps} bps
                {flatLabel ? ` + ${flatLabel}` : ''} · {t('solvers.completedCount', { count: usage[id] ?? 0 })}
              </TextSecondary>
              <FlexRow>
                <button
                  type='button'
                  className='pill-base'
                  aria-label={`${t('solvers.moveUp')} ${card.solver}`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  {t('solvers.moveUp')}
                </button>
                <button
                  type='button'
                  className='pill-base'
                  aria-label={`${t('solvers.moveDown')} ${card.solver}`}
                  disabled={index === ordered.length - 1}
                  onClick={() => move(index, 1)}
                >
                  {t('solvers.moveDown')}
                </button>
              </FlexRow>
            </FlexCol>
          )
        })}
      </FlexCol>
    </Shadow>
  )
}
export default function SolverRouting({ network }: { network: string }) {
  const { allMarkets = [] } = useContext(SwapsContext)
  const directions = new Map<string, Candidate[]>()
  for (const card of allMarkets) {
    for (const give of ['base', 'quote'] as const) {
      if (!sideLimits(card, give === 'base' ? 'quote' : 'base')) continue
      const direction = solverDirectionKey(card, give, network)
      const group = directions.get(direction) ?? []
      if (!group.some((candidate) => solverId(candidate.card, network) === solverId(card, network)))
        group.push({ card, give })
      directions.set(direction, group)
    }
  }
  return (
    <>
      {[...directions].map(([direction, candidates]) => (
        <DirectionRouting
          key={`${network}:${direction}`}
          direction={direction}
          candidates={candidates}
          network={network}
        />
      ))}
    </>
  )
}
