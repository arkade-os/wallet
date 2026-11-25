import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ExpandAddresses from '../../components/ExpandAddresses'
import { ToastProvider } from '../../components/Toast'
import { copyToClipboard } from '../../lib/clipboard'

vi.mock('../../lib/clipboard', () => ({ copyToClipboard: vi.fn() }))
vi.mock('../../lib/haptics', () => ({
  hapticSubtle: vi.fn(),
  hapticTap: vi.fn(),
  hapticSuccess: vi.fn(),
  hapticError: vi.fn(),
}))
// The icons are bare <svg>s; stub them so the marker state is queryable.
vi.mock('../../icons/CheckMark', () => ({ default: () => <span>MARKER-COPIED</span> }))
vi.mock('../../icons/Copy', () => ({ default: () => <span>MARKER-IDLE</span> }))

const bip21uri = 'bitcoin:bc1testaddress?amount=0.001'
const boardingAddr = 'bc1boardingtest'
const offchainAddr = 'ark1offchaintest'
const invoice = 'lnbc10u1ptestinvoice'

function renderExpanded() {
  render(
    <ToastProvider>
      <ExpandAddresses
        bip21uri={bip21uri}
        boardingAddr={boardingAddr}
        offchainAddr={offchainAddr}
        invoice={invoice}
        onClick={() => {}}
      />
    </ToastProvider>,
  )
  // Rows only render once expanded.
  act(() => {
    fireEvent.click(screen.getByText('Copy address'))
  })
}

const copyRow = (testId: string) =>
  act(() => {
    fireEvent.click(screen.getByTestId(`${testId}-address-copy`))
  })

describe('ExpandAddresses copy feedback', () => {
  beforeEach(() => {
    vi.mocked(copyToClipboard).mockReset()
  })

  it('marks the row as copied and confirms when the write lands', async () => {
    vi.mocked(copyToClipboard).mockResolvedValue(true)
    renderExpanded()

    copyRow('ark')

    expect(await screen.findByText('Copied to clipboard')).toBeInTheDocument()
    expect(screen.getByTestId('ark-address-copy')).toHaveTextContent('MARKER-COPIED')
    expect(screen.queryByText('Failed to copy')).not.toBeInTheDocument()
  })

  it('leaves the row unmarked and reports the failure when the write is refused', async () => {
    vi.mocked(copyToClipboard).mockResolvedValue(false)
    renderExpanded()

    copyRow('ark')

    expect(await screen.findByText('Failed to copy')).toBeInTheDocument()
    expect(screen.getByTestId('ark-address-copy')).toHaveTextContent('MARKER-IDLE')
    expect(screen.queryByText('Copied to clipboard')).not.toBeInTheDocument()
  })

  it('does not mark a row that was not the one copied', async () => {
    vi.mocked(copyToClipboard).mockResolvedValue(true)
    renderExpanded()

    copyRow('ark')

    expect(await screen.findByText('Copied to clipboard')).toBeInTheDocument()
    expect(screen.getByTestId('btc-address-copy')).toHaveTextContent('MARKER-IDLE')
  })
})
