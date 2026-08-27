import { useContext, useState, useEffect, useRef } from 'react'
import { AspContext } from '../../providers/asp'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import Header from './Header'
import Text, { TextSecondary } from '../../components/Text'
import { Card, LocalCardInput, validateCard, Network } from '@arkade-os/solver-discovery'
import { readSolverCardsFromStorage, saveSolverCardsToStorage } from '@/lib/storage'
import FlexRow from '@/components/FlexRow'
import FlexCol from '@/components/FlexCol'
import ErrorMessage from '@/components/Error'
import Shadow from '@/components/Shadow'
import Modal from '@/components/Modal'
import { AssetSwapsContext } from '@/providers/assetSwaps'
import { consoleError } from '@/lib/logs'
import { BackupContext } from '@/providers/backup'
import { BUNDLED_CARDS } from '@/lib/swapMarkets'

const addSolverCard = (input: LocalCardInput) => {
  const existingCards = readSolverCardsFromStorage()
  const withoutSameCard = existingCards.filter((card) => card.label !== input.label || card.network !== input.network)
  saveSolverCardsToStorage([...withoutSameCard, input])
}

const removeSolverCard = (input: LocalCardInput) => {
  const existingCards = readSolverCardsFromStorage()
  const withoutSameCard = existingCards.filter((card) => card.label !== input.label || card.network !== input.network)
  saveSolverCardsToStorage(withoutSameCard)
}

const getCardsForNetwork = (network: Network): LocalCardInput[] => {
  return readSolverCardsFromStorage().filter((c) => c.network === network)
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
      setError(`invalid JSON: ${(err as Error).message}`)
      return
    }
    try {
      const result = validateCard(card)
      if (!result.ok) throw new Error(result.errors.join('; '))
    } catch (err) {
      setError(`invalid card: ${(err as Error).message}`)
      return
    }
    // if the card name changed, remove the old card so it doesn't linger in storage
    if (olderCard && olderCard.name !== card.name) {
      const oldInput: LocalCardInput = {
        network: aspInfo.network as Network,
        label: olderCard.name,
        card: olderCard,
      }
      removeSolverCard(oldInput)
    }
    // save the new card
    const input: LocalCardInput = {
      network: aspInfo.network as Network,
      label: card.name,
      card,
    }
    try {
      addSolverCard(input)
    } catch (err) {
      consoleError(err, 'failed to save solver card')
      setError('Failed to save card: storage is full or unavailable.')
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
          <Button onClick={() => toClose()} text='Cancel' />
          <Button onClick={() => saveCard(card)} text='Save' />
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
function BundledCardLine({ input }: { input: LocalCardInput }) {
  const card = input.card as Card
  const pairs = card.markets?.map((m) => m.pair).join(', ') ?? ''
  const [showCard, setShowCard] = useState(false)

  const toggleShowCard = () => {
    setShowCard((s) => !s)
  }

  return (
    <Shadow>
      <FlexCol padding='8px' gap='8px'>
        <FlexRow between>
          <FlexCol gap='4px'>
            <Text>{input.label ?? card.name}</Text>
            <TextSecondary>{pairs}</TextSecondary>
          </FlexCol>
          <FlexRow end minWidth='60px'>
            <div onClick={toggleShowCard} style={{ cursor: 'pointer' }}>
              <TextSecondary>Built-in</TextSecondary>
            </div>
          </FlexRow>
        </FlexRow>
        {showCard ? <Editor card={card} /> : null}
      </FlexCol>
    </Shadow>
  )
}

function CardLine({ input, onChange }: { input: LocalCardInput; onChange: () => void }) {
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [error, setError] = useState<string>('')

  const card = input.card as Card
  const pairs = card.markets?.map((m) => m.pair).join(', ') ?? ''

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
      setError('Failed to remove card: storage is full or unavailable.')
    }
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
                  Confirm Remove
                </Text>
                <Text centered wrap color='neutral-500'>
                  Are you sure you want to remove the card "{input.label}"? This action cannot be undone.
                </Text>
              </FlexCol>
              <FlexRow centered gap='1rem'>
                <Button onClick={() => setConfirmRemove(false)} text='Cancel' />
                <Button onClick={handleRemove} text='Remove' />
              </FlexRow>
            </FlexCol>
          </div>
        )}
      </Modal>
      <FlexCol padding='8px' gap='8px'>
        <FlexRow between>
          <FlexCol gap='4px'>
            <Text>{input.label}</Text>
            <TextSecondary>{pairs}</TextSecondary>
          </FlexCol>
          <FlexRow end>
            <Button onClick={handleEdit} text='Edit' />
            <Button onClick={handleConfirmRemove} text='Remove' />
          </FlexRow>
        </FlexRow>
        {showEditor ? <Editor card={card} toClose={() => setShowEditor(false)} onChange={onChange} /> : null}
      </FlexCol>
    </Shadow>
  )
}

export default function Solvers() {
  const { aspInfo } = useContext(AspContext)
  const { runDiscovery } = useContext(AssetSwapsContext)
  const { backupSolverCards } = useContext(BackupContext)

  const [localCards, setLocalCards] = useState<LocalCardInput[]>()
  const [showEditor, setShowEditor] = useState(false)
  const [reload, setReload] = useState(false)

  // if something changed, run discovery when the component unmounts
  useEffect(() => {
    return () => {
      if (reload) runDiscovery(false)
      if (localCards) backupSolverCards(localCards).catch((err) => consoleError(err, 'failed to backup solver cards'))
    }
  }, [localCards, reload, runDiscovery])

  // fetch local cards whenever the network changes
  useEffect(() => {
    if (!aspInfo.network) return
    setLocalCards(getCardsForNetwork(aspInfo.network as Network))
  }, [aspInfo.network])

  const handleChange = () => {
    setLocalCards(getCardsForNetwork(aspInfo.network as Network))
    setReload(true)
  }

  const bundledCards = BUNDLED_CARDS.filter((c) => (c.network ?? 'bitcoin') === aspInfo.network)

  const storedCount = localCards?.length ?? 0
  const title =
    bundledCards.length > 0
      ? storedCount > 0
        ? `${bundledCards.length} built-in solver card${bundledCards.length > 1 ? 's' : ''}, plus ${storedCount} of your own.`
        : `This build ships ${bundledCards.length} solver card${bundledCards.length > 1 ? 's' : ''}; add your own to reach more solvers.`
      : storedCount > 0
        ? `You have ${storedCount} solver card${storedCount > 1 ? 's' : ''} stored in your wallet.`
        : 'You have no solver cards stored in your wallet.'

  return (
    <>
      <Header text='Solvers' back />
      <Content>
        <Padded>
          <FlexCol>
            <FlexRow between>
              <Text>{title}</Text>
              <Button onClick={() => setShowEditor(true)} text='+ Add new' />
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
