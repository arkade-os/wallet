import { describe, it, expect } from 'vitest'
import { isBolt12Offer } from '../../lib/bolt12'

describe('bolt12', () => {
  describe('isBolt12Offer', () => {
    it('should return true for valid BOLT12 offers', () => {
      expect(
        isBolt12Offer(
          'lno1qgsqvgnwgcg35z6ee2h3yczraddm72xrfua9uve2rlrm9deu7xyfzrcgqgr3ypzk7fjyq92x7yn9k8sg6yp9e5n2yep9d',
        ),
      ).toBe(true)
      expect(
        isBolt12Offer(
          'LNO1QGSQVGNWGCG35Z6EE2H3YCZRADDM72XRFUA9UVE2RLRM9DEU7XYFZRCGQGR3YPZK7FJYQ92X7YN9K8SG6YP9E5N2YEP9D',
        ),
      ).toBe(true)
    })

    it('should return false for non-BOLT12 strings', () => {
      expect(isBolt12Offer('lnbc1')).toBe(false)
      expect(isBolt12Offer('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq')).toBe(false)
      expect(isBolt12Offer('ark1test')).toBe(false)
      expect(isBolt12Offer('')).toBe(false)
      expect(isBolt12Offer('random text')).toBe(false)
    })
  })
})
