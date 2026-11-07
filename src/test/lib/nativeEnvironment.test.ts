import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isInAppBrowser } from '../../lib/browser'
import { detectJSCapabilities } from '../../lib/jsCapabilities'

const mocks = vi.hoisted(() => ({ native: false }))
vi.mock('../../lib/nativeBridge', () => ({ isNativeHost: () => mocks.native }))

beforeEach(() => {
  mocks.native = false
  vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Linux; Android 15; Phone; wv) AppleWebKit/537.36' })
  vi.stubGlobal('Worker', class {})
  vi.stubGlobal('indexedDB', {})
  vi.stubGlobal('crypto', {
    getRandomValues: (bytes: Uint8Array) => bytes.fill(1),
    subtle: { digest: async () => new ArrayBuffer(32) },
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('native host capability gates', () => {
  it('retains the warning for generic Android webviews', () => {
    expect(isInAppBrowser()).toBe(true)
  })

  it('allows a recognized native host without service workers', async () => {
    mocks.native = true
    expect(isInAppBrowser()).toBe(false)
    expect(await detectJSCapabilities()).toEqual({ isSupported: true })
  })

  it('still requires service workers for a browser wallet', async () => {
    expect(await detectJSCapabilities()).toMatchObject({
      isSupported: false,
      errorMessage: 'Service Workers are required but not supported in this environment',
    })
  })

  it('does not bypass native storage or cryptography requirements', async () => {
    mocks.native = true
    vi.stubGlobal('indexedDB', undefined)
    expect(await detectJSCapabilities()).toMatchObject({ isSupported: false })
    vi.stubGlobal('indexedDB', {})
    vi.stubGlobal('crypto', {})
    expect(await detectJSCapabilities()).toMatchObject({ isSupported: false })
  })
})
