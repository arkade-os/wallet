import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Button from '../../components/Button'
import ButtonsOnButtom from '../../components/ButtonsOnBottom'

describe('ButtonsOnBottom Component', () => {
  it('renders the button with the correct label', () => {
    render(
      <ButtonsOnButtom>
        <Button label='Click Me' onClick={() => {}} />
      </ButtonsOnButtom>,
    )
    expect(screen.getByText('Click Me')).toBeInTheDocument()
  })

  it('calls the onClick handler when clicked', async () => {
    const handleClick = vi.fn()
    render(
      <ButtonsOnButtom>
        <Button label='Click Me' onClick={handleClick} />
      </ButtonsOnButtom>,
    )
    await userEvent.click(screen.getByText('Click Me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
