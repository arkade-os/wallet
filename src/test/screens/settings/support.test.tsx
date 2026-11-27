import { render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Support from '../../../screens/Settings/Support'
import { AspContext } from '../../../providers/asp'
import { ConfigContext } from '../../../providers/config'
import { NavigationContext } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import {
  mockAspContextValue,
  mockConfigContextValue,
  mockNavigationContextValue,
  mockSvcWallet,
  mockWalletContextValue,
} from '../mocks'

vi.mock('../../../components/ChatWoot', () => ({ default: () => null }))

// real keys: the screen derives the default address from them
const KEY = '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
const aspInfo = { ...mockAspContextValue.aspInfo, signerPubkey: KEY }

const chatwoot = { setUser: vi.fn(), setCustomAttributes: vi.fn(), toggleBubbleVisibility: vi.fn(), toggle: vi.fn() }

beforeEach(() => {
  vi.clearAllMocks()
  ;(window as any).$chatwoot = chatwoot
})
afterEach(() => {
  delete (window as any).$chatwoot
})

const renderSupport = (executorSettled: () => Promise<unknown>, address = 'ark1twin') => {
  const svcWallet = {
    ...mockSvcWallet,
    getAddress: async () => address,
    getOwnAddress: async () => 'ark1own',
    getBoardingAddress: async () => 'bc1boarding',
  }
  const wallet = { ...mockWalletContextValue, wallet: { pubkey: KEY, network: 'regtest' }, svcWallet }
  return render(
    <NavigationContext.Provider value={mockNavigationContextValue}>
      <AspContext.Provider value={{ ...mockAspContextValue, aspInfo } as any}>
        <ConfigContext.Provider value={mockConfigContextValue as any}>
          <WalletContext.Provider value={{ ...wallet, executorSettled } as any}>
            <Support />
          </WalletContext.Provider>
        </ConfigContext.Provider>
      </AspContext.Provider>
    </NavigationContext.Provider>,
  )
}

describe('Support addresses', () => {
  it('reports the address the user is shown, and the wallet own one beside it, after the registration settled', async () => {
    renderSupport(async () => ({ status: 'success' }))

    await waitFor(() => expect(chatwoot.setCustomAttributes).toHaveBeenCalled())
    expect(chatwoot.setCustomAttributes).toHaveBeenCalledWith(
      expect.objectContaining({
        ark_address: 'ark1twin',
        wallet_ark_address: 'ark1own',
        btc_boarding_address: 'bc1boarding',
      }),
    )
  })

  it('reports the same address twice when the wallet has no twin', async () => {
    renderSupport(async () => ({ status: 'no-executor' }), 'ark1own')

    await waitFor(() => expect(chatwoot.setCustomAttributes).toHaveBeenCalled())
    expect(chatwoot.setCustomAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ ark_address: 'ark1own', wallet_ark_address: 'ark1own' }),
    )
  })
})
