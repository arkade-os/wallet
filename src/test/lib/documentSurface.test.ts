import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  activateDocumentSurface,
  dimScreenEdges,
  DRAWER_SCRIM_FADE,
  setDocumentThemeColor,
} from '../../lib/documentSurface'

describe('document surface', () => {
  let themeColorMeta: HTMLMetaElement

  beforeEach(() => {
    themeColorMeta = document.createElement('meta')
    themeColorMeta.name = 'theme-color'
    themeColorMeta.content = '#fff'
    document.head.append(themeColorMeta)
    setDocumentThemeColor('#fff')
  })

  afterEach(() => {
    document.documentElement.classList.remove('test-surface', 'first-surface', 'second-surface')
    themeColorMeta.remove()
  })

  it('keeps an active surface override when the base theme changes', () => {
    const release = activateDocumentSurface({ className: 'test-surface', themeColor: '#5528d4' })

    expect(document.documentElement).toHaveClass('test-surface')
    expect(themeColorMeta).toHaveAttribute('content', '#5528d4')

    setDocumentThemeColor('#101010')
    expect(themeColorMeta).toHaveAttribute('content', '#5528d4')

    release()
    expect(document.documentElement).not.toHaveClass('test-surface')
    expect(themeColorMeta).toHaveAttribute('content', '#101010')
  })

  it('supports nested surfaces and cleanup in any order', () => {
    const releaseFirst = activateDocumentSurface({ className: 'first-surface', themeColor: '#111111' })
    const releaseSecond = activateDocumentSurface({ className: 'second-surface', themeColor: '#222222' })

    expect(themeColorMeta).toHaveAttribute('content', '#222222')
    expect(document.documentElement).toHaveClass('first-surface', 'second-surface')

    releaseFirst()
    expect(document.documentElement).not.toHaveClass('first-surface')
    expect(document.documentElement).toHaveClass('second-surface')
    expect(themeColorMeta).toHaveAttribute('content', '#222222')

    releaseSecond()
    expect(document.documentElement).not.toHaveClass('second-surface')
    expect(themeColorMeta).toHaveAttribute('content', '#fff')
  })

  describe('while a sheet is up', () => {
    afterEach(() => document.documentElement.style.removeProperty('--scrim-over-bg'))

    it('gives the status bar and the screen edges the scrim colour, and takes it back after', () => {
      document.documentElement.style.setProperty('--scrim-over-bg', '#a1a0a3')

      const release = dimScreenEdges()
      expect(document.documentElement).toHaveClass('sheet-open')
      expect(themeColorMeta).toHaveAttribute('content', '#a1a0a3')

      release()
      expect(document.documentElement).not.toHaveClass('sheet-open')
      expect(themeColorMeta).toHaveAttribute('content', '#fff')
    })

    it('keeps them dimmed until the last of two sheets closes', () => {
      document.documentElement.style.setProperty('--scrim-over-bg', '#a1a0a3')

      const first = dimScreenEdges()
      const second = dimScreenEdges()
      first()
      expect(document.documentElement).toHaveClass('sheet-open')

      second()
      expect(document.documentElement).not.toHaveClass('sheet-open')
    })

    // The scrim cannot reach these edges, so they fade alongside it. Switching at once made them
    // lead the scrim on the way in and trail it on the way out.
    describe('fading with the scrim', () => {
      beforeEach(() => vi.useFakeTimers())
      afterEach(() => {
        vi.runOnlyPendingTimers()
        vi.useRealTimers()
      })

      const root = () => document.documentElement

      it("fades on the drawer scrim's timing unless told otherwise", () => {
        const release = dimScreenEdges()

        expect(root()).toHaveClass('edges-fading')
        expect(root().style.getPropertyValue('--edge-fade-duration')).toBe('500ms')
        expect(root().style.getPropertyValue('--edge-fade-easing')).toBe(DRAWER_SCRIM_FADE.easing)
        release()
      })

      it('fades back from the moment of release, then stops transitioning', () => {
        const release = dimScreenEdges({ duration: 200, easing: 'ease-out' })
        expect(root().style.getPropertyValue('--edge-fade-duration')).toBe('200ms')

        release()
        // The dim is gone, so the edges start back now, with the transition still on to carry them.
        expect(root()).not.toHaveClass('sheet-open')
        expect(root()).toHaveClass('edges-fading')

        vi.advanceTimersByTime(200)
        // Off again, so a later change of theme still switches the edges at once.
        expect(root()).not.toHaveClass('edges-fading')
        expect(root().style.getPropertyValue('--edge-fade-duration')).toBe('')
      })

      it('keeps fading when another sheet opens while the first fades back', () => {
        dimScreenEdges()()
        vi.advanceTimersByTime(250)
        const second = dimScreenEdges()

        vi.advanceTimersByTime(500)
        expect(root()).toHaveClass('sheet-open', 'edges-fading')

        second()
        expect(root()).toHaveClass('edges-fading')
      })
    })
  })
})
