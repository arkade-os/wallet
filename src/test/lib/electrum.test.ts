import { afterEach, describe, expect, it, vi } from 'vitest'

const { ElectrumWS } = vi.hoisted(() => ({ ElectrumWS: vi.fn() }))
vi.mock('ws-electrumx-client', () => ({ ElectrumWS }))

import { ELECTRUM_WS_URL, ElectrumOnchainProvider } from '@arkade-os/sdk'
import {
  electrumEndpoints,
  electrumProvider,
  FailoverElectrumSocket,
  whenElectrumConnected,
  type ElectrumSocket,
} from '../../lib/electrum'

const timeout = new Error('ElectrumWS request timeout. request ID: 51851 (blockchain.transaction.get)')

describe('electrumProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens one connection per network, however often the worker re-inits', () => {
    expect(electrumProvider('regtest')).toBe(electrumProvider('regtest'))
    expect(electrumProvider('mutinynet')).not.toBe(electrumProvider('regtest'))
    const urls = ElectrumWS.mock.calls.map((call) => call[0])
    expect(urls.filter((url) => url === ELECTRUM_WS_URL.regtest)).toHaveLength(1)
    expect(urls.filter((url) => url === ELECTRUM_WS_URL.mutinynet)).toHaveLength(1)
  })

  it('returns no history when a transaction fetch times out', async () => {
    const provider = electrumProvider('bitcoin')
    vi.spyOn(ElectrumOnchainProvider.prototype, 'getTransactions').mockRejectedValueOnce(timeout)
    vi.spyOn(ElectrumOnchainProvider.prototype, 'getTxOutspends').mockRejectedValueOnce(timeout)

    await expect(provider.getTransactions('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh')).resolves.toEqual([])
    await expect(provider.getTxOutspends('aa'.repeat(32))).resolves.toEqual([])
  })

  it('still throws from getCoins, so a failed read cannot wipe stored outputs', () => {
    const provider = electrumProvider('bitcoin')
    expect(provider.getCoins).toBe(ElectrumOnchainProvider.prototype.getCoins)
    expect(provider.getTransactions).not.toBe(ElectrumOnchainProvider.prototype.getTransactions)
  })
})

const CLOSED = 3

function fakeSocket(
  readyState: number,
): ElectrumSocket & { emit: (event: string) => void; connect: ReturnType<typeof vi.fn> } {
  const listeners = new Map<string, ((() => void) | null)[]>()
  const client = {
    connect: vi.fn(() => {
      client.ws = { readyState: 0 }
    }),
    ws: { readyState },
    isConnected: () => false,
    on: (event: string, callback: () => void) => {
      const list = listeners.get(event) ?? []
      list.push(callback)
      listeners.set(event, list)
      return list.length - 1
    },
    off: (event: string, id: number) => {
      const list = listeners.get(event)
      if (list) list[id] = null
    },
    emit: (event: string) => {
      for (const callback of listeners.get(event) ?? []) callback?.()
    },
  }
  return client
}

describe('whenElectrumConnected', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens a new socket when the handshake already failed, and resolves once it connects', async () => {
    const client = fakeSocket(CLOSED)
    const pending = whenElectrumConnected(client, 8_000)
    expect(client.connect).toHaveBeenCalledOnce()
    client.isConnected = () => true
    client.emit('connected')
    await expect(pending).resolves.toBeUndefined()
  })

  it('does not open a second socket while the first attempt is still connecting', async () => {
    const client = fakeSocket(0)
    const first = whenElectrumConnected(client, 8_000)
    const second = whenElectrumConnected(client, 8_000)
    expect(second).toBe(first)
    expect(client.connect).not.toHaveBeenCalled()
    client.isConnected = () => true
    client.emit('connected')
    await expect(first).resolves.toBeUndefined()
  })

  it('rejects a failed handshake immediately, so the next host can be tried', async () => {
    const client = fakeSocket(CLOSED)
    const pending = whenElectrumConnected(client, 8_000).then(
      () => 'open',
      (err: Error) => err.message,
    )
    expect(client.connect).toHaveBeenCalledOnce()
    client.emit('close')
    await expect(pending).resolves.toBe('ElectrumWS connection failed')
  })

  it('rejects a socket that never opens, so INIT_WALLET can finish', async () => {
    vi.useFakeTimers()
    const client = fakeSocket(CLOSED)
    const pending = whenElectrumConnected(client, 8_000).then(
      () => 'open',
      () => 'timeout',
    )
    await vi.advanceTimersByTimeAsync(8_000)
    await expect(pending).resolves.toBe('timeout')
  })

  it('tries again after a timeout, instead of waiting on the dead socket', async () => {
    vi.useFakeTimers()
    const client = fakeSocket(CLOSED)
    const first = whenElectrumConnected(client, 8_000).then(
      () => 'open',
      () => 'timeout',
    )
    await vi.advanceTimersByTimeAsync(8_000)
    await expect(first).resolves.toBe('timeout')

    client.ws = { readyState: CLOSED }
    const second = whenElectrumConnected(client, 8_000)
    expect(client.connect).toHaveBeenCalledTimes(2)
    client.isConnected = () => true
    client.emit('connected')
    await expect(second).resolves.toBeUndefined()
  })
})

describe('electrum fallback', () => {
  it('tries Blockstream mainnet sockets after electrum.arkade.sh, api path first', () => {
    expect(electrumEndpoints('bitcoin')).toEqual([
      ELECTRUM_WS_URL.bitcoin,
      'wss://blockstream.info/electrum-websocket/api',
      'wss://blockstream.info/electrum-websocket',
    ])
    expect(electrumEndpoints('regtest')).toEqual([ELECTRUM_WS_URL.regtest])
  })

  it('uses the next socket when the current host fails, and stays there', async () => {
    const primary = { request: vi.fn(async () => Promise.reject(new Error('ElectrumWS connection failed'))) }
    const fallback = { request: vi.fn(async () => 'pong') }
    const opened: string[] = []
    const socket = new FailoverElectrumSocket(
      ['wss://electrum.arkade.sh', 'wss://blockstream.info/electrum-websocket/api'],
      (url) => {
        opened.push(url)
        return (url.includes('blockstream') ? fallback : primary) as never
      },
    )

    await expect(socket.request('server.ping')).resolves.toBe('pong')
    await expect(socket.request('server.ping')).resolves.toBe('pong')

    expect(opened).toEqual(['wss://electrum.arkade.sh', 'wss://blockstream.info/electrum-websocket/api'])
    expect(primary.request).toHaveBeenCalledOnce()
    expect(fallback.request).toHaveBeenCalledTimes(2)
  })
})
