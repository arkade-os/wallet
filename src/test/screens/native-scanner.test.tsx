import { useState } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import NativeScanner from '../../components/NativeScanner'
import Scanner from '../../components/Scanner'
import { handleNativeBack, getNativeBackCount } from '../../lib/nativeBack'

const scanner = vi.hoisted(() => ({
  scan: vi.fn(),
  cancel: vi.fn(),
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  openAppSettings: vi.fn(),
}))
vi.mock('@tauri-apps/plugin-barcode-scanner', () => ({ ...scanner, Format: { QRCode: 'QR_CODE' } }))
vi.mock('../../lib/haptics', () => ({ hapticTap: vi.fn(), hapticLight: vi.fn() }))
beforeEach(() => {
  vi.resetAllMocks()
  scanner.checkPermissions.mockResolvedValue('granted')
  scanner.cancel.mockResolvedValue(undefined)
  scanner.scan.mockReturnValue(new Promise(() => {}))
})
afterEach(() => {
  cleanup()
  delete (window as any).__ARKADE_NATIVE__
  delete (window as any).__TAURI__
})

it('routes the shared scanner to iOS native QR and names iOS settings on failure', async () => {
  ;(window as any).__ARKADE_NATIVE__ = { version: 1, platform: 'ios' }
  ;(window as any).__TAURI__ = { core: { invoke: vi.fn() } }
  scanner.checkPermissions.mockResolvedValue('denied')
  scanner.requestPermissions.mockResolvedValue('denied')
  scanner.openAppSettings.mockRejectedValue(new Error('unavailable'))
  render(<Scanner close={vi.fn()} label='Scan payment' onData={vi.fn()} onError={vi.fn()} />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Enable it in iOS app settings')
  fireEvent.click(screen.getByRole('button', { name: 'App settings' }))
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('iOS Settings'))
  expect(scanner.scan).not.toHaveBeenCalled()
})

it('uses native QR scanning and releases camera on close', async () => {
  const onData = vi.fn()
  const view = render(<NativeScanner close={vi.fn()} label='Scan payment' onData={onData} onError={vi.fn()} />)
  await waitFor(() =>
    expect(scanner.scan).toHaveBeenCalledWith({ windowed: true, formats: ['QR_CODE'], cameraDirection: 'back' }),
  )
  expect(document.documentElement).toHaveClass('native-qr-active')
  view.unmount()
  expect(scanner.cancel).toHaveBeenCalledOnce()
  expect(document.documentElement).not.toHaveClass('native-qr-active')
})

it('uses the latest close callback on native Back and releases the camera', async () => {
  const oldClose = vi.fn()
  const close = vi.fn()
  const view = render(<NativeScanner close={oldClose} label='Scan' onData={vi.fn()} onError={vi.fn()} />)
  await waitFor(() => expect(scanner.scan).toHaveBeenCalledOnce())
  view.rerender(<NativeScanner close={close} label='Scan' onData={vi.fn()} onError={vi.fn()} />)
  act(() => expect(handleNativeBack()).toBe(true))
  expect(close).toHaveBeenCalledOnce()
  expect(oldClose).not.toHaveBeenCalled()
  expect(scanner.cancel).toHaveBeenCalledOnce()
  expect(document.documentElement).not.toHaveClass('native-qr-active')
  view.unmount()
  expect(getNativeBackCount()).toBe(0)
})

function cancelScan(method: 'Cancel' | 'Back') {
  if (method === 'Cancel') fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  else act(() => expect(handleNativeBack()).toBe(true))
}

it.each(['Cancel', 'Back'] as const)(
  '%s prevents a delayed permission grant from opening a camera before unmount',
  async (method) => {
    scanner.checkPermissions.mockResolvedValue('prompt')
    let grant!: (value: string) => void
    scanner.requestPermissions.mockReturnValue(
      new Promise((resolve) => {
        grant = resolve
      }),
    )
    const close = vi.fn()
    const onData = vi.fn()
    const onError = vi.fn()
    render(<NativeScanner close={close} label='Scan' onData={onData} onError={onError} />)
    await waitFor(() => expect(scanner.requestPermissions).toHaveBeenCalledOnce())
    cancelScan(method)
    expect(close).toHaveBeenCalledOnce()
    await act(async () => grant('granted'))
    expect(scanner.scan).not.toHaveBeenCalled()
    expect(scanner.cancel).not.toHaveBeenCalled()
    expect(onData).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    expect(document.documentElement).not.toHaveClass('native-qr-active')
  },
)

