import { describe, expect, it } from 'vitest'
import fixtures from '../fixtures.json'
import { isArkNote } from '../../lib/arknote'

describe('arknote utilities', () => {
  describe('isArkNote', () => {
    it('should return true for a valid ark note', () => {
      expect(isArkNote(fixtures.lib.arknote)).toBe(true)
    })

    it('should return false for an invalid ark note', () => {
      expect(isArkNote('invalidArkNote')).toBe(false)
    })
  })
})
