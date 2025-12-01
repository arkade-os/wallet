import { useState } from 'react'
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

  const handleCopy = async (value: string) => {
    await copyToClipboard(value)
    present(copiedToClipboard)
    setCopied(value)
  }

  const handleExpand = () => {
    if (!expand && bip21uri) handleCopy(bip21uri)
    setExpand(!expand)
  }

  const ExpandLine = ({ testId, title, value }: { testId?: string; title: string; value: string }) => (
    <FlexRow between onClick={() => onClick(value)} testId={`address-line-${testId}`}>
      <FlexCol gap='0'>
        <TextSecondary>{title}</TextSecondary>
        <Text>{prettyLongText(value, 12)}</Text>
      </FlexCol>
      <Shadow flex onClick={() => handleCopy(value)}>
        {copied === value ? <CheckMarkIcon /> : <CopyIcon />}
      </Shadow>
    </FlexRow>
  )

  return (
    <div style={{ margin: '0 auto', maxWidth: '100%', width: '300px' }}>
      <Shadow>
        <FlexRow between onClick={handleExpand}>
          <Text>Copy address</Text>
          {expand ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </FlexRow>
      </Shadow>
      {expand ? (
        <div style={{ padding: '1rem 0 0 0.5rem', width: '100%' }}>
          <FlexCol gap='0.21rem'>
            {bip21uri ? <ExpandLine testId='bip21' title='BIP21' value={bip21uri} /> : null}
            {boardingAddr ? <ExpandLine testId='btc' title='BTC address' value={boardingAddr} /> : null}
            {offchainAddr ? <ExpandLine testId='ark' title='Ark address' value={offchainAddr} /> : null}
            {invoice ? <ExpandLine testId='lightning' title='Lightning invoice' value={invoice} /> : null}
          </FlexCol>
        </div>
      ) : null}
    </div>
  )
}
