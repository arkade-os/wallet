import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RecyclePlan, VerifiedClaim } from '@arkade-taxi/client/wallet'
import { reconcileTaxiInputReservations, reserveTaxiClaim, reserveTaxiInputs } from '../../lib/taxiInputReservations'

const server = 'http://arkd.test'
const txid = '11'.repeat(32)
const claimTxid = '22'.repeat(32)
const claimOutpoint = { txid: 'aa'.repeat(32), vout: 0 }
const outpoint = { txid, vout: 1 }
const conflictProof = vi.hoisted(() => vi.fn())
vi.mock('../../lib/taxiClaimConflict', () => ({ isFinalizedTaxiClaimConflict: conflictProof }))
const offer = {
  taxi: { url: 'https://taxi.test' },
  claim: { transferId: 'delivery', claim: { outpoint: claimOutpoint } },
} as unknown as VerifiedClaim
const plan = { kind: 'recycle', coin: { ...outpoint, value: 1000 } } as RecyclePlan

const setup = () => {
  const release = vi.fn().mockResolvedValue(undefined)
  const reserveVtxos = vi.fn().mockResolvedValue({ release })
  const getVtxos = vi.fn().mockResolvedValue({ vtxos: [{ ...outpoint, isSpent: false }] })
  const refreshOutpoints = vi.fn().mockResolvedValue(undefined)
  const getStoredContractsWithVtxos = vi.fn(async () => [await getVtxos()])
  const wallet = {
    identity: { xOnlyPublicKey: async () => new Uint8Array(32) },
    getArkadeReader: async () => ({ getVtxos }),
    getContractManager: async () => ({ refreshOutpoints, getStoredContractsWithVtxos }),
    reserveVtxos,
  } as unknown as Parameters<typeof reserveTaxiClaim>[0]
  return { wallet, release, reserveVtxos, getVtxos, refreshOutpoints, getStoredContractsWithVtxos }
}

