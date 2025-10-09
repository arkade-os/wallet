import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import CheckList from '../../components/CheckList'

describe('CheckList component', () => {
  const generateData = (password: string) => [
    {
      text: '8 characters minimum',
      done: password.length > 7,
    },
    {
      text: 'contain at least 1 number',
      done: /\d/.test(password),
    },
    {
      text: 'contain at least 1 special character',
      done: /\W/.test(password),
    },
  ]

  it('renders the checklist with the correct text', () => {
    render(<CheckList data={generateData('secret')} />)
    expect(screen.getByText('8 characters minimum')).toBeInTheDocument()
    expect(screen.getByText('contain at least 1 number')).toBeInTheDocument()
    expect(screen.getByText('contain at least 1 special character')).toBeInTheDocument()
  })

  it.each([
    ['secret', [false, false, false]],
    ['secretword', [true, false, false]],
    ['secret1', [false, true, false]],
    ['secret!', [false, false, true]],
    ['secretword1', [true, true, false]],
    ['secretword!', [true, false, true]],
    ['1234567!', [true, true, true]],
    ['secretword1!', [true, true, true]],
  ])('applies colors correctly for %s', (pwd, [lenOk, hasNum, hasSpec]) => {
    render(<CheckList data={generateData(pwd)} />)
    const GREEN = 'color: var(--green)'
    const DARK = 'color: var(--dark70)'
    expect(screen.getByText('8 characters minimum')).toHaveStyle(lenOk ? GREEN : DARK)
    expect(screen.getByText('contain at least 1 number')).toHaveStyle(hasNum ? GREEN : DARK)
    expect(screen.getByText('contain at least 1 special character')).toHaveStyle(hasSpec ? GREEN : DARK)
  })
})
