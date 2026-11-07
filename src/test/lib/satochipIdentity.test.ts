// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { Buffer } from 'node:buffer'
import {
  BIP322,
  DefaultVtxo,
  DelegateVtxo,
  MultisigTapscript,
  Proof,
  setArkPsbtField,
  SingleKey,
  Transaction,
  verifyTapscriptSignatures,
  VtxoScript,
  VtxoTaprootTree,
  VHTLC,
} from '@arkade-os/sdk'
import { schnorr, secp256k1 } from '@noble/curves/secp256k1.js'
import { hex } from '@scure/base'
import { p2tr, Script, SigHash } from '@scure/btc-signer'
import { taprootTweakPrivKey } from '@scure/btc-signer/utils.js'
import { tapLeafHash } from '@scure/btc-signer/payment.js'
import { SatochipIdentity } from '../../lib/satochipIdentity'

const secret = new Uint8Array(32).fill(1)
const publicKey = secp256k1.getPublicKey(secret)
const payment = p2tr(publicKey.slice(1))

function transaction(): Transaction {
  const tx = new Transaction()
  tx.addInput({
    txid: new Uint8Array(32).fill(1),
    index: 0,
    witnessUtxo: { script: payment.script, amount: 10_000n },
    tapInternalKey: publicKey.slice(1),
  })
  tx.addOutput({ script: payment.script, amount: 9_000n })
  return tx
}

async function fixture(key: Uint8Array = publicKey) {
  const card = {
    getPublicKey: vi.fn(async () => key.slice()),
    signSchnorr: vi.fn(async (hash: Uint8Array, root: Uint8Array | null) =>
      schnorr.sign(hash, root === null ? secret : taprootTweakPrivKey(secret, root), new Uint8Array(32)),
    ),
    signEcdsa: vi.fn(async (hash: Uint8Array) => secp256k1.sign(hash, secret, { prehash: false, format: 'der' })),
  }
  return { card, identity: await SatochipIdentity.create(card) }
}

function contractLeaves() {
  const walletKey = publicKey.slice(1)
  const serverKey = schnorr.getPublicKey(new Uint8Array(32).fill(2))
  const otherKey = schnorr.getPublicKey(new Uint8Array(32).fill(3))
  const options = { pubKey: walletKey, serverPubKey: serverKey, csvTimelock: { type: 'blocks' as const, value: 144n } }
  const standard = new DefaultVtxo.Script(options)
  const delegated = new DelegateVtxo.Script({ ...options, delegatePubKey: otherKey })
  const additive = new VtxoScript([
    MultisigTapscript.encode({ pubkeys: [walletKey, serverKey], type: MultisigTapscript.MultisigType.CHECKSIGADD })
      .script,
  ])
  const cases = [
    { name: 'default cooperative', script: standard, leaf: standard.forfeit() },
    { name: 'default CSV exit', script: standard, leaf: standard.exit() },
    { name: 'delegate cooperative', script: delegated, leaf: delegated.forfeit() },
    { name: 'delegate CSV exit', script: delegated, leaf: delegated.exit() },
    { name: 'delegate three cosigners', script: delegated, leaf: delegated.delegate() },
    { name: 'CHECKSIGADD', script: additive, leaf: additive.leaves[0] },
  ]
  for (const [version, ScriptClass] of [
    ['V1', VHTLC.Script],
    ['V2', VHTLC.ScriptV2],
  ] as const) {
    for (const role of ['sender', 'receiver'] as const) {
      const script = new ScriptClass({
        sender: role === 'sender' ? walletKey : otherKey,
        receiver: role === 'receiver' ? walletKey : otherKey,
        server: serverKey,
        preimageHash: new Uint8Array(20).fill(4),
        refundLocktime: 1_800_000_000n,
        unilateralClaimDelay: { type: 'blocks', value: 144n },
        unilateralRefundDelay: { type: 'blocks', value: 288n },
        unilateralRefundWithoutReceiverDelay: { type: 'blocks', value: 432n },
      })
      const paths =
        role === 'sender'
          ? (['refund', 'refundWithoutReceiver', 'unilateralRefund', 'unilateralRefundWithoutReceiver'] as const)
          : (['claim', 'refund', 'unilateralClaim', 'unilateralRefund'] as const)
      for (const path of paths) cases.push({ name: `VHTLC ${version} ${role} ${path}`, script, leaf: script[path]() })
    }
  }
  return cases
}

