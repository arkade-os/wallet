import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { useContext } from 'react'
import { BackupContext, BackupProvider } from '../../providers/backup'
import { ConfigContext } from '../../providers/config'
import { mockConfigContextValue } from '../screens/mocks'
import { saveSolverCards } from '../../lib/solverCards'
import type { Config } from '../../lib/types'
import type { BackupEvent } from '../../lib/nostr'
import { readContacts, readRecents, saveContacts } from '@/lib/contacts'

const mocks = vi.hoisted(() => ({
  events: [] as BackupEvent[],
  save: vi.fn(),
}))

vi.mock('@/lib/nostr', () => ({
  NostrStorage: class {
    async load() {
      return mocks.events
    }
    async save(data: string) {
      mocks.save(data)
    }
  },
}))

let localConfig: Config = { ...mockConfigContextValue.config, operatorUrl: 'https://local.server' }

let counter = 0
const makeEvent = (data: unknown, created_at: number, receivedAt: number, id = `event-${counter++}`): BackupEvent => ({
  id,
  kind: 4,
  pubkey: 'pubkey',
  sig: 'sig',
  tags: [],
  content: JSON.stringify(data),
  created_at,
  receivedAt,
})

let restore: (seckey: Uint8Array) => Promise<void>
let fullBackup: (config: Config) => Promise<void>
let initialiseNostrBackup: (seckey: Uint8Array) => void

function Capture() {
  ;({ restore, fullBackup, initialiseNostrBackup } = useContext(BackupContext))
  return null
}

function renderProvider(updateConfig: (c: Config) => void) {
  const configContextValue = { ...mockConfigContextValue, config: localConfig, updateConfig }
  return render(
    <ConfigContext.Provider value={configContextValue as any}>
      <BackupProvider>
        <Capture />
      </BackupProvider>
    </ConfigContext.Provider>,
  )
}

