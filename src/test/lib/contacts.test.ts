import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  contactDisplayName,
  forgetContact,
  readContacts,
  readRecents,
  recordSentRecent,
  saveContact,
  saveRecentAsContact,
  savableActivityAddress,
  sendDestination,
} from '../../lib/contacts'

const alice = 'alice@pay.example'
const bitcoin = 'bcrt1pj7fdvrpdsn0cl6722tmcvwcw4yqpe46020g43nhgzl90qq4aqjrs33du9f'
const ark =
  'tark1qplnj2gett9j483fchy6chaxn4y52c4g7n5djh9xua3ywdxw0ldatc3e9xcj9xpx0r5tmr0dgvu2f4s352muklg0tcxx0scnnkraajy9jgz4xl'
const invoice =
  'lnbcrt21u1p5tqtaypp56yzglgfgwsm5pd49996jqvtmpf8fqdk7cq2znnjw5c2j5t8ua38qdql2djkuepqw3hjqs2jfvsxzerywfjhxuccqz95xqztfsp586s5vpsdxt05rm7hr6ycwq5ffmnx2gngv820seugky6j6z2wxqwq9qxpqysgqepuxr82pvlp8lgj7nqu8yp2f5q32323jxddx9qgtjhfhsyzvftgkwx8qv4772fzz46pwyw5ex3u7lf7na8a8403ur3gyeu22gv29rpspefzz2y'
const baseTx = {
  amount: 1,
  boardingTxid: '',
  createdAt: 1,
  explorable: undefined,
  preconfirmed: false,
  redeemTxid: '',
  roundTxid: '',
  settled: true,
  type: 'sent' as const,
}

describe('contacts', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('records sends as recents, never straight into contacts', () => {
    recordSentRecent(bitcoin, 1000)
    recordSentRecent(alice)
    recordSentRecent(alice, 2000)

    expect(readRecents()).toMatchObject([
      { address: alice, sendCount: 2, lastSentAt: 2000 },
      { address: bitcoin, sendCount: 1, lastSentAt: 1000 },
    ])
    expect(readContacts()).toEqual([])
  })

  it('does not turn one-time payment instructions into recents', () => {
    recordSentRecent(invoice, 1000)
    recordSentRecent(`bitcoin:${bitcoin}?lightning=${invoice}`, 1000)
    expect(readRecents()).toEqual([])
  })

  it('promotes a recent to a contact, keeping its history, and deletes it', () => {
    recordSentRecent(bitcoin, 1000)
    saveRecentAsContact(bitcoin, 'Coffee')
    expect(readContacts()).toMatchObject([{ address: bitcoin, name: 'Coffee', sendCount: 1, lastSentAt: 1000 }])
    // the recent row stays: it is history, not a staging copy
    expect(readRecents()).toHaveLength(1)
    expect(forgetContact(bitcoin)).toBe(true)
    expect(readContacts()).toEqual([])
    expect(readRecents()).toHaveLength(1)
  })

  it('saves a reusable destination without a name', () => {
    saveContact(alice, 'Coffee shop')
    expect(readContacts()).toContainEqual({ address: alice, name: 'Coffee shop', sendCount: 0, lastSentAt: 0 })
    saveContact(alice, '')
    expect(readContacts()).toContainEqual({ address: alice, name: undefined, sendCount: 0, lastSentAt: 0 })
  })

  it('keeps the contact key and history when its destination is edited', () => {
    recordSentRecent(bitcoin, 1000)
    saveContact(bitcoin, 'Coffee')
    saveContact(alice, 'Coffee', bitcoin)
    expect(readContacts()).toMatchObject([{ address: alice, sendCount: 1, lastSentAt: 1000, name: 'Coffee' }])
    expect(readContacts()).toHaveLength(1)
  })

  it('uses the entered reusable destination, not an invoice on the payment URI', () => {
    const raw = `bitcoin:${bitcoin}?ark=${ark}&lightning=${invoice}`
    const send = { recipient: raw, address: bitcoin, arkAddress: ark, invoice }
    expect(sendDestination(send)).toBe(ark)
    expect(sendDestination({ ...send, recipient: undefined })).toBe(ark)
    expect(sendDestination({ recipient: undefined, address: bitcoin, invoice })).toBe(bitcoin)
  })

  it('ignores malformed stored records and storage failures', () => {
    localStorage.setItem('contacts', '{bad json')
    expect(readContacts()).toEqual([])
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage full')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })
    expect(() => recordSentRecent(alice, 0)).not.toThrow()
  })

  it('migrates pre-split unnamed contacts into recents', () => {
    localStorage.setItem('contacts', JSON.stringify([{ address: alice, sendCount: 3, lastSentAt: 50 }]))
    expect(readContacts()).toEqual([])
    expect(readRecents()).toEqual([{ address: alice, sendCount: 3, lastSentAt: 50 }])
    expect(JSON.parse(localStorage.getItem('contacts')!)).toEqual([])
  })

  it('shows the full address for an unnamed contact', () => {
    expect(contactDisplayName({ address: 'user@asp.example.com', sendCount: 0, lastSentAt: 0 })).toBe(
      'user@asp.example.com',
    )
  })

  it('drops stored records whose name is not text', () => {
    localStorage.setItem('contacts', JSON.stringify([{ address: alice, name: 42, sendCount: 1, lastSentAt: 1 }]))
    expect(readContacts()).toEqual([])
  })

  it('offers a save action only for a reusable sent destination', () => {
    expect(savableActivityAddress({ ...baseTx, destination: bitcoin })).toBe(bitcoin)
    expect(savableActivityAddress({ ...baseTx, destination: invoice })).toBeUndefined()
    expect(savableActivityAddress({ ...baseTx, type: 'received' as const })).toBeUndefined()
  })
})
