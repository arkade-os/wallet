import '@testing-library/jest-dom/vitest'
import { setupIonicReact } from '@ionic/react'
import { afterEach, beforeEach, vi } from 'vitest'

// jsdom adds ontouchstart which makes isMobileBrowser=true; remove it to simulate desktop
delete (window as any).ontouchstart

// jsdom does not implement window.matchMedia; provide a minimal stub
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string): MediaQueryList =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  })
}

setupIonicReact()

// Silence noisy console output while preserving console identity
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})
