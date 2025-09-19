import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Bullet from '../../components/Bullet'

describe('Bullet component', () => {
  it('renders the bullet with the correct label', () => {
    render(<Bullet number={21} />)
    expect(screen.getByText('21')).toBeInTheDocument()
  })
})
