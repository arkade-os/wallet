export interface PendingAssetPayment {
  quoteId: string
  arkAddress: string
  assetId: string
  amount: string
  payAmountSats: string
}

const key = (sender: string, network: string) => `pending-asset-payment:${network}:${sender}`

export const readAssetPayment = (sender: string, network: string): PendingAssetPayment | undefined => {
  const raw = localStorage.getItem(key(sender, network))
  if (raw === null) return undefined
  const value = JSON.parse(raw) as Partial<PendingAssetPayment>
  if (
    !value ||
    typeof value !== 'object' ||
    !['quoteId', 'arkAddress', 'assetId'].every(
      (field) =>
        typeof value[field as keyof PendingAssetPayment] === 'string' && value[field as keyof PendingAssetPayment],
    ) ||
    ![value.amount, value.payAmountSats].every((amount) => typeof amount === 'string' && /^[1-9][0-9]*$/.test(amount))
  )
    throw new Error('Stored asset payment is unreadable; refusing a new payment')
  return value as PendingAssetPayment
}

export const storeAssetPayment = (sender: string, network: string, value: PendingAssetPayment) => {
  localStorage.setItem(key(sender, network), JSON.stringify(value))
  if (JSON.stringify(readAssetPayment(sender, network)) !== JSON.stringify(value))
    throw new Error('Cannot retain the asset payment before funding')
}

export const clearAssetPayment = (sender: string, network: string, quoteId: string) => {
  if (readAssetPayment(sender, network)?.quoteId !== quoteId) throw new Error('Asset payment changed while checking')
  localStorage.removeItem(key(sender, network))
}
