import { useContext, useEffect, useState, useSyncExternalStore, useId, useRef } from 'react'
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
  effectiveSolverRouting,
  isSolverGloballyEnabled,
  enableSolverGlobally,
} from '@/lib/solverRouting'
import { prettyLongText } from '@/lib/format'
import { solverHealth } from '@/lib/solverHealth'
import FlexCol from '@/components/FlexCol'
import Text, { TextSecondary } from '@/components/Text'
import Shadow from '@/components/Shadow'
import ErrorMessage from '@/components/Error'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer'
import ChevronDownIcon from '@/icons/ChevronDown'
import ChevronUpIcon from '@/icons/ChevronUp'
import { Switch } from '@/components/ui/switch'

const railNames = { arkade: 'Arkade', bolt11: 'Lightning', bitcoin: 'Bitcoin', eip155: 'EVM' }

type Candidate = { card: DiscoveredMarket; give: Side }
const directionLabelOf = ({ card, give }: Candidate): string => {
  const take = give === 'base' ? 'quote' : 'base'
  const giveAsset = give === 'base' ? card.base_asset : card.quote_asset
  const takeAsset = take === 'base' ? card.base_asset : card.quote_asset
  return `${railNames[marketCorridor(card, give)]} ${giveAsset.ticker} → ${railNames[marketCorridor(card, take)]} ${takeAsset.ticker}`
}

