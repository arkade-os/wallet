import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockConfigContextValue } from '../mocks'
import Backup from '../../../screens/Settings/Backup'
import { render, screen } from '@testing-library/react'
import { ConfigContext } from '../../../providers/config'
import * as privateKeyModule from '../../../lib/privateKey'
import { hex } from '@scure/base'

const seckey = {
  hex: 'd7525f251de91e6c4564c4d2d2abb028d2ec4aa55c319fa97ba3eecda95270c6',
  nsec: 'nsec16af97fgaay0xc3tycnfd92as9rfwcj49tscel2tm50hvm22jwrrqu8nz2f',
}

describe('Backup screen with default password', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(privateKeyModule, 'getPrivateKey').mockResolvedValue(hex.decode(seckey.hex))
  })

  it('renders the backup screen with the correct elements', async () => {
    render(
      <ConfigContext.Provider value={mockConfigContextValue as any}>
        <Backup />
      </ConfigContext.Provider>,
    )

    // wait for getPrivateKey to resolve
    await screen.findByText('Private key')

    expect(screen.getByText('Backup')).toBeInTheDocument()
    expect(screen.getByText('Private key')).toBeInTheDocument()
    expect(screen.getByText('Enable Nostr backups')).toBeInTheDocument()
    expect(screen.getByText('View private key')).toBeInTheDocument()
  })

  it('renders the backup screen with the correct toggle', async () => {
    render(
      <ConfigContext.Provider value={mockConfigContextValue as any}>
        <Backup />
      </ConfigContext.Provider>,
    )

    // wait for getPrivateKey to resolve
    await screen.findByText('Private key')

    expect(screen.getByTestId('toggle-backup')).toBeInTheDocument()
    expect(screen.getByTestId('toggle-backup').getAttribute('checked')).toBe('true')
  })
})