describe('Satochip published SDK signing conformance', () => {
  it.each(contractLeaves())('signs exact $name leaf bytes and tree commitment', async ({ script, leaf }) => {
    const { identity, card } = await fixture()
    const tx = new Transaction({ version: 3 })
    tx.addInput({
      txid: new Uint8Array(32).fill(5),
      index: 0,
      sequence: 432,
      witnessUtxo: { script: script.pkScript, amount: 10_000n },
      tapLeafScript: [leaf],
      sighashType: SigHash.ALL,
    })
    tx.addOutput({ script: payment.script, amount: 9_000n })
    setArkPsbtField(tx, 0, VtxoTaprootTree, script.encode())
    const original = tx.toPSBT()
    const signed = await identity.sign(tx)
    const body = leaf[1].subarray(0, -1)
    const digest = tx.preimageWitnessV1(0, [script.pkScript], SigHash.ALL, [10_000n], undefined, body, 0xc0)
    const signatures = signed.getInput(0).tapScriptSig!
    expect(signatures).toHaveLength(1)
    expect(signatures[0][0]).toEqual({ pubKey: publicKey.slice(1), leafHash: tapLeafHash(body, 0xc0) })
    expect(signatures[0][1][64]).toBe(SigHash.ALL)
    expect(schnorr.verify(signatures[0][1].subarray(0, 64), digest, publicKey.slice(1))).toBe(true)
    expect(signed.getInput(0).tapLeafScript).toEqual(tx.getInput(0).tapLeafScript)
    expect(signed.getInput(0).unknown).toEqual(tx.getInput(0).unknown)
    expect(signed.getInput(0).witnessUtxo).toEqual(tx.getInput(0).witnessUtxo)
    expect(signed.getOutput(0)).toEqual(tx.getOutput(0))
    expect(tx.toPSBT()).toEqual(original)
    expect(card.signSchnorr).toHaveBeenCalledExactlyOnceWith(digest, null)
  })

  it('signs the SDK zero-value synthetic proof with its ALL sighash', async () => {
    const { identity } = await fixture()
    const { script, leaf } = contractLeaves()[0]
    const proof = Proof.create('Arkade native signing conformance', [
      {
        txid: new Uint8Array(32).fill(6),
        index: 0,
        witnessUtxo: { script: script.pkScript, amount: 10_000n },
        tapLeafScript: [leaf],
      },
    ])
    expect(proof.getInput(0).witnessUtxo!.amount).toBe(0n)
    const signed = await identity.sign(proof)
    const body = leaf[1].subarray(0, -1)
    const digest = proof.preimageWitnessV1(
      1,
      [proof.getInput(0).witnessUtxo!.script, script.pkScript],
      SigHash.ALL,
      [0n, 10_000n],
      undefined,
      body,
      0xc0,
    )
    const signature = signed.getInput(1).tapScriptSig![0][1]
    expect(signature[64]).toBe(SigHash.ALL)
    expect(schnorr.verify(signature.subarray(0, 64), digest, publicKey.slice(1))).toBe(true)
  })

  it('produces a valid zero-value BIP322 proof with the BIP86 key tweak', async () => {
    const { identity, card } = await fixture()
    const message = 'Arkade native card proof'
    const proof = await BIP322.sign(message, identity)
    expect(BIP322.verify(message, proof, payment.address!)).toBe(true)
    expect(BIP322.verify(`${message} changed`, proof, payment.address!)).toBe(false)
    expect(card.signSchnorr).toHaveBeenCalledExactlyOnceWith(expect.any(Uint8Array), new Uint8Array())
  })
})

