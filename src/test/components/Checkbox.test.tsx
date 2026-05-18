import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Checkbox from '../../components/Checkbox'

describe('Checkbox component', () => {
  it('renders the checkbox with the correct text', () => {
    render(<Checkbox text='Click Me' onChange={() => {}} />)
    expect(screen.getByText('Click Me')).toBeInTheDocument()
  })

  it('calls the onChange handler when changed', async () => {
    const handleChange = vi.fn()
    render(<Checkbox text='Click Me' onChange={handleChange} />)
    await userEvent.click(screen.getByText('Click Me'))
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it('updates the visual checked state when clicked', async () => {
    render(<Checkbox text='Click Me' onChange={() => {}} />)
    const checkbox = screen.getByRole('checkbox')

    expect(checkbox).not.toHaveAttribute('data-checked')
    await userEvent.click(screen.getByText('Click Me'))
    expect(checkbox).toHaveAttribute('data-checked')
  })
})
