import { ContractRepositoryImpl, RestIndexerProvider } from '@arkade-os/sdk'
import { AspInfo } from '../providers/asp'
import { IndexedDBStorageAdapter } from '@arkade-os/sdk/adapters/indexedDB'
import { createStorageAdapter } from './storageFactory'
import { LocalStorageAdapter } from './localStorageAdapter'

interface CommitmentTxRecord {
  txid: string
  when: number // milliseconds since epoch
}

export class Indexer {
  private contractRepoPromise: Promise<ContractRepositoryImpl>
  readonly provider: RestIndexerProvider
  readonly contractCollection = 'commitmentTxs'

  constructor(aspInfo: AspInfo) {
    this.provider = new RestIndexerProvider(aspInfo.url)
    this.contractRepoPromise = (async () => {
      const storage = await createStorageAdapter('arkade-service-worker')
      return new ContractRepositoryImpl(storage as IndexedDBStorageAdapter | LocalStorageAdapter)
    })()
  }

  private async getContractRepo(): Promise<ContractRepositoryImpl> {
    return this.contractRepoPromise
  }

  getCommitmentTxCreatedAt = async (txid: string): Promise<number | null> => {
    const contractRepo = await this.getContractRepo()
    const records = (await contractRepo.getContractCollection(this.contractCollection)) as CommitmentTxRecord[]
    const tx = records.find((r) => r.txid === txid)
    if (tx) return tx.when

    const commitmentTx = await this.provider.getCommitmentTx(txid)
    if (!commitmentTx?.endedAt) return null
    const when = Number(commitmentTx.endedAt)

    await contractRepo.saveToContractCollection(
      this.contractCollection,
      { txid, when },
      'txid', // key field
    )

    return when
  }
}
