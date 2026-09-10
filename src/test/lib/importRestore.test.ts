import { beforeEach, describe, expect, it, vi } from 'vitest'

const events: string[] = []
const registerAssetSwapRestore = vi.hoisted(() =>
  vi.fn(() => {
    events.push('register')
    return () => undefined
  }),
)

vi.mock('@arkade-os/swap', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@arkade-os/swap')>()),
  registerAssetSwapRestore,
}))

import { restoreImportedWallet, type RestorableWallet } from '../../lib/importRestore'

describe('restoreImportedWallet', () => {
  beforeEach(() => {
    events.length = 0
    registerAssetSwapRestore.mockClear()
  })

  it('registers swap recovery before explicit wallet recovery', async () => {
    const wallet = {
      restore: vi.fn(async () => void events.push('restore')),
    } as unknown as RestorableWallet
    const repository = { name: 'asset swaps' }
    const indexer = { name: 'indexer' }
    const serverPubkey = new Uint8Array(32).fill(0xab)

    await restoreImportedWallet(wallet, {
      arkServerUrl: 'https://ark.test',
      repository: repository as never,
      indexer: indexer as never,
      serverPubkey,
    })

    expect(events).toEqual(['register', 'restore'])
    expect(registerAssetSwapRestore).toHaveBeenCalledWith(wallet, {
      arkServerUrl: 'https://ark.test',
      repository,
      indexer,
      serverPubkey,
    })
  })
})
