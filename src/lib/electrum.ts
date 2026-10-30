import { ELECTRUM_WS_URL, ElectrumOnchainProvider, getNetwork, type NetworkName } from '@arkade-os/sdk'
import { ElectrumWS } from 'ws-electrumx-client'

const providers = new Map<NetworkName, ElectrumOnchainProvider>()

/** Blockstream's mainnet Electrum websocket. `server.version` answered here. */
const BLOCKSTREAM_ELECTRUM_URL = 'wss://blockstream.info/electrum-websocket/api'
const CONNECT_WAIT_MS = 4_000
const CLOSING = 2
const CLOSED = 3

export class ElectrumOfflineError extends Error {
  constructor() {
    super('Electrum is offline')
    this.name = 'ElectrumOfflineError'
  }
}

const errorText = (err: unknown): string =>
  err instanceof Error
    ? err.message
    : err && typeof err === 'object' && 'message' in err
      ? String(err.message)
      : String(err ?? '')

export const isElectrumOffline = (err: unknown): boolean => {
  const message = errorText(err)
  // A broadcast timeout is not "offline": the transaction may already be in
  // the mempool. A service-worker timeout is not Electrum either.
  if (message.includes('blockchain.transaction.broadcast')) return false
  return (
    message.includes('Electrum is offline') ||
    message.includes('ElectrumWS connection failed') ||
    message.includes('ElectrumWS request timeout')
  )
}

const isTransportFailure = (err: unknown): boolean => {
  const message = errorText(err)
  return message.includes('ElectrumWS request timeout') || message.includes('ElectrumWS connection failed')
}

/** A broadcast may already be in the mempool when the reply times out. Never send it again. */
const isBroadcast = (method: string): boolean =>
  method === 'blockchain.transaction.broadcast' || method === 'blockchain.transaction.broadcast_package'

const REQUEST_WAIT_MS = 10_000

/**
 * `ws-electrumx-client` does `Object.assign(DEFAULT_OPTIONS, options)`, so every
 * instance shares one options object and `close()` sets `reconnect = false` for
 * all of them. A private copy makes `close()` local, which is what lets a failed
 * probe be closed without killing the socket we keep.
 */
const openSocket = (url: string): ElectrumCaller & Connectable => {
  const ws = new ElectrumWS(url)
  // Private on the type, present at runtime, and shared across instances until replaced.
  ;(ws as unknown as { options: { reconnect: boolean; verbose: boolean } }).options = {
    reconnect: true,
    verbose: false,
  }
  return ws as unknown as ElectrumCaller & Connectable
}

const abandon = (ws: ElectrumCaller): void => {
  const closable = ws as ElectrumCaller & { close?: (reason: string) => Promise<unknown> }
  if (typeof closable.close !== 'function') return
  void closable.close('electrum host unreachable').catch(() => undefined)
}

/** The library waits forever for `connected` with no deadline. This one does not. */
const withDeadline = (ws: ElectrumCaller, method: string, params: never[]): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`ElectrumWS request timeout. request ID: 0 (${method})`)),
      REQUEST_WAIT_MS,
    )
    ws.request(method, ...params).then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err: unknown) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })

/** Arkade's own server first. Bitcoin falls back to Blockstream. */
export const electrumEndpoints = (network: NetworkName): readonly string[] => {
  const primary = ELECTRUM_WS_URL[network]
  if (network !== 'bitcoin' || primary === BLOCKSTREAM_ELECTRUM_URL) return [primary]
  return [primary, BLOCKSTREAM_ELECTRUM_URL]
}

type Connectable = {
  isConnected: () => boolean
  on: (event: string, callback: () => void) => number
  off: (event: string, id: number) => void
  ws?: { readyState: number }
}

/** Resolves once the socket the constructor opened is up. Rejects if it dies or never opens. */
const whenConnected = (client: Connectable, waitMs = CONNECT_WAIT_MS): Promise<void> => {
  if (client.isConnected()) return Promise.resolve()
  const readyState = client.ws?.readyState
  if (readyState === CLOSING || readyState === CLOSED) return Promise.reject(new Error('ElectrumWS connection failed'))
  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      client.off('connected', connectedId)
      client.off('close', closedId)
      if (ok) resolve()
      else reject(new Error('ElectrumWS connection failed'))
    }
    const connectedId = client.on('connected', () => finish(true))
    const closedId = client.on('close', () => finish(false))
    const timer = setTimeout(() => finish(false), waitMs)
    if (client.ws?.readyState === CLOSED) finish(false)
  })
}

