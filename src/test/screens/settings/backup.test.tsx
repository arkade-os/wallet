import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Backup from '../../../screens/Settings/Backup'
import { ConfigContext } from '../../../providers/config'
import { WalletContext } from '../../../providers/wallet'
import { getMnemonic } from '../../../lib/mnemonic'
import { MNEMONIC_STORAGE_KEY } from '../../../lib/storageKeys'
import { defaultPassword } from '../../../lib/constants'
import { mockConfigContextValue, mockWalletContextValue } from '../mocks'

const staleWords = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

// Decrypting is not what is under test, and PBKDF2 is slow enough in jsdom to race the assertions.
vi.mock('../../../lib/mnemonic', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/mnemonic')>()),
  getMnemonic: vi.fn(() => Promise.resolve(staleWords)),
}))

const renderBackup = (wallet: Record<string, unknown>) =>
  render(
    <ConfigContext.Provider value={mockConfigContextValue as any}>
      <WalletContext.Provider
        value={{ ...mockWalletContextValue, wallet: { ...mockWalletContextValue.wallet, ...wallet } } as any}
      >
        <Backup />
      </WalletContext.Provider>
    </ConfigContext.Provider>,
  )

describe('Backup screen — passkey wallets', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    localStorage.setItem(MNEMONIC_STORAGE_KEY, 'stale-encrypted-words')
  })

  it('never reads stored words as a PRF wallet’s recovery phrase', async () => {
    renderBackup({ passkeyPrf: true, passkeyId: 'ab' })
    fireEvent.click(screen.getByRole('button', { name: 'View recovery phrase' }))

    expect(await screen.findByText('Unlock with your passkey')).toBeInTheDocument()
    expect(getMnemonic).not.toHaveBeenCalled()
    expect(screen.queryByText(staleWords)).toBeNull()
  })

  it('still reads them for an ordinary mnemonic wallet', async () => {
    renderBackup({})

    await waitFor(() => expect(getMnemonic).toHaveBeenCalledWith(defaultPassword))
  })
})
