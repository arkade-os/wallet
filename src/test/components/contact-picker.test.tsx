import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ContactPicker from '../../components/ContactPicker'
import { saveContact } from '../../lib/contacts'

describe('ContactPicker', () => {
  beforeEach(() => localStorage.clear())

  it('selects a saved contact', () => {
    saveContact('alice@pay.example', 'Alice')
    const onSelect = vi.fn()
    render(<ContactPicker disabled={false} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: 'Contacts' }))
    fireEvent.click(screen.getByRole('button', { name: /Alice/ }))
    expect(onSelect).toHaveBeenCalledWith('alice@pay.example')
  })
})
