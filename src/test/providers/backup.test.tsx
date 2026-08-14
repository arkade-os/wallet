import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { useContext } from 'react'
import { BackupContext, BackupProvider } from '../../providers/backup'
import { ConfigContext } from '../../providers/config'
import { mockConfigContextValue } from '../screens/mocks'
import { saveSolverCardsToStorage } from '../../lib/storage'
import type { Config } from '../../lib/types'
import type { BackupEvent } from '../../lib/nostr'

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

let localConfig: Config = { ...mockConfigContextValue.config, aspUrl: 'https://local.server' }

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
    localConfig = { ...mockConfigContextValue.config, aspUrl: 'https://local.server' }
  })

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
    saveSolverCardsToStorage(cards)

    const updatedConfig = { ...localConfig, nostrBackup: true }
    renderProvider(() => undefined)
    initialiseNostrBackup(new Uint8Array(32))

    await fullBackup(updatedConfig)

    expect(mocks.save).toHaveBeenCalledTimes(2)
    expect(mocks.save).toHaveBeenNthCalledWith(1, JSON.stringify({ config: updatedConfig }))
    expect(mocks.save).toHaveBeenNthCalledWith(2, JSON.stringify({ solverCards: cards }))
  })

  it('keeps the local server and applies the rest of the restored config', async () => {
    const updateConfig = vi.fn()
    mocks.events = [
      makeEvent({ config: { ...localConfig, aspUrl: 'https://other.server', showBalance: false } }, 100, 100),
    ]

    renderProvider(updateConfig)
    await restore(new Uint8Array(32))

    await waitFor(() => expect(updateConfig).toHaveBeenCalledTimes(1))
    expect(updateConfig.mock.calls[0][0]).toMatchObject({
      aspUrl: 'https://local.server',
      showBalance: false,
      delegate: true,
    })
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
