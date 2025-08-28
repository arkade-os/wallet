import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { InfoBox } from '../../components/AlertBox'

describe('AlertBox component', () => {
  it('renders InfoBox with the correct html', () => {
    render(<InfoBox html='<p>Hello World</p>' />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })
})
