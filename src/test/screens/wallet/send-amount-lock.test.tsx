import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SendForm from '../../../screens/Wallet/Send/Form'
import { AspContext } from '../../../providers/asp'
import { ConfigContext } from '../../../providers/config'
import { FeesContext } from '../../../providers/fees'
import { FiatContext } from '../../../providers/fiat'
import { FlowContext, emptySendInfo } from '../../../providers/flow'
import { LimitsContext } from '../../../providers/limits'
import { SwapsContext } from '../../../providers/swaps'
import { NavigationContext } from '../../../providers/navigation'
import { OptionsContext } from '../../../providers/options'
import { WalletContext } from '../../../providers/wallet'
import fixtures from '../../fixtures.json'
import { decodeInvoice } from '../../../lib/bolt11'
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

vi.mock('../../../lib/logs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/logs')>()),
  consoleError: vi.fn(),
}))

vi.mock('../../../lib/swapMarkets', () => ({ discoverMarkets: async () => [] }))

const INVOICE = fixtures.lib.bolt11.invoice
const INVOICE_SATS = decodeInvoice(INVOICE).amountSats
const BALANCE = 1_000_000

/** A price where the invoice's sats do not survive two fiat decimals: the
 *  field renders "1.65" and reading that back gives 2,103, not 2,100. One cent
 *  is worth ~13 sats, so no rate makes this round-trip safe. */
const PRICE = 78_460
const rate = {
  ...mockFiatContextValue,
  toFiat: (sats = 0) => (sats / 1e8) * PRICE,
  fromFiat: (fiat = 0) => Math.round((fiat / PRICE) * 1e8),
  toFiatAmount: (sats = 0) => (sats / 1e8) * PRICE,
  fromFiatAmount: (fiat = 0) => Math.round((fiat / PRICE) * 1e8),
  fiatDecimals: () => 2,
}

const setSendInfo = vi.fn()
const formWallet = { ...mockSvcWallet, getAddress: async () => 'ark1self', getBoardingAddress: async () => 'bcrt1self' }
const swaps = { sendRouter: async () => ({ options: async () => [] }) }

const renderForm = () =>
  render(
    <NavigationContext.Provider value={mockNavigationContextValue}>
      <AspContext.Provider value={mockAspContextValue}>
        <ConfigContext.Provider value={mockConfigContextValue as never}>
          <FiatContext.Provider value={rate as never}>
            <OptionsContext.Provider value={mockOptionsContextValue as never}>
              <FlowContext.Provider value={{ ...mockFlowContextValue, sendInfo: emptySendInfo, setSendInfo } as never}>
                <WalletContext.Provider
                  value={
                    {
                      ...mockWalletContextValue,
                      balance: BALANCE,
                      availableBalance: BALANCE,
                      svcWallet: formWallet,
                    } as never
                  }
                >
                  <SwapsContext.Provider value={swaps as never}>
                    <LimitsContext.Provider value={mockLimitsContextValue}>
                      <FeesContext.Provider value={{ calcOnchainOutputFee: () => 500 } as never}>
                        <SendForm />
                      </FeesContext.Provider>
                    </LimitsContext.Provider>
                  </SwapsContext.Provider>
                </WalletContext.Provider>
              </FlowContext.Provider>
            </OptionsContext.Provider>
          </FiatContext.Provider>
        </ConfigContext.Provider>
      </AspContext.Provider>
    </NavigationContext.Provider>,
  )

/** Paste the invoice the way a user does, and wait out the parse debounce. */
const pasteInvoice = async (container: HTMLElement) => {
  const recipient = container.querySelector('input[name="send-address"]')!
  fireEvent.change(recipient, { target: { value: INVOICE } })
  await waitFor(() => expect(setSendInfo).toHaveBeenCalled(), { timeout: 3_000 })
}

const satoshisWritten = () =>
  setSendInfo.mock.calls
    .map((call) => call[0])
    .filter((arg): arg is { satoshis?: number } => typeof arg === 'object' && arg !== null)
    .filter((arg) => 'satoshis' in arg)
    .map((arg) => arg.satoshis)

describe('an amount the destination pinned', () => {
  beforeEach(() => setSendInfo.mockClear())

  it('is displayed as the invoice’s own sats, not a fiat round-trip of them', async () => {
    const { container } = renderForm()
    await pasteInvoice(container)

    // The lossy path renders 0.00002103 for a 2,100-sat invoice.
    const exact = `0.${String(INVOICE_SATS).padStart(8, '0')}`
    await waitFor(() => expect(screen.getByText(`${exact} BTC`)).toBeInTheDocument())
  })

  it('is not replaced by the balance when the available amount is tapped', async () => {
    const { container } = renderForm()
    await pasteInvoice(container)

    await screen.findByText(/available$/)
    // Re-queried at the click: the control remounts on every render.
    const offered = screen.getByText(/available$/).parentElement!
    expect(offered.getAttribute('style') ?? '').not.toContain('cursor: pointer')

    fireEvent.click(offered)
    expect(satoshisWritten()).not.toContain(BALANCE)
  })
})
