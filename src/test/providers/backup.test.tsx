import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { useContext } from 'react'
import { BackupContext, BackupProvider } from '../../providers/backup'
import { ConfigContext } from '../../providers/config'
import { mockConfigContextValue } from '../screens/mocks'
import type { Config } from '../../lib/types'

const mocks = vi.hoisted(() => ({
  events: [] as any[],
  saveSwap: vi.fn(),
}))

vi.mock('@/lib/nostr', () => ({
  NostrStorage: class {
    async load() {
      return mocks.events
    }
    async save() {}
  },
}))

vi.mock('@arkade-os/boltz-swap', () => ({
  IndexedDbSwapRepository: class {
    saveSwap = mocks.saveSwap
  },
}))

const localConfig: Config = { ...mockConfigContextValue.config, aspUrl: 'https://local.server' }

let counter = 0
const makeEvent = (data: unknown, created_at: number, receivedAt: number) => ({
  id: `event-${counter++}`,
  kind: 4,
  pubkey: 'pubkey',
  sig: 'sig',
  tags: [],
  content: JSON.stringify(data),
  created_at,
  receivedAt,
})

let restore: (seckey: Uint8Array) => Promise<void>

function Capture() {
  restore = useContext(BackupContext).restore
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
    mocks.saveSwap.mockClear()
    localStorage.clear()
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
      makeEvent(
        { config: { ...localConfig, showBalance: false }, reverseSwaps: [{ id: 'swap-a' }] },
        now + 1_000_000,
        now - 60,
      ),
      makeEvent({ config: { ...localConfig, showBalance: true } }, now - 10, now),
    ]

    renderProvider(updateConfig)
    await restore(new Uint8Array(32))

    await waitFor(() => expect(updateConfig).toHaveBeenCalledTimes(1))
    expect(updateConfig.mock.calls[0][0]).toMatchObject({ showBalance: true })
    // the event is ranked lower, not dropped
    expect(mocks.saveSwap).toHaveBeenCalledWith({ id: 'swap-a' })
  })
})
