import { describe, expect, it, vi } from 'vitest'

vi.mock('ws-electrumx-client', () => ({ ElectrumWS: vi.fn() }))

import { ELECTRUM_WS_URL } from '@arkade-os/sdk'
import {
  ElectrumOfflineError,
  electrumEndpoints,
  electrumProvider,
  isElectrumOffline,
  ProbedElectrumSocket,
} from '../../lib/electrum'

const BLOCKSTREAM = 'wss://blockstream.info/electrum-websocket/api'
const CLOSED = 3

type FakeSocket = {
  request: ReturnType<typeof vi.fn>
  subscribe: ReturnType<typeof vi.fn>
  unsubscribe: ReturnType<typeof vi.fn>
  isConnected: () => boolean
  on: (event: string, callback: () => void) => number
  off: (event: string, id: number) => void
  ws: { readyState: number }
  emit: (event: string) => void
  url: string
  close?: ReturnType<typeof vi.fn>
}

function fakeSocket(url: string, readyState = 0): FakeSocket {
  const listeners = new Map<string, ((() => void) | null)[]>()
  return {
    url,
    request: vi.fn(async () => url),
    subscribe: vi.fn(async () => undefined),
    unsubscribe: vi.fn(async () => undefined),
    isConnected: () => false,
    ws: { readyState },
    on: (event, callback) => {
      const list = listeners.get(event) ?? []
      list.push(callback)
      listeners.set(event, list)
      return list.length - 1
    },
    off: (event, id) => {
      const list = listeners.get(event)
      if (list) list[id] = null
    },
    emit: (event) => {
      for (const callback of listeners.get(event) ?? []) callback?.()
    },
  }
}

describe('electrum endpoints', () => {
  it('probes Arkade first and falls back to Blockstream on bitcoin', () => {
    expect(electrumEndpoints('bitcoin')).toEqual([ELECTRUM_WS_URL.bitcoin, BLOCKSTREAM])
  })

  it('leaves other networks on their own server', () => {
    expect(electrumEndpoints('regtest')).toEqual([ELECTRUM_WS_URL.regtest])
  })

  it('reuses one provider per network', () => {
    expect(electrumProvider('regtest')).toBe(electrumProvider('regtest'))
    expect(electrumProvider('signet')).not.toBe(electrumProvider('regtest'))
  })
})

const probed = (urls: readonly string[], open: (url: string) => FakeSocket) =>
  new ProbedElectrumSocket(urls, open as never)

describe('ProbedElectrumSocket', () => {
  it('uses Blockstream when Arkade never connects, and stays there', async () => {
    const opened: FakeSocket[] = []
    const socket = probed([ELECTRUM_WS_URL.bitcoin, BLOCKSTREAM], (url) => {
      const client = fakeSocket(url, url === ELECTRUM_WS_URL.bitcoin ? CLOSED : 0)
      client.close = vi.fn(async () => true)
      opened.push(client)
      if (url === BLOCKSTREAM) queueMicrotask(() => client.emit('connected'))
      return client
    })

    await expect(socket.request('server.ping')).resolves.toBe(BLOCKSTREAM)
    await expect(socket.request('blockchain.transaction.broadcast', 'deadbeef' as never)).resolves.toBe(BLOCKSTREAM)
    expect(opened.map((client) => client.url)).toEqual([ELECTRUM_WS_URL.bitcoin, BLOCKSTREAM])
    expect(opened[0].close).toHaveBeenCalledOnce()
    expect(opened[1].close).not.toHaveBeenCalled()
    expect(opened[1].request).toHaveBeenCalledTimes(2)
  })

  it('retries a timed-out history read on Blockstream', async () => {
    const opened: FakeSocket[] = []
    const socket = probed([ELECTRUM_WS_URL.bitcoin, BLOCKSTREAM], (url) => {
      const client = fakeSocket(url)
      opened.push(client)
      if (url === ELECTRUM_WS_URL.bitcoin) {
        client.request.mockRejectedValue(
          new Error('ElectrumWS request timeout. request ID: 51851 (blockchain.transaction.get)'),
        )
      }
      queueMicrotask(() => client.emit('connected'))
      return client
    })

    await expect(socket.request('blockchain.transaction.get', 'aa' as never)).resolves.toBe(BLOCKSTREAM)
    expect(opened.map((client) => client.url)).toEqual([ELECTRUM_WS_URL.bitcoin, BLOCKSTREAM])
  })

  it('does not send a failed broadcast to Blockstream', async () => {
    const opened: FakeSocket[] = []
    const socket = probed([ELECTRUM_WS_URL.bitcoin, BLOCKSTREAM], (url) => {
      const client = fakeSocket(url)
      client.request.mockRejectedValue(
        new Error('ElectrumWS request timeout. request ID: 1 (blockchain.transaction.broadcast)'),
      )
      opened.push(client)
      queueMicrotask(() => client.emit('connected'))
      return client
    })

    await expect(socket.request('blockchain.transaction.broadcast', 'deadbeef' as never)).rejects.toThrow(
      'request timeout',
    )
    expect(opened).toHaveLength(1)
    expect(opened[0].url).toBe(ELECTRUM_WS_URL.bitcoin)
  })

  it('unsubscribes on the socket that connected', async () => {
    let blockstream: FakeSocket | undefined
    const socket = probed([ELECTRUM_WS_URL.bitcoin, BLOCKSTREAM], (url) => {
      const client = fakeSocket(url, url === ELECTRUM_WS_URL.bitcoin ? CLOSED : 0)
      if (url === BLOCKSTREAM) {
        blockstream = client
        queueMicrotask(() => client.emit('connected'))
      }
      return client
    })

    await socket.subscribe('blockchain.scripthash', () => undefined, 'abc')
    await socket.unsubscribe('blockchain.scripthash', 'abc')
    expect(blockstream?.unsubscribe).toHaveBeenCalledWith('blockchain.scripthash', 'abc')
  })

  it('says Electrum is offline when both servers are down, and tries again later', async () => {
    let attempt = 0
    const socket = probed([ELECTRUM_WS_URL.bitcoin, BLOCKSTREAM], (url) => {
      attempt += 1
      const down = attempt < 3
      const client = fakeSocket(url, down ? CLOSED : 0)
      if (!down) queueMicrotask(() => client.emit('connected'))
      return client
    })

    await expect(socket.request('server.ping')).rejects.toBeInstanceOf(ElectrumOfflineError)
    await expect(socket.request('server.ping')).resolves.toBe(ELECTRUM_WS_URL.bitcoin)
  })
})

describe('isElectrumOffline', () => {
  it('matches the offline error after the worker wraps it', () => {
    expect(isElectrumOffline(new ElectrumOfflineError())).toBe(true)
    expect(isElectrumOffline(new Error('INIT_WALLET failed: Electrum is offline'))).toBe(true)
    expect(isElectrumOffline(new Error('ElectrumWS request timeout. request ID: 1 (blockchain.transaction.get)'))).toBe(
      true,
    )
    expect(isElectrumOffline(new Error('Service worker message timed out (INIT_WALLET)'))).toBe(false)
    expect(
      isElectrumOffline(new Error('ElectrumWS request timeout. request ID: 1 (blockchain.transaction.broadcast)')),
    ).toBe(false)
    expect(isElectrumOffline(new Error('Invalid password'))).toBe(false)
  })
})
