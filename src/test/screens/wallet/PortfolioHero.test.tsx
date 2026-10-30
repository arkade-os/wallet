import { render, screen } from '@testing-library/react'
import { useContext, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import PortfolioHero from '../../../screens/Wallet/PortfolioHero'
import { WalletContext } from '../../../providers/wallet'

function WithSyncing({ syncing, children }: { syncing: boolean; children: ReactNode }) {
  const wallet = useContext(WalletContext)
  return <WalletContext.Provider value={{ ...wallet, syncing }}>{children}</WalletContext.Provider>
}

describe('PortfolioHero', () => {
  it('says the balance is syncing while the first background sync is pending', () => {
    render(
      <WithSyncing syncing>
        <PortfolioHero />
      </WithSyncing>,
    )

    expect(screen.getByRole('status').textContent).toBe('Syncing...')
  })

  it('shows no sync status once synced', () => {
    render(
      <WithSyncing syncing={false}>
        <PortfolioHero />
      </WithSyncing>,
    )

    expect(screen.queryByRole('status')).toBeNull()
  })
})
