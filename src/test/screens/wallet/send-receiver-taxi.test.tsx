import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { emptySendInfo, FlowContext, type SendInfo } from '../../../providers/flow'
import { LimitsContext } from '../../../providers/limits'
import { AspContext } from '../../../providers/asp'
import { WalletContext } from '../../../providers/wallet'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { OptionsContext } from '../../../providers/options'
import {
  mockAspContextValue,
  mockConfigContextValue,
  mockFiatContextValue,
  mockFlowContextValue,
  mockLimitsContextValue,
  mockNavigationContextValue,
  mockOptionsContextValue,
  mockSvcWallet,
  mockWalletContextValue,
} from '../mocks'
import { ASSET_ID, KEYS, RECEIVER_ADDRESS, TAXI_URL } from '../../lib/receiverTaxiFixtures'

const payAssetRequest = vi.hoisted(() => vi.fn())
const discoverMarkets = vi.hoisted(() => vi.fn())
vi.mock('../../../lib/assetRfqSend', async (original) => ({
  ...(await original<typeof import('../../../lib/assetRfqSend')>()),
  payAssetRequest,
  walletAssetRfqDeps: vi.fn(() => ({})),
}))
vi.mock('../../../lib/swapMarkets', async (original) => ({
  ...(await original<typeof import('../../../lib/swapMarkets')>()),
  discoverMarkets,
}))

const SendForm = (await import('../../../screens/Wallet/Send/Form')).default

const REQUEST = `bitcoin:?ark=${RECEIVER_ADDRESS}&assetid=${ASSET_ID}&amount=500&taxi=${encodeURIComponent(TAXI_URL)}&taxikey=${KEYS.operator}&taxifare=flat`

const Flow = ({ children }: { children: React.ReactNode }) => {
  const [sendInfo, setSendInfo] = useState<SendInfo>(emptySendInfo)
  return (
    <FlowContext.Provider value={{ ...mockFlowContextValue, sendInfo, setSendInfo } as any}>
      {children}
    </FlowContext.Provider>
  )
}

/** Alice pays Bob's Taxi-bearing request for 500 units, holding `held` of them and plenty of bitcoin. */
const payWhileHolding = async (held: bigint) => {
  const navigate = vi.fn()
  const walletContext = {
    ...mockWalletContextValue,
    availableBalance: 50_000,
    assetBalances: held > 0n ? [{ assetId: ASSET_ID, amount: held }] : [],
    availableAssetBalances: held > 0n ? [{ assetId: ASSET_ID, amount: held }] : [],
    assetMetadataCache: new Map([[ASSET_ID, { metadata: { name: 'RideCoin', ticker: 'RDC', decimals: 0 } }]]),
    svcWallet: {
      ...mockSvcWallet,
      getAddress: () => Promise.resolve(RECEIVER_ADDRESS),
      getBoardingAddress: () => Promise.resolve('bcrt1mockboarding'),
    },
  }
  render(
    <NavigationContext.Provider value={{ ...mockNavigationContextValue, navigate }}>
      <AspContext.Provider value={mockAspContextValue}>
        <ConfigContext.Provider value={mockConfigContextValue as any}>
          <FiatContext.Provider value={mockFiatContextValue as any}>
            <OptionsContext.Provider value={mockOptionsContextValue as any}>
              <Flow>
                <WalletContext.Provider value={walletContext as any}>
                  <LimitsContext.Provider value={mockLimitsContextValue}>
                    <SendForm />
                  </LimitsContext.Provider>
                </WalletContext.Provider>
              </Flow>
            </OptionsContext.Provider>
          </FiatContext.Provider>
        </ConfigContext.Provider>
      </AspContext.Provider>
    </NavigationContext.Provider>,
  )
  fireEvent.change(document.querySelector('input[name="send-address"]')!, { target: { value: REQUEST } })
  const next = screen.getByText('Continue').closest('button')!
  await waitFor(() => expect(next).toBeEnabled(), { timeout: 3_000 })
  fireEvent.click(next)
  return navigate
}

beforeEach(() => {
  payAssetRequest.mockReset().mockResolvedValue({ fundingTxid: 'f'.repeat(64) })
  discoverMarkets.mockReset().mockResolvedValue([])
})

describe("paying a request that names the receiver's Taxi", () => {
  it('sends the asset directly when the payer holds enough of it: no Taxi probe, no RFQ', async () => {
    const navigate = await payWhileHolding(500n)
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(Pages.SendDetails))
    expect(payAssetRequest).not.toHaveBeenCalled()
    expect(discoverMarkets).not.toHaveBeenCalled()
  })

  it.each([
    ['none', 0n],
    ['some, but not enough', 499n],
  ])('pays through the Taxi rail when she holds %s of the asset', async (_, held) => {
    const navigate = await payWhileHolding(held)
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(Pages.SendSuccess))
    expect(payAssetRequest).toHaveBeenCalledWith(
      {
        arkAddress: RECEIVER_ADDRESS,
        assetId: ASSET_ID,
        amount: 500n,
        taxi: { url: TAXI_URL, operatorKey: KEYS.operator, fareId: 'flat' },
      },
      expect.anything(),
    )
  })
})
