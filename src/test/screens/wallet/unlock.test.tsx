import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Unlock from '../../../screens/Wallet/Unlock'
import { WalletContext } from '../../../providers/wallet'
import { mockWalletContextValue } from '../mocks'

const renderUnlock = (unlockFailure: 'connection' | null) =>
  render(
    <WalletContext.Provider value={{ ...mockWalletContextValue, unlockFailure } as any}>
      <Unlock />
    </WalletContext.Provider>,
  )

describe('Unlock', () => {
  // The screen that submitted the password gave way to Home before the wallet failed to start; this
  // one has to say why the user is back.
  it('says the connection failed when it comes back after a wallet that did not start', () => {
    renderUnlock('connection')
    expect(screen.getByText('Connection failed. Please try again.')).toBeInTheDocument()
  })

  it('opens without an error otherwise', () => {
    renderUnlock(null)
    expect(screen.queryByText('Connection failed. Please try again.')).not.toBeInTheDocument()
  })
})
