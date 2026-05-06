import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Wallet from '../../../screens/Wallet/Index'
import { WalletContext } from '../../../providers/wallet'
import { ConfigContext } from '../../../providers/config'
import { FlowContext } from '../../../providers/flow'
import { FiatContext } from '../../../providers/fiat'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { NudgeContext } from '../../../providers/nudge'
import { AspContext } from '../../../providers/asp'
import { AnnouncementContext } from '../../../providers/announcements'
import { OptionsContext } from '../../../providers/options'
import { SettingsOptions } from '../../../lib/types'
import {
  mockWalletContextValue,
  mockConfigContextValue,
  mockFlowContextValue,
  mockNavigationContextValue,
  mockOptionsContextValue,
  mockAspContextValue,
} from '../mocks'

const mockFiatContextValue = {
  toFiat: vi.fn((sats: number) => (sats / 100000000) * 50000),
  fiatDecimals: vi.fn(() => 2),
  fromFiat: vi.fn((fiat: number) => (fiat * 100000000) / 50000),
  btcPrice: 50000,
  loading: false,
}

const mockNudgeContextValue = {
  nudge: null,
  nudgeVisible: false,
  nudgeCheckComplete: true,
}

const mockAnnouncementContextValue = {
  announcement: null,
}

function renderWallet(nudgeContextValue = mockNudgeContextValue) {
  const navigate = vi.fn()
  const setAssetInfo = vi.fn()
  const setOption = vi.fn()

  const utils = render(
    <NavigationContext.Provider value={{ ...mockNavigationContextValue, navigate } as any}>
      <AspContext.Provider value={mockAspContextValue as any}>
        <ConfigContext.Provider value={{ ...mockConfigContextValue, configLoaded: true } as any}>
          <FlowContext.Provider value={{ ...mockFlowContextValue, setAssetInfo } as any}>
            <FiatContext.Provider value={mockFiatContextValue as any}>
              <WalletContext.Provider value={{ ...mockWalletContextValue, balance: 0, txs: [] } as any}>
                <NudgeContext.Provider value={nudgeContextValue as any}>
                  <AnnouncementContext.Provider value={mockAnnouncementContextValue as any}>
                    <OptionsContext.Provider value={{ ...mockOptionsContextValue, setOption } as any}>
                      <Wallet />
                    </OptionsContext.Provider>
                  </AnnouncementContext.Provider>
                </NudgeContext.Provider>
              </WalletContext.Provider>
            </FiatContext.Provider>
          </FlowContext.Provider>
        </ConfigContext.Provider>
      </AspContext.Provider>
    </NavigationContext.Provider>,
  )

  return { ...utils, navigate, setAssetInfo, setOption }
}

describe('Wallet screen', () => {
  it('renders the wallet screen with the portfolio hero and sections', () => {
    renderWallet()
    // PortfolioHero shows the total portfolio balance
    expect(screen.getByTestId('main-balance')).toBeInTheDocument()
    // Assets section header
    expect(screen.getByText('Assets')).toBeInTheDocument()
    // Recent activity section header
    expect(screen.getByText('Recent activity')).toBeInTheDocument()
  })

  it('renders dismissible home banners above assets', () => {
    renderWallet({
      ...mockNudgeContextValue,
      nudge: <div data-testid='home-banner'>Home banner</div>,
      nudgeVisible: true,
    })

    const banner = screen.getByTestId('home-banner')
    const assets = screen.getByText('Assets')

    expect(banner.compareDocumentPosition(assets) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('navigates create asset to the mint page', async () => {
    const { navigate, setAssetInfo } = renderWallet()

    await userEvent.click(screen.getByTestId('assets-create'))

    expect(setAssetInfo).toHaveBeenCalledWith({ assetId: '', supply: 0 })
    expect(navigate).toHaveBeenCalledWith(Pages.AppAssetMint)
    expect(navigate).not.toHaveBeenCalledWith(undefined)
  })

  it('opens settings as a wallet detail screen', async () => {
    const { navigate, setOption } = renderWallet()

    await userEvent.click(screen.getByTestId('top-right-settings'))

    expect(setOption).toHaveBeenCalledWith(SettingsOptions.Menu)
    expect(navigate).toHaveBeenCalledWith(Pages.WalletSettings)
    expect(navigate).not.toHaveBeenCalledWith(Pages.Settings)
  })
})