it.each([
  ['Cancel', 'success'],
  ['Cancel', 'error'],
  ['Back', 'success'],
  ['Back', 'error'],
] as const)('%s ignores a late scan %s before navigation unmounts the scanner', async (method, result) => {
  let resolveScan!: (value: { content: string }) => void
  let rejectScan!: (error: Error) => void
  scanner.scan.mockReturnValue(
    new Promise((resolve, reject) => {
      resolveScan = resolve
      rejectScan = reject
    }),
  )
  const close = vi.fn()
  const onData = vi.fn()
  const onError = vi.fn()
  render(<NativeScanner close={close} label='Scan' onData={onData} onError={onError} />)
  await waitFor(() => expect(scanner.scan).toHaveBeenCalledOnce())
  cancelScan(method)
  expect(close).toHaveBeenCalledOnce()
  expect(scanner.cancel).toHaveBeenCalledOnce()
  expect(document.documentElement).not.toHaveClass('native-qr-active')
  await act(async () => {
    if (result === 'success') resolveScan({ content: 'bitcoin:tb1qtest' })
    else rejectScan(new Error('Delayed native cancellation'))
  })
  expect(onData).not.toHaveBeenCalled()
  expect(onError).not.toHaveBeenCalled()
  expect(scanner.cancel).toHaveBeenCalledOnce()
  expect(document.documentElement).not.toHaveClass('native-qr-active')
})

it.each(['Cancel', 'Back'] as const)(
  '%s remains closed when a granted permission is waiting for app resume',
  async (method) => {
    scanner.checkPermissions.mockResolvedValue('prompt')
    let grant!: (value: string) => void
    scanner.requestPermissions.mockReturnValue(
      new Promise((resolve) => {
        grant = resolve
      }),
    )
    const close = vi.fn()
    const onData = vi.fn()
    const onError = vi.fn()
    render(<NativeScanner close={close} label='Scan' onData={onData} onError={onError} />)
    await waitFor(() => expect(scanner.requestPermissions).toHaveBeenCalledOnce())
    await act(async () => window.dispatchEvent(new Event('arkade-native-paused')))
    await act(async () => grant('granted'))
    cancelScan(method)
    await act(async () => window.dispatchEvent(new Event('arkade-native-resumed')))
    expect(close).toHaveBeenCalledOnce()
    expect(scanner.scan).not.toHaveBeenCalled()
    expect(scanner.cancel).not.toHaveBeenCalled()
    expect(onData).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  },
)

it.each(['Cancel', 'Back'] as const)(
  '%s closes only once while navigation has not unmounted the scanner',
  async (method) => {
    const close = vi.fn()
    render(<NativeScanner close={close} label='Scan' onData={vi.fn()} onError={vi.fn()} />)
    await waitFor(() => expect(scanner.scan).toHaveBeenCalledOnce())
    cancelScan(method)
    cancelScan('Cancel')
    cancelScan('Back')
    expect(close).toHaveBeenCalledOnce()
    expect(scanner.cancel).toHaveBeenCalledOnce()
    expect(document.documentElement).not.toHaveClass('native-qr-active')
  },
)

it.each([
  ['Cancel', 'Try again'],
  ['Cancel', 'App settings'],
  ['Back', 'Try again'],
  ['Back', 'App settings'],
] as const)('%s keeps %s inactive before navigation unmounts the scanner', async (method, control) => {
  scanner.checkPermissions.mockResolvedValue('denied')
  scanner.requestPermissions.mockResolvedValue('denied')
  const close = vi.fn()
  const onData = vi.fn()
  const onError = vi.fn()
  render(<NativeScanner close={close} label='Scan' onData={onData} onError={onError} />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Camera access is off')
  onError.mockClear()
  cancelScan(method)
  scanner.checkPermissions.mockResolvedValue('granted')
  await act(async () => fireEvent.click(screen.getByRole('button', { name: control })))
  expect(close).toHaveBeenCalledOnce()
  expect(scanner.checkPermissions).toHaveBeenCalledOnce()
  expect(scanner.requestPermissions).toHaveBeenCalledOnce()
  expect(scanner.scan).not.toHaveBeenCalled()
  expect(scanner.openAppSettings).not.toHaveBeenCalled()
  expect(onData).not.toHaveBeenCalled()
  expect(onError).not.toHaveBeenCalled()
  expect(document.documentElement).not.toHaveClass('native-qr-active')
})

it.each(['Cancel', 'Back'] as const)(
  '%s stops a pending settings import before opening app settings',
  async (method) => {
    scanner.checkPermissions.mockResolvedValue('denied')
    scanner.requestPermissions.mockResolvedValue('denied')
    const close = vi.fn()
    const onError = vi.fn()
    render(<NativeScanner close={close} label='Scan' onData={vi.fn()} onError={onError} />)
    await screen.findByRole('alert')
    onError.mockClear()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'App settings' }))
      cancelScan(method)
    })
    expect(close).toHaveBeenCalledOnce()
    expect(scanner.openAppSettings).not.toHaveBeenCalled()
    expect(scanner.scan).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  },
)

