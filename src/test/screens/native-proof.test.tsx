import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SingleKey } from '@arkade-os/sdk'
import { hex } from '@scure/base'
import { WalletContext } from '../../providers/wallet'
import HardwareBackup from '../../screens/Settings/HardwareBackup'
import { mockWalletContextValue } from './mocks'
import type { WalletRuntime } from '../../lib/walletRuntime'

const mocks = vi.hoisted(() => ({ card: { status: 'connected', publicKey: '' } }))
vi.mock('../../lib/nativeBridge', async (original) => ({
  ...(await original<typeof import('../../lib/nativeBridge')>()),
  getNativeCardState: () => mocks.card,
}))
vi.mock('../../components/NativeCardConnectSheet', () => ({
  default: ({ isOpen, onConnected }: { isOpen: boolean; onConnected: () => void }) =>
    isOpen ? (
      <div role='dialog' aria-label='Connect Satochip'>
        <button onClick={onConnected}>Connection complete</button>
      </div>
    ) : null,
}))

beforeEach(() => {
  mocks.card = { status: 'connected', publicKey: '' }
})

async function show(connected = true) {
  const identity = SingleKey.fromHex('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')
  const publicKey = hex.encode(await identity.compressedPublicKey())
  mocks.card.publicKey = publicKey
  render(
    <WalletContext.Provider
      value={{
        ...mockWalletContextValue,
        wallet: { nextRollover: 0, network: 'mutinynet', pubkey: publicKey },
        svcWallet: connected ? ({ identity } as unknown as WalletRuntime) : undefined,
      }}
    >
      <HardwareBackup />
    </WalletContext.Provider>,
  )
  return identity
}

describe('native card proof control', () => {
  it('signs only after an explicit action and verifies the proof locally', async () => {
    const identity = await show()
    const sign = vi.spyOn(identity, 'sign')
    expect(sign).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Verify card signing' }))
    expect(await screen.findByText('Signature verified. No transaction was broadcast.')).toBeInTheDocument()
    expect(sign).toHaveBeenCalledTimes(1)
  })

  it('shows a signing error without claiming a valid proof', async () => {
    const identity = await show()
    vi.spyOn(identity, 'sign').mockRejectedValueOnce(new Error('Card removed'))
    fireEvent.click(screen.getByRole('button', { name: 'Verify card signing' }))
    expect(await screen.findByText('Card removed')).toBeInTheDocument()
    expect(screen.queryByText('Signature verified. No transaction was broadcast.')).toBeNull()
  })

  it('requires an unlocked signer', async () => {
    await show(false)
    expect(screen.getByRole('button', { name: 'Verify card signing' })).toBeDisabled()
  })

  it('guides connection before a proof and keeps verification explicit', async () => {
    mocks.card.status = 'disconnected'
    const identity = await show()
    const sign = vi.spyOn(identity, 'sign')
    fireEvent.click(screen.getByRole('button', { name: 'Verify card signing' }))
    expect(screen.getByRole('dialog', { name: 'Connect Satochip' })).toBeInTheDocument()
    expect(sign).not.toHaveBeenCalled()
    mocks.card.status = 'connected'
    fireEvent.click(screen.getByText('Connection complete'))
    expect(sign).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Verify card signing' }))
    expect(await screen.findByText('Signature verified. No transaction was broadcast.')).toBeInTheDocument()
  })
})
