import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Contracts from '../../../screens/Settings/Contracts'
import { WalletContext } from '../../../providers/wallet'
import { AspContext } from '../../../providers/asp'
import { mockWalletContextValue, mockSvcWallet } from '../mocks'
import { emptyAspInfo } from '../../../lib/asp'
import { ToastProvider } from '../../../components/Toast'
import { copyToClipboard } from '../../../lib/clipboard'
import type { Contract } from '@arkade-os/sdk'

vi.mock('../../../lib/clipboard', () => ({ copyToClipboard: vi.fn() }))
// The icons are bare <svg>s; stub them so the marker state is queryable.
vi.mock('../../../icons/CheckMark', () => ({ default: () => <span>MARKER-COPIED</span> }))
vi.mock('../../../icons/Copy', () => ({ default: () => <span>MARKER-IDLE</span> }))

// jsdom has no layout, so the real virtualizer would measure a 0px viewport and
// render no rows. Mock it to render every item so we can assert on content.
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count, getItemKey }: { count: number; getItemKey?: (i: number) => unknown }) => ({
    getTotalSize: () => count * 84,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: getItemKey ? getItemKey(index) : index,
        start: index * 84,
        size: 84,
      })),
    measureElement: () => {},
  }),
}))

const contract = (over: Partial<Contract>): Contract => ({
  type: 'default',
  state: 'active',
  address: 'ark1qdefault',
  script: 'abcdef',
  createdAt: 1717000000000,
  params: {},
  ...over,
})

function withContracts(contracts: Contract[]) {
  return {
    ...mockSvcWallet,
    getContractManager: () => Promise.resolve({ getContracts: () => Promise.resolve(contracts) }),
  }
}

function renderScreen(svcWallet: typeof mockSvcWallet | undefined, aspInfo = emptyAspInfo) {
  return render(
    <AspContext.Provider value={{ aspInfo, setAspInfo: () => {} } as any}>
      <WalletContext.Provider value={{ ...mockWalletContextValue, svcWallet } as any}>
        <ToastProvider>
          <Contracts />
        </ToastProvider>
      </WalletContext.Provider>
    </AspContext.Provider>,
  )
}

describe('Contracts screen', () => {
  it('filters by the Active / Inactive tab', async () => {
    renderScreen(
      withContracts([
        contract({ state: 'active' }),
        contract({ type: 'vhtlc', state: 'inactive', address: 'ark1qinactive' }),
      ]) as any,
    )
    await screen.findByText('Contracts')
    // Active is the default tab — the active card's state shows, the inactive one is hidden.
    expect(screen.getByText('active')).toBeInTheDocument()
    expect(screen.queryByText('inactive')).not.toBeInTheDocument()
    // Switch tabs.
    fireEvent.click(screen.getByText('Inactive'))
    expect(await screen.findByText('inactive')).toBeInTheDocument()
    expect(screen.queryByText('active')).not.toBeInTheDocument()
  })

  it('filters by search query (matches across fields)', async () => {
    renderScreen(
      withContracts([
        contract({ type: 'delegate', address: 'ark1qdelegateaddr', script: 'aa11' }),
        contract({ type: 'default', address: 'ark1qdefaultaddr', script: 'bb22' }),
      ]) as any,
    )
    await screen.findByText('Contracts')
    expect(screen.getByText('· 2')).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'delegateaddr' } })
    expect(screen.getByText('· 1')).toBeInTheDocument()
  })

  it('shows the on-chain Taproot address for boarding contracts', async () => {
    const script = '5120' + 'cc'.repeat(32) // P2TR scriptPubKey
    renderScreen(withContracts([contract({ type: 'boarding', address: 'ark1qboardingoffchain', script })]) as any, {
      ...emptyAspInfo,
      network: 'bitcoin',
    })
    await screen.findByText('Contracts')
    // boarding rows render the bech32m P2TR address derived from the script (bc1p…).
    expect(screen.getByText((t) => t.startsWith('bc1p'))).toBeInTheDocument()
  })
})

// x-only (32-byte) signer pubkeys for classifying contract.params.serverPubKey.
const ACTIVE_SIGNER = 'aa'.repeat(32)
const DEPRECATED_SIGNER = 'bb'.repeat(32)

function deprecatedAspInfo(cutoff: bigint) {
  return {
    ...emptyAspInfo,
    signerPubkey: ACTIVE_SIGNER,
    deprecatedSigners: [{ pubkey: DEPRECATED_SIGNER, cutoffDate: cutoff }],
  } as typeof emptyAspInfo
}

function underSigner(serverPubKey: string): Contract {
  return contract({ type: 'vhtlc', address: 'ark1qsigner', script: 'ark1qsigner', params: { serverPubKey } })
}

describe('Contracts screen — deprecated signer badges', () => {
  it('flags a contract whose signer is deprecated and past its cutoff', async () => {
    renderScreen(withContracts([underSigner(DEPRECATED_SIGNER)]) as any, deprecatedAspInfo(BigInt(1))) // 1970 → EXPIRED
    await screen.findByText('Contracts')
    expect(screen.getByText('deprecated signer · past cutoff')).toBeInTheDocument()
  })

  it('flags a contract whose signer is deprecated but before its cutoff', async () => {
    renderScreen(withContracts([underSigner(DEPRECATED_SIGNER)]) as any, deprecatedAspInfo(BigInt(99999999999))) // MIGRATABLE
    await screen.findByText('Contracts')
    expect(screen.getByText('deprecated signer')).toBeInTheDocument()
    expect(screen.queryByText('deprecated signer · past cutoff')).not.toBeInTheDocument()
  })

  it('does not flag a contract under the active signer', async () => {
    renderScreen(withContracts([underSigner(ACTIVE_SIGNER)]) as any, deprecatedAspInfo(BigInt(1)))
    await screen.findByText('Contracts')
    expect(screen.queryByText(/deprecated signer/)).not.toBeInTheDocument()
  })
})

describe('Contracts screen — copy feedback', () => {
  const boarding = async () => {
    const script = '5120' + 'cc'.repeat(32) // P2TR scriptPubKey
    renderScreen(withContracts([contract({ type: 'boarding', address: 'ark1qboardingoffchain', script })]) as any, {
      ...emptyAspInfo,
      network: 'bitcoin',
    })
    await screen.findByText('Contracts')
    // The card starts collapsed; expanding renders the CopyRow.
    fireEvent.click(screen.getByText('boarding'))
  }

  // The collapsed summary also shows the address; the CopyRow is the last match.
  const addressRow = () => screen.getAllByText((t) => t.startsWith('bc1p')).at(-1)!

  const rowMarker = () => addressRow().parentElement?.parentElement?.textContent ?? ''

  beforeEach(() => {
    vi.mocked(copyToClipboard).mockReset()
  })

  it('confirms the copy and marks the row when the write lands', async () => {
    vi.mocked(copyToClipboard).mockResolvedValue(true)
    await boarding()

    fireEvent.click(addressRow())

    expect(await screen.findByText('Copied to clipboard')).toBeInTheDocument()
    expect(rowMarker()).toContain('MARKER-COPIED')
  })

  it('leaves the row unmarked and reports the failure when the write is refused', async () => {
    vi.mocked(copyToClipboard).mockResolvedValue(false)
    await boarding()

    fireEvent.click(addressRow())

    expect(await screen.findByText('Failed to copy')).toBeInTheDocument()
    expect(screen.queryByText('Copied to clipboard')).not.toBeInTheDocument()
    expect(rowMarker()).toContain('MARKER-IDLE')
  })
})
