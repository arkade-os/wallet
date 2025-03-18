// TODO move to @arklabs/wallet-sdk

import { arknoteHRP } from './constants'
import { base58 } from '@scure/base'

export class ArkNoteData {
  constructor(public id: bigint, public value: number) {}

  serialize(): Uint8Array {
    const array = new Uint8Array(12)
    writeBigUInt64BE(array, this.id, 0)
    writeUInt32BE(array, this.value, 8)
    return array
  }

  static deserialize(data: Uint8Array): ArkNoteData {
    if (data.length !== 12) {
      throw new Error(`invalid data length: expected 12 bytes, got ${data.length}`)
    }

    const id = readBigUInt64BE(data, 0)
    const value = readUInt32BE(data, 8)
    return new ArkNoteData(id, value)
  }
}

export class ArkNote {
  constructor(public data: ArkNoteData, public signature: Uint8Array) {}

  serialize(): Uint8Array {
    const detailsBytes = this.data.serialize()
    const result = new Uint8Array(detailsBytes.length + this.signature.length)
    result.set(detailsBytes)
    result.set(this.signature, detailsBytes.length)
    return result
  }

  static deserialize(data: Uint8Array): ArkNote {
    if (data.length < 12) {
      throw new Error(`invalid data length: expected at least 12 bytes, got ${data.length}`)
    }

    const noteData = ArkNoteData.deserialize(data.subarray(0, 12))
    const signature = data.subarray(12)

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

    return ArkNote.deserialize(new Uint8Array(decoded))
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

function writeBigUInt64BE(array: Uint8Array, value: bigint, offset: number): void {
  const view = new DataView(array.buffer, array.byteOffset + offset, 8)
  view.setBigUint64(0, value, false)
}

function readBigUInt64BE(array: Uint8Array, offset: number): bigint {
  const view = new DataView(array.buffer, array.byteOffset + offset, 8)
  return view.getBigUint64(0, false)
}

function writeUInt32BE(array: Uint8Array, value: number, offset: number): void {
  const view = new DataView(array.buffer, array.byteOffset + offset, 4)
  view.setUint32(0, value, false)
}

function readUInt32BE(array: Uint8Array, offset: number): number {
  const view = new DataView(array.buffer, array.byteOffset + offset, 4)
  return view.getUint32(0, false)
}
