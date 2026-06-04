const onlyDigits = (amount: string | number | bigint): boolean => {
  if (!amount || amount === '') return true
  const regex = new RegExp(/^[0-9]+(\.[0-9]+)?$/)
  return regex.test(amount.toString())
}

const safeQuantity = (amount: string | number | bigint): boolean => {
  if (amount === undefined || amount === null) return true
  return amount.toString().length < 20
}

const isPositive = (amount: string | number | bigint): boolean => {
  if (amount === undefined || amount === null) return true
  try {
    return BigInt(amount) > BigInt(0)
  } catch {
    return false
  }
}

export const isInvalidMintAmount = (amount: string | number | bigint): string | void => {
  if (!isPositive(amount)) return 'Amount must be a positive number'
  if (!onlyDigits(amount)) return 'Invalid amount format'
  if (!safeQuantity(amount)) return 'Amount too large'
}
