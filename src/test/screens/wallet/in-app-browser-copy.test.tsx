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

// Header and bottom button both read "Copy link"; once copied they read "Copied" and "Copied!".
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
    expect(screen.queryAllByRole('button', { name: 'Copy link' })).toHaveLength(0)
  })

  // No toast on this screen: the button label is the only signal.
  it('leaves the button on the copy-link state when the write is refused', async () => {
    vi.mocked(copyToClipboard).mockResolvedValue(false)
    renderBrowser()

    await clickHeaderCopy()

    expect(copyLinks()).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Copied' })).not.toBeInTheDocument()
  })
})
