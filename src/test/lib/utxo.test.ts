import { describe, expect, it, vi } from 'vitest'

let exitPaths = [{ params: { timelock: { value: 42 } } }]

vi.mock('@arkade-os/sdk', () => {
  return {
    VtxoScript: {
      decode: vi.fn(() => ({ exitPaths: vi.fn(() => exitPaths) })),
    },
    hasBoardingTxExpired: vi.fn((utxo: any) => Boolean(utxo.__expired)),
  }
})

import { hasBoardingTxExpired, VtxoScript } from '@arkade-os/sdk'
import { getConfirmedAndNotExpiredUtxos } from '../../lib/utxo'

const mkUtxo = ({ confirmed, expired, tapTree }: { confirmed: boolean; expired: boolean; tapTree: number[] }) =>
  ({
    status: { confirmed },
    __expired: expired,
    tapTree: new Uint8Array(tapTree),
  }) as any

describe('getConfirmedAndNotExpiredUtxos', () => {
  it('returns only utxos that are confirmed and not expired', async () => {
    const confirmedNotExpired = mkUtxo({
      confirmed: true,
      expired: false,
      tapTree: [1, 2, 3, 99],
    })
    const confirmedExpired = mkUtxo({
      confirmed: true,
      expired: true,
      tapTree: [9, 9, 9, 100],
    })
    const unconfirmedNotExpired = mkUtxo({
      confirmed: false,
      expired: false,
      tapTree: [7, 7, 7, 101],
    })

    const wallet = {
      getBoardingUtxos: vi.fn().mockResolvedValue([confirmedNotExpired, confirmedExpired, unconfirmedNotExpired]),
    } as any

    const result = await getConfirmedAndNotExpiredUtxos(wallet)

    expect(wallet.getBoardingUtxos).toHaveBeenCalledTimes(1)
    expect(result).toEqual([confirmedNotExpired])
    expect(VtxoScript.decode).toHaveBeenCalledWith(confirmedNotExpired.tapTree)
    expect(VtxoScript.decode).toHaveBeenCalledWith(confirmedExpired.tapTree)
    expect(hasBoardingTxExpired).toHaveBeenCalledTimes(2)
  })

  it('always uses the earliest timelock', async () => {
    const confirmedNotExpired = mkUtxo({
      confirmed: true,
      expired: false,
      tapTree: [1, 2, 3, 99],
    })

    exitPaths = [
      { params: { timelock: { value: 5 } } },
      { params: { timelock: { value: 3 } } },
      { params: { timelock: { value: 9 } } },
    ]

    const wallet = {
      getBoardingUtxos: vi.fn().mockResolvedValue([confirmedNotExpired]),
    } as any

    const result = await getConfirmedAndNotExpiredUtxos(wallet)

    expect(result).toEqual([confirmedNotExpired])
    expect(hasBoardingTxExpired).toHaveBeenCalledWith(confirmedNotExpired, { value: 3 })
  })

  it('it returns UTXO without exit paths', async () => {
    const confirmedNotExpired = mkUtxo({
      confirmed: true,
      expired: false,
      tapTree: [1, 2, 3, 99],
    })

    exitPaths = []
    const wallet = {
      getBoardingUtxos: vi.fn().mockResolvedValue([confirmedNotExpired]),
    } as any

    const result = await getConfirmedAndNotExpiredUtxos(wallet)

    expect(result).toEqual([confirmedNotExpired])
    expect(hasBoardingTxExpired).toHaveBeenCalledTimes(0)
  })
})
