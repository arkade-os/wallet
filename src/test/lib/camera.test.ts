import { afterEach, describe, expect, it } from 'vitest'
import { cameraErrorText, queryCameraPermission } from '../../lib/camera'

const realPermissions = Object.getOwnPropertyDescriptor(navigator, 'permissions')

const mockPermissions = (query: () => Promise<{ state: PermissionState }>) => {
  Object.defineProperty(navigator, 'permissions', { configurable: true, value: { query } })
}

afterEach(() => {
  if (realPermissions) Object.defineProperty(navigator, 'permissions', realPermissions)
  else delete (navigator as any).permissions
})

describe('camera permission', () => {
  it('reports the state the browser gives us', async () => {
    mockPermissions(async () => ({ state: 'denied' }))
    expect(await queryCameraPermission()).toBe('denied')
  })

  it('assumes prompt where the camera permission cannot be queried', async () => {
    mockPermissions(async () => {
      throw new TypeError("'camera' is not a valid permission name")
    })
    expect(await queryCameraPermission()).toBe('prompt')
  })

  it('tells a user who blocked the camera how to unblock it', () => {
    expect(cameraErrorText('denied')).toMatch(/browser settings/)
  })

  it('does not blame the permission when the camera is merely unavailable', () => {
    expect(cameraErrorText('prompt')).toBe('Camera not available')
    expect(cameraErrorText('granted')).toBe('Camera not available')
  })
})
