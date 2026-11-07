import { useState } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WalletContext } from '../../providers/wallet'
import { AspContext } from '../../providers/asp'
import { mockAspContextValue, mockWalletContextValue } from '../screens/mocks'
import type { NativeCardInfo } from '../../lib/nativeBridge'
import NativeCardConnectSheet from '../../components/NativeCardConnectSheet'

const mocks = vi.hoisted(() => ({
  android: false,
  tap: false,
  disconnect: vi.fn(),
  inspect: vi.fn(),
  setup: vi.fn(),
  connect: vi.fn(),
}))
vi.mock('../../lib/nativeBridge', () => ({
  isNativeHost: () => false,
  nativeSignerInteraction: () => (mocks.tap ? 'tap' : 'connection'),
  disconnectNativeIdentity: mocks.disconnect,
  inspectNativeCard: mocks.inspect,
  setupNativeCard: mocks.setup,
}))
vi.mock('../../lib/nativePlatform', () => ({
  isNativeAndroid: () => mocks.android,
  isNativeMobile: () => mocks.android || mocks.tap,
}))
vi.mock('@scure/bip39', async () => {
  const actual = await vi.importActual<typeof import('@scure/bip39')>('@scure/bip39')
  return { ...actual, generateMnemonic: () => 'abandon '.repeat(11) + 'about' }
})

const readyCard: NativeCardInfo = {
  present: true,
  setupDone: true,
  seeded: true,
  ready: true,
  version: '0.16-0.1',
  needs2FA: false,
  schnorrEnabled: true,
  untweakedSchnorrEnabled: true,
}
const setupCard = { ...readyCard, publicKey: '0255355ca83c973f1d97ce0e3843c85d78905af16b4dc531bc488e57212d230116' }
const blankCard: NativeCardInfo = {
  ...readyCard,
  setupDone: false,
  seeded: false,
  ready: false,
  schnorrEnabled: false,
  untweakedSchnorrEnabled: false,
}

beforeEach(() => {
  localStorage.clear()
  mocks.android = false
  mocks.tap = false
  mocks.connect.mockReset().mockResolvedValue(undefined)
  mocks.disconnect.mockReset().mockResolvedValue(undefined)
  mocks.inspect.mockReset().mockResolvedValue(readyCard)
  mocks.setup.mockReset().mockResolvedValue(setupCard)
})

function show({
  network = 'mutinynet',
  publicKey = '',
  initialStatus,
}: { network?: string; publicKey?: string; initialStatus?: NativeCardInfo } = {}) {
  const onConnected = vi.fn()
  function Wallet() {
    const [isOpen, setIsOpen] = useState(true)
    return (
      <AspContext.Provider value={{ ...mockAspContextValue, aspInfo: { ...mockAspContextValue.aspInfo, network } }}>
        <WalletContext.Provider
          value={{
            ...mockWalletContextValue,
            wallet: { nextRollover: 0, pubkey: publicKey },
            connectHardwareWallet: mocks.connect,
          }}
        >
          <NativeCardConnectSheet
            isOpen={isOpen}
            initialStatus={initialStatus}
            onClose={() => setIsOpen(false)}
            onConnected={() => {
              onConnected()
              setIsOpen(false)
            }}
          />
        </WalletContext.Provider>
      </AspContext.Provider>
    )
  }
  return { ...render(<Wallet />), onConnected }
}

async function enterPin(value = '123456') {
  fireEvent.change(await screen.findByLabelText('Card PIN'), { target: { value } })
  fireEvent.click(screen.getByRole('button', { name: 'Connect and continue' }))
}

