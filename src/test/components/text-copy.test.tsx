import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ToastProvider } from '../../components/Toast'
import { ConfigContext } from '../../providers/config'
import { LanguageProvider } from '../../providers/language'
import { mockConfigContextValue } from '../screens/mocks'
import Text from '../../components/Text'

vi.mock('../../lib/clipboard', () => ({
  copyToClipboard: vi.fn(),
}))

vi.mock('../../lib/haptics', () => ({
  hapticSubtle: vi.fn(),
}))

import { copyToClipboard } from '../../lib/clipboard'
const copyMock = vi.mocked(copyToClipboard)

function buildTree(copy: string) {
  return (
    <ToastProvider>
      <ConfigContext.Provider value={mockConfigContextValue as any}>
        <LanguageProvider>
          <Text copy={copy}>Tap to copy</Text>
        </LanguageProvider>
      </ConfigContext.Provider>
    </ToastProvider>
  )
}

describe('Text copy feedback', () => {
  beforeEach(() => {
    copyMock.mockReset()
  })

  it('shows the copied toast when the clipboard write succeeds', async () => {
    copyMock.mockResolvedValue(true)
    render(buildTree('hello'))
    fireEvent.click(screen.getByText('Tap to copy'))
    expect(await screen.findByText('Copied to clipboard')).toBeInTheDocument()
  })

  it('shows the failed-to-copy toast when the clipboard write fails', async () => {
    copyMock.mockResolvedValue(false)
    render(buildTree('hello'))
    fireEvent.click(screen.getByText('Tap to copy'))
    expect(await screen.findByText('Failed to copy')).toBeInTheDocument()
  })
})
