import { isValidArkAddress } from '@arkade-os/sdk'
import { isValidLnUrl } from '@arkade-os/lnurl-client'
import { isBTCAddress } from './address'
import { decodeBip21 } from './bip21'
import { consoleError } from './logs'
import { getStorageItem, setStorageItemSafely } from './storage'
import type { SendInfo } from '../providers/flow'
import type { Tx } from './types'

export interface Contact {
  address: string
  name?: string
  sendCount: number
  lastSentAt: number
}

const STORAGE_KEY = 'contacts'

export function isReusableContact(address: string): boolean {
  try {
    if (address.startsWith('bitcoin:')) {
      const { address: bitcoin, arkAddress, lnUrl, invoice } = decodeBip21(address)
      return Boolean(lnUrl || arkAddress || (bitcoin && !invoice))
    }
    return isValidLnUrl(address.toLowerCase()) || isValidArkAddress(address.toLowerCase()) || isBTCAddress(address)
  } catch {
    return false
  }
}

export function sendDestination(
  send: Pick<SendInfo, 'address' | 'arkAddress' | 'lnUrl' | 'recipient' | 'invoice'>,
): string | undefined {
  const recipient = send.recipient?.trim()
  if (recipient?.startsWith('bitcoin:')) {
    try {
      const { address: reusableAddress } = decodeBip21(recipient)
      const { arkAddress: ark } = decodeBip21(recipient)
      return ark || reusableAddress
    } catch {
      return undefined
    }
  }
  return send.lnUrl || send.arkAddress || send.address
}

export function contactDisplayName(contact: Contact | undefined): string {
  return contact ? contact.name || contact.address : ''
}

export function readContacts(): Contact[] {
  const stored = getStorageItem<unknown>(STORAGE_KEY, [], JSON.parse)
  if (!Array.isArray(stored)) return []
  return stored
    .filter(
      (contact) =>
        contact &&
        typeof contact.address === 'string' &&
        Number.isFinite(contact.sendCount) &&
        Number.isFinite(contact.lastSentAt),
    )
    .sort((a, b) => b.lastSentAt - a.lastSentAt || a.address.localeCompare(b.address))
}

export function saveContact(
  address: string,
  name: string,
  previousAddress?: string | number,
  previousKey?: string,
): boolean {
  const previousAddressKey = previousKey ?? (typeof previousAddress === 'string' ? previousAddress : undefined)
  const target = address.trim()
  const previous = readContacts().find((contact) => contact.address === previousAddressKey)
  const remaining = readContacts().filter((contact) => ![target, previousAddressKey].includes(contact.address))
  const next = name.trim()
    ? [
        ...remaining,
        {
          ...previous,
          address: target,
          name: name.trim(),
          sendCount: previous?.sendCount ?? 0,
          lastSentAt: previous?.lastSentAt ?? (typeof previousAddress === 'number' ? previousAddress : 0),
        },
      ]
    : remaining
  setStorageItemSafely(STORAGE_KEY, JSON.stringify(next), 'Failed to save contact')
  try {
    return localStorage.getItem(STORAGE_KEY) === JSON.stringify(next)
  } catch {
    return false
  }
}

export function recordSentContact(address: string | undefined, now = Date.now()): void {
  try {
    const target = address?.trim()
    if (!target || !isReusableContact(target)) return
    const previous = readContacts().find((contact) => contact.address === target)
    setStorageItemSafely(
      STORAGE_KEY,
      JSON.stringify([
        ...readContacts().filter((contact) => contact.address !== target),
        { ...previous, address: target, sendCount: (previous?.sendCount ?? 0) + 1, lastSentAt: now },
      ]),
      'Failed to save contact',
    )
  } catch {}
}

export function forgetContacts(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (err) {
    consoleError(err, 'Failed to clear contacts')
  }
}

export function contactForSend(send: Parameters<typeof sendDestination>[0]): Contact | undefined {
  return readContacts().find((contact) => contact.address === sendDestination(send))
}

let pendingContact: string | undefined

// Passing the row's address through the settings option alone would land on the
// list, so keep a one-shot handoff the Contacts screen consumes on mount.
export function selectContactForDetails(address: string): void {
  pendingContact = address
}

export function takeSelectedContact(): string | undefined {
  const address = pendingContact
  pendingContact = undefined
  return address
}

export function contactAddressForActivity(tx: Tx): string | undefined {
  if (tx.type !== 'sent' || tx.lnSend || tx.assetSwap) return undefined
  if (tx.lnurl?.address) return tx.lnurl.address
  return tx.destination
}

export function contactForAddress(address: string | undefined): Contact | undefined {
  if (!address) return undefined
  return readContacts().find((contact) => contact.address === address)
}

export function contactDisplayNameForAddress(address: string | undefined): string | undefined {
  return contactDisplayName(contactForAddress(address)) || undefined
}
