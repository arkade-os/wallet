import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeHandle } from '@arkade-os/sdk'
import type { VerifyExpectation } from '@arkade-os/lnurl-client'
import SendDetails from '../../../screens/Wallet/Send/Details'
import { AspContext } from '../../../providers/asp'
import { ConfigContext } from '../../../providers/config'
import { FeesContext } from '../../../providers/fees'
import { FiatContext } from '../../../providers/fiat'
import { FlowContext, type SendInfo } from '../../../providers/flow'
import { LimitsContext } from '../../../providers/limits'
import { NavigationContext } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import { LanguageContext, translate } from '../../../providers/language'
import { Language } from '../../../lib/types'
import { LNURL_ARKADE_RAIL, LNURL_LIGHTNING_RAIL } from '../../../lib/sendRouter'
import { lnurlSends } from '../../../lib/lnurlSends'
import {
  mockAspContextValue,
  mockConfigContextValue,
  mockFiatContextValue,
  mockFlowContextValue,
  mockLimitsContextValue,
  mockNavigationContextValue,
  mockSvcWallet,
  mockWalletContextValue,
} from '../mocks'

const consoleError = vi.fn()
vi.mock('../../../lib/logs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/logs')>()),
  consoleError: (...args: unknown[]) => consoleError(...args),
}))

const addConfirmation = vi.hoisted(() => vi.fn())
vi.mock('../../../lib/lnurlConfirmations', () => ({ pendingConfirmations: { add: addConfirmation, forget: vi.fn() } }))

const TARGET = 'alice@pay.example'
const SATS = 5_000

const lnurlQuote = (
  railId: string,
  sent = vi.fn(),
  over: { target?: string; fee?: number; verify?: string; verifyBatch?: string; expect?: VerifyExpectation } = {},
) => ({
  railId,
  amount: SATS,
  fee: over.fee ?? 0,
  total: SATS + (over.fee ?? 0),
  meta: {
    lnurl: {
      target: over.target ?? TARGET,
      via: railId === LNURL_ARKADE_RAIL ? 'ark' : 'lightning',
      ...(over.verify ? { verify: over.verify } : {}),
      ...(over.verifyBatch ? { verifyBatch: over.verifyBatch } : {}),
      ...(over.expect ? { expect: over.expect } : {}),
    },
  },
  send: async () => {
    sent()
    return makeHandle(railId, async (emit) => {
      const result = { railId, txid: `${railId}-txid`, ...(railId === LNURL_LIGHTNING_RAIL ? { swapId: 'rfq-1' } : {}) }
      emit({ status: railId === LNURL_ARKADE_RAIL ? 'settled' : 'sent', result })
      return railId === LNURL_ARKADE_RAIL ? result : await new Promise<any>(() => {})
    })
  },
})

const setSendInfo = vi.fn()

const renderSign = (sendInfo: SendInfo, limits = mockLimitsContextValue, language = Language.English) =>
  render(
    <LanguageContext.Provider value={{ language, t: (key, params) => translate(language, key, params) }}>
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <ConfigContext.Provider value={mockConfigContextValue}>
          <FiatContext.Provider value={mockFiatContextValue}>
            <AspContext.Provider value={mockAspContextValue}>
              <FeesContext.Provider value={{ calcOnchainOutputFee: () => 500 } as never}>
                <FlowContext.Provider value={{ ...mockFlowContextValue, sendInfo, setSendInfo }}>
                  <WalletContext.Provider
                    value={{ ...mockWalletContextValue, balance: 1_000_000, svcWallet: mockSvcWallet as never }}
                  >
                    <LimitsContext.Provider value={limits}>
                      <SendDetails />
                    </LimitsContext.Provider>
                  </WalletContext.Provider>
                </FlowContext.Provider>
              </FeesContext.Provider>
            </AspContext.Provider>
          </FiatContext.Provider>
        </ConfigContext.Provider>
      </NavigationContext.Provider>
    </LanguageContext.Provider>,
  )

const sign = async (language = Language.English) =>
  fireEvent.click(await screen.findByText(translate(language, 'send.tapToSign')))
const sendFailure = () => consoleError.mock.calls.find((c) => c[1] === 'error sending payment')?.[0]

