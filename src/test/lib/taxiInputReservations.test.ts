import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RecyclePlan, VerifiedClaim } from '@arkade-taxi/client/wallet'
import { reconcileTaxiInputReservations, reserveTaxiClaim, reserveTaxiInputs } from '../../lib/taxiInputReservations'

const server = 'http://arkd.test'
const txid = '11'.repeat(32)
const claimTxid = '22'.repeat(32)
const outpoint = { txid, vout: 1 }
const offer = {
  taxi: { url: 'https://taxi.test' },
  claim: { transferId: 'delivery' },
} as VerifiedClaim
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
})
