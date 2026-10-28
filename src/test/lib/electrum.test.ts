import { describe, expect, it, vi } from 'vitest'

const { ElectrumWS } = vi.hoisted(() => ({ ElectrumWS: vi.fn() }))
vi.mock('ws-electrumx-client', () => ({ ElectrumWS }))

import { ELECTRUM_WS_URL } from '@arkade-os/sdk'
import { electrumProvider } from '../../lib/electrum'

describe('electrumProvider', () => {
  it('opens one connection per network, however often the worker re-inits', () => {
    expect(electrumProvider('regtest')).toBe(electrumProvider('regtest'))
    expect(electrumProvider('mutinynet')).not.toBe(electrumProvider('regtest'))
    expect(ElectrumWS.mock.calls).toEqual([[ELECTRUM_WS_URL.regtest], [ELECTRUM_WS_URL.mutinynet]])
  })
})
