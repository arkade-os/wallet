import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ContactsSection, { HOME_CONTACTS_LIMIT } from '../../../screens/Wallet/ContactsSection'
import type { Contact } from '../../../lib/contacts'
import { SettingsOptions } from '../../../lib/types'
import { FlowContext, emptySendInfo } from '../../../providers/flow'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { OptionsContext } from '../../../providers/options'
import { mockFlowContextValue, mockNavigationContextValue } from '../mocks'

vi.mock('../../../lib/haptics', () => ({ hapticLight: vi.fn() }))

const contact = (address: string, name?: string): Contact => ({ address, name, sendCount: 1, lastSentAt: 1 })

const renderRow = (contacts: Contact[]) => {
  const setSendInfo = vi.fn()
  const navigate = vi.fn()
  const setOption = vi.fn()
  render(
    <OptionsContext.Provider value={{ setOption } as any}>
      <NavigationContext.Provider value={{ ...mockNavigationContextValue, navigate }}>
        <FlowContext.Provider value={{ ...mockFlowContextValue, setSendInfo }}>
          <ContactsSection contacts={contacts} />
        </FlowContext.Provider>
      </NavigationContext.Provider>
    </OptionsContext.Provider>,
  )
  return { setSendInfo, navigate, setOption }
}

describe('ContactsSection', () => {
  it('opens Send with the contact as the recipient, as a scanned code does', () => {
    const { setSendInfo, navigate } = renderRow([contact('maya@example.com', 'Maya')])

    fireEvent.click(screen.getByRole('button', { name: 'Send to Maya' }))

    expect(setSendInfo).toHaveBeenCalledWith({ ...emptySendInfo, recipient: 'maya@example.com' })
    expect(navigate).toHaveBeenCalledWith(Pages.SendForm)
  })

  it('opens the Contacts screen from View all', () => {
    const { setOption, navigate } = renderRow([contact('maya@example.com', 'Maya')])

    fireEvent.click(screen.getByTestId('contacts-view-all'))

    expect(setOption).toHaveBeenCalledWith(SettingsOptions.Contacts)
    expect(navigate).toHaveBeenCalledWith(Pages.Settings)
  })

  // An address has no word to wrap at, so it gets one line and an ellipsis.
  it('shows an unnamed contact by its address, on one line', () => {
    renderRow([contact('bob@pay.example')])

    expect(screen.getByText('bob@pay.example')).toHaveClass('home-contact__name--address')
    expect(screen.getByRole('button', { name: 'Send to bob@pay.example' })).toBeInTheDocument()
  })

  it(`holds at most ${HOME_CONTACTS_LIMIT} contacts`, () => {
    renderRow(Array.from({ length: HOME_CONTACTS_LIMIT + 3 }, (_, i) => contact(`c${i}@pay.example`, `C${i}`)))

    expect(screen.getAllByRole('listitem')).toHaveLength(HOME_CONTACTS_LIMIT)
  })
})