it('guides Android through a fresh card tap after PIN entry and never retries a failed connection', async () => {
  mocks.android = true
  let fail!: (error: Error) => void
  mocks.connect.mockReturnValueOnce(
    new Promise((_resolve, reject) => {
      fail = reject
    }),
  )
  show({ initialStatus: readyCard })
  expect(screen.getByText('Enter your PIN, then tap your card again to connect.')).toBeVisible()
  await enterPin()
  expect(
    screen.getByText('Lift your card away, then tap it against the back of your phone. Keep it there until connected.'),
  ).toBeVisible()
  expect(screen.getByLabelText('Card PIN')).toHaveValue('')
  expect(screen.getByLabelText('Card PIN')).toBeDisabled()
  const tap = screen.getByRole('button', { name: 'Tap card again and hold' })
  expect(tap).toHaveTextContent('Tap card again and hold')
  expect(tap).toBeDisabled()
  fireEvent.click(tap)
  expect(mocks.connect).toHaveBeenCalledOnce()
  await act(async () => fail(new Error('NFC connection failed before PIN verification. Tap the card again.')))
  expect(screen.getByText('NFC connection failed before PIN verification. Tap the card again.')).toBeVisible()
  fireEvent(window, new Event('arkade-native-resumed'))
  expect(mocks.connect).toHaveBeenCalledExactlyOnceWith('123456', undefined, expect.any(AbortSignal))
  expect(screen.getByLabelText('Card PIN')).toHaveValue('')
  expect(screen.getByRole('button', { name: 'Connect and continue' })).toBeEnabled()
})

async function saveRecovery() {
  fireEvent.click(await screen.findByRole('button', { name: 'Create card wallet' }))
  const words = screen.getAllByRole('listitem').map((item) => item.textContent)
  const recoveryCode = screen.queryByText(/^[0-9a-f]{16}$/)?.textContent
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
  fireEvent.click(screen.getByRole('checkbox'))
  const scroller = document.querySelector<HTMLElement>('.native-card-sheet-scroll')!
  scroller.scrollTop = 160
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  expect(scroller.scrollTop).toBe(0)
  expect(screen.queryByLabelText('Choose a PIN') ?? screen.getByLabelText('Card PIN')).toHaveFocus()
  return { words, recoveryCode }
}

function newPin(value = '123456', confirmation = value) {
  fireEvent.change(screen.getByLabelText('Choose a PIN'), { target: { value } })
  fireEvent.change(screen.getByLabelText('Confirm PIN'), { target: { value: confirmation } })
  fireEvent.click(screen.getByRole('button', { name: 'Set up card' }))
}

async function interruptedTapSetup() {
  mocks.tap = true
  let interrupt!: (error: Error) => void
  mocks.setup.mockImplementationOnce(() => new Promise<typeof setupCard>((_, reject) => (interrupt = reject)))
  const view = show({ initialStatus: blankCard })
  const recovery = await saveRecovery()
  newPin()
  await waitFor(() => expect(mocks.setup).toHaveBeenCalledOnce())
  await act(async () => interrupt(new Error('Card tap interrupted during setup')))
  return { ...view, recovery }
}

const backgroundEvents = ['native pause', 'hidden document'] as const

function background(event: (typeof backgroundEvents)[number]) {
  if (event === 'native pause') {
    fireEvent(window, new Event('arkade-native-paused'))
    return () => fireEvent(window, new Event('arkade-native-resumed'))
  }
  const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  fireEvent(document, new Event('visibilitychange'))
  return () => {
    visibility.mockReturnValue('visible')
    fireEvent(document, new Event('visibilitychange'))
    visibility.mockRestore()
  }
}

