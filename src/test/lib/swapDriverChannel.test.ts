import { describe, expect, it, vi } from 'vitest'
import { DriverPromoted, openDriverChannel } from '../../lib/swapDriverChannel'

describe('scoped swap driver channel', () => {
  it('admits only a current scoped request before invoking its handler', async () => {
    const server = openDriverChannel('wallet-scope')
    const current = new BroadcastChannel('swap-driver-v2')
    const legacy = new BroadcastChannel('swap-driver')
    const handler = vi.fn(async () => 'accepted')
    server.serve(handler)
    let timeout: ReturnType<typeof setTimeout> | undefined
    try {
      const received = new Promise<void>((resolve, reject) => {
        timeout = setTimeout(() => reject(new Error('The scoped driver did not answer')), 3000)
        current.onmessage = ({ data }) => {
          if (data.kind === 'result' && data.id === 'current') resolve()
        }
      })
      legacy.postMessage({ kind: 'request', id: 'legacy', scope: 'wallet-scope', op: 'exchange', args: ['legacy'] })
      current.postMessage({ kind: 'request', id: 'unscoped', op: 'exchange', args: ['unscoped'] })
      current.postMessage({ kind: 'request', id: 'current', scope: 'wallet-scope', op: 'exchange', args: ['current'] })
      await received
      expect(handler).toHaveBeenCalledExactlyOnceWith('exchange', ['current'], 'wallet-scope')
    } finally {
      clearTimeout(timeout)
      server.close()
      current.close()
      legacy.close()
    }
  })

  it('lets a caller recover ownership while an old closed driver finishes', async () => {
    const server = openDriverChannel('wallet-scope')
    const follower = openDriverChannel('wallet-scope')
    let entered!: () => void
    let finish!: (value: string) => void
    let promote!: () => void
    const started = new Promise<void>((resolve) => {
      entered = resolve
    })
    const response = new Promise<string>((resolve) => {
      finish = resolve
    })
    const promotion = new Promise<void>((resolve) => {
      promote = resolve
    })
    server.serve(async () => {
      entered()
      return response
    })
    try {
      const result = follower.ask('quoteExchange', [], promotion)
      await started
      server.close()
      promote()
      finish('stale quote')
      await expect(result).rejects.toBeInstanceOf(DriverPromoted)
      await Promise.resolve()
    } finally {
      server.close()
      follower.close()
    }
  })
})
