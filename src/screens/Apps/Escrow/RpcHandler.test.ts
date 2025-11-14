import { describe, it, expect, vi, beforeEach } from 'vitest'
import makeMessageHandler from './RpcHandler'

// Minimal helper to make Uint8Array from hex for deterministic bytesToHex result
const hexToBytes = (hex: string) => {
  const clean = hex.replace(/^0x/, '')
  const arr = new Uint8Array(clean.length / 2)
  for (let i = 0; i < clean.length; i += 2) {
    arr[i / 2] = parseInt(clean.slice(i, i + 2), 16)
  }
  return arr
}

describe('makeMessageHandler', () => {
  const id = 'req-1'
  let props: Parameters<typeof makeMessageHandler>[0]

  beforeEach(() => {
    props = {
      getXOnlyPublicKey: vi.fn(),
      signLoginChallenge: vi.fn(),
      getArkWalletAddress: vi.fn(),
      signArkTransaction: vi.fn(),
      fundAddress: vi.fn(),
    }
  })

  it('responds to ARKADE_KEEP_ALIVE with current timestamp', async () => {
    const handler = makeMessageHandler(props)
    const res = await handler({ kind: 'ARKADE_KEEP_ALIVE', timestamp: 0 })
    expect(res.tag).toBe('success')
    if (res.tag === 'success') {
      expect(res.result.kind).toBe('ARKADE_KEEP_ALIVE')
      expect(typeof (res.result as any).timestamp).toBe('number')
    }
  })

  it('handles get-x-public-key returning hex string when key exists', async () => {
    const keyBytes = hexToBytes('a1b2c3')
    ;(props.getXOnlyPublicKey as any).mockResolvedValue(keyBytes)

    const handler = makeMessageHandler(props)
    const res = await handler({ kind: 'ARKADE_RPC_REQUEST', id, method: 'get-x-public-key' })

    expect(props.getXOnlyPublicKey).toHaveBeenCalledTimes(1)
    expect(res.tag).toBe('success')
    if (res.tag === 'success') {
      const out: any = res.result
      expect(out.kind).toBe('ARKADE_RPC_RESPONSE')
      expect(out.id).toBe(id)
      expect(out.method).toBe('get-x-public-key')
      expect(out.payload.xOnlyPublicKey).toBe('a1b2c3')
    }
  })

  it('handles get-x-public-key returning null when no key', async () => {
    ;(props.getXOnlyPublicKey as any).mockResolvedValue(null)

    const handler = makeMessageHandler(props)
    const res = await handler({ kind: 'ARKADE_RPC_REQUEST', id, method: 'get-x-public-key' })

    expect(res.tag).toBe('success')
    if (res.tag === 'success') {
      const out: any = res.result
      expect(out.payload.xOnlyPublicKey).toBeNull()
    }
  })

  it('handles get-ark-wallet-address with value', async () => {
    ;(props.getArkWalletAddress as any).mockResolvedValue('ark1qqqq')
    const handler = makeMessageHandler(props)
    const res = await handler({ kind: 'ARKADE_RPC_REQUEST', id, method: 'get-ark-wallet-address' })
    expect(props.getArkWalletAddress).toHaveBeenCalledTimes(1)
    expect(res.tag).toBe('success')
    if (res.tag === 'success') {
      const out: any = res.result
      expect(out.method).toBe('get-ark-wallet-address')
      expect(out.payload.arkAddress).toBe('ark1qqqq')
    }
  })

  it('handles get-ark-wallet-address as null when undefined', async () => {
    ;(props.getArkWalletAddress as any).mockResolvedValue(undefined)
    const handler = makeMessageHandler(props)
    const res = await handler({ kind: 'ARKADE_RPC_REQUEST', id, method: 'get-ark-wallet-address' })
    expect(res.tag).toBe('success')
    if (res.tag === 'success') {
      const out: any = res.result
      expect(out.payload.arkAddress).toBeNull()
    }
  })

  it('handles sign-login-challenge success', async () => {
    ;(props.signLoginChallenge as any).mockResolvedValue('signed-abc')
    const handler = makeMessageHandler(props)
    const res = await handler({
      kind: 'ARKADE_RPC_REQUEST',
      id,
      method: 'sign-login-challenge',
      payload: { challenge: 'abc' },
    })
    expect(props.signLoginChallenge).toHaveBeenCalledWith('abc')
    expect(res.tag).toBe('success')
    if (res.tag === 'success') {
      const out: any = res.result
      expect(out.method).toBe('sign-login-challenge')
      expect(out.payload.signedChallenge).toBe('signed-abc')
    }
  })

  it('handles sign-login-challenge failure', async () => {
    ;(props.signLoginChallenge as any).mockRejectedValue(new Error('boom'))
    const handler = makeMessageHandler(props)
    const res = await handler({
      kind: 'ARKADE_RPC_REQUEST',
      id,
      method: 'sign-login-challenge',
      payload: { challenge: 'abc' },
    })
    expect(res.tag).toBe('failure')
    if (res.tag === 'failure') {
      expect(res.error.message).toContain('Failed to sign login challenge')
    }
  })

  it('handles sign-transaction success', async () => {
    ;(props.signArkTransaction as any).mockResolvedValue({
      signedTx: 'tx-signed',
      signedCheckpoints: ['cp1', 'cp2'],
    })
    const handler = makeMessageHandler(props)
    const res = await handler({
      kind: 'ARKADE_RPC_REQUEST',
      id,
      method: 'sign-transaction',
      payload: { tx: 'tx', checkpoints: ['cp1', 'cp2'] },
    })
    expect(props.signArkTransaction).toHaveBeenCalledWith('tx', ['cp1', 'cp2'])
    expect(res.tag).toBe('success')
    if (res.tag === 'success') {
      const out: any = res.result
      expect(out.method).toBe('sign-transaction')
      expect(out.payload).toEqual({ tx: 'tx-signed', checkpoints: ['cp1', 'cp2'] })
    }
  })

  it('handles sign-transaction failure', async () => {
    ;(props.signArkTransaction as any).mockRejectedValue(new Error('nope'))
    const handler = makeMessageHandler(props)
    const res = await handler({
      kind: 'ARKADE_RPC_REQUEST',
      id,
      method: 'sign-transaction',
      payload: { tx: 'tx', checkpoints: [] },
    })
    expect(res.tag).toBe('failure')
    if (res.tag === 'failure') {
      expect(res.error.message).toContain('Failed to sign transaction')
    }
  })

  it('handles fund-address', async () => {
    ;(props.fundAddress as any).mockResolvedValue(undefined)
    const handler = makeMessageHandler(props)
    const res = await handler({
      kind: 'ARKADE_RPC_REQUEST',
      id,
      method: 'fund-address',
      payload: { address: 'ark1qq', amount: 123 },
    })
    expect(props.fundAddress).toHaveBeenCalledWith('ark1qq', 123)
    expect(res.tag).toBe('success')
    if (res.tag === 'success') {
      const out: any = res.result
      expect(out.method).toBe('fund-address')
      expect(out.payload).toEqual({})
    }
  })

  it('returns failure for unknown message kind', async () => {
    const handler = makeMessageHandler(props)
    // @ts-expect-error force unknown shape
    const res = await handler({ kind: 'UNKNOWN_KIND' })
    expect(res.tag).toBe('failure')
    if (res.tag === 'failure') {
      expect(res.error.message).toBe('Unknown message kind')
    }
  })
})
