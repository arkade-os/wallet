import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  cancelNativeSigningPin,
  getNativeSigningPinRequest,
  registerNativeSigningPinHost,
  submitNativeSigningPin,
  subscribeNativeSigningPin,
} from '../lib/nativeSigningPin'
import Button from './Button'
import ErrorMessage from './Error'
import FlexCol from './FlexCol'
import InputContainer from './InputContainer'
import SheetModal from './SheetModal'
import { DrawerDescription, DrawerTitle } from './ui/drawer'

export default function NativeSigningPin({ unlocked }: { unlocked: boolean }) {
  const id = useSyncExternalStore(subscribeNativeSigningPin, getNativeSigningPinRequest)
  const allowed = useRef(unlocked)
  const paused = useRef(false)
  allowed.current = unlocked

  useLayoutEffect(
    () =>
      registerNativeSigningPinHost(() => allowed.current && !paused.current && document.visibilityState !== 'hidden'),
    [],
  )
  useLayoutEffect(() => {
    if (!unlocked) cancelNativeSigningPin()
  }, [unlocked])
  useEffect(() => {
    const pause = () => {
      paused.current = true
      cancelNativeSigningPin()
    }
    const resume = () => {
      paused.current = false
    }
    const visibility = () => {
      if (document.visibilityState === 'hidden') pause()
      else resume()
    }
    window.addEventListener('arkade-native-paused', pause)
    window.addEventListener('arkade-native-resumed', resume)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      window.removeEventListener('arkade-native-paused', pause)
      window.removeEventListener('arkade-native-resumed', resume)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [])

  return (
    <SheetModal
      key={id ?? 'closed'}
      isOpen={id !== undefined && unlocked}
      onClose={() => {
        if (id !== undefined) cancelNativeSigningPin(id)
      }}
    >
      {id !== undefined && unlocked ? <PinForm key={id} id={id} /> : null}
    </SheetModal>
  )
}

function PinForm({ id }: { id: number }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    input.current?.focus()
  }, [])
  const submit = () => {
    const enteredPin = pin
    setPin('')
    if (!submitNativeSigningPin(id, enteredPin)) setError('Use a PIN with 6 to 16 digits.')
  }
  return (
    <FlexCol gap='0.75rem'>
      <DrawerTitle>Unlock your card to sign</DrawerTitle>
      <DrawerDescription>Enter your card PIN, then tap and hold your Satochip when asked.</DrawerDescription>
      <label className='text-sm' htmlFor='native-signing-pin'>
        Card PIN
      </label>
      <InputContainer>
        <input
          ref={input}
          id='native-signing-pin'
          className='input w-full'
          type='password'
          inputMode='numeric'
          autoComplete='off'
          placeholder='6–16 digits'
          spellCheck={false}
          maxLength={16}
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              submit()
            }
          }}
        />
      </InputContainer>
      <ErrorMessage error={Boolean(error)} text={error} />
      <Button label='Continue to card' onClick={submit} />
      <Button
        secondary
        label='Cancel'
        onClick={() => {
          setPin('')
          cancelNativeSigningPin(id)
        }}
      />
    </FlexCol>
  )
}
