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
  stableStringify,
  validateCard,
  Network,
  type Market,
} from '@arkade-os/solver-discovery'
import { readSolverCards, saveSolverCards } from '@/lib/solverCards'
import { BUNDLED_CARDS } from '@/lib/swapMarkets'
import FlexRow from '@/components/FlexRow'
import FlexCol from '@/components/FlexCol'
import ErrorMessage from '@/components/Error'
import Shadow from '@/components/Shadow'
import Modal from '@/components/Modal'
import { consoleError } from '@/lib/logs'
import { prettyLongText } from '@/lib/format'
import SegmentedControl from '@/components/SegmentedControl'
import { useRemoteSolverCard } from '@/hooks/useRemoteSolverCard'
import { BackupContext } from '@/providers/backup'
import { useTranslation } from '@/providers/language'
import SolverRouting from './SolverRouting'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer'
import { Switch } from '@/components/ui/switch'
import {
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
  const others = readSolverCards().filter(
    (card) =>
      cardIdentity(card) !== cardIdentity(input) && (!replacing || cardIdentity(card) !== cardIdentity(replacing)),
  )
  if (replacing && cardIdentity(input) !== cardIdentity(replacing) && !isSolverCardEnabled(replacing))
    saveSolverCardEnabled(input, false)
  saveSolverCards([...others, input])
}

const removeSolverCard = (input: LocalCardInput) => {
  saveSolverCards(readSolverCards().filter((card) => cardIdentity(card) !== cardIdentity(input)))
}

/** A canonical card carries no `pair`; its label is derived from the asset ids'
 *  rails, as the registry reducer derives it for a published index. */
const marketLabel = (market: Market): string =>
  market.pair ??
  `${pairSideLabel(legacyMarketCorridor(market, 'base'), market.base_asset.ticker)}/${pairSideLabel(legacyMarketCorridor(market, 'quote'), market.quote_asset.ticker)}`

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

/**
 * A card compiled into the build. Read-only on purpose: it cannot be removed
 * from storage it never lived in, and an edit would silently shadow it with a
 * stored copy — a user who wants different terms adds their own card.
 */
function MarketLines({ markets }: { markets: Market[] }) {
  const { t } = useTranslation()
  if (markets.length === 0) return <TextSecondary>{t('solvers.publishedMarkets')}</TextSecondary>
  return (
    <FlexCol gap='8px'>
      {markets.map((m) => (
        <FlexCol gap='4px' key={stableStringify(m)}>
          <DetailRow label='Pair' value={marketLabel(m)} />
          <DetailRow label={t('solvers.fieldFee')} value={`${m.fee_bps} bps`} />
          <DetailRow label={t('solvers.fieldBase')} value={`${m.min_base_amount} - ${m.max_base_amount} sats`} />
          <DetailRow label={t('solvers.fieldQuote')} value={`${m.min_quote_amount} - ${m.max_quote_amount} sats`} />
        </FlexCol>
      ))}
    </FlexCol>
  )
}

function DetailRow({ label, value, copy }: { label: string; value: string; copy?: string }) {
  return (
    <FlexRow between>
      <TextSecondary>{label}</TextSecondary>
      <Text small right copy={copy}>
        {value}
      </Text>
    </FlexRow>
  )
}

