import { useState } from 'react'
import { isNativeHost } from '../lib/nativeBridge'
import { exportNativeStateBackup, importNativeStateBackup } from '../lib/nativeStateBackup'
import { useClearOnBackground } from '../hooks/useClearOnBackground'
import Button from './Button'
import ErrorMessage from './Error'
import FlexCol from './FlexCol'
import InputPassword from './InputPassword'
import SheetModal from './SheetModal'
import Text from './Text'
import { DrawerDescription, DrawerTitle } from './ui/drawer'

type Props = {
  mode: 'export' | 'import'
  beforeExport?: () => Promise<void>
  onExported?: () => void
  onRestored?: () => void
  onError?: (message: string) => void
}

export default function NativeStateBackup({
  mode,
  beforeExport,
  onExported,
  onError,
  onRestored = () => window.location.reload(),
}: Props) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  useClearOnBackground(() => {
    setPassword('')
    setConfirmation('')
  })
  if (!isNativeHost()) return null
  const exporting = mode === 'export'

  const close = () => {
    if (busy) return
    setOpen(false)
    setPassword('')
    setConfirmation('')
    setAccepted(false)
    setError('')
  }
  const submit = async () => {
    if (busy) return
    setError('')
    if (Array.from(password).length < 12) {
      setError('Use a backup password with at least 12 characters.')
      return
    }
    if (exporting && password !== confirmation) {
      setError('The backup passwords do not match.')
      return
    }
    if (!exporting && !accepted) {
      setError('Confirm that you have the wallet recovery details.')
      return
    }
    setBusy(true)
    try {
      if (exporting) {
        await beforeExport?.()
        await exportNativeStateBackup(password)
      } else await importNativeStateBackup(password)
      setPassword('')
      setConfirmation('')
      setOpen(false)
      setSaved(exporting)
      if (exporting) onExported?.()
      else onRestored()
    } catch (error) {
      if (error === 'USER_CANCELLED' || (error instanceof Error && error.message === 'USER_CANCELLED')) {
        setPassword('')
        setConfirmation('')
        setAccepted(false)
        setOpen(false)
        return
      }
      const message = error instanceof Error ? error.message : 'Unable to complete the wallet backup operation.'
      setError(message)
      onError?.(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button
        label={exporting ? 'Export encrypted wallet backup' : 'Restore encrypted wallet backup'}
        secondary
        onClick={() => {
          setSaved(false)
          setOpen(true)
        }}
      />
      {saved ? (
        <Text small wrap>
          Encrypted wallet backup saved. Keep its password somewhere safe.
        </Text>
      ) : null}
      <SheetModal isOpen={open} onClose={close}>
        <div className='max-h-[calc(80dvh-5rem)] w-full overflow-y-auto overscroll-contain [scrollbar-color:var(--neutral-400)_transparent] [scrollbar-width:thin]'>
          <FlexCol gap='1rem'>
            <DrawerTitle>{exporting ? 'Back up wallet' : 'Restore wallet'}</DrawerTitle>
            <DrawerDescription>
              {exporting
                ? 'Includes wallet data and pending payment recovery details. Keep the backup password safe; the app cannot recover it.'
                : 'Restore into an empty app. Software wallets still need their original wallet password. Card wallets need their Satochip; card PINs and recovery words are not included.'}
            </DrawerDescription>
            {exporting && beforeExport ? (
              <Text small wrap>
                Saving locks your wallet and pauses active payments first. Reopen the wallet afterward to resume.
              </Text>
            ) : null}
            <InputPassword
              label='Backup password'
              value={password}
              autoComplete='new-password'
              disabled={busy}
              placeholder='At least 12 characters'
              onChange={(event) => setPassword(event.target.value)}
            />
            {exporting ? (
              <InputPassword
                label='Confirm backup password'
                value={confirmation}
                autoComplete='new-password'
                disabled={busy}
                placeholder='Repeat your backup password'
                onChange={(event) => setConfirmation(event.target.value)}
              />
            ) : (
              <label className='flex items-start gap-2 text-sm'>
                <input
                  type='checkbox'
                  checked={accepted}
                  disabled={busy}
                  onChange={(event) => setAccepted(event.target.checked)}
                />
                I have the original wallet password or the matching Satochip.
              </label>
            )}
            <ErrorMessage error={Boolean(error)} text={error} />
            <Button
              label={exporting ? 'Encrypt and save file' : 'Choose backup and restore'}
              loading={busy}
              disabled={busy}
              onClick={submit}
            />
            <Button label='Cancel' secondary disabled={busy} onClick={close} />
          </FlexCol>
        </div>
      </SheetModal>
    </>
  )
}
