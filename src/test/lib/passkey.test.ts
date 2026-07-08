import { describe, expect, it, beforeEach, vi } from 'vitest'
import { registerPasskey, assertPrf, PRF_EVAL_INPUT, PrfUnavailableError } from '../../lib/passkey'

// base64url without padding, mirroring what the WebAuthn client data contains
const toBase64Url = (data: BufferSource): string => {
  const array = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data.buffer)
  return btoa(String.fromCharCode(...array))
    .replaceAll('=', '')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
}

const clientDataFor = (type: string, challenge: BufferSource): ArrayBuffer =>
  new TextEncoder().encode(JSON.stringify({ type, challenge: toBase64Url(challenge), origin: window.location.origin }))
    .buffer as ArrayBuffer

const rawId = new Uint8Array([1, 2, 3, 4]).buffer
const prfSecret = new Uint8Array(32).fill(42)

function mockCredentials({
  createPrf,
  getPrf,
}: {
  createPrf?: { enabled?: boolean; results?: { first?: ArrayBuffer } }
  getPrf?: { results?: { first?: ArrayBuffer } }
}) {
  const create = vi.fn(async (options: any) => ({
    rawId,
    response: { clientDataJSON: clientDataFor('webauthn.create', options.publicKey.challenge) },
    getClientExtensionResults: () => (createPrf === undefined ? {} : { prf: createPrf }),
  }))
  const get = vi.fn(async (options: any) => ({
    rawId,
    response: { clientDataJSON: clientDataFor('webauthn.get', options.publicKey.challenge) },
    getClientExtensionResults: () => (getPrf === undefined ? {} : { prf: getPrf }),
  }))
  vi.stubGlobal('navigator', { ...navigator, credentials: { create, get } })
  return { create, get }
}

describe('registerPasskey', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns PRF output directly when evaluated at create()', async () => {
    const { get } = mockCredentials({
      createPrf: { enabled: true, results: { first: prfSecret.buffer as ArrayBuffer } },
    })
    const reg = await registerPasskey()
    expect(reg.kind).toBe('prf')
    if (reg.kind === 'prf') expect(reg.prfOutput).toEqual(prfSecret)
    expect(get).not.toHaveBeenCalled()
  })

  it('falls back to an assertion when PRF is enabled but not evaluated at create()', async () => {
    const { get } = mockCredentials({
      createPrf: { enabled: true },
      getPrf: { results: { first: prfSecret.buffer as ArrayBuffer } },
    })
    const reg = await registerPasskey()
    expect(reg.kind).toBe('prf')
    if (reg.kind === 'prf') expect(reg.prfOutput).toEqual(prfSecret)
    expect(get).toHaveBeenCalledOnce()
    // assertion must evaluate PRF over the fixed input
    const options = get.mock.calls[0][0].publicKey
    expect(Array.from(new Uint8Array(options.extensions.prf.eval.first))).toEqual(Array.from(PRF_EVAL_INPUT))
  })

  it('returns the legacy scheme when the authenticator has no PRF support', async () => {
    const { create, get } = mockCredentials({ createPrf: { enabled: false } })
    const reg = await registerPasskey()
    expect(reg.kind).toBe('legacy')
    if (reg.kind === 'legacy') {
      // the legacy secret is the random user.id passed to create()
      const userId = new Uint8Array(create.mock.calls[0][0].publicKey.user.id)
      expect(reg.legacySecret).toBe(Array.from(userId, (b) => b.toString(16).padStart(2, '0')).join(''))
    }
    expect(get).not.toHaveBeenCalled()
  })

  it('requests the PRF extension at create()', async () => {
    const { create } = mockCredentials({
      createPrf: { enabled: true, results: { first: prfSecret.buffer as ArrayBuffer } },
    })
    await registerPasskey()
    const options = create.mock.calls[0][0].publicKey
    expect(Array.from(new Uint8Array(options.extensions.prf.eval.first))).toEqual(Array.from(PRF_EVAL_INPUT))
    expect(options.authenticatorSelection.residentKey).toBe('required')
  })
})

describe('assertPrf', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the PRF output', async () => {
    mockCredentials({ getPrf: { results: { first: prfSecret.buffer as ArrayBuffer } } })
    const output = await assertPrf('01020304')
    expect(output).toEqual(prfSecret)
  })

  it('throws PrfUnavailableError when the assertion yields no PRF result', async () => {
    mockCredentials({ getPrf: {} })
    await expect(assertPrf('01020304')).rejects.toThrow(PrfUnavailableError)
  })
})
