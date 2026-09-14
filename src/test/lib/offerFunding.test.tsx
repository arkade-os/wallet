import { renderHook } from '@testing-library/react'
import { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { gatedContracts, type Contract } from '@arkade-os/sdk'
import { activitiesToTxs } from '../../lib/activityHistory'
import { ASSET_SWAP_ACTIVITY_KIND } from '../../lib/swapRecords'
import { usePortfolioFiat } from '../../hooks/usePortfolioFiat'
import { AspContext } from '../../providers/asp'
import { FiatContext } from '../../providers/fiat'
import { WalletContext } from '../../providers/wallet'
import { mockAspContextValue, mockFiatContextValue, mockWalletContextValue } from '../screens/mocks'
import type { WalletAssetSwap } from '../../lib/swapRepository'

// The operator's mutinynet report: 110_000 sats held, 50_000 committed to a
// btc-to-asset offer wanting 206 units. Balance never moved and no row appeared.
const HELD = 110_000
const COMMITTED = 50_000
const FUNDING_TXID = 'dab4578b615fc6a9e3070e7041b2a6314d6515c21f6ac1d72fe8830cba2cfe8f'
const COVENANT_SCRIPT = '51207b310c1298990c4b1dd2fba639039e75dc421e37b503428c069ae5797bad1db6'
const WANT_ASSET = 'f1'.repeat(34)

const contract = (over: Partial<Contract>): Contract => ({
  type: 'default',
  script: '5120' + 'bb'.repeat(32),
  address: 'tark1own',
  params: {},
  state: 'active' as Contract['state'],
  createdAt: 4_000,
  ...over,
})

// as `registerOfferContract` writes it in @arkade-os/swap
const offerContract = contract({
  type: 'arkade',
  script: COVENANT_SCRIPT,
  address:
    'tark1qqcpq7yq3e8hhsx6ml3fud93m7827qggaurtzu3zwsr4a0qs0gf857e3psff3xgvfvwa97ax8ypeuawugg0r0dgrg2xqdxh909a668dkrqlehc',
  label: 'Arkade swap offer',
  metadata: { genericallySpendable: false, kind: 'asset-swap-offer' },
})

const ownContract = contract({})

const offerSwap = (over: Partial<WalletAssetSwap> = {}): WalletAssetSwap =>
  ({
    id: FUNDING_TXID,
    fromAsset: 'btc',
    toAsset: WANT_ASSET,
    fromAmount: String(COMMITTED),
    toAmount: '206',
    swapAddress: 'tark1qqcpq7yq...',
    swapPkScript: COVENANT_SCRIPT,
    offerHex: '0100',
    fundingTxid: FUNDING_TXID,
    status: 'pending',
    createdAt: 4_000,
    ...over,
  }) as WalletAssetSwap

const empty = { swaps: [], metadata: {} }

function portfolioWrapper({ children }: { children: ReactNode }) {
  return (
    <AspContext.Provider value={mockAspContextValue as never}>
      <FiatContext.Provider value={{ ...mockFiatContextValue, toFiat: (sats?: number) => sats ?? 0 } as never}>
        <WalletContext.Provider
          value={
            {
              ...mockWalletContextValue,
              balance: HELD,
              availableBalance: HELD - COMMITTED,
              assetBalances: [],
              availableAssetBalances: [],
            } as never
          }
        >
          {children}
        </WalletContext.Provider>
      </FiatContext.Provider>
    </AspContext.Provider>
  )
}

describe('funding an Arkade swap offer', () => {
  it('gates the covenant, so the spendable balance cannot select it', () => {
    const gated = gatedContracts([offerContract, ownContract])

    expect(gated.has(COVENANT_SCRIPT)).toBe(true)
    expect(gated.has(ownContract.script)).toBe(false)
    // fail-closed, so the funds stay gated even if the marker is ever dropped
    expect(gatedContracts([{ ...offerContract, metadata: {} }]).has(COVENANT_SCRIPT)).toBe(true)
  })

  it('offers only what is left to spend, while still reporting the coins as owned', () => {
    const { result } = renderHook(() => usePortfolioFiat(), { wrapper: portfolioWrapper })
    const btc = result.current.rows.find((row) => row.assetId === 'btc')

    expect(btc?.spendableBalance).toBe(HELD - COMMITTED)
    expect(btc?.balance).toBe(HELD)
  })

  it('renders the SDK gated-history row as the pending swap commitment', () => {
    const funding = {
      amount: COMMITTED,
      createdAt: 4_000,
      settled: true,
      type: 'SENT',
      tag: 'gated',
      key: { arkTxid: FUNDING_TXID, boardingTxid: '', commitmentTxid: '' },
    }
    const group = {
      id: `swap:${FUNDING_TXID}`,
      intent: { kind: ASSET_SWAP_ACTIVITY_KIND, label: 'Swap', metadata: { swapId: FUNDING_TXID } },
      txs: [funding],
      amount: -COMMITTED,
      createdAt: 4_000,
      settled: true,
    }

    const rows = activitiesToTxs([group as never], { ...empty, swaps: [offerSwap()] })

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      type: 'swap',
      amount: COMMITTED,
      historyKey: `swap:${FUNDING_TXID}`,
      assetSwap: {
        status: 'pending',
        fromAssetId: 'btc',
        fromAmount: BigInt(COMMITTED),
        fundingTxid: FUNDING_TXID,
      },
    })
  })
})
