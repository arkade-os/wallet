import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import SegmentedControl from '../../components/SegmentedControl'

describe('SegmentedControl', () => {
  it('renders each option as a tab and marks the selected option', () => {
    render(<SegmentedControl options={['BTC', 'USD']} selected='USD' onChange={() => {}} />)

    expect(screen.getByRole('tablist')).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(2)
    expect(screen.getByRole('tab', { name: 'BTC' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'USD' })).toHaveAttribute('aria-selected', 'true')
  })

  it('calls onChange with the clicked option', async () => {
    const onChange = vi.fn()
    render(<SegmentedControl options={['BTC', 'USD']} selected='BTC' onChange={onChange} />)

    await userEvent.click(screen.getByRole('tab', { name: 'USD' }))

    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith('USD')
  })

  it('uses getLabel to render option labels when provided', () => {
    render(
      <SegmentedControl
        options={['BTC', 'USD']}
        selected='BTC'
        onChange={() => {}}
        getLabel={(option) => (option === 'BTC' ? 'Bitcoin' : 'US Dollar')}
      />,
    )

    expect(screen.getByRole('tab', { name: 'Bitcoin' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'US Dollar' })).toBeInTheDocument()
  })
})
