import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { Transaction } from '@arkade-os/sdk'
import { hex } from '@scure/base'
import { schnorr, secp256k1 } from '@noble/curves/secp256k1.js'
import { p2tr, SigHash } from '@scure/btc-signer'
import { taprootTweakPrivKey } from '@scure/btc-signer/utils.js'
import type { SatochipAPDUChannel } from '../../lib/satochipProtocol'

const protocol = vi.hoisted(() => ({
  channels: [] as SatochipAPDUChannel[],
  connect: vi.fn<(pin: string) => Promise<Uint8Array>>(),
  getPublicKey: vi.fn<() => Promise<Uint8Array>>(),
  signSchnorr: vi.fn<(hash: Uint8Array, root: Uint8Array | null) => Promise<Uint8Array>>(),
  signEcdsa: vi.fn<(hash: Uint8Array) => Promise<Uint8Array>>(),
  inspect: vi.fn(),
  setup: vi.fn(),
  disconnect: vi.fn(),
}))

vi.mock('../../lib/satochipProtocol', () => ({
  SatochipProtocol: class {
    constructor(private readonly channel: SatochipAPDUChannel) {
      protocol.channels.push(channel)
    }
    connect(pin: string) {
      return protocol.connect(pin)
    }
    getPublicKey() {
      return protocol.getPublicKey()
    }
    signSchnorr(hash: Uint8Array, root: Uint8Array | null) {
      return protocol.signSchnorr(hash, root)
    }
    signEcdsa(hash: Uint8Array) {
      return protocol.signEcdsa(hash)
    }
    inspect() {
      return protocol.inspect()
    }
    setup(options: unknown) {
      return protocol.setup(options)
    }
    async disconnect() {
      await protocol.disconnect()
      await this.channel.disconnect()
    }
  },
}))

const secret = hex.decode('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')
const publicKey = secp256k1.getPublicKey(secret)
const encodedKey = hex.encode(publicKey)
const samplePin = '135790'
const digest = new Uint8Array(32).fill(7)
type Host = Window & { __ARKADE_NATIVE__?: unknown; __TAURI__?: unknown }
type Bridge = typeof import('../../lib/nativeBridge')
type Pin = typeof import('../../lib/nativeSigningPin')
let bridge: Bridge
let pin: Pin
let unregisterPin: () => void
let invoke: Mock<(command: string, args?: Record<string, unknown>) => Promise<unknown>>
let presence: ((state: { connected: boolean; scanning?: boolean; reason?: string }) => void) | undefined
let unregister: Mock

async function enterPin(): Promise<void> {
  await vi.waitFor(() => expect(pin.getNativeSigningPinRequest()).toBeTypeOf('number'))
  expect(pin.submitNativeSigningPin(pin.getNativeSigningPinRequest()!, samplePin)).toBe(true)
}

function psbt(): Uint8Array {
  const payment = p2tr(publicKey.slice(1))
  const tx = new Transaction()
  tx.addInput({
    txid: new Uint8Array(32).fill(1),
    index: 0,
    witnessUtxo: { script: payment.script, amount: 10_000n },
    tapInternalKey: publicKey.slice(1),
  })
  tx.addOutput({ script: payment.script, amount: 9_000n })
  return tx.toPSBT()
}

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  protocol.channels.length = 0
  protocol.connect.mockImplementation(async () => publicKey.slice())
  protocol.getPublicKey.mockImplementation(async () => publicKey.slice())
  protocol.signSchnorr.mockImplementation(async (hash, root) =>
    schnorr.sign(hash, root === null ? secret : taprootTweakPrivKey(secret, root), new Uint8Array(32)),
  )
  protocol.signEcdsa.mockImplementation(async (hash) => secp256k1.sign(hash, secret, { prehash: false, format: 'der' }))
  presence = undefined
  unregister = vi.fn(async () => {
    presence = undefined
  })
  invoke = vi.fn(async (command: string) => {
    if (command.endsWith('|open')) {
      presence?.({ connected: true })
      return { connected: true }
    }
    if (command.endsWith('|disconnect')) {
      presence?.({ connected: false, reason: 'CARD_DISCONNECTED' })
      return
    }
    throw new Error(`Unexpected raw command ${command}`)
  })
  Object.assign(window, {
    __ARKADE_NATIVE__: { version: 1, platform: 'ios' },
    __TAURI__: {
      core: {
        invoke,
        addPluginListener: vi.fn(async (_plugin, _event, callback) => {
          presence = callback
          return { unregister }
        }),
      },
    },
  })
  bridge = await import('../../lib/nativeBridge')
  pin = await import('../../lib/nativeSigningPin')
  unregisterPin = pin.registerNativeSigningPinHost(() => true)
})

