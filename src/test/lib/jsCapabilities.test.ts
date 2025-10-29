import { describe, it, expect } from 'vitest'
import { getRestrictedEnvironmentMessage } from '../../lib/jsCapabilities'

// Note: The actual detectJSCapabilities function performs real browser checks
// which are difficult to mock properly in a test environment.
// The function is tested through integration testing in the actual application.

describe('getRestrictedEnvironmentMessage', () => {
  it('should return iOS-specific message for iOS devices', () => {
    const message = getRestrictedEnvironmentMessage(true)
    expect(message).toContain('JIT')
    expect(message).toContain('Settings')
    expect(message).toContain('Safari')
  })

  it('should return generic message for non-iOS devices', () => {
    const message = getRestrictedEnvironmentMessage(false)
    expect(message).toContain('JavaScript')
    expect(message).not.toContain('Safari')
  })
})
