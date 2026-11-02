import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { Buffer } from 'node:buffer'
import { BIP322, Transaction } from '@arkade-os/sdk'
import { hex } from '@scure/base'
import { schnorr, secp256k1 } from '@noble/curves/secp256k1.js'
import { taprootTweakPrivKey } from '@scure/btc-signer/utils.js'
import { p2tr, TEST_NETWORK } from '@scure/btc-signer'

const secret = hex.decode('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')
const publicKey = secp256k1.getPublicKey(secret)
type BridgeModule = typeof import('../../lib/nativeBridge')
type Host = Window & { __ARKADE_NATIVE__?: unknown; __TAURI__?: unknown }
let bridge: BridgeModule
let invoke: Mock<(command: string, args?: Record<string, unknown>) => Promise<unknown>>

beforeEach(async () => {
  vi.resetModules()
  bridge = await import('../../lib/nativeBridge')
  invoke = vi.fn(async (command: string, args?: Record<string, unknown>) => {
    if (command.endsWith('|connect')) return { publicKey: hex.encode(publicKey), name: 'Satochip' }
    if (command.endsWith('|get_public_key')) return hex.encode(publicKey)
    if (command.endsWith('|sign_schnorr')) {
      const key = args!.tweak === null ? secret : taprootTweakPrivKey(secret, hex.decode(args!.tweak as string))
      return hex.encode(schnorr.sign(hex.decode(args!.hash as string), key, new Uint8Array(32)))
    }
    if (command.endsWith('|sign_ecdsa')) {
      return hex.encode(secp256k1.sign(hex.decode(args!.hash as string), secret, { prehash: false, format: 'der' }))
    }
    if (command.endsWith('|disconnect')) return undefined
    if (command.endsWith('|presence')) return { connected: true }
    throw new Error(`Unexpected command ${command}`)
  })
  Object.assign(window, {
    __ARKADE_NATIVE__: { version: 1, platform: 'desktop' },
    __TAURI__: { core: { invoke } },
  })
})

afterEach(async () => {
  await bridge.disconnectNativeIdentity()
  delete (window as Host).__ARKADE_NATIVE__
  delete (window as Host).__TAURI__
})

