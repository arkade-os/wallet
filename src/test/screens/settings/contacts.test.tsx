import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Contacts from '../../../screens/Settings/Contacts'
import { FlowContext, emptySendInfo } from '../../../providers/flow'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { OptionsContext } from '../../../providers/options'
import { mockFlowContextValue, mockNavigationContextValue, mockOptionsContextValue } from '../mocks'
import { saveContact } from '../../../lib/contacts'

const alice = 'alice@pay.example'

describe('Contacts', () => {
  beforeEach(() => localStorage.clear())

  it('adds, selects, and sends to a reusable contact', () => {
    const setSendInfo = vi.fn()
    const navigate = vi.fn()
    const setOption = vi.fn()
    render(
      <OptionsContext.Provider value={{ ...mockOptionsContextValue, setOption } as any}>
        <NavigationContext.Provider value={{ ...mockNavigationContextValue, navigate }}>
          <FlowContext.Provider value={{ ...mockFlowContextValue, setSendInfo }}>
            <Contacts />
          </FlowContext.Provider>
        </NavigationContext.Provider>
      </OptionsContext.Provider>,
    )

    expect(screen.getByText('No contacts yet')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Address'), { target: { value: alice } })
    fireEvent.change(screen.getByLabelText('Name (optional)'), { target: { value: 'Alice' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add contact' }))
    fireEvent.click(screen.getByRole('button', { name: 'Alice' }))
    expect(screen.getByRole('heading', { name: '1 contacts' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Send to Alice' }))
    expect(setSendInfo).toHaveBeenCalledWith({ ...emptySendInfo, recipient: alice })
    expect(navigate).toHaveBeenCalledWith(Pages.SendForm)
  })

  it('edits and deletes a contact without accepting an invalid destination', async () => {
    saveContact(alice, 'Alice')
    render(<Contacts />)
    fireEvent.click(screen.getByRole('button', { name: 'Alice' }))
    fireEvent.change(screen.getByLabelText('Name (optional)'), { target: { value: 'New name' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save contact' }))
    fireEvent.click(screen.getByRole('button', { name: 'New name' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete contact' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))
    expect(screen.queryByText('New name')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Address'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add contact' }))
    await waitFor(() => expect(screen.getByText('Enter a valid address')).toBeInTheDocument())
  })
})
