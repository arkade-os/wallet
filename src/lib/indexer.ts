import { RestIndexerProvider } from '@arkade-os/sdk'
import { AspInfo } from '../providers/asp'
import { WalletRepository } from '../../../ts-sdk/src/repositories'

const STORAGE_KEY = 'commitmentTxs'

export class Indexer {
  readonly provider: RestIndexerProvider

  constructor(
    aspInfo: AspInfo,
    private readonly walletRepository: WalletRepository,
  ) {
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
    const map = blob ? JSON.parse(blob) : {}
    return map[txid] ?? null
  }

  private setCommitmentTxIds(txid: string, createdAt: number) {
    const blob = localStorage.getItem(STORAGE_KEY)
    const map = blob ? JSON.parse(blob) : {}
    map[txid] = createdAt
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  }
}
