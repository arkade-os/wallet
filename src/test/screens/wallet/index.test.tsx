import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Wallet from '../../../screens/Wallet/Index'

describe('Wallet screen', () => {
  it('renders the wallet screen with the correct elements', () => {
    render(<Wallet />)
    expect(screen.getByText(/₿/)).toBeInTheDocument()
    expect(screen.getByText('Send')).toBeInTheDocument()
    expect(screen.getByText('Receive')).toBeInTheDocument()
    expect(screen.getByText('My balance')).toBeInTheDocument()
    expect(screen.getByText('No transactions yet')).toBeInTheDocument()
  })
})
