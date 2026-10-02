import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { hex } from '@scure/base'
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
import { ASSET_ID, BITCOIN_INFO, KEYS, RECEIVER_ADDRESS, TAXI_URL, taxiFetch } from '../../lib/receiverTaxiFixtures'

const sendDirectTaxi = vi.hoisted(() => vi.fn())
vi.mock('../../../lib/directTaxiSend', async (original) => ({
  ...(await original<typeof import('../../../lib/directTaxiSend')>()),
  sendDirectTaxi,
}))

const SendForm = (await import('../../../screens/Wallet/Send/Form')).default

const aspInfo = { ...mockAspContextValue.aspInfo, signerPubkey: KEYS.server, dust: 330n }
const request = (amount: string, extra = '') => `bitcoin:?ark=${RECEIVER_ADDRESS}&amount=${amount}${extra}`
const NAMED = `&taxi=${encodeURIComponent(TAXI_URL)}&taxikey=${KEYS.operator}&taxifare=sats`
// The whole form, behind an 800 ms recipient debounce: far past vitest's 5 s default under full-suite load.
const SLOW = { timeout: 10_000 }
const FORM_TEST = { timeout: 20_000 }

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

const chooseCarrier = async (mode: string) => {
  await userEvent.click(await screen.findByTestId('taxi-send-mode', {}, SLOW))
  await userEvent.click(await screen.findByRole('menuitem', { name: mode }, SLOW))
  await waitFor(() => expect(screen.getByTestId('taxi-send-mode')).toHaveTextContent(`Carrier: ${mode}`), SLOW)
}

const pay = async () => {
  await waitFor(() => expect(button('Continue')).toBeEnabled(), SLOW)
  await userEvent.click(button('Continue'))
}