describe('BackupProvider restore', () => {
  beforeEach(() => {
    mocks.events = []
    mocks.save.mockReset()
    localStorage.clear()
    localConfig = { ...mockConfigContextValue.config, operatorUrl: 'https://local.server' }
  })

  afterEach(() => vi.restoreAllMocks())

  it('backs up existing solver cards when enabling Nostr backups before fullBackup', async () => {
    const cards = [
      {
        network: 'regtest',
        label: 'my-card',
        card: {
          version: 0,
          name: 'my-card',
          markets: [
            {
              pair: 'BTC/USDT',
              base_asset: { id: 'btc', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
              quote_asset: { id: 'a'.repeat(68), name: 'Tether', ticker: 'USDT', decimals: 8 },
              price_feed: 'https://example.com/price',
              price_feed_schema: { type: 'json', price_path: '/price' },
              price_decimals: 2,
              fee_bps: 1,
              min_base_amount: '1',
              max_base_amount: '100',
              min_quote_amount: '1',
              max_quote_amount: '100',
            },
          ],
        },
      },
    ] as any
    saveSolverCards(cards)

    const updatedConfig = { ...localConfig, nostrBackup: true }
    renderProvider(() => undefined)
    initialiseNostrBackup(new Uint8Array(32))

    await fullBackup(updatedConfig)

    expect(mocks.save).toHaveBeenCalledTimes(3)
    expect(mocks.save).toHaveBeenNthCalledWith(1, JSON.stringify({ config: updatedConfig }))
    expect(mocks.save).toHaveBeenNthCalledWith(2, JSON.stringify({ contacts: [], contactsSplitVersion: 1 }))
    expect(mocks.save).toHaveBeenNthCalledWith(3, JSON.stringify({ solverCards: cards }))
  })

  it('backs up existing contacts when enabling Nostr backups before fullBackup', async () => {
    const contacts = [
      {
        address: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
        name: 'Alice onchain address',
        sendCount: 0,
        lastSentAt: 0,
      },
    ] as any
    saveContacts(contacts)

    const updatedConfig = { ...localConfig, nostrBackup: true }
    renderProvider(() => undefined)
    initialiseNostrBackup(new Uint8Array(32))

    await fullBackup(updatedConfig)

    expect(mocks.save).toHaveBeenCalledTimes(3)
    expect(mocks.save).toHaveBeenNthCalledWith(1, JSON.stringify({ config: updatedConfig }))
    expect(mocks.save).toHaveBeenNthCalledWith(2, JSON.stringify({ contacts, contactsSplitVersion: 1 }))
    expect(mocks.save).toHaveBeenNthCalledWith(3, JSON.stringify({ solverCards: [] }))
  })

  it('keeps the local server and applies the rest of the restored config', async () => {
    const updateConfig = vi.fn()
    mocks.events = [
      makeEvent({ config: { ...localConfig, operatorUrl: 'https://other.server', showBalance: false } }, 100, 100),
    ]

    renderProvider(updateConfig)
    await restore(new Uint8Array(32))

    await waitFor(() => expect(updateConfig).toHaveBeenCalledTimes(1))
    expect(updateConfig.mock.calls[0][0]).toMatchObject({
      operatorUrl: 'https://local.server',
      showBalance: false,
      executor: true,
    })
  })

  it('re-enables the Executor on restore even if the backup has it off', async () => {
    const updateConfig = vi.fn()
    mocks.events = [makeEvent({ config: { ...localConfig, executor: false } }, 100, 100)]

    renderProvider(updateConfig)
    await restore(new Uint8Array(32))

    await waitFor(() => expect(updateConfig).toHaveBeenCalledTimes(1))
    expect(updateConfig.mock.calls[0][0]).toMatchObject({ executor: true })
  })

  it('keeps the Executor off on restore when the build switches it off', async () => {
    vi.stubEnv('VITE_EXECUTOR_ENABLED', 'false')
    try {
      const updateConfig = vi.fn()
      mocks.events = [makeEvent({ config: { ...localConfig, executor: true } }, 100, 100)]

      renderProvider(updateConfig)
      await restore(new Uint8Array(32))

      await waitFor(() => expect(updateConfig).toHaveBeenCalledTimes(1))
      expect(updateConfig.mock.calls[0][0]).toMatchObject({ executor: false })
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('keeps unnamed contacts from a split backup on a fresh install', async () => {
    const contacts = [{ address: 'alice@pay.example', sendCount: 1, lastSentAt: 50 }]
    mocks.events = [makeEvent({ contacts, contactsSplitVersion: 1 }, 100, 100)]

    renderProvider(() => undefined)
    await restore(new Uint8Array(32))

    expect(readContacts()).toEqual(contacts)
    expect(readRecents()).toEqual([])
  })

  it('migrates unnamed contacts from a legacy backup even when the local split is complete', async () => {
    const unnamed = { address: 'alice@pay.example', sendCount: 1, lastSentAt: 50 }
    const named = { address: 'bob@pay.example', name: 'Bob', sendCount: 0, lastSentAt: 0 }
    readContacts()
    mocks.events = [makeEvent({ contacts: [unnamed, named] }, 100, 100)]

    renderProvider(() => undefined)
    await restore(new Uint8Array(32))

    expect(readContacts()).toEqual([named])
    expect(readRecents()).toEqual([unnamed])
  })

  it('uses the split version belonging to the latest contacts snapshot', async () => {
    const unnamed = { address: 'alice@pay.example', sendCount: 1, lastSentAt: 50 }
    mocks.events = [
      makeEvent({ contacts: [unnamed], contactsSplitVersion: 1 }, 100, 100),
      makeEvent({ contacts: [unnamed] }, 101, 101),
    ]

    renderProvider(() => undefined)
    await restore(new Uint8Array(32))

    expect(readContacts()).toEqual([])
    expect(readRecents()).toEqual([unnamed])
  })

  it('migrates existing legacy contacts before restoring a split backup', async () => {
    const legacy = { address: 'alice@pay.example', sendCount: 1, lastSentAt: 50 }
    const restored = { address: 'bob@pay.example', sendCount: 0, lastSentAt: 0 }
    localStorage.setItem('contacts', JSON.stringify([legacy]))
    mocks.events = [makeEvent({ contacts: [restored], contactsSplitVersion: 1 }, 100, 100)]

    renderProvider(() => undefined)
    await restore(new Uint8Array(32))

    expect(readContacts()).toEqual([restored])
    expect(readRecents()).toEqual([legacy])
  })

  it('leaves local contacts intact when a backup contains no contacts', async () => {
    const legacy = { address: 'alice@pay.example', sendCount: 1, lastSentAt: 50 }
    localStorage.setItem('contacts', JSON.stringify([legacy]))
    mocks.events = [makeEvent({ config: localConfig }, 100, 100)]

    renderProvider(() => undefined)
    await restore(new Uint8Array(32))

    expect(readContacts()).toEqual([])
    expect(readRecents()).toEqual([legacy])
  })

  it('keeps saved contacts when no backup events are found', async () => {
    const contact = { address: 'alice@pay.example', name: 'Alice', sendCount: 0, lastSentAt: 0 }
    saveContacts([contact])

    renderProvider(() => undefined)
    await restore(new Uint8Array(32))

    expect(readContacts()).toEqual([contact])
  })

  it('restores an explicit empty contacts snapshot even when a later event has no contacts', async () => {
    const contact = { address: 'alice@pay.example', name: 'Alice', sendCount: 0, lastSentAt: 0 }
    saveContacts([contact])
    mocks.events = [
      makeEvent({ contacts: [contact] }, 100, 100),
      makeEvent({ contacts: [], contactsSplitVersion: 1 }, 101, 101),
      makeEvent({ config: localConfig }, 102, 102),
    ]

    renderProvider(() => undefined)
    await restore(new Uint8Array(32))

    expect(readContacts()).toEqual([])
  })

  it('reports a failed contact write and still restores solver cards', async () => {
    const contacts = [{ address: 'alice@pay.example', name: 'Alice', sendCount: 0, lastSentAt: 0 }]
    mocks.events = [makeEvent({ contacts, solverCards: [] }, 100, 100)]
    const getItem = Storage.prototype.getItem
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key) {
      if (key === 'contacts') throw new Error('Contact storage unavailable')
      return getItem.call(this, key)
    })
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})

    renderProvider(() => undefined)
    await expect(restore(new Uint8Array(32))).resolves.toBeUndefined()

    expect(log).toHaveBeenCalledWith('failed to restore contacts: Failed to save contacts')
    expect(localStorage.getItem('solverCards')).toBe('[]')
  })

  it('keeps solver-card storage failures non-fatal', async () => {
    const contacts = [{ address: 'alice@pay.example', name: 'Alice', sendCount: 0, lastSentAt: 0 }]
    mocks.events = [makeEvent({ contacts, solverCards: [] }, 100, 100)]
    const setItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === 'solverCards') throw new Error('Solver storage unavailable')
      return setItem.call(this, key, value)
    })
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})

    renderProvider(() => undefined)
    await expect(restore(new Uint8Array(32))).resolves.toBeUndefined()

    expect(log).toHaveBeenCalledWith('failed to restore solver cards: Solver storage unavailable')
    expect(JSON.parse(localStorage.getItem('contacts') ?? 'null')).toEqual(contacts)
  })

  it('ranks an event by its arrival when that precedes its timestamp', async () => {
    const updateConfig = vi.fn()
    const now = Math.floor(Date.now() / 1000)
    mocks.events = [
      makeEvent({ config: { ...localConfig, showBalance: false } }, now + 1_000_000, now - 60),
      makeEvent({ config: { ...localConfig, showBalance: true } }, now - 10, now),
    ]

    renderProvider(updateConfig)
    await restore(new Uint8Array(32))

    await waitFor(() => expect(updateConfig).toHaveBeenCalledTimes(1))
    expect(updateConfig.mock.calls[0][0]).toMatchObject({ showBalance: true })
  })

  it('breaks ties on event id, whatever order the relay delivers them in', async () => {
    const updateConfig = vi.fn()
    const now = Math.floor(Date.now() / 1000)
    mocks.events = [
      makeEvent({ config: { ...localConfig, showBalance: true } }, now, now, 'event-b'),
      makeEvent({ config: { ...localConfig, showBalance: false } }, now, now, 'event-a'),
    ]

    renderProvider(updateConfig)
    await restore(new Uint8Array(32))

    await waitFor(() => expect(updateConfig).toHaveBeenCalledTimes(1))
    expect(updateConfig.mock.calls[0][0]).toMatchObject({ showBalance: true })
  })
})
