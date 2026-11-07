import { TreeSignerSession, type BatchSignableIdentity } from '@arkade-os/sdk'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { hex } from '@scure/base'
import { prepareSatochipSigning, SatochipIdentity } from './satochipIdentity'
import { SatochipProtocol } from './satochipProtocol'
import { cancelNativeSigningPin, requestNativeSigningPin } from './nativeSigningPin'

type Invoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>
type NativeListener = { unregister(): Promise<void> }
type NativeWindow = Window & {
  __ARKADE_NATIVE__?: { version: number; platform: string }
  __TAURI__?: {
    core?: {
      invoke?: Invoke
      addPluginListener?: (plugin: string, event: string, callback: (value?: any) => void) => Promise<NativeListener>
    }
  }
}
type Connection = { identity: BatchSignableIdentity; publicKey: string; name: string }
type Session = { id: number; signer: SatochipIdentity; connection: Connection }
export type NativeCardState = {
  status: 'disconnected' | 'connecting' | 'connected'
  publicKey?: string
  error?: string
}
export type NativeCardInfo = {
  present: boolean
  version: string
  setupDone: boolean
  seeded: boolean
  needs2FA: boolean
  schnorrEnabled: boolean
  untweakedSchnorrEnabled: boolean
  ready: boolean
}
export type NativeCardSetupInfo = NativeCardInfo & { publicKey: string }

export class CardRequiredError extends Error {
  readonly code = 'CARD_REQUIRED'
  constructor(message = 'Connect your Satochip to sign. Your wallet remains available without the card.') {
    super(message)
    this.name = 'CardRequiredError'
  }
}

let session: Session | undefined
let connecting: { id: number; promise: Promise<Connection> } | undefined
let generation = 0
let cardOperation = 0
let pending = Promise.resolve()
let nativeListener: NativeListener | undefined
let presenceTimer: number | undefined
let presencePending: Promise<void> | undefined
let cardState: NativeCardState = { status: 'disconnected' }
let tapPending = Promise.resolve()
let tapClose: (() => Promise<void>) | undefined
const subscribers = new Set<() => void>()
const identities = new Map<string, Promise<BatchSignableIdentity>>()
const isConnecting = (id: number): boolean => connecting?.id === id

export const getNativeCardState = (): NativeCardState => cardState
export const subscribeNativeCardState = (callback: () => void): (() => void) => {
  subscribers.add(callback)
  return () => subscribers.delete(callback)
}
function publish(state: NativeCardState): void {
  cardState = state
  for (const callback of subscribers) callback()
}

export const isNativeHost = (): boolean => {
  const host = window as NativeWindow
  return host.__ARKADE_NATIVE__?.version === 1 && typeof host.__TAURI__?.core?.invoke === 'function'
}

export const nativeSignerInteraction = (): 'tap' | 'connection' =>
  isNativeHost() && (window as NativeWindow).__ARKADE_NATIVE__?.platform === 'ios' ? 'tap' : 'connection'

async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const host = window as NativeWindow
  if (!isNativeHost() || !host.__TAURI__?.core?.invoke) throw new Error('Open this wallet in the Arkade native app')
  try {
    return await host.__TAURI__.core.invoke<T>('plugin:satochip|' + command, args)
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : typeof error === 'string' ? error : 'Card connection failed',
    )
  }
}

