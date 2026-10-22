import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ToastProvider } from '../../../components/Toast'
import { ConfigContext } from '../../../providers/config'
import { BackupContext } from '../../../providers/backup'
import { WalletContext } from '../../../providers/wallet'
import { LanguageProvider } from '../../../providers/language'
import { mockConfigContextValue, mockWalletContextValue } from '../mocks'
import Backup from '../../../screens/Settings/Backup'

vi.mock('../../../lib/clipboard', () => ({
  copyToClipboard: vi.fn(),
}))

vi.mock('../../../lib/haptics', () => ({
  hapticSubtle: vi.fn(),
  hapticTap: vi.fn(),
  hapticSuccess: vi.fn(),
  hapticError: vi.fn(),
}))

vi.mock('../../../lib/mnemonic', () => ({
  hasMnemonic: () => true,
  getMnemonic: async () =>
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
}))

import { copyToClipboard } from '../../../lib/clipboard'
const copyMock = vi.mocked(copyToClipboard)

const backupContext = { backupConfig: vi.fn(), fullBackup: vi.fn() } as any

function buildTree() {
  return (
    <ToastProvider>
      <ConfigContext.Provider value={mockConfigContextValue as any}>
        <BackupContext.Provider value={backupContext}>
          <WalletContext.Provider value={mockWalletContextValue as any}>
            <LanguageProvider>
              <Backup />
            </LanguageProvider>
          </WalletContext.Provider>
        </BackupContext.Provider>
      </ConfigContext.Provider>
    </ToastProvider>
  )
}

// This screen is the only place key material passes through copyToClipboard.
// A silent failure here is the worst case in the app: the user dismisses the
// reveal, believes the phrase is on the clipboard, and later finds it is not.
describe('Backup copy feedback', () => {
  beforeEach(() => {
    copyMock.mockReset()
  })

  // The copy button only exists once the secret is revealed, so both tests
  // drive the dialog: open it, confirm, then the copy button renders.
  const revealAndCopy = async () => {
    fireEvent.click(await screen.findByRole('button', { name: 'View recovery phrase' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Copy to clipboard' }))
  }

  it('reports success when the clipboard write succeeds', async () => {
    copyMock.mockResolvedValue(true)
    render(buildTree())

    await revealAndCopy()

    await waitFor(() => {
      expect(copyMock).toHaveBeenCalledWith(expect.stringContaining('abandon'))
    })
    expect(await screen.findByText('Copied to clipboard')).toBeInTheDocument()
  })

  it('reports failure when the clipboard write fails', async () => {
    copyMock.mockResolvedValue(false)
    render(buildTree())

    await revealAndCopy()

    expect(await screen.findByText('Failed to copy')).toBeInTheDocument()
    // The pre-i18n behaviour toasted the button label back at the user, so
    // assert it is absent: that string is still on screen as the button.
    await waitFor(() => {
      expect(screen.getAllByText('Copy to clipboard')).toHaveLength(1)
    })
  })
})
