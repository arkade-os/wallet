import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Button from '../../components/Button'

describe('Button component', () => {
  it('renders the button with the correct label', () => {
    render(<Button label='Click Me' onClick={() => {}} />)
    expect(screen.getByText('Click Me')).toBeInTheDocument()
  })

  it('calls the onClick handler when clicked', async () => {
    const handleClick = vi.fn()
    render(<Button label='Click Me' onClick={handleClick} />)
    await userEvent.click(screen.getByText('Click Me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
