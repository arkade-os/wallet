import type { Activity, ArkadeCashRequest, ArkadeCashResponse } from '@arkade-os/sdk'
import { parseCashToken, type CashRecord } from './arkadeCashTransfer'

export type CashWallet = {
  arkadeCash(request: ArkadeCashRequest): Promise<ArkadeCashResponse | undefined>
}

const request = async <T extends ArkadeCashRequest>(wallet: CashWallet, req: T) => {
  const response = await wallet.arkadeCash(req)
  if (!response) throw new Error('This wallet SDK does not support Arkade Cash')
  if (response.action !== req.action) throw new Error('Unexpected voucher response')
  return response as Extract<ArkadeCashResponse, { action: T['action'] }>
}

export const decodeCashInput = (input: string) => {
  const token = parseCashToken(input)
  return { toString: () => token }
}

export const inspect = async (wallet: CashWallet, token: string) => {
  const report = await request(wallet, { action: 'get', token })
  if (report.action !== 'get') throw new Error('Voucher inspection failed')
  return report
}

export const issue = async (wallet: CashWallet, amount: number) => {
  let token: string
  try {
    const response = await request(wallet, { action: 'create', amount })
    if (response.action !== 'create') throw new Error('Voucher creation failed')
    token = response.token
  } catch (err) {
    const recoverable = (err as { cash?: string }).cash
    if (!recoverable) throw err
    token = recoverable
  }
  const report = await inspect(wallet, token)
  const record: CashRecord = {
    id: report.cashId,
    action: 'issued',
    amount: report.amount || amount,
    outcome: report.status,
    issueTxIds: report.issueTxIds,
    claimTxIds: report.claimTxIds,
    createdAt: Math.floor(Date.now() / 1000),
    updatedAt: Date.now(),
    token,
    status: report.status,
  }
  return record
}

export const claim = async (wallet: CashWallet, token: string, previous?: CashRecord) => {
  const report = await inspect(wallet, token)
  const pendingSweep = previous?.outcome === 'sweep-pending' || previous?.status === 'sweep-pending'
  if (['unissued', 'exited'].includes(report.status) || (report.status === 'claimed' && !pendingSweep)) {
    throw new Error(`Voucher is ${report.status}`)
  }
  const response = await request(wallet, { action: 'claim', token })
  if (response.action !== 'claim') throw new Error('Voucher claim failed')
  const recovering = response.recovering.amount
  const outcome = recovering > 0 ? 'recovering' : response.swept > 0 ? 'sweep-pending' : 'claimed'
  const record: CashRecord = {
    id: report.cashId,
    action: 'claimed',
    amount: response.swept + recovering,
    outcome,
    issueTxIds: report.issueTxIds,
    claimTxIds: [
      ...new Set([...(previous?.action === 'claimed' ? previous.claimTxIds : []), ...(response.claimTxIds ?? [])]),
    ],
    createdAt: previous?.action === 'claimed' ? previous.createdAt : Math.floor(Date.now() / 1000),
    updatedAt: Date.now(),
    status: outcome,
    token,
  }
  return { record, recovering, swept: response.swept, unclaimed: response.unclaimed }
}

export const activities = async (wallet: CashWallet, records: CashRecord[]): Promise<Activity[]> => {
  const publicRecords = records.map(({ token, status, ...record }) => {
    void token
    void status
    return record
  })
  const result = await request(wallet, { action: 'activities', records: publicRecords })
  if (result.action !== 'activities') throw new Error('Voucher activity failed')
  return result.activities
}

export const refresh = async (wallet: CashWallet, records: CashRecord[]) => {
  return Promise.all(
    records.map(async (record) => {
      if (!record.token) return record
      try {
        const report = await inspect(wallet, record.token)
        const status =
          record.action === 'claimed' && report.status !== 'claimed' ? ('recovering' as const) : report.status
        return {
          ...record,
          outcome: status,
          status,
          updatedAt: record.updatedAt,
          issueTxIds: [...new Set([...record.issueTxIds, ...report.issueTxIds])],
          claimTxIds: [...new Set([...record.claimTxIds, ...report.claimTxIds])],
          token:
            report.status === 'exited' || (report.status === 'claimed' && record.outcome === 'claimed')
              ? undefined
              : record.token,
        }
      } catch {
        return record
      }
    }),
  )
}
