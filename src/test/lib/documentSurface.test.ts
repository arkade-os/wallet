import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { activateDocumentSurface, setDocumentThemeColor } from '../../lib/documentSurface'

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
})
