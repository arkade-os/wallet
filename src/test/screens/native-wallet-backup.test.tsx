import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { WalletContext } from '../../providers/wallet'
import { SwapsContext } from '../../providers/swaps'
import NativeWalletBackup from '../../components/NativeWalletBackup'
import { mockWalletContextValue } from './mocks'

const mocks = vi.hoisted(() => ({ pause: vi.fn(), lock: vi.fn(), collect: vi.fn(), success: vi.fn(), error: vi.fn() }))
vi.mock('../../components/Toast', () => ({ toast: { success: mocks.success, error: mocks.error } }))
vi.mock('../../components/NativeStateBackup', () => ({
  default: ({
    beforeExport,
    onExported,
    onError,
  }: {
    beforeExport: () => Promise<void>
    onExported: () => void
    onError: (message: string) => void
  }) => (
    <button
      onClick={async () => {
        try {
          await beforeExport()
          await mocks.collect()
          onExported()
        } catch (error) {
          onError(error instanceof Error ? error.message : 'Backup failed')
        }
      }}
    >
      Export fixture
    </button>
  ),
}))

function mount(biometric = false) {
  return render(
    <WalletContext.Provider
      value={{
        ...mockWalletContextValue,
        wallet: { nextRollover: 0, lockedByBiometrics: biometric },
        lockWallet: mocks.lock,
      }}
    >
      <SwapsContext.Provider value={{ pauseForBackup: mocks.pause } as never}>
        <NativeWalletBackup />
      </SwapsContext.Provider>
    </WalletContext.Provider>,
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.pause.mockResolvedValue(undefined)
  mocks.lock.mockResolvedValue(undefined)
  mocks.collect.mockResolvedValue(undefined)
})

it('waits for swap drain then wallet lock before collecting a backup, including after page unmount', async () => {
  const order: string[] = []
  let release!: () => void
  mocks.pause.mockImplementation(async () => {
    order.push('dispose swaps')
    await new Promise<void>((resolve) => {
      release = resolve
    })
  })
  const view = mount()
  mocks.lock.mockImplementation(async () => {
    order.push('lock wallet')
    view.unmount()
  })
  mocks.collect.mockImplementation(async () => {
    order.push('collect backup')
  })
  fireEvent.click(screen.getByText('Export fixture'))
  expect(order).toEqual(['dispose swaps'])
  expect(mocks.lock).not.toHaveBeenCalled()
  expect(mocks.collect).not.toHaveBeenCalled()
  await act(async () => {
    release()
    await Promise.resolve()
  })
  await waitFor(() => expect(mocks.success).toHaveBeenCalledTimes(1))
  expect(order).toEqual(['dispose swaps', 'lock wallet', 'collect backup'])
})

it('leaves a biometric wallet untouched until it has a restorable wallet password', async () => {
  mount(true)
  fireEvent.click(screen.getByText('Export fixture'))
  await waitFor(() =>
    expect(mocks.error).toHaveBeenCalledWith('Switch to a wallet password before creating this backup.'),
  )
  expect(mocks.pause).not.toHaveBeenCalled()
  expect(mocks.lock).not.toHaveBeenCalled()
  expect(mocks.collect).not.toHaveBeenCalled()
})

it('does not lock or collect after swap disposal fails and reports the failure outside the page', async () => {
  mocks.pause.mockRejectedValueOnce(new Error('Unable to stop an in-flight payment'))
  mount()
  fireEvent.click(screen.getByText('Export fixture'))
  await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Unable to stop an in-flight payment'))
  expect(mocks.lock).not.toHaveBeenCalled()
  expect(mocks.collect).not.toHaveBeenCalled()
})
