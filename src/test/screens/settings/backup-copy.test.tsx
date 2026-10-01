import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ToastProvider } from '../../../components/Toast'
import { ConfigContext } from '../../../providers/config'
import { LanguageProvider } from '../../../providers/language'
import { BackupContext } from '../../../providers/backup'
import { WalletContext } from '../../../providers/wallet'
import { mockConfigContextValue, mockWalletContextValue } from '../mocks'
import Backup from '../../../screens/Settings/Backup'

vi.mock('../../../lib/clipboard', () => ({
  copyToClipboard: vi.fn(),
}))

vi.mock('../../../lib/privateKey', () => ({
  getPrivateKey: vi.fn(),
  privateKeyToNsec: (key: string) => `nsec1${key}`,
}))

vi.mock('../../../lib/mnemonic', () => ({
  hasMnemonic: () => false,
  getMnemonic: vi.fn(),
}))

vi.mock('../../../lib/biometrics', () => ({
  authenticateUser: vi.fn(),
}))

vi.mock('../../../lib/haptics', () => ({
  hapticTap: vi.fn(),
  hapticLight: vi.fn(),
  hapticSubtle: vi.fn(),
  setHapticsEnabled: vi.fn(),
}))

import { copyToClipboard } from '../../../lib/clipboard'
import { getPrivateKey } from '../../../lib/privateKey'

const copyMock = vi.mocked(copyToClipboard)
const getPrivateKeyMock = vi.mocked(getPrivateKey)

const backupContextValue = { backupConfig: vi.fn(), fullBackup: vi.fn() } as any
const KEY = 'aa'.repeat(32)

function renderBackup() {
  return render(
    <ToastProvider>
      <ConfigContext.Provider value={mockConfigContextValue as any}>
        <LanguageProvider>
          <WalletContext.Provider value={{ ...mockWalletContextValue, lockedByBiometrics: false } as any}>
            <BackupContext.Provider value={backupContextValue}>
              <Backup />
            </BackupContext.Provider>
          </WalletContext.Provider>
        </LanguageProvider>
      </ConfigContext.Provider>
    </ToastProvider>,
  )
}

// The copy button only renders once the secret has been revealed, and the
// confirmation dialog sits in front of it. InputPassword emits a bare
// <input type="password"> with no associated label, so there is no accessible
// name to query it by.
const passwordInput = () => document.querySelector('input[type="password"]')!

async function openDialog() {
  fireEvent.click(screen.getByRole('button', { name: 'View private key' }))
  await waitFor(() => expect(screen.getByText('Enter your password')).toBeInTheDocument())
}

// A rejected unlock leaves `secret` empty, which is the state the dialog opens
// in: no secret means the user has to type the wallet password to get one.
async function unlock() {
  await openDialog()
  // Typed before Confirm so the assertion on the argument holds: the nsec is
  // derived from whatever the correct-password path returns.
  fireEvent.change(passwordInput(), { target: { value: 'hunter2' } })
  getPrivateKeyMock.mockResolvedValue(KEY as any)
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
  return await screen.findByRole('button', { name: 'Copy to clipboard' })
}

describe('Backup screen copy feedback', () => {
  beforeEach(() => {
    getPrivateKeyMock.mockReset()
    copyMock.mockReset()
    // The mount effect probes with the default password, and verifyPassword
    // turns a rejection into ''. That empty secret is the state the copy flow
    // starts from: no secret on screen, so the dialog asks for the password.
    getPrivateKeyMock.mockRejectedValue(new Error('wrong password'))
  })

  // The secret is the Nostr nsec, derived from the wallet's private key.
  // copyToClipboard resolves false on a refused write rather than throwing, so
  // the unguarded toast told the user their key was on the clipboard when it
  // was not — and they paste it somewhere expecting it to be.
  it('reports a refused clipboard write instead of claiming success', async () => {
    copyMock.mockResolvedValue(false)
    renderBackup()

    fireEvent.click(await unlock())

    expect(await screen.findByText('Failed to copy')).toBeInTheDocument()
    expect(copyMock).toHaveBeenCalledWith(`nsec1${KEY}`)
  })

  it('confirms a successful clipboard write', async () => {
    copyMock.mockResolvedValue(true)
    renderBackup()

    fireEvent.click(await unlock())

    expect(await screen.findByText('Copied to clipboard')).toBeInTheDocument()
  })

  // Guards the guard: a wrong password must not put anything on the clipboard.
  it('does not copy when the password is rejected', async () => {
    renderBackup()
    await openDialog()

    fireEvent.change(passwordInput(), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))

    await waitFor(() => expect(screen.getAllByText('Invalid password').length).toBeGreaterThan(0))
    expect(copyMock).not.toHaveBeenCalled()
  })
})