describe('signing an LNURL send', () => {
  beforeEach(() => {
    localStorage.clear()
    consoleError.mockClear()
    setSendInfo.mockClear()
    addConfirmation.mockClear()
  })

  it('pays the Arkade leg the form quoted and records who was paid', async () => {
    const sent = vi.fn()
    renderSign({ lnUrl: TARGET, satoshis: SATS, pendingLnSend: lnurlQuote(LNURL_ARKADE_RAIL, sent) as never })
    expect(await screen.findByText('Paying inside Arkade')).toBeInTheDocument()
    await sign()

    await waitFor(() =>
      expect(setSendInfo).toHaveBeenCalledWith(
        expect.objectContaining({ txid: `${LNURL_ARKADE_RAIL}-txid`, railId: LNURL_ARKADE_RAIL }),
      ),
    )
    expect(sent).toHaveBeenCalledTimes(1)
    expect(lnurlSends()).toEqual([
      expect.objectContaining({ txid: `${LNURL_ARKADE_RAIL}-txid`, target: TARGET, railId: LNURL_ARKADE_RAIL }),
    ])
  })

  it('returns on the funding of the Lightning leg, with the swap on the record', async () => {
    renderSign({
      lnUrl: TARGET,
      satoshis: SATS,
      pendingLnSend: lnurlQuote(LNURL_LIGHTNING_RAIL, vi.fn(), { fee: 70 }) as never,
    })
    expect(await screen.findByText('Paying to Lightning')).toBeInTheDocument()
    await sign()

    await waitFor(() => expect(setSendInfo).toHaveBeenCalledWith(expect.objectContaining({ total: SATS + 70 })))
    expect(lnurlSends()).toEqual([expect.objectContaining({ swapId: 'rfq-1', feeSat: 70, target: TARGET })])
  })

  it('never pays a quote made for another LNURL target', async () => {
    const sent = vi.fn()
    const stale = lnurlQuote(LNURL_ARKADE_RAIL, sent, { target: 'bob@pay.example' })
    renderSign({ lnUrl: TARGET, satoshis: SATS, pendingLnSend: stale as never })
    await sign()

    await waitFor(() => expect(sendFailure()).toBeDefined())
    expect(String(sendFailure())).toMatch(/different payment/i)
    expect(sent).not.toHaveBeenCalled()
    expect(lnurlSends()).toEqual([])
  })

  it('pays nothing on an account that may not send offchain', async () => {
    const sent = vi.fn()
    renderSign(
      { lnUrl: TARGET, satoshis: SATS, pendingLnSend: lnurlQuote(LNURL_ARKADE_RAIL, sent) as never },
      { ...mockLimitsContextValue, vtxoTxsAllowed: () => false },
    )
    await sign()

    await waitFor(() => expect(String(sendFailure())).toMatch(/offchain not allowed/i))
    expect(sent).not.toHaveBeenCalled()
  })

  it.each([
    ['a quote made for another target', { target: 'bob@pay.example' }, mockLimitsContextValue, 'otro pago'],
    [
      'on an account that may not send offchain',
      {},
      { ...mockLimitsContextValue, vtxoTxsAllowed: (): boolean => false },
      'offchain no está permitido',
    ],
  ])('refuses %s in the wallet language', async (_case, over, limits, spanish) => {
    const quote = lnurlQuote(LNURL_ARKADE_RAIL, vi.fn(), over)
    renderSign({ lnUrl: TARGET, satoshis: SATS, pendingLnSend: quote as never }, limits, Language.Spanish)
    await sign(Language.Spanish)

    await waitFor(() => expect(String(sendFailure())).toContain(spanish))
  })

  it('pays the BIP21 address it shows, not the LNURL, on an account that may not send offchain', async () => {
    const sent = vi.fn()
    renderSign(
      {
        address: 'bc1qfallback',
        lnUrl: TARGET,
        satoshis: SATS,
        pendingLnSend: lnurlQuote(LNURL_ARKADE_RAIL, sent) as never,
      },
      { ...mockLimitsContextValue, vtxoTxsAllowed: () => false },
    )
    expect(await screen.findByText('Paying to mainnet')).toBeInTheDocument()
    await sign()

    await waitFor(() => expect(sendFailure() ?? setSendInfo.mock.calls.at(-1)).toBeDefined())
    expect(sent).not.toHaveBeenCalled()
    expect(String(sendFailure() ?? '')).not.toMatch(/offchain not allowed/i)
  })
})

