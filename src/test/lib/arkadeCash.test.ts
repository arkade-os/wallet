import { beforeEach, describe, expect, it } from 'vitest'
import { ArkadeCash } from '@arkade-os/sdk'
import { encryptedSecretStorage } from '../../lib/arkadeCashStore'
import { issue as sdkIssue, claim as sdkClaim, decodeCashInput } from '../../lib/arkadeCash'
import { mergeCash } from '../../lib/arkadeCashTransfer'
import { mergeBackupSnapshots } from '../../lib/cashBackup'

const makeToken = () =>
  ArkadeCash.generate(new Uint8Array(32).fill(2), { type: 'blocks', value: 144n }, 'tarkadecash').toString()

describe('Cash secret storage', () => {
  beforeEach(() => localStorage.clear())

  it('never persists a token in plaintext', async () => {
    const store = encryptedSecretStorage(new Uint8Array(32).fill(3))
    const token = makeToken()
    await store.save([{ ...record('issue'), token, updatedAt: 100 }])
    expect(localStorage.getItem('arkade-cash')).not.toContain(token)
    expect(await store.load()).toEqual([{ ...record('issue'), token, updatedAt: 100 }])
  })
})

describe('Cash SDK adapter', () => {
  it('decodes standard tokens and web deep links', () => {
    const token = makeToken()
    expect(decodeCashInput(`web+arkade://${token}`).toString()).toBe(token)
    expect(decodeCashInput(token).toString()).toBe(token)
    expect(() => decodeCashInput('not cash')).toThrow()
  })

  it('uses the worker to create and persist a voucher', async () => {
    const token = makeToken()
    const wallet = {
      ...cashWallet(),
      arkadeCash: async (req: any) => ({
        ...req,
        token,
        cashId: 'cash-id',
        status: 'available',
        issueTxIds: ['funding'],
        claimTxIds: [],
      }),
    }
    const view = await sdkIssue(wallet, 5_000)
    expect(view.id).toBe('cash-id')
    expect(view.status).toBe('available')
    expect(view.token).toBe(token)
    expect(view).toMatchObject({ action: 'issued', amount: 5_000, token, issueTxIds: ['funding'] })
  })

  it('stores both a claim and a pending recovery token', async () => {
    const token = makeToken()
    const wallet = cashWallet(token)
    wallet.arkadeCash = async (req: any) =>
      req.action === 'get'
        ? { ...req, status: 'available', cashId: 'cash-id', issueTxIds: [], claimTxIds: [] }
        : ((wallet.lastRequest = req),
          {
            ...req,
            swept: 5_000,
            recovering: { amount: 1_000, vtxos: [] },
            unclaimed: { amount: 0, vtxos: [] },
            claimTxIds: ['claim'],
          })
    const previous = { ...record('recover'), token, updatedAt: 2 }
    const result = await sdkClaim(wallet, token, previous)
    expect(result.recovering).toBe(1_000)
    expect(result.record.claimTxIds).toEqual(['claim'])
    expect(wallet.lastRequest.action).toBe('claim')
  })

  it('is a pure builder when the provider owns persistence', async () => {
    const wallet = cashWallet(makeToken())
    wallet.arkadeCash = async (req: any) =>
      req.action === 'get'
        ? { ...req, status: 'available', cashId: 'cash-id', issueTxIds: [], claimTxIds: [] }
        : {
            ...req,
            swept: 5_000,
            recovering: { amount: 0, vtxos: [] },
            unclaimed: { amount: 0, vtxos: [] },
            claimTxIds: ['claim'],
          }
    const result = await sdkClaim(wallet, makeToken(), { ...record('recover'), updatedAt: 2 })
    expect(result.record).toMatchObject({ action: 'claimed', claimTxIds: ['claim'] })
  })

  it('allows a registered sweep to be resumed', async () => {
    const wallet = cashWallet(makeToken())
    wallet.arkadeCash = async (req: any) =>
      req.action === 'get'
        ? { ...req, status: 'claimed', cashId: 'cash-id', issueTxIds: [], claimTxIds: [] }
        : ((wallet.lastRequest = req),
          { ...req, swept: 5_000, recovering: { amount: 0, vtxos: [] }, unclaimed: { amount: 0, vtxos: [] } })
    const result = await sdkClaim(wallet, makeToken(), {
      ...record('recover'),
      action: 'claimed',
      outcome: 'sweep-pending',
      status: 'sweep-pending',
      updatedAt: 2,
    })
    expect(wallet.lastRequest.action).toBe('claim')
    expect(result.record.status).toBe('sweep-pending')
  })
})

const record = (id: string) => ({
  id,
  cashId: id,
  action: 'issued' as const,
  amount: 1_000,
  createdAt: 1,
  outcome: 'available',
  issueTxIds: ['a'.repeat(64)],
  claimTxIds: [],
})

describe('Cash record merging', () => {
  it('only removes a secret when the fresh record explicitly omits it', () => {
    const issued = { ...record('issue'), token: 'secret', updatedAt: 10 } as const
    expect(mergeCash([issued], [{ ...issued, updatedAt: 20 }])[0].token).toBe('secret')
    expect(mergeCash([issued], [{ ...issued, token: undefined, updatedAt: 20 }])[0].token).toBeUndefined()
  })

  it('uses snapshot time to recover records and merge their secret state', () => {
    const older = { ...record('issue'), token: 'secret', updatedAt: 10 } as const
    expect(mergeBackupSnapshots([{ cash: { records: [older], updatedAt: 200 } }])[0]).toMatchObject({
      token: 'secret',
      updatedAt: 200_000,
    })
  })
})

function cashWallet(token?: string): any {
  return {
    lastRequest: { action: '' },
    arkadeCash: async (req: any) => {
      return {
        ...req,
        cashId: 'cash-id',
        swept: 5_000,
        recovering: { amount: 1_000, vtxos: [] },
        unclaimed: { amount: 0, vtxos: [] },
        claimTxIds: ['claim'],
        token: token ?? req.token,
        amount: 5_000,
        status: 'claimed',
        issueTxIds: [],
      }
    },
  } as any
}
