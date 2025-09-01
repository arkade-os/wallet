import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Onboard from '../../../screens/Wallet/Onboard'

let pwaCanInstall = false
vi.mock('../../../lib/pwa', () => ({
  pwaCanInstall: () => pwaCanInstall,
}))

describe('Onboard screen', () => {
  it('renders the onboard screen with the correct elements', () => {
    render(<Onboard />)
    expect(screen.getByText('Greetings, Earthling! 👾')).toBeInTheDocument()
    expect(screen.getByText('Continue')).toBeInTheDocument()
  })

  it('has 3 steps if cannot install PWA', async () => {
    pwaCanInstall = false
    render(<Onboard />)
    expect(screen.getByText('Greetings, Earthling! 👾')).toBeInTheDocument()
    screen.getByText('Continue').click()
    expect(await screen.findByText('Leveling up')).toBeInTheDocument()
    screen.getByText('Continue').click()
    expect(await screen.findByText('Stay in control')).toBeInTheDocument()
    expect(screen.getByText('Skip for now')).toBeInTheDocument()
  })

  it('has 4 steps if can install PWA', async () => {
    pwaCanInstall = true
    render(<Onboard />)
    expect(screen.getByText('Greetings, Earthling! 👾')).toBeInTheDocument()
    screen.getByText('Continue').click()
    expect(await screen.findByText('Leveling up')).toBeInTheDocument()
    screen.getByText('Continue').click()
    expect(await screen.findByText('Stay in control')).toBeInTheDocument()
    screen.getByText('Continue').click()
    expect(await screen.findByText('Install Arkade on Home')).toBeInTheDocument()
    expect(await screen.findByText('Skip for now')).toBeInTheDocument()
  })
})
