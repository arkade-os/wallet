import { render, screen } from '@testing-library/react'
import About from '../../../screens/Settings/About'
import { AspContext } from '../../../providers/asp'
import { mockAspContextValue } from '../mocks'
import { describe, expect, it } from 'vitest'

describe('About screen', () => {
  it('renders the about screen with the correct elements', () => {
    render(
      <AspContext.Provider value={mockAspContextValue as any}>
        <About />
      </AspContext.Provider>,
    )
    expect(screen.getByText('Dust')).toBeInTheDocument()
    expect(screen.getByText('About')).toBeInTheDocument()
    expect(screen.getByText('Network')).toBeInTheDocument()
    expect(screen.getByText('regtest')).toBeInTheDocument()
    expect(screen.getByText('333 SATS')).toBeInTheDocument()
    expect(screen.getByText('Server URL')).toBeInTheDocument()
    expect(screen.getByText('17 minutes')).toBeInTheDocument()
    expect(screen.getByText('Server pubkey')).toBeInTheDocument()
    expect(screen.getByText('Git commit hash')).toBeInTheDocument()
    expect(screen.getByText('Forfeit address')).toBeInTheDocument()
    expect(screen.getByText('Session duration')).toBeInTheDocument()
    expect(screen.getByText('Boarding exit delay')).toBeInTheDocument()
    expect(screen.getByText('Unilateral exit delay')).toBeInTheDocument()
  })
})