describe('native identity adapter', () => {
  it('passes an app-entered PIN to one native connection attempt', async () => {
    await bridge.connectNativeIdentity(undefined, '123456')
    expect(invoke).toHaveBeenCalledWith('plugin:satochip|connect', { pin: '123456' })
    expect(invoke.mock.calls.filter(([command]) => command.endsWith('|connect'))).toHaveLength(1)
  })

  it('refuses an invalid app PIN before reaching the native card', async () => {
    await expect(bridge.connectNativeIdentity(undefined, '12345')).rejects.toThrow('6–16 digit PIN')
    await expect(bridge.connectNativeIdentity(undefined, '１２３４５６')).rejects.toThrow('6–16 digit PIN')
    expect(invoke).not.toHaveBeenCalled()
  })

  it('inspects an empty card without authentication or initialization', async () => {
    const info = {
      present: true,
      version: '0.16-0.1',
      setupDone: false,
      seeded: false,
      needs2FA: false,
      schnorrEnabled: true,
      untweakedSchnorrEnabled: true,
      ready: false,
    }
    invoke.mockResolvedValueOnce(info)
    expect(await bridge.inspectNativeCard()).toEqual(info)
    expect(invoke).toHaveBeenCalledExactlyOnceWith('plugin:satochip|inspect', undefined)
  })

  it('validates setup inputs before crossing the native boundary', async () => {
    await expect(bridge.setupNativeCard({ pin: '123456', seed: '00' })).rejects.toThrow('recovery seed')
    await expect(bridge.setupNativeCard({ pin: '123456', seed: '00'.repeat(64), puk: '1234' })).rejects.toThrow(
      'recovery code',
    )
    expect(invoke).not.toHaveBeenCalled()
    invoke.mockResolvedValueOnce({ present: true, setupDone: false })
    await expect(bridge.inspectNativeCard()).rejects.toThrow('Invalid card status')
  })

  it('requires the host marker and callable native transport', () => {
    expect(bridge.isNativeHost()).toBe(true)
    delete (window as Host).__TAURI__
    expect(bridge.isNativeHost()).toBe(false)
  })

  it('connects once and verifies a BIP322 proof through the full bridge', async () => {
    const [first, second] = await Promise.all([bridge.connectNativeIdentity(), bridge.connectNativeIdentity()])
    expect(first).toBe(second)
    expect(invoke.mock.calls.filter(([command]) => command.endsWith('|connect'))).toHaveLength(1)
    const signature = await BIP322.sign('native fixture proof', first.identity, TEST_NETWORK)
    const address = p2tr(publicKey.slice(1), undefined, TEST_NETWORK).address!
    expect(BIP322.verify('native fixture proof', signature, address, TEST_NETWORK)).toBe(true)
    expect(invoke.mock.calls.some(([command, args]) => command.endsWith('|sign_schnorr') && args?.tweak === '')).toBe(
      true,
    )
  })

  it('verifies untweaked Schnorr and compact ECDSA signatures', async () => {
    const { identity } = await bridge.connectNativeIdentity()
    const hash = new Uint8Array(32).fill(7)
    const signature = await identity.signMessage(hash, 'schnorr')
    expect(schnorr.verify(signature, hash, publicKey.slice(1))).toBe(true)
    const ecdsa = await identity.signMessage(hash, 'ecdsa')
    expect(ecdsa.length).toBe(64)
    expect(secp256k1.verify(ecdsa, hash, publicKey, { prehash: false })).toBe(true)
  })

  it('signs PSBTs without changing their outputs', async () => {
    const { identity } = await bridge.connectNativeIdentity()
    const payment = p2tr(publicKey.slice(1))
    const tx = new Transaction()
    tx.addInput({
      txid: new Uint8Array(32).fill(1),
      index: 0,
      witnessUtxo: { script: payment.script, amount: 10_000n },
      tapInternalKey: publicKey.slice(1),
    })
    tx.addOutput({ script: payment.script, amount: 9_000n })
    const signed = await identity.sign(tx)
    expect(signed.getInput(0).tapKeySig).toHaveLength(64)
    expect(signed.getOutput(0)).toEqual(tx.getOutput(0))
    expect(tx.getInput(0).tapKeySig).toBeUndefined()
  })

  it('snapshots a transaction before waiting behind another card operation', async () => {
    const { identity } = await bridge.connectNativeIdentity()
    let release!: () => void
    const blocked = new Promise<void>((resolve) => {
      release = resolve
    })
    const normal = invoke.getMockImplementation()!
    invoke.mockImplementationOnce(async (command, args) => {
      await blocked
      return normal(command, args)
    })
    const message = identity.signMessage(new Uint8Array(32), 'schnorr')
    const payment = p2tr(publicKey.slice(1))
    const tx = new Transaction()
    tx.addInput({
      txid: new Uint8Array(32).fill(1),
      index: 0,
      witnessUtxo: { script: payment.script, amount: 10_000n },
      tapInternalKey: publicKey.slice(1),
    })
    tx.addOutput({ script: payment.script, amount: 9_000n })
    const inputIndexes = [0]
    const signing = identity.sign(tx, inputIndexes)
    tx.updateOutput(0, { amount: 8_000n })
    inputIndexes[0] = 1
    release()
    await message
    const signed = await signing
    expect(signed.getOutput(0).amount).toBe(9_000n)
    expect(signed.getInput(0).tapKeySig).toHaveLength(64)
    expect(tx.getInput(0).tapKeySig).toBeUndefined()
  })

  it('creates independent tree signing sessions offline without touching the card', async () => {
    const identity = await bridge.loadNativeIdentity(hex.encode(publicKey))
    const first = identity.signerSession()
    const second = identity.signerSession()
    expect(await first.getPublicKey()).not.toEqual(await second.getPublicKey())
    expect(await first.getPublicKey()).not.toEqual(publicKey)
    expect(invoke).not.toHaveBeenCalled()
  })

  it('snapshots a Buffer-backed hash before waiting behind another card operation', async () => {
    const { identity } = await bridge.connectNativeIdentity()
    let release!: () => void
    const blocked = new Promise<void>((resolve) => {
      release = resolve
    })
    const normal = invoke.getMockImplementation()!
    invoke.mockImplementationOnce(async (command, args) => {
      await blocked
      return normal(command, args)
    })
    const first = identity.signMessage(new Uint8Array(32), 'schnorr')
    const hash = Buffer.alloc(32, 7)
    const original = new Uint8Array(hash)
    const queued = identity.signMessage(hash, 'schnorr')
    hash.fill(9)
    release()
    await first
    expect(schnorr.verify(await queued, original, publicKey.slice(1))).toBe(true)
  })

  it('invalidates the live session after a transport failure without retry or losing public identity', async () => {
    const { identity } = await bridge.connectNativeIdentity()
    const disconnected = vi.fn()
    window.addEventListener('arkade-native-disconnected', disconnected)
    invoke.mockRejectedValueOnce(new Error('Card removed'))
    await expect(identity.signMessage(new Uint8Array(32), 'schnorr')).rejects.toThrow('Card removed')
    expect(bridge.getNativeCardState().status).toBe('disconnected')
    expect(disconnected).toHaveBeenCalledTimes(1)
    await expect(identity.signMessage(new Uint8Array(32), 'schnorr')).rejects.toBeInstanceOf(bridge.CardRequiredError)
    expect(await identity.compressedPublicKey()).toEqual(publicKey)
    expect(invoke.mock.calls.filter(([command]) => command.endsWith('|sign_schnorr'))).toHaveLength(1)
    window.removeEventListener('arkade-native-disconnected', disconnected)
  })

  it('rejects a card change during connect and closes the native session', async () => {
    const original = invoke.getMockImplementation()!
    invoke.mockImplementation(async (command: string, args?: Record<string, unknown>) =>
      command.endsWith('|get_public_key')
        ? hex.encode(secp256k1.getPublicKey(new Uint8Array(32).fill(2)))
        : original(command, args),
    )
    await expect(bridge.connectNativeIdentity()).rejects.toThrow('connected card changed')
    expect(bridge.getNativeCardState().status).toBe('disconnected')
    expect(invoke).toHaveBeenCalledWith('plugin:satochip|disconnect', undefined)
  })

  it('invalidates old identities after an explicit lock', async () => {
    const { identity } = await bridge.connectNativeIdentity()
    await bridge.disconnectNativeIdentity()
    await expect(identity.signMessage(new Uint8Array(32), 'schnorr')).rejects.toBeInstanceOf(bridge.CardRequiredError)
    expect(invoke.mock.calls.filter(([command]) => command.endsWith('|sign_schnorr'))).toHaveLength(0)
  })

  it('uses desktop presence checks when Tauri exposes its mobile plugin-listener API', async () => {
    const addPluginListener = vi.fn().mockRejectedValue('Command register_listener not found')
    Object.assign(window, { __TAURI__: { core: { invoke, addPluginListener } } })
    const { identity } = await bridge.connectNativeIdentity()
    expect(addPluginListener).not.toHaveBeenCalled()
    expect(bridge.getNativeCardState().status).toBe('connected')
    invoke.mockResolvedValueOnce({ connected: false })
    await expect(bridge.checkNativeCardPresence()).rejects.toBeInstanceOf(bridge.CardRequiredError)
    expect(await identity.compressedPublicKey()).toEqual(publicKey)
  })

  it('preserves native listener failure messages when Android rejects with a string', async () => {
    Object.assign(window, {
      __ARKADE_NATIVE__: { version: 1, platform: 'android' },
      __TAURI__: {
        core: { invoke, addPluginListener: vi.fn().mockRejectedValue('NFC listener is unavailable') },
      },
    })
    const connection = bridge.connectNativeIdentity()
    await expect(connection).rejects.toBeInstanceOf(Error)
    await expect(connection).rejects.toThrow('NFC listener is unavailable')
    expect(bridge.getNativeCardState()).toMatchObject({ status: 'disconnected', error: 'NFC listener is unavailable' })
  })

  it('disconnects Android signing on a native pause event without losing the public identity', async () => {
    let disconnected!: () => void
    const unregister = vi.fn(async () => {})
    Object.assign(window, {
      __ARKADE_NATIVE__: { version: 1, platform: 'android' },
      __TAURI__: {
        core: {
          invoke,
          addPluginListener: vi.fn(async (_plugin, _event, callback) => {
            disconnected = callback
            return { unregister }
          }),
        },
      },
    })
    const { identity } = await bridge.connectNativeIdentity()
    const callsBeforePause = invoke.mock.calls.length
    disconnected()
    expect(bridge.getNativeCardState().status).toBe('disconnected')
    await expect(identity.signMessage(new Uint8Array(32), 'schnorr')).rejects.toBeInstanceOf(bridge.CardRequiredError)
    expect(await identity.compressedPublicKey()).toEqual(publicKey)
    expect(invoke.mock.calls).toHaveLength(callsBeforePause)
    expect(unregister).toHaveBeenCalledTimes(1)
  })

  it.each([false, true])(
    'cancels a pending connection before using the key (disconnect failure: %s)',
    async (failedDisconnect) => {
      let release!: (value: unknown) => void
      let entered!: () => void
      const started = new Promise<void>((resolve) => {
        entered = resolve
      })
      invoke.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            release = resolve
            entered()
          }),
      )
      const connection = bridge.connectNativeIdentity()
      const rejected = expect(connection).rejects.toThrow('connection was cancelled')
      await started
      if (failedDisconnect) {
        invoke.mockRejectedValueOnce(new Error('Disconnect IPC failed'))
        await expect(bridge.disconnectNativeIdentity()).rejects.toThrow('Disconnect IPC failed')
      } else await bridge.disconnectNativeIdentity()
      release({ publicKey: hex.encode(publicKey), name: 'Satochip' })
      await rejected
      expect(bridge.getNativeCardState().status).toBe('disconnected')
      expect(invoke.mock.calls.filter(([command]) => command.endsWith('|get_public_key'))).toHaveLength(0)
      expect(invoke.mock.calls.filter(([command]) => command.endsWith('|disconnect'))).toHaveLength(2)
    },
  )

  it.each([
    ['inspect', true],
    ['inspect', false],
    ['setup_card', true],
    ['setup_card', false],
  ] as const)('does not close a newer %s operation (explicit disconnect: %s)', async (command, disconnect) => {
    let releaseConnection!: (value: unknown) => void
    let started!: () => void
    const entered = new Promise<void>((resolve) => {
      started = resolve
    })
    invoke.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseConnection = resolve
          started()
        }),
    )
    const connection = bridge.connectNativeIdentity()
    const rejected = expect(connection).rejects.toThrow('connection was cancelled')
    await entered
    if (disconnect) await bridge.disconnectNativeIdentity()
    let releaseOperation!: (value: unknown) => void
    invoke.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseOperation = resolve
        }),
    )
    const operation =
      command === 'inspect'
        ? bridge.inspectNativeCard()
        : bridge.setupNativeCard({ pin: '123456', seed: '00'.repeat(64) })
    releaseConnection({ publicKey: hex.encode(publicKey), name: 'Satochip' })
    await rejected
    expect(invoke.mock.calls.map(([method]) => method)).toEqual([
      'plugin:satochip|connect',
      ...(disconnect ? ['plugin:satochip|disconnect'] : []),
      `plugin:satochip|${command}`,
    ])
    const info = {
      present: true,
      version: '0.16-0.1',
      setupDone: true,
      seeded: true,
      needs2FA: false,
      schnorrEnabled: true,
      untweakedSchnorrEnabled: true,
      ready: true,
      publicKey: hex.encode(publicKey),
    }
    releaseOperation(info)
    await expect(operation).resolves.toMatchObject(info)
    expect(bridge.getNativeCardState().status).toBe('disconnected')
  })

  it('loads a public-key-bound identity offline and reconnects signing without replacing it', async () => {
    const identity = await bridge.loadNativeIdentity(hex.encode(publicKey))
    expect(await identity.compressedPublicKey()).toEqual(publicKey)
    expect(invoke).not.toHaveBeenCalled()
    await expect(identity.signMessage(new Uint8Array(32), 'schnorr')).rejects.toMatchObject({ code: 'CARD_REQUIRED' })
    const first = await bridge.connectNativeIdentity(hex.encode(publicKey))
    expect(first.identity).toBe(identity)
    await bridge.disconnectNativeIdentity()
    const second = await bridge.connectNativeIdentity(hex.encode(publicKey))
    expect(second.identity).toBe(identity)
    expect(await identity.signMessage(new Uint8Array(32), 'schnorr')).toHaveLength(64)
  })

  it('refuses a different card while preserving the stored public identity', async () => {
    const other = hex.encode(secp256k1.getPublicKey(new Uint8Array(32).fill(2)))
    const identity = await bridge.loadNativeIdentity(other)
    await expect(bridge.connectNativeIdentity(other)).rejects.toThrow('different card')
    expect(await identity.compressedPublicKey()).toEqual(hex.decode(other))
    expect(bridge.getNativeCardState().status).toBe('disconnected')
    expect(bridge.getNativeCardState().status).toBe('disconnected')
  })

  it('reports passive desktop card loss without signing or discarding public identity', async () => {
    const { identity } = await bridge.connectNativeIdentity()
    invoke.mockResolvedValueOnce({ connected: false })
    await expect(bridge.checkNativeCardPresence()).rejects.toBeInstanceOf(bridge.CardRequiredError)
    expect(bridge.getNativeCardState().status).toBe('disconnected')
    expect(await identity.compressedPublicKey()).toEqual(publicKey)
    expect(invoke.mock.calls.some(([command]) => command.endsWith('|sign_schnorr'))).toBe(false)
  })

  it('rejects pending and queued signatures from the old generation before reconnecting the same identity', async () => {
    const { identity } = await bridge.connectNativeIdentity()
    const original = invoke.getMockImplementation()!
    let release!: () => void
    let entered!: () => void
    const started = new Promise<void>((resolve) => {
      entered = resolve
    })
    const blocked = new Promise<void>((resolve) => {
      release = resolve
    })
    invoke.mockImplementation(async (command, args) => {
      if (command.endsWith('|sign_schnorr')) {
        entered()
        await blocked
      }
      return original(command, args)
    })
    const signing = identity.signMessage(new Uint8Array(32), 'schnorr')
    const queued = identity.signMessage(new Uint8Array(32), 'schnorr')
    const firstRejected = expect(signing).rejects.toBeInstanceOf(bridge.CardRequiredError)
    const queuedRejected = expect(queued).rejects.toBeInstanceOf(bridge.CardRequiredError)
    await started
    await bridge.disconnectNativeIdentity()
    const reconnecting = bridge.connectNativeIdentity(hex.encode(publicKey))
    release()
    await firstRejected
    await queuedRejected
    const reconnected = await reconnecting
    expect(reconnected.identity).toBe(identity)
    expect(invoke.mock.calls.filter(([command]) => command.endsWith('|sign_schnorr'))).toHaveLength(1)
    expect(await identity.signMessage(new Uint8Array(32), 'schnorr')).toHaveLength(64)
  })

  it('stops a multi-input operation when locked while the first native signature is pending', async () => {
    const { identity } = await bridge.connectNativeIdentity()
    const payment = p2tr(publicKey.slice(1))
    const tx = new Transaction()
    for (const index of [0, 1])
      tx.addInput({
        txid: new Uint8Array(32).fill(index + 1),
        index: 0,
        witnessUtxo: { script: payment.script, amount: 10_000n },
        tapInternalKey: publicKey.slice(1),
      })
    tx.addOutput({ script: payment.script, amount: 19_000n })
    const original = invoke.getMockImplementation()!
    let release!: () => void
    let entered!: () => void
    const started = new Promise<void>((resolve) => {
      entered = resolve
    })
    const blocked = new Promise<void>((resolve) => {
      release = resolve
    })
    invoke.mockImplementation(async (command: string, args?: Record<string, unknown>) => {
      if (command.endsWith('|sign_schnorr')) {
        entered()
        await blocked
      }
      return original(command, args)
    })
    const signing = identity.sign(tx)
    const rejected = expect(signing).rejects.toThrow('Card session ended')
    await started
    await bridge.disconnectNativeIdentity()
    release()
    await rejected
    expect(invoke.mock.calls.filter(([command]) => command.endsWith('|sign_schnorr'))).toHaveLength(1)
  })
})
