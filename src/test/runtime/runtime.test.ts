import { describe, expect, it } from 'vitest'
import { RUNTIME_KIND, isNativeRuntime, isPwaRuntime } from '../../runtime/runtime'

// VITE_RUNTIME is unset in the test/PWA build, so the runtime defaults to
// web-pwa. The Capacitor build sets it to native-capacitor at build time.
describe('runtime kind', () => {
  it('defaults to web-pwa when VITE_RUNTIME is unset', () => {
    expect(RUNTIME_KIND).toBe('web-pwa')
    expect(isPwaRuntime()).toBe(true)
    expect(isNativeRuntime()).toBe(false)
  })
})
