import { expect, it, vi } from 'vitest'
import { ArkadeCash } from '@arkade-os/sdk'
import { readCashFromNfc } from '../../lib/arkadeCashNfc'

let lastReader: { scan: ReturnType<typeof vi.fn> } | undefined

it('skips unrelated NFC records without rejecting a later voucher', async () => {
  const token = ArkadeCash.generate(
    new Uint8Array(32).fill(2),
    { type: 'blocks', value: 144n },
    'tarkadecash',
  ).toString()
  const encode = (value: string) => new TextEncoder().encode(value) as Uint8Array<ArrayBuffer>
  class Reader {
    addEventListener(name: string, callback: (event: unknown) => void) {
      if (name === 'reading') {
        queueMicrotask(() =>
          callback({
            message: {
              records: [
                { recordType: 'text', data: encode('other wallet data') },
                { recordType: 'text', data: encode(token) },
              ],
            },
          }),
        )
      }
    }
    removeEventListener() {}
    scan = vi.fn(async () => {})
  }
  lastReader = new Reader()
  const construct = function () {
    return lastReader
  }
  Object.defineProperty(window, 'NDEFReader', { configurable: true, value: construct })
  await expect(readCashFromNfc(new AbortController().signal)).resolves.toBe(token)
  expect(lastReader?.scan).toHaveBeenCalledOnce()
})
