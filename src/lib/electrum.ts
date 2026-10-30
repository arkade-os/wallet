import { ELECTRUM_WS_URL, ElectrumOnchainProvider, getNetwork, type NetworkName } from '@arkade-os/sdk'
import { ElectrumWS } from 'ws-electrumx-client'
import { consoleError } from './logs'

const providers = new Map<NetworkName, ElectrumOnchainProvider>()

/** Long enough for a couple of reconnects, short of INIT_WALLET's 30s deadline. */
const CONNECT_WAIT_MS = 8_000
const CONNECTING = 0
const OPEN = 1

/**
 * The subset of ElectrumWS setup actually calls. `connect` is private on the
 * type and present at runtime: a handshake that fails (the 502 from
 * `wss://electrum.arkade.sh`) never schedules one, and `request` then waits
 * forever for a "connected" event that will not come.
 */
export type ElectrumSocket = {
  isConnected: () => boolean
  connect: () => void
  on: (event: string, callback: () => void) => number
  off: (event: string, id: number) => void
  ws?: { readyState: number }
}

/** Blockstream's mainnet Electrum websocket. `/api` answered `server.version`; the bare path did not. */
const BITCOIN_ELECTRUM_FALLBACKS = [
  'wss://blockstream.info/electrum-websocket/api',
  'wss://blockstream.info/electrum-websocket',
]

export const electrumEndpoints = (network: NetworkName): readonly string[] => {
  const primary = ELECTRUM_WS_URL[network]
  if (network !== 'bitcoin') return [primary]
  return [primary, ...BITCOIN_ELECTRUM_FALLBACKS.filter((url) => url !== primary)]
}

const pendingConnections = new WeakMap<ElectrumSocket, Promise<void>>()

const revive = (client: ElectrumSocket) => {
  const readyState = client.ws?.readyState
  if (readyState === CONNECTING || readyState === OPEN) return
  client.connect()
}

/**
 * Resolves when the socket is up. Rejects if it is not, so a dead host fails
 * the call instead of holding `INIT_WALLET` until "Service worker message
 * timed out". Callers that already catch an Electrum error (the boarding
 * watcher, history reads) then continue, and the next attempt opens a new socket.
 */
export const whenElectrumConnected = (client: ElectrumSocket, waitMs = CONNECT_WAIT_MS): Promise<void> => {
  if (client.isConnected()) return Promise.resolve()
  const existing = pendingConnections.get(client)
  if (existing) return existing
  revive(client)
  if (client.isConnected()) return Promise.resolve()

  let settled = false
  const wait = new Promise<void>((resolve, reject) => {
    let connectedId = -1
    let closedId = -1
    const finish = (result: 'open' | 'closed' | 'timeout') => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (connectedId >= 0) client.off('connected', connectedId)
      if (closedId >= 0) client.off('close', closedId)
      pendingConnections.delete(client)
      if (result === 'open') resolve()
      else reject(new Error(result === 'closed' ? 'ElectrumWS connection failed' : 'ElectrumWS connect timeout'))
    }
    // A 502 closes the handshake before `connected`. Waiting out the timer
    // would burn the INIT_WALLET deadline before the next host is tried.
    connectedId = client.on('connected', () => finish('open'))
    closedId = client.on('close', () => finish('closed'))
    const timer = setTimeout(() => finish('timeout'), waitMs)
  })
  pendingConnections.set(client, wait)
  return wait
}

const arm = (client: ElectrumWS): ElectrumWS => {
  if (
    typeof client.request !== 'function' ||
    typeof client.on !== 'function' ||
    typeof client.isConnected !== 'function'
  ) {
    return client
  }
  // `connect` is private on the type and present at runtime. Intersecting the
  // class with a public `connect` collapses to `never`.
  const socket = client as unknown as ElectrumSocket
  const request = client.request.bind(client)
  const subscribe = client.subscribe?.bind(client)
  client.request = ((method: string, ...params: never[]) =>
    whenElectrumConnected(socket).then(() => {
      if (!client.isConnected()) throw new Error('ElectrumWS connect timeout')
      return request(method, ...params)
    })) as typeof client.request
  if (subscribe) {
    client.subscribe = ((
      method: string,
      callback: (...payload: unknown[]) => unknown,
      ...params: (string | number)[]
    ) =>
      whenElectrumConnected(socket).then(() => {
        if (!client.isConnected()) throw new Error('ElectrumWS connect timeout')
        return subscribe(method, callback, ...params)
      })) as typeof client.subscribe
  }
  return client
}

