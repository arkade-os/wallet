import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'

const mocks = vi.hoisted(() => ({ native: true, exportState: vi.fn(), importState: vi.fn() }))
vi.mock('../../lib/nativeBridge', () => ({ isNativeHost: () => mocks.native }))
vi.mock('../../lib/nativeStateBackup', () => ({
  exportNativeStateBackup: mocks.exportState,
  importNativeStateBackup: mocks.importState,
}))

import NativeStateBackup from '../../components/NativeStateBackup'

beforeEach(() => {
  mocks.native = true
  mocks.exportState.mockReset().mockResolvedValue(undefined)
  mocks.importState.mockReset().mockResolvedValue(undefined)
})

const backgroundCases = (['export', 'import'] as const).flatMap((mode) =>
  (['native pause', 'hidden document'] as const).map((event) => ({ mode, event })),
)

function background(event: (typeof backgroundCases)[number]['event']) {
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

describe('native state backup controls', () => {
  it.each(backgroundCases)(
    'clears unsubmitted $mode passwords on $event and waits for fresh entry',
    async ({ mode, event }) => {
      const complete = vi.fn()
      render(<NativeStateBackup mode={mode} onExported={complete} onRestored={complete} />)
      const exporting = mode === 'export'
      fireEvent.click(
        screen.getByRole('button', { name: `${exporting ? 'Export' : 'Restore'} encrypted wallet backup` }),
      )
      const password = screen.getByLabelText('Backup password')
      fireEvent.change(password, { target: { value: 'local backup password' } })
      if (exporting)
        fireEvent.change(screen.getByLabelText('Confirm backup password'), {
          target: { value: 'local backup password' },
        })
      else fireEvent.click(screen.getByRole('checkbox'))
      fireEvent.click(screen.getAllByRole('button', { name: 'Toggle visibility' })[0])
      expect(password).toHaveAttribute('type', 'text')
      fireEvent(document, new Event('visibilitychange'))
      expect(password).toHaveValue('local backup password')
      const resume = background(event)
      try {
        expect(password).toHaveValue('')
        expect(password).toHaveAttribute('type', 'password')
        if (exporting) expect(screen.getByLabelText('Confirm backup password')).toHaveValue('')
        else expect(screen.getByRole('checkbox')).toBeChecked()
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(mocks.exportState).not.toHaveBeenCalled()
        expect(mocks.importState).not.toHaveBeenCalled()
        expect(complete).not.toHaveBeenCalled()
      } finally {
        resume()
      }
      expect(password).toHaveValue('')
      fireEvent.change(password, { target: { value: 'fresh backup password' } })
      if (exporting)
        fireEvent.change(screen.getByLabelText('Confirm backup password'), {
          target: { value: 'fresh backup password' },
        })
      fireEvent.click(
        screen.getByRole('button', { name: exporting ? 'Encrypt and save file' : 'Choose backup and restore' }),
      )
      await waitFor(() => expect(complete).toHaveBeenCalledOnce())
      expect(exporting ? mocks.exportState : mocks.importState).toHaveBeenCalledExactlyOnceWith('fresh backup password')
      expect(exporting ? mocks.importState : mocks.exportState).not.toHaveBeenCalled()
    },
  )

  it.each(backgroundCases)('preserves submitted $mode ownership across $event', async ({ mode, event }) => {
    let finish!: () => void
    const pending = new Promise<void>((resolve) => (finish = resolve))
    const exporting = mode === 'export'
    const beforeExport = vi.fn(() => pending)
    if (!exporting) mocks.importState.mockReturnValueOnce(pending)
    const complete = vi.fn()
    render(<NativeStateBackup mode={mode} beforeExport={beforeExport} onExported={complete} onRestored={complete} />)
    fireEvent.click(screen.getByRole('button', { name: `${exporting ? 'Export' : 'Restore'} encrypted wallet backup` }))
    fireEvent.change(screen.getByLabelText('Backup password'), { target: { value: 'local backup password' } })
    if (exporting)
      fireEvent.change(screen.getByLabelText('Confirm backup password'), {
        target: { value: 'local backup password' },
      })
    else fireEvent.click(screen.getByRole('checkbox'))
    const submit = screen.getByRole('button', {
      name: exporting ? 'Encrypt and save file' : 'Choose backup and restore',
    })
    fireEvent.click(submit)
    const resume = background(event)
    try {
      expect(screen.getByLabelText('Backup password')).toBeDisabled()
      expect(submit).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
      fireEvent.click(submit)
      expect(complete).not.toHaveBeenCalled()
      if (exporting) {
        expect(beforeExport).toHaveBeenCalledOnce()
        expect(mocks.exportState).not.toHaveBeenCalled()
      } else {
        expect(mocks.importState).toHaveBeenCalledExactlyOnceWith('local backup password')
        expect(screen.getByRole('checkbox')).toBeChecked()
      }
    } finally {
      resume()
    }
    await act(async () => finish())
    await waitFor(() => expect(complete).toHaveBeenCalledOnce())
    expect(exporting ? mocks.exportState : mocks.importState).toHaveBeenCalledExactlyOnceWith('local backup password')
    expect(exporting ? mocks.importState : mocks.exportState).not.toHaveBeenCalled()
  })

  it('keeps native file operations out of the browser wallet', () => {
    mocks.native = false
    const { container } = render(<NativeStateBackup mode='export' />)
    expect(container).toBeEmptyDOMElement()
  })

  it('requires a long confirmed password and saves only after an explicit action', async () => {
    render(<NativeStateBackup mode='export' />)
    expect(mocks.exportState).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Export encrypted wallet backup' }))
    expect(screen.getByRole('dialog', { name: 'Back up wallet' })).toBeInTheDocument()
    expect(screen.getByLabelText('Backup password')).toHaveAttribute('type', 'password')
    expect(screen.getByLabelText('Confirm backup password')).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByRole('button', { name: 'Encrypt and save file' }))
    expect(screen.getByText('Use a backup password with at least 12 characters.')).toBeInTheDocument()
    const input = screen.getByPlaceholderText('At least 12 characters')
    expect(input).toHaveAttribute('type', 'password')
    fireEvent.change(input, { target: { value: 'local backup password' } })
    fireEvent.change(screen.getByPlaceholderText('Repeat your backup password'), {
      target: { value: 'different password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Encrypt and save file' }))
    expect(screen.getByText('The backup passwords do not match.')).toBeInTheDocument()
    expect(mocks.exportState).not.toHaveBeenCalled()
    fireEvent.change(screen.getByPlaceholderText('Repeat your backup password'), {
      target: { value: 'local backup password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Encrypt and save file' }))
    await waitFor(() => expect(mocks.exportState).toHaveBeenCalledWith('local backup password'))
    expect(
      await screen.findByText('Encrypted wallet backup saved. Keep its password somewhere safe.'),
    ).toBeInTheDocument()
  })

  it('explains the original password/card requirement and reloads only after restoration completes', async () => {
    let finish!: () => void
    mocks.importState.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        }),
    )
    const restored = vi.fn()
    render(<NativeStateBackup mode='import' onRestored={restored} />)
    fireEvent.click(screen.getByRole('button', { name: 'Restore encrypted wallet backup' }))
    expect(screen.getByText(/Software wallets still need their original wallet password/)).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('At least 12 characters'), {
      target: { value: 'local backup password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Choose backup and restore' }))
    expect(screen.getByText('Confirm that you have the wallet recovery details.')).toBeInTheDocument()
    expect(mocks.importState).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Choose backup and restore' }))
    expect(mocks.importState).toHaveBeenCalledWith('local backup password')
    expect(restored).not.toHaveBeenCalled()
    expect(screen.getByRole('checkbox')).toBeDisabled()
    expect(screen.getByLabelText('Backup password')).toBeDisabled()
    finish()
    await waitFor(() => expect(restored).toHaveBeenCalledOnce())
  })

  it('keeps the confirmed password unchanged while payments drain before encryption', async () => {
    const user = userEvent.setup()
    let drained!: () => void
    const beforeExport = () => new Promise<void>((resolve) => (drained = resolve))
    render(<NativeStateBackup mode='export' beforeExport={beforeExport} />)
    fireEvent.click(screen.getByRole('button', { name: 'Export encrypted wallet backup' }))
    const password = screen.getByLabelText('Backup password')
    const confirmation = screen.getByLabelText('Confirm backup password')
    fireEvent.change(password, { target: { value: 'local backup password' } })
    fireEvent.change(confirmation, { target: { value: 'local backup password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Encrypt and save file' }))
    expect(mocks.exportState).not.toHaveBeenCalled()
    password.focus()
    await user.type(password, ' changed', { skipClick: true })
    confirmation.focus()
    await user.type(confirmation, ' changed', { skipClick: true })
    expect(password).toHaveValue('local backup password')
    expect(confirmation).toHaveValue('local backup password')
    expect(password).toBeDisabled()
    expect(confirmation).toBeDisabled()
    drained()
    await waitFor(() => expect(mocks.exportState).toHaveBeenCalledExactlyOnceWith('local backup password'))
    expect(await screen.findByText(/Encrypted wallet backup saved/)).toBeInTheDocument()
  })

  it('keeps errors visible without claiming a successful restore', async () => {
    mocks.importState.mockRejectedValueOnce(
      new Error('The backup password is incorrect, or the backup file was changed.'),
    )
    const restored = vi.fn()
    render(<NativeStateBackup mode='import' onRestored={restored} />)
    fireEvent.click(screen.getByRole('button', { name: 'Restore encrypted wallet backup' }))
    fireEvent.change(screen.getByPlaceholderText('At least 12 characters'), {
      target: { value: 'local backup password' },
    })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Choose backup and restore' }))
    expect(
      await screen.findByText('The backup password is incorrect, or the backup file was changed.'),
    ).toBeInTheDocument()
    expect(restored).not.toHaveBeenCalled()
  })

  it('quiesces before exporting and reports asynchronous completion after its page unmounts', async () => {
    const order: string[] = []
    let stop!: () => void
    const beforeExport = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          stop = () => {
            order.push('quiesced')
            resolve()
          }
        }),
    )
    mocks.exportState.mockImplementation(async () => {
      order.push('exported')
    })
    const complete = vi.fn()
    const view = render(<NativeStateBackup mode='export' beforeExport={beforeExport} onExported={complete} />)
    fireEvent.click(screen.getByRole('button', { name: 'Export encrypted wallet backup' }))
    expect(screen.getByText(/Saving locks your wallet/)).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('At least 12 characters'), {
      target: { value: 'local backup password' },
    })
    fireEvent.change(screen.getByPlaceholderText('Repeat your backup password'), {
      target: { value: 'local backup password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Encrypt and save file' }))
    expect(mocks.exportState).not.toHaveBeenCalled()
    view.unmount()
    stop()
    await waitFor(() => expect(complete).toHaveBeenCalledOnce())
    expect(order).toEqual(['quiesced', 'exported'])
  })

  it('reports quiescence failures outside the unmounted page and never begins export', async () => {
    const error = vi.fn()
    render(
      <NativeStateBackup
        mode='export'
        beforeExport={async () => {
          throw new Error('Payments still draining')
        }}
        onError={error}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Export encrypted wallet backup' }))
    fireEvent.change(screen.getByPlaceholderText('At least 12 characters'), {
      target: { value: 'local backup password' },
    })
    fireEvent.change(screen.getByPlaceholderText('Repeat your backup password'), {
      target: { value: 'local backup password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Encrypt and save file' }))
    await waitFor(() => expect(error).toHaveBeenCalledWith('Payments still draining'))
    expect(mocks.exportState).not.toHaveBeenCalled()
  })

  it.each(['USER_CANCELLED', new Error('USER_CANCELLED')])(
    'quietly handles native file-picker cancellation: %s',
    async (cancelled) => {
      const onError = vi.fn()
      const exported = vi.fn()
      mocks.exportState.mockRejectedValueOnce(cancelled)
      render(<NativeStateBackup mode='export' onError={onError} onExported={exported} />)
      fireEvent.click(screen.getByRole('button', { name: 'Export encrypted wallet backup' }))
      fireEvent.change(screen.getByPlaceholderText('At least 12 characters'), {
        target: { value: 'local backup password' },
      })
      fireEvent.change(screen.getByPlaceholderText('Repeat your backup password'), {
        target: { value: 'local backup password' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Encrypt and save file' }))
      await waitFor(() => expect(screen.queryByPlaceholderText('At least 12 characters')).toBeNull())
      expect(onError).not.toHaveBeenCalled()
      expect(exported).not.toHaveBeenCalled()
      expect(screen.queryByTestId('error-message')).toBeNull()
      expect(screen.queryByText('Encrypted wallet backup saved. Keep its password somewhere safe.')).toBeNull()
    },
  )
})
