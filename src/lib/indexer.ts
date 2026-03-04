import { RestIndexerProvider } from '@arkade-os/sdk'
import { AspInfo } from '../providers/asp'

const STORAGE_KEY = 'commitmentTxs'

export class Indexer {
  readonly provider: RestIndexerProvider

  constructor(aspInfo: AspInfo) {
    this.provider = new RestIndexerProvider(aspInfo.url)
  }

  getAndUpdateCommitmentTxCreatedAt = async (txid: string): Promise<number | null> => {
    const createdAt = this.getCommitmentTxIds(txid)
    if (createdAt) return createdAt
    const commitmentTx = await this.provider.getCommitmentTx(txid)
    if (!commitmentTx?.endedAt) return null
    const newCreatedAt = Number(commitmentTx.endedAt)
    this.setCommitmentTxIds(txid, newCreatedAt)
    return newCreatedAt
  }

  private getCommitmentTxIds(txid: string): number | null {
    const blob = localStorage.getItem(STORAGE_KEY)
    if (!blob) return null
    let map: Record<string, number>
    try {
      map = JSON.parse(blob)
    } catch {
      console.error('Failed to parse commitmentTxs from localStorage, resetting')
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return map[txid] ?? null
  }

  private setCommitmentTxIds(txid: string, createdAt: number) {
    const blob = localStorage.getItem(STORAGE_KEY)
    const map = blob ? JSON.parse(blob) : {}
    map[txid] = createdAt
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  }
}