async function withTapCard<T>(work: (protocol: SatochipProtocol, open: () => Promise<void>) => Promise<T>): Promise<T> {
  const id = generation
  const previous = tapPending
  let release!: () => void
  tapPending = new Promise<void>((resolve) => {
    release = resolve
  })
  await previous
  let protocol: SatochipProtocol | undefined
  let listener: NativeListener | undefined
  let closing = false
  let closePromise: Promise<void> | undefined
  let cleanupPromise: Promise<void> | undefined
  let lost = false
  const valid = () => {
    if (id !== generation || lost) throw new CardRequiredError('Card operation ended. Try again when you are ready.')
  }
  const close = () => {
    closing = true
    return (closePromise ??= protocol?.disconnect() ?? Promise.resolve())
  }
  const cleanup = () =>
    (cleanupPromise ??= (async () => {
      try {
        await close()
      } finally {
        await listener?.unregister().catch(() => undefined)
      }
    })())
  const pause = () => {
    lost = true
    cancelNativeSigningPin()
    void close().catch(() => undefined)
  }
  window.addEventListener('arkade-native-paused', pause)
  try {
    valid()
    const host = window as NativeWindow
    const addListener = host.__TAURI__?.core?.addPluginListener
    if (!addListener) throw new Error('The native NFC session listener is unavailable')
    listener = await addListener('satochip', 'presence', (state) => {
      if (!closing && state?.connected === false && !state?.scanning) lost = true
    })
    valid()
    protocol = new SatochipProtocol({
      beginOperation: async () => {
        valid()
        await invoke('begin_operation')
        valid()
      },
      endOperation: async () => {
        await invoke('end_operation')
        valid()
      },
      disconnect: async () => {
        await invoke('disconnect')
      },
      transmit: async (command) => {
        valid()
        const response = await invoke<{ dataHex: string; statusWord: number }>('transmit', {
          commandHex: hex.encode(command),
        })
        valid()
        if (
          typeof response.dataHex !== 'string' ||
          !/^(?:[0-9a-f]{2})*$/i.test(response.dataHex) ||
          response.dataHex.length > 131072 ||
          !Number.isInteger(response.statusWord) ||
          response.statusWord < 0 ||
          response.statusWord > 65535
        )
          throw new Error('Invalid native NFC response')
        return { data: hex.decode(response.dataHex), statusWord: response.statusWord }
      },
    })
    tapClose = close
    const result = await work(protocol, async () => {
      valid()
      publish({ status: 'connecting' })
      await invoke('open')
      valid()
    })
    valid()
    await cleanup()
    valid()
    return result
  } catch (error) {
    if (id === generation) {
      generation++
      cancelNativeSigningPin()
      publish({ status: 'disconnected', error: error instanceof Error ? error.message : 'Card operation ended' })
      window.dispatchEvent(new Event('arkade-native-disconnected'))
    }
    throw error
  } finally {
    try {
      await cleanup().catch(() => undefined)
    } finally {
      window.removeEventListener('arkade-native-paused', pause)
      if (tapClose === close) tapClose = undefined
      if (id === generation && cardState.status !== 'disconnected') publish({ status: 'disconnected' })
      release()
    }
  }
}

function cardInfo(value: unknown): NativeCardInfo {
  if (!value || typeof value !== 'object') throw new Error('Invalid card status')
  const info = value as Record<string, unknown>
  const flags = ['present', 'setupDone', 'seeded', 'needs2FA', 'schnorrEnabled', 'untweakedSchnorrEnabled', 'ready']
  if (typeof info.version !== 'string' || flags.some((flag) => typeof info[flag] !== 'boolean'))
    throw new Error('Invalid card status')
  return info as NativeCardInfo
}

export async function inspectNativeCard(): Promise<NativeCardInfo> {
  cardOperation++
  if (nativeSignerInteraction() === 'tap')
    return withTapCard(async (protocol, open) => {
      await open()
      return protocol.inspect()
    })
  return cardInfo(await invoke('inspect'))
}

export async function setupNativeCard(options: {
  pin: string
  puk?: string
  seed: string
}): Promise<NativeCardSetupInfo> {
  if (!/^[0-9]{6,16}$/.test(options.pin)) throw new Error('Use a 6–16 digit PIN.')
  if (options.puk !== undefined && !/^[0-9a-f]{16}$/i.test(options.puk)) throw new Error('Invalid PIN recovery code')
  if (!/^[0-9a-f]{128}$/i.test(options.seed)) throw new Error('Invalid recovery seed')
  cardOperation++
  if (nativeSignerInteraction() === 'tap')
    return withTapCard(async (protocol, open) => {
      await open()
      const seed = hex.decode(options.seed)
      try {
        const info = await protocol.setup({ ...options, seed })
        return { ...info, publicKey: hex.encode(info.publicKey) }
      } finally {
        seed.fill(0)
      }
    })
  const response = await invoke<unknown>('setup_card', options)
  const info = cardInfo(response)
  const key = (response as Record<string, unknown>).publicKey
  const publicKey = bytes(key, [33])
  if (![2, 3].includes(publicKey[0])) throw new Error('Invalid initialized card public key')
  return { ...info, publicKey: hex.encode(publicKey) }
}

function bytes(value: unknown, lengths: number[]): Uint8Array {
  if (typeof value !== 'string' || !/^(?:[0-9a-f]{2})+$/i.test(value) || !lengths.includes(value.length / 2))
    throw new Error('The native card bridge returned an invalid response')
  return hex.decode(value)
}

