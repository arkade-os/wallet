import { useEffect, useState } from 'react'
import Text, { TextSecondary } from './Text'
import { prettyLongText } from '../lib/format'
import ChevronDownIcon from '../icons/ChevronDown'
import ChevronUpIcon from '../icons/ChevronUp'
import CopyIcon from '../icons/Copy'
import FlexCol from './FlexCol'
import FlexRow from './FlexRow'
import Shadow from './Shadow'
import { copyToClipboard } from '../lib/clipboard'
import CheckMarkIcon from '../icons/CheckMark'
import { useIonToast } from '@ionic/react'
import { copiedToClipboard } from '../lib/toast'
import Focusable from './Focusable'

interface ExpandAddressesProps {
  bip21uri: string
  boardingAddr: string
  offchainAddr: string
  invoice: string
  onClick: (arg0: string) => void
}

export default function ExpandAddresses({
  bip21uri,
  boardingAddr,
  offchainAddr,
  invoice,
  onClick,
}: ExpandAddressesProps) {
  const [copied, setCopied] = useState('')
  const [expand, setExpand] = useState(false)

  const [present] = useIonToast()

  useEffect(() => {
    const handleArrowDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        if (!expand) setExpand(true)
      }
      if (event.key === 'ArrowUp') {
        if (expand) setExpand(false)
      }
    }
    window.addEventListener('keydown', handleArrowDown)
    return () => window.removeEventListener('keydown', handleArrowDown)
  }, [expand])

  const handleCopy = async (value: string) => {
    await copyToClipboard(value)
    present(copiedToClipboard)
    setCopied(value)
  }

  const handleExpand = () => {
    if (!expand && bip21uri) handleCopy(bip21uri)
    setExpand(!expand)
  }

  const ExpandLine = ({ title, value }: { title: string; value: string }) => (
    <Focusable onKeyDown={() => handleCopy(value)}>
      <FlexRow between onClick={() => onClick(value)}>
        <FlexCol gap='0'>
          <TextSecondary>{title}</TextSecondary>
          <Text>{prettyLongText(value, 12)}</Text>
        </FlexCol>
        <Shadow flex onClick={() => handleCopy(value)}>
          {copied === value ? <CheckMarkIcon /> : <CopyIcon />}
        </Shadow>
      </FlexRow>
    </Focusable>
  )

  return (
    <div style={{ margin: '0 auto', maxWidth: '100%', width: '300px' }}>
      <Focusable onKeyDown={handleExpand}>
        <Shadow>
          <FlexRow between onClick={handleExpand}>
            <Text>Copy address</Text>
            {expand ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </FlexRow>
        </Shadow>
      </Focusable>
      {expand ? (
        <div style={{ padding: '1rem 0 0 0.5rem', width: '100%' }}>
          <FlexCol gap='0.21rem'>
            {bip21uri ? <ExpandLine title='BIP21' value={bip21uri} /> : null}
            {boardingAddr ? <ExpandLine title='BTC address' value={boardingAddr} /> : null}
            {offchainAddr ? <ExpandLine title='Ark address' value={offchainAddr} /> : null}
            {invoice ? <ExpandLine title='Lightning invoice' value={invoice} /> : null}
          </FlexCol>
        </div>
      ) : null}
    </div>
  )
}
