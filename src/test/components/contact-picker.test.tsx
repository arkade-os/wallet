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

  it('counts a single send in the singular', () => {
    localStorage.setItem('contacts.split.v1', '1')
    localStorage.setItem(
      'contacts',
      JSON.stringify([{ address: 'alice@pay.example', name: 'Alice', sendCount: 1, lastSentAt: 1 }]),
    )
    render(<ContactPicker disabled={false} onSelect={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Contacts' }))
    expect(screen.getByText('1 send recorded locally')).toBeInTheDocument()
  })
})
