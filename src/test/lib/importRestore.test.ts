import { describe, expect, it, vi } from 'vitest'

import { restoreImportedWallet, type RestorableWallet } from '../../lib/importRestore'

describe('restoreImportedWallet', () => {
  it('runs explicit wallet recovery', async () => {
    const wallet = { restore: vi.fn(async () => undefined) } as unknown as RestorableWallet

    await restoreImportedWallet(wallet)

    expect(wallet.restore).toHaveBeenCalledOnce()
  })
})
