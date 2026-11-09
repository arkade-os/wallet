import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NormalizedExtendedVirtualCoin } from '@arkade-os/sdk'
import {
  readPendingAssetMint,
  runNewAssetMint,
  savePendingAssetMint,
  waitForControlAsset,
  type PendingAssetMint,
} from '../../lib/assetMintRecovery'

const control = { assetId: 'control-id', arkTxId: 'control-tx' }
const asset = { assetId: 'asset-id', arkTxId: 'asset-tx' }
const create = { amount: 10n, metadata: { name: 'Token' }, controlAmount: 1n, controlMetadata: { name: 'ctrl-Token' } }
const coin = (assetId: string) => ({ assets: [{ assetId, amount: 1n }] }) as NormalizedExtendedVirtualCoin

const wallet = () => ({
  getAddress: vi.fn().mockResolvedValue('wallet'),
  getSpendableVtxos: vi.fn().mockResolvedValue([coin(control.assetId)]),
  assetManager: {
    issue: vi.fn().mockResolvedValueOnce(control).mockResolvedValueOnce(asset),
    reissue: vi.fn(),
    burn: vi.fn(),
    getAssetDetails: vi.fn(),
  },
})

const pending = (stage: PendingAssetMint['stage'] = 'control-ready'): PendingAssetMint => ({
  walletAddress: 'wallet',
  server: 'server',
  amount: '10',
  metadata: create.metadata,
  controlAmount: '1',
  controlMetadata: create.controlMetadata,
  stage,
  control,
  ...(stage === 'asset-ready' ? { asset } : {}),
})

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('navigator', {
    locks: {
      request: async (_name: string, _options: object, callback: (lock: object) => Promise<unknown>) => callback({}),
    },
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('new asset mint recovery', () => {
  it('records each issuance before submission and imports the control asset before continuing', async () => {
    const w = wallet()
    const onControl = vi.fn(() => {
      expect(readPendingAssetMint()).toMatchObject({ stage: 'control-ready', control })
      expect(w.assetManager.issue).toHaveBeenCalledTimes(1)
    })
    w.assetManager.issue.mockImplementation(async () => {
      const current = readPendingAssetMint()
      if (current?.stage === 'issuing-control') return control
      expect(current).toMatchObject({ stage: 'issuing-asset', control })
      return asset
    })
    const onComplete = vi.fn(() => expect(readPendingAssetMint()).toMatchObject({ stage: 'asset-ready', asset }))

    await runNewAssetMint(w, 'server', create, vi.fn(), onControl, onComplete)

    expect(w.getSpendableVtxos).toHaveBeenCalledWith({
      withRecoverable: false,
      genericallySpendableOnly: true,
      requireSynced: true,
    })
    expect(w.assetManager.issue).toHaveBeenLastCalledWith({
      amount: 10n,
      metadata: create.metadata,
      controlAssetId: control.assetId,
    })
    expect(onControl).toHaveBeenCalledOnce()
    expect(onComplete).toHaveBeenCalledOnce()
    expect(readPendingAssetMint()).toBeNull()
  })

  it('ignores unrelated coins and times out even when a wallet read hangs', async () => {
    vi.useFakeTimers()
    const w = wallet()
    w.getSpendableVtxos.mockResolvedValueOnce([coin('unrelated')]).mockImplementation(() => new Promise(() => {}))
    const waiting = waitForControlAsset(w, control.assetId, 5_000)
    const result = expect(waiting).rejects.toThrow('Timed out')
    await vi.advanceTimersByTimeAsync(5_000)
    await result
    expect(w.getSpendableVtxos).toHaveBeenCalledTimes(2)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('waits for the specific asset, even if an unrelated coin was observed first', async () => {
    vi.useFakeTimers()
    const w = wallet()
    w.getSpendableVtxos.mockResolvedValueOnce([coin('unrelated')]).mockResolvedValueOnce([coin(control.assetId)])
    const waiting = waitForControlAsset(w, control.assetId, 5_000)
    await vi.advanceTimersByTimeAsync(2_000)
    await expect(waiting).resolves.toBeUndefined()
    expect(w.getSpendableVtxos).toHaveBeenCalledTimes(2)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('resumes a timed out mint without issuing a second control asset', async () => {
    vi.useFakeTimers()
    const w = wallet()
    w.getSpendableVtxos.mockResolvedValue([])
    const first = runNewAssetMint(w, 'server', create, vi.fn(), vi.fn(), vi.fn())
    const timedOut = expect(first).rejects.toThrow('Timed out')
    await vi.advanceTimersByTimeAsync(60_000)
    await timedOut
    expect(readPendingAssetMint()).toMatchObject({ stage: 'control-ready', control })

    w.getSpendableVtxos.mockResolvedValue([coin(control.assetId)])
    await runNewAssetMint(w, 'server', null, vi.fn(), vi.fn(), vi.fn())
    expect(w.assetManager.issue).toHaveBeenCalledTimes(2)
    expect(readPendingAssetMint()).toBeNull()
  })

  it.each(['issuing-control', 'issuing-asset'] as const)(
    'does not repeat an issuance with an uncertain %s outcome after reload',
    async (stage) => {
      savePendingAssetMint(pending(stage))
      const w = wallet()
      await expect(runNewAssetMint(w, 'server', null, vi.fn(), vi.fn(), vi.fn())).rejects.toThrow('outcome is unknown')
      expect(w.assetManager.issue).not.toHaveBeenCalled()
    },
  )

  it('preserves the control asset and blocks retry after the second issue throws', async () => {
    const w = wallet()
    w.assetManager.issue.mockReset().mockResolvedValueOnce(control).mockRejectedValueOnce(new Error('worker lost'))
    await expect(runNewAssetMint(w, 'server', create, vi.fn(), vi.fn(), vi.fn())).rejects.toThrow('worker lost')
    expect(readPendingAssetMint()).toMatchObject({ stage: 'issuing-asset', control })
    await expect(runNewAssetMint(w, 'server', null, vi.fn(), vi.fn(), vi.fn())).rejects.toThrow('outcome is unknown')
    expect(w.assetManager.issue).toHaveBeenCalledTimes(2)
  })

  it('blocks another control issuance if the first request fails with an uncertain result', async () => {
    const w = wallet()
    w.assetManager.issue.mockReset().mockRejectedValueOnce(new Error('worker lost'))
    await expect(runNewAssetMint(w, 'server', create, vi.fn(), vi.fn(), vi.fn())).rejects.toThrow('worker lost')
    expect(readPendingAssetMint()).toMatchObject({ stage: 'issuing-control' })
    await expect(runNewAssetMint(w, 'server', null, vi.fn(), vi.fn(), vi.fn())).rejects.toThrow('outcome is unknown')
    expect(w.assetManager.issue).toHaveBeenCalledTimes(1)
  })

  it('recovers after metadata or configuration work fails without issuing again', async () => {
    const w = wallet()
    await expect(
      runNewAssetMint(
        w,
        'server',
        create,
        vi.fn(),
        () => {
          throw new Error('storage error')
        },
        vi.fn(),
      ),
    ).rejects.toThrow('storage error')
    expect(readPendingAssetMint()).toMatchObject({ stage: 'control-ready', control })
    await runNewAssetMint(w, 'server', null, vi.fn(), vi.fn(), vi.fn())
    expect(w.assetManager.issue).toHaveBeenCalledTimes(2)
  })

  it('finishes an already issued asset without sending either issuance again', async () => {
    savePendingAssetMint(pending('asset-ready'))
    const w = wallet()
    const onComplete = vi.fn()
    await runNewAssetMint(w, 'server', null, vi.fn(), vi.fn(), onComplete)
    expect(w.assetManager.issue).not.toHaveBeenCalled()
    expect(w.getSpendableVtxos).not.toHaveBeenCalled()
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ asset, control }))
  })

  it('preserves the issued asset when finalizing fails and retries only finalization', async () => {
    const w = wallet()
    await expect(
      runNewAssetMint(w, 'server', create, vi.fn(), vi.fn(), () => {
        throw new Error('storage error')
      }),
    ).rejects.toThrow('storage error')
    expect(readPendingAssetMint()).toMatchObject({ stage: 'asset-ready', control, asset })
    await runNewAssetMint(w, 'server', null, vi.fn(), vi.fn(), vi.fn())
    expect(w.assetManager.issue).toHaveBeenCalledTimes(2)
  })

  it('refuses to submit if the journal cannot be saved', async () => {
    const w = wallet()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('quota exceeded')
    })
    await expect(runNewAssetMint(w, 'server', create, vi.fn(), vi.fn(), vi.fn())).rejects.toThrow('quota exceeded')
    expect(w.assetManager.issue).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  it('does not resume another wallet or silently resume a stale tab as a new mint', async () => {
    savePendingAssetMint(pending())
    const w = wallet()
    await expect(runNewAssetMint(w, 'other-server', null, vi.fn(), vi.fn(), vi.fn())).rejects.toThrow('another wallet')
    const onChange = vi.fn()
    await expect(runNewAssetMint(w, 'server', create, onChange, vi.fn(), vi.fn())).rejects.toThrow('needs recovery')
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ control }))
    expect(w.assetManager.issue).not.toHaveBeenCalled()
  })

  it('fails closed without a browser lock or when another tab holds it', async () => {
    const w = wallet()
    vi.stubGlobal('navigator', {})
    await expect(runNewAssetMint(w, 'server', create, vi.fn(), vi.fn(), vi.fn())).rejects.toThrow('Web Locks')
    vi.stubGlobal('navigator', {
      locks: {
        request: async (_name: string, _options: object, callback: (lock: null) => Promise<unknown>) => callback(null),
      },
    })
    await expect(runNewAssetMint(w, 'server', create, vi.fn(), vi.fn(), vi.fn())).rejects.toThrow('another tab')
    expect(w.assetManager.issue).not.toHaveBeenCalled()
  })
})
