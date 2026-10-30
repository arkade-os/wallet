import { describe, expect, it, vi } from 'vitest'

const { ElectrumWS } = vi.hoisted(() => ({ ElectrumWS: vi.fn() }))
vi.mock('ws-electrumx-client', () => ({ ElectrumWS }))

import { ELECTRUM_WS_URL } from '@arkade-os/sdk'
import { ElectrumOfflineError, electrumEndpoints, firstLiveElectrum, ProbedElectrumSocket } from '../../lib/electrum'

const BLOCKSTREAM = 'wss://blockstream.info/electrum-websocket/api'

describe('electrum endpoints', () => {
  it('probes Arkade first and falls back to Blockstream on bitcoin', () => {
    expect(electrumEndpoints('bitcoin')).toEqual([ELECTRUM_WS_URL.bitcoin, BLOCKSTREAM])
  })

  it('leaves other networks on their own server', () => {
    expect(electrumEndpoints('regtest')).toEqual([ELECTRUM_WS_URL.regtest])
    expect(electrumEndpoints('signet')).toEqual([ELECTRUM_WS_URL.signet])
  })
})

describe('firstLiveElectrum', () => {
  it('uses the first server that answers', async () => {
    const probe = vi.fn(async (url: string) => url === BLOCKSTREAM)
    await expect(firstLiveElectrum([ELECTRUM_WS_URL.bitcoin, BLOCKSTREAM], probe)).resolves.toBe(BLOCKSTREAM)
    expect(probe).toHaveBeenCalledTimes(2)
  })

  it('reports Electrum offline when every server is down', async () => {
    const probe = vi.fn(async () => false)
    await expect(firstLiveElectrum([ELECTRUM_WS_URL.bitcoin, BLOCKSTREAM], probe)).rejects.toBeInstanceOf(
      ElectrumOfflineError,
    )
  })
})

describe('ProbedElectrumSocket', () => {
  it('opens only the server that answered, and keeps using it', async () => {
    const open = vi.fn((url: string) => ({
      request: vi.fn(async () => url),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    }))
    const socket = new ProbedElectrumSocket(
      [ELECTRUM_WS_URL.bitcoin, BLOCKSTREAM],
      open,
      async (url) => url === BLOCKSTREAM,
    )

    await expect(socket.request('server.ping')).resolves.toBe(BLOCKSTREAM)
    await expect(socket.request('server.ping')).resolves.toBe(BLOCKSTREAM)
    expect(open).toHaveBeenCalledOnce()
    expect(open).toHaveBeenCalledWith(BLOCKSTREAM)
  })

  it('tries again after both servers were offline', async () => {
    const probe = vi.fn<() => Promise<boolean>>().mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    const open = vi.fn(() => ({ request: vi.fn(async () => 'ok'), subscribe: vi.fn(), unsubscribe: vi.fn() }))
    const socket = new ProbedElectrumSocket([ELECTRUM_WS_URL.bitcoin], open, probe)

    await expect(socket.request('server.ping')).rejects.toThrow('Electrum is offline')
    await expect(socket.request('server.ping')).resolves.toBe('ok')
    expect(open).toHaveBeenCalledOnce()
  })
})
