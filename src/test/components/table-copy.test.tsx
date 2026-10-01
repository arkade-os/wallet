import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ToastProvider } from '../../components/Toast'
import { LanguageProvider } from '../../providers/language'
import Table from '../../components/Table'

vi.mock('../../lib/clipboard', () => ({
  copyToClipboard: vi.fn(),
}))

vi.mock('../../lib/haptics', () => ({
  hapticSubtle: vi.fn(),
  hapticTap: vi.fn(),
  hapticSuccess: vi.fn(),
  hapticError: vi.fn(),
}))

import { copyToClipboard } from '../../lib/clipboard'
const copyMock = vi.mocked(copyToClipboard)

function buildTree() {
  return (
    <ToastProvider>
      <LanguageProvider>
        <Table variant='receipt' data={[['Arkade address', 'ark1testaddress']]} />
      </LanguageProvider>
    </ToastProvider>
  )
}

describe('Table copy feedback', () => {
  beforeEach(() => {
    copyMock.mockReset()
  })

  it('reports success when the clipboard write succeeds', async () => {
    copyMock.mockResolvedValue(true)
    render(buildTree())

    fireEvent.click(screen.getByTestId('Arkade address'))

    expect(await screen.findByText('Copied to clipboard')).toBeInTheDocument()
  })

  it('reports failure when the clipboard write fails', async () => {
    copyMock.mockResolvedValue(false)
    render(buildTree())

    fireEvent.click(screen.getByTestId('Arkade address'))

    expect(await screen.findByText('Failed to copy')).toBeInTheDocument()
  })
})