function CardDetails({ input, network }: { input: LocalCardInput; network: Network }) {
  const { t } = useTranslation()
  const card = input.card as Card
  const relays = card.transports?.nostr?.relays ?? []
  const markets = card.markets ?? []
  const remote = useRemoteSolverCard(card, network)
  const [view, setView] = useState<'original' | 'current'>('original')
  const [showRaw, setShowRaw] = useState(false)
  const remoteCard =
    remote.status === 'has-remote' && remote.card && typeof remote.card === 'object' ? (remote.card as Card) : null
  const remoteMarkets = remoteCard?.markets ?? []
  const showingCurrent = view === 'current' && remoteCard !== null
  const shownCard: unknown = remote.status === 'has-remote' && view === 'current' ? remote.card : card
  return (
    <FlexCol gap='12px'>
      <FlexCol gap='2px'>
        <Text bold>{t('solvers.cardInfo')}</Text>
        <TextSecondary>{input.label}</TextSecondary>
      </FlexCol>
      <FlexCol gap='4px'>
        <DetailRow label={t('solvers.fieldName')} value={card.name} />
        <DetailRow label={t('solvers.fieldVersion')} value={String(card.version)} />
        <DetailRow label={t('common.network')} value={network} />
        {card.discovery_pubkey ? (
          <DetailRow
            label={t('solvers.fieldDiscoveryKey')}
            value={prettyLongText(card.discovery_pubkey)}
            copy={card.discovery_pubkey}
          />
        ) : null}
        {relays.length > 0 ? (
          <FlexCol gap='2px'>
            {relays.map((relay, idx) => (
              <DetailRow key={relay} label={idx === 0 ? 'Relays' : ''} value={relay} />
            ))}
          </FlexCol>
        ) : null}
      </FlexCol>
      {remoteCard !== null ? (
        <SegmentedControl
          options={['original', 'current']}
          selected={view}
          onChange={(v) => setView(v as 'original' | 'current')}
          getLabel={(v) => (v === 'current' ? t('solvers.currentLabel') : t('solvers.originalLabel'))}
        />
      ) : null}
      <Text bold>{t('solvers.marketsLabel')}</Text>
      <FlexCol gap='4px'>
        <MarketLines markets={showingCurrent ? remoteMarkets : markets} />
      </FlexCol>
      {remote.status === 'checking' ? <TextSecondary>{t('solvers.remoteChecking')}</TextSecondary> : null}
      {remote.status === 'no-relays' ? <TextSecondary>{t('solvers.remoteNoRelays')}</TextSecondary> : null}
      {remote.status === 'not-found' ? <TextSecondary>{t('solvers.remoteNotFound')}</TextSecondary> : null}
      {remote.status === 'error' ? <TextSecondary>{t('solvers.remoteError')}</TextSecondary> : null}
      <FlexCol gap='4px'>
        <Button
          onClick={() => setShowRaw((show) => !show)}
          text={showRaw ? t('solvers.hideRaw') : t('solvers.viewRaw')}
        />
        {showRaw ? (
          <div
            style={{
              maxHeight: '12rem',
              overflow: 'auto',
              border: '1px solid var(--neutral-100)',
              borderRadius: '0.5rem',
              padding: '0.5rem',
            }}
          >
            <pre
              style={{
                margin: 0,
                fontFamily: 'monospace',
                fontSize: 11,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {JSON.stringify(shownCard, null, 2)}
            </pre>
          </div>
        ) : null}
      </FlexCol>
    </FlexCol>
  )
}

function BundledCardLine({ input }: { input: LocalCardInput }) {
  const { t } = useTranslation()
  const card = input.card as Card
  const pairs = card.markets?.map(marketLabel).join(', ') ?? t('solvers.publishedMarkets')
  const [showInfo, setShowInfo] = useState(false)

  return (
    <Shadow>
      <Modal open={showInfo} onOpenChange={setShowInfo}>
        <div role='dialog' aria-modal='true' style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          <FlexCol gap='1rem'>
            <CardDetails input={input} network={(input.network ?? 'bitcoin') as Network} />
            <FlexRow centered>
              <Button onClick={() => setShowInfo(false)} text={t('common.close')} />
            </FlexRow>
          </FlexCol>
        </div>
      </Modal>
      <FlexCol padding='8px' gap='8px'>
        <FlexRow between>
          <FlexCol gap='4px'>
            <Text wrap>{input.label ?? card.name}</Text>
            <TextSecondary>{pairs}</TextSecondary>
            {card.discovery_pubkey ? <TextSecondary>{prettyLongText(card.discovery_pubkey)}</TextSecondary> : null}
          </FlexCol>
          <CardAvailability input={input} />
        </FlexRow>
        <FlexRow end minWidth='64px'>
          <Button onClick={() => setShowInfo(true)} text={t('solvers.viewInfo')} />
          <Text small color='neutral-500'>
            {t('solvers.builtIn')}
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
  const pairs = card.markets?.map(marketLabel).join(', ') ?? t('solvers.publishedMarkets')

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
      <Modal open={showInfo} onOpenChange={setShowInfo}>
        <div role='dialog' aria-modal='true' style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          <FlexCol gap='1rem'>
            <CardDetails input={input} network={(input.network ?? 'bitcoin') as Network} />
            <FlexRow centered>
              <Button onClick={() => setShowInfo(false)} text={t('common.close')} />
            </FlexRow>
          </FlexCol>
        </div>
      </Modal>
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

export default function Solvers() {
  const { aspInfo } = useContext(AspContext)
  const { backupSolverCards } = useContext(BackupContext)
  const { t } = useTranslation()

  useSyncExternalStore(subscribeSolverRouting, getSolverRoutingVersion, getSolverRoutingVersion)
  const [localCards, setLocalCards] = useState<LocalCardInput[]>()
  const [showEditor, setShowEditor] = useState(false)
  const [view, setView] = useState('priority')
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

  const storedCount = localCards?.length ?? 0
  const title =
    bundledCards.length > 0
      ? storedCount > 0
        ? t(bundledCards.length > 1 ? 'solvers.builtInPlusOwnPlural' : 'solvers.builtInPlusOwnSingular', {
            builtIn: bundledCards.length,
            own: storedCount,
          })
        : t(bundledCards.length > 1 ? 'solvers.buildShipsPlural' : 'solvers.buildShipsSingular', {
            count: bundledCards.length,
          })
      : storedCount > 0
        ? t(storedCount > 1 ? 'solvers.storedPlural' : 'solvers.storedSingular', { count: storedCount })
        : t('solvers.noStoredCards')

  return (
    <>
      <Header text={t('settings.solvers')} back />
      <Content>
        <Padded>
          <FlexCol>
            <FlexRow between>
              <Text wrap>{title}</Text>
              <Button
                buttonRef={addButtonRef}
                onClick={() => {
                  setView('cards')
                  setShowEditor(true)
                }}
                text={t('solvers.addNew')}
              />
            </FlexRow>
            <SegmentedControl
              options={['priority', 'cards']}
              selected={view}
              onChange={setView}
              getLabel={(option) => t(option === 'priority' ? 'solvers.priorityTab' : 'solvers.cardsTab')}
            />
            {view === 'cards' ? <TextSecondary>{t('solvers.pauseHint')}</TextSecondary> : null}
            {view === 'priority' ? <SolverRouting network={aspInfo.network} /> : null}
            {showEditor ? (
              <Editor toClose={() => setShowEditor(false)} onChange={handleChange} fallbackFocus={addButtonRef} />
            ) : null}
            {view === 'cards' && bundledCards.length > 0 ? (
              <FlexCol>
                {bundledCards.map((input) => (
                  <BundledCardLine key={cardIdentity(input)} input={input} />
                ))}
              </FlexCol>
            ) : null}
            {view === 'cards' && localCards && localCards.length > 0 ? (
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
