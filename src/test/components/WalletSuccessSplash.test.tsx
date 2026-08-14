import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import WalletSuccessSplash from '../../components/WalletSuccessSplash'
import { setDocumentThemeColor } from '../../lib/documentSurface'
import { hapticLight } from '../../lib/haptics'

vi.mock('../../lib/haptics', () => ({
  hapticLight: vi.fn(),
}))

const reducedMotionMatchMedia = (query: string): MediaQueryList =>
  ({
    matches: query === '(prefers-reduced-motion: reduce)',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }) as unknown as MediaQueryList

const regularMotionMatchMedia = (query: string): MediaQueryList =>
  ({
    ...reducedMotionMatchMedia(query),
    matches: false,
  }) as MediaQueryList

describe('WalletSuccessSplash', () => {
  let themeColorMeta: HTMLMetaElement

  beforeEach(() => {
    window.matchMedia = vi.fn(reducedMotionMatchMedia)
    vi.mocked(hapticLight).mockClear()
    themeColorMeta = document.createElement('meta')
    themeColorMeta.name = 'theme-color'
    document.head.append(themeColorMeta)
    setDocumentThemeColor('#fff')
  })

  afterEach(() => {
    cleanup()
    document.documentElement.classList.remove('wallet-success-surface-active')
    themeColorMeta.remove()
  })

  it('portals the splash outside the page container and owns the document surface', () => {
    const pageContainer = document.createElement('div')
    document.body.append(pageContainer)

    const { unmount } = render(
      <WalletSuccessSplash
        headline='Payment sent'
        text='1,000 sats sent successfully'
        ariaLabel='Payment sent successfully. Tap to go home.'
        onDone={vi.fn()}
      />,
      { container: pageContainer },
    )

    const splash = screen.getByRole('button', { name: 'Payment sent successfully. Tap to go home.' })
    expect(splash.parentElement).toBe(document.body)
    expect(pageContainer).not.toContainElement(splash)
    expect(document.documentElement).toHaveClass('wallet-success-surface-active')
    expect(themeColorMeta).toHaveAttribute('content', '#5528d4')

    unmount()
    expect(document.documentElement).not.toHaveClass('wallet-success-surface-active')
    expect(themeColorMeta).toHaveAttribute('content', '#fff')
    pageContainer.remove()
  })

  it('keeps the document surface active through exit and releases it afterwards', async () => {
    window.matchMedia = vi.fn(regularMotionMatchMedia)
    const { rerender } = render(
      <WalletSuccessSplash
        show
        headline='Payment received'
        ariaLabel='Payment received successfully. Tap to go home.'
        onDone={vi.fn()}
      />,
    )

    rerender(
      <WalletSuccessSplash
        show={false}
        headline='Payment received'
        ariaLabel='Payment received successfully. Tap to go home.'
        onDone={vi.fn()}
      />,
    )

    expect(document.documentElement).toHaveClass('wallet-success-surface-active')
    await waitFor(() => expect(document.documentElement).not.toHaveClass('wallet-success-surface-active'))
    expect(themeColorMeta).toHaveAttribute('content', '#fff')
  })

  it('dismisses from the portaled button', () => {
    const onDone = vi.fn()
    render(<WalletSuccessSplash headline='Swap created' ariaLabel='Swap created. Tap to go home.' onDone={onDone} />)

    fireEvent.click(screen.getByRole('button', { name: 'Swap created. Tap to go home.' }))

    expect(onDone).toHaveBeenCalledOnce()
    expect(hapticLight).toHaveBeenCalledTimes(2)
  })
})