type ElectrumCaller = Pick<ElectrumWS, 'request' | 'subscribe' | 'unsubscribe'>

/**
 * One Electrum connection that walks `endpoints` when the current host fails.
 * The SDK holds this object for the life of the provider, so the fallback has
 * to live inside `request` rather than behind a new provider.
 */
export class FailoverElectrumSocket {
  private readonly sockets: ElectrumCaller[] = []
  private cursor = 0

  constructor(
    private readonly endpoints: readonly string[],
    private readonly open: (url: string) => ElectrumCaller,
  ) {
    if (endpoints.length === 0) throw new Error('no electrum endpoint')
    this.sockets[0] = open(endpoints[0])
  }

  private socket(index: number): ElectrumCaller {
    return (this.sockets[index] ??= this.open(this.endpoints[index]))
  }

  private async attempt<T>(run: (ws: ElectrumCaller) => Promise<T>): Promise<T> {
    let last: unknown
    for (let i = this.cursor; i < this.endpoints.length; i++) {
      try {
        const value = await run(this.socket(i))
        this.cursor = i
        return value
      } catch (err) {
        last = err
        if (i < this.endpoints.length - 1) consoleError(err, `Electrum ${this.endpoints[i]} unavailable`)
        this.cursor = i + 1
      }
    }
    this.cursor = 0
    throw last instanceof Error ? last : new Error('Electrum unavailable')
  }

  request<T>(method: string, ...params: never[]): Promise<T> {
    return this.attempt((ws) => ws.request(method, ...params) as Promise<T>)
  }

  subscribe(
    method: string,
    callback: (...payload: unknown[]) => unknown,
    ...params: (string | number)[]
  ): Promise<void> {
    return this.attempt((ws) => ws.subscribe(method, callback, ...params))
  }

  unsubscribe(method: string, ...params: (string | number)[]): Promise<unknown> {
    const ws = this.sockets[Math.min(this.cursor, this.sockets.length - 1)]
    return ws ? ws.unsubscribe(method, ...params) : Promise.resolve()
  }

  /** Never closes. Closing one client flips reconnect off for every other one. */
  close(): Promise<boolean> {
    return Promise.resolve(true)
  }
}

/**
 * History reads go through `blockchain.transaction.get`. One timed-out id fails
 * the whole batch, and wallet setup used to await that batch: Connect treats
 * any setup rejection as fatal and returns the user to the welcome screen.
 *
 * An empty history is a missed boarding row, recovered on the next reload.
 * `getCoins` is deliberately not caught — a failed listunspent must throw,
 * because the worker treats a successful empty list as "these outputs are
 * gone" and deletes them from the cache.
 */
class WalletElectrumProvider extends ElectrumOnchainProvider {
  override async getTransactions(address: string) {
    try {
      return await super.getTransactions(address)
    } catch (err) {
      consoleError(err, 'Electrum transaction history unavailable')
      return []
    }
  }

  override async getTxOutspends(txid: string) {
    try {
      return await super.getTxOutspends(txid)
    } catch (err) {
      consoleError(err, 'Electrum output spend lookup unavailable')
      return []
    }
  }
}

// One connection per network, never closed: every `ElectrumWS` shares one options object,
// so closing any of them turns reconnection off for all the others.
export const electrumProvider = (network: NetworkName): ElectrumOnchainProvider => {
  let provider = providers.get(network)
  if (!provider) {
    const socket = new FailoverElectrumSocket(electrumEndpoints(network), (url) => arm(new ElectrumWS(url)))
    provider = new WalletElectrumProvider(socket as unknown as ElectrumWS, getNetwork(network))
    providers.set(network, provider)
  }
  return provider
}
