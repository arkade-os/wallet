import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockConfigContextValue } from '../mocks'
import Backup from '../../../screens/Settings/Backup'
import { render, screen } from '@testing-library/react'
import { ConfigContext } from '../../../providers/config'
import * as privateKeyModule from '../../../lib/privateKey'
import * as mnemonicModule from '../../../lib/mnemonic'
import { hex } from '@scure/base'

const seckey = {
  hex: 'd7525f251de91e6c4564c4d2d2abb028d2ec4aa55c319fa97ba3eecda95270c6',
  nsec: 'nsec16af97fgaay0xc3tycnfd92as9rfwcj49tscel2tm50hvm22jwrrqu8nz2f',
}

const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

describe('Backup screen with legacy private key', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(mnemonicModule, 'hasMnemonic').mockReturnValue(false)
    vi.spyOn(privateKeyModule, 'getPrivateKey').mockResolvedValue(hex.decode(seckey.hex))
  })

  it('renders the backup screen with the correct elements', async () => {
    render(
      <ConfigContext.Provider value={mockConfigContextValue as any}>
        <Backup />
      </ConfigContext.Provider>,
    )

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

    await screen.findByText('Private key')

    expect(screen.getByTestId('toggle-backup')).toBeInTheDocument()
    expect(screen.getByTestId('toggle-backup').getAttribute('data-checked')).toBe('true')
  })
})

describe('Backup screen with mnemonic wallet', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(mnemonicModule, 'hasMnemonic').mockReturnValue(true)
    vi.spyOn(mnemonicModule, 'getMnemonic').mockResolvedValue(testMnemonic)
  })

  it('shows recovery phrase labels instead of private key', async () => {
    render(
      <ConfigContext.Provider value={mockConfigContextValue as any}>
        <Backup />
      </ConfigContext.Provider>,
    )

    await screen.findByText('Recovery phrase')

    expect(screen.getByText('Recovery phrase')).toBeInTheDocument()
    expect(screen.getByText('View recovery phrase')).toBeInTheDocument()
    expect(screen.queryByText('Private key')).not.toBeInTheDocument()
    expect(screen.queryByText('View private key')).not.toBeInTheDocument()
  })
})
