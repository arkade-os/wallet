import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import Checkbox from '../../components/Checkbox'

describe('Checkbox component', () => {
  it('updates the visual checked state when clicked', async () => {
    render(<Checkbox text='Click Me' onChange={() => {}} />)
    const checkbox = screen.getByRole('checkbox')

    expect(checkbox).not.toHaveAttribute('data-checked')
    await userEvent.click(screen.getByText('Click Me'))
    expect(checkbox).toHaveAttribute('data-checked')
  })
})
