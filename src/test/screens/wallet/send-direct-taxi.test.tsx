import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { hex } from '@scure/base'
import { emptySendInfo, FlowContext, type SendInfo } from '../../../providers/flow'
import { LimitsContext } from '../../../providers/limits'
import { AspContext } from '../../../providers/asp'
import { WalletContext } from '../../../providers/wallet'
import { NavigationContext } from '../../../providers/navigation'
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
import { ASSET_ID, INFO, KEYS, RECEIVER_ADDRESS, TAXI_URL, taxiFetch } from '../../lib/receiverTaxiFixtures'

const SendForm = (await import('../../../screens/Wallet/Send/Form')).default

const aspInfo = { ...mockAspContextValue.aspInfo, signerPubkey: KEYS.server, dust: 330n }
const SLOW = { timeout: 3_000 }

const Flow = ({ children }: { children: React.ReactNode }) => {
  const [sendInfo, setSendInfo] = useState<SendInfo>(emptySendInfo)
  return (
    <FlowContext.Provider value={{ ...mockFlowContextValue, sendInfo, setSendInfo } as any}>
      {children}
    </FlowContext.Provider>
  )
}

/** Alice, holding plenty of bitcoin and no assets, pays `uri`. */
const renderSend = (uri?: string) => {
  const navigate = vi.fn()
  const walletContext = {
    ...mockWalletContextValue,
    availableBalance: 50_000,
    svcWallet: {
      ...mockSvcWallet,
      getAddress: () => Promise.resolve(RECEIVER_ADDRESS),
      getBoardingAddress: () => Promise.resolve('bcrt1mockboarding'),
    },
  }
  render(
    <NavigationContext.Provider value={{ ...mockNavigationContextValue, navigate }}>
      <AspContext.Provider value={{ ...mockAspContextValue, aspInfo }}>
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
  if (uri) fireEvent.change(document.querySelector('input[name="send-address"]')!, { target: { value: uri } })
  return navigate
}

const button = (name: string) => screen.getByRole('button', { name })

beforeEach(() => {
  localStorage.clear()
  vi.stubEnv('VITE_TAXI_URL', TAXI_URL)
  vi.stubEnv('VITE_EMULATOR_PUBKEY', KEYS.emulator)
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('a Taxi payment the Taxi failed to submit', () => {
  const FAILED = {
    transferId: 't-1',
    state: 'locking',
    submissionPhase: 'failed',
    failureCode: 'lockup_submission_invalid_provider_response',
    failureDetail: 'server checkpoint 0 changed unsigned fields or metadata',
    updatedAt: 1,
  }

  it.each([['an asset', { assetId: ASSET_ID, assetAmount: '1' }]])(
    'says so for %s after one check, and lets her forget it to send again',
    async (_, payment) => {
      const senderKey = hex.encode(await mockSvcWallet.identity.xOnlyPublicKey())
      const key = `directTaxiPending:regtest:${senderKey}`
      localStorage.setItem(
        key,
        JSON.stringify({
          network: 'regtest',
          senderKey,
          taxiUrl: TAXI_URL,
          operatorKey: KEYS.operator,
          transferId: 't-1',
          expectedTxid: 'a'.repeat(64),
          expectedVout: 0,
          mode: 'recycle',
          receiverAddress: RECEIVER_ADDRESS,
          ...payment,
        }),
      )
      const fetch = taxiFetch({ info: INFO, statuses: [FAILED] })
      vi.stubGlobal('fetch', fetch)
      renderSend()
      await waitFor(() => expect(button('Check Taxi payment')).toBeEnabled(), SLOW)
      await userEvent.click(button('Check Taxi payment'))
      expect(
        await screen.findByText(
          'Taxi could not submit this payment: server checkpoint 0 changed unsigned fields or metadata ' +
            '(lockup_submission_invalid_provider_response). Nothing has been delivered.',
        ),
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          'Taxi transfer t-1: its coins may stay locked until the operator resolves it. ' +
            'Forgetting it lets you send again; it does not cancel it.',
        ),
      ).toBeInTheDocument()
      expect(fetch.mock.calls.filter(([url]) => String(url).includes('/v1/transfers/'))).toHaveLength(1)
      expect(localStorage.getItem(key)).not.toBeNull()
      await userEvent.click(button('Forget Taxi payment'))
      expect(localStorage.getItem(key)).toBeNull()
      expect(await screen.findByRole('button', { name: 'Continue' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Forget Taxi payment' })).toBeNull()
    },
  )
})