it.each(['Cancel', 'Back'] as const)('%s ignores a late app-settings rejection before unmount', async (method) => {
  scanner.checkPermissions.mockResolvedValue('denied')
  scanner.requestPermissions.mockResolvedValue('denied')
  let rejectSettings!: (error: Error) => void
  scanner.openAppSettings.mockReturnValueOnce(
    new Promise((_, reject) => {
      rejectSettings = reject
    }),
  )
  const close = vi.fn()
  const onError = vi.fn()
  render(<NativeScanner close={close} label='Scan' onData={vi.fn()} onError={onError} />)
  await screen.findByRole('alert')
  fireEvent.click(screen.getByRole('button', { name: 'App settings' }))
  await waitFor(() => expect(scanner.openAppSettings).toHaveBeenCalledOnce())
  onError.mockClear()
  cancelScan(method)
  await act(async () => rejectSettings(new Error('Settings activity unavailable')))
  expect(close).toHaveBeenCalledOnce()
  expect(scanner.scan).not.toHaveBeenCalled()
  expect(onError).not.toHaveBeenCalled()
  expect(screen.queryByText(/Unable to open app settings/)).not.toBeInTheDocument()
})

it('never starts a camera after unmounting during permission prompt', async () => {
  scanner.checkPermissions.mockResolvedValue('prompt')
  let grant!: (value: string) => void
  scanner.requestPermissions.mockReturnValue(
    new Promise((resolve) => {
      grant = resolve
    }),
  )
  const view = render(<NativeScanner close={vi.fn()} label='Scan' onData={vi.fn()} onError={vi.fn()} />)
  await waitFor(() => expect(scanner.requestPermissions).toHaveBeenCalledOnce())
  view.unmount()
  await act(async () => grant('granted'))
  expect(scanner.scan).not.toHaveBeenCalled()
})

