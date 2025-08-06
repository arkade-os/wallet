/**
 * JSON utilities with BigInt support
 * BigInt values are serialized as strings with a special prefix and parsed back to BigInt
 */

const BIGINT_PREFIX = '__BIGINT__'

/**
 * Custom JSON replacer that converts BigInt to string representation
 */
const bigintReplacer = (_key: string, value: any): any => {
  if (typeof value === 'bigint') {
    return BIGINT_PREFIX + value.toString()
  }
  return value
}

/**
 * Custom JSON reviver that converts string representation back to BigInt
 */
const bigintReviver = (_key: string, value: any): any => {
  if (typeof value === 'string' && value.startsWith(BIGINT_PREFIX)) {
    return BigInt(value.slice(BIGINT_PREFIX.length))
  }
  return value
}

/**
 * JSON.stringify with BigInt support
 */
export const stringifyWithBigInt = (value: any): string => {
  return JSON.stringify(value, bigintReplacer)
}

/**
 * JSON.parse with BigInt support
 */
export const parseWithBigInt = (text: string): any => {
  return JSON.parse(text, bigintReviver)
}
