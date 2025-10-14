import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { isProduction, shouldInitializeSentry } from '../../lib/sentry'

describe('Sentry utilities', () => {
  let originalHostname: string

  beforeEach(() => {
    originalHostname = window.location.hostname
  })

  afterEach(() => {
    // Restore original hostname
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        hostname: originalHostname,
      },
      writable: true,
    })
  })

  describe('isProduction', () => {
    it('should return false for localhost', () => {
      Object.defineProperty(window, 'location', {
        value: {
          ...window.location,
          hostname: 'localhost',
        },
        writable: true,
      })
      expect(isProduction()).toBe(false)
    })

    it('should return false for 127.0.0.1', () => {
      Object.defineProperty(window, 'location', {
        value: {
          ...window.location,
          hostname: '127.0.0.1',
        },
        writable: true,
      })
      expect(isProduction()).toBe(false)
    })

    it('should return true for production domain', () => {
      Object.defineProperty(window, 'location', {
        value: {
          ...window.location,
          hostname: 'arkade.money',
        },
        writable: true,
      })
      expect(isProduction()).toBe(true)
    })

    it('should return true for dev domain', () => {
      Object.defineProperty(window, 'location', {
        value: {
          ...window.location,
          hostname: 'dev.arkade.money',
        },
        writable: true,
      })
      expect(isProduction()).toBe(true)
    })

    it('should return true for next domain', () => {
      Object.defineProperty(window, 'location', {
        value: {
          ...window.location,
          hostname: 'next.arkade.money',
        },
        writable: true,
      })
      expect(isProduction()).toBe(true)
    })
  })

  describe('shouldInitializeSentry', () => {
    it('should return false when DSN is undefined', () => {
      Object.defineProperty(window, 'location', {
        value: {
          ...window.location,
          hostname: 'arkade.money',
        },
        writable: true,
      })
      expect(shouldInitializeSentry(undefined)).toBe(false)
    })

    it('should return false when DSN is empty string', () => {
      Object.defineProperty(window, 'location', {
        value: {
          ...window.location,
          hostname: 'arkade.money',
        },
        writable: true,
      })
      expect(shouldInitializeSentry('')).toBe(false)
    })

    it('should return false when DSN is provided but hostname is localhost', () => {
      Object.defineProperty(window, 'location', {
        value: {
          ...window.location,
          hostname: 'localhost',
        },
        writable: true,
      })
      expect(shouldInitializeSentry('https://sentry.io/test-dsn')).toBe(false)
    })

    it('should return false when DSN is provided but hostname is 127.0.0.1', () => {
      Object.defineProperty(window, 'location', {
        value: {
          ...window.location,
          hostname: '127.0.0.1',
        },
        writable: true,
      })
      expect(shouldInitializeSentry('https://sentry.io/test-dsn')).toBe(false)
    })

    it('should return true when DSN is provided and hostname is production', () => {
      Object.defineProperty(window, 'location', {
        value: {
          ...window.location,
          hostname: 'arkade.money',
        },
        writable: true,
      })
      expect(shouldInitializeSentry('https://sentry.io/test-dsn')).toBe(true)
    })

    it('should return true when DSN is provided and hostname is dev domain', () => {
      Object.defineProperty(window, 'location', {
        value: {
          ...window.location,
          hostname: 'dev.arkade.money',
        },
        writable: true,
      })
      expect(shouldInitializeSentry('https://sentry.io/test-dsn')).toBe(true)
    })
  })
})
