import base58 from 'bs58'
import { Buffer } from 'buffer'
import { arknoteHRP } from './constants'

export class ArkNoteData {
  constructor(public id: bigint, public value: number) {}

  serialize(): Buffer {
    const buffer = Buffer.alloc(12)
    buffer.writeBigUInt64BE(this.id, 0)
    buffer.writeUInt32BE(this.value, 8)
    return buffer
  }

  static deserialize(data: Buffer): ArkNoteData {
    if (data.length !== 12) {
      throw new Error(`invalid data length: expected 12 bytes, got ${data.length}`)
    }

    const id = data.readBigUInt64BE(0)
    const value = data.readUInt32BE(8)
    return new ArkNoteData(id, value)
  }
}

export class ArkNote {
  constructor(public data: ArkNoteData, public signature: Buffer) {}

  serialize(): Buffer {
    const detailsBytes = this.data.serialize()
    return Buffer.concat([detailsBytes, this.signature])
  }

  static deserialize(data: Buffer): ArkNote {
    if (data.length < 12) {
      throw new Error(`invalid data length: expected at least 12 bytes, got ${data.length}`)
    }

    const noteData = ArkNoteData.deserialize(data.subarray(0, 12))
    const signature = Buffer.from(data.subarray(12))

    if (signature.length !== 64) {
      throw new Error(`invalid signature length: expected 64 bytes, got ${signature.length}`)
    }

    return new ArkNote(noteData, signature)
  }

  static fromString(noteStr: string): ArkNote {
    if (!noteStr.startsWith(arknoteHRP)) {
      throw new Error(`invalid human-readable part: expected ${arknoteHRP} prefix (note '${noteStr}')`)
    }

    const encoded = noteStr.slice(arknoteHRP.length)
    if (encoded.length < 103 || encoded.length > 104) {
      throw new Error(`invalid note length: expected 103 or 104 chars, got ${encoded.length}`)
    }

    const decoded = base58.decode(encoded)
    if (decoded.length === 0) {
      throw new Error('failed to decode base58 string')
    }

    return ArkNote.deserialize(Buffer.from(decoded))
  }

  toString(): string {
    return arknoteHRP + base58.encode(this.serialize())
  }
}

export const isArkNote = (input: string): boolean => {
  const regex = new RegExp(`^${arknoteHRP}`, 'i')
  return regex.test(input) && input.length > 100
}

export const arkNoteInUrl = (): string => {
  const fragment = window.location.hash.slice(1).replace('web+arkade://', '')
  return isArkNote(fragment) ? fragment : ''
}