it('explains denied permission and retains cancel/retry controls', async () => {
  scanner.checkPermissions.mockResolvedValue('denied')
  scanner.requestPermissions.mockResolvedValue('denied')
  render(<NativeScanner close={vi.fn()} label='Scan' onData={vi.fn()} onError={vi.fn()} />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Camera access is off')
  expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeVisible()
  expect(scanner.scan).not.toHaveBeenCalled()
})

it.each([new Error('Settings activity unavailable'), 'Settings activity unavailable'])(
  'keeps camera recovery usable when app settings fail to open: %s',
  async (cause) => {
    const close = vi.fn()
    scanner.checkPermissions.mockResolvedValue('denied')
    scanner.requestPermissions.mockResolvedValue('denied')
    scanner.openAppSettings.mockRejectedValueOnce(cause)
    render(<NativeScanner close={close} label='Scan' onData={vi.fn()} onError={vi.fn()} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Camera access is off')
    fireEvent.click(screen.getByRole('button', { name: 'App settings' }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        "Unable to open app settings. Open Arkade's camera permissions in Android Settings, then tap Try again.",
      ),
    )
    expect(scanner.openAppSettings).toHaveBeenCalledOnce()
    scanner.checkPermissions.mockResolvedValue('granted')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(scanner.scan).toHaveBeenCalledOnce())
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(close).toHaveBeenCalledOnce()
    expect(scanner.cancel).toHaveBeenCalledOnce()
  },
)

it('lets the payment form continue after denied camera access is retried and a valid request is scanned', async () => {
  const request = 'bitcoin:bcrt1qv9zftxjdep9x3sq85aguvd3d4n7dj4ytnf4ez7?amount=0.0001'
  scanner.checkPermissions.mockResolvedValueOnce('denied').mockResolvedValue('granted')
  scanner.requestPermissions.mockResolvedValue('denied')
  scanner.scan.mockResolvedValue({ content: request, format: 'QR_CODE' })
  function PaymentForm() {
    const [error, setError] = useState('')
    const [paymentRequest, setPaymentRequest] = useState('')
    return (
      <>
        {!paymentRequest && (
          <NativeScanner close={vi.fn()} label='Scan' onData={setPaymentRequest} onError={setError} />
        )}
        <input aria-label='Payment request' readOnly value={paymentRequest} />
        <button disabled={!paymentRequest || Boolean(error)}>Continue</button>
      </>
    )
  }
  render(<PaymentForm />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Camera access is off')
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  await waitFor(() => expect(screen.getByLabelText('Payment request')).toHaveValue(request))
  expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled()
})

it('delivers a scan exactly through the existing wallet handler', async () => {
  const onData = vi.fn()
  scanner.scan.mockResolvedValue({ content: 'bitcoin:tb1qtest', format: 'QR_CODE' })
  render(<NativeScanner close={vi.fn()} label='Scan' onData={onData} onError={vi.fn()} />)
  await waitFor(() => expect(onData).toHaveBeenCalledExactlyOnceWith('bitcoin:tb1qtest'))
  expect(document.documentElement).not.toHaveClass('native-qr-active')
})

it('does not let a late cancelled scan hide a newer camera preview', async () => {
  let rejectOld!: (error: Error) => void
  scanner.scan.mockReturnValueOnce(
    new Promise((_, reject) => {
      rejectOld = reject
    }),
  )
  const first = render(<NativeScanner close={vi.fn()} label='First' onData={vi.fn()} onError={vi.fn()} />)
  await waitFor(() => expect(scanner.scan).toHaveBeenCalledTimes(1))
  first.unmount()
  render(<NativeScanner close={vi.fn()} label='Second' onData={vi.fn()} onError={vi.fn()} />)
  await waitFor(() => expect(scanner.scan).toHaveBeenCalledTimes(2))
  await act(async () => rejectOld(new Error('cancelled')))
  expect(document.documentElement).toHaveClass('native-qr-active')
})

it('does not start a camera if permission resolves after app suspension', async () => {
  scanner.checkPermissions.mockResolvedValue('prompt')
  let grant!: (value: string) => void
  scanner.requestPermissions.mockReturnValue(
    new Promise((resolve) => {
      grant = resolve
    }),
  )
  render(<NativeScanner close={vi.fn()} label='Scan' onData={vi.fn()} onError={vi.fn()} />)
  await waitFor(() => expect(scanner.requestPermissions).toHaveBeenCalledOnce())
  await act(async () => window.dispatchEvent(new Event('arkade-native-paused')))
  await act(async () => grant('granted'))
  expect(scanner.scan).not.toHaveBeenCalled()
  expect(await screen.findByRole('alert')).toHaveTextContent('Scanner paused')
})

it.each(['before', 'after'])('starts after first permission grant resolves %s Android resume', async (order) => {
  scanner.checkPermissions.mockResolvedValue('prompt')
  let grant!: (value: string) => void
  scanner.requestPermissions.mockReturnValue(
    new Promise((resolve) => {
      grant = resolve
    }),
  )
  render(<NativeScanner close={vi.fn()} label='Scan' onData={vi.fn()} onError={vi.fn()} />)
  await waitFor(() => expect(scanner.requestPermissions).toHaveBeenCalledOnce())
  await act(async () => window.dispatchEvent(new Event('arkade-native-paused')))
  if (order === 'before') await act(async () => grant('granted'))
  await act(async () => window.dispatchEvent(new Event('arkade-native-resumed')))
  if (order === 'after') await act(async () => grant('granted'))
  await waitFor(() => expect(scanner.scan).toHaveBeenCalledOnce())
  expect(scanner.requestPermissions).toHaveBeenCalledOnce()
})

it('does not reprompt after denied permission and Android resume', async () => {
  scanner.checkPermissions.mockResolvedValue('prompt')
  let deny!: (value: string) => void
  scanner.requestPermissions.mockReturnValue(
    new Promise((resolve) => {
      deny = resolve
    }),
  )
  render(<NativeScanner close={vi.fn()} label='Scan' onData={vi.fn()} onError={vi.fn()} />)
  await waitFor(() => expect(scanner.requestPermissions).toHaveBeenCalledOnce())
  await act(async () => window.dispatchEvent(new Event('arkade-native-paused')))
  await act(async () => deny('denied'))
  await act(async () => window.dispatchEvent(new Event('arkade-native-resumed')))
  expect(await screen.findByRole('alert')).toHaveTextContent('Camera access is off')
  expect(scanner.requestPermissions).toHaveBeenCalledOnce()
  expect(scanner.scan).not.toHaveBeenCalled()
})

it('does not let the old error cleanup stop a retry camera', async () => {
  const close = vi.fn()
  const first = render(<NativeScanner close={close} label='Scan one' onData={vi.fn()} onError={vi.fn()} />)
  let rejectOld!: (error: Error) => void
  scanner.scan.mockReturnValueOnce(
    new Promise((_, reject) => {
      rejectOld = reject
    }),
  )
  await waitFor(() => expect(scanner.scan).toHaveBeenCalledOnce())
  await act(async () => rejectOld(new Error('camera failed')))
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  await act(async () => Promise.resolve())
  expect(scanner.scan).toHaveBeenCalledTimes(2)
  expect(scanner.cancel).toHaveBeenCalledOnce()
  scanner.cancel.mockClear()
  expect(document.documentElement).toHaveClass('native-qr-active')
  first.unmount()
  expect(document.documentElement).not.toHaveClass('native-qr-active')
  expect(scanner.cancel).toHaveBeenCalledOnce()
})
