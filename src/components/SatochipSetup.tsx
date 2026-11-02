import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { generateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'
import { hex } from '@scure/base'
import type { NativeCardInfo } from '../lib/nativeBridge'
import { useClearOnBackground } from '../hooks/useClearOnBackground'
import Button from './Button'
import ErrorMessage from './Error'
import FlexCol from './FlexCol'
import InputContainer from './InputContainer'
import Text from './Text'

export type CardSetupDetails = { mnemonic: string; pin: string; puk?: string }

export default function SatochipSetup({
  status,
  busy,
  needsCheck = false,
  onSetup,
}: {
  status: NativeCardInfo
  busy: boolean
  needsCheck?: boolean
  onSetup: (details: CardSetupDetails) => Promise<void>
}) {
  const [mnemonic, setMnemonic] = useState('')
  const [puk, setPuk] = useState('')
  const [saved, setSaved] = useState(false)
  const [step, setStep] = useState<'backup' | 'pin'>('backup')
  const [pin, setPin] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const pinInput = useRef<HTMLInputElement>(null)
  useClearOnBackground(() => {
    setPin('')
    setConfirmation('')
  })
  useEffect(() => {
    if (step === 'pin') pinInput.current?.focus()
  }, [step])

  const create = () => {
    setMnemonic(generateMnemonic(wordlist))
    if (!status.setupDone) setPuk(hex.encode(crypto.getRandomValues(new Uint8Array(8))))
  }

  const changeStep = (next: 'backup' | 'pin', event: MouseEvent<HTMLButtonElement>) => {
    setStep(next)
    const scroller = event.currentTarget.closest<HTMLElement>('.native-card-sheet-scroll')
    if (scroller) scroller.scrollTop = 0
  }

  const setup = () => {
    const enteredPin = pin
    const repeatedPin = confirmation
    setPin('')
    setConfirmation('')
    if (!/^[0-9]{6,16}$/.test(enteredPin)) return setError('Use a PIN with 6 to 16 digits.')
    if (!status.setupDone && enteredPin !== repeatedPin) return setError('The PINs do not match.')
    setError('')
    void onSetup({ mnemonic, pin: enteredPin, ...(!status.setupDone && puk ? { puk } : {}) })
  }

  if (!mnemonic)
    return (
      <FlexCol gap='0.75rem'>
        <Text wrap>This card has no wallet yet.</Text>
        <Button label='Create card wallet' onClick={create} />
      </FlexCol>
    )

  return (
    <FlexCol gap='0.75rem'>
      {step === 'backup' ? (
        <>
          <Text wrap>Write down these recovery words before continuing.</Text>
          <ol className='grid w-full list-inside list-decimal grid-cols-3 gap-2 rounded-xl bg-neutral-100 p-4 text-sm'>
            {mnemonic.split(' ').map((word, index) => (
              // eslint-disable-next-line react/no-array-index-key -- Recovery words have fixed positions.
              <li key={index}>{word}</li>
            ))}
          </ol>
          {puk ? (
            <div className='w-full rounded-xl bg-neutral-100 p-4'>
              <Text small wrap>
                PIN recovery code
              </Text>
              <p className='mt-1 font-mono tracking-wide'>{puk}</p>
            </div>
          ) : null}
          <label className='flex items-start gap-3 text-sm'>
            <input
              type='checkbox'
              checked={saved}
              onChange={(event) => setSaved(event.target.checked)}
              className='mt-1'
            />
            {puk ? 'I saved the recovery words and PIN recovery code.' : 'I saved the recovery words.'}
          </label>
          <Button label='Continue' disabled={!saved} onClick={(event) => changeStep('pin', event)} />
        </>
      ) : (
        <>
          <label className='w-full text-sm' htmlFor='satochip-setup-pin'>
            {status.setupDone ? 'Card PIN' : 'Choose a PIN'}
          </label>
          <InputContainer>
            <input
              ref={pinInput}
              id='satochip-setup-pin'
              className='input w-full'
              type='password'
              inputMode='numeric'
              autoComplete='off'
              placeholder='6–16 digits'
              spellCheck={false}
              maxLength={16}
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              disabled={busy || needsCheck}
            />
          </InputContainer>
          {!status.setupDone ? (
            <>
              <label className='w-full text-sm' htmlFor='satochip-confirm-pin'>
                Confirm PIN
              </label>
              <InputContainer>
                <input
                  id='satochip-confirm-pin'
                  className='input w-full'
                  type='password'
                  inputMode='numeric'
                  autoComplete='off'
                  placeholder='Repeat PIN'
                  spellCheck={false}
                  maxLength={16}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  disabled={busy || needsCheck}
                />
              </InputContainer>
            </>
          ) : null}
          <ErrorMessage error={Boolean(error)} text={error} />
          <Button label='Set up card' disabled={busy || needsCheck} loading={busy} onClick={setup} />
          <Button
            secondary
            label='Review recovery backup'
            disabled={busy}
            onClick={(event) => changeStep('backup', event)}
          />
        </>
      )}
    </FlexCol>
  )
}
