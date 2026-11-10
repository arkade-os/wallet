import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readPendingAssetMint, savePendingAssetMint, type PendingAssetMint } from '../../lib/assetMintRecovery'
import AppAssetMint from '../../screens/Apps/Assets/Mint'

const pending: PendingAssetMint = {
  walletAddress: 'wallet',
  server: 'server',
  amount: '10',
  metadata: { name: 'Token' },
  controlAmount: '1',
  controlMetadata: { name: 'ctrl-Token' },
  stage: 'control-ready',
  control: { assetId: 'control-id', arkTxId: 'control-tx' },
}

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('navigator', {
    language: 'en',
    locks: {
      request: async (_name: string, _options: object, callback: (lock: object) => Promise<unknown>) => callback({}),
    },
  })
})

afterEach(() => vi.unstubAllGlobals())

describe('asset mint recovery screen', () => {
  it('shows the saved control asset and a resume action after reload', () => {
    savePendingAssetMint(pending)
    render(<AppAssetMint />)
    expect(screen.getByText('control-id')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resume mint' })).toBeInTheDocument()
    expect(screen.queryByTestId('asset-name')).not.toBeInTheDocument()
  })

  it('does not offer retry for an uncertain issuance and requires confirmation to discard', async () => {
    savePendingAssetMint({ ...pending, stage: 'issuing-asset' })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    render(<AppAssetMint />)
    expect(screen.queryByRole('button', { name: 'Resume mint' })).not.toBeInTheDocument()
    const discard = screen.getByRole('button', { name: 'Discard recovery record' })
    fireEvent.click(discard)
    expect(readPendingAssetMint()).not.toBeNull()
    fireEvent.click(discard)
    expect(await screen.findByTestId('asset-name')).toBeInTheDocument()
    expect(readPendingAssetMint()).toBeNull()
    expect(confirm).toHaveBeenCalledTimes(2)
    confirm.mockRestore()
  })

  it('fails closed when the recovery record is corrupt', () => {
    localStorage.setItem('pendingAssetMint', '{')
    render(<AppAssetMint />)
    expect(screen.queryByRole('button', { name: 'Resume mint' })).not.toBeInTheDocument()
    expect(screen.queryByTestId('asset-name')).not.toBeInTheDocument()
    expect(screen.getByText(/result of an issuance is unknown/i)).toBeInTheDocument()
  })
})
