import { useContext, useEffect, useRef, useState } from 'react'
import { mnemonicToSeed } from '@scure/bip39'
import { HDKey } from '@scure/bip32'
import { hex } from '@scure/base'
import { WalletContext } from '../providers/wallet'
import { AspContext } from '../providers/asp'
import { isMainnet } from '../lib/constants'
import {
  disconnectNativeIdentity,
  inspectNativeCard,
  nativeSignerInteraction,
  setupNativeCard,
  type NativeCardInfo,
} from '../lib/nativeBridge'
import { isNativeAndroid, isNativeMobile } from '../lib/nativePlatform'
import { useClearOnBackground } from '../hooks/useClearOnBackground'
import Button from './Button'
import ErrorMessage from './Error'
import FlexCol from './FlexCol'
import InputContainer from './InputContainer'
import SheetModal from './SheetModal'
import SatochipSetup, { type CardSetupDetails } from './SatochipSetup'
import Text from './Text'
import { DrawerDescription, DrawerTitle } from './ui/drawer'

type Props = { isOpen: boolean; onClose: () => void; onConnected: () => void; initialStatus?: NativeCardInfo }

export default function NativeCardConnectSheet({ isOpen, onClose, onConnected, initialStatus }: Props) {
  const [writing, setWriting] = useState(false)
  const close = () => {
    if (!writing) onClose()
  }
  return (
    <SheetModal isOpen={isOpen} onClose={close}>
      {isOpen ? (
        <ConnectCard initialStatus={initialStatus} onClose={close} onConnected={onConnected} onWriting={setWriting} />
      ) : null}
    </SheetModal>
  )
}

