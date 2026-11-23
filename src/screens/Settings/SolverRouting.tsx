import { useContext, useEffect, useState, useSyncExternalStore, useId, useRef } from 'react'
import { BTC_ASSET_ID } from '@arkade-os/swap/protocol'
import {
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
import { WalletContext } from '@/providers/wallet'
import { useTranslation } from '@/providers/language'
import { marketAssetDisplay, marketLegId } from '@/lib/swapMarkets'
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
import { readOnchainSendPreference, saveOnchainSendPreference } from '@/lib/openOfferPolicy'
import FlexCol from '@/components/FlexCol'
import Text, { TextSecondary } from '@/components/Text'
import ErrorMessage from '@/components/Error'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer'
import ChevronDownIcon from '@/icons/ChevronDown'
import ChevronUpIcon from '@/icons/ChevronUp'
import ArrowIcon from '@/icons/Arrow'
import { Switch } from '@/components/ui/switch'

const railNames = { arkade: 'Arkade', bolt11: 'Lightning', bitcoin: 'Bitcoin', eip155: 'EVM' }
const walletOnchainRoute = 'wallet-onchain'
const walletOnchainLegs = { from: 'BTC · Arkade', to: 'BTC · Bitcoin' }
const walletOnchainLabel = 'Arkade BTC → Bitcoin BTC'

type Candidate = { card: DiscoveredMarket; give: Side }
export type TickerOf = (asset: DiscoveredMarket['base_asset']) => string

/** Names legs through the wallet's asset metadata, not the ticker the card's solver wrote. */
export const useMarketTicker = (network: string): TickerOf => {
  const { assetMetadataCache, isVerifiedAsset } = useContext(WalletContext)
  return (asset) =>
    marketAssetDisplay(asset, network, (id) => assetMetadataCache.get(id)?.metadata, isVerifiedAsset).ticker
}

export const directionLabelOf = ({ card, give }: Candidate, tickerOf: TickerOf): string => {
  const take = give === 'base' ? 'quote' : 'base'
  const giveAsset = give === 'base' ? card.base_asset : card.quote_asset
  const takeAsset = take === 'base' ? card.base_asset : card.quote_asset
  return `${railNames[marketCorridor(card, give)]} ${tickerOf(giveAsset)} → ${railNames[marketCorridor(card, take)]} ${tickerOf(takeAsset)}`
}

const routeLegsOf = ({ card, give }: Candidate, tickerOf: TickerOf) => {
  const take = give === 'base' ? 'quote' : 'base'
  const giveAsset = give === 'base' ? card.base_asset : card.quote_asset
  const takeAsset = take === 'base' ? card.base_asset : card.quote_asset
  return {
    from: `${tickerOf(giveAsset)} · ${railNames[marketCorridor(card, give)]}`,
    to: `${tickerOf(takeAsset)} · ${railNames[marketCorridor(card, take)]}`,
  }
}

const isWalletOnchainRoute = ({ card, give }: Candidate) => {
  const take = give === 'base' ? 'quote' : 'base'
  return (
    marketCorridor(card, give) === 'arkade' &&
    marketCorridor(card, take) === 'bitcoin' &&
    marketLegId(card.base_asset) === BTC_ASSET_ID &&
    marketLegId(card.quote_asset) === BTC_ASSET_ID
  )
}

function RouteLegs({ from, to }: { from: string; to: string }) {
  const { t } = useTranslation()
  return (
    <span className='grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-2 gap-y-1'>
      <span className='text-sm text-[var(--neutral-500)]'>{t('solvers.routeFrom')}</span>
      <span className='break-words font-medium'>{from}</span>
      <span className='text-sm text-[var(--neutral-500)]'>{t('solvers.routeTo')}</span>
      <span className='break-words font-medium'>{to}</span>
    </span>
  )
}

function RouteRow({
  from,
  to,
  label,
  summary,
  count,
  onClick,
}: {
  from: string
  to: string
  label: string
  summary: string
  count?: string
  onClick: () => void
}) {
  const summaryId = useId()
  return (
    <button
      type='button'
      aria-label={label}
      aria-describedby={summaryId}
      aria-haspopup='dialog'
      className='settings-row'
      onClick={onClick}
    >
      <span className='flex min-w-0 flex-col gap-0.5'>
        <span className='flex flex-wrap items-baseline gap-x-2 text-sm font-medium'>
          <span className='min-w-0 break-words'>{from}</span>
          <span className='inline-flex min-w-0 items-baseline gap-2'>
            <span className='text-muted-foreground' aria-hidden='true'>
              →
            </span>
            <span className='min-w-0 break-words'>{to}</span>
          </span>
        </span>
        <span id={summaryId} className='text-xs break-words text-muted-foreground'>
          {count ? `${count} · ` : ''}
          {summary}
        </span>
      </span>
      <span aria-hidden='true' className='settings-row__chevron'>
        <ArrowIcon />
      </span>
    </button>
  )
}

function OnchainPaymentMethod({ network }: { network: string }) {
  const { t } = useTranslation()
  const [error, setError] = useState(false)

  return (
    <FlexCol gap='0.5rem'>
      <label className='flex w-full items-center justify-between gap-3'>
        <span>{t('solvers.onchainMethod')}</span>
        <select
          className='min-h-11 max-w-[60%] rounded-lg border border-[var(--neutral-200)] bg-background px-2 scheme-light dark:scheme-dark'
          value={readOnchainSendPreference(network)}
          onChange={(event) => {
            try {
              saveOnchainSendPreference(network, event.target.value === 'exit' ? 'exit' : 'solver')
              setError(false)
            } catch {
              setError(true)
            }
          }}
        >
          <option value='solver'>{t('solvers.onchainMethodSolver')}</option>
          <option value='exit'>{t('solvers.onchainMethodExit')}</option>
        </select>
      </label>
      <TextSecondary>{t('solvers.onchainMethodHint')}</TextSecondary>
      <ErrorMessage error={error} text={t('solvers.failedSave')} />
    </FlexCol>
  )
}

/** The fee a direction pays: its spread, and the flat part in the leg it is charged on. */
export const feeLabelOf = ({ card, give }: Candidate, tickerOf: TickerOf): string => {
  const fee = card.solver_fee?.[give]
  const flat = fee?.flat ?? (!card.solver_fee ? card.fee_flat : undefined)
  const flatAsset = fee ? (give === 'base' ? card.base_asset : card.quote_asset) : card.quote_asset
  const flatIsBtc = marketLegId(flatAsset) === BTC_ASSET_ID
  const flatLabel = flat
    ? `${fromAtomic(BigInt(flat), flatIsBtc ? 0 : flatAsset.decimals)} ${flatIsBtc ? 'sats' : tickerOf(flatAsset)}`
    : undefined
  return `${fee?.bps ?? card.fee_bps} bps${flatLabel ? ` + ${flatLabel}` : ''}`
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
  const cardsKey = JSON.stringify(candidates.map(({ card }) => card))
  useEffect(() => {
    let active = true
    void solverUsage(network, direction, JSON.parse(cardsKey) as DiscoveredMarket[]).then(
      (next) => {
        if (active) {
          setUsage(next)
          setUsageError(false)
        }
      },
      () => {
        if (active) {
          setUsage({})
          setUsageError(true)
        }
      },
    )
    return () => {
      active = false
    }
  }, [network, direction, swaps, cardsKey])
  const prefs = readSolverRouting(network, direction)
  const ordered = orderSolverMarkets(candidates, {
    network,
    preferences: { ...prefs, usage, disabled: undefined, deprioritized: cooling },
  })
  const disabled = new Set(effectiveSolverRouting(network, direction, candidates).disabled)
  const enabledOrder = ordered.map(({ card }) => solverId(card, network)).filter((id) => !disabled.has(id))
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
  const tickerOf = useMarketTicker(network)
  const directionLabel = directionLabelOf(candidates[0], tickerOf)
  const orderLabel = t(prefs.preferFirst ? 'solvers.remainingOrder' : 'solvers.orderBy')
  const preferredMissing =
    prefs.preferFirst && !candidates.some(({ card }) => solverId(card, network) === prefs.preferFirst)
  return (
    <FlexCol gap='12px'>
      <RouteLegs {...routeLegsOf(candidates[0], tickerOf)} />
      {isWalletOnchainRoute(candidates[0]) ? <OnchainPaymentMethod network={network} /> : null}
      <TextSecondary>{t('solvers.pauseHint')}</TextSecondary>
      {enabledOrder.length === 0 ? <TextSecondary>{t('solvers.noneEnabled')}</TextSecondary> : null}
      <label className='flex w-full items-center justify-between gap-3'>
        <span>{orderLabel}</span>
        <select
          ref={orderRef}
          className='min-h-11 max-w-[60%] rounded-lg border border-[var(--neutral-200)] bg-background px-2 scheme-light dark:scheme-dark'
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
      {preferredMissing ? (
        <div className='flex items-center justify-between gap-3'>
          <TextSecondary>{t('solvers.preferredUnavailable')}</TextSecondary>
          <button
            type='button'
            className='pill-base min-h-11 px-3'
            aria-label={t('solvers.clearFirstChoice')}
            onClick={() => save({ ...prefs, preferFirst: undefined })}
          >
            {t('settings.clear')}
          </button>
        </div>
      ) : null}
      <ErrorMessage
        error={Boolean(error) || usageError}
        text={error || (usageError ? t('solvers.usageUnavailable') : '')}
      />
      <ul className='m-0 w-full list-none divide-y divide-[var(--neutral-100)] p-0'>
        {ordered.map(({ card, give }, index) => {
          const id = solverId(card, network)
          const globallyEnabled = isSolverGloballyEnabled(card, network)
          const enabled = !disabled.has(id)
          const preferred = id === prefs.preferFirst
          return (
            <li key={id} className='flex items-center gap-3 py-3'>
              {enabled && prefs.mode !== 'cost' ? (
                <span aria-hidden='true' className='w-4 shrink-0 text-sm tabular-nums text-[var(--neutral-500)]'>
                  {enabledOrder.indexOf(id) + 1}
                </span>
              ) : null}
              <div className='min-w-0 flex-1' id={`${listId}-${index}`}>
                <Text wrap>{card.solver}</Text>
                {preferred ? <TextSecondary>{t('solvers.firstChoice')}</TextSecondary> : null}
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
                  {feeLabelOf({ card, give }, tickerOf)} · {t('solvers.completedCount', { count: usage[id] ?? 0 })}
                </TextSecondary>
                {preferred || enabled ? (
                  <button
                    type='button'
                    className='pill-base mt-2 min-h-11 px-3 text-xs'
                    aria-label={`${t(preferred ? 'solvers.clearFirstChoice' : 'solvers.preferFirst')}: ${card.solver}`}
                    aria-describedby={`${listId}-${index}`}
                    onClick={() => save({ ...prefs, preferFirst: preferred ? undefined : id })}
                  >
                    {t(preferred ? 'settings.clear' : 'solvers.preferFirst')}
                  </button>
                ) : null}
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
  const tickerOf = useMarketTicker(network)
  const version = useSyncExternalStore(subscribeSolverRouting, getSolverRoutingVersion, getSolverRoutingVersion)
  const [cooling, setCooling] = useState<Record<string, string[]>>({})
  const [activeDirection, setActiveDirection] = useState<string>()
  const [open, setOpen] = useState(false)
  const directions = new Map<string, Candidate[]>()
  for (const card of allMarkets) {
    for (const give of ['base', 'quote'] as const) {
      const take = give === 'base' ? 'quote' : 'base'
      if (marketCorridor(card, give) === 'bolt11' && marketCorridor(card, take) === 'arkade') continue
      // Missing or zero payout bounds disable this direction in discovery.
      if (!sideLimits(card, take)) continue
      const direction = solverDirectionKey(card, give, network)
      const group = directions.get(direction) ?? []
      if (!group.some((candidate) => solverId(candidate.card, network) === solverId(card, network)))
        group.push({ card, give })
      directions.set(direction, group)
    }
  }
  const onchainGroup = [...directions].find(([, candidates]) => isWalletOnchainRoute(candidates[0]))
  const showWalletOnly = Boolean(network && !onchainGroup)
  const selectedDirection = activeDirection === walletOnchainRoute ? onchainGroup?.[0] : activeDirection
  const selected = selectedDirection ? directions.get(selectedDirection) : undefined
  const walletOnlySelected = showWalletOnly && activeDirection === walletOnchainRoute
  const openDirection = (direction: string) => {
    setActiveDirection(direction)
    setOpen(true)
  }
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
    <Drawer open={Boolean(selected || walletOnlySelected) && open} onOpenChange={setOpen}>
      {directions.size === 0 && !showWalletOnly ? (
        <TextSecondary>{t('solvers.noDirections')}</TextSecondary>
      ) : (
        <div className='settings-row-group'>
          {[...directions].map(([direction, candidates]) => {
            const label = directionLabelOf(candidates[0], tickerOf)
            const prefs = readSolverRouting(network, direction)
            const mode = prefs.mode
            const enabled = orderSolverMarkets(candidates, {
              network,
              preferences: effectiveSolverRouting(network, direction, candidates),
            })
            const enabledCount = enabled.length
            const preferred = candidates.find(({ card }) => solverId(card, network) === prefs.preferFirst)
            const preferredEnabled = Boolean(preferred && enabled.includes(preferred))
            const preferredCooling = preferredEnabled && cooling[direction]?.includes(prefs.preferFirst ?? '')
            const modeLabel = t(
              mode === 'usage' ? 'solvers.mostUsed' : mode === 'cost' ? 'solvers.lowestCost' : 'solvers.manualOrder',
            )
            let solverSummary = modeLabel
            if (preferred) {
              const values = { name: preferred.card.solver, mode: modeLabel }
              solverSummary = !preferredEnabled
                ? t('solvers.preferredPaused', values)
                : preferredCooling
                  ? t('solvers.preferredCooling', values)
                  : t('solvers.preferredSummary', values)
            } else if (prefs.preferFirst) {
              solverSummary = t('solvers.preferredUnavailableSummary', { mode: modeLabel })
            }
            const exitFirst = direction === onchainGroup?.[0] && readOnchainSendPreference(network) === 'exit'
            return (
              <RouteRow
                key={direction}
                {...routeLegsOf(candidates[0], tickerOf)}
                label={label}
                summary={exitFirst ? t('solvers.onchainMethodExit') : solverSummary}
                count={
                  enabledCount === candidates.length
                    ? t(candidates.length === 1 ? 'solvers.solverCountSingular' : 'solvers.solverCountPlural', {
                        count: candidates.length,
                      })
                    : t('solvers.enabledCount', { enabled: enabledCount, count: candidates.length })
                }
                onClick={() => openDirection(direction)}
              />
            )
          })}
          {showWalletOnly ? (
            <RouteRow
              {...walletOnchainLegs}
              label={walletOnchainLabel}
              summary={t('solvers.onchainMethodExit')}
              onClick={() => openDirection(walletOnchainRoute)}
            />
          ) : null}
        </div>
      )}
      {(selected && selectedDirection) || walletOnlySelected ? (
        <DrawerContent>
          <DrawerHeader className='shrink-0 text-left'>
            <DrawerTitle>{selected ? directionLabelOf(selected[0], tickerOf) : walletOnchainLabel}</DrawerTitle>
            <DrawerDescription>{network}</DrawerDescription>
          </DrawerHeader>
          <div className='min-h-0 overflow-y-auto overscroll-contain px-4 pb-4'>
            {selected && selectedDirection ? (
              <DirectionRouting
                key={selectedDirection}
                direction={selectedDirection}
                candidates={selected}
                network={network}
                cooling={cooling[selectedDirection] ?? []}
              />
            ) : (
              <FlexCol>
                <RouteLegs {...walletOnchainLegs} />
                <TextSecondary>{t('solvers.onchainMethodExit')}</TextSecondary>
              </FlexCol>
            )}
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
