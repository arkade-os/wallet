import { schnorr, secp256k1 } from '@noble/curves/secp256k1.js'
import { Script, SigHash } from '@scure/btc-signer'
import { tapLeafHash } from '@scure/btc-signer/payment.js'
import { getPrevOut } from '@scure/btc-signer/transaction.js'
import { concatBytes, equalBytes, taprootTweakPubkey } from '@scure/btc-signer/utils.js'
import {
  assertAllowedSighashTypes,
  Transaction,
  TreeSignerSession,
  type BatchSignableIdentity,
  type SignRequest,
} from '@arkade-os/sdk'

export interface SatochipCard {
  getPublicKey(): Promise<Uint8Array>
  // null bypasses tweaking; an empty array requests the BIP86 tweak.
  signSchnorr(hash: Uint8Array, tweak: Uint8Array | null): Promise<Uint8Array>
  signEcdsa(hash: Uint8Array): Promise<Uint8Array>
}

const ALLOWED_SIGHASH = [SigHash.DEFAULT, SigHash.ALL, SigHash.ALL_ANYONECANPAY]

type SignatureSlot = {
  index: number
  digest: Uint8Array
  publicKey: Uint8Array
  tweak: Uint8Array | null
  sighash: number
  leafHash?: Uint8Array
}
type PreparedSigning = { tx: Transaction; publicKey: Uint8Array; slots: SignatureSlot[] }

export class SatochipIdentity implements BatchSignableIdentity {
  private constructor(
    private readonly card: SatochipCard,
    private readonly publicKey: Uint8Array,
  ) {}

  static async create(card: SatochipCard): Promise<SatochipIdentity> {
    const publicKey = new Uint8Array(await card.getPublicKey())
    if (publicKey.length !== 33 || ![2, 3].includes(publicKey[0])) {
      throw new Error('Satochip must return a compressed secp256k1 public key')
    }
    secp256k1.Point.fromBytes(publicKey).assertValidity()
    return new SatochipIdentity(card, publicKey)
  }

  async compressedPublicKey(): Promise<Uint8Array> {
    return this.publicKey.slice()
  }

  async xOnlyPublicKey(): Promise<Uint8Array> {
    return this.publicKey.slice(1)
  }

  signerSession(): TreeSignerSession {
    return TreeSignerSession.random()
  }

  async signMessage(hash: Uint8Array, type: 'schnorr' | 'ecdsa' = 'schnorr'): Promise<Uint8Array> {
    if (hash.length !== 32) throw new Error('Expected a 32-byte message hash')
    const digest = new Uint8Array(hash)
    if (type === 'schnorr') return this.schnorrSignature(digest, null, this.publicKey.slice(1))
    if (type !== 'ecdsa') throw new Error('Unsupported signature type')
    let signature = secp256k1.Signature.fromBytes(new Uint8Array(await this.card.signEcdsa(digest.slice())), 'der')
    if (signature.hasHighS()) {
      signature = new secp256k1.Signature(signature.r, secp256k1.Point.Fn.ORDER - signature.s)
    }
    const compact = signature.toBytes('compact')
    if (!secp256k1.verify(compact, digest, this.publicKey, { prehash: false })) {
      throw new Error('Invalid card ECDSA signature')
    }
    return compact
  }

  async signMultiple(requests: SignRequest[]): Promise<Transaction[]> {
    const prepared = requests.map(({ tx, inputIndexes }) => prepareSatochipSigning(tx, this.publicKey, inputIndexes))
    const signed: Transaction[] = []
    for (const request of prepared) signed.push(await this.signPrepared(request))
    return signed
  }

  async sign(tx: Transaction, inputIndexes?: number[]): Promise<Transaction> {
    return this.signPrepared(prepareSatochipSigning(tx, this.publicKey, inputIndexes))
  }

  async signPrepared(prepared: PreparedSigning): Promise<Transaction> {
    if (!equalBytes(prepared.publicKey, this.publicKey)) throw new Error('Signing request belongs to a different card')
    for (const { index, digest, publicKey, tweak, sighash, leafHash } of prepared.slots) {
      const raw = await this.schnorrSignature(digest, tweak, publicKey)
      const signature = sighash === SigHash.DEFAULT ? raw : concatBytes(raw, Uint8Array.of(sighash))
      prepared.tx.updateInput(
        index,
        leafHash ? { tapScriptSig: [[{ pubKey: publicKey, leafHash }, signature]] } : { tapKeySig: signature },
      )
    }
    return prepared.tx
  }

