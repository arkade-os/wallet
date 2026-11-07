import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Dfx from '../../screens/Apps/Dfx/Index'

const mocks = vi.hoisted(() => ({ native: true, sign: vi.fn() }))
vi.mock('../../lib/nativeBridge', () => ({ isNativeHost: () => mocks.native }))
vi.mock('../../lib/asp', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/asp')>()),
  getReceivingAddresses: async () => ({ offchainAddr: 'tark1fixture' }),
}))
vi.mock('../../providers/wallet', async () => {
  const { createContext } = await import('react')
  return { WalletContext: createContext({ svcWallet: { identity: { signMessage: mocks.sign } } }) }
})
vi.mock('../../components/Header', () => ({ default: () => <header>DFX</header> }))

beforeEach(() => {
  mocks.native = true
  mocks.sign.mockResolvedValue(new Uint8Array(64).fill(1))
})
afterEach(() => vi.restoreAllMocks())

describe('DFX native isolation', () => {
  it('opens DFX externally without creating a remote frame in the native wallet', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const view = render(<Dfx />)
    fireEvent.click(await screen.findByRole('button', { name: 'Open DFX' }))
    expect(view.container.querySelector('iframe')).toBeNull()
    expect(open).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/app\.dfx\.swiss\/buy\/\?address=tark1fixture&signature=/),
      '_blank',
      'noopener,noreferrer',
    )
  })

  it('preserves the embedded DFX flow for the ordinary web wallet', async () => {
    mocks.native = false
    const view = render(<Dfx />)
    await screen.findByTitle('DFX')
    expect(view.container.querySelector('iframe')?.src).toMatch(/^https:\/\/app\.dfx\.swiss\//)
    expect(screen.queryByRole('button', { name: 'Open DFX' })).toBeNull()
  })
})
