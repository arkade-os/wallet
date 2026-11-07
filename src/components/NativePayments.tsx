import { useContext, useState } from 'react'
import { WalletContext } from '../providers/wallet'
import { SwapsContext } from '../providers/swaps'
import { isNativeWallet } from '../lib/nativeWallet'
import Button from './Button'
import ErrorMessage from './Error'
import FlexCol from './FlexCol'
import Text from './Text'
import { canRequestNativeSigning } from '../lib/nativeSignerAvailability'
import NativeCardConnectSheet from './NativeCardConnectSheet'

export default function NativePayments() {
  const { wallet } = useContext(WalletContext)
  const { paymentsPaused, resumePendingPayments } = useContext(SwapsContext)
  const [resuming, setResuming] = useState(false)
  const [error, setError] = useState('')
  const [cardSheetOpen, setCardSheetOpen] = useState(false)
  if (!isNativeWallet(wallet) || !paymentsPaused) return null

  const resume = async () => {
    if (!canRequestNativeSigning(wallet.pubkey)) {
      setCardSheetOpen(true)
      return
    }
    setResuming(true)
    setError('')
    try {
      await resumePendingPayments()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to resume pending payments.')
    } finally {
      setResuming(false)
    }
  }
  return (
    <FlexCol gap='0.5rem'>
      <Text bold wrap>
        Pending payments are paused
      </Text>
      <Text color='neutral-600' small wrap>
        Connect your Satochip to resume claims and refunds. Keep the app open and the card available until they finish.
      </Text>
      <ErrorMessage error={Boolean(error)} text={error} />
      <Button
        label={resuming ? 'Resuming payments…' : 'Resume pending payments'}
        disabled={resuming}
        loading={resuming}
        onClick={resume}
        secondary
      />
      <NativeCardConnectSheet
        isOpen={cardSheetOpen}
        onClose={() => setCardSheetOpen(false)}
        onConnected={() => {
          setCardSheetOpen(false)
          setError('')
        }}
      />
    </FlexCol>
  )
}
