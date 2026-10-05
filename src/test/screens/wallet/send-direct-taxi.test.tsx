import { useState } from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
import {
  ASSET_ID,
  BITCOIN_INFO,
  KEYS,
  RECEIVER_ADDRESS,
  TAXI_URL,
  legacyBitcoinQuote,
  senderCoin,
  taxiFetch,
} from '../../lib/receiverTaxiFixtures'

const sendDirectTaxi = vi.hoisted(() => vi.fn())
vi.mock('../../../lib/directTaxiSend', async (original) => ({
  ...(await original<typeof import('../../../lib/directTaxiSend')>()),
  sendDirectTaxi,
}))
// jsdom has no IndexedDB, and a real send reads the funding reservations from this repository.
vi.mock('../../../lib/swapRepository', async (importOriginal) => {
  const { InMemoryAssetSwapRepository } = await vi.importActual<typeof import('@arkade-os/swap')>('@arkade-os/swap')
  return {
    ...(await importOriginal<typeof import('../../../lib/swapRepository')>()),
    assetSwapRepository: new InMemoryAssetSwapRepository(),
  }
})

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
const renderSend = (uri?: string, wallet: Record<string, unknown> = {}, heldAsset?: bigint) => {
  const navigate = vi.fn()
  const walletContext = {
    ...mockWalletContextValue,
    availableBalance: 50_000,
    ...(heldAsset === undefined
      ? {}
      : {
          assetBalances: [{ assetId: ASSET_ID, amount: heldAsset }],
          availableAssetBalances: [{ assetId: ASSET_ID, amount: heldAsset }],
          assetMetadataCache: new Map([[ASSET_ID, { metadata: { name: 'RideCoin', ticker: 'RDC', decimals: 0 } }]]),
        }),
    svcWallet: {
      ...mockSvcWallet,
      getAddress: () => Promise.resolve(RECEIVER_ADDRESS),
      getBoardingAddress: () => Promise.resolve('bcrt1mockboarding'),
      ...wallet,
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
  await userEvent.click(await screen.findByRole('radio', { name: mode }, SLOW))
  await waitFor(() => expect(screen.getByTestId('taxi-send-mode')).toHaveTextContent(mode), SLOW)
}

const pay = async () => {
  await waitFor(() => expect(button('Continue')).toBeEnabled(), SLOW)
  await userEvent.click(button('Continue'))
}

beforeAll(() => {
  if (!globalThis.PointerEvent) vi.stubGlobal('PointerEvent', MouseEvent)
})

beforeEach(() => {
  if (!globalThis.PointerEvent) vi.stubGlobal('PointerEvent', MouseEvent)
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
  it('offers only sender-funded carrier modes for an asset receiver without sats', async () => {
    renderSend(
      'bitcoin:?ark=' + RECEIVER_ADDRESS + '&assetid=' + ASSET_ID + '&amount=500' + NAMED + '&taxipayer=sender',
      {},
      500n,
    )
    await userEvent.click(await screen.findByTestId('taxi-send-mode', {}, SLOW))
    expect(screen.getAllByRole('radio').map((item) => item.getAttribute('aria-label'))).toEqual([
      'Sender pays sats',
      'Sender pays asset fare',
      'Sender sponsors carrier',
    ])
  })

  it('does not offer purchase claims that would change an exact sub-dust amount to dust', async () => {
    vi.stubGlobal(
      'fetch',
      taxiFetch({
        info: {
          ...BITCOIN_INFO,
          assetRules: BITCOIN_INFO.assetRules.map((rule) =>
            rule.assetId === null ? { ...rule, claim: 'either' } : rule,
          ),
        },
      }),
    )
    renderSend(request('0.0000005'))
    await userEvent.click(await screen.findByTestId('taxi-send-mode', {}, SLOW))
    expect(screen.getAllByRole('radio').map((item) => item.getAttribute('aria-label'))).toEqual([
      'No Taxi: sub-dust coin',
      'Receiver uses own sats',
    ])
  })

  it.each(['invalid', 'receiver&taxipayer=sender'])(
    'blocks the previous destination after malformed repayment preference %s',
    async (payer) => {
      const navigate = renderSend(request('0.0000005', NAMED))
      await screen.findByTestId('taxi-send-mode', {}, SLOW)
      await waitFor(() => expect(button('Continue')).toBeEnabled(), SLOW)
      fireEvent.change(document.querySelector('input[name="send-address"]')!, {
        target: { value: request('0.0000005', NAMED + '&taxipayer=' + payer) },
      })
      expect(button('Continue')).toBeDisabled()
      await waitFor(() => expect(screen.getByText('Invalid Taxi repayment preference')).toBeInTheDocument(), SLOW)
      expect(button('Continue')).toBeDisabled()
      expect(sendDirectTaxi).not.toHaveBeenCalled()
      expect(navigate).not.toHaveBeenCalled()
    },
  )

  it('blocks an exact sub-dust request whose receiver asks the sender to cover the carrier', async () => {
    const navigate = renderSend(request('0.0000005', NAMED + '&taxipayer=sender'))
    expect(
      await screen.findByText(/Sender-covered delivery cannot preserve this exact sub-dust amount/, {}, SLOW),
    ).toBeInTheDocument()
    expect(button('Continue')).toBeDisabled()
    expect(screen.queryByTestId('taxi-send-mode')).toBeNull()
    expect(sendDirectTaxi).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('bounds an unanswered Taxi probe and shows it as unavailable after abort', async () => {
    const controller = new AbortController()
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal)
    const fetch = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal!.reason), { once: true })
        }),
    )
    vi.stubGlobal('fetch', fetch)
    renderSend(request('0.000001'))
    await waitFor(() => expect(fetch).toHaveBeenCalled(), SLOW)
    expect(timeout).toHaveBeenCalledWith(10_000)
    expect(fetch).toHaveBeenCalledWith(`${TAXI_URL}/v1/info`, expect.objectContaining({ signal: controller.signal }))
    act(() => controller.abort())
    expect(await screen.findByText("Taxi unavailable: it can't be reached", {}, SLOW)).toBeInTheDocument()
    expect(screen.queryByText('Checking Taxi…')).toBeNull()
    expect(screen.queryByTestId('taxi-send-mode')).toBeNull()
  })

  it('defaults to a compatible Taxi for sub-dust requests', async () => {
    renderSend(request('0.000001'))
    const carrier = await screen.findByTestId('taxi-send-mode', {}, SLOW)
    expect(carrier).toHaveTextContent('Receiver uses own sats')
    await userEvent.click(carrier)
    expect((await screen.findAllByRole('radio', {}, SLOW)).map((item) => item.getAttribute('aria-label'))).toEqual([
      'No Taxi: sub-dust coin',
      'Receiver uses own sats',
    ])
  })

  it('refuses a Taxi that can only deliver a full dust coin instead of the requested amount', async () => {
    const info = {
      ...BITCOIN_INFO,
      assetRules: BITCOIN_INFO.assetRules.map((rule) =>
        rule.assetId === null
          ? { ...rule, fares: [{ id: 'sats', currency: 'sats', pricing: { kind: 'flat', units: '1' } }] }
          : rule,
      ),
    }
    vi.stubGlobal('fetch', taxiFetch({ info }))
    const navigate = renderSend(request('0.0000005'))
    expect(
      await screen.findByText('Taxi unavailable: it cannot deliver this exact amount', {}, SLOW),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('taxi-send-mode')).toBeNull()
    await pay()
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(Pages.SendDetails), SLOW)
    expect(sendDirectTaxi).not.toHaveBeenCalled()
  })

  it.each(['receiver', 'sender'])('uses an amountless %s hint only when the sender chooses sub-dust', async (payer) => {
    const fetch = taxiFetch({ info: BITCOIN_INFO })
    vi.stubGlobal('fetch', fetch)
    renderSend('bitcoin:?ark=' + RECEIVER_ADDRESS + '&taxi=' + encodeURIComponent(TAXI_URL) + '&taxipayer=' + payer)
    await waitFor(
      () =>
        expect((document.querySelector('input[name="send-address"]') as HTMLInputElement).value).toContain(
          'taxipayer=',
        ),
      SLOW,
    )
    expect(screen.queryByTestId('taxi-send-mode')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
    fireEvent.change(document.querySelector('input[name="send-amount"]')!, { target: { value: '1000' } })
    await waitFor(() => expect(button('Continue')).toBeEnabled(), SLOW)
    expect(screen.queryByTestId('taxi-send-mode')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
    fireEvent.change(document.querySelector('input[name="send-amount"]')!, { target: { value: '50' } })
    if (payer === 'receiver') {
      expect(await screen.findByTestId('taxi-send-mode', {}, SLOW)).toHaveTextContent('Receiver uses own sats')
    } else {
      expect(
        await screen.findByText(/Sender-covered delivery cannot preserve this exact sub-dust amount/, {}, SLOW),
      ).toBeInTheDocument()
      expect(button('Continue')).toBeDisabled()
    }
  })

  it('uses a URL-only request without requiring a taxikey', async () => {
    renderSend(request('0.0000005', '&taxi=' + encodeURIComponent(TAXI_URL) + '&taxipayer=receiver'))
    await screen.findByTestId('taxi-send-mode', {}, SLOW)
    await pay()
    await waitFor(
      () =>
        expect(sendDirectTaxi).toHaveBeenCalledWith(
          expect.objectContaining({
            amount: 50n,
            mode: 'recycle',
            taxi: { url: TAXI_URL, operatorKey: undefined, fareId: undefined, payer: 'receiver' },
          }),
        ),
      SLOW,
    )
  })

  it('uses the named Taxi by default without an extra carrier selection', async () => {
    renderSend(request('0.0000005', NAMED))
    await screen.findByTestId('taxi-send-mode', {}, SLOW)
    await pay()
    await waitFor(
      () =>
        expect(sendDirectTaxi).toHaveBeenCalledWith(
          expect.objectContaining({
            amount: 50n,
            mode: 'recycle',
            taxi: { url: TAXI_URL, operatorKey: KEYS.operator, fareId: 'sats' },
          }),
        ),
      SLOW,
    )
  })

  it('respects an explicit No Taxi choice and sends without Taxi', async () => {
    const navigate = renderSend(request('0.0000005'))
    await chooseCarrier('No Taxi: sub-dust coin')
    await pay()
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(Pages.SendDetails), SLOW)
    expect(sendDirectTaxi).not.toHaveBeenCalled()
  })

  it('defaults a fresh request after an explicit opt-out', async () => {
    renderSend(request('0.0000005'))
    await chooseCarrier('No Taxi: sub-dust coin')
    fireEvent.change(document.querySelector('input[name="send-address"]')!, { target: { value: request('0.000001') } })
    await waitFor(() => expect(screen.getByTestId('taxi-send-mode')).toHaveTextContent('Receiver uses own sats'), SLOW)
    expect(screen.getByTestId('taxi-send-mode')).toHaveTextContent('Free')
  })

  it('stops at Continue when the Taxi quotes another amount than she typed, and moves nothing', async () => {
    const actual = await vi.importActual<typeof import('../../../lib/directTaxiSend')>('../../../lib/directTaxiSend')
    sendDirectTaxi.mockImplementation(actual.sendDirectTaxi)
    Object.defineProperty(navigator, 'locks', {
      value: { request: (_: string, run: () => unknown) => run() },
      configurable: true,
    })
    const senderKey = hex.encode(await mockSvcWallet.identity.xOnlyPublicKey())
    const fetch = taxiFetch({ info: BITCOIN_INFO, transfer: legacyBitcoinQuote(senderKey) })
    vi.stubGlobal('fetch', fetch)
    const coin = await senderCoin(mockSvcWallet.identity, 1_000)
    try {
      const navigate = renderSend(request('0.000001'), { getSpendableVtxos: async () => [coin] })
      await chooseCarrier('Receiver uses own sats')
      await pay()
      expect(await screen.findByText("This Taxi can't carry an exact sub-dust amount", {}, SLOW)).toBeInTheDocument()
      expect(navigate).not.toHaveBeenCalled()
      expect(fetch.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1)
      expect(Object.keys(localStorage).filter((key) => key.startsWith('directTaxiPending'))).toEqual([])
    } finally {
      delete (navigator as { locks?: unknown }).locks
    }
  })

  it('hands sendDirectTaxi the sub-dust amount, the network Taxi and the carrier chosen', async () => {
    renderSend(request('0.000001'))
    await chooseCarrier('Receiver uses own sats')
    await pay()
    await waitFor(
      () =>
        expect(sendDirectTaxi).toHaveBeenCalledWith(
          expect.objectContaining({
            assetId: undefined,
            amount: 100n,
            mode: 'recycle',
            receiverAddress: RECEIVER_ADDRESS,
            taxi: { url: TAXI_URL, operatorKey: undefined, fareId: undefined },
          }),
        ),
      SLOW,
    )
  })

  it('hands sendDirectTaxi the Taxi the request names, pinned to its key and fare', async () => {
    renderSend(request('0.000001', NAMED))
    await chooseCarrier('Receiver uses own sats')
    await pay()
    await waitFor(
      () =>
        expect(sendDirectTaxi).toHaveBeenCalledWith(
          expect.objectContaining({
            mode: 'recycle',
            taxi: { url: TAXI_URL, operatorKey: KEYS.operator, fareId: 'sats' },
          }),
        ),
      SLOW,
    )
  })

  it('words the sub-dust terms sendDirectTaxi asks her to confirm', async () => {
    sendDirectTaxi.mockImplementation(async ({ confirmPayment }) => {
      const terms = { mode: 'recycle', assetAmount: 100n, fareCurrency: 'sats', fareUnits: 0n, carrierSats: 230n }
      await confirmPayment(terms)
    })
    renderSend(request('0.000001'))
    await chooseCarrier('Receiver uses own sats')
    await pay()
    expect(await screen.findByTestId('taxi-confirm-costs', {}, SLOW)).toHaveTextContent(
      'Send 100 sats. Service fee: Free. Taxi adds 230 sats so it arrives as a full 330-sat coin. ' +
        "The receiver claims it with a coin of at least 230 sats of their own, repaying Taxi. If it isn't claimed, " +
        'your 100 sats come back to you.',
    )
  })

  it.each([
    ['is paused', { ...BITCOIN_INFO, paused: true }, '', 'it is paused'],
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
  const transferPolls = (fetch: ReturnType<typeof taxiFetch>) =>
    fetch.mock.calls.filter(([url]) => String(url).includes('/v1/transfers/'))

  const storeFailed = async (payment: Record<string, string>) => {
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
    return key
  }

  const checkFailed = async () => {
    await waitFor(() => expect(button('Check Taxi payment')).toBeEnabled(), SLOW)
    await userEvent.click(button('Check Taxi payment'))
    await waitFor(() => expect(button('Forget Taxi payment')).toBeEnabled(), SLOW)
  }

  it.each([
    ['an asset', { assetId: ASSET_ID, assetAmount: '1' }],
    ['sub-dust bitcoin', { assetAmount: '100' }],
  ])('says so for %s after one check, and lets her forget it to send again', async (_, payment) => {
    const key = await storeFailed(payment)
    const fetch = taxiFetch({ info: BITCOIN_INFO, statuses: [FAILED] })
    vi.stubGlobal('fetch', fetch)
    renderSend()
    await checkFailed()
    expect(
      screen.getByText(
        'Taxi could not submit this payment: server checkpoint 0 changed unsigned fields or metadata ' +
          '(lockup_submission_invalid_provider_response). ' +
          'It has not been delivered yet; the Taxi operator may still complete it.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Taxi transfer t-1: its coins may stay locked until the operator resolves it. ' +
          'Forgetting it lets you send again; it does not cancel it, ' +
          'and if the operator later completes it, sending again pays the receiver twice.',
      ),
    ).toBeInTheDocument()
    expect(transferPolls(fetch)).toHaveLength(1)
    expect(localStorage.getItem(key)).not.toBeNull()
    await userEvent.click(button('Forget Taxi payment'))
    expect(await screen.findByRole('button', { name: 'Continue' }, SLOW)).toBeInTheDocument()
    expect(transferPolls(fetch)).toHaveLength(2)
    expect(localStorage.getItem(key)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Forget Taxi payment' })).toBeNull()
  })

  it('shows a payment that landed before she forgot it as sent, rather than letting her send it again', async () => {
    const key = await storeFailed({ assetId: ASSET_ID, assetAmount: '1' })
    const landed = { transferId: 't-1', state: 'locked', outpoint: { txid: 'a'.repeat(64), vout: 0 }, updatedAt: 2 }
    vi.stubGlobal('fetch', taxiFetch({ info: BITCOIN_INFO, statuses: [FAILED, landed] }))
    const navigate = renderSend()
    await checkFailed()
    await userEvent.click(button('Forget Taxi payment'))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(Pages.SendSuccess), SLOW)
    expect(localStorage.getItem(key)).toBeNull()
  })
})
