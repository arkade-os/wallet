import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// a hidden tab gets no animation frames; stubbed before framer-motion loads and captures it
vi.hoisted(() => {
  window.requestAnimationFrame = () => 0
})

import LoadingLogo from '../../components/LoadingLogo'

const setHidden = (hidden: boolean) => Object.defineProperty(document, 'hidden', { configurable: true, value: hidden })

describe('LoadingLogo', () => {
  afterEach(() => {
    cleanup()
    setHidden(false)
  })

  it('exits at once when done arrives in a hidden tab', () => {
    setHidden(true)
    const onExitComplete = vi.fn()
    const { rerender } = render(<LoadingLogo exitMode='fly-up' onExitComplete={onExitComplete} />)
    expect(screen.getByTestId('loading-logo')).toBeTruthy()

    rerender(<LoadingLogo exitMode='fly-to-target' done onExitComplete={onExitComplete} />)

    expect(onExitComplete).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('loading-logo')).toBeNull()
  })
})
