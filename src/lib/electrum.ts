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

export const isElectrumOffline = (err: unknown): boolean => {
  const message =
    err instanceof Error
      ? err.message
      : err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : String(err ?? '')
  return message.includes('Electrum is offline')
}

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
 * A request that fails after that stays on that socket: retrying it on the
 * other host would send a broadcast twice.
 */
export class ProbedElectrumSocket {
  private pending: Promise<ElectrumCaller> | undefined

  constructor(
    private readonly urls: readonly string[],
    private readonly open: (url: string) => ElectrumCaller & Connectable,
  ) {}

  private socket(): Promise<ElectrumCaller> {
    if (!this.pending) {
      this.pending = this.connect().catch((err: unknown) => {
        this.pending = undefined
        throw err
      })
    }
    return this.pending
  }

  private async connect(): Promise<ElectrumCaller> {
    for (const url of this.urls) {
      const ws = this.open(url)
      try {
        await whenConnected(ws)
        return ws
      } catch {
        // This host never connected. The next URL is the fallback.
      }
    }
    throw new ElectrumOfflineError()
  }

  request<T>(method: string, ...params: never[]): Promise<T> {
    return this.socket().then((ws) => ws.request(method, ...params) as Promise<T>)
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
export const electrumProvider = (network: NetworkName): ElectrumOnchainProvider => {
  let provider = providers.get(network)
  if (!provider) {
    const socket = new ProbedElectrumSocket(
      electrumEndpoints(network),
      (url) => new ElectrumWS(url) as ElectrumCaller & Connectable,
    )
    provider = new ElectrumOnchainProvider(socket as unknown as ElectrumWS, getNetwork(network))
    providers.set(network, provider)
  }
  return provider
}
