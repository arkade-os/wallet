import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import InputWithScanner from '../../components/InputWithScanner'

const renderInput = (error?: string) => {
  render(<InputWithScanner label='Recipient' error={error} onChange={() => {}} openScan={() => {}} />)
  return screen.getByRole('textbox', { name: 'Recipient' })
}

describe('InputWithScanner', () => {
  it('describes the input with its error', () => {
    const input = renderInput('Invalid address')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Invalid address')
  })

  it('leaves the input valid and undescribed without an error', () => {
    const input = renderInput()
    expect(input).not.toHaveAttribute('aria-invalid')
    expect(input).not.toHaveAttribute('aria-describedby')
  })
})
