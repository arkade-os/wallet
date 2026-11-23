import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ContextType, ReactElement } from 'react'
import type { AssetDetails } from '@arkade-os/sdk'
import AppAssetDetail from '../../screens/Apps/Assets/Detail'
import AppAssetImport from '../../screens/Apps/Assets/Import'
import AppAssets from '../../screens/Apps/Assets/Index'
import AppAssetMintSuccess from '../../screens/Apps/Assets/MintSuccess'
import AppAssetsSettings from '../../screens/Apps/Assets/Settings'
import AssetsSection from '../../screens/Wallet/AssetsSection'
import { MAINNET_DEPIX_ASSET_ID } from '../../lib/accountAssets'
import type { Config } from '../../lib/types'
import { AspContext } from '../../providers/asp'
import { AssetsContext } from '../../providers/assets'
import { BackupContext } from '../../providers/backup'
import { ConfigContext } from '../../providers/config'
import { FlowContext } from '../../providers/flow'
import { NavigationContext, Pages } from '../../providers/navigation'
import { WalletContext } from '../../providers/wallet'
import {
  mockAspContextValue,
  mockBackupContextValue,
  mockConfigContextValue,
  mockFlowContextValue,
  mockNavigationContextValue,
  mockWalletContextValue,
} from './mocks'

if (!window.PointerEvent) {
  Object.defineProperty(window, 'PointerEvent', { writable: true, configurable: true, value: MouseEvent })
}

const depix = MAINNET_DEPIX_ASSET_ID
const custom = 'ab'.repeat(34)
const second = '2f'.repeat(34)

const asset = (assetId: string, name: string, ticker: string): AssetDetails => ({
  assetId,
  supply: 10000n,
  metadata: { name, ticker, decimals: 2 },
})

function renderLibrary(
  component: ReactElement,
  options: {
    config?: Partial<Config>
    balance?: number
    holdings?: { assetId: string; amount: bigint }[]
    registry?: string[]
    cache?: AssetDetails[]
    selected?: AssetDetails
  } = {},
) {
  const config = { ...mockConfigContextValue.config, ...options.config }
  const backupAndUpdateConfig = vi.fn()
  const replace = vi.fn()
  const goBack = vi.fn()
  const navigate = vi.fn()
  const cache = new Map(options.cache?.map((entry) => [entry.assetId, { ...entry, cachedAt: 0 }]))
  const sdkAssets = new Map(
    [asset(custom, 'Northstar Asset', 'STAR'), asset(second, 'Independent Dollar', 'IND')].map((entry) => [
      entry.assetId,
      entry,
    ]),
  )
  const getAssetDetails = vi.fn(async (id: string) => sdkAssets.get(id))
  const isRegistered = (id: string) => (options.registry ?? []).includes(id)
  const walletValue = {
    ...mockWalletContextValue,
    balance: options.balance ?? mockWalletContextValue.balance,
    assetBalances: options.holdings ?? [],
    svcWallet: { assetManager: { getAssetDetails } },
    assetMetadataCache: cache,
    isVerifiedAsset: isRegistered,
    setCacheEntry: (id: string, details: AssetDetails) => {
      const entry = { ...details, cachedAt: 0 }
      cache.set(id, entry)
      return entry
    },
  } as unknown as ContextType<typeof WalletContext>

  render(
    <AspContext.Provider
      value={{ ...mockAspContextValue, aspInfo: { ...mockAspContextValue.aspInfo, network: 'bitcoin' } }}
    >
      <ConfigContext.Provider value={{ ...mockConfigContextValue, config }}>
        <AssetsContext.Provider value={{ isRegistered, registryAssetIds: options.registry, registryStatus: 'ready' }}>
          <BackupContext.Provider value={{ ...mockBackupContextValue, backupAndUpdateConfig }}>
            <NavigationContext.Provider value={{ ...mockNavigationContextValue, replace, goBack, navigate }}>
              <WalletContext.Provider value={walletValue}>
                <FlowContext.Provider
                  value={{ ...mockFlowContextValue, assetInfo: options.selected ?? mockFlowContextValue.assetInfo }}
                >
                  {component}
                </FlowContext.Provider>
              </WalletContext.Provider>
            </NavigationContext.Provider>
          </BackupContext.Provider>
        </AssetsContext.Provider>
      </ConfigContext.Provider>
    </AspContext.Provider>,
  )
  return { backupAndUpdateConfig, getAssetDetails, goBack, navigate, replace }
}

