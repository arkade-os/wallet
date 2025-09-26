import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import CenterScreen from '../../components/CenterScreen'

describe('CenterScreen component', () => {
  it('renders the center screen content', () => {
    render(
      <CenterScreen>
        <p>Center screen</p>
      </CenterScreen>,
    )
    expect(screen.getByText('Center screen')).toBeInTheDocument()
  })

  it('calls the onClick handler when clicked', async () => {
    const handleClick = vi.fn()
    render(
      <CenterScreen onClick={handleClick}>
        <p>Center screen</p>
      </CenterScreen>,
    )
    await userEvent.click(screen.getByText('Center screen'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