function DirectionRouting({
  candidates,
  network,
  direction,
  cooling,
}: {
  candidates: Candidate[]
  network: string
  direction: string
  cooling: readonly string[]
}) {
  const { t } = useTranslation()
  const { swaps } = useContext(SwapsContext)
  const [usage, setUsage] = useState<Record<string, number>>({})
  const [error, setError] = useState('')
  const [usageError, setUsageError] = useState(false)
  const listId = useId()
  const orderRef = useRef<HTMLSelectElement>(null)
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
  const ordered = orderSolverMarkets(candidates, {
    network,
    preferences: { ...prefs, usage, disabled: undefined, deprioritized: cooling },
  })
  const enabledIds = new Set(
    orderSolverMarkets(candidates, {
      network,
      preferences: effectiveSolverRouting(network, direction, candidates),
    }).map(({ card }) => solverId(card, network)),
  )
  const save = (next: SolverRoutingPreferences) => {
    try {
      saveSolverRouting(network, direction, next)
      setError('')
    } catch {
      setError(t('solvers.failedSave'))
    }
  }
  const canMove = (index: number, delta: number): boolean => {
    const current = ordered[index]
    const next = ordered[index + delta]
    if (!current || !next) return false
    const currentId = solverId(current.card, network)
    const nextId = solverId(next.card, network)
    return (
      currentId !== prefs.preferFirst &&
      nextId !== prefs.preferFirst &&
      cooling.includes(currentId) === cooling.includes(nextId)
    )
  }
  const move = (index: number, delta: number) => {
    if (!canMove(index, delta)) return
    const ids = ordered.map(({ card }) => solverId(card, network))
    ;[ids[index], ids[index + delta]] = [ids[index + delta], ids[index]]
    save({ ...prefs, mode: 'manual', priority: ids })
  }
  const directionLabel = directionLabelOf(candidates[0])
  const orderLabel = t(prefs.preferFirst ? 'solvers.remainingOrder' : 'solvers.orderBy')
  return (
    <FlexCol gap='12px'>
      <TextSecondary>{t('solvers.pauseHint')}</TextSecondary>
      {enabledIds.size === 0 ? <TextSecondary>{t('solvers.noneEnabled')}</TextSecondary> : null}
      <label className='flex w-full items-center justify-between gap-3'>
        <span>{t('solvers.preferFirst')}</span>
        <select
          className='max-w-[60%] rounded-lg border border-[var(--neutral-200)] bg-transparent p-2'
          aria-label={`${t('solvers.preferFirst')} ${directionLabel} (${network})`}
          value={prefs.preferFirst ?? ''}
          onChange={(event) => save({ ...prefs, preferFirst: event.target.value || undefined })}
        >
          <option value=''>{t('solvers.noPreference')}</option>
          {prefs.preferFirst && !candidates.some(({ card }) => solverId(card, network) === prefs.preferFirst) ? (
            <option value={prefs.preferFirst} disabled>
              {t('solvers.preferredUnavailable')}
            </option>
          ) : null}
          {candidates.map(({ card }) => {
            const id = solverId(card, network)
            return (
              <option key={id} value={id}>
                {card.solver} · {card.sourceType}: {card.source}
                {card.discovery_pubkey ? ` · ${prettyLongText(card.discovery_pubkey)}` : ''}
                {!enabledIds.has(id) ? ` (${t('solvers.paused')})` : ''}
                {cooling.includes(id) ? ` (${t('solvers.unreliable')})` : ''}
              </option>
            )
          })}
        </select>
      </label>
      <label className='flex w-full items-center justify-between gap-3'>
        <span>{orderLabel}</span>
        <select
          ref={orderRef}
          className='max-w-[60%] rounded-lg border border-[var(--neutral-200)] bg-transparent p-2'
          aria-label={`${orderLabel} ${directionLabel} (${network})`}
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
      <ul className='m-0 w-full list-none divide-y divide-[var(--neutral-100)] p-0'>
        {ordered.map(({ card, give }, index) => {
          const id = solverId(card, network)
          const globallyEnabled = isSolverGloballyEnabled(card, network)
          const enabled = enabledIds.has(id)
          const fee = card.solver_fee?.[give]
          const flat = fee?.flat ?? (!card.solver_fee ? card.fee_flat : undefined)
          const flatAsset = fee ? (give === 'base' ? card.base_asset : card.quote_asset) : card.quote_asset
          const flatIsBtc = flatAsset.id === 'btc' || /\/slip44:[01]$/.test(assetIdOf(flatAsset) ?? '')
          const flatLabel = flat
            ? `${fromAtomic(BigInt(flat), flatIsBtc ? 0 : flatAsset.decimals)} ${flatIsBtc ? 'sats' : flatAsset.ticker}`
            : undefined
          return (
            <li key={id} className='flex items-center gap-3 py-3'>
              {(prefs.mode ?? 'manual') === 'manual' ? (
                <span aria-hidden='true' className='w-4 shrink-0 text-sm tabular-nums text-[var(--neutral-500)]'>
                  {index + 1}
                </span>
              ) : null}
              <div className='min-w-0 flex-1' id={`${listId}-${index}`}>
                <Text wrap>{card.solver}</Text>
                {cooling.includes(id) ? <TextSecondary>{t('solvers.unreliable')}</TextSecondary> : null}
                {!enabled ? (
                  <TextSecondary>{t(globallyEnabled ? 'solvers.paused' : 'solvers.pausedEverywhere')}</TextSecondary>
                ) : null}
                {!globallyEnabled ? (
                  <button
                    type='button'
                    className='pill-base my-2 text-xs'
                    aria-label={`${t('solvers.enableCard')}: ${card.solver}`}
                    onClick={() => {
                      try {
                        enableSolverGlobally(card, network)
                        setError('')
                        orderRef.current?.focus()
                      } catch {
                        setError(t('solvers.failedSave'))
                      }
                    }}
                  >
                    {t('solvers.enableCard')}
                  </button>
                ) : null}
                <TextSecondary>
                  {card.discovery_pubkey ? prettyLongText(card.discovery_pubkey) : card.source} · {card.sourceType}
                </TextSecondary>
                <TextSecondary>
                  {fee?.bps ?? card.fee_bps} bps
                  {flatLabel ? ` + ${flatLabel}` : ''} · {t('solvers.completedCount', { count: usage[id] ?? 0 })}
                </TextSecondary>
              </div>
              <div className='flex shrink-0 items-center gap-3'>
                <Switch
                  size='lg'
                  checked={enabled}
                  disabled={!globallyEnabled}
                  aria-label={t('solvers.directionEnabled', { name: card.solver })}
                  aria-describedby={`${listId}-${index}`}
                  onCheckedChange={(next) => {
                    const disabled = new Set(prefs.disabled)
                    if (next) disabled.delete(id)
                    else disabled.add(id)
                    save({ ...prefs, disabled: [...disabled] })
                  }}
                />
                {(prefs.mode ?? 'manual') === 'manual' ? (
                  <div className='flex gap-1'>
                    <button
                      type='button'
                      className='pill-base flex h-10 w-10 items-center justify-center p-0'
                      aria-label={`${t('solvers.moveUp')} ${card.solver}`}
                      disabled={!canMove(index, -1)}
                      onClick={() => move(index, -1)}
                    >
                      <span aria-hidden='true'>
                        <ChevronUpIcon />
                      </span>
                    </button>
                    <button
                      type='button'
                      className='pill-base flex h-10 w-10 items-center justify-center p-0'
                      aria-label={`${t('solvers.moveDown')} ${card.solver}`}
                      disabled={!canMove(index, 1)}
                      onClick={() => move(index, 1)}
                    >
                      <span aria-hidden='true'>
                        <ChevronDownIcon />
                      </span>
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </FlexCol>
  )
}
export default function SolverRouting({ network }: { network: string }) {
  const { allMarkets = [] } = useContext(SwapsContext)
  const { t } = useTranslation()
  const version = useSyncExternalStore(subscribeSolverRouting, getSolverRoutingVersion, getSolverRoutingVersion)
  const [cooling, setCooling] = useState<Record<string, string[]>>({})
  const [activeDirection, setActiveDirection] = useState<string>()
  const [open, setOpen] = useState(false)
  const directions = new Map<string, Candidate[]>()
  for (const card of allMarkets) {
    for (const give of ['base', 'quote'] as const) {
      // Missing or zero payout bounds disable this direction in discovery.
      if (!sideLimits(card, give === 'base' ? 'quote' : 'base')) continue
      const direction = solverDirectionKey(card, give, network)
      const group = directions.get(direction) ?? []
      if (!group.some((candidate) => solverId(candidate.card, network) === solverId(card, network)))
        group.push({ card, give })
      directions.set(direction, group)
    }
  }
  const selected = activeDirection ? directions.get(activeDirection) : undefined
  const directionKeys = JSON.stringify([...directions.keys()])
  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const refresh = async () => {
      const entries = await Promise.all(
        (JSON.parse(directionKeys) as string[]).map(
          async (direction) => [direction, await solverHealth.deprioritized({ network, direction })] as const,
        ),
      )
      if (!active) return
      setCooling(Object.fromEntries(entries))
      if (entries.some(([, ids]) => ids.length)) timer = setTimeout(() => void refresh(), 1000)
    }
    void refresh()
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [network, directionKeys, version])
  return (
    <Drawer open={selected ? open : false} onOpenChange={setOpen}>
      <TextSecondary>{t('solvers.routingHint')}</TextSecondary>
      {directions.size === 0 ? (
        <TextSecondary>{t('solvers.noDirections')}</TextSecondary>
      ) : (
        <Shadow>
          <div className='divide-y divide-[var(--neutral-200)]'>
            {[...directions].map(([direction, candidates]) => {
              const label = directionLabelOf(candidates[0])
              const prefs = readSolverRouting(network, direction)
              const mode = prefs.mode
              const enabled = orderSolverMarkets(candidates, {
                network,
                preferences: effectiveSolverRouting(network, direction, candidates),
              })
              const enabledCount = enabled.length
              const preferred = enabled.find(({ card }) => solverId(card, network) === prefs.preferFirst)
              const preferredCooling = preferred && cooling[direction]?.includes(prefs.preferFirst ?? '')
              const modeLabel = t(
                mode === 'usage' ? 'solvers.mostUsed' : mode === 'cost' ? 'solvers.lowestCost' : 'solvers.manualOrder',
              )
              return (
                <button
                  key={direction}
                  type='button'
                  aria-label={label}
                  className='focusable flex w-full items-center gap-3 rounded-lg p-3 text-left'
                  onClick={() => {
                    setActiveDirection(direction)
                    setOpen(true)
                  }}
                >
                  <span className='min-w-0 flex-1'>
                    <span className='block break-words font-medium'>{label}</span>
                    <span className='mt-1 block text-sm text-[var(--neutral-500)]'>
                      {preferredCooling
                        ? t('solvers.preferredCooling', { mode: modeLabel })
                        : preferred
                          ? t('solvers.preferredSummary', { name: preferred.card.solver, mode: modeLabel })
                          : modeLabel}
                    </span>
                  </span>
                  <span className='shrink-0 text-sm text-[var(--neutral-500)]'>
                    {enabledCount === candidates.length
                      ? t(candidates.length === 1 ? 'solvers.solverCountSingular' : 'solvers.solverCountPlural', {
                          count: candidates.length,
                        })
                      : t('solvers.enabledCount', { enabled: enabledCount, count: candidates.length })}
                  </span>
                  <span aria-hidden='true' className='shrink-0 -rotate-90'>
                    <ChevronDownIcon />
                  </span>
                </button>
              )
            })}
          </div>
        </Shadow>
      )}
      {selected && activeDirection ? (
        <DrawerContent>
          <DrawerHeader className='shrink-0 text-left'>
            <DrawerTitle>{directionLabelOf(selected[0])}</DrawerTitle>
            <DrawerDescription>{network}</DrawerDescription>
          </DrawerHeader>
          <div className='min-h-0 overflow-y-auto overscroll-contain px-4 pb-4'>
            <DirectionRouting
              key={activeDirection}
              direction={activeDirection}
              candidates={selected}
              network={network}
              cooling={cooling[activeDirection] ?? []}
            />
          </div>
          <div className='shrink-0 border-t border-[var(--neutral-100)] px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]'>
            <button
              type='button'
              className='pill-base flex w-full items-center justify-center'
              onClick={() => setOpen(false)}
            >
              {t('common.close')}
            </button>
          </div>
        </DrawerContent>
      ) : null}
    </Drawer>
  )
}
