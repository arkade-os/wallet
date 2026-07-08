import { useState } from 'react'
import Text, { TextSecondary } from './Text'
import ErrorMessage from './Error'
import Button from './Button'
import Padded from './Padded'
import Content from './Content'
import FlexCol from './FlexCol'
import CenterScreen from './CenterScreen'
import ButtonsOnBottom from './ButtonsOnBottom'
import FingerprintIcon from '../icons/Fingerprint'
import { consoleError } from '../lib/logs'
import { PrfUnavailableError } from '../lib/passkey'

interface NeedsPasskeyProps {
  // runs the passkey assertion and decryption; must throw on failure
  onUnlock: () => Promise<void>
}

// Passkey equivalent of NeedsPassword: unlock is button-driven because
// WebAuthn assertions require a user gesture (notably on iOS Safari).
export default function NeedsPasskey({ onUnlock }: NeedsPasskeyProps) {
  const [error, setError] = useState('')
  const [unrecoverable, setUnrecoverable] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleUnlock = async () => {
    setError('')
    setBusy(true)
    try {
      await onUnlock()
    } catch (err) {
      consoleError(err, 'error unlocking with passkey')
      if (err instanceof PrfUnavailableError) {
        setUnrecoverable(true)
        setError("This passkey can't unlock the wallet on this device.")
      } else if (err instanceof DOMException && err.name === 'NotAllowedError') {
        // no matching credential for this site, or the user cancelled / timed out
        setError('Passkey not confirmed. Make sure you are on the same site where you created it, then try again.')
      } else if (err instanceof DOMException && err.name === 'OperationError') {
        // the passkey answered but its PRF output did not open the vault — it was
        // sealed by a different passkey/browser, so this one can never open it
        setUnrecoverable(true)
        setError("This passkey didn't produce the right key for this wallet.")
      } else if (err instanceof DOMException && err.name === 'SecurityError') {
        setError('This site cannot use your passkey (domain mismatch). Open the wallet at its normal address.')
      } else {
        setError('Could not unlock with your passkey. Try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Content>
        <Padded>
          <CenterScreen onClick={busy ? undefined : handleUnlock}>
            <FingerprintIcon />
            <Text centered>Unlock with your passkey</Text>
            {unrecoverable ? (
              <TextSecondary centered wrap>
                You can still recover this wallet: reset it and restore with your 12-word recovery phrase.
              </TextSecondary>
            ) : null}
            <FlexCol gap='0.5rem'>
              <ErrorMessage text={error} error={Boolean(error)} />
            </FlexCol>
          </CenterScreen>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button onClick={handleUnlock} label='Unlock wallet' disabled={busy} />
      </ButtonsOnBottom>
    </>
  )
}