function ConnectCard({
  onClose,
  onConnected,
  initialStatus,
  onWriting,
}: Omit<Props, 'isOpen'> & { onWriting: (value: boolean) => void }) {
  const { wallet, connectHardwareWallet } = useContext(WalletContext)
  const { aspInfo } = useContext(AspContext)
  const networkAllowed = Boolean(aspInfo.network) && !isMainnet(aspInfo.network)
  const allowed = useRef(networkAllowed)
  allowed.current = networkAllowed
  const [status, setStatus] = useState(initialStatus)
  const [phase, setPhase] = useState<'checking' | 'connecting' | 'setup'>()
  const [needsCheck, setNeedsCheck] = useState(false)
  const [error, setError] = useState('')
  const active = useRef(true)
  const pending = useRef(false)
  const owned = useRef(Boolean(initialStatus))
  const completed = useRef(false)
  const connecting = useRef(false)
  const connectionAbort = useRef<AbortController>()
  const expectedSetupPublicKey = useRef<string>()

  const inspect = async (recovering = false) => {
    if (pending.current || !allowed.current) return
    pending.current = true
    owned.current = true
    setPhase('checking')
    try {
      const info = await inspectNativeCard()
      if (!active.current) return
      if (info.present) {
        setStatus(info)
        setNeedsCheck(false)
        if (!recovering || info.seeded) setError('')
      } else {
        if (!status) setStatus(info)
        setError('No card detected. Reconnect your Satochip and try again.')
      }
    } catch (error) {
      if (active.current) setError(errorText(error))
    } finally {
      pending.current = false
      if (active.current) setPhase(undefined)
    }
  }

  useEffect(() => {
    active.current = true
    const controller = new AbortController()
    connectionAbort.current = controller
    return () => {
      active.current = false
      expectedSetupPublicKey.current = undefined
      controller.abort()
      if (owned.current && !completed.current && !connecting.current)
        void disconnectNativeIdentity().catch(() => undefined)
    }
  }, [])

  useEffect(() => {
    if (!initialStatus && networkAllowed) void inspect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [networkAllowed])

  const finish = async (pin: string, expectedPublicKey = expectedSetupPublicKey.current) => {
    connecting.current = true
    try {
      await connectHardwareWallet(pin, expectedPublicKey, connectionAbort.current?.signal)
      if (!active.current) return
      completed.current = true
      onConnected()
    } finally {
      connecting.current = false
    }
  }

  const connect = async (pin: string) => {
    if (pending.current || !allowed.current) return
    pending.current = true
    owned.current = true
    setPhase('connecting')
    setError('')
    try {
      await finish(pin)
    } catch (error) {
      if (active.current) setError(errorText(error))
    } finally {
      pending.current = false
      if (active.current) setPhase(undefined)
    }
  }

  const setup = async ({ mnemonic, pin, puk }: CardSetupDetails) => {
    if (pending.current || !allowed.current || status?.seeded || !status?.present || wallet.pubkey || needsCheck) return
    pending.current = true
    owned.current = true
    setPhase('setup')
    onWriting(true)
    setError('')
    let info: (NativeCardInfo & { publicKey: string }) | undefined
    try {
      const seed = await mnemonicToSeed(mnemonic)
      let master: HDKey | undefined
      let child: HDKey | undefined
      try {
        if (!active.current || !allowed.current) return
        master = HDKey.fromMasterSeed(seed)
        child = master.derive("m/86'/1'/0'/0/0")
        if (!child.publicKey) throw new Error('Unable to prepare this card wallet.')
        expectedSetupPublicKey.current = hex.encode(child.publicKey)
        info = await setupNativeCard({ pin, seed: hex.encode(seed), ...(puk ? { puk } : {}) })
      } finally {
        child?.wipePrivateData()
        master?.wipePrivateData()
        seed.fill(0)
      }
      if (!active.current) return
      if (!info.seeded) throw new Error('Card setup did not finish. Reconnect the card to retry.')
      setStatus(info)
      if (info.publicKey !== expectedSetupPublicKey.current)
        throw new Error('This is a different card. Reconnect the card you just set up.')
      onWriting(false)
      setPhase('connecting')
      await finish(pin, info.publicKey)
    } catch (error) {
      if (!active.current) return
      setError(errorText(error))
      if (!info?.seeded) {
        setNeedsCheck(true)
        onWriting(false)
        pending.current = false
        if (nativeSignerInteraction() !== 'tap') await inspect(true)
      }
    } finally {
      pending.current = false
      onWriting(false)
      if (active.current) setPhase(undefined)
    }
  }

  const incompatible = !networkAllowed
    ? 'Satochip is available on test networks only. Switch to a test network to continue.'
    : status?.needs2FA
      ? 'Disable 2FA in your card tool before connecting this card.'
      : status?.seeded && !status.ready
        ? 'This card needs compatible firmware with Schnorr and Nostr signing enabled.'
        : !status?.seeded && wallet.pubkey
          ? 'This card is empty. Use the Satochip belonging to this wallet.'
          : ''

  return (
    <FlexCol
      gap='1rem'
      className='native-card-sheet-scroll max-h-[calc(80dvh-5rem)] w-full overflow-y-auto overscroll-contain pr-1 [scrollbar-color:var(--neutral-400)_transparent] [scrollbar-width:thin] [&>*]:shrink-0'
    >
      <DrawerTitle>
        {status?.present && !status.seeded && !wallet.pubkey ? 'Set up Satochip' : 'Connect Satochip'}
      </DrawerTitle>
      <DrawerDescription aria-live='polite'>
        {isNativeAndroid()
          ? phase === 'connecting'
            ? 'Lift your card away, then tap it against the back of your phone. Keep it there until connected.'
            : phase === 'setup'
              ? 'Lift your card away, then tap it against the back of your phone. Keep it there until setup is finished.'
              : status?.present && status.seeded
                ? 'Enter your PIN, then tap your card again to connect.'
                : 'Tap your Satochip against the back of your phone to check it.'
          : isNativeMobile()
            ? 'Hold your card against the back of your phone until finished.'
            : 'Keep your card in the reader until finished.'}
      </DrawerDescription>
      {status?.present && !incompatible ? (
        status.seeded ? (
          <CardPinForm
            busy={Boolean(phase)}
            tapToConnect={isNativeAndroid() && phase === 'connecting'}
            onConnect={connect}
          />
        ) : (
          <SatochipSetup status={status} busy={Boolean(phase)} needsCheck={needsCheck} onSetup={setup} />
        )
      ) : incompatible ? (
        <ErrorMessage error text={incompatible} />
      ) : null}
      <ErrorMessage error={Boolean(error)} text={error} />
      {needsCheck ? (
        <Text small wrap>
          Check the card before continuing; setup may already be complete.
        </Text>
      ) : null}
      {networkAllowed && (!status?.present || incompatible || needsCheck) ? (
        <Button
          label={phase === 'checking' ? 'Checking card…' : 'Check card again'}
          disabled={Boolean(phase)}
          loading={phase === 'checking'}
          onClick={() => void inspect()}
        />
      ) : null}
      <Button secondary label='Cancel' disabled={phase === 'setup'} onClick={onClose} />
    </FlexCol>
  )
}

function CardPinForm({
  busy,
  tapToConnect,
  onConnect,
}: {
  busy: boolean
  tapToConnect: boolean
  onConnect: (pin: string) => Promise<void>
}) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)
  useClearOnBackground(() => setPin(''))
  useEffect(() => input.current?.focus(), [])
  const connect = () => {
    const enteredPin = pin
    setPin('')
    if (!/^[0-9]{6,16}$/.test(enteredPin)) return setError('Use a PIN with 6 to 16 digits.')
    setError('')
    void onConnect(enteredPin)
  }
  return (
    <FlexCol gap='0.75rem'>
      <label className='text-sm' htmlFor='satochip-connect-pin'>
        Card PIN
      </label>
      <InputContainer>
        <input
          ref={input}
          id='satochip-connect-pin'
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
            if (event.key === 'Enter' && !busy) {
              event.preventDefault()
              connect()
            }
          }}
          disabled={busy}
        />
      </InputContainer>
      <ErrorMessage error={Boolean(error)} text={error} />
      <Button
        label={tapToConnect ? 'Tap card again and hold' : 'Connect and continue'}
        disabled={busy}
        loading={Boolean(busy && !tapToConnect)}
        onClick={connect}
      />
    </FlexCol>
  )
}

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unable to connect your card.'
