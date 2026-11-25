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

/** A payee seen in history, never a contact until the user saves it. */
export type Recent = Omit<Contact, 'name'>

const CONTACTS_KEY = 'contacts'
const RECENTS_KEY = 'recents'
const SPLIT_KEY = 'contacts.split.v1'

const readList = (key: string): Contact[] => {
  const stored = getStorageItem<unknown>(key, [], JSON.parse)
  if (!Array.isArray(stored)) return []
  return stored
    .filter(
      (item) =>
        item &&
        typeof item.address === 'string' &&
        (item.name === undefined || typeof item.name === 'string') &&
        Number.isFinite(item.sendCount) &&
        Number.isFinite(item.lastSentAt),
    )
    .sort((a, b) => b.lastSentAt - a.lastSentAt || a.address.localeCompare(b.address))
}

const writeList = (key: string, list: Contact[]): boolean => {
  setStorageItemSafely(key, JSON.stringify(list), 'Failed to save contact')
  try {
    return localStorage.getItem(key) === JSON.stringify(list)
  } catch {
    return false
  }
}

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
  // Before the split, every automatic send entry was written straight into
  // contacts. Migrate those unnamed entries once; after the marker is set an
  // unnamed contact is something the user chose to save and must stay put.
  const stored = readList(CONTACTS_KEY)
  if (splitMigrated()) return stored
  const unnamed = stored.filter((contact) => !contact.name?.trim())
  if (unnamed.length) migrateUnnamed(unnamed)
  markSplitMigrated()
  return readList(CONTACTS_KEY)
}

const splitMigrated = (): boolean => {
  try {
    return localStorage.getItem(SPLIT_KEY) === '1'
  } catch {
    return false
  }
}

const markSplitMigrated = (): void => {
  try {
    localStorage.setItem(SPLIT_KEY, '1')
  } catch (err) {
    consoleError(err, 'Failed to finish contacts migration')
  }
}

const migrateUnnamed = (unnamed: Contact[]): void => {
  if (!unnamed.length) return
  const recents = readRecents()
  const merged = [...recents]
  for (const item of unnamed) {
    const { address, sendCount, lastSentAt } = item
    const known = merged.find((recent) => recent.address === address)
    if (known) {
      known.sendCount = Math.max(known.sendCount, sendCount)
      known.lastSentAt = Math.max(known.lastSentAt, lastSentAt)
    } else {
      merged.push({ address, sendCount, lastSentAt })
    }
  }
  writeList(RECENTS_KEY, merged)
  writeList(
    CONTACTS_KEY,
    readList(CONTACTS_KEY).filter((contact) => contact.name?.trim()),
  )
}

export function readRecents(): Recent[] {
  return readList(RECENTS_KEY)
}

export function saveContact(address: string, name: string, previousAddress?: string): boolean {
  const target = address.trim()
  if (!isReusableContact(target)) return false
  const contacts = readContacts()
  const previous = contacts.find((contact) => contact.address === previousAddress)
  const seen = [...readRecents(), ...contacts].find((item) => item.address === target)
  const remaining = contacts.filter((contact) => ![target, previousAddress].includes(contact.address))
  const next = [
    ...remaining,
    {
      ...previous,
      address: target,
      // An unnamed contact still falls back to its address on screen.
      name: name.trim() || undefined,
      sendCount: previous?.sendCount ?? seen?.sendCount ?? 0,
      lastSentAt: previous?.lastSentAt ?? seen?.lastSentAt ?? 0,
    },
  ]
  return writeList(CONTACTS_KEY, next)
}

export function forgetContact(address: string): boolean {
  return writeList(
    CONTACTS_KEY,
    readContacts().filter((contact) => contact.address !== address),
  )
}

/** Moving a recent into contacts leaves the recent list alone: it is history. */
export function saveRecentAsContact(address: string, name: string): boolean {
  return saveContact(address, name)
}

export function recordSentRecent(address: string | undefined, now = Date.now()): void {
  try {
    const target = address?.trim()
    if (!target || !isReusableContact(target)) return
    const previous = readRecents().find((recent) => recent.address === target)
    writeList(RECENTS_KEY, [
      ...readRecents().filter((recent) => recent.address !== target),
      { ...previous, address: target, sendCount: (previous?.sendCount ?? 0) + 1, lastSentAt: now },
    ])
    // A saved contact mirrors the same send so its stats and ordering stay live.
    const contacts = readList(CONTACTS_KEY)
    if (!contacts.some((contact) => contact.address === target)) return
    writeList(
      CONTACTS_KEY,
      contacts.map((contact) =>
        contact.address === target
          ? {
              ...contact,
              sendCount: Math.max(contact.sendCount, previous?.sendCount ?? 0) + 1,
              lastSentAt: now,
            }
          : contact,
      ),
    )
  } catch {}
}

/** Record a completed send. The tick may only add a contact, never overwrite
 *  one the user already named. */
export function rememberSentDestination(
  send: Parameters<typeof sendDestination>[0],
  saveAsContact: boolean,
  now = Date.now(),
): void {
  const address = sendDestination(send)
  if (!address) return
  recordSentRecent(address, now)
  if (saveAsContact && !contactForAddress(address)) saveContact(address, '')
}

export function forgetContacts(): void {
  for (const key of [CONTACTS_KEY, RECENTS_KEY, SPLIT_KEY]) {
    try {
      localStorage.removeItem(key)
    } catch (err) {
      consoleError(err, 'Failed to clear contacts')
    }
  }
}

export function contactForSend(send: Parameters<typeof sendDestination>[0]): Contact | undefined {
  return readContacts().find((contact) => contact.address === sendDestination(send))
}

export function recentForSend(send: Parameters<typeof sendDestination>[0]): Recent | undefined {
  const target = sendDestination(send)
  return target ? readRecents().find((recent) => recent.address === target) : undefined
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

/** Reusable destination for one history row, whether or not it is a contact. */
export function savableActivityAddress(tx: Tx): string | undefined {
  const address = contactAddressForActivity(tx)
  return address && isReusableContact(address) ? address : undefined
}
