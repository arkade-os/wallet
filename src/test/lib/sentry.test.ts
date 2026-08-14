import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { ErrorEvent } from '@sentry/react'
import { isProduction, scrubBreadcrumb, scrubEvent, shouldInitializeSentry, walletFingerprint } from '../../lib/sentry'
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

    it('removes credentials from nested request headers', () => {
      const event = {
        request: {
          url: 'https://arkade.money/',
          headers: { Authorization: 'Bearer s3cr3t', Cookie: 'session=abc', 'X-API-Key': 'k-123' },
        },
      } as unknown as ErrorEvent

      const request = JSON.stringify(scrubEvent(event).request)

      expect(request).not.toContain('s3cr3t')
      expect(request).not.toContain('abc')
      expect(request).not.toContain('k-123')
      expect(request).toContain('https://arkade.money/')
    })

    it('removes an nsec carried under a benign key', () => {
      const event = {
        contexts: { restore: { input: `entered ${fixtures.lib.privatekey.secret.nsec}` } },
      } as unknown as ErrorEvent

      expect(scrubEvent(event).contexts?.restore).toEqual({ input: 'entered [redacted]' })
    })

    it('leaves an unrelated event untouched', () => {
      const event = { contexts: { app: { app_version: '1.2.3' } } } as unknown as ErrorEvent

      expect(scrubEvent(event).contexts?.app).toEqual({ app_version: '1.2.3' })
    })

    it.each([
      ['mainnet', fixtures.lib.bolt11.invoice],
      ['regtest', fixtures.lib.bip21.invoice],
    ])('removes a %s lightning invoice', (_network, invoice) => {
      const event = {
        contexts: { swap: { request: `paying ${invoice}` } },
      } as unknown as ErrorEvent

      expect(scrubEvent(event).contexts?.swap).toEqual({ request: 'paying [redacted]' })
    })

    it('removes an invoice from an exception message', () => {
      const event = {
        exception: { values: [{ value: `swap failed for ${fixtures.lib.bolt11.invoice}` }] },
      } as unknown as ErrorEvent

      expect(scrubEvent(event).exception?.values?.[0].value).toBe('swap failed for [redacted]')
    })
  })

  describe('walletFingerprint', () => {
    const [first, second] = fixtures.lib.address.ark

    it('is stable, short and does not contain the address', () => {
      expect(walletFingerprint(first.address)).toBe(walletFingerprint(first.address))
      expect(walletFingerprint(first.address)).toMatch(/^[0-9a-f]{16}$/)
      expect(first.address).not.toContain(walletFingerprint(first.address))
    })

    it('separates wallets', () => {
      expect(walletFingerprint(first.address)).not.toBe(walletFingerprint(second.address))
    })

    it('survives scrubbing', () => {
      const event = { contexts: { settle: { wallet: walletFingerprint(first.address) } } } as unknown as ErrorEvent

      expect(scrubEvent(event).contexts?.settle).toEqual({ wallet: walletFingerprint(first.address) })
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