afterEach(async () => {
  unregisterPin()
  await bridge.disconnectNativeIdentity()
  delete (window as Host).__ARKADE_NATIVE__
  delete (window as Host).__TAURI__
})

describe('iOS tap-per-operation native signer bridge', () => {
  it('loads and reads the public identity offline without a card or PIN request', async () => {
    const identity = await bridge.loadNativeIdentity(encodedKey)
    expect(await identity.compressedPublicKey()).toEqual(publicKey)
    expect(await identity.xOnlyPublicKey()).toEqual(publicKey.slice(1))
    expect(bridge.nativeSignerInteraction()).toBe('tap')
    expect(pin.getNativeSigningPinRequest()).toBeUndefined()
    expect(invoke).not.toHaveBeenCalled()
    expect(protocol.channels).toHaveLength(0)
  })

  it('requests the PIN before opening NFC, then signs and closes with gray health', async () => {
    const identity = await bridge.loadNativeIdentity(encodedKey)
    const signing = identity.signMessage(digest, 'schnorr')
    await vi.waitFor(() => expect(pin.getNativeSigningPinRequest()).toBeTypeOf('number'))
    expect(invoke).not.toHaveBeenCalled()
    expect(protocol.connect).not.toHaveBeenCalled()
    await enterPin()
    expect(schnorr.verify(await signing, digest, publicKey.slice(1))).toBe(true)
    expect(protocol.connect).toHaveBeenCalledExactlyOnceWith(samplePin)
    expect(invoke.mock.calls.map(([command]) => command)).toEqual([
      'plugin:satochip|open',
      'plugin:satochip|disconnect',
    ])
    expect(unregister).toHaveBeenCalledOnce()
    expect(bridge.getNativeCardState()).toEqual({ status: 'disconnected' })
  })

  it('uses one tap and authentication for a complete PSBT batch and closes afterward', async () => {
    await bridge.connectNativeIdentity(encodedKey, samplePin)
    invoke.mockClear()
    protocol.connect.mockClear()
    protocol.disconnect.mockClear()
    const signer = await bridge.loadNativeIdentity(encodedKey)
    let completeSecond!: () => void
    const normal = protocol.signSchnorr.getMockImplementation()!
    protocol.signSchnorr.mockImplementationOnce(normal).mockImplementationOnce(async (hash, root) => {
      const signature = await normal(hash, root)
      await new Promise<void>((resolve) => {
        completeSecond = resolve
      })
      return signature
    })
    const batch = signer.signMultiple([{ tx: Transaction.fromPSBT(psbt()) }, { tx: Transaction.fromPSBT(psbt()) }])
    await enterPin()
    await vi.waitFor(() => expect(completeSecond).toBeTypeOf('function'))
    expect(protocol.connect).toHaveBeenCalledExactlyOnceWith(samplePin)
    expect(protocol.disconnect).not.toHaveBeenCalled()
    expect(invoke.mock.calls.map(([command]) => command)).toEqual(['plugin:satochip|open'])
    completeSecond()
    expect(await batch).toHaveLength(2)
    expect(protocol.disconnect).toHaveBeenCalledOnce()
  })

  it('snapshots all batch transactions and indexes before waiting for the PIN', async () => {
    const identity = await bridge.loadNativeIdentity(encodedKey)
    const first = Transaction.fromPSBT(psbt())
    const second = Transaction.fromPSBT(psbt())
    const inputIndexes = [0]
    const requests = [{ tx: first }, { tx: second, inputIndexes }]
    const signing = identity.signMultiple(requests)
    await vi.waitFor(() => expect(pin.getNativeSigningPinRequest()).toBeTypeOf('number'))
    first.updateOutput(0, { amount: 7_000n })
    second.updateOutput(0, { amount: 8_000n })
    inputIndexes[0] = 1
    requests.pop()
    await enterPin()
    const signed = await signing
    expect(signed.map((tx) => tx.getOutput(0).amount)).toEqual([9_000n, 9_000n])
    expect(signed.every((tx) => tx.getInput(0).tapKeySig?.length === 64)).toBe(true)
    expect(protocol.connect).toHaveBeenCalledOnce()
    expect(first.getInput(0).tapKeySig).toBeUndefined()
    expect(second.getInput(0).tapKeySig).toBeUndefined()
  })

  it('snapshots a single transaction and its selection before waiting for the PIN', async () => {
    const identity = await bridge.loadNativeIdentity(encodedKey)
    const tx = Transaction.fromPSBT(psbt())
    const inputIndexes = [0]
    const signing = identity.sign(tx, inputIndexes)
    await vi.waitFor(() => expect(pin.getNativeSigningPinRequest()).toBeTypeOf('number'))
    tx.updateOutput(0, { amount: 8_000n })
    inputIndexes[0] = 1
    await enterPin()
    const signed = await signing
    expect(signed.getOutput(0).amount).toBe(9_000n)
    expect(signed.getInput(0).tapKeySig).toHaveLength(64)
  })

  it('snapshots a message hash before waiting for the PIN', async () => {
    const identity = await bridge.loadNativeIdentity(encodedKey)
    const hash = digest.slice()
    const signing = identity.signMessage(hash, 'schnorr')
    await vi.waitFor(() => expect(pin.getNativeSigningPinRequest()).toBeTypeOf('number'))
    hash.fill(9)
    await enterPin()
    expect(schnorr.verify(await signing, digest, publicKey.slice(1))).toBe(true)
  })

  it('rejects invalid later inputs and batch requests before any PIN or NFC interaction', async () => {
    const identity = await bridge.loadNativeIdentity(encodedKey)
    const tx = Transaction.fromPSBT(psbt())
    await expect(identity.sign(tx, [0, 1])).rejects.toThrow('Invalid input index')
    await expect(identity.signMultiple([{ tx }, { tx, inputIndexes: [1] }])).rejects.toThrow('Invalid input index')
    await expect(identity.signMessage(new Uint8Array(31), 'schnorr')).rejects.toThrow('32-byte')
    expect(pin.getNativeSigningPinRequest()).toBeUndefined()
    expect(protocol.channels).toHaveLength(0)
    expect(protocol.signSchnorr).not.toHaveBeenCalled()
    expect(invoke).not.toHaveBeenCalled()
  })

  it('returns already signed and unowned requests without asking for a card or PIN', async () => {
    const identity = await bridge.loadNativeIdentity(encodedKey)
    const signed = Transaction.fromPSBT(psbt())
    const script = signed.getInput(0).witnessUtxo!.script
    const hash = signed.preimageWitnessV1(0, [script], SigHash.DEFAULT, [10_000n])
    signed.updateInput(0, { tapKeySig: schnorr.sign(hash, taprootTweakPrivKey(secret, new Uint8Array())) })
    const unowned = new Transaction()
    const foreignKey = schnorr.getPublicKey(new Uint8Array(32).fill(2))
    unowned.addInput({
      txid: new Uint8Array(32),
      index: 0,
      witnessUtxo: { script: p2tr(foreignKey).script, amount: 10_000n },
      tapInternalKey: foreignKey,
    })
    unowned.addOutput({ script, amount: 9_000n })
    expect((await identity.sign(signed)).toPSBT()).toEqual(signed.toPSBT())
    expect((await identity.sign(unowned)).toPSBT()).toEqual(unowned.toPSBT())
    expect((await identity.signMultiple([{ tx: signed }, { tx: unowned }])).map((tx) => tx.toPSBT())).toEqual([
      signed.toPSBT(),
      unowned.toPSBT(),
    ])
    expect(await identity.signMultiple([])).toEqual([])
    expect(pin.getNativeSigningPinRequest()).toBeUndefined()
    expect(protocol.channels).toHaveLength(0)
    expect(invoke).not.toHaveBeenCalled()
  })

  it('rejects an invalid returned signature and closes NFC without retrying', async () => {
    const identity = await bridge.loadNativeIdentity(encodedKey)
    protocol.signSchnorr.mockResolvedValueOnce(new Uint8Array(64))
    const signing = identity.sign(Transaction.fromPSBT(psbt()))
    await enterPin()
    await expect(signing).rejects.toThrow('Invalid card Schnorr signature')
    expect(protocol.signSchnorr).toHaveBeenCalledOnce()
    expect(protocol.disconnect).toHaveBeenCalledOnce()
    expect(bridge.getNativeCardState().status).toBe('disconnected')
  })

  it('rejects another card before reaching any signing method', async () => {
    const identity = await bridge.loadNativeIdentity(encodedKey)
    protocol.connect.mockResolvedValueOnce(secp256k1.getPublicKey(new Uint8Array(32).fill(2)))
    const signing = identity.signMessage(digest, 'schnorr')
    await enterPin()
    await expect(signing).rejects.toThrow('different card')
    expect(protocol.signSchnorr).not.toHaveBeenCalled()
    expect(protocol.disconnect).toHaveBeenCalledOnce()
    expect(await identity.compressedPublicKey()).toEqual(publicKey)
  })

  it('does not open NFC when the in-app PIN prompt is cancelled', async () => {
    const identity = await bridge.loadNativeIdentity(encodedKey)
    const signing = identity.signMessage(digest, 'schnorr')
    const rejected = expect(signing).rejects.toMatchObject({ code: 'USER_CANCELLED' })
    await vi.waitFor(() => expect(pin.getNativeSigningPinRequest()).toBeTypeOf('number'))
    pin.cancelNativeSigningPin()
    await rejected
    expect(invoke.mock.calls.some(([command]) => command.endsWith('|open'))).toBe(false)
    expect(protocol.connect).not.toHaveBeenCalled()
    expect(unregister).toHaveBeenCalledOnce()
  })

  it('does not retry the PIN or reopen the reader after a wrong PIN', async () => {
    const identity = await bridge.loadNativeIdentity(encodedKey)
    protocol.connect.mockRejectedValueOnce(new Error('Incorrect PIN. No retry was attempted.'))
    const signing = identity.signMessage(digest, 'schnorr')
    await enterPin()
    await expect(signing).rejects.toThrow('Incorrect PIN')
    expect(protocol.connect).toHaveBeenCalledOnce()
    expect(invoke.mock.calls.filter(([command]) => command.endsWith('|open'))).toHaveLength(1)
    expect(protocol.signSchnorr).not.toHaveBeenCalled()
    expect(pin.getNativeSigningPinRequest()).toBeUndefined()
  })

  it('closes once after cancelling the system NFC sheet without attempting the PIN', async () => {
    const identity = await bridge.loadNativeIdentity(encodedKey)
    invoke.mockRejectedValueOnce(Object.assign(new Error('Card connection cancelled.'), { code: 'USER_CANCELLED' }))
    const signing = identity.signMessage(digest, 'schnorr')
    await enterPin()
    await expect(signing).rejects.toThrow('cancelled')
    expect(protocol.connect).not.toHaveBeenCalled()
    expect(protocol.disconnect).toHaveBeenCalledOnce()
    expect(invoke.mock.calls.filter(([command]) => command.endsWith('|open'))).toHaveLength(1)
    expect(unregister).toHaveBeenCalledOnce()
  })

  it('does not authenticate after a cancelled reader-open result arrives late', async () => {
    const identity = await bridge.loadNativeIdentity(encodedKey)
    let completeOpen!: () => void
    invoke.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          completeOpen = () => resolve({ connected: true })
        }),
    )
    const signing = identity.signMessage(digest, 'schnorr')
    const rejected = expect(signing).rejects.toThrow()
    await enterPin()
    await vi.waitFor(() => expect(completeOpen).toBeTypeOf('function'))
    await bridge.disconnectNativeIdentity()
    completeOpen()
    await rejected
    expect(protocol.connect).not.toHaveBeenCalled()
    expect(protocol.signSchnorr).not.toHaveBeenCalled()
  })

  it('rejects a late signature after field loss and keeps the public identity', async () => {
    const identity = await bridge.loadNativeIdentity(encodedKey)
    let complete!: (signature: Uint8Array) => void
    protocol.signSchnorr.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          complete = resolve
        }),
    )
    const signing = identity.signMessage(digest, 'schnorr')
    await enterPin()
    await vi.waitFor(() => expect(protocol.signSchnorr).toHaveBeenCalledOnce())
    presence?.({ connected: false, reason: 'CARD_LOST' })
    complete(schnorr.sign(digest, secret, new Uint8Array(32)))
    await expect(signing).rejects.toBeInstanceOf(bridge.CardRequiredError)
    expect(protocol.connect).toHaveBeenCalledOnce()
    expect(protocol.disconnect).toHaveBeenCalledOnce()
    expect(await identity.compressedPublicKey()).toEqual(publicKey)
  })

  it('serializes queued signing actions and requests a fresh PIN for each tap', async () => {
    const identity = await bridge.loadNativeIdentity(encodedKey)
    const first = identity.signMessage(digest, 'schnorr')
    const second = identity.signMessage(digest, 'ecdsa')
    await enterPin()
    await first
    await vi.waitFor(() => expect(pin.getNativeSigningPinRequest()).toBeTypeOf('number'))
    expect(protocol.connect).toHaveBeenCalledOnce()
    expect(invoke.mock.calls.filter(([command]) => command.endsWith('|open'))).toHaveLength(1)
    await enterPin()
    expect(await second).toHaveLength(64)
    expect(protocol.connect).toHaveBeenCalledTimes(2)
    expect(protocol.disconnect).toHaveBeenCalledTimes(2)
  })

  it('cancels a pending PIN and aborts once when the app backgrounds', async () => {
    const identity = await bridge.loadNativeIdentity(encodedKey)
    const signing = identity.signMessage(digest, 'schnorr')
    const rejected = expect(signing).rejects.toThrow()
    await vi.waitFor(() => expect(pin.getNativeSigningPinRequest()).toBeTypeOf('number'))
    window.dispatchEvent(new Event('arkade-native-paused'))
    await rejected
    expect(protocol.connect).not.toHaveBeenCalled()
    expect(protocol.disconnect).toHaveBeenCalledOnce()
    expect(invoke.mock.calls.some(([command]) => command.endsWith('|open'))).toBe(false)
  })

  it('invalidates queued actions on lock without later PIN requests or reader opens', async () => {
    const identity = await bridge.loadNativeIdentity(encodedKey)
    const first = identity.signMessage(digest, 'schnorr')
    const second = identity.signMessage(digest, 'schnorr')
    const rejected = Promise.allSettled([first, second])
    await vi.waitFor(() => expect(pin.getNativeSigningPinRequest()).toBeTypeOf('number'))
    await bridge.disconnectNativeIdentity()
    expect((await rejected).every((result) => result.status === 'rejected')).toBe(true)
    expect(pin.getNativeSigningPinRequest()).toBeUndefined()
    expect(protocol.connect).not.toHaveBeenCalled()
    expect(invoke.mock.calls.some(([command]) => command.endsWith('|open'))).toBe(false)
  })

  it.each(['lock', 'background'] as const)(
    'rejects a completed signature when %s occurs while closing the reader',
    async (event) => {
      const identity = await bridge.loadNativeIdentity(encodedKey)
      let completeClose!: () => void
      protocol.disconnect.mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            completeClose = resolve
          }),
      )
      const signing = identity.signMessage(digest, 'schnorr')
      const rejected = expect(signing).rejects.toBeInstanceOf(bridge.CardRequiredError)
      await enterPin()
      await vi.waitFor(() => expect(completeClose).toBeTypeOf('function'))
      expect(protocol.signSchnorr).toHaveBeenCalledOnce()
      let locking: Promise<void> | undefined
      if (event === 'lock') locking = bridge.disconnectNativeIdentity()
      else window.dispatchEvent(new Event('arkade-native-paused'))
      completeClose()
      await locking
      await rejected
      expect(protocol.disconnect).toHaveBeenCalledOnce()
      expect(protocol.connect).toHaveBeenCalledOnce()
      expect(invoke.mock.calls.filter(([command]) => command.endsWith('|open'))).toHaveLength(1)
      expect(pin.getNativeSigningPinRequest()).toBeUndefined()
    },
  )

  it.each(['PIN', 'NFC sheet'] as const)(
    'cancels queued SDK calls after cancelling the first %s and permits a fresh explicit retry',
    async (stage) => {
      const identity = await bridge.loadNativeIdentity(encodedKey)
      if (stage === 'NFC sheet') invoke.mockRejectedValueOnce(new Error('Card connection cancelled.'))
      const first = identity.signMessage(digest, 'schnorr')
      const second = identity.signMessage(digest, 'schnorr')
      const settled = Promise.allSettled([first, second])
      if (stage === 'PIN') {
        await vi.waitFor(() => expect(pin.getNativeSigningPinRequest()).toBeTypeOf('number'))
        pin.cancelNativeSigningPin()
      } else await enterPin()
      expect((await settled).every((result) => result.status === 'rejected')).toBe(true)
      expect(pin.getNativeSigningPinRequest()).toBeUndefined()
      expect(protocol.connect).not.toHaveBeenCalled()
      const initialOpens = stage === 'PIN' ? 0 : 1
      expect(invoke.mock.calls.filter(([command]) => command.endsWith('|open'))).toHaveLength(initialOpens)
      const retry = identity.signMessage(digest, 'schnorr')
      await enterPin()
      expect(schnorr.verify(await retry, digest, publicKey.slice(1))).toBe(true)
      expect(protocol.connect).toHaveBeenCalledExactlyOnceWith(samplePin)
      expect(invoke.mock.calls.filter(([command]) => command.endsWith('|open'))).toHaveLength(initialOpens + 1)
    },
  )

  it('rejects a successful signature if native reader closure cannot be confirmed', async () => {
    const identity = await bridge.loadNativeIdentity(encodedKey)
    protocol.disconnect.mockRejectedValueOnce(
      Object.assign(new Error('NFC_CLOSE_UNCONFIRMED'), { code: 'NFC_CLOSE_UNCONFIRMED' }),
    )
    const signing = identity.signMessage(digest, 'schnorr')
    const rejected = expect(signing).rejects.toMatchObject({ code: 'NFC_CLOSE_UNCONFIRMED' })
    await enterPin()
    await rejected
    expect(protocol.signSchnorr).toHaveBeenCalledOnce()
    expect(protocol.disconnect).toHaveBeenCalledOnce()
    expect(invoke.mock.calls.filter(([command]) => command.endsWith('|open'))).toHaveLength(1)
    expect(unregister).toHaveBeenCalledOnce()
    expect(pin.getNativeSigningPinRequest()).toBeUndefined()
  })
})