describe('Taxi receiver input recovery', () => {
  beforeEach(() => {
    localStorage.clear()
    conflictProof.mockReset().mockResolvedValue(false)
  })

  it('persists the selected input before asking the SDK to reserve it', async () => {
    const { wallet, reserveVtxos, release } = setup()
    reserveVtxos.mockImplementation(async () => {
      expect(localStorage.length).toBe(1)
      expect(JSON.parse(localStorage.getItem(localStorage.key(0)!)!)[0]).toMatchObject({
        outpoints: [outpoint],
        phase: 'reserving',
      })
      return { release }
    })
    await reserveTaxiClaim(wallet, 'regtest', server, offer, plan)
    expect(reserveVtxos).toHaveBeenCalledWith([outpoint], 'taxi-claim:https://taxi.test:delivery')
  })

  it('keeps a submitted input held until the indexer confirms it was spent', async () => {
    const { wallet, release, getVtxos } = setup()
    const hold = await reserveTaxiClaim(wallet, 'regtest', server, offer, plan)
    await hold.release(claimTxid)
    expect(release).not.toHaveBeenCalled()
    await reconcileTaxiInputReservations(wallet, 'regtest', server)
    expect(release).not.toHaveBeenCalled()
    getVtxos.mockResolvedValue({ vtxos: [{ ...outpoint, isSpent: true }] })
    await reconcileTaxiInputReservations(wallet, 'regtest', server)
    expect(release).toHaveBeenCalledOnce()
    expect(localStorage.length).toBe(0)
  })

  it('retains an ambiguous claim across a new tab and reconciles its exact input', async () => {
    const first = setup()
    await reserveTaxiClaim(first.wallet, 'regtest', server, offer, plan)
    const next = setup()
    await reconcileTaxiInputReservations(next.wallet, 'regtest', server)
    expect(next.reserveVtxos).toHaveBeenCalledWith([outpoint], 'taxi-claim:https://taxi.test:delivery')
    expect(next.release).not.toHaveBeenCalled()
    expect(localStorage.length).toBe(1)
  })

  it('releases an attempt proven not to have submitted', async () => {
    const { wallet, release, getVtxos } = setup()
    const hold = await reserveTaxiClaim(wallet, 'regtest', server, offer, plan)
    await hold.release()
    expect(release).toHaveBeenCalledOnce()
    expect(getVtxos).not.toHaveBeenCalled()
    expect(localStorage.length).toBe(0)
  })

  it('recovers a reservation whose acknowledgement was lost before signing', async () => {
    const { wallet, reserveVtxos, release } = setup()
    reserveVtxos.mockRejectedValueOnce(new Error('worker reply lost'))
    await expect(reserveTaxiClaim(wallet, 'regtest', server, offer, plan)).rejects.toThrow('worker reply lost')
    expect(localStorage.length).toBe(1)
    await reconcileTaxiInputReservations(wallet, 'regtest', server)
    expect(release).toHaveBeenCalledOnce()
    expect(localStorage.length).toBe(0)
  })

  it('does not treat an absent or different input as terminal proof', async () => {
    const { wallet, release, getVtxos } = setup()
    const hold = await reserveTaxiClaim(wallet, 'regtest', server, offer, plan)
    getVtxos.mockResolvedValue({ vtxos: [] })
    await hold.release(claimTxid)
    getVtxos.mockResolvedValue({ vtxos: [{ ...outpoint, vout: 2, isSpent: true }] })
    await reconcileTaxiInputReservations(wallet, 'regtest', server)
    expect(release).not.toHaveBeenCalled()
    expect(localStorage.length).toBe(1)
  })

  it('fails closed if the SDK cannot reserve external inputs', async () => {
    const { wallet } = setup()
    delete wallet.reserveVtxos
    await expect(reserveTaxiClaim(wallet, 'regtest', server, offer, plan)).rejects.toThrow('cannot safely reserve')
    expect(localStorage.length).toBe(0)
  })

  it('keeps recovery evidence when releasing the durable SDK hold fails', async () => {
    const { wallet, release, getVtxos } = setup()
    const hold = await reserveTaxiClaim(wallet, 'regtest', server, offer, plan)
    getVtxos.mockResolvedValue({ vtxos: [{ ...outpoint, isSpent: true }] })
    release.mockRejectedValue(new Error('storage commit failed'))
    await expect(hold.release(claimTxid)).rejects.toThrow('storage commit failed')
    expect(localStorage.length).toBe(1)
  })

  it('holds a direct transfer until every selected input is observed spent', async () => {
    const { wallet, getVtxos, release } = setup()
    const second = { txid: '33'.repeat(32), vout: 0 }
    const hold = await reserveTaxiInputs(wallet, 'regtest', server, 'taxi-send:delivery', [outpoint, second])
    getVtxos.mockResolvedValue({
      vtxos: [
        { ...outpoint, isSpent: true },
        { ...second, isSpent: false },
      ],
    })
    await hold.release(claimTxid)
    expect(release).not.toHaveBeenCalled()
    getVtxos.mockResolvedValue({
      vtxos: [
        { ...outpoint, isSpent: true },
        { ...second, isSpent: true },
      ],
    })
    await reconcileTaxiInputReservations(wallet, 'regtest', server)
    expect(release).toHaveBeenCalledOnce()
  })

  it('restores a signed outgoing record conservatively when its app journal is absent', async () => {
    const { wallet, reserveVtxos, release } = setup()
    await reserveTaxiInputs(wallet, 'regtest', server, 'taxi-send:delivery', [outpoint], true)
    await reconcileTaxiInputReservations(wallet, 'regtest', server)
    expect(reserveVtxos).toHaveBeenCalledWith([outpoint], 'taxi-send:delivery')
    expect(release).not.toHaveBeenCalled()
    expect(localStorage.length).toBe(1)
  })

  it('persists the SDK spent snapshot before making the input available to ordinary sends', async () => {
    const { wallet, getVtxos, release, refreshOutpoints } = setup()
    const hold = await reserveTaxiClaim(wallet, 'regtest', server, offer, plan)
    getVtxos.mockResolvedValue({ vtxos: [{ ...outpoint, isSpent: true }] })
    refreshOutpoints.mockImplementation(async () => {
      expect(release).not.toHaveBeenCalled()
    })
    await hold.release(claimTxid)
    expect(refreshOutpoints).toHaveBeenCalledExactlyOnceWith([outpoint])
    expect(release).toHaveBeenCalledOnce()
  })

  it('retains both the hold and recovery record when the SDK snapshot cannot be refreshed', async () => {
    const { wallet, getVtxos, release, refreshOutpoints } = setup()
    const hold = await reserveTaxiClaim(wallet, 'regtest', server, offer, plan)
    getVtxos.mockResolvedValue({ vtxos: [{ ...outpoint, isSpent: true }] })
    refreshOutpoints.mockRejectedValue(new Error('wallet snapshot write failed'))
    await expect(hold.release(claimTxid)).rejects.toThrow('wallet snapshot write failed')
    expect(release).not.toHaveBeenCalled()
    expect(localStorage.length).toBe(1)
  })

  it('retains the hold when a refresh silently leaves the local input unspent', async () => {
    const { wallet, getVtxos, release, getStoredContractsWithVtxos } = setup()
    const hold = await reserveTaxiClaim(wallet, 'regtest', server, offer, plan)
    getVtxos.mockResolvedValue({ vtxos: [{ ...outpoint, isSpent: true }] })
    getStoredContractsWithVtxos.mockResolvedValue([{ vtxos: [{ ...outpoint, isSpent: false }] }])
    await hold.release(claimTxid)
    expect(release).not.toHaveBeenCalled()
    expect(localStorage.length).toBe(1)
    getStoredContractsWithVtxos.mockResolvedValue([{ vtxos: [{ ...outpoint, isSpent: true }] }])
    await reconcileTaxiInputReservations(wallet, 'regtest', server)
    expect(release).toHaveBeenCalledOnce()
  })

  it('keeps the originally selected inputs when caller-owned objects change', async () => {
    const { wallet, getVtxos, reserveVtxos, refreshOutpoints } = setup()
    const inputs = [{ ...outpoint }]
    const reserving = reserveTaxiInputs(wallet, 'regtest', server, 'taxi-send:delivery', inputs)
    inputs[0].vout = 99
    const hold = await reserving
    getVtxos.mockResolvedValue({ vtxos: [{ ...outpoint, isSpent: true }] })
    await hold.release(claimTxid)
    expect(reserveVtxos).toHaveBeenCalledWith([outpoint], 'taxi-send:delivery')
    expect(refreshOutpoints).toHaveBeenCalledWith([outpoint])
  })

  it('recovers a raw URL alias using the same durable reservation id', async () => {
    const first = setup()
    await reserveTaxiClaim(first.wallet, 'regtest', server, offer, plan)
    const canonical = localStorage.key(0)!
    const legacy = canonical.replace(server, `${server}/`)
    localStorage.setItem(legacy, localStorage.getItem(canonical)!)
    localStorage.removeItem(canonical)
    const next = setup()
    next.getVtxos.mockResolvedValue({ vtxos: [{ ...outpoint, isSpent: true }] })
    await reconcileTaxiInputReservations(next.wallet, 'regtest', 'HTTP://ARKD.TEST/')
    expect(next.reserveVtxos).toHaveBeenCalledExactlyOnceWith([outpoint], 'taxi-claim:https://taxi.test:delivery')
    expect(first.release).not.toHaveBeenCalled()
    expect(next.release).toHaveBeenCalledOnce()
    expect(localStorage.length).toBe(0)
  })

  it.each(['setItem', 'removeItem'] as const)(
    'retains the hold and raw URL record if migration %s fails',
    async (method) => {
      const { wallet, release, getVtxos } = setup()
      await reserveTaxiClaim(wallet, 'regtest', server, offer, plan)
      const canonical = localStorage.key(0)!
      const legacy = canonical.replace(server, `${server}/`)
      const saved = localStorage.getItem(canonical)!
      localStorage.setItem(legacy, saved)
      localStorage.removeItem(canonical)
      getVtxos.mockResolvedValue({ vtxos: [{ ...outpoint, isSpent: true }] })
      const storage = Object.getPrototypeOf(localStorage)
      const original = storage[method]
      const spy = vi.spyOn(storage, method).mockImplementation(function (this: Storage, ...args: unknown[]) {
        const key = args[0]
        if (key === (method === 'setItem' ? canonical : legacy)) throw new Error('migration write failed')
        return original.apply(this, args)
      })
      try {
        await expect(reconcileTaxiInputReservations(wallet, 'regtest', `${server}/`)).rejects.toThrow(
          'migration write failed',
        )
        expect(release).not.toHaveBeenCalled()
        expect(getVtxos).not.toHaveBeenCalled()
        expect(localStorage.getItem(legacy)).toBe(saved)
      } finally {
        spy.mockRestore()
      }
      await reconcileTaxiInputReservations(wallet, 'regtest', server)
      expect(release).toHaveBeenCalledOnce()
      expect(localStorage.length).toBe(0)
    },
  )

  it('merges an alias conservatively when another record only proves reservation began', async () => {
    const { wallet, release } = setup()
    await reserveTaxiClaim(wallet, 'regtest', server, offer, plan)
    const canonical = localStorage.key(0)!
    const entry = JSON.parse(localStorage.getItem(canonical)!)[0]
    localStorage.setItem(canonical.replace(server, `${server}/`), JSON.stringify([entry]))
    localStorage.setItem(canonical, JSON.stringify([{ ...entry, phase: 'reserving' }]))
    await reconcileTaxiInputReservations(wallet, 'regtest', server)
    expect(release).not.toHaveBeenCalled()
    expect(localStorage.length).toBe(1)
    expect(JSON.parse(localStorage.getItem(canonical)!)[0].phase).toBe('submitting')
  })

  it('preserves both journals and the hold when an alias names conflicting inputs', async () => {
    const { wallet, release, reserveVtxos } = setup()
    await reserveTaxiClaim(wallet, 'regtest', server, offer, plan)
    const canonical = localStorage.key(0)!
    const entry = JSON.parse(localStorage.getItem(canonical)!)[0]
    localStorage.setItem(
      canonical.replace(server, `${server}/`),
      JSON.stringify([{ ...entry, outpoints: [{ ...outpoint, vout: 2 }] }]),
    )
    await expect(reconcileTaxiInputReservations(wallet, 'regtest', server)).rejects.toThrow('recovery records conflict')
    expect(reserveVtxos).toHaveBeenCalledOnce()
    expect(release).not.toHaveBeenCalled()
    expect(localStorage.length).toBe(2)
  })

  it('does not migrate a journal belonging to another operator path', async () => {
    const { wallet, release, reserveVtxos } = setup()
    await reserveTaxiClaim(wallet, 'regtest', server, offer, plan)
    const key = localStorage.key(0)!
    await reconcileTaxiInputReservations(wallet, 'regtest', `${server}/other`)
    expect(reserveVtxos).toHaveBeenCalledOnce()
    expect(release).not.toHaveBeenCalled()
    expect(localStorage.key(0)).toBe(key)
  })

  it('releases an unspent receiver coin after a finalized conflicting claim spend and local refresh', async () => {
    const { wallet, release, refreshOutpoints } = setup()
    await reserveTaxiClaim(wallet, 'regtest', server, offer, plan)
    conflictProof.mockResolvedValue(true)
    await reconcileTaxiInputReservations(wallet, 'regtest', server)
    expect(conflictProof).toHaveBeenCalledWith(expect.anything(), claimOutpoint, [outpoint])
    expect(refreshOutpoints).toHaveBeenCalledExactlyOnceWith([outpoint])
    expect(release).toHaveBeenCalledOnce()
    expect(localStorage.length).toBe(0)
  })

  it.each(['proof', 'refresh', 'storage'])(
    'retains the claim hold when terminal recovery %s fails',
    async (failure) => {
      const { wallet, release, refreshOutpoints } = setup()
      await reserveTaxiClaim(wallet, 'regtest', server, offer, plan)
      conflictProof.mockResolvedValue(true)
      if (failure === 'proof') conflictProof.mockRejectedValue(new Error('recovery failed'))
      if (failure === 'refresh') refreshOutpoints.mockRejectedValue(new Error('recovery failed'))
      if (failure === 'storage') release.mockRejectedValue(new Error('recovery failed'))
      await expect(reconcileTaxiInputReservations(wallet, 'regtest', server)).rejects.toThrow('recovery failed')
      if (failure !== 'storage') expect(release).not.toHaveBeenCalled()
      expect(localStorage.length).toBe(1)
    },
  )

  it.each([
    { coins: [] },
    { coins: [{ ...outpoint, isSpent: true }] },
    { coins: [{ ...outpoint, isSpent: false, spentBy: claimTxid }] },
  ])('retains the claim hold if the local input is not explicitly unspent (%j)', async ({ coins }) => {
    const { wallet, release, getStoredContractsWithVtxos } = setup()
    await reserveTaxiClaim(wallet, 'regtest', server, offer, plan)
    conflictProof.mockResolvedValue(true)
    getStoredContractsWithVtxos.mockResolvedValue([{ vtxos: coins }])
    await reconcileTaxiInputReservations(wallet, 'regtest', server)
    expect(release).not.toHaveBeenCalled()
    expect(localStorage.length).toBe(1)
  })

  it('never applies receiver conflict proof to sender input reservations', async () => {
    const { wallet, release } = setup()
    await reserveTaxiInputs(wallet, 'regtest', server, 'taxi-send:delivery', [outpoint], false, claimOutpoint)
    conflictProof.mockResolvedValue(true)
    await reconcileTaxiInputReservations(wallet, 'regtest', server)
    expect(conflictProof).not.toHaveBeenCalled()
    expect(release).not.toHaveBeenCalled()
  })

  it('retains old ambiguous claim journals that have no original outpoint proof', async () => {
    const { wallet, release } = setup()
    await reserveTaxiClaim(wallet, 'regtest', server, offer, plan)
    const key = localStorage.key(0)!
    const [entry] = JSON.parse(localStorage.getItem(key)!)
    delete entry.claimOutpoint
    localStorage.setItem(key, JSON.stringify([entry]))
    conflictProof.mockResolvedValue(true)
    await reconcileTaxiInputReservations(wallet, 'regtest', server)
    expect(conflictProof).not.toHaveBeenCalled()
    expect(release).not.toHaveBeenCalled()
  })

  it('retains the claim hold when the fresh own-input read is incomplete after proof', async () => {
    const { wallet, release, getVtxos, getStoredContractsWithVtxos } = setup()
    await reserveTaxiClaim(wallet, 'regtest', server, offer, plan)
    conflictProof.mockResolvedValue(true)
    getStoredContractsWithVtxos.mockResolvedValue([{ vtxos: [{ ...outpoint, isSpent: false }] }])
    getVtxos.mockResolvedValueOnce({ vtxos: [{ ...outpoint, isSpent: false }] }).mockResolvedValue({ vtxos: [] })
    await reconcileTaxiInputReservations(wallet, 'regtest', server)
    expect(release).not.toHaveBeenCalled()
    expect(localStorage.length).toBe(1)
  })
})
