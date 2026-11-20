import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Connect from '../../screens/Init/Connect'
import { MNEMONIC_STORAGE_KEY, NSEC_STORAGE_KEY } from '../../lib/storageKeys'
import { NavigationContext } from '../../providers/navigation'
import { FlowContext } from '../../providers/flow'
import { WalletContext } from '../../providers/wallet'
import { DevModeContext } from '../../providers/devMode'
import {
  mockNavigationContextValue,
  mockFlowContextValue,
  mockWalletContextValue,
  mockDevModeContextValue,
} from './mocks'

// Encrypting the secret is not what is under test, and is slow in jsdom.
vi.mock('../../lib/privateKey', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/privateKey')>()),
  setPrivateKey: vi.fn(() => Promise.resolve()),
}))
vi.mock('../../lib/mnemonic', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/mnemonic')>()),
  setMnemonic: vi.fn(() => Promise.resolve()),
}))

const validMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const privateKey = new Uint8Array(32).fill(0xaa)

function renderConnect(initInfo: Record<string, unknown>) {
  const initWallet = vi.fn(() => Promise.resolve())
  render(
    <DevModeContext.Provider value={mockDevModeContextValue}>
      <NavigationContext.Provider value={mockNavigationContextValue as any}>
        <FlowContext.Provider value={{ ...mockFlowContextValue, initInfo } as any}>
          <WalletContext.Provider value={{ ...mockWalletContextValue, initWallet } as any}>
            <Connect />
          </WalletContext.Provider>
        </FlowContext.Provider>
      </NavigationContext.Provider>
    </DevModeContext.Provider>,
  )
  return initWallet
}

// The private-key branch used to drop `restoring`, so an nsec restore skipped
// `wallet.restore()` and the swap rebuild read an incomplete history.
describe('Connect screen — restoring flag', () => {
  it('passes restoring through for a private key', async () => {
    const initWallet = renderConnect({ privateKey, password: 'pw', restoring: true })
    await waitFor(() => expect(initWallet).toHaveBeenCalledWith({ privateKey, restoring: true }))
  })

  it('passes restoring through for a mnemonic', async () => {
    const initWallet = renderConnect({ mnemonic: validMnemonic, password: 'pw', restoring: true, walletMode: 'static' })
    await waitFor(() =>
      expect(initWallet).toHaveBeenCalledWith({ mnemonic: validMnemonic, walletMode: 'static', restoring: true }),
    )
  })

  it('does not restore a newly created wallet', async () => {
    const initWallet = renderConnect({
      mnemonic: validMnemonic,
      password: 'pw',
      restoring: false,
      walletMode: 'static',
    })
    await waitFor(() =>
      expect(initWallet).toHaveBeenCalledWith({ mnemonic: validMnemonic, walletMode: 'static', restoring: false }),
    )
  })
})

describe('Connect screen — passkey wallets', () => {
  beforeEach(() => localStorage.clear())

  it('opens a passkey-derived wallet without a password and stores no words', async () => {
    const { setMnemonic } = await import('../../lib/mnemonic')
    vi.mocked(setMnemonic).mockClear()
    const initWallet = renderConnect({
      mnemonic: validMnemonic,
      passkeyPrf: true,
      restoring: false,
      walletMode: 'static',
    })
    await waitFor(() =>
      expect(initWallet).toHaveBeenCalledWith(
        expect.objectContaining({ mnemonic: validMnemonic, walletMode: 'static', restoring: false }),
      ),
    )
    expect(setMnemonic).not.toHaveBeenCalled()
  })

  // Backup decrypts stored words for a PRF wallet too, and would show them as its recovery phrase.
  it('forgets a failed attempt’s stored secret instead of keeping it as these words', async () => {
    localStorage.setItem(MNEMONIC_STORAGE_KEY, 'stale-encrypted-words')
    localStorage.setItem(NSEC_STORAGE_KEY, 'stale-encrypted-nsec')
    const initWallet = renderConnect({
      mnemonic: validMnemonic,
      passkeyPrf: true,
      restoring: false,
      walletMode: 'static',
    })
    await waitFor(() => expect(initWallet).toHaveBeenCalled())
    expect(localStorage.getItem(MNEMONIC_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(NSEC_STORAGE_KEY)).toBeNull()
  })

  it('hands the passkey unlock metadata to initWallet, which saves it with the pubkey', async () => {
    const passkeyUnlock = { passkeyPrf: true, passkeyId: 'ab', passkeyRpId: 'localhost', lockedByBiometrics: false }
    const initWallet = renderConnect({
      mnemonic: validMnemonic,
      passkeyPrf: true,
      passkeyUnlock,
      restoring: false,
      walletMode: 'static',
    })
    await waitFor(() => expect(initWallet).toHaveBeenCalledWith(expect.objectContaining({ passkeyUnlock })))
  })

  // Saved without `lockedByBiometrics`, this wallet is asked for a password its owner never had.
  it('hands the no-PRF fallback’s biometrics metadata through the password branch too', async () => {
    const passkeyUnlock = { lockedByBiometrics: true, passkeyId: 'ab', passkeyRpId: 'localhost' }
    const initWallet = renderConnect({
      mnemonic: validMnemonic,
      password: 'cafe',
      passkeyUnlock,
      restoring: false,
      walletMode: 'static',
    })
    await waitFor(() => expect(initWallet).toHaveBeenCalledWith(expect.objectContaining({ passkeyUnlock })))
  })
})
