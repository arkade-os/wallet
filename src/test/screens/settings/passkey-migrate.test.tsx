import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the ceremony pieces: the crypto round-trip is proven elsewhere; here we
// verify the WIRING and, critically, the safety ORDERING — funds must move
// before the old seed is erased (the provider's migrateToPasskeyWallet does
// the erasing, so it must be called last).
const calls: string[] = []
vi.mock('../../../lib/passkey', () => ({
  isWebAuthnSupported: vi.fn(() => true),
  registerPasskey: vi.fn(async () => {
    calls.push('registerPasskey')
    return { kind: 'prf', credentialId: 'cafe', prfOutput: new Uint8Array(32).fill(3) }
  }),
}))
vi.mock('../../../lib/passkeyVault', () => ({
  hasPasskeyWallet: vi.fn(() => false),
  mnemonicFromPrf: vi.fn(async () => 'legal winner thank year wave sausage worth useful legal winner thank yellow'),
}))
vi.mock('../../../lib/migrate', () => ({
  computeNewWalletAddress: vi.fn(async () => 'tark1qnewwalletaddress'),
}))
vi.mock('../../../lib/asp', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  sendOffChain: vi.fn(async () => {
    calls.push('send')
    return 'txid123'
  }),
}))

import Passkey from '../../../screens/Settings/Passkey'
import { WalletContext } from '../../../providers/wallet'
import { AspContext } from '../../../providers/asp'
import { ConfigContext } from '../../../providers/config'
import { SwapsContext } from '../../../providers/swaps'
import { NavigationContext } from '../../../providers/navigation'
import { hasPasskeyWallet } from '../../../lib/passkeyVault'
import { sendOffChain } from '../../../lib/asp'
import {
  mockAspContextValue,
  mockConfigContextValue,
  mockNavigationContextValue,
  mockWalletContextValue,
} from '../mocks'

const hasPasskeyWalletMock = vi.mocked(hasPasskeyWallet)
const sendOffChainMock = vi.mocked(sendOffChain)

function renderPasskey(overrides: Record<string, unknown> = {}, pendingSwaps = false) {
  const svcWallet = { getBalance: vi.fn(async () => ({ available: 42_000 })) }
  const migrateToPasskeyWallet = vi.fn(async () => {
    calls.push('migrate')
  })
  const getSwapHistory = vi.fn(async () =>
    pendingSwaps ? [{ status: 'swap.created' }] : [{ status: 'invoice.settled' }],
  )
  render(
    <NavigationContext.Provider value={mockNavigationContextValue as any}>
      <AspContext.Provider value={mockAspContextValue as any}>
        <ConfigContext.Provider value={mockConfigContextValue as any}>
          <SwapsContext.Provider value={{ getSwapHistory } as any}>
            <WalletContext.Provider
              value={
                {
                  ...mockWalletContextValue,
                  svcWallet,
                  migrateToPasskeyWallet,
                  assetBalances: [],
                  wallet: { nextRollover: 0, restoredFromSeed: true },
                  ...overrides,
                } as any
              }
            >
              <Passkey />
            </WalletContext.Provider>
          </SwapsContext.Provider>
        </ConfigContext.Provider>
      </AspContext.Provider>
    </NavigationContext.Provider>,
  )
  return { svcWallet, migrateToPasskeyWallet, getSwapHistory }
}

describe('Passkey settings — seed→passkey migration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    calls.length = 0
    hasPasskeyWalletMock.mockReturnValue(false)
  })

  it('shows the passkey status for passkey wallets', () => {
    hasPasskeyWalletMock.mockReturnValue(true)
    renderPasskey()
    expect(screen.getByText('Secured with a passkey')).toBeInTheDocument()
  })

  it('runs the migration in the safe order: send funds BEFORE erasing the old seed', async () => {
    const { migrateToPasskeyWallet } = renderPasskey()

    fireEvent.click(screen.getByRole('button', { name: /create passkey & move funds/i }))

    await waitFor(() => expect(screen.getByText('Wallet secured')).toBeInTheDocument())
    // ordering is the safety property: a failure before migrate leaves the old
    // wallet fully intact
    expect(calls).toEqual(['registerPasskey', 'send', 'migrate'])
    expect(sendOffChainMock).toHaveBeenCalledWith(expect.anything(), 42_000, 'tark1qnewwalletaddress')
    expect(migrateToPasskeyWallet).toHaveBeenCalledWith(
      'cafe',
      'legal winner thank year wave sausage worth useful legal winner thank yellow',
    )
  })

  it('skips the send when the balance is zero', async () => {
    renderPasskey({ svcWallet: { getBalance: vi.fn(async () => ({ available: 0 })) } })

    fireEvent.click(screen.getByRole('button', { name: /create passkey & move funds/i }))

    await waitFor(() => expect(screen.getByText('Wallet secured')).toBeInTheDocument())
    expect(sendOffChainMock).not.toHaveBeenCalled()
  })

  it('blocks migration while swaps are pending', async () => {
    const { migrateToPasskeyWallet } = renderPasskey({}, true)

    fireEvent.click(screen.getByRole('button', { name: /create passkey & move funds/i }))

    expect(await screen.findByText(/pending swaps/i)).toBeInTheDocument()
    expect(migrateToPasskeyWallet).not.toHaveBeenCalled()
    expect(sendOffChainMock).not.toHaveBeenCalled()
  })

  it('blocks migration while the wallet holds assets', async () => {
    renderPasskey({ assetBalances: [{ assetId: 'a', amount: BigInt(1) }] })
    expect(screen.getByRole('button', { name: /create passkey & move funds/i })).toBeDisabled()
  })
})
