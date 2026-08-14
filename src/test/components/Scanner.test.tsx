import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ToastProvider } from '../../components/Toast'
import Scanner from '../../components/Scanner'

const start = vi.fn()

vi.mock('qr-scanner', () => ({
  default: class {
    start = start
    destroy = vi.fn()
  },
}))

// alternative implementation behind the header switch, never reached here
vi.mock('qr/dom.js', () => ({
  QRCanvas: class {},
  frameLoop: () => () => {},
  frontalCamera: async () => ({}),
}))

vi.mock('../../lib/haptics', () => ({
  hapticLight: vi.fn(),
  hapticSubtle: vi.fn(),
  hapticTap: vi.fn(),
  setHapticsEnabled: vi.fn(),
}))

const realPermissions = Object.getOwnPropertyDescriptor(navigator, 'permissions')

const mockCameraPermission = (state: PermissionState) => {
  Object.defineProperty(navigator, 'permissions', {
    configurable: true,
    value: { query: async () => ({ state }) },
  })
}

afterEach(() => {
  if (realPermissions) Object.defineProperty(navigator, 'permissions', realPermissions)
  else delete (navigator as any).permissions
})

const renderScanner = () => {
  const onError = vi.fn()
  const { unmount } = render(
    <ToastProvider>
      <Scanner close={vi.fn()} label='Recipient address' onData={vi.fn()} onError={onError} />
    </ToastProvider>,
  )
  return { onError, unmount }
}

describe('Scanner', () => {
  beforeEach(() => {
    start.mockReset()
    // whatever the reason, qr-scanner fails with this
    start.mockRejectedValue('Camera not found.')
  })

  it('tells the user the camera is blocked and offers a way back in', async () => {
    mockCameraPermission('denied')
    const { onError } = renderScanner()

    expect(await screen.findByTestId('error-message')).toHaveTextContent(/blocked/i)
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/blocked/i))
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('does not blame the permission when the camera is merely unavailable', async () => {
    mockCameraPermission('granted')
    renderScanner()

    expect(await screen.findByTestId('error-message')).toHaveTextContent('Camera not available')
  })

  it('starts the camera again when the user retries', async () => {
    mockCameraPermission('denied')
    renderScanner()

    const retry = await screen.findByRole('button', { name: 'Try again' })
    start.mockResolvedValue(undefined)
    fireEvent.click(retry)

    await waitFor(() => expect(start).toHaveBeenCalledTimes(2))
    expect(screen.queryByTestId('error-message')).not.toBeInTheDocument()
  })

  it('says nothing to a screen the user has already left', async () => {
    // the permission answer arrives after the user gives up and closes the scanner
    let answer: (result: { state: PermissionState }) => void = () => {}
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: { query: () => new Promise((resolve) => (answer = resolve)) },
    })
    const { onError, unmount } = renderScanner()

    await waitFor(() => expect(start).toHaveBeenCalled())
    unmount()
    answer({ state: 'denied' })
    await act(async () => {})

    expect(onError).not.toHaveBeenCalled()
  })
})
