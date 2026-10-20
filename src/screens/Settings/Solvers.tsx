import { useContext, useState, useEffect, useRef } from 'react'
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

const isSameCard = (card: LocalCardInput, label: string | undefined, network: Network) =>
  card.label === label && card.network === network

/** `replacing` is the label a rename vacates, folded into this one write so
 * subscribers never see the intermediate list with the card missing. */
const putSolverCard = (input: LocalCardInput, replacing?: string) => {
  const network = input.network as Network
  const others = readSolverCards().filter(
    (card) => !isSameCard(card, input.label, network) && !(replacing && isSameCard(card, replacing, network)),
  )
  saveSolverCards([...others, input])
}

const removeSolverCard = (input: LocalCardInput) => {
  saveSolverCards(readSolverCards().filter((card) => !isSameCard(card, input.label, input.network as Network)))
}

/** A canonical card carries no `pair`; its label is derived from the asset ids'
 *  rails, as the registry reducer derives it for a published index. */
const marketLabel = (market: Market): string =>
  market.pair ??
  `${pairSideLabel(legacyMarketCorridor(market, 'base'), market.base_asset.ticker)}/${pairSideLabel(legacyMarketCorridor(market, 'quote'), market.quote_asset.ticker)}`

const getCardsForNetwork = (network: Network): LocalCardInput[] => {
  return readSolverCards().filter((c) => c.network === network)
}

function Button({ onClick, text }: { onClick?: () => void; text: string }) {
  return (
    <button type='button' className='pill-base' onClick={onClick}>
      {text}
    </button>
  )
}

function Editor({ card, toClose, onChange }: { card?: Card; toClose?: () => void; onChange?: () => void }) {
  const { aspInfo } = useContext(AspContext)
  const { t } = useTranslation()

  const [error, setError] = useState<string>('')

  const editorRef = useRef<HTMLTextAreaElement>(null)

  const saveCard = (olderCard?: Card) => {
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
      putSolverCard(input, olderCard && olderCard.name !== card.name ? olderCard.name : undefined)
    } catch (err) {
      consoleError(err, 'failed to save solver card')
      setError(t('solvers.failedSave'))
      return
    }
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
    <FlexCol>
      <ErrorMessage error={Boolean(error)} text={error} />
      <textarea
        rows={21}
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
          <Button onClick={() => saveCard(card)} text={t('components.save')} />
        </FlexRow>
      ) : null}
    </FlexCol>
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
            <Text>{input.label ?? card.name}</Text>
            <TextSecondary>{pairs}</TextSecondary>
          </FlexCol>
          <FlexRow end>
            <Button onClick={() => setShowInfo(true)} text={t('solvers.viewInfo')} />
            <Text small color='neutral-500'>
              {t('solvers.builtIn')}
            </Text>
          </FlexRow>
        </FlexRow>
      </FlexCol>
    </Shadow>
  )
}

function CardLine({ input, onChange }: { input: LocalCardInput; onChange: () => void }) {
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
    <Shadow>
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
            <Text>{input.label}</Text>
            <TextSecondary>{pairs}</TextSecondary>
          </FlexCol>
          <FlexRow end>
            <Button onClick={handleShowInfo} text={t('solvers.viewInfo')} />
            <Button onClick={handleEdit} text={t('solvers.edit')} />
            <Button onClick={handleConfirmRemove} text={t('solvers.remove')} />
          </FlexRow>
        </FlexRow>
        {showEditor ? <Editor card={card} toClose={() => setShowEditor(false)} onChange={onChange} /> : null}
      </FlexCol>
    </Shadow>
  )
}

export default function Solvers() {
  const { aspInfo } = useContext(AspContext)
  const { backupSolverCards } = useContext(BackupContext)
  const { t } = useTranslation()

  const [localCards, setLocalCards] = useState<LocalCardInput[]>()
  const [showEditor, setShowEditor] = useState(false)

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
              <Text>{title}</Text>
              <Button onClick={() => setShowEditor(true)} text={t('solvers.addNew')} />
            </FlexRow>
            {showEditor ? <Editor toClose={() => setShowEditor(false)} onChange={handleChange} /> : null}
            {bundledCards.length > 0 ? (
              <FlexCol>
                {bundledCards.map((input) => (
                  <BundledCardLine key={input.label ?? (input.card as Card).name} input={input} />
                ))}
              </FlexCol>
            ) : null}
            {localCards && localCards.length > 0 ? (
              <FlexCol>
                {localCards.map((input) => (
                  <CardLine key={input.label} input={input} onChange={handleChange} />
                ))}
              </FlexCol>
            ) : null}
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
