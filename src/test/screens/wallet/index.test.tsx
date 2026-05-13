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
  convertFiat: vi.fn((amount: number) => amount),
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
  const setRecvInfo = vi.fn()
  const setSendInfo = vi.fn()
  const setOption = vi.fn()

  const utils = render(
    <NavigationContext.Provider value={{ ...mockNavigationContextValue, navigate } as any}>
      <AspContext.Provider value={mockAspContextValue as any}>
        <ConfigContext.Provider value={{ ...mockConfigContextValue, configLoaded: true } as any}>
          <FlowContext.Provider value={{ ...mockFlowContextValue, setAssetInfo, setRecvInfo, setSendInfo } as any}>
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

  return { ...utils, navigate, setAssetInfo, setOption, setRecvInfo, setSendInfo }
}

describe('Wallet screen', () => {
  it('renders the wallet screen with the portfolio hero and sections', () => {
    renderWallet()
    // PortfolioHero shows the total portfolio balance
    expect(screen.getByTestId('main-balance')).toBeInTheDocument()
    // Accounts section header
    expect(screen.getByText('Accounts')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Receive' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Swap' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Scan' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Create asset')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('View all assets')).not.toBeInTheDocument()
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
    const assets = screen.getByText('Accounts')

    expect(banner.compareDocumentPosition(assets) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('opens settings as a wallet detail screen', async () => {
    const { navigate, setOption } = renderWallet()

    await userEvent.click(screen.getByTestId('top-right-settings'))

    expect(setOption).toHaveBeenCalledWith(SettingsOptions.Menu)
    expect(navigate).toHaveBeenCalledWith(Pages.WalletSettings)
    expect(navigate).not.toHaveBeenCalledWith(Pages.Settings)
  })

  it('opens the scanner from the home action row through send', async () => {
    const { navigate, setSendInfo } = renderWallet()

    await userEvent.click(screen.getByRole('button', { name: 'Scan' }))

    expect(setSendInfo).toHaveBeenCalledWith(expect.objectContaining({ scan: true }))
    expect(navigate).toHaveBeenCalledWith(Pages.SendForm)
  })
})