describe('Review Focus 5: verifyBatch send confirmations', () => {
  beforeEach(() => {
    localStorage.clear()
    addConfirmation.mockClear()
  })

  it('keeps the original confirmation window when funding takes time', async () => {
    let now = 1_000
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    let fund!: () => void
    const quote = lnurlQuote(LNURL_LIGHTNING_RAIL, vi.fn(), { verify: 'https://alice.example/verify/slow' })
    quote.send = async () =>
      makeHandle(LNURL_LIGHTNING_RAIL, (emit) => {
        fund = () => emit({ status: 'sent', result: { railId: LNURL_LIGHTNING_RAIL, txid: 'slow-funding' } })
        return new Promise(() => {})
      })
    renderSign({ lnUrl: TARGET, satoshis: SATS, pendingLnSend: quote as never })
    await sign()
    await waitFor(() => expect(fund).toBeDefined())
    now = 61_000
    fund()

    await waitFor(() =>
      expect(addConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'slow-funding',
          startedAt: 1_000,
        }),
      ),
    )
    expect(lnurlSends()[0].createdAt).toBe(1_000)
  })

  it('registers a confirmation for the verify URL the rail carried, without delaying the send', async () => {
    const quote = lnurlQuote(LNURL_ARKADE_RAIL, vi.fn(), {
      verify: 'https://alice.example/verify/1',
      verifyBatch: 'https://alice.example/verifyBatch',
      expect: { paymentOption: 'arkade', paymentDestination: 'ark1recipient' },
    })
    renderSign({ lnUrl: TARGET, satoshis: SATS, pendingLnSend: quote as never })
    await sign()

    // The rail is reported sent and recorded even though nothing has awaited the confirmation.
    await waitFor(() =>
      expect(setSendInfo).toHaveBeenCalledWith(expect.objectContaining({ txid: `${LNURL_ARKADE_RAIL}-txid` })),
    )
    expect(addConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({
        key: `${LNURL_ARKADE_RAIL}-txid`,
        startedAt: lnurlSends()[0].createdAt,
        expect: { paymentOption: 'arkade', paymentDestination: 'ark1recipient' },
        verifyUrl: 'https://alice.example/verify/1',
        verifyBatch: 'https://alice.example/verifyBatch',
      }),
    )
  })

  it('marks the recorded send confirmed once the confirmation settles', async () => {
    const quote = lnurlQuote(LNURL_ARKADE_RAIL, vi.fn(), { verify: 'https://alice.example/verify/1' })
    renderSign({ lnUrl: TARGET, satoshis: SATS, pendingLnSend: quote as never })
    await sign()
    await waitFor(() => expect(addConfirmation).toHaveBeenCalled())

    addConfirmation.mock.calls[0][0].onSettled()

    expect(lnurlSends()).toEqual([
      expect.objectContaining({ txid: `${LNURL_ARKADE_RAIL}-txid`, receiverConfirmed: true }),
    ])
  })

  it('marks the recorded send unconfirmed on a deadline or transport failure, leaving the rest of the row alone', async () => {
    const quote = lnurlQuote(LNURL_ARKADE_RAIL, vi.fn(), { verify: 'https://alice.example/verify/1' })
    renderSign({ lnUrl: TARGET, satoshis: SATS, pendingLnSend: quote as never })
    await sign()
    await waitFor(() => expect(addConfirmation).toHaveBeenCalled())
    const [before] = lnurlSends()

    addConfirmation.mock.calls[0][0].onError(new Error('receiver did not confirm settlement in time'))

    expect(lnurlSends()).toEqual([{ ...before, receiverConfirmed: false }])
  })

  it('registers no confirmation for a rail whose destination carries no verify URL', async () => {
    const quote = lnurlQuote(LNURL_ARKADE_RAIL)
    renderSign({ lnUrl: TARGET, satoshis: SATS, pendingLnSend: quote as never })
    await sign()

    await waitFor(() => expect(lnurlSends()).toHaveLength(1))
    expect(addConfirmation).not.toHaveBeenCalled()
  })
})
