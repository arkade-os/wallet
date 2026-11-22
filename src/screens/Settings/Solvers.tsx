import { useContext, useState, useEffect, useRef, useSyncExternalStore, type RefObject } from 'react'
import { AspContext } from '../../providers/asp'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import Header from './Header'
import Text, { TextSecondary } from '../../components/Text'
import {
  Card,
  LocalCardInput,
  legacyMarketCorridor,
  pairSideLabel,
  sideLimits,
  validateCard,
  Network,
  type DiscoveredMarket,
  type Market,
} from '@arkade-os/solver-discovery'
import { BTC_ASSET_ID } from '@arkade-os/swap/protocol'
import { readSolverCards, saveSolverCards } from '@/lib/solverCards'
import { BUNDLED_CARDS, marketLegId } from '@/lib/swapMarkets'
import FlexRow from '@/components/FlexRow'
import FlexCol from '@/components/FlexCol'
import ErrorMessage from '@/components/Error'
import Shadow from '@/components/Shadow'
import Modal from '@/components/Modal'
import Table, { type TableData } from '@/components/Table'
import { consoleError } from '@/lib/logs'
import { prettyLongText, prettyNumber } from '@/lib/format'
import { prettyAssetAmount } from '@/lib/assets'
import SegmentedControl from '@/components/SegmentedControl'
import { useRemoteSolverCard } from '@/hooks/useRemoteSolverCard'
import { BackupContext } from '@/providers/backup'
import { SwapsContext } from '@/providers/swaps'
import { useTranslation } from '@/providers/language'
import { readOpenOfferPolicy, saveOpenOfferPolicy, type OpenOfferPolicy } from '@/lib/openOfferPolicy'
import SolverRouting, { directionLabelOf, feeLabelOf, useMarketTicker, type TickerOf } from './SolverRouting'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer'
import { Switch } from '@/components/ui/switch'
import {
  carrySolverDirectionPauses,
  isSolverCardEnabled,
  saveSolverCardEnabled,
  subscribeSolverRouting,
  getSolverRoutingVersion,
} from '@/lib/solverRouting'

const cardIdentity = (input: LocalCardInput): string => {
  const card = input.card as Card
  return JSON.stringify([input.network, card.discovery_pubkey ?? [input.label ?? `local:${card.name}`, card.name]])
}

const putSolverCard = (input: LocalCardInput, replacing?: LocalCardInput) => {
  const cards = readSolverCards()
  const others = cards.filter(
    (card) =>
      cardIdentity(card) !== cardIdentity(input) && (!replacing || cardIdentity(card) !== cardIdentity(replacing)),
  )
  for (const displaced of cards.filter((card) => !others.includes(card))) carrySolverDirectionPauses(displaced, input)
  if (replacing && cardIdentity(input) !== cardIdentity(replacing) && !isSolverCardEnabled(replacing))
    saveSolverCardEnabled(input, false)
  saveSolverCards([...others, input])
}

const removeSolverCard = (input: LocalCardInput) => {
  saveSolverCards(readSolverCards().filter((card) => cardIdentity(card) !== cardIdentity(input)))
}

/** Derived as the registry reducer derives `pair`, but from the wallet's names for the legs. */
const marketLabel = (market: Market, tickerOf: TickerOf): string =>
  `${pairSideLabel(legacyMarketCorridor(market, 'base'), tickerOf(market.base_asset))}/${pairSideLabel(legacyMarketCorridor(market, 'quote'), tickerOf(market.quote_asset))}`

/** A registry lists solvers rather than cards: one read-only card per listed solver, keyed by listing. */
const registryCards = (markets: DiscoveredMarket[], network: string): [string, LocalCardInput][] => {
  const cards = new Map<string, LocalCardInput>()
  for (const market of markets) {
    if (market.sourceType !== 'registry') continue
    const key = JSON.stringify([market.source, market.solver, market.discovery_pubkey ?? null])
    const card = (cards.get(key)?.card as Card | undefined) ?? {
      name: market.solver,
      discovery_pubkey: market.discovery_pubkey,
      transports: market.transports,
      markets: [],
    }
    card.markets = [...(card.markets ?? []), market]
    cards.set(key, { network: network as Network, label: market.solver, card: card as LocalCardInput['card'] })
  }
  return [...cards.entries()]
}

