import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Logs from '../../../screens/Settings/Logs'
import { ToastProvider } from '../../../components/Toast'
import { copyToClipboard } from '../../../lib/clipboard'

const message = 'sync failed for address'

vi.mock('../../../lib/clipboard', () => ({ copyToClipboard: vi.fn() }))
vi.mock('../../../lib/haptics', () => ({
  hapticSubtle: vi.fn(),
  hapticTap: vi.fn(),
  hapticSuccess: vi.fn(),
  hapticError: vi.fn(),
}))
vi.mock('../../../lib/logs', () => ({
  getLogs: () => [{ time: '2024-01-01T00:00:00.000Z', msg: message, level: 'error' }],
  clearLogs: vi.fn(),
}))

function renderLogs() {
  render(
    <ToastProvider>
      <Logs />
    </ToastProvider>,
  )
}

// The row copies only on Enter; the mouse path goes through Text.
function pressEnterOnRow() {
  const row = screen.getByLabelText((label) => label.includes(message))
  act(() => {
    fireEvent.keyDown(row, { key: 'Enter' })
  })
}

describe('Logs copy feedback', () => {
  beforeEach(() => {
    vi.mocked(copyToClipboard).mockReset()
  })

  it('confirms the copy when the write lands', async () => {
    vi.mocked(copyToClipboard).mockResolvedValue(true)
    renderLogs()

    pressEnterOnRow()

    expect(await screen.findByText('Copied to clipboard')).toBeInTheDocument()
    expect(screen.queryByText('Failed to copy')).not.toBeInTheDocument()
  })

  it('reports the failure instead of claiming success when the write is refused', async () => {
    vi.mocked(copyToClipboard).mockResolvedValue(false)
    renderLogs()

    pressEnterOnRow()

    expect(await screen.findByText('Failed to copy')).toBeInTheDocument()
    expect(screen.queryByText('Copied to clipboard')).not.toBeInTheDocument()
  })
})
