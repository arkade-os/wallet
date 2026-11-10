import { parseCashToken } from './arkadeCashTransfer'
type NdefLifecycle = {
  scan(options?: { signal?: AbortSignal }): Promise<void>
  write(data: { records: { recordType: string; data: string }[] }): Promise<void>
  addEventListener(event: string, listener: (event: Event) => void): void
  removeEventListener(event: string, listener: (event: Event) => void): void
}

export const nfcSupported = () => typeof window !== 'undefined' && 'NDEFReader' in window
const ndefConstructor = () => {
  const Constructor = (window as Window & { NDEFReader?: NdefLifecycleConstructor }).NDEFReader
  if (!Constructor) throw new Error('NFC is unavailable in this browser')
  return new Constructor()
}
type NdefLifecycleConstructor = new () => NdefLifecycle

export async function writeCashToNfc(token: string): Promise<void> {
  if (!nfcSupported()) throw new Error('NFC is unavailable in this browser. Use QR or sharing instead.')
  await ndefConstructor().write({ records: [{ recordType: 'text', data: token }] })
}

export async function readCashFromNfc(signal: AbortSignal): Promise<string> {
  if (!nfcSupported()) throw new Error('NFC is unavailable in this browser. Use QR or paste instead.')
  return new Promise((resolve, reject) => {
    const reader = ndefConstructor()
    const stop = () => {
      reader.removeEventListener('reading', reading)
      reader.removeEventListener('readingerror', failed)
      signal.removeEventListener('abort', aborted)
    }
    const reading = (event: Event) => {
      try {
        const value = (
          event as unknown as { message: { records: { data: DataView; recordType: string }[] } }
        ).message.records
          .filter((record) => record.recordType === 'text' || record.recordType === 'mime')
          .map((record) => new TextDecoder().decode(record.data))
        const token = value.flatMap((text) => {
          try {
            return [parseCashToken(text)]
          } catch {
            return []
          }
        })[0]
        if (!value.length || !token) throw new Error('No Arkade Cash voucher was found on this tag')
        stop()
        resolve(token)
      } catch (err) {
        stop()
        reject(err)
      }
    }
    const failed = () => {
      stop()
      reject(new Error('Could not read the NFC tag'))
    }
    const aborted = () => {
      stop()
      reject(new DOMException('Aborted', 'AbortError'))
    }
    reader.addEventListener('reading', reading)
    reader.addEventListener('readingerror', failed)
    signal.addEventListener('abort', aborted)
    void reader.scan({ signal }).catch((err: unknown) => {
      stop()
      reject(err)
    })
  })
}
