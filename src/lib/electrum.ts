import { ELECTRUM_WS_URL, ElectrumOnchainProvider, getNetwork, type NetworkName } from '@arkade-os/sdk'
import { ElectrumWS } from 'ws-electrumx-client'

const providers = new Map<NetworkName, ElectrumOnchainProvider>()

/** Blockstream's mainnet Electrum websocket. `server.version` answered here; the path without `/api` did not. */
const BLOCKSTREAM_ELECTRUM_URL = 'wss://blockstream.info/electrum-websocket/api'
const PROBE_MS = 4_000

export class ElectrumOfflineError extends Error {
  constructor() {
    super('Electrum is offline')
    this.name = 'ElectrumOfflineError'
  }
}

export const isElectrumOffline = (err: unknown): boolean => {
  const messages: string[] = []
  const walk = (value: unknown, depth: number) => {
    if (value == null || depth > 4) return
    if (typeof value === 'string') messages.push(value)
    else if (typeof value === 'object') {
      if ('message' in value && typeof value.message === 'string') messages.push(value.message)
      if ('cause' in value) walk(value.cause, depth + 1)
    }
  }
  walk(err, 0)
  return messages.some((message) => message.includes('Electrum is offline'))
}

/** Arkade's own server first. Bitcoin also has Blockstream behind it. */
export const electrumEndpoints = (network: NetworkName): readonly string[] => {
  const primary = ELECTRUM_WS_URL[network]
  if (network !== 'bitcoin' || primary === BLOCKSTREAM_ELECTRUM_URL) return [primary]
  return [primary, BLOCKSTREAM_ELECTRUM_URL]
}

/** `server.version` on `url`. False when the handshake or the reply does not arrive. */
export const probeElectrum = (url: string, waitMs = PROBE_MS): Promise<boolean> =>
  new Promise((resolve) => {
    let settled = false
    let socket: WebSocket
    let timer: ReturnType<typeof setTimeout>
    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(ok)
      try {
        socket.close()
      } catch {
        // The handshake never produced a socket to close.
      }
    }
    try {
      socket = new WebSocket(url)
    } catch {
      resolve(false)
      return
    }
    timer = setTimeout(() => finish(false), waitMs)
    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'server.version', params: ['arkade', '1.4'] }) + '\n')
    })
    socket.addEventListener('message', () => finish(true))
    socket.addEventListener('error', () => finish(false))
    socket.addEventListener('close', () => finish(false))
  })

export const firstLiveElectrum = async (
  urls: readonly string[],
  probe: (url: string) => Promise<boolean> = probeElectrum,
): Promise<string> => {
  for (const url of urls) {
    if (await probe(url)) return url
  }
  throw new ElectrumOfflineError()
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
 * Probes the endpoint list once, then talks only to the server that answered.
 * A failed probe is not remembered, so the next call tries again.
 */
export class ProbedElectrumSocket {
  private pending: Promise<ElectrumCaller> | undefined

  constructor(
    private readonly urls: readonly string[],
    private readonly open: (url: string) => ElectrumCaller,
    private readonly probe: (url: string) => Promise<boolean> = probeElectrum,
  ) {}

  private socket(): Promise<ElectrumCaller> {
    if (!this.pending) {
      this.pending = firstLiveElectrum(this.urls, this.probe)
        .then((url) => this.open(url))
        .catch((err) => {
          this.pending = undefined
          throw err
        })
    }
    return this.pending
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
    const socket = new ProbedElectrumSocket(electrumEndpoints(network), (url) => new ElectrumWS(url) as ElectrumCaller)
    provider = new ElectrumOnchainProvider(socket as unknown as ElectrumWS, getNetwork(network))
    providers.set(network, provider)
  }
  return provider
}
