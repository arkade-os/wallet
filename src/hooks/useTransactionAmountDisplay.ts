import { useContext } from 'react'
import { AspContext } from '../providers/asp'
import { ConfigContext } from '../providers/config'
import { FiatContext } from '../providers/fiat'
import { WalletContext } from '../providers/wallet'
import { defaultFee } from '../lib/constants'
import { buildTransactionAmountDisplay, TransactionAmountDisplay } from '../lib/transactionAmountDisplay'
import { Tx } from '../lib/types'

/** The builder args every call site derives from context the same way. */
export function useAmountDisplayContext() {
  const { config } = useContext(ConfigContext)
  const { fromFiatAmount, toFiatAmount } = useContext(FiatContext)
  const { assetMetadataCache, isVerifiedAsset } = useContext(WalletContext)
  const { aspInfo } = useContext(AspContext)
  return {
    bitcoinUnit: config.unit,
    currency: config.currency,
    fromFiatAmount,
    isVerifiedAsset,
    metadataForAsset: (assetId: string) => assetMetadataCache.get(assetId)?.metadata,
    network: aspInfo.network,
    toFiatAmount,
  }
}

/** Amount display for an activity tx. Swap rows render their own summary, so they get undefined. */
export function useTransactionAmountDisplay(tx: Tx | undefined): TransactionAmountDisplay | undefined {
  const context = useAmountDisplayContext()
  if (!tx || tx.type === 'swap') return undefined
  return buildTransactionAmountDisplay({
    ...context,
    assets: tx.assets,
    // On asset transfers tx.amount is only the data carrier, not the asset value.
    satoshis: tx.assets?.length ? 0 : Math.max(tx.type === 'sent' ? tx.amount - defaultFee : tx.amount, 0),
  })
}
