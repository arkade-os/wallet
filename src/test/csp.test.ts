import { readFileSync } from 'fs'
import { resolve } from 'path'

const headerFiles = ['nginx-security-headers.conf', 'public/_headers']

describe('Content Security Policy frame sources', () => {
  it('allows the DFX embedded app without broadening the frame allowlist', () => {
    for (const file of headerFiles) {
      const headers = readFileSync(resolve(process.cwd(), file), 'utf8')

      expect(headers).toContain("frame-src 'self' https://app.chatwoot.com/ https://app.dfx.swiss/")
      expect(headers).toContain("frame-ancestors 'none'")
      expect(headers).not.toContain('iframe.lendasat.com')
      expect(headers).not.toContain('app.satora.io')
    }
  })
})
