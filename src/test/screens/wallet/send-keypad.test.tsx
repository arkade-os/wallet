import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A phone: the keypad opens by itself once the recipient resolves, and covers the form.
vi.mock('../../../lib/browser', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/browser')>()),
  isMobileBrowser: true,
}))
vi.mock('@branta-ops/branta', async () => {
  const actual = await vi.importActual<typeof import('@branta-ops/branta')>('@branta-ops/branta')
  const unknown = { status: actual.VerifyStatus.Unknown, verifyUrl: 'https://guardrail.branta.pro/v2/verify/none' }
  return {
    ...actual,
    BrantaService: class {
      verify = () => Promise.resolve(unknown)
    },
  }
})
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import createFetchMock from 'vitest-fetch-mock'
import { emptySendInfo, FlowContext, type SendInfo } from '../../../providers/flow'
import { LimitsContext } from '../../../providers/limits'
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
import { AspContext } from '../../../providers/asp'
import { WalletContext } from '../../../providers/wallet'
import { NavigationContext } from '../../../providers/navigation'
import SendForm from '../../../screens/Wallet/Send/Form'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { OptionsContext } from '../../../providers/options'
import { SwapsContext } from '../../../providers/swaps'
import { LNURL_LIGHTNING_RAIL } from '../../../lib/sendRouter'
import fixtures from '../../fixtures.json'

const ARK = fixtures.lib.address.ark[0].address
const svcWallet = {
  ...mockSvcWallet,
  getAddress: () => ARK,
  getBoardingAddress: () => Promise.resolve('bcrt1mockboarding'),
} as any

let current: SendInfo = emptySendInfo
function StatefulForm({ balance, swapsContext = {} }: { balance: number; swapsContext?: object }) {
  const [sendInfo, setSendInfo] = useState<SendInfo>(emptySendInfo)
  current = sendInfo
  return (
    <NavigationContext.Provider value={mockNavigationContextValue}>
      <AspContext.Provider value={mockAspContextValue}>
        <ConfigContext.Provider value={mockConfigContextValue as any}>
          <FiatContext.Provider value={mockFiatContextValue as any}>
            <OptionsContext.Provider value={mockOptionsContextValue as any}>
              <FlowContext.Provider value={{ ...mockFlowContextValue, sendInfo, setSendInfo } as any}>
                <WalletContext.Provider
                  value={{ ...mockWalletContextValue, balance, availableBalance: balance, svcWallet } as any}
                >
                  <SwapsContext.Provider value={swapsContext as any}>
                    <LimitsContext.Provider value={mockLimitsContextValue}>
                      <SendForm />
                    </LimitsContext.Provider>
                  </SwapsContext.Provider>
                </WalletContext.Provider>
              </FlowContext.Provider>
            </OptionsContext.Provider>
          </FiatContext.Provider>
        </ConfigContext.Provider>
      </AspContext.Provider>
    </NavigationContext.Provider>
  )
}

const press = (...keys: string[]) => keys.forEach((k) => fireEvent.click(screen.getByTestId(`keyboard-${k}`)))
const typeRecipient = (container: HTMLElement, value: string) =>
  fireEvent.change(container.querySelector('input[name="send-address"]')!, { target: { value } })

afterEach(cleanup)

describe('Send on a phone, the keypad', () => {
  it('opens by itself once the recipient resolves', async () => {
    const { container } = render(<StatefulForm balance={100_000} />)
    expect(screen.queryByTestId('save-amount')).not.toBeInTheDocument()

    typeRecipient(container, ARK)

    expect(await screen.findByTestId('save-amount')).toBeInTheDocument()
  })

  // The keypad used to be a component declared inside the form, so every render of the form made
  // a new component type and React remounted it: digits typed while anything else updated (a
  // recipient check finishing, a balance refresh) were thrown away and Continue stayed disabled.
  it('keeps the digits already typed when the form renders again underneath it', async () => {
    const { container, rerender } = render(<StatefulForm balance={100_000} />)
    typeRecipient(container, ARK)
    await screen.findByTestId('save-amount')

    // The mock wallet enters amounts in euros, two decimals, filled from the right.
    press('5', '0')
    expect(screen.getByTestId('keyboard-amount')).toHaveTextContent('€0.50')
    rerender(<StatefulForm balance={100_001} />)
    expect(screen.getByTestId('keyboard-amount')).toHaveTextContent('€0.50')
    press('0', '0')

    expect(screen.getByTestId('keyboard-amount')).toHaveTextContent('€50.00')
    expect(screen.getByTestId('save-amount')).toBeEnabled()

    fireEvent.click(screen.getByTestId('save-amount'))
    await waitFor(() => expect(current.satoshis).toBeGreaterThan(0))
  })
})

describe('Send on a phone, Max to an LNURL whose rail charges a fee', () => {
  const LNURL = 'alice@pay.example'
  const BALANCE = 995
  const FEE = 5

  it('is the form’s Max: the fee comes out of the amount and exactly the balance is spent', async () => {
    const fetchMocker = createFetchMock(vi)
    fetchMocker.enableMocks()
    fetchMocker.mockResponse(() =>
      JSON.stringify({
        tag: 'payRequest',
        callback: 'https://pay.example/cb',
        minSendable: 1_000,
        maxSendable: 1_000_000_000,
        metadata: '[]',
        paymentOptions: [{ id: 'ln', type: 'lightning' }],
      }),
    )
    const quoted: number[] = []
    const sendRouter = async () =>
      ({
        options: async ({ raw, amount }: { raw: string; amount: number }) => [
          {
            railId: LNURL_LIGHTNING_RAIL,
            quote: async () => {
              quoted.push(amount)
              return {
                railId: LNURL_LIGHTNING_RAIL,
                amount,
                fee: FEE,
                total: amount + FEE,
                meta: { lnurl: { target: raw } },
              }
            },
          },
        ],
      }) as never

    const { container } = render(<StatefulForm balance={BALANCE} swapsContext={{ sendRouter }} />)
    typeRecipient(container, LNURL)
    await waitFor(() => expect(current.lnUrl).toBe(LNURL), { timeout: 3_000 })

    fireEvent.click(await screen.findByTestId('keyboard-max', undefined, { timeout: 3_000 }))

    // Max closes the keypad and hands over to the form, which knows about fees and the reserve.
    await waitFor(() => expect(screen.queryByTestId('save-amount')).not.toBeInTheDocument())
    const button = await waitFor(() => screen.getByText('Continue').closest('button')!, { timeout: 3_000 })
    await waitFor(() => expect(button).toBeEnabled(), { timeout: 3_000 })
    fireEvent.click(button)
    await waitFor(() => expect(current.pendingLnSend).toBeDefined(), { timeout: 3_000 })
    fetchMocker.disableMocks()

    expect(quoted).toEqual([BALANCE, BALANCE - FEE])
    expect(current.pendingLnSend).toMatchObject({ amount: BALANCE - FEE, total: BALANCE })
    expect(current.satoshis).toBe(BALANCE - FEE)
  })
})
