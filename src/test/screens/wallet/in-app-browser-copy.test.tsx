import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import InAppBrowser from '../../../screens/Wallet/InAppBrowser'
import { ToastProvider } from '../../../components/Toast'
import { copyToClipboard } from '../../../lib/clipboard'

vi.mock('../../../lib/clipboard', () => ({ copyToClipboard: vi.fn() }))
vi.mock('../../../lib/haptics', () => ({
  hapticSubtle: vi.fn(),
  hapticTap: vi.fn(),
  hapticSuccess: vi.fn(),
  hapticError: vi.fn(),
}))

function renderBrowser() {
  render(
    <ToastProvider>
      <InAppBrowser />
    </ToastProvider>,
  )
}

// The chrome offers the same action twice: a header control and a bottom
// button. Both start as "Copy link", but they settle on different labels — the
// header's aria-label becomes "Copied" and the bottom button's "Copied!" — so
// the header is driven and asserted on its own to keep the two apart.
const copyLinks = () => screen.getAllByRole('button', { name: 'Copy link' })

const clickHeaderCopy = async () => {
  await act(async () => {
    fireEvent.click(copyLinks()[0])
  })
}

describe('InAppBrowser copy link', () => {
  beforeEach(() => {
    vi.mocked(copyToClipboard).mockReset()
  })

  it('flips the button to the copied state when the write lands', async () => {
    vi.mocked(copyToClipboard).mockResolvedValue(true)
    renderBrowser()

    expect(copyLinks()).toHaveLength(2)
    await clickHeaderCopy()

    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument()
    expect(vi.mocked(copyToClipboard)).toHaveBeenCalledWith(window.location.href)
    // Both controls follow the same state, so neither is left offering a copy
    // of a URL that is already on the clipboard.
    expect(screen.queryAllByRole('button', { name: 'Copy link' })).toHaveLength(0)
  })

  // This screen has no toast wired up, so the button label is the only signal
  // the user gets. The dead try/catch it used to wrap meant a refused write
  // still flipped it to "Copied" and left the wrong URL on screen.
  it('leaves the button on the copy-link state when the write is refused', async () => {
    vi.mocked(copyToClipboard).mockResolvedValue(false)
    renderBrowser()

    await clickHeaderCopy()

    expect(copyLinks()).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Copied' })).not.toBeInTheDocument()
  })
})
