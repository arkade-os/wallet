import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useContext } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DevModeContext, DevModeProvider } from '../../providers/devMode'

function Harness() {
  const { devMode, handleTap } = useContext(DevModeContext)
  return (
    <div>
      <span data-testid='status'>{devMode ? 'on' : 'off'}</span>
      <button onClick={handleTap}>tap</button>
    </div>
  )
}

describe('DevModeProvider', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => {
    localStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  it('starts with dev mode off', () => {
    render(
      <DevModeProvider>
        <Harness />
      </DevModeProvider>,
    )
    expect(screen.getByTestId('status').textContent).toBe('off')
  })

  it('reads initial state from localStorage', () => {
    localStorage.setItem('dev_mode', 'true')
    render(
      <DevModeProvider>
        <Harness />
      </DevModeProvider>,
    )
    expect(screen.getByTestId('status').textContent).toBe('on')
  })

  it('enables dev mode from ?dev=true and persists it', () => {
    window.history.replaceState({}, '', '/?dev=true')
    render(
      <DevModeProvider>
        <Harness />
      </DevModeProvider>,
    )
    expect(screen.getByTestId('status').textContent).toBe('on')
    expect(localStorage.getItem('dev_mode')).toBe('true')
  })

  it('disables dev mode from ?dev=false even if previously enabled', () => {
    localStorage.setItem('dev_mode', 'true')
    window.history.replaceState({}, '', '/?dev=false')
    render(
      <DevModeProvider>
        <Harness />
      </DevModeProvider>,
    )
    expect(screen.getByTestId('status').textContent).toBe('off')
    expect(localStorage.getItem('dev_mode')).toBe('false')
  })

  it('ignores an unrelated dev value and falls back to localStorage', () => {
    localStorage.setItem('dev_mode', 'true')
    window.history.replaceState({}, '', '/?dev=maybe')
    render(
      <DevModeProvider>
        <Harness />
      </DevModeProvider>,
    )
    expect(screen.getByTestId('status').textContent).toBe('on')
  })

  it('does not toggle after fewer than 3 taps', async () => {
    const user = userEvent.setup()
    render(
      <DevModeProvider>
        <Harness />
      </DevModeProvider>,
    )
    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('button'))
    expect(screen.getByTestId('status').textContent).toBe('off')
  })

  it('toggles on after exactly 3 taps and persists to localStorage', async () => {
    const user = userEvent.setup()
    render(
      <DevModeProvider>
        <Harness />
      </DevModeProvider>,
    )
    const btn = screen.getByRole('button')
    await user.click(btn)
    await user.click(btn)
    await user.click(btn)
    expect(screen.getByTestId('status').textContent).toBe('on')
    expect(localStorage.getItem('dev_mode')).toBe('true')
  })

  it('toggles back off on the next triple-tap', async () => {
    const user = userEvent.setup()
    localStorage.setItem('dev_mode', 'true')
    render(
      <DevModeProvider>
        <Harness />
      </DevModeProvider>,
    )
    const btn = screen.getByRole('button')
    await user.click(btn)
    await user.click(btn)
    await user.click(btn)
    expect(screen.getByTestId('status').textContent).toBe('off')
    expect(localStorage.getItem('dev_mode')).toBe('false')
  })

  it('resets tap counter after 600 ms so a stale sequence does not toggle', async () => {
    const user = userEvent.setup({ delay: null })
    render(
      <DevModeProvider>
        <Harness />
      </DevModeProvider>,
    )
    const btn = screen.getByRole('button')
    await user.click(btn)
    await user.click(btn)
    // Advance past the 600 ms reset window
    await act(async () => {
      await new Promise((r) => setTimeout(r, 700))
    })
    // This is now tap 1 of a new sequence — not a 3rd tap of the old one
    await user.click(btn)
    expect(screen.getByTestId('status').textContent).toBe('off')
  })
})
