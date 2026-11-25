import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DesktopWalletShell from '../../../components/DesktopWalletShell'
import { AspContext } from '../../../providers/asp'
import { ConfigContext } from '../../../providers/config'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { OptionsContext } from '../../../providers/options'
import { WalletContext } from '../../../providers/wallet'
import Predict from '../../../screens/Wallet/Predict/Index'
import PredictSection from '../../../screens/Wallet/PredictSection'
import {
  mockAspContextValue,
  mockConfigContextValue,
  mockNavigationContextValue,
  mockOptionsContextValue,
  mockSvcWallet,
  mockWalletContextValue,
} from '../mocks'

vi.mock('../../../lib/predict/marketFeed', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/predict/marketFeed')>()
  return {
    ...actual,
    fetchPredictMarket: vi.fn(async () => ({
      priceCents: 6_500_000,
      samples: [
        { priceCents: 6_495_000, time: Math.floor(Date.now() / 1000) - 60 },
        { priceCents: 6_500_000, time: Math.floor(Date.now() / 1000) },
      ],
      vol: 0.55,
      source: 'dia' as const,
      updatedAt: Date.now(),
    })),
  }
})

vi.mock('../../../lib/predict/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/predict/constants')>()
  return {
    ...actual,
    getPredictConfig: (network?: string | null, arkServerUrl?: string) => ({
      ...actual.getPredictConfig(network, arkServerUrl),
      demoMode: true,
    }),
  }
})

function renderPredict(balance = 500_000) {
  const svcWallet = {
    ...mockSvcWallet,
    getAddress: () => Promise.resolve('ark1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq'),
  }
  return render(
    <NavigationContext.Provider value={mockNavigationContextValue}>
      <AspContext.Provider
        value={{ ...mockAspContextValue, aspInfo: { ...mockAspContextValue.aspInfo, network: 'bitcoin' } }}
      >
        <ConfigContext.Provider value={mockConfigContextValue as any}>
          <OptionsContext.Provider value={mockOptionsContextValue as any}>
            <WalletContext.Provider
              value={{
                ...mockWalletContextValue,
                balance,
                availableBalance: balance,
                svcWallet: svcWallet as any,
                wallet: { ...mockWalletContextValue.wallet, pubkey: '02'.repeat(33).slice(0, 66) },
              }}
            >
              <Predict />
            </WalletContext.Provider>
          </OptionsContext.Provider>
        </ConfigContext.Provider>
      </AspContext.Provider>
    </NavigationContext.Provider>,
  )
}

describe('Predict screen & desktop navigation', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(cleanup)

  it('shows Predict in DesktopWalletShell on bitcoin mainnet and navigates to Pages.Predict', () => {
    const navigate = vi.fn()
    render(
      <NavigationContext.Provider value={{ ...mockNavigationContextValue, navigate }}>
        <AspContext.Provider
          value={{ ...mockAspContextValue, aspInfo: { ...mockAspContextValue.aspInfo, network: 'bitcoin' } }}
        >
          <OptionsContext.Provider value={mockOptionsContextValue as any}>
            <DesktopWalletShell logoVisible page={Pages.Wallet} />
          </OptionsContext.Provider>
        </AspContext.Provider>
      </NavigationContext.Provider>,
    )

    const navBtn = screen.getByTestId('desktop-nav-predict')
    expect(navBtn).toBeInTheDocument()
    fireEvent.click(navBtn)
    expect(navigate).toHaveBeenCalledWith(Pages.Predict)
  })

  it('opens with the first-visit explainer, then places a demo prediction', async () => {
    renderPredict()

    const start = await screen.findByTestId('predict-intro-start')
    expect(screen.getByText('Predict Bitcoin’s next move')).toBeInTheDocument()
    fireEvent.click(start)
    expect(localStorage.getItem('arkade-predict-intro-v1')).toBe('1')

    await waitFor(() => expect(screen.getByTestId('predict-spot-price')).toHaveTextContent('$65,000.00'))
    expect(screen.getByText('Make a prediction')).toBeInTheDocument()
    expect(screen.getByTestId('predict-call-higher')).toHaveAttribute('aria-checked', 'true')

    fireEvent.click(screen.getByTestId('predict-call-lower'))
    expect(screen.getByTestId('predict-call-lower')).toHaveAttribute('aria-checked', 'true')

    fireEvent.click(screen.getByTestId('predict-stake-field'))
    fireEvent.click(await screen.findByTestId('predict-preset-25000'))
    expect(screen.getByTestId('predict-stake-value')).toHaveTextContent('25,000 sats')

    const reviewBtn = screen.getByRole('button', { name: 'Review prediction' })
    await waitFor(() => expect(reviewBtn).toBeEnabled())
    fireEvent.click(reviewBtn)

    const confirmBtn = await screen.findByRole('button', { name: 'Place demo prediction' })
    expect(screen.getByTestId('predict-quote-rows')).toHaveTextContent('25,000 sats')
    expect(confirmBtn).toBeDisabled()
    fireEvent.click(screen.getByTestId('predict-ack'))
    expect(confirmBtn).toBeEnabled()
    fireEvent.click(confirmBtn)

    await waitFor(() => expect(screen.getByTestId('predict-detail-hero')).toBeInTheDocument())
  })

  it('refuses a stake below the minimum', async () => {
    localStorage.setItem('arkade-predict-intro-v1', '1')
    renderPredict()
    await waitFor(() => expect(screen.getByTestId('predict-spot-price')).toHaveTextContent('$65,000.00'))

    fireEvent.click(screen.getByTestId('predict-stake-field'))
    for (const key of ['5', '0', '0', '0']) fireEvent.click(await screen.findByTestId(`keyboard-${key}`))
    fireEvent.click(screen.getByTestId('save-amount'))

    expect(screen.getByRole('alert')).toHaveTextContent('25,000')
    expect(screen.getByRole('button', { name: 'Review prediction' })).toBeDisabled()
  })

  it('refuses a stake above the maximum', async () => {
    localStorage.setItem('arkade-predict-intro-v1', '1')
    renderPredict()
    await waitFor(() => expect(screen.getByTestId('predict-spot-price')).toHaveTextContent('$65,000.00'))

    fireEvent.click(screen.getByTestId('predict-stake-field'))
    for (const key of ['2', '0', '0', '0', '0', '0']) fireEvent.click(await screen.findByTestId(`keyboard-${key}`))
    fireEvent.click(screen.getByTestId('save-amount'))

    expect(screen.getByRole('alert')).toHaveTextContent('100,000')
    expect(screen.getByRole('button', { name: 'Review prediction' })).toBeDisabled()
  })

  it('rotates what a sample stake pays on each side on Home', async () => {
    render(
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <AspContext.Provider
          value={{ ...mockAspContextValue, aspInfo: { ...mockAspContextValue.aspInfo, network: 'bitcoin' } }}
        >
          <ConfigContext.Provider value={mockConfigContextValue as any}>
            <PredictSection />
          </ConfigContext.Provider>
        </AspContext.Provider>
      </NavigationContext.Provider>,
    )
    await waitFor(() =>
      expect(screen.getByTestId('home-predict-line')).toHaveTextContent(/If (Higher|Lower) wins: 100,000 sats →/),
    )
    const first = screen.getByTestId('home-predict-line').textContent
    await waitFor(() => expect(screen.getByTestId('home-predict-line').textContent).not.toBe(first), { timeout: 5_000 })
  })
})