describe('Satochip identity signing preparation', () => {
  it.each([SigHash.DEFAULT, SigHash.ALL, SigHash.ALL_ANYONECANPAY])(
    'preserves cosigner signatures and Ark fields while signing tapscript sighash %i',
    async (sighashType) => {
      const { card, identity } = await fixture()
      const operatorSecret = new Uint8Array(32).fill(2)
      const operatorKey = schnorr.getPublicKey(operatorSecret)
      const leaf = MultisigTapscript.encode({
        pubkeys: [publicKey.slice(1), operatorKey],
        type: MultisigTapscript.MultisigType.CHECKSIG,
      })
      const script = new VtxoScript([leaf.script])
      const original = new Transaction()
      original.addInput({
        txid: new Uint8Array(32).fill(2),
        index: 1,
        witnessUtxo: { script: script.pkScript, amount: 10_000n },
        tapLeafScript: [script.leaves[0]],
        sighashType,
      })
      original.addOutput({ script: payment.script, amount: 9_000n })
      setArkPsbtField(original, 0, VtxoTaprootTree, script.encode())
      const tx = await SingleKey.fromPrivateKey(operatorSecret).sign(original)
      const before = tx.toPSBT()
      const signed = await identity.sign(tx)
      expect(tx.toPSBT()).toEqual(before)
      expect(signed.getInput(0).unknown).toEqual(tx.getInput(0).unknown)
      expect(signed.getInput(0).tapScriptSig).toContainEqual(tx.getInput(0).tapScriptSig![0])
      verifyTapscriptSignatures(signed, 0, [hex.encode(publicKey.slice(1)), hex.encode(operatorKey)], [], [sighashType])
      expect(card.signSchnorr).toHaveBeenCalledExactlyOnceWith(expect.any(Uint8Array), null)
      card.signSchnorr.mockClear()
      expect((await identity.sign(signed)).toPSBT()).toEqual(signed.toPSBT())
      expect(card.signSchnorr).not.toHaveBeenCalled()
    },
  )

  it('signs a script-tree key-path with its committed tweak', async () => {
    const { card, identity } = await fixture()
    const tree = p2tr(publicKey.slice(1), {
      script: Script.encode([schnorr.getPublicKey(new Uint8Array(32).fill(2)), 'CHECKSIG']),
    })
    const tx = new Transaction()
    tx.addInput({
      txid: new Uint8Array(32).fill(1),
      index: 0,
      witnessUtxo: { script: tree.script, amount: 10_000n },
      tapInternalKey: publicKey.slice(1),
      tapMerkleRoot: tree.tapMerkleRoot,
    })
    tx.addOutput({ script: payment.script, amount: 9_000n })
    const signed = await identity.sign(tx)
    const hash = tx.preimageWitnessV1(0, [tree.script], SigHash.DEFAULT, [10_000n])
    expect(schnorr.verify(signed.getInput(0).tapKeySig!, hash, tree.script.slice(2))).toBe(true)
    expect(card.signSchnorr).toHaveBeenCalledExactlyOnceWith(hash, tree.tapMerkleRoot)
  })

  it('signs only selected inputs and rejects a mismatched Taproot commitment before the card', async () => {
    const { card, identity } = await fixture()
    const tx = transaction()
    tx.addInput({ ...tx.getInput(0), index: 1 })
    const signed = await identity.sign(tx, [1, 1])
    expect(signed.getInput(0).tapKeySig).toBeUndefined()
    expect(signed.getInput(1).tapKeySig).toHaveLength(64)
    expect(card.signSchnorr).toHaveBeenCalledOnce()
    card.signSchnorr.mockClear()
    const changed = Transaction.fromPSBT(transaction().toPSBT(), { disableScriptCheck: true })
    changed.updateInput(0, {
      witnessUtxo: { amount: 10_000n, script: p2tr(schnorr.getPublicKey(new Uint8Array(32).fill(2))).script },
    })
    await expect(identity.sign(changed)).rejects.toThrow()
    expect(card.signSchnorr).not.toHaveBeenCalled()
  })

  it('preflights every selected input before asking the card to sign', async () => {
    const { card, identity } = await fixture()
    await expect(identity.sign(transaction(), [0, 1])).rejects.toThrow('Invalid input index')
    expect(card.signSchnorr).not.toHaveBeenCalled()
  })

  it('preflights the entire batch before asking the card to sign', async () => {
    const { card, identity } = await fixture()
    await expect(
      identity.signMultiple([{ tx: transaction() }, { tx: transaction(), inputIndexes: [1] }]),
    ).rejects.toThrow('Invalid input index')
    expect(card.signSchnorr).not.toHaveBeenCalled()
  })

  it('snapshots later batch transactions and indexes before the first card response', async () => {
    const { card, identity } = await fixture()
    let release!: () => void
    const normal = card.signSchnorr.getMockImplementation()!
    card.signSchnorr.mockImplementationOnce(async (hash, root) => {
      await new Promise<void>((resolve) => {
        release = resolve
      })
      return normal(hash, root)
    })
    const second = transaction()
    const inputIndexes = [0]
    const signing = identity.signMultiple([{ tx: transaction() }, { tx: second, inputIndexes }])
    await vi.waitFor(() => expect(release).toBeTypeOf('function'))
    second.updateOutput(0, { amount: 8_000n })
    inputIndexes[0] = 1
    release()
    const signed = await signing
    expect(signed[1].getOutput(0).amount).toBe(9_000n)
    expect(signed[1].getInput(0).tapKeySig).toHaveLength(64)
    expect(second.getInput(0).tapKeySig).toBeUndefined()
  })

  it.each([
    ['schnorr', false],
    ['ecdsa', false],
    ['schnorr', true],
    ['ecdsa', true],
  ] as const)('snapshots a %s hash before the card response (Buffer: %s)', async (type, buffer) => {
    const { card, identity } = await fixture()
    let release!: () => void
    const blocked = new Promise<void>((resolve) => {
      release = resolve
    })
    if (type === 'schnorr') {
      const normal = card.signSchnorr.getMockImplementation()!
      card.signSchnorr.mockImplementationOnce(async (hash, root) => {
        await blocked
        return normal(hash, root)
      })
    } else {
      const normal = card.signEcdsa.getMockImplementation()!
      card.signEcdsa.mockImplementationOnce(async (hash) => {
        await blocked
        return normal(hash)
      })
    }
    const hash = buffer ? Buffer.alloc(32, 7) : new Uint8Array(32).fill(7)
    const original = new Uint8Array(hash)
    const signing = identity.signMessage(hash, type)
    hash.fill(8)
    release()
    const signature = await signing
    expect(
      type === 'schnorr'
        ? schnorr.verify(signature, original, publicKey.slice(1))
        : secp256k1.verify(signature, original, publicKey, { prehash: false }),
    ).toBe(true)
  })

  it('copies a Buffer-backed card public key before caching or exposing it', async () => {
    const returnedKey = Buffer.from(publicKey)
    const { identity } = await fixture(returnedKey)
    returnedKey.fill(0)
    expect(await identity.compressedPublicKey()).toEqual(publicKey)
    const exposedKey = await identity.compressedPublicKey()
    exposedKey.fill(0)
    expect(await identity.compressedPublicKey()).toEqual(publicKey)
  })

  it('copies a Buffer-backed card signature before returning it', async () => {
    const { card, identity } = await fixture()
    const hash = new Uint8Array(32).fill(7)
    const returned = Buffer.from(schnorr.sign(hash, secret, new Uint8Array(32)))
    const expected = new Uint8Array(returned)
    card.signSchnorr.mockResolvedValueOnce(returned)
    const signature = await identity.signMessage(hash, 'schnorr')
    returned.fill(0)
    expect(signature).toEqual(expected)
  })

  it('validates a later existing signature before signing an earlier input', async () => {
    const { card, identity } = await fixture()
    const tx = transaction()
    tx.addInput({ ...tx.getInput(0), index: 1, tapKeySig: new Uint8Array(64).fill(1) })
    await expect(identity.sign(tx)).rejects.toThrow('Invalid existing signature')
    expect(card.signSchnorr).not.toHaveBeenCalled()
  })

  it('rejects an invalid card signature without modifying the caller transaction', async () => {
    const { card, identity } = await fixture()
    const tx = transaction()
    card.signSchnorr.mockResolvedValueOnce(new Uint8Array(64))
    await expect(identity.sign(tx)).rejects.toThrow('Invalid card Schnorr signature')
    expect(tx.getInput(0).tapKeySig).toBeUndefined()
  })
})
