import { describe, expect, it } from 'vitest'
import fixtures from '../fixtures.json'
import { isValidAssetId } from '../../lib/assets'

describe('asset utilities', () => {
  describe('isValidAssetId', () => {
    it('should return true for a valid asset ID', () => {
      expect(isValidAssetId(fixtures.lib.asset.id)).toBe(true)
    })

    it('should return false for an invalid asset ID', () => {
      expect(isValidAssetId('invalidAssetId')).toBe(false)
    })
  })
})
