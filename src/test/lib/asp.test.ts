import { beforeEach, describe, it, expect, vi } from 'vitest'

// Keep the real SDK (so ArkError stays a real class for the instanceof check in
// getAspInfo) and only override RestArkProvider to control what getInfo throws.
vi.mock('@arkade-os/sdk', async (importOriginal) => {
  const actual = (await importOriginal()) as any
  return {
    ...actual,
    RestArkProvider: class {
      constructor(public url: string) {}
      async getInfo() {
        // arkd's real guard error reaches us WITHOUT metadata (empty details[]),
        // with the min only in the message — exercise that path explicitly.
        if (this.url.includes('nometa')) {
          throw new actual.ArkError(48, 'server requires build version header >= 0.9.10', 'BUILD_VERSION_TOO_OLD')
        }
        if (this.url.includes('too-old')) {
          throw new actual.ArkError(3, 'server requires build version header >= 0.9.10', 'BUILD_VERSION_TOO_OLD', {
            min_version: '0.9.10',
          })
        }
        throw new Error('network down')
      }
    },
  }
})

import { getAspInfo, aspErrorText, emptyAspInfo, byExpiryAsc, getTxHistory } from '../../lib/asp'
import { saveTransactionActivityMetadata } from '../../lib/storage'

beforeEach(() => {
  localStorage.clear()
})

describe('byExpiryAsc', () => {
  it('sorts known expiries ascending and places missing expiry last', () => {
    const items = [
      { id: 'no-expiry', expiresAt: undefined },
      { id: 'later', expiresAt: new Date(2000) },
      { id: 'null-expiry', expiresAt: null },
      { id: 'earlier', expiresAt: new Date(1000) },
    ]

    const sorted = [...items].sort(byExpiryAsc).map((i) => i.id)

    expect(sorted).toEqual(['earlier', 'later', 'no-expiry', 'null-expiry'])
  })
})

describe('aspErrorText', () => {
  it('returns the caller fallback when not outdated', () => {
    expect(aspErrorText({ ...emptyAspInfo, outdated: false }, 'Arkade server unreachable')).toBe(
      'Arkade server unreachable',
    )
  })

  it('returns the update-required message when outdated', () => {
    expect(aspErrorText({ ...emptyAspInfo, outdated: true, minBuildVersion: '0.9.10' }, 'x')).toBe(
      'Your wallet is outdated and needs to be updated to be compatible with the latest Arkade version.',
    )
  })
})

describe('getAspInfo', () => {
  it('flags outdated (not just unreachable) on BUILD_VERSION_TOO_OLD', async () => {
    const info = await getAspInfo('too-old.example.com')
    expect(info.unreachable).toBe(true)
    expect(info.outdated).toBe(true)
    expect(info.minBuildVersion).toBe('0.9.10')
  })

  it('extracts the min version from the message when metadata is absent', async () => {
    const info = await getAspInfo('nometa.example.com')
    expect(info.outdated).toBe(true)
    expect(info.minBuildVersion).toBe('0.9.10')
  })

  it('flags unreachable but not outdated on a generic failure', async () => {
    const info = await getAspInfo('down.example.com')
    expect(info.unreachable).toBe(true)
    expect(info.outdated).toBeFalsy()
  })
})

describe('getTxHistory', () => {
  it('restores locally persisted receipt details for a sent transaction', async () => {
    saveTransactionActivityMetadata('ark-txid', {
      assetAction: 'reissued',
      destination: 'tark1destination',
      networkFee: 0,
    })
    const wallet = {
      getTransactionHistory: async () => [
        {
          amount: 0,
          assets: [{ assetId: 'asset-id', amount: BigInt(100) }],
          createdAt: Date.now(),
          key: { arkTxid: 'ark-txid', boardingTxid: '', commitmentTxid: '' },
          settled: true,
          type: 'SENT',
        },
      ],
    }

    const [tx] = await getTxHistory(wallet as any)

    expect(tx).toMatchObject({
      assetAction: 'reissued',
      destination: 'tark1destination',
      networkFee: 0,
    })
  })
})
