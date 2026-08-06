import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi } from 'vitest'

// Some tests opt out of jsdom (`@vitest-environment node`) because a
// dependency's instanceof checks break across jsdom's realm boundary; every
// window-dependent shim below is skipped there.
const hasDom = typeof window !== 'undefined'

// jsdom adds ontouchstart which makes isMobileBrowser=true; remove it to simulate desktop
if (hasDom) delete (window as any).ontouchstart

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

// Provide a stable matchMedia implementation for tests (used by useReducedMotion, usePwaInstalled, etc.).
// Keep this as a plain function so vi.restoreAllMocks() does not reset it.
if (hasDom) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: createMatchMedia,
  })
}

// Silence noisy console output while preserving console identity
beforeEach(() => {
  if (!hasDom) return
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})
