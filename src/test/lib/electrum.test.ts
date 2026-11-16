import { afterEach, describe, expect, it, vi } from 'vitest'
import { ELECTRUM_WS_URL } from '@arkade-os/sdk'

const { connect } = vi.hoisted(() => ({ connect: vi.fn() }))
vi.mock('ws-electrumx-client', () => ({
  ElectrumWS: class {
    constructor(endpoint: string) {
      connect(endpoint)
    }
  },
}))
describe('isolated regtest Electrum connection', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
    connect.mockClear()
  })

  it('opens one connection per network, however often the worker re-inits', async () => {
    vi.stubEnv('VITE_ELECTRUM_URL', '')
    const { electrumProvider } = await import('../../lib/electrum')
    expect(electrumProvider('regtest')).toBe(electrumProvider('regtest'))
    expect(electrumProvider('mutinynet')).not.toBe(electrumProvider('regtest'))
    expect(connect.mock.calls).toEqual([[ELECTRUM_WS_URL.regtest], [ELECTRUM_WS_URL.mutinynet]])
  })

  it('uses the selected local stack port for both wallet and Taxi chain reads', async () => {
    vi.stubEnv('VITE_ELECTRUM_URL', 'ws://127.0.0.1:55003')
    const { electrumProvider } = await import('../../lib/electrum')
    expect(electrumProvider('regtest')).toBe(electrumProvider('regtest'))
    expect(connect).toHaveBeenCalledExactlyOnceWith('ws://127.0.0.1:55003')
  })

  it('retains the SDK default when no local override is configured', async () => {
    vi.stubEnv('VITE_ELECTRUM_URL', '')
    const { electrumProvider } = await import('../../lib/electrum')
    electrumProvider('regtest')
    expect(connect).toHaveBeenCalledExactlyOnceWith('ws://localhost:50003')
  })

  it('never redirects mainnet reads to the local test override', async () => {
    vi.stubEnv('VITE_ELECTRUM_URL', 'ws://127.0.0.1:55003')
    const { electrumProvider } = await import('../../lib/electrum')
    electrumProvider('bitcoin')
    expect(connect).toHaveBeenCalledExactlyOnceWith('wss://electrum.arkade.sh')
  })
})