beforeEach(() => {
  localStorage.clear()
  vi.stubEnv('VITE_TAXI_URL', TAXI_URL)
  vi.stubEnv('VITE_EMULATOR_PUBKEY', KEYS.emulator)
  vi.stubGlobal('fetch', taxiFetch({ info: BITCOIN_INFO }))
  sendDirectTaxi.mockReset().mockResolvedValue('b'.repeat(64))
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('sending a sub-dust bitcoin amount to an Arkade address', FORM_TEST, () => {
  it("offers the carriers the Taxi's bitcoin rule allows, starting with none", async () => {
    renderSend(request('0.000001'))
    const carrier = await screen.findByTestId('taxi-send-mode', {}, SLOW)
    expect(carrier).toHaveTextContent('Carrier: No Taxi: sub-dust coin')
    await userEvent.click(carrier)
    expect((await screen.findAllByRole('menuitem', {}, SLOW)).map((item) => item.textContent)).toEqual([
      'No Taxi: sub-dust coin',
      'Receiver uses own sats',
      'Direct delivery, no claim',
    ])
  })

  it('pays through the network Taxi in the carrier chosen', async () => {
    const navigate = renderSend(request('0.000001'))
    await chooseCarrier('Receiver uses own sats')
    await pay()
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(Pages.SendSuccess), SLOW)
    expect(sendDirectTaxi).toHaveBeenCalledWith(
      expect.objectContaining({
        assetId: undefined,
        amount: 100n,
        mode: 'recycle',
        receiverAddress: RECEIVER_ADDRESS,
        taxi: { url: TAXI_URL, operatorKey: undefined, fareId: undefined },
      }),
    )
  })

  it('pays through the Taxi the request names, pinned to its key and fare', async () => {
    renderSend(request('0.000001', NAMED))
    await chooseCarrier('Direct delivery, no claim')
    await pay()
    await waitFor(
      () =>
        expect(sendDirectTaxi).toHaveBeenCalledWith(
          expect.objectContaining({
            mode: 'sponsored',
            taxi: { url: TAXI_URL, operatorKey: KEYS.operator, fareId: 'sats' },
          }),
        ),
      SLOW,
    )
  })

  it('confirms what the Taxi adds and what the receiver must do', async () => {
    sendDirectTaxi.mockImplementation(async ({ confirmPayment }) => {
      const terms = { mode: 'recycle', assetAmount: 100n, fareCurrency: 'sats', fareUnits: 0n, carrierSats: 230n }
      if (!(await confirmPayment(terms))) throw new Error('declined')
      return 'b'.repeat(64)
    })
    const navigate = renderSend(request('0.000001'))
    await chooseCarrier('Receiver uses own sats')
    await pay()
    expect(await screen.findByTestId('taxi-confirm-costs', {}, SLOW)).toHaveTextContent(
      'Send 100 sats. Fare: 0 sats. Taxi adds 230 sats so it arrives as a full 330-sat coin. ' +
        "The receiver claims it with a coin of at least 230 sats of their own, repaying Taxi. If it isn't claimed, " +
        'your 100 sats come back to you.',
    )
    // A plain click: the sheet's drawer handles pointer events with APIs jsdom lacks.
    fireEvent.click(button('Pay'))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(Pages.SendSuccess), SLOW)
  })

  it.each([
    ['is paused', { ...BITCOIN_INFO, paused: true }, '', 'it is paused'],
    [
      'cannot carry an exact amount',
      { ...BITCOIN_INFO, bitcoinPaymentSats: undefined },
      '',
      "it can't carry an exact sub-dust amount yet",
    ],
    [
      'answers to another key than the request names',
      BITCOIN_INFO,
      `&taxi=${encodeURIComponent(TAXI_URL)}&taxikey=${KEYS.other}`,
      'it reported inconsistent keys',
    ],
  ])('says why a Taxi that %s is unavailable, and sends a plain sub-dust coin', async (_, info, extra, reason) => {
    vi.stubGlobal('fetch', taxiFetch({ info }))
    const navigate = renderSend(request('0.000001', extra))
    expect(await screen.findByText(`Taxi unavailable: ${reason}`, {}, SLOW)).toBeInTheDocument()
    expect(screen.queryByTestId('taxi-send-mode')).toBeNull()
    await pay()
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(Pages.SendDetails), SLOW)
    expect(sendDirectTaxi).not.toHaveBeenCalled()
  })

  it('neither offers nor asks a Taxi about an amount at dust', async () => {
    const fetch = taxiFetch({ info: BITCOIN_INFO })
    vi.stubGlobal('fetch', fetch)
    renderSend(request('0.0000033'))
    await waitFor(() => expect(button('Continue')).toBeEnabled(), SLOW)
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(screen.queryByText('Checking Taxi…')).toBeNull()
    expect(screen.queryByTestId('taxi-send-mode')).toBeNull()
    expect(fetch.mock.calls.filter(([url]) => String(url).endsWith('/v1/info'))).toEqual([])
  })
})

describe('a Taxi payment the Taxi failed to submit', FORM_TEST, () => {
  const FAILED = {
    transferId: 't-1',
    state: 'locking',
    submissionPhase: 'failed',
    failureCode: 'lockup_submission_invalid_provider_response',
    failureDetail: 'server checkpoint 0 changed unsigned fields or metadata',
    updatedAt: 1,
  }

  it.each([
    ['an asset', { assetId: ASSET_ID, assetAmount: '1' }],
    ['sub-dust bitcoin', { assetAmount: '100' }],
  ])('says so for %s after one check, and lets her forget it to send again', async (_, payment) => {
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
    const fetch = taxiFetch({ info: BITCOIN_INFO, statuses: [FAILED] })
    vi.stubGlobal('fetch', fetch)
    renderSend()
    await waitFor(() => expect(button('Check Taxi payment')).toBeEnabled(), SLOW)
    await userEvent.click(button('Check Taxi payment'))
    expect(
      await screen.findByText(
        'Taxi could not submit this payment: server checkpoint 0 changed unsigned fields or metadata ' +
          '(lockup_submission_invalid_provider_response). Nothing has been delivered.',
        {},
        SLOW,
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
    expect(await screen.findByRole('button', { name: 'Continue' }, SLOW)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Forget Taxi payment' })).toBeNull()
  })
})
