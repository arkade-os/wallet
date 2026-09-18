import { afterEach, describe, expect, it, vi } from 'vitest'
import { pwaCanInstall, pwaIsInstalled } from '../../lib/pwa'

const originalUA = navigator.userAgent

function setUserAgent(ua: string) {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true })
}

afterEach(() => {
  setUserAgent(originalUA)
  vi.restoreAllMocks()
})

describe('pwaCanInstall', () => {
  it('returns true in a regular mobile browser with service worker support', () => {
    Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true })
    setUserAgent(
      'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    )
    expect(pwaCanInstall()).toBe(true)
  })

  it('returns false inside an in-app browser (Facebook)', () => {
    Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true })
    setUserAgent(
      'Mozilla/5.0 (Linux; Android 13; FBAN/FB4A) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36',
    )
    expect(pwaCanInstall()).toBe(false)
  })

  it('returns false inside an Android WebView', () => {
    Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true })
    setUserAgent(
      'Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36',
    )
    expect(pwaCanInstall()).toBe(false)
  })

  it('returns false without service worker support', () => {
    Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true })
    Reflect.deleteProperty(navigator, 'serviceWorker')
    setUserAgent(
      'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    )
    expect(pwaCanInstall()).toBe(false)
  })
})

describe('pwaIsInstalled', () => {
  it('returns false when not standalone', () => {
    expect(pwaIsInstalled()).toBe(false)
  })
})
