import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Wallet from '../../../screens/Wallet/Index'

describe('Wallet screen', () => {
  it('renders the wallet screen with the correct elements', () => {
    render(<Wallet />)
    // New home screen structure: PortfolioHero, AssetsSection, etc.
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('Assets')).toBeInTheDocument()
    // Action bar is rendered via portal, so Send/Receive are in body
    expect(document.body.querySelector('[data-testid="action-send"]')).toBeInTheDocument()
    expect(document.body.querySelector('[data-testid="action-receive"]')).toBeInTheDocument()
  })
})
