import '@testing-library/jest-dom/vitest'
import { setupIonicReact } from '@ionic/react'
import { afterEach, beforeEach, vi } from 'vitest'

// jsdom adds ontouchstart which makes isMobileBrowser=true; remove it to simulate desktop
delete (window as any).ontouchstart

const createMatchMedia = (query: string): MediaQueryList =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList

setupIonicReact()

// Provide a stable matchMedia implementation for tests (used by useReducedMotion, usePwaInstalled, etc.).
// Keep this as a plain function so vi.restoreAllMocks() does not reset it.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: createMatchMedia,
})

// Silence noisy console output while preserving console identity
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})
