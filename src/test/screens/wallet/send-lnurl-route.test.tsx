import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeHandle } from '@arkade-os/sdk'
import SendDetails from '../../../screens/Wallet/Send/Details'
import { AspContext } from '../../../providers/asp'
import { ConfigContext } from '../../../providers/config'
import { FeesContext } from '../../../providers/fees'
import { FiatContext } from '../../../providers/fiat'
import { FlowContext, type SendInfo } from '../../../providers/flow'
import { LimitsContext } from '../../../providers/limits'
import { NavigationContext } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
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

const TARGET = 'alice@pay.example'
const SATS = 5_000

const lnurlQuote = (railId: string, sent = vi.fn(), over: { target?: string; fee?: number } = {}) => ({
  railId,
  amount: SATS,
  fee: over.fee ?? 0,
  total: SATS + (over.fee ?? 0),
  meta: { lnurl: { target: over.target ?? TARGET, via: railId === LNURL_ARKADE_RAIL ? 'ark' : 'lightning' } },
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

const renderSign = (sendInfo: SendInfo, limits = mockLimitsContextValue) =>
  render(
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
    </NavigationContext.Provider>,
  )

const sign = async () => fireEvent.click(await screen.findByText('Tap to Sign'))
const sendFailure = () => consoleError.mock.calls.find((c) => c[1] === 'error sending payment')?.[0]

describe('signing an LNURL send', () => {
  beforeEach(() => {
    localStorage.clear()
    consoleError.mockClear()
    setSendInfo.mockClear()
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
})
