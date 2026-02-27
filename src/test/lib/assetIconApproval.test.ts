import { describe, it, expect, beforeEach } from 'vitest'
import { AssetIconApprovalManager } from '../../lib/assetIconApproval'

describe('AssetIconApprovalManager', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should return false for unapproved asset', () => {
    const mgr = new AssetIconApprovalManager()
    expect(mgr.isApproved('asset1')).toBe(false)
  })

  it('should approve and persist', () => {
    const mgr = new AssetIconApprovalManager()
    mgr.approve('asset1')
    expect(mgr.isApproved('asset1')).toBe(true)

    // new instance reads from storage
    const mgr2 = new AssetIconApprovalManager()
    expect(mgr2.isApproved('asset1')).toBe(true)
  })

  it('should revoke and persist', () => {
    const mgr = new AssetIconApprovalManager()
    mgr.approve('asset1')
    mgr.revoke('asset1')
    expect(mgr.isApproved('asset1')).toBe(false)

    const mgr2 = new AssetIconApprovalManager()
    expect(mgr2.isApproved('asset1')).toBe(false)
  })

  it('should handle multiple assets', () => {
    const mgr = new AssetIconApprovalManager()
    mgr.approve('a')
    mgr.approve('b')
    mgr.revoke('a')
    expect(mgr.isApproved('a')).toBe(false)
    expect(mgr.isApproved('b')).toBe(true)
  })

  it('should handle corrupt storage gracefully', () => {
    localStorage.setItem('approvedAssetIcons', 'not json')
    const mgr = new AssetIconApprovalManager()
    expect(mgr.isApproved('x')).toBe(false)
    mgr.approve('x')
    expect(mgr.isApproved('x')).toBe(true)
  })

  it('should use custom storage key', () => {
    const mgr = new AssetIconApprovalManager('customKey')
    mgr.approve('asset1')
    expect(localStorage.getItem('customKey')).toBeTruthy()
    expect(localStorage.getItem('approvedAssetIcons')).toBeNull()
  })

  it('should be idempotent on approve and revoke', () => {
    const mgr = new AssetIconApprovalManager()
    mgr.approve('a')
    mgr.approve('a')
    mgr.revoke('b') // revoking non-existent is fine
    expect(mgr.isApproved('a')).toBe(true)
  })
})

describe('verified assets', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should treat verified assets as approved', () => {
    const mgr = new AssetIconApprovalManager()
    mgr.setVerifiedAssets(['v1', 'v2'])
    expect(mgr.isApproved('v1')).toBe(true)
    expect(mgr.isApproved('v2')).toBe(true)
    expect(mgr.isApproved('other')).toBe(false)
  })

  it('should report verified assets via isVerified', () => {
    const mgr = new AssetIconApprovalManager()
    mgr.setVerifiedAssets(['v1'])
    expect(mgr.isVerified('v1')).toBe(true)
    expect(mgr.isVerified('other')).toBe(false)
  })

  it('should not persist verified assets to localStorage', () => {
    const mgr = new AssetIconApprovalManager()
    mgr.setVerifiedAssets(['v1'])
    expect(mgr.isApproved('v1')).toBe(true)

    // new instance should NOT have v1
    const mgr2 = new AssetIconApprovalManager()
    expect(mgr2.isApproved('v1')).toBe(false)
    expect(mgr2.isVerified('v1')).toBe(false)
  })

  it('should combine manual approval and verified', () => {
    const mgr = new AssetIconApprovalManager()
    mgr.approve('manual')
    mgr.setVerifiedAssets(['verified'])
    expect(mgr.isApproved('manual')).toBe(true)
    expect(mgr.isApproved('verified')).toBe(true)
    expect(mgr.isApproved('neither')).toBe(false)
  })

  it('should replace verified set on subsequent calls', () => {
    const mgr = new AssetIconApprovalManager()
    mgr.setVerifiedAssets(['a', 'b'])
    mgr.setVerifiedAssets(['c'])
    expect(mgr.isVerified('a')).toBe(false)
    expect(mgr.isVerified('c')).toBe(true)
  })
})
