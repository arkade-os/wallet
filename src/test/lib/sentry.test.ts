import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { ErrorEvent } from '@sentry/react'
import { isProduction, scrubBreadcrumb, scrubEvent, shouldInitializeSentry } from '../../lib/sentry'
import fixtures from '../fixtures.json'

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

  describe('scrubEvent', () => {
    const arkAddress = fixtures.lib.address.ark[0].address
    const script = fixtures.lib.address.ark[0].vtxoTaprootKey

    it('removes key material, addresses and scripts from contexts', () => {
      const event = {
        contexts: {
          settle: {
            count: 2,
            totalValue: 1000,
            walletAddress: arkAddress,
            note: { preimage: 'a'.repeat(64) },
            inputs: [`${script}:0`],
          },
        },
      } as unknown as ErrorEvent

      const settle = scrubEvent(event).contexts?.settle as Record<string, unknown>

      expect(settle).toMatchObject({ count: 2, totalValue: 1000 })
      expect(JSON.stringify(settle)).not.toMatch(/[0-9a-f]{20,}/i)
      expect(JSON.stringify(settle)).not.toContain('tark1')
    })

    it('removes them from exception messages too', () => {
      const event = {
        exception: { values: [{ value: `settle failed for ${arkAddress}` }] },
      } as unknown as ErrorEvent

      expect(scrubEvent(event).exception?.values?.[0].value).toBe('settle failed for [redacted]')
    })

    it('leaves an unrelated event untouched', () => {
      const event = { contexts: { app: { app_version: '1.2.3' } } } as unknown as ErrorEvent

      expect(scrubEvent(event).contexts?.app).toEqual({ app_version: '1.2.3' })
    })
  })

  describe('scrubBreadcrumb', () => {
    it('keeps request urls to their origin', () => {
      const crumb = scrubBreadcrumb({
        category: 'fetch',
        data: { method: 'GET', status_code: 500, url: `https://arkade.computer/v1/vtxos/${'ab'.repeat(32)}?page=1` },
      })

      expect(crumb.data).toEqual({ method: 'GET', status_code: 500, url: 'https://arkade.computer' })
    })

    it('leaves non-request breadcrumbs alone', () => {
      const crumb = scrubBreadcrumb({ category: 'ui.click', message: 'button#send' })

      expect(crumb).toEqual({ category: 'ui.click', message: 'button#send' })
    })
  })
})