describe('guided Satochip connection', () => {
  it.each(backgroundEvents)('clears an unsubmitted connection PIN on %s and waits for fresh entry', async (event) => {
    const view = show()
    const input = await screen.findByLabelText('Card PIN')
    fireEvent.change(input, { target: { value: '123456' } })
    fireEvent(document, new Event('visibilitychange'))
    expect(input).toHaveValue('123456')
    const resume = background(event)
    expect(input).toHaveValue('')
    expect(mocks.connect).not.toHaveBeenCalled()
    expect(mocks.setup).not.toHaveBeenCalled()
    expect(view.onConnected).not.toHaveBeenCalled()
    resume()
    expect(input).toHaveValue('')
    expect(mocks.connect).not.toHaveBeenCalled()
    await enterPin('654321')
    await waitFor(() => expect(view.onConnected).toHaveBeenCalledOnce())
    expect(mocks.connect).toHaveBeenCalledExactlyOnceWith('654321', undefined, expect.any(AbortSignal))
  })

  it('accepts Enter as an explicit PIN submission without retrying', async () => {
    const view = show()
    const input = await screen.findByLabelText('Card PIN')
    fireEvent.change(input, { target: { value: '123456' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(view.onConnected).toHaveBeenCalledOnce())
    expect(mocks.connect).toHaveBeenCalledExactlyOnceWith('123456', undefined, expect.any(AbortSignal))
    expect(mocks.setup).not.toHaveBeenCalled()
  })

  it('inspects on opening, then connects only after an explicit PIN submission', async () => {
    const view = show()
    const input = await screen.findByLabelText('Card PIN')
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Connect Satochip')
    expect(input).toHaveAttribute('type', 'password')
    expect(input).toHaveAttribute('inputmode', 'numeric')
    expect(input).toHaveAttribute('maxlength', '16')
    expect(input).toHaveAttribute('autocomplete', 'off')
    expect(input.closest('.input-shell')).toBeInTheDocument()
    expect(mocks.inspect).toHaveBeenCalledOnce()
    expect(mocks.connect).not.toHaveBeenCalled()
    await enterPin()
    await waitFor(() => expect(view.onConnected).toHaveBeenCalledOnce())
    expect(mocks.connect).toHaveBeenCalledWith('123456', undefined, expect.any(AbortSignal))
    expect(mocks.setup).not.toHaveBeenCalled()
    expect(mocks.disconnect).not.toHaveBeenCalled()
    expect(localStorage.length).toBe(0)
  })

  it('guides Android users through card inspection before PIN entry', async () => {
    mocks.android = true
    show()
    expect(screen.getByText('Tap your Satochip against the back of your phone to check it.')).toBeInTheDocument()
    await screen.findByLabelText('Card PIN')
    expect(screen.getByText('Enter your PIN, then tap your card again to connect.')).toBeInTheDocument()
  })

  it.each(['12345', '12345678901234567', 'abcdef', '１２３４５６'])(
    'rejects an invalid PIN without sending it: %s',
    async (pin) => {
      show()
      await enterPin(pin)
      expect(await screen.findByText('Use a PIN with 6 to 16 digits.')).toBeInTheDocument()
      expect(screen.getByLabelText('Card PIN')).toHaveValue('')
      expect(mocks.connect).not.toHaveBeenCalled()
    },
  )

  it('clears the entered PIN on failure and requires a fresh entry to retry', async () => {
    mocks.connect.mockRejectedValueOnce('Reader disconnected')
    const view = show()
    await enterPin()
    expect(await screen.findByText('Reader disconnected')).toBeInTheDocument()
    expect(screen.getByLabelText('Card PIN')).toHaveValue('')
    expect(view.onConnected).not.toHaveBeenCalled()
    await enterPin()
    await waitFor(() => expect(view.onConnected).toHaveBeenCalledOnce())
    expect(mocks.connect).toHaveBeenCalledTimes(2)
  })

  it('cancels a pending inspection and ignores its late completion', async () => {
    let finish!: (value: NativeCardInfo) => void
    mocks.inspect.mockImplementationOnce(() => new Promise<NativeCardInfo>((resolve) => (finish = resolve)))
    const view = show()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(mocks.disconnect).toHaveBeenCalledOnce()
    await act(async () => finish(readyCard))
    expect(view.onConnected).not.toHaveBeenCalled()
    expect(mocks.connect).not.toHaveBeenCalled()
  })

  it('cancels a pending connection, suppresses double submissions and ignores late completion', async () => {
    let finish!: () => void
    mocks.connect.mockImplementationOnce(() => new Promise<void>((resolve) => (finish = resolve)))
    const view = show()
    await enterPin()
    fireEvent.click(screen.getByRole('button', { name: 'Connect and continue' }))
    expect(mocks.connect).toHaveBeenCalledOnce()
    const signal = mocks.connect.mock.calls[0][2] as AbortSignal
    expect(signal).toBeInstanceOf(AbortSignal)
    expect(signal.aborted).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(signal.aborted).toBe(true)
    await act(async () => finish())
    expect(view.onConnected).not.toHaveBeenCalled()
  })

  it('closes its unauthenticated session on unmount even after inspection finished', async () => {
    const view = show()
    await screen.findByLabelText('Card PIN')
    view.unmount()
    expect(mocks.disconnect).toHaveBeenCalledOnce()
  })

  it('offers another detection attempt after an absent card', async () => {
    mocks.inspect.mockResolvedValueOnce({ ...readyCard, present: false })
    show()
    expect(await screen.findByText(/No card detected/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Card PIN')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Check card again' }))
    await screen.findByLabelText('Card PIN')
    expect(mocks.inspect).toHaveBeenCalledTimes(2)
  })

  it.each(['bitcoin', ''])('keeps PIN and setup controls unavailable on network %s', (network) => {
    show({ network, initialStatus: blankCard })
    expect(screen.getByText(/Satochip is available on test networks only/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create card wallet' })).not.toBeInTheDocument()
    expect(mocks.inspect).not.toHaveBeenCalled()
    expect(mocks.setup).not.toHaveBeenCalled()
    expect(mocks.connect).not.toHaveBeenCalled()
  })

  it('refuses to initialize an empty replacement card for an existing wallet', async () => {
    mocks.inspect.mockResolvedValueOnce(blankCard)
    show({ publicKey: '02' + '11'.repeat(32) })
    expect(await screen.findByText(/Use the Satochip belonging to this wallet/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create card wallet' })).not.toBeInTheDocument()
    expect(mocks.setup).not.toHaveBeenCalled()
  })

  it.each([
    { ...readyCard, ready: false, schnorrEnabled: false },
    { ...readyCard, ready: false, needs2FA: true },
  ])('explains incompatible card policy without offering setup or a PIN', async (card) => {
    mocks.inspect.mockResolvedValueOnce(card)
    show()
    expect(await screen.findByTestId('error-message')).toBeInTheDocument()
    expect(screen.queryByLabelText('Card PIN')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create card wallet' })).not.toBeInTheDocument()
    expect(mocks.setup).not.toHaveBeenCalled()
  })
})

describe('blank-card setup', () => {
  it.each(backgroundEvents)('clears new PIN inputs on %s while preserving the saved recovery backup', async (event) => {
    mocks.inspect.mockResolvedValueOnce(blankCard)
    const view = show()
    const recovery = await saveRecovery()
    fireEvent.change(screen.getByLabelText('Choose a PIN'), { target: { value: '123456' } })
    fireEvent.change(screen.getByLabelText('Confirm PIN'), { target: { value: '123456' } })
    fireEvent(document, new Event('visibilitychange'))
    expect(screen.getByLabelText('Choose a PIN')).toHaveValue('123456')
    const resume = background(event)
    expect(screen.getByLabelText('Choose a PIN')).toHaveValue('')
    expect(screen.getByLabelText('Confirm PIN')).toHaveValue('')
    expect(mocks.setup).not.toHaveBeenCalled()
    expect(mocks.connect).not.toHaveBeenCalled()
    resume()
    expect(screen.getByLabelText('Choose a PIN')).toHaveValue('')
    fireEvent.click(screen.getByRole('button', { name: 'Review recovery backup' }))
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(recovery.words)
    expect(screen.getByText(recovery.recoveryCode!)).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByLabelText('Choose a PIN')).toHaveValue('')
    expect(screen.getByLabelText('Confirm PIN')).toHaveValue('')
    newPin('654321')
    await waitFor(() => expect(view.onConnected).toHaveBeenCalledOnce())
    expect(mocks.setup).toHaveBeenCalledExactlyOnceWith({
      pin: '654321',
      puk: recovery.recoveryCode,
      seed: expect.stringMatching(/^[0-9a-f]{128}$/),
    })
  })

  it.each(backgroundEvents)(
    'clears a partially provisioned card PIN on %s without replacing recovery data',
    async (event) => {
      mocks.inspect.mockResolvedValueOnce({ ...blankCard, setupDone: true })
      const view = show()
      const recovery = await saveRecovery()
      fireEvent.change(screen.getByLabelText('Card PIN'), { target: { value: '123456' } })
      const resume = background(event)
      expect(screen.getByLabelText('Card PIN')).toHaveValue('')
      expect(screen.queryByLabelText('Confirm PIN')).not.toBeInTheDocument()
      expect(mocks.setup).not.toHaveBeenCalled()
      expect(mocks.connect).not.toHaveBeenCalled()
      resume()
      fireEvent.click(screen.getByRole('button', { name: 'Review recovery backup' }))
      expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(recovery.words)
      expect(recovery.recoveryCode).toBeUndefined()
      expect(screen.queryByText('PIN recovery code')).not.toBeInTheDocument()
      expect(screen.getByRole('checkbox')).toBeChecked()
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
      expect(screen.getByLabelText('Card PIN')).toHaveValue('')
      fireEvent.change(screen.getByLabelText('Card PIN'), { target: { value: '654321' } })
      fireEvent.click(screen.getByRole('button', { name: 'Set up card' }))
      await waitFor(() => expect(view.onConnected).toHaveBeenCalledOnce())
      expect(mocks.setup).toHaveBeenCalledExactlyOnceWith({
        pin: '654321',
        seed: expect.stringMatching(/^[0-9a-f]{128}$/),
      })
    },
  )

  it.each(backgroundEvents)('preserves a submitted setup operation during %s without another write', async (event) => {
    mocks.inspect.mockResolvedValueOnce(blankCard)
    let finish!: (value: typeof setupCard) => void
    mocks.setup.mockImplementationOnce(() => new Promise<typeof setupCard>((resolve) => (finish = resolve)))
    mocks.android = true
    const view = show()
    await saveRecovery()
    newPin()
    await waitFor(() => expect(mocks.setup).toHaveBeenCalledOnce())
    expect(
      screen.getByText(
        'Lift your card away, then tap it against the back of your phone. Keep it there until setup is finished.',
      ),
    ).toBeVisible()
    const submitted = mocks.setup.mock.calls[0][0]
    const resume = background(event)
    expect(screen.getByLabelText('Choose a PIN')).toHaveValue('')
    expect(screen.getByLabelText('Confirm PIN')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(mocks.setup).toHaveBeenCalledOnce()
    expect(mocks.connect).not.toHaveBeenCalled()
    expect(mocks.disconnect).not.toHaveBeenCalled()
    expect(view.onConnected).not.toHaveBeenCalled()
    resume()
    await act(async () => finish(setupCard))
    await waitFor(() => expect(view.onConnected).toHaveBeenCalledOnce())
    expect(mocks.setup).toHaveBeenCalledExactlyOnceWith(submitted)
    expect(mocks.connect).toHaveBeenCalledExactlyOnceWith('123456', setupCard.publicKey, expect.any(AbortSignal))
  })

  it('discards the displayed recovery details when canceled without writing or storing them', async () => {
    mocks.inspect.mockResolvedValueOnce(blankCard)
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Create card wallet' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(12)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mocks.setup).not.toHaveBeenCalled()
    expect(mocks.disconnect).toHaveBeenCalledOnce()
    expect(localStorage.length).toBe(0)
  })

  it('requires saved recovery details and matching PINs before the explicit setup write', async () => {
    mocks.inspect.mockResolvedValueOnce(blankCard)
    let finish!: (value: typeof setupCard) => void
    mocks.setup.mockImplementationOnce(() => new Promise<typeof setupCard>((resolve) => (finish = resolve)))
    const view = show()
    expect(await screen.findByText('This card has no wallet yet.')).toBeInTheDocument()
    expect(mocks.setup).not.toHaveBeenCalled()
    const recovery = await saveRecovery()
    expect(recovery.words).toHaveLength(12)
    expect(recovery.recoveryCode).toMatch(/^[0-9a-f]{16}$/)
    expect(screen.getByLabelText('Choose a PIN').closest('.input-shell')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm PIN').closest('.input-shell')).toBeInTheDocument()
    newPin('123456', '654321')
    expect(screen.getByText('The PINs do not match.')).toBeInTheDocument()
    expect(mocks.setup).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Choose a PIN')).toHaveValue('')
    newPin()
    expect(screen.getByLabelText('Choose a PIN')).toHaveValue('')
    expect(screen.getByLabelText('Confirm PIN')).toHaveValue('')
    await waitFor(() => expect(mocks.setup).toHaveBeenCalledOnce())
    expect(mocks.setup).toHaveBeenCalledWith({
      pin: '123456',
      puk: recovery.recoveryCode,
      seed: expect.stringMatching(/^[0-9a-f]{128}$/),
    })
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(view.onConnected).not.toHaveBeenCalled()
    await act(async () => finish(setupCard))
    await waitFor(() => expect(view.onConnected).toHaveBeenCalledOnce())
    expect(mocks.connect).toHaveBeenCalledWith('123456', setupCard.publicKey, expect.any(AbortSignal))
    expect(mocks.disconnect).not.toHaveBeenCalled()
    expect(localStorage.length).toBe(0)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('uses the existing PIN and does not create or replace a recovery code on a partially set up card', async () => {
    mocks.inspect.mockResolvedValueOnce({ ...blankCard, setupDone: true })
    const view = show()
    const recovery = await saveRecovery()
    expect(recovery.recoveryCode).toBeUndefined()
    expect(screen.queryByLabelText('Confirm PIN')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Card PIN'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Set up card' }))
    await waitFor(() => expect(view.onConnected).toHaveBeenCalledOnce())
    expect(mocks.setup).toHaveBeenCalledWith({ pin: '123456', seed: expect.stringMatching(/^[0-9a-f]{128}$/) })
  })

  it('retains the same recovery details after an interrupted setup and retries without resetting the PIN', async () => {
    mocks.inspect.mockResolvedValueOnce(blankCard).mockResolvedValueOnce({ ...blankCard, setupDone: true })
    mocks.setup.mockRejectedValueOnce('Card removed during setup')
    const view = show()
    const recovery = await saveRecovery()
    newPin()
    expect(await screen.findByText('Card removed during setup')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('Card PIN')).toBeEnabled())
    expect(screen.queryByLabelText('Confirm PIN')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Review recovery backup' }))
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(recovery.words)
    expect(screen.getByText(recovery.recoveryCode!)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.change(screen.getByLabelText('Card PIN'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Set up card' }))
    await waitFor(() => expect(view.onConnected).toHaveBeenCalledOnce())
    const [first] = mocks.setup.mock.calls[0]
    expect(mocks.setup.mock.calls[1][0]).toEqual({ pin: '123456', seed: first.seed })
  })

  it('does not seed again when setup completed but the response was interrupted', async () => {
    mocks.inspect.mockResolvedValueOnce(blankCard).mockResolvedValueOnce(readyCard)
    mocks.setup.mockRejectedValueOnce('Card connection interrupted')
    const view = show()
    await saveRecovery()
    newPin()
    await screen.findByLabelText('Card PIN')
    expect(screen.queryByRole('button', { name: 'Set up card' })).not.toBeInTheDocument()
    await enterPin()
    await waitFor(() => expect(view.onConnected).toHaveBeenCalledOnce())
    expect(mocks.setup).toHaveBeenCalledOnce()
    expect(mocks.connect).toHaveBeenCalledWith('123456', setupCard.publicKey, expect.any(AbortSignal))
  })

  it('keeps the backup key binding when connection fails after a successful setup', async () => {
    mocks.inspect.mockResolvedValueOnce(blankCard)
    mocks.connect.mockRejectedValueOnce('Card removed')
    const view = show()
    await saveRecovery()
    newPin()
    expect(await screen.findByText('Card removed')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Set up card' })).not.toBeInTheDocument()
    await enterPin()
    await waitFor(() => expect(view.onConnected).toHaveBeenCalledOnce())
    expect(mocks.setup).toHaveBeenCalledOnce()
    expect(mocks.connect.mock.calls).toEqual([
      ['123456', setupCard.publicKey, expect.any(AbortSignal)],
      ['123456', setupCard.publicKey, expect.any(AbortSignal)],
    ])
  })

  it('refuses a setup response from another key and keeps the backup binding for a reconnect', async () => {
    mocks.inspect.mockResolvedValueOnce(blankCard)
    mocks.setup.mockResolvedValueOnce({ ...setupCard, publicKey: '02' + '11'.repeat(32) })
    mocks.connect.mockRejectedValueOnce('This is a different card')
    const view = show()
    await saveRecovery()
    newPin()
    expect(await screen.findByText('This is a different card. Reconnect the card you just set up.')).toBeInTheDocument()
    expect(mocks.connect).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Set up card' })).not.toBeInTheDocument()
    await enterPin()
    expect(await screen.findByText('This is a different card')).toBeInTheDocument()
    expect(mocks.connect).toHaveBeenCalledWith('123456', setupCard.publicKey, expect.any(AbortSignal))
    expect(view.onConnected).not.toHaveBeenCalled()
  })
})

describe('tap-card setup recovery', () => {
  it('waits for an explicit check while retaining an accessible recovery backup and blocking another setup', async () => {
    const view = await interruptedTapSetup()
    expect(mocks.inspect).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Choose a PIN')).toBeDisabled()
    expect(screen.getByLabelText('Confirm PIN')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Set up card' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Check card again' })).toBeEnabled()
    const review = screen.getByRole('button', { name: 'Review recovery backup' })
    expect(review).toBeEnabled()
    fireEvent.click(review)
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(view.recovery.words)
    expect(screen.getByText(view.recovery.recoveryCode!)).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Set up card' }))
    expect(mocks.setup).toHaveBeenCalledOnce()
    expect(mocks.inspect).not.toHaveBeenCalled()
    expect(mocks.connect).not.toHaveBeenCalled()
    expect(view.onConnected).not.toHaveBeenCalled()
    expect(localStorage.length).toBe(0)
  })

  it('checks a partial card only after an explicit action and retries its saved seed without resetting credentials', async () => {
    mocks.inspect.mockResolvedValueOnce({ ...blankCard, setupDone: true })
    const view = await interruptedTapSetup()
    expect(mocks.inspect).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Check card again' }))
    await waitFor(() => expect(screen.getByLabelText('Card PIN')).toBeEnabled())
    expect(screen.queryByLabelText('Confirm PIN')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Review recovery backup' }))
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(view.recovery.words)
    expect(screen.getByText(view.recovery.recoveryCode!)).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.change(screen.getByLabelText('Card PIN'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Set up card' }))
    await waitFor(() => expect(view.onConnected).toHaveBeenCalledOnce())
    expect(mocks.inspect).toHaveBeenCalledOnce()
    expect(mocks.setup).toHaveBeenCalledTimes(2)
    expect(mocks.setup.mock.calls[1][0]).toEqual({ pin: '123456', seed: mocks.setup.mock.calls[0][0].seed })
    expect(mocks.connect).toHaveBeenCalledExactlyOnceWith('123456', setupCard.publicKey, expect.any(AbortSignal))
  })

  it('connects a card found seeded on explicit recheck without another setup and retains the backup key binding', async () => {
    mocks.inspect.mockResolvedValueOnce(readyCard)
    const view = await interruptedTapSetup()
    expect(mocks.inspect).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Check card again' }))
    await screen.findByLabelText('Card PIN')
    expect(screen.queryByRole('button', { name: 'Set up card' })).not.toBeInTheDocument()
    await enterPin()
    await waitFor(() => expect(view.onConnected).toHaveBeenCalledOnce())
    expect(mocks.inspect).toHaveBeenCalledOnce()
    expect(mocks.setup).toHaveBeenCalledOnce()
    expect(mocks.connect).toHaveBeenCalledExactlyOnceWith('123456', setupCard.publicKey, expect.any(AbortSignal))
  })

  it('keeps setup blocked and recovery review available when an explicit check fails, then permits dismissal', async () => {
    mocks.inspect.mockRejectedValueOnce(new Error('Card check interrupted'))
    const view = await interruptedTapSetup()
    expect(mocks.inspect).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Check card again' }))
    await screen.findByText('Card check interrupted')
    expect(screen.getByRole('button', { name: 'Check card again' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Set up card' })).toBeDisabled()
    const review = screen.getByRole('button', { name: 'Review recovery backup' })
    expect(review).toBeEnabled()
    fireEvent.click(review)
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(view.recovery.words)
    expect(screen.getByText(view.recovery.recoveryCode!)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mocks.disconnect).toHaveBeenCalledOnce()
    expect(mocks.inspect).toHaveBeenCalledOnce()
    expect(mocks.setup).toHaveBeenCalledOnce()
    expect(mocks.connect).not.toHaveBeenCalled()
    expect(view.onConnected).not.toHaveBeenCalled()
  })

  it('cancels a pending explicit recheck and ignores its late seeded result', async () => {
    let finish!: (info: NativeCardInfo) => void
    mocks.inspect.mockImplementationOnce(() => new Promise<NativeCardInfo>((resolve) => (finish = resolve)))
    const view = await interruptedTapSetup()
    try {
      expect(mocks.inspect).not.toHaveBeenCalled()
      fireEvent.click(screen.getByRole('button', { name: 'Check card again' }))
      expect(mocks.inspect).toHaveBeenCalledOnce()
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(mocks.disconnect).toHaveBeenCalledOnce()
    } finally {
      await act(async () => finish(readyCard))
    }
    expect(mocks.setup).toHaveBeenCalledOnce()
    expect(mocks.connect).not.toHaveBeenCalled()
    expect(view.onConnected).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