type ElectrumCaller = {
  request: (method: string, ...params: unknown[]) => Promise<unknown>
  subscribe: (
    method: string,
    callback: (...payload: unknown[]) => unknown,
    ...params: (string | number)[]
  ) => Promise<unknown>
  unsubscribe: (method: string, ...params: (string | number)[]) => Promise<unknown>
}

/**
 * Opens Arkade, then Blockstream, and keeps the first socket that connects.
 * A later read timeout moves to the next host once. A broadcast timeout does not.
 */
export class ProbedElectrumSocket {
  private pending: Promise<ElectrumCaller> | undefined
  private active: ElectrumCaller | undefined
  private activeIndex = 0
  private moving: Promise<void> | undefined
  /** Set when the last host fails, so every in-flight read gets the same error. */
  private offline = false

  constructor(
    private readonly urls: readonly string[],
    private readonly open: (url: string) => ElectrumCaller & Connectable,
  ) {}

  private socket(): Promise<ElectrumCaller> {
    if (this.offline) this.offline = false
    if (!this.pending) {
      this.pending = this.connect().catch((err: unknown) => {
        this.pending = undefined
        throw err
      })
    }
    return this.pending
  }

  private async connect(): Promise<ElectrumCaller> {
    for (let i = this.activeIndex; i < this.urls.length; i++) {
      const ws = this.open(this.urls[i])
      try {
        await whenConnected(ws)
        this.active = ws
        this.activeIndex = i
        return ws
      } catch {
        abandon(ws)
      }
    }
    this.activeIndex = 0
    throw new ElectrumOfflineError()
  }

  /** One move for a burst of timed-out reads, so they share the next host. */
  private leave(failed: ElectrumCaller): Promise<void> {
    if (this.offline) return Promise.reject(new ElectrumOfflineError())
    if (this.active !== failed) return this.moving ?? Promise.reject(new ElectrumOfflineError())
    if (this.activeIndex >= this.urls.length - 1) {
      this.offline = true
      this.activeIndex = 0
      this.pending = undefined
      this.active = undefined
      return Promise.reject(new ElectrumOfflineError())
    }
    this.activeIndex += 1
    this.pending = undefined
    this.active = undefined
    this.moving = this.socket()
      .then(() => undefined)
      .finally(() => {
        this.moving = undefined
      })
    return this.moving
  }

  private async call<T>(method: string, params: never[], canFailover: boolean): Promise<T> {
    const ws = await this.socket()
    try {
      return (await withDeadline(ws, method, params)) as T
    } catch (err) {
      if (!canFailover || isBroadcast(method) || !isTransportFailure(err)) throw err
      await this.leave(ws)
      return this.call(method, params, false)
    }
  }

  request<T>(method: string, ...params: never[]): Promise<T> {
    return this.call(method, params, true)
  }

  subscribe(
    method: string,
    callback: (...payload: unknown[]) => unknown,
    ...params: (string | number)[]
  ): Promise<void> {
    return this.socket()
      .then((ws) => ws.subscribe(method, callback, ...params))
      .then(() => undefined)
  }

  unsubscribe(method: string, ...params: (string | number)[]): Promise<unknown> {
    if (!this.pending) return Promise.resolve()
    return this.pending.then((ws) => ws.unsubscribe(method, ...params))
  }

  /** Never closes. Closing one client flips reconnect off for every other one. */
  close(): Promise<boolean> {
    return Promise.resolve(true)
  }
}

// One provider per network. The socket behind it is chosen by the probe.
// ElectrumOnchainProvider only uses request, subscribe, unsubscribe, and close
// on the socket (SDK 0.5.0). The cast breaks if a later SDK reads anything else.
export const electrumProvider = (network: NetworkName): ElectrumOnchainProvider => {
  let provider = providers.get(network)
  if (!provider) {
    const socket = new ProbedElectrumSocket(electrumEndpoints(network), openSocket)
    provider = new ElectrumOnchainProvider(socket as unknown as ElectrumWS, getNetwork(network))
    providers.set(network, provider)
  }
  return provider
}
