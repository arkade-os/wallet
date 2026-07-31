import { arknoteHRP } from './constants'

export const isArkNote = (input: string): boolean => {
  const regex = new RegExp(`^${arknoteHRP}`, 'i')
  return regex.test(input) && input.length > 55
}
