import { beforeEach, describe, expect, it, vi } from 'vitest'
import { configureNativeBackground, getNativeBackgroundStatus } from '../../lib/nativeBackground'

const native = vi.hoisted(() => ({ android: true, invoke: vi.fn() }))
vi.mock('../../lib/nativePlatform', () => ({
  isNativeAndroid: () => native.android,
  invokeWalletHost: native.invoke,
}))

beforeEach(() => {
  native.android = true
  native.invoke.mockReset()
})

describe('native background status', () => {
  it('returns reminder permission even when no expiry can be scheduled', async () => {
    const status = { enabled: true, permissionGranted: false, scheduled: false, nextExpiryMs: null }
    native.invoke.mockResolvedValue(status)
    expect(await configureNativeBackground(true, 0)).toBe(status)
    expect(native.invoke).toHaveBeenCalledWith('configure_background', { enabled: true, nextExpiryMs: null })
    expect(await getNativeBackgroundStatus()).toBe(status)
    expect(native.invoke).toHaveBeenLastCalledWith('background_status')
  })

  it('keeps native-only status reads and configuration out of browser wallets', async () => {
    native.android = false
    expect(await configureNativeBackground(true, 1800000000)).toBeUndefined()
    expect(await getNativeBackgroundStatus()).toBeUndefined()
    expect(native.invoke).not.toHaveBeenCalled()
  })
})
