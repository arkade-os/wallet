import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readContacts, recordSentContact, saveContact, sendDestination } from '../../lib/contacts'

const alice = 'alice@pay.example'
const bitcoin = 'bcrt1pj7fdvrpdsn0cl6722tmcvwcw4yqpe46020g43nhgzl90qq4aqjrs33du9f'
const ark =
  'tark1qplnj2gett9j483fchy6chaxn4y52c4g7n5djh9xua3ywdxw0ldatc3e9xcj9xpx0r5tmr0dgvu2f4s352muklg0tcxx0scnnkraajy9jgz4xl'
const invoice =
  'lnbcrt21u1p5tqtaypp56yzglgfgwsm5pd49996jqvtmpf8fqdk7cq2znnjw5c2j5t8ua38qdql2djkuepqw3hjqs2jfvsxzerywfjhxuccqz95xqztfsp586s5vpsdxt05rm7hr6ycwq5ffmnx2gngv820seugky6j6z2wxqwq9qxpqysgqepuxr82pvlp8lgj7nqu8yp2f5q32323jxddx9qgtjhfhsyzvftgkwx8qv4772fzz46pwyw5ex3u7lf7na8a8403ur3gyeu22gv29rpspefzz2y'

describe('contacts', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('records direct and LNURL destinations once per send, starting every contact at one send', () => {
    recordSentContact(bitcoin, 1000)
    recordSentContact(alice)
    recordSentContact(alice, 2000)

    expect(readContacts()).toMatchObject([
      { address: alice, sendCount: 2, lastSentAt: 2000 },
      { address: bitcoin, sendCount: 1, lastSentAt: 1000 },
    ])
    expect(readContacts()).toHaveLength(2)
  })

  it('does not turn one-time payment instructions into contacts', () => {
    recordSentContact(invoice, 1000)
    recordSentContact(`bitcoin:${bitcoin}?lightning=${invoice}`, 1000)
    expect(readContacts()).toEqual([])
  })

  it('saves a manually named reusable destination and removes it', () => {
    saveContact(alice, 'Coffee shop')
    expect(readContacts()).toContainEqual({ address: alice, name: 'Coffee shop', sendCount: 0, lastSentAt: 0 })
    saveContact(alice, '', 0)
    expect(readContacts()).toEqual([])
  })

  it('keeps the contact key and history when its destination is edited', () => {
    recordSentContact(bitcoin, 1000)
    saveContact(alice, 'Coffee', 3000, bitcoin)
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
    expect(() => recordSentContact(alice, 0)).not.toThrow()
  })
})
