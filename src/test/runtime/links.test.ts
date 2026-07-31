import { describe, expect, it } from 'vitest'
import { parseLinkPayload, parseNativeUrl } from '../../runtime/links'

// isArkNote requires the arknote HRP and a length over 55 chars.
const NOTE = 'arknote' + 'a'.repeat(60)

describe('parseLinkPayload', () => {
  it('parses an app link with a query string', () => {
    expect(parseLinkPayload('app+lendasat?amount=100', 'raw')).toEqual({
      type: 'app',
      appId: 'lendasat',
      query: 'amount=100',
      rawUrl: 'raw',
    })
  })

  it('parses an app link without a query string', () => {
    expect(parseLinkPayload('app+boltz', 'raw')).toEqual({
      type: 'app',
      appId: 'boltz',
      query: undefined,
      rawUrl: 'raw',
    })
  })

  it('parses a bare ark note', () => {
    expect(parseLinkPayload(NOTE, 'raw')).toEqual({ type: 'note', note: NOTE, rawUrl: 'raw' })
  })

  // The PWA protocol handler (public/manifest.json) delivers notes with this
  // prefix still attached, so it must be stripped before the note check.
  it('strips the web+arkade protocol-handler prefix', () => {
    expect(parseLinkPayload(`web+arkade://${NOTE}`, 'raw')).toEqual({ type: 'note', note: NOTE, rawUrl: 'raw' })
  })

  it('returns undefined for an empty payload so "no link" is distinguishable', () => {
    expect(parseLinkPayload('', 'raw')).toBeUndefined()
  })

  it('reports an unrecognized payload as unknown rather than dropping it', () => {
    expect(parseLinkPayload('something-else', 'raw')).toEqual({ type: 'unknown', rawUrl: 'raw' })
  })

  // A too-short string starting with the HRP is not a valid note.
  it('does not treat a truncated note as a note', () => {
    expect(parseLinkPayload('arknote123', 'raw')).toEqual({ type: 'unknown', rawUrl: 'raw' })
  })
})

describe('parseNativeUrl', () => {
  it('strips the custom scheme', () => {
    expect(parseNativeUrl('arkade://app+satora?x=1')).toEqual({
      type: 'app',
      appId: 'satora',
      query: 'x=1',
      rawUrl: 'arkade://app+satora?x=1',
    })
  })

  it('parses a note from the custom scheme', () => {
    expect(parseNativeUrl(`arkade://${NOTE}`)).toEqual({
      type: 'note',
      note: NOTE,
      rawUrl: `arkade://${NOTE}`,
    })
  })

  // Universal Links / App Links arrive as https URLs carrying the payload in
  // the fragment, matching the shape the PWA already handles.
  it('takes the fragment from an https app link', () => {
    expect(parseNativeUrl('https://arkade.money/#app+boltz')).toEqual({
      type: 'app',
      appId: 'boltz',
      query: undefined,
      rawUrl: 'https://arkade.money/#app+boltz',
    })
  })

  it('returns undefined for a bare scheme with no payload', () => {
    expect(parseNativeUrl('arkade://')).toBeUndefined()
  })
})
