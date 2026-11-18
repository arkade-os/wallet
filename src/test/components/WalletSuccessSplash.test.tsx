import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import WalletSuccessSplash from '../../components/WalletSuccessSplash'
import { hapticSuccess } from '../../lib/haptics'
import { setDocumentThemeColor } from '../../lib/documentSurface'

vi.mock('../../lib/haptics', () => ({
  hapticLight: vi.fn(),
  hapticSuccess: vi.fn(),
  hapticTap: vi.fn(),
}))

describe('WalletSuccessSplash', () => {
  let themeColorMeta: HTMLMetaElement

  beforeEach(() => {
    vi.mocked(hapticSuccess).mockClear()
    themeColorMeta = document.createElement('meta')
    themeColorMeta.name = 'theme-color'
    document.head.append(themeColorMeta)
    setDocumentThemeColor('#fff')
  })

  afterEach(() => {
    cleanup()
    themeColorMeta.remove()
  })

  it('shows success in a sheet named by its headline, with what happened and one way out', () => {
    const onDone = vi.fn()
    render(<WalletSuccessSplash headline='Payment sent' text='1,000 sats sent successfully' onDone={onDone} />)

    const sheet = screen.getByRole('dialog', { name: 'Payment sent' })
    expect(sheet).toContainElement(screen.getByRole('heading', { name: 'Payment sent' }))
    expect(sheet).toHaveTextContent('1,000 sats sent successfully')

    fireEvent.click(screen.getByRole('button', { name: 'Sounds good' }))
    expect(onDone).toHaveBeenCalledOnce()
  })

  // The old splash painted the whole document purple and retinted the browser
  // chrome. Success now ends where the payment was confirmed, so neither moves.
  it('leaves the document surface and the theme colour alone', () => {
    const { unmount } = render(<WalletSuccessSplash headline='Payment received' onDone={vi.fn()} />)

    expect(document.documentElement).not.toHaveClass('wallet-success-surface-active')
    expect(themeColorMeta).toHaveAttribute('content', '#fff')

    unmount()
    expect(themeColorMeta).toHaveAttribute('content', '#fff')
  })

  it('shows the paid figure behind the scrim when one is given', () => {
    render(<WalletSuccessSplash headline='Payment sent' backdrop={<span>$25.20</span>} onDone={vi.fn()} />)
    expect(screen.getByText('$25.20')).toBeInTheDocument()
  })

  it('confirms with one success haptic, and only while shown', () => {
    const { rerender } = render(<WalletSuccessSplash show={false} headline='Payment sent' onDone={vi.fn()} />)
    expect(screen.queryByTestId('success-sheet')).not.toBeInTheDocument()
    expect(hapticSuccess).not.toHaveBeenCalled()

    rerender(<WalletSuccessSplash show headline='Payment sent' onDone={vi.fn()} />)
    expect(screen.getByTestId('success-sheet')).toBeInTheDocument()
    expect(hapticSuccess).toHaveBeenCalledOnce()
  })
})
