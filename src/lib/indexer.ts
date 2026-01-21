import { RestIndexerProvider } from '@arkade-os/sdk'
import { AspInfo } from '../providers/asp'
import { WalletRepository } from '../../../ts-sdk/src/repositories'

export class Indexer {
  readonly provider: RestIndexerProvider

  constructor(
    aspInfo: AspInfo,
    private readonly walletRepository: WalletRepository,
  ) {
    this.provider = new RestIndexerProvider(aspInfo.url)
  }

  getAndUpdateCommitmentTxCreatedAt = async (txid: string): Promise<number | null> => {
    const [tx] = await this.walletRepository.getCommitmentTxs(txid)
    if (tx) return tx.createdAt

    const commitmentTx = await this.provider.getCommitmentTx(txid)
    if (!commitmentTx?.endedAt) return null
    const createdAt = Number(commitmentTx.endedAt)

    await this.walletRepository.saveCommitmentTxs({ txid, createdAt })

    return createdAt
  }
}
