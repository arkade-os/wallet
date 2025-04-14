import { arknoteHRP } from './constants'

export const isArkNote = (input: string): boolean => {
  const regex = new RegExp(`^${arknoteHRP}`, 'i')
  return regex.test(input) && input.length > 100
}

export const arkNoteInUrl = (): string => {
  const fragment = window.location.hash.slice(1).replace('web+arkade://', '')
  return isArkNote(fragment) ? fragment : ''
}