function requireSession(id: number): void {
  if (id !== generation || session?.id !== id)
    throw new CardRequiredError('Card session ended. Reconnect your Satochip to sign.')
}

function invalidate(error?: string): void {
  generation++
  cancelNativeSigningPin()
  void tapClose?.().catch(() => undefined)
  session = undefined
  window.clearInterval(presenceTimer)
  presenceTimer = undefined
  const listener = nativeListener
  nativeListener = undefined
  void listener?.unregister().catch(() => undefined)
  publish({ status: 'disconnected', ...(error ? { error } : {}) })
  window.dispatchEvent(new Event('arkade-native-disconnected'))
}

async function run<T>(id: number, work: () => Promise<T>): Promise<T> {
  const previous = pending
  let release!: () => void
  pending = new Promise<void>((resolve) => {
    release = resolve
  })
  await previous
  try {
    requireSession(id)
    const result = await work()
    requireSession(id)
    return result
  } catch (error) {
    if (id === generation) {
      invalidate(error instanceof Error ? error.message : 'Card connection ended')
      await invoke('disconnect').catch(() => undefined)
    }
    throw error instanceof CardRequiredError
      ? error
      : new CardRequiredError(error instanceof Error ? error.message : undefined)
  } finally {
    release()
  }
}

function withCard<T>(publicKey: string, work: (signer: SatochipIdentity) => Promise<T>): Promise<T> {
  if (nativeSignerInteraction() === 'tap')
    return withTapCard(async (protocol, open) => {
      let pin: string | undefined = await requestNativeSigningPin()
      try {
        await open()
        const key = await protocol.connect(pin)
        pin = undefined
        if (hex.encode(key) !== publicKey)
          throw new Error('This is a different card. Use the Satochip belonging to this wallet.')
        publish({ status: 'connected', publicKey })
        return await work(await SatochipIdentity.create(protocol))
      } finally {
        pin = undefined
      }
    })
  const current = session
  if (!current || current.connection.publicKey !== publicKey) return Promise.reject(new CardRequiredError())
  return run(current.id, () => work(current.signer))
}

export function loadNativeIdentity(publicKey: string): Promise<BatchSignableIdentity> {
  const encoded = bytes(publicKey, [33])
  secp256k1.Point.fromBytes(encoded).assertValidity()
  const key = hex.encode(encoded)
  let identity = identities.get(key)
  if (!identity) {
    identity = Promise.resolve<BatchSignableIdentity>({
      compressedPublicKey: async () => encoded.slice(),
      xOnlyPublicKey: async () => encoded.slice(1),
      signerSession: () => TreeSignerSession.random(),
      sign: async (tx, inputIndexes) => {
        const prepared = prepareSatochipSigning(tx, encoded, inputIndexes)
        if (!prepared.slots.length) return prepared.tx
        return withCard(key, (signer) => signer.signPrepared(prepared))
      },
      signMultiple: async (requests) => {
        const prepared = requests.map(({ tx, inputIndexes }) => prepareSatochipSigning(tx, encoded, inputIndexes))
        if (!prepared.some(({ slots }) => slots.length)) return prepared.map(({ tx }) => tx)
        return withCard(key, async (signer) => {
          const signed = []
          for (const request of prepared) signed.push(await signer.signPrepared(request))
          return signed
        })
      },
      signMessage: async (hash, type = 'schnorr') => {
        if (hash.length !== 32) throw new Error('Expected a 32-byte message hash')
        if (type !== 'schnorr' && type !== 'ecdsa') throw new Error('Unsupported signature type')
        const digest = new Uint8Array(hash)
        return withCard(key, (signer) => signer.signMessage(digest, type))
      },
    })
    identities.set(key, identity)
  }
  return identity
}

export function checkNativeCardPresence(): Promise<void> {
  if (presencePending) return presencePending
  const current = session
  if (!current) return Promise.resolve()
  const check = run(current.id, async () => {
    const state = await invoke<{ connected: boolean }>('presence')
    if (!state.connected)
      throw new CardRequiredError('Satochip disconnected. Reconnect the card when you want to sign.')
  })
  presencePending = check
  void check
    .finally(() => {
      if (presencePending === check) presencePending = undefined
    })
    .catch(() => undefined)
  return check
}

