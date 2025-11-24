import { beforeAll, describe, expect, it, vi } from 'vitest'
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

describe('Backup screen', () => {
  beforeAll(() => {
    vi.resetAllMocks()
  })

  it('renders the backup screen asking for a password', async () => {
    render(
      <ConfigContext.Provider value={mockConfigContextValue as any}>
        <Backup />
      </ConfigContext.Provider>,
    )
    expect(screen.getByText('Backup')).toBeInTheDocument()
    expect(screen.getByText('Insert password')).toBeInTheDocument()
    expect(screen.getByText('Unlock wallet')).toBeInTheDocument()
  })

  it('renders the backup screen with the correct elements', async () => {
    vi.spyOn(privateKeyModule, 'getPrivateKey').mockResolvedValue(hex.decode(seckey.hex))

    render(
      <ConfigContext.Provider value={mockConfigContextValue as any}>
        <Backup />
      </ConfigContext.Provider>,
    )

    await screen.findByText('Private key') // wait for getPrivateKey to resolve
    expect(screen.getByText('Backup')).toBeInTheDocument()
    expect(screen.getByText('Private key')).toBeInTheDocument()
    expect(screen.getByText('Enable Nostr backups')).toBeInTheDocument()
    expect(screen.getByText(seckey.nsec)).toBeInTheDocument()
  })

  it('renders the backup screen with the correct toggle', async () => {
    vi.spyOn(privateKeyModule, 'getPrivateKey').mockResolvedValue(hex.decode(seckey.hex))

    render(
      <ConfigContext.Provider value={mockConfigContextValue as any}>
        <Backup />
      </ConfigContext.Provider>,
    )

    await screen.findByText('Private key') // wait for getPrivateKey to resolve
    expect(screen.getByTestId('toggle-backup')).toBeInTheDocument()
    expect(screen.getByTestId('toggle-backup').getAttribute('checked')).toBe('true')
  })
})