const amountRange = (limits: { min: bigint; max: bigint }, asset: Market['base_asset'], tickerOf: TickerOf) =>
  marketLegId(asset) === BTC_ASSET_ID
    ? `${prettyNumber(limits.min, 0)} – ${prettyNumber(limits.max, 0)} sats`
    : `${prettyAssetAmount(limits.min, asset.decimals)} – ${prettyAssetAmount(limits.max, asset.decimals)} ${tickerOf(asset)}`

const getCardsForNetwork = (network: Network): LocalCardInput[] => {
  return readSolverCards().filter((c) => c.network === network)
}

function Button({
  onClick,
  text,
  buttonRef,
}: {
  onClick?: () => void
  text: string
  buttonRef?: RefObject<HTMLButtonElement>
}) {
  return (
    <button type='button' className='pill-base' onClick={onClick} ref={buttonRef}>
      {text}
    </button>
  )
}

function CardAvailability({ input }: { input: LocalCardInput }) {
  const { t } = useTranslation()
  const [error, setError] = useState('')
  const card = input.card as Card
  const enabled = isSolverCardEnabled(input)
  return (
    <div className='flex shrink-0 flex-col items-end gap-2'>
      <Switch
        size='lg'
        checked={enabled}
        aria-label={`${t('solvers.cardEnabled', { name: input.label ?? card.name })}${card.discovery_pubkey ? ` (${prettyLongText(card.discovery_pubkey)})` : ''}`}
        onCheckedChange={(next) => {
          try {
            saveSolverCardEnabled(input, next)
            setError('')
          } catch {
            setError(t('solvers.failedSave'))
          }
        }}
      />
      {!enabled ? <TextSecondary>{t('solvers.paused')}</TextSecondary> : null}
      {error ? (
        <div className='max-w-48'>
          <ErrorMessage error text={error} />
        </div>
      ) : null}
    </div>
  )
}