  private async schnorrSignature(
    digest: Uint8Array,
    tweak: Uint8Array | null,
    publicKey: Uint8Array,
  ): Promise<Uint8Array> {
    const signature = new Uint8Array(await this.card.signSchnorr(digest.slice(), tweak?.slice() ?? null))
    if (signature.length !== 64 || !schnorr.verify(signature, digest, publicKey)) {
      throw new Error('Invalid card Schnorr signature')
    }
    return signature
  }
}

export function prepareSatochipSigning(tx: Transaction, cardKey: Uint8Array, inputIndexes?: number[]): PreparedSigning {
  // Reparse with commitment checks enabled, even if the caller disabled them.
  const signed = Transaction.fromPSBT(tx.toPSBT(), { disableScriptCheck: false })
  assertAllowedSighashTypes(signed, ALLOWED_SIGHASH)
  const indexes = inputIndexes?.slice() ?? Array.from({ length: signed.inputsLength }, (_, i) => i)
  const publicKey = cardKey.slice(1)
  const slots: SignatureSlot[] = []
  for (const index of new Set(indexes)) {
    if (!Number.isInteger(index) || index < 0 || index >= signed.inputsLength) {
      throw new Error(`Invalid input index: ${index}`)
    }
    const input = signed.getInput(index)
    if (input.finalScriptWitness?.length || input.finalScriptSig?.length) {
      if (inputIndexes) throw new Error(`Input ${index} is already finalized`)
      continue
    }
    const leaves = (input.tapLeafScript ?? []).filter(([, script]) =>
      Script.decode(script.subarray(0, -1)).some((part) => part instanceof Uint8Array && equalBytes(part, publicKey)),
    )
    const keyPath = input.tapInternalKey && equalBytes(input.tapInternalKey, publicKey)
    if (!leaves.length && !keyPath) {
      if (inputIndexes) throw new Error(`Input ${index} is not signable by this card`)
      continue
    }
    const prevout = getPrevOut(input)
    if (prevout.script.length !== 34 || prevout.script[0] !== 0x51 || prevout.script[1] !== 32) {
      throw new Error('Satochip supports Taproot inputs in this host')
    }
    const sighash = input.sighashType ?? SigHash.DEFAULT
    const prevouts = Array.from({ length: signed.inputsLength }, (_, i) => {
      if (i !== index && sighash === SigHash.ALL_ANYONECANPAY) {
        return { script: new Uint8Array(), amount: 0n }
      }
      return getPrevOut(signed.getInput(i))
    })
    const scripts = prevouts.map((output) => output.script)
    const amounts = prevouts.map((output) => output.amount)
    if (leaves.length) {
      for (const [, scriptWithVersion] of leaves) {
        const version = scriptWithVersion[scriptWithVersion.length - 1]
        const script = scriptWithVersion.subarray(0, -1)
        if (version !== 0xc0 || Script.decode(script).includes('CODESEPARATOR')) {
          throw new Error('Unsupported tapscript version or OP_CODESEPARATOR')
        }
        const leafHash = tapLeafHash(script, version)
        const digest = signed.preimageWitnessV1(index, scripts, sighash, amounts, undefined, script, version)
        const existing = input.tapScriptSig?.find(
          ([key]) => equalBytes(key.pubKey, publicKey) && equalBytes(key.leafHash, leafHash),
        )?.[1]
        if (existing) checkExisting(existing, digest, publicKey, sighash)
        else slots.push({ index, digest, publicKey, tweak: null, sighash, leafHash })
      }
    } else {
      if (input.tapLeafScript?.length && !input.tapMerkleRoot) {
        throw new Error('Key-path signing with a script tree requires tapMerkleRoot')
      }
      const root = input.tapMerkleRoot ?? new Uint8Array()
      const [outputKey] = taprootTweakPubkey(publicKey, root)
      if (!equalBytes(outputKey, prevout.script.subarray(2))) {
        throw new Error('Taproot output does not match the card key and tweak')
      }
      const digest = signed.preimageWitnessV1(index, scripts, sighash, amounts)
      if (input.tapKeySig) checkExisting(input.tapKeySig, digest, outputKey, sighash)
      else slots.push({ index, digest, publicKey: outputKey, tweak: root, sighash })
    }
  }
  return { tx: signed, publicKey: cardKey.slice(), slots }
}

function checkExisting(signature: Uint8Array, digest: Uint8Array, publicKey: Uint8Array, sighash: number): void {
  const expectedLength = sighash === SigHash.DEFAULT ? 64 : 65
  if (
    signature.length !== expectedLength ||
    (expectedLength === 65 && signature[64] !== sighash) ||
    !schnorr.verify(signature.subarray(0, 64), digest, publicKey)
  ) {
    throw new Error('Invalid existing signature for this card')
  }
}
