import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
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

  it('renders the checklist with the correct colors 1/5', () => {
    render(<CheckList data={generateData('secret')} />)
    expect(screen.getByText('8 characters minimum')).toHaveStyle('color: var(--dark70)')
    expect(screen.getByText('contain at least 1 number')).toHaveStyle('color: var(--dark70)')
    expect(screen.getByText('contain at least 1 special character')).toHaveStyle('color: var(--dark70)')
  })

  it('renders the checklist with the correct colors 2/5', () => {
    render(<CheckList data={generateData('secretword')} />)
    expect(screen.getByText('8 characters minimum')).toHaveStyle('color: var(--green)')
    expect(screen.getByText('contain at least 1 number')).toHaveStyle('color: var(--dark70)')
    expect(screen.getByText('contain at least 1 special character')).toHaveStyle('color: var(--dark70)')
  })

  it('renders the checklist with the correct colors 3/5', () => {
    render(<CheckList data={generateData('secret1')} />)
    expect(screen.getByText('8 characters minimum')).toHaveStyle('color: var(--dark70)')
    expect(screen.getByText('contain at least 1 number')).toHaveStyle('color: var(--green)')
    expect(screen.getByText('contain at least 1 special character')).toHaveStyle('color: var(--dark70)')
  })

  it('renders the checklist with the correct colors 4/5', () => {
    render(<CheckList data={generateData('secret!')} />)
    expect(screen.getByText('8 characters minimum')).toHaveStyle('color: var(--dark70)')
    expect(screen.getByText('contain at least 1 number')).toHaveStyle('color: var(--dark70)')
    expect(screen.getByText('contain at least 1 special character')).toHaveStyle('color: var(--green)')
  })

  it('renders the checklist with the correct colors 5/5', () => {
    render(<CheckList data={generateData('secretword1!')} />)
    expect(screen.getByText('8 characters minimum')).toHaveStyle('color: var(--green)')
    expect(screen.getByText('contain at least 1 number')).toHaveStyle('color: var(--green)')
    expect(screen.getByText('contain at least 1 special character')).toHaveStyle('color: var(--green)')
  })
})