function Editor({
  card,
  original,
  toClose,
  onChange,
  fallbackFocus,
}: {
  card?: Card
  original?: LocalCardInput
  toClose?: () => void
  onChange?: () => void
  fallbackFocus: RefObject<HTMLButtonElement>
}) {
  const { aspInfo } = useContext(AspContext)
  const { t } = useTranslation()

  const [error, setError] = useState<string>('')

  const editorRef = useRef<HTMLTextAreaElement>(null)
  const previousFocus = useRef(document.activeElement)

  const saveCard = () => {
    if (!editorRef.current) return
    if (!toClose || !onChange) return
    const inputValue = editorRef.current.value.trim()
    if (!inputValue) return
    let card: Card
    try {
      card = JSON.parse(inputValue)
    } catch (err) {
      setError(t('solvers.invalidJson', { message: (err as Error).message }))
      return
    }
    try {
      const result = validateCard(card)
      if (!result.ok) throw new Error(result.errors.join('; '))
    } catch (err) {
      setError(t('solvers.invalidCard', { message: (err as Error).message }))
      return
    }
    const input: LocalCardInput = {
      network: aspInfo.network as Network,
      label: card.name,
      card,
    }
    try {
      // a rename must not leave the old label lingering in storage
      putSolverCard(input, original)
    } catch (err) {
      consoleError(err, 'failed to save solver card')
      setError(t('solvers.failedSave'))
      return
    }
    if (original && cardIdentity(input) !== cardIdentity(original)) previousFocus.current = null
    onChange()
    toClose()
  }

  const cssStyle = {
    width: '100%',
    padding: '8px',
    fontSize: '14px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    border: '1px solid #ccc',
  }

  return (
    <Drawer
      open
      onOpenChange={(open) => {
        if (!open) toClose?.()
      }}
    >
      <DrawerContent
        finalFocus={() =>
          previousFocus.current instanceof HTMLElement &&
          previousFocus.current !== document.body &&
          previousFocus.current.isConnected
            ? previousFocus.current
            : fallbackFocus.current
        }
      >
        <DrawerHeader className='shrink-0'>
          <DrawerTitle>{t('solvers.editorTitle')}</DrawerTitle>
          <DrawerDescription>{t('solvers.editorHint')}</DrawerDescription>
        </DrawerHeader>
        <div className='min-h-0 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]'>
          <FlexCol>
            <ErrorMessage error={Boolean(error)} text={error} />
            <textarea
              rows={12}
              className='max-h-[45dvh]'
              aria-label={t('solvers.editorTitle')}
              ref={editorRef}
              style={cssStyle}
              onFocus={() => setError('')}
              readOnly={!toClose || !onChange}
              placeholder='{ version: 0, name: "My Card", markets: [...] }'
              defaultValue={card ? JSON.stringify(card, null, 2) : ''}
            />
            {toClose && onChange ? (
              <FlexRow>
                <Button onClick={() => toClose()} text={t('common.cancel')} />
                <Button onClick={saveCard} text={t('components.save')} />
              </FlexRow>
            ) : null}
          </FlexCol>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

/** One row per direction the card serves: a side with no payout bounds is not offered at all. */
function MarketDirections({ markets, tickerOf }: { markets: Market[]; tickerOf: TickerOf }) {
  const { t } = useTranslation()
  const rows = markets.flatMap((market, index) =>
    (['base', 'quote'] as const).flatMap((give) => {
      const take = give === 'base' ? 'quote' : 'base'
      const limits = sideLimits(market, take)
      if (!limits) return []
      const direction = { card: market as DiscoveredMarket, give }
      return [
        {
          key: `${index}-${give}`,
          label: directionLabelOf(direction, tickerOf),
          fee: feeLabelOf(direction, tickerOf),
          range: amountRange(limits, take === 'base' ? market.base_asset : market.quote_asset, tickerOf),
        },
      ]
    }),
  )
  if (rows.length === 0) return <TextSecondary>{t('solvers.publishedMarkets')}</TextSecondary>
  return (
    <div className='table--receipt'>
      {rows.map((row) => (
        <div key={row.key} className='table-row first:border-t-0'>
          <span className='min-w-0'>
            <span className='block text-sm'>{row.label}</span>
            <span className='mt-0.5 block text-xs text-[var(--neutral-500)]'>{row.fee}</span>
          </span>
          <span className='shrink-0 text-right text-sm font-medium tabular-nums'>{row.range}</span>
        </div>
      ))}
    </div>
  )
}

function CardDetails({ input, network }: { input: LocalCardInput; network: Network }) {
  const { t } = useTranslation()
  const tickerOf = useMarketTicker(network)
  const card = input.card as Card
  const relays = card.transports?.nostr?.relays ?? []
  const remote = useRemoteSolverCard(card, network)
  const [view, setView] = useState<'original' | 'current'>('original')
  const [showRaw, setShowRaw] = useState(false)
  const remoteCard =
    remote.status === 'has-remote' && remote.card && typeof remote.card === 'object' ? (remote.card as Card) : null
  const shownCard = view === 'current' && remoteCard !== null ? remoteCard : card
  const solverRows: TableData = [
    [t('solvers.fieldName'), card.name],
    [t('common.network'), network],
    [t('solvers.fieldDiscoveryKey'), card.discovery_pubkey],
    [t('solvers.fieldRelays'), relays.join(', ')],
    [t('solvers.fieldVersion'), card.version === undefined ? undefined : String(card.version)],
  ]
  return (
    <div className='flex flex-col gap-5'>
      <Table data={solverRows} variant='receipt' />
      {remoteCard !== null ? (
        <SegmentedControl
          options={['original', 'current']}
          selected={view}
          onChange={(v) => setView(v as 'original' | 'current')}
          getLabel={(v) => (v === 'current' ? t('solvers.currentLabel') : t('solvers.originalLabel'))}
        />
      ) : null}
      <section className='settings-section'>
        <p className='settings-section-label'>{t('solvers.marketsLabel')}</p>
        <MarketDirections markets={shownCard.markets ?? []} tickerOf={tickerOf} />
        {remote.status === 'checking' ? <TextSecondary>{t('solvers.remoteChecking')}</TextSecondary> : null}
        {remote.status === 'no-relays' ? <TextSecondary>{t('solvers.remoteNoRelays')}</TextSecondary> : null}
        {remote.status === 'not-found' ? <TextSecondary>{t('solvers.remoteNotFound')}</TextSecondary> : null}
        {remote.status === 'error' ? <TextSecondary>{t('solvers.remoteError')}</TextSecondary> : null}
      </section>
      <section className='settings-section items-start'>
        <Button
          onClick={() => setShowRaw((show) => !show)}
          text={showRaw ? t('solvers.hideRaw') : t('solvers.viewRaw')}
        />
        {showRaw ? (
          <pre className='table--receipt m-0 max-h-48 w-full overflow-auto p-3 font-mono text-[11px] break-words whitespace-pre-wrap'>
            {JSON.stringify(shownCard, null, 2)}
          </pre>
        ) : null}
      </section>
    </div>
  )
}

function CardInfo({
  input,
  open,
  onOpenChange,
}: {
  input: LocalCardInput
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const network = (input.network ?? 'bitcoin') as Network
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className='shrink-0 text-left'>
          <DrawerTitle>{input.label ?? (input.card as Card).name}</DrawerTitle>
          <DrawerDescription>{t('solvers.cardInfo')}</DrawerDescription>
        </DrawerHeader>
        <div className='min-h-0 overflow-y-auto overscroll-contain px-4 pb-4'>
          {open ? <CardDetails input={input} network={network} /> : null}
        </div>
        <div className='shrink-0 border-t border-[var(--neutral-100)] px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]'>
          <button
            type='button'
            className='pill-base flex w-full items-center justify-center'
            onClick={() => onOpenChange(false)}
          >
            {t('common.close')}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

/**
 * A card this wallet did not store: compiled into the build, or listed by the
 * network's registry. Read-only on purpose: it cannot be removed from storage
 * it never lived in, and an edit would silently shadow it with a stored copy —
 * a user who wants different terms adds their own card.
 */
function ReadOnlyCardLine({ input, badge, pausable }: { input: LocalCardInput; badge: string; pausable: boolean }) {
  const { t } = useTranslation()
  const card = input.card as Card
  const tickerOf = useMarketTicker(input.network ?? 'bitcoin')
  const pairs = card.markets?.map((m) => marketLabel(m, tickerOf)).join(', ') ?? t('solvers.publishedMarkets')
  const [showInfo, setShowInfo] = useState(false)

  return (
    <Shadow>
      <CardInfo input={input} open={showInfo} onOpenChange={setShowInfo} />
      <FlexCol padding='8px' gap='8px'>
        <FlexRow between>
          <FlexCol gap='4px'>
            <Text wrap>{input.label ?? card.name}</Text>
            <TextSecondary>{pairs}</TextSecondary>
            {card.discovery_pubkey ? <TextSecondary>{prettyLongText(card.discovery_pubkey)}</TextSecondary> : null}
          </FlexCol>
          {pausable ? <CardAvailability input={input} /> : null}
        </FlexRow>
        <FlexRow end minWidth='10rem'>
          <Button onClick={() => setShowInfo(true)} text={t('solvers.viewInfo')} />
          <Text small color='neutral-500'>
            {badge}
          </Text>
        </FlexRow>
      </FlexCol>
    </Shadow>
  )
}

function CardLine({
  input,
  onChange,
  fallbackFocus,
}: {
  input: LocalCardInput
  onChange: () => void
  fallbackFocus: RefObject<HTMLButtonElement>
}) {
  const { t } = useTranslation()
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [showEditor, setShowEditor] = useState(false)

  const [showInfo, setShowInfo] = useState(false)
  const [error, setError] = useState<string>('')

  const card = input.card as Card
  const tickerOf = useMarketTicker(input.network ?? 'bitcoin')
  const pairs = card.markets?.map((m) => marketLabel(m, tickerOf)).join(', ') ?? t('solvers.publishedMarkets')

  const handleConfirmRemove = () => {
    setConfirmRemove(true)
  }

  const handleEdit = () => {
    setShowEditor((e) => !e)
  }

  const handleRemove = () => {
    try {
      removeSolverCard(input)
      onChange()
    } catch (err) {
      consoleError(err, 'failed to remove solver card')
      setError(t('solvers.failedRemove'))
    }
  }

  const handleShowInfo = () => {
    setShowInfo((e) => !e)
    setShowEditor(false)
  }

  return (
    <Shadow testId='stored-solver-card'>
      <Modal open={confirmRemove} onOpenChange={setConfirmRemove}>
        {error ? (
          <ErrorMessage error={Boolean(error)} text={error} />
        ) : (
          <div role='dialog' aria-modal='true'>
            <FlexCol gap='1.5rem'>
              <FlexCol centered gap='0.5rem'>
                <Text big bold>
                  {t('solvers.confirmRemove')}
                </Text>
                <Text centered wrap color='neutral-500'>
                  {t('solvers.removeWarning', { label: input.label ?? '' })}
                </Text>
              </FlexCol>
              <FlexRow centered gap='1rem'>
                <Button onClick={() => setConfirmRemove(false)} text={t('common.cancel')} />
                <Button onClick={handleRemove} text={t('solvers.remove')} />
              </FlexRow>
            </FlexCol>
          </div>
        )}
      </Modal>
      <CardInfo input={input} open={showInfo} onOpenChange={setShowInfo} />
      <FlexCol padding='8px' gap='8px'>
        <FlexRow between>
          <FlexCol gap='4px'>
            <Text wrap>{input.label}</Text>
            <TextSecondary>{pairs}</TextSecondary>
            {card.discovery_pubkey ? <TextSecondary>{prettyLongText(card.discovery_pubkey)}</TextSecondary> : null}
          </FlexCol>
          <CardAvailability input={input} />
        </FlexRow>
        <FlexRow end>
          <Button onClick={handleShowInfo} text={t('solvers.viewInfo')} />
          <Button onClick={handleEdit} text={t('solvers.edit')} />
          <Button onClick={handleConfirmRemove} text={t('solvers.remove')} />
        </FlexRow>
        {showEditor ? (
          <Editor
            card={card}
            original={input}
            toClose={() => setShowEditor(false)}
            onChange={onChange}
            fallbackFocus={fallbackFocus}
          />
        ) : null}
      </FlexCol>
    </Shadow>
  )
}

function OpenOfferSettings({ network }: { network: string }) {
  const { t } = useTranslation()
  const [error, setError] = useState(false)

  return (
    <FlexCol gap='0.5rem'>
      <label className='flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--neutral-200)] p-3'>
        <span>{t('swap.openOffers')}</span>
        <select
          className='min-h-11 max-w-[60%] rounded-lg border border-[var(--neutral-200)] bg-transparent px-2'
          value={readOpenOfferPolicy(network)}
          onChange={(event) => {
            try {
              saveOpenOfferPolicy(network, event.target.value as OpenOfferPolicy)
              setError(false)
            } catch {
              setError(true)
            }
          }}
        >
          <option value='ask'>{t('solvers.openOffersAsk')}</option>
          <option value='when-needed'>{t('solvers.openOffersWhenNeeded')}</option>
          <option value='off'>{t('solvers.openOffersOff')}</option>
        </select>
      </label>
      <TextSecondary>{t('swap.openOffersPrivacy')}</TextSecondary>
      <ErrorMessage error={error} text={t('solvers.failedSave')} />
    </FlexCol>
  )
}

export default function Solvers() {
  const { aspInfo } = useContext(AspContext)
  const { allMarkets = [] } = useContext(SwapsContext)
  const { backupSolverCards } = useContext(BackupContext)
  const { t } = useTranslation()

  useSyncExternalStore(subscribeSolverRouting, getSolverRoutingVersion, getSolverRoutingVersion)
  const [localCards, setLocalCards] = useState<LocalCardInput[]>()
  const [showEditor, setShowEditor] = useState(false)
  const [view, setView] = useState('routes')
  const addButtonRef = useRef<HTMLButtonElement>(null)

  // The card store notifies discovery on write, so this only owes the backup;
  // on unmount to keep it at one Nostr write per visit rather than per edit.
  // `backupSolverCards` is deliberately not a dep: it changes identity with the
  // backup context, and re-running on that is the per-render churn this avoids.
  useEffect(() => {
    return () => {
      if (localCards) backupSolverCards(localCards).catch((err) => consoleError(err, 'failed to backup solver cards'))
    }
  }, [localCards])

  // fetch local cards whenever the network changes
  useEffect(() => {
    if (!aspInfo.network) return
    setLocalCards(getCardsForNetwork(aspInfo.network as Network))
  }, [aspInfo.network])

  const handleChange = () => {
    setLocalCards(getCardsForNetwork(aspInfo.network as Network))
  }

  const bundledCards = BUNDLED_CARDS.filter((c) => (c.network ?? 'bitcoin') === aspInfo.network)
  const listedCards = registryCards(allMarkets, aspInfo.network)

  const storedCount = localCards?.length ?? 0

  let title = ''

  if (bundledCards.length === 0) {
    if (storedCount === 0) {
      title = t('solvers.noStoredCards')
    } else if (storedCount === 1) {
      title = t('solvers.storedSingular', { count: storedCount })
    } else {
      title = t('solvers.storedPlural', { count: storedCount })
    }
  } else if (bundledCards.length === 1) {
    if (storedCount === 0) {
      title = t('solvers.buildShipsSingular', { count: bundledCards.length })
    } else if (storedCount === 1) {
      title = t('solvers.builtInSingularPlusOwnSingular', { builtIn: bundledCards.length, own: storedCount })
    } else {
      title = t('solvers.builtInSingularPlusOwnPlural', { builtIn: bundledCards.length, own: storedCount })
    }
  } else {
    if (storedCount === 0) {
      title = t('solvers.buildShipsPlural', { count: bundledCards.length })
    } else if (storedCount === 1) {
      title = t('solvers.builtInPluralPlusOwnSingular', { builtIn: bundledCards.length, own: storedCount })
    } else {
      title = t('solvers.builtInPluralPlusOwnPlural', { builtIn: bundledCards.length, own: storedCount })
    }
  }

  return (
    <>
      <Header text={t('settings.solvers')} back />
      <Content>
        <Padded>
          <FlexCol>
            <SegmentedControl
              options={['routes', 'providers']}
              selected={view}
              onChange={setView}
              getLabel={(option) => t(option === 'routes' ? 'solvers.priorityTab' : 'solvers.cardsTab')}
            />
            {view === 'providers' ? (
              <>
                <FlexRow between>
                  <Text wrap>{title}</Text>
                  <Button buttonRef={addButtonRef} onClick={() => setShowEditor(true)} text={t('solvers.addNew')} />
                </FlexRow>
                <TextSecondary>{t('solvers.pauseHint')}</TextSecondary>
              </>
            ) : (
              <>
                <SolverRouting network={aspInfo.network} />
                {aspInfo.network ? <OpenOfferSettings key={aspInfo.network} network={aspInfo.network} /> : null}
              </>
            )}
            {showEditor ? (
              <Editor toClose={() => setShowEditor(false)} onChange={handleChange} fallbackFocus={addButtonRef} />
            ) : null}
            {view === 'providers' && bundledCards.length + listedCards.length > 0 ? (
              <FlexCol>
                {bundledCards.map((input) => (
                  <ReadOnlyCardLine key={cardIdentity(input)} input={input} badge={t('solvers.builtIn')} pausable />
                ))}
                {listedCards.map(([key, input]) => (
                  <ReadOnlyCardLine
                    key={key}
                    input={input}
                    badge={t('solvers.fromRegistry')}
                    pausable={Boolean((input.card as Card).discovery_pubkey)}
                  />
                ))}
              </FlexCol>
            ) : null}
            {view === 'providers' && localCards && localCards.length > 0 ? (
              <FlexCol>
                {localCards.map((input) => (
                  <CardLine
                    key={cardIdentity(input)}
                    input={input}
                    onChange={handleChange}
                    fallbackFocus={addButtonRef}
                  />
                ))}
              </FlexCol>
            ) : null}
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
