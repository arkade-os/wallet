import { afterEach, describe, expect, it } from 'vitest'
import {
  cancelNativeSigningPin,
  getNativeSigningPinRequest,
  registerNativeSigningPinHost,
  requestNativeSigningPin,
  submitNativeSigningPin,
} from '../../lib/nativeSigningPin'

let dispose: (() => void) | undefined
afterEach(() => {
  dispose?.()
  dispose = undefined
})

describe('native signing PIN requests', () => {
  it('refuses requests without an unlocked prompt host', async () => {
    await expect(requestNativeSigningPin()).rejects.toMatchObject({
      code: 'USER_CANCELLED',
      message: 'Card signing cancelled.',
    })
    dispose = registerNativeSigningPinHost(() => false)
    await expect(requestNativeSigningPin()).rejects.toMatchObject({ code: 'USER_CANCELLED' })
    expect(getNativeSigningPinRequest()).toBeUndefined()
  })

  it('does not replace a pending prompt, cache a PIN, or accept a stale callback', async () => {
    dispose = registerNativeSigningPinHost(() => true)
    const first = requestNativeSigningPin()
    const firstId = getNativeSigningPinRequest()!
    const busy = await requestNativeSigningPin().catch((error) => error)
    expect(busy).toMatchObject({ code: 'CARD_BUSY' })
    expect(getNativeSigningPinRequest()).toBe(firstId)
    expect(submitNativeSigningPin(firstId, '12345')).toBe(false)
    expect(submitNativeSigningPin(firstId, '123456')).toBe(true)
    await expect(first).resolves.toBe('123456')
    expect(getNativeSigningPinRequest()).toBeUndefined()
    const second = requestNativeSigningPin()
    const rejection = expect(second).rejects.toMatchObject({ code: 'USER_CANCELLED' })
    const secondId = getNativeSigningPinRequest()!
    expect(secondId).not.toBe(firstId)
    expect(submitNativeSigningPin(firstId, '123456')).toBe(false)
    cancelNativeSigningPin(firstId)
    expect(getNativeSigningPinRequest()).toBe(secondId)
    cancelNativeSigningPin(secondId)
    await rejection
    expect(busy).toMatchObject({ message: 'A card signing request is already in progress.' })
  })

  it('rechecks foreground eligibility at submission and cancels on host removal', async () => {
    let allowed = true
    dispose = registerNativeSigningPinHost(() => allowed)
    const first = requestNativeSigningPin()
    const rejected = expect(first).rejects.toMatchObject({ code: 'USER_CANCELLED' })
    allowed = false
    expect(submitNativeSigningPin(getNativeSigningPinRequest()!, '123456')).toBe(false)
    await rejected
    allowed = true
    const second = requestNativeSigningPin()
    const unmounted = expect(second).rejects.toMatchObject({ code: 'USER_CANCELLED' })
    dispose()
    dispose = undefined
    await unmounted
    expect(getNativeSigningPinRequest()).toBeUndefined()
  })
})
