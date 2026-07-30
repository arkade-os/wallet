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

const addSolverCard = (input: LocalCardInput) => {
  const existingCards = readSolverCardsFromStorage()
  const withoutSameCard = existingCards.filter((card) => card.label !== input.label)
  saveSolverCardsToStorage([...withoutSameCard, input])
}

const removeSolverCard = (input: LocalCardInput) => {
  const existingCards = readSolverCardsFromStorage()
  const withoutSameCard = existingCards.filter((card) => card.label !== input.label)
  saveSolverCardsToStorage(withoutSameCard)
}

function Button({ onClick, text }: { onClick?: () => void; text: string }) {
  return (
    <button type='button' className='pill-base' onClick={onClick}>
      {text}
    </button>
  )
}

export default function Swaps() {
  const { aspInfo } = useContext(AspContext)

  const [error, setError] = useState<string>('')
  const [localCards, setLocalCards] = useState<LocalCardInput[]>()
  const [showEditor, setShowEditor] = useState(false)

  const editorRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!aspInfo.network) return
    setLocalCards(readSolverCardsFromStorage())
  }, [aspInfo.network])

  const clearError = () => setError('')

  const handleAddCard = () => {
    saveCard()
    setShowEditor(false)
  }

  const handleCancelEditor = () => {
    setShowEditor(false)
    clearError()
  }

  const saveCard = (olderCard?: Card) => {
    if (!editorRef.current) return
    const inputValue = editorRef.current.value.trim()
    if (!inputValue) return
    let card: Card
    try {
      card = JSON.parse(inputValue)
      const result = validateCard(card)
      if (!result.ok) throw new Error(`invalid card: ${result.errors.join('; ')}`)
    } catch (err) {
      setError(`invalid JSON: ${(err as Error).message}`)
      return
    }
    const input: LocalCardInput = {
      network: aspInfo.network as Network,
      label: card.name,
      card,
    }
    if (olderCard && olderCard.name !== card.name) {
      removeSolverCard({ network: aspInfo.network as Network, label: olderCard.name, card: olderCard })
    }
    addSolverCard(input)
    setLocalCards(readSolverCardsFromStorage())
  }

  const title =
    localCards && localCards.length > 0
      ? `You have ${localCards.length} swap card${localCards.length > 1 ? 's' : ''} stored in your wallet.`
      : 'You have no swap cards stored in your wallet.'

  function Editor({ card, onSave, onCancel }: { card?: Card; onSave?: () => void; onCancel?: () => void }) {
    const cssStyle = {
      width: '100%',
      fontFamily: 'monospace',
      fontSize: '14px',
      padding: '8px',
      borderRadius: '4px',
      border: '1px solid #ccc',
    }
    return (
      <FlexCol>
        <textarea
          rows={21}
          ref={editorRef}
          style={cssStyle}
          onFocus={clearError}
          placeholder='Enter card data here...'
          defaultValue={card ? JSON.stringify(card, null, 2) : ''}
        />
        <FlexRow>
          <Button onClick={onCancel} text='Cancel' />
          <Button onClick={onSave} text='Save' />
        </FlexRow>
      </FlexCol>
    )
  }

  function CardLine({ input }: { input: LocalCardInput }) {
    const [showEditor, setShowEditor] = useState(false)
    const [confirmRemove, setConfirmRemove] = useState(false)

    const handleSave = () => {
      saveCard(input.card as Card)
      setShowEditor(false)
    }

    const handleCancel = () => {
      setShowEditor(false)
    }

    const handleConfirmRemove = () => {
      setConfirmRemove(true)
    }

    const handleEdit = () => {
      setShowEditor((e) => !e)
    }

    const handleRemove = () => {
      removeSolverCard({ network: input.network as Network, label: input.label, card: input.card as Card })
      setLocalCards(readSolverCardsFromStorage())
    }

    const card = input.card as Card
    const pairs = card.markets.map((m) => m.pair).join(', ')

    return (
      <Shadow>
        <Modal open={confirmRemove} onOpenChange={setConfirmRemove}>
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
          {showEditor ? <Editor card={card} onSave={handleSave} onCancel={handleCancel} /> : null}
        </FlexCol>
      </Shadow>
    )
  }

  return (
    <>
      <Header text='Swaps' back />
      <Content>
        <Padded>
          <FlexCol>
            <ErrorMessage error={Boolean(error)} text={error} />
            <FlexRow between>
              <Text>{title}</Text>
              <Button onClick={() => setShowEditor(true)} text='+ Add new' />
            </FlexRow>
            {showEditor ? <Editor onSave={handleAddCard} onCancel={handleCancelEditor} /> : null}
            {localCards && localCards.length > 0 ? (
              <FlexCol>
                {localCards.map((input) => (
                  <CardLine key={input.label} input={input} />
                ))}
              </FlexCol>
            ) : null}
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