describe('asset library', () => {
  it('shows the raw DePix identity and separates owned and zero-balance tracked assets', () => {
    renderLibrary(<AppAssets />, {
      config: { importedAssets: [depix, custom], apps: { assets: { enabled: false } } },
      holdings: [{ assetId: depix, amount: 9500n }],
      registry: [depix],
      cache: [asset(depix, 'DePix', 'DEPIX'), asset(custom, 'Northstar Asset', 'STAR')],
    })

    const held = screen.getByRole('heading', { name: 'Held' }).closest('section')!
    const tracking = screen.getByRole('heading', { name: 'Tracking' }).closest('section')!
    expect(within(held).getByText('DePix', { exact: true })).toBeInTheDocument()
    expect(within(tracking).getByText('Northstar Asset')).toBeInTheDocument()
    expect(within(tracking).getByText('Unverified')).toBeInTheDocument()
    expect(within(tracking).queryByText('DePix', { exact: true })).not.toBeInTheDocument()
    expect(screen.queryByText('BRL', { exact: true })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add asset' })).toBeVisible()
  })

  it('keeps the Assets library free of mint controls when minting is enabled', () => {
    renderLibrary(<AppAssets />, { config: { apps: { assets: { enabled: true } } } })

    expect(screen.queryAllByRole('button', { name: /mint/i })).toHaveLength(0)
    expect(screen.queryByText('Advanced', { exact: true })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add asset' })).toBeVisible()
  })

  it('manages Home visibility for verified held and tracked assets without opening their details', async () => {
    const user = userEvent.setup()
    const { backupAndUpdateConfig, navigate } = renderLibrary(<AppAssets />, {
      config: {
        importedAssets: [second, custom],
        homeAssetVisibility: { [depix]: false },
      },
      holdings: [{ assetId: depix, amount: 9500n }],
      registry: [depix, second],
      cache: [
        asset(depix, 'DePix', 'DEPIX'),
        asset(second, 'Independent Dollar', 'IND'),
        asset(custom, 'Northstar Asset', 'STAR'),
      ],
    })

    const held = screen.getByRole('switch', { name: 'Show on Home for DePix' })
    const tracked = screen.getByRole('switch', { name: 'Show on Home for Independent Dollar' })
    expect(held).not.toBeChecked()
    expect(tracked).not.toBeChecked()
    expect(screen.getAllByRole('switch')).toHaveLength(2)

    await user.click(tracked)
    expect(backupAndUpdateConfig).toHaveBeenLastCalledWith(
      expect.objectContaining({
        importedAssets: [second, custom],
        homeAssetVisibility: { [depix]: false, [second]: true },
      }),
    )
    expect(navigate).not.toHaveBeenCalled()

    await user.click(screen.getByTestId(`asset-row-DEPIX-${depix}`))
    expect(navigate).toHaveBeenCalledWith(Pages.AppAssetDetail)
  })

  it('launches minting from the dedicated screen when enabled and funded', async () => {
    const user = userEvent.setup()
    const { navigate } = renderLibrary(<AppAssetsSettings />, {
      config: { apps: { assets: { enabled: true } } },
      balance: 1000,
    })

    await user.click(screen.getByRole('button', { name: 'Mint' }))
    expect(navigate).toHaveBeenCalledWith(Pages.AppAssetMint)
  })

  it('opens a minted asset with the library in the back stack', async () => {
    const user = userEvent.setup()
    const { navigate, replace } = renderLibrary(<AppAssetMintSuccess />, {
      selected: asset(custom, 'Northstar Asset', 'STAR'),
    })

    await user.click(screen.getByRole('button', { name: 'View Asset' }))

    expect(replace).toHaveBeenCalledWith(Pages.AppAssets, Pages.Settings)
    expect(navigate).toHaveBeenCalledWith(Pages.AppAssetDetail)
    expect(replace.mock.invocationCallOrder[0]).toBeLessThan(navigate.mock.invocationCallOrder[0])
  })

  it('opens the asset library from Accounts with no tracked assets', async () => {
    const user = userEvent.setup()
    const { navigate } = renderLibrary(<AssetsSection />, { balance: 0 })

    const accounts = screen.getByText('Accounts').parentElement!
    const manage = within(accounts).getByRole('button', { name: 'Manage assets' })
    expect(manage).toHaveTextContent('Manage')
    await user.click(manage)

    expect(navigate).toHaveBeenCalledWith(Pages.AppAssets)
  })

  it('honors Home visibility only for verified IDs, including a pinned zero balance', () => {
    renderLibrary(<AssetsSection />, {
      config: {
        importedAssets: [custom, second],
        homeAssetVisibility: { [depix]: false, [custom]: true, [second]: true },
      },
      holdings: [{ assetId: depix, amount: 9500n }],
      registry: [depix, second],
      cache: [
        asset(depix, 'DePix', 'DEPIX'),
        asset(custom, 'Northstar Asset', 'STAR'),
        asset(second, 'Independent Dollar', 'IND'),
      ],
    })

    expect(screen.getByText('Independent Dollar')).toBeInTheDocument()
    expect(screen.queryByText('BRL', { exact: true })).not.toBeInTheDocument()
    expect(screen.queryByText('Northstar Asset')).not.toBeInTheDocument()
  })

  it('resolves registered metadata for ticker and name search and tracks the selected ID', async () => {
    const user = userEvent.setup()
    const { backupAndUpdateConfig, getAssetDetails, replace } = renderLibrary(<AppAssetImport />, {
      registry: [second],
    })

    const input = screen.getByRole('textbox', { name: 'Name, ticker, or asset ID' })
    await user.type(input, 'ind')
    expect(await screen.findByText('Independent Dollar')).toBeInTheDocument()
    expect(getAssetDetails).toHaveBeenCalledTimes(1)
    await user.clear(input)
    await user.type(input, 'dollar')
    await user.click(screen.getByRole('button', { name: 'Track asset' }))

    expect(backupAndUpdateConfig).toHaveBeenCalledWith(expect.objectContaining({ importedAssets: [second] }))
    expect(replace).toHaveBeenCalledWith(Pages.AppAssetDetail, Pages.AppAssets)
  })

  it('requires explicit confirmation of the full ID before tracking an unverified asset', async () => {
    const user = userEvent.setup()
    const { backupAndUpdateConfig, getAssetDetails } = renderLibrary(<AppAssetImport />)

    await user.type(screen.getByRole('textbox', { name: 'Name, ticker, or asset ID' }), custom.toUpperCase())
    await user.click(screen.getByRole('button', { name: 'Look up asset ID' }))

    expect(await screen.findByText(custom, { exact: true })).toBeInTheDocument()
    expect(screen.getByText('Unverified')).toBeInTheDocument()
    expect(backupAndUpdateConfig).not.toHaveBeenCalled()
    expect(getAssetDetails).toHaveBeenCalledWith(custom)

    await user.click(screen.getByRole('button', { name: 'Track asset' }))
    expect(backupAndUpdateConfig).toHaveBeenCalledWith(expect.objectContaining({ importedAssets: [custom] }))
  })

  it('stops tracking the exact zero-balance asset and clears its Home preference', async () => {
    const user = userEvent.setup()
    const selected = asset(second, 'Independent Dollar', 'IND')
    const { backupAndUpdateConfig, goBack } = renderLibrary(<AppAssetDetail />, {
      selected,
      config: { importedAssets: [second, custom], homeAssetVisibility: { [second]: true, [custom]: false } },
      registry: [second],
      cache: [selected],
    })

    await user.click(await screen.findByRole('button', { name: 'Stop tracking' }))

    expect(backupAndUpdateConfig).toHaveBeenCalledWith(
      expect.objectContaining({ importedAssets: [custom], homeAssetVisibility: { [custom]: false } }),
    )
    expect(goBack).toHaveBeenCalledOnce()
  })

  it('offers Home visibility for a held asset without offering to stop tracking or remove it', async () => {
    const user = userEvent.setup()
    const selected = asset(depix, 'DePix', 'DEPIX')
    const { backupAndUpdateConfig } = renderLibrary(<AppAssetDetail />, {
      selected,
      config: { importedAssets: [depix] },
      holdings: [{ assetId: depix, amount: 100n }],
      registry: [depix],
      cache: [selected],
    })

    const showOnHome = await screen.findByRole('switch', { name: 'Show on Home' })
    expect(showOnHome).toBeChecked()
    expect(screen.queryByRole('button', { name: 'Stop tracking' })).not.toBeInTheDocument()
    await user.click(showOnHome)
    expect(backupAndUpdateConfig).toHaveBeenCalledWith(
      expect.objectContaining({ importedAssets: [depix], homeAssetVisibility: { [depix]: false } }),
    )
  })
})
