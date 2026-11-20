import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ToastProvider, toast } from '../../components/Toast'

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('ToastProvider', () => {
  // Sonner's own offsets ignore the safe area, so on an iPhone a toast sat under the status bar and
  // the notch, unreadable. Both offsets keep it below the safe area, and no higher than before.
  it('keeps toasts below the safe area at the top of the screen', async () => {
    render(<ToastProvider>{null}</ToastProvider>)
    act(() => {
      toast('Copied to clipboard')
    })
    await screen.findByText('Copied to clipboard')

    const toaster = document.querySelector<HTMLElement>('[data-sonner-toaster]')!
    expect(toaster.style.getPropertyValue('--offset-top')).toBe('max(24px, calc(env(safe-area-inset-top, 0px) + 8px))')
    expect(toaster.style.getPropertyValue('--mobile-offset-top')).toBe(
      'max(16px, calc(env(safe-area-inset-top, 0px) + 8px))',
    )
    // The other edges keep sonner's defaults.
    expect(toaster.style.getPropertyValue('--mobile-offset-left')).toBe('16px')
  })
})