export function connectNativeIdentity(expectedPublicKey?: string, pin?: string): Promise<Connection> {
  if (pin !== undefined && !/^[0-9]{6,16}$/.test(pin)) return Promise.reject(new Error('Use a 6–16 digit PIN.'))
  const expected = expectedPublicKey ? hex.encode(bytes(expectedPublicKey, [33])) : undefined
  const assertExpected = (connection: Connection): Connection => {
    if (expected && connection.publicKey !== expected)
      throw new Error('This is a different card. Reconnect the Satochip used by this wallet.')
    return connection
  }
  if (connecting?.id === generation) return connecting.promise.then(assertExpected)
  if (nativeSignerInteraction() === 'tap')
    return withTapCard(async (protocol, open) => {
      pin ??= await requestNativeSigningPin()
      try {
        await open()
        const key = hex.encode(await protocol.connect(pin))
        pin = undefined
        if (expected && key !== expected)
          throw new Error('This is a different card. Use the Satochip belonging to this wallet.')
        const connection = { identity: await loadNativeIdentity(key), publicKey: key, name: 'Satochip' }
        return connection
      } finally {
        pin = undefined
      }
    })
  const active = session
  if (active)
    return Promise.resolve().then(() => {
      requireSession(active.id)
      return assertExpected(active.connection)
    })
  const id = ++generation
  publish({ status: 'connecting', publicKey: expected })
  const promise = (async () => {
    let operation: number | undefined
    try {
      await pending
      if (generation !== id) throw new CardRequiredError('Card connection was cancelled')
      operation = ++cardOperation
      const connected = await invoke<{ publicKey: string; name: string }>(
        'connect',
        pin === undefined ? undefined : { pin },
      )
      pin = undefined
      const publicKey = bytes(connected.publicKey, [33])
      const key = hex.encode(publicKey)
      if (generation !== id || operation !== cardOperation) throw new CardRequiredError('Card connection was cancelled')
      if (expected && key !== expected)
        throw new Error('This is a different card. Reconnect the Satochip used by this wallet.')
      const card = {
        getPublicKey: async () => {
          const key = bytes(await invoke<string>('get_public_key'), [33])
          if (hex.encode(key) !== hex.encode(publicKey))
            throw new Error('The connected card changed. Reconnect your Satochip')
          return key
        },
        signSchnorr: async (hash: Uint8Array, tweak: Uint8Array | null) => {
          requireSession(id)
          const signature = bytes(
            await invoke<string>('sign_schnorr', {
              hash: hex.encode(hash),
              tweak: tweak === null ? null : hex.encode(tweak),
            }),
            [64],
          )
          requireSession(id)
          return signature
        },
        signEcdsa: async (hash: Uint8Array) => {
          requireSession(id)
          const signature = bytes(
            await invoke<string>('sign_ecdsa', { hash: hex.encode(hash) }),
            Array.from({ length: 65 }, (_, i) => i + 8),
          )
          requireSession(id)
          return signature
        },
      }
      const signer = await SatochipIdentity.create(card)
      const identity = await loadNativeIdentity(key)
      const host = window as NativeWindow
      if (host.__ARKADE_NATIVE__?.platform === 'android') {
        const addPluginListener = host.__TAURI__?.core?.addPluginListener
        if (!addPluginListener) throw new Error('The native NFC session listener is unavailable')
        nativeListener = await addPluginListener('satochip', 'disconnected', () => {
          if (generation === id) invalidate()
        })
      }
      if (generation !== id || operation !== cardOperation) throw new CardRequiredError('Card connection was cancelled')
      const connection = { identity, publicKey: key, name: 'Satochip' }
      session = { id, signer, connection }
      publish({ status: 'connected', publicKey: key })
      if (host.__ARKADE_NATIVE__?.platform !== 'android')
        presenceTimer = window.setInterval(() => {
          void checkNativeCardPresence().catch(() => undefined)
        }, 3_000)
      return connection
    } catch (error) {
      const failure =
        error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Card connection failed')
      if (generation === id) {
        invalidate(failure.message)
        if (operation === cardOperation) await invoke('disconnect').catch(() => undefined)
      } else if (isConnecting(id) && !session && operation === cardOperation) {
        await invoke('disconnect').catch(() => undefined)
      }
      throw failure
    } finally {
      pin = undefined
      if (isConnecting(id)) connecting = undefined
    }
  })()
  connecting = { id, promise }
  return promise
}

export async function disconnectNativeIdentity(): Promise<void> {
  const close = tapClose
  invalidate()
  if (close) await close()
  else if (isNativeHost()) await invoke('disconnect')
}
