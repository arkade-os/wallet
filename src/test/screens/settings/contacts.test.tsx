import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Contacts from '../../../screens/Settings/Contacts'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { FlowContext, emptySendInfo } from '../../../providers/flow'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { OptionsContext } from '../../../providers/options'
import { WalletContext } from '../../../providers/wallet'
import { recordSentRecent, saveContact, saveRecentAsContact } from '../../../lib/contacts'
import type { Tx } from '../../../lib/types'
import {
  mockConfigContextValue,
  mockFiatContextValue,
  mockFlowContextValue,
  mockNavigationContextValue,
  mockOptionsContextValue,
  mockWalletContextValue,
} from '../mocks'

vi.mock('../../../components/SheetModal', () => ({
  default: ({ isOpen, children }: { isOpen: boolean; children?: React.ReactNode }) =>
    isOpen ? <div data-testid='sheet-modal'>{children}</div> : null,
}))

const alice = 'alice@pay.example'
const coffee = 'bcrt1pj7fdvrpdsn0cl6722tmcvwcw4yqpe46020g43nhgzl90qq4aqjrs33du9f'

const renderPage = ({
  txs = [],
  setSendInfo = vi.fn(),
  navigate = vi.fn(),
}: {
  txs?: Tx[]
  setSendInfo?: (info: unknown) => void
  navigate?: (page: Pages) => void
} = {}) =>
  render(
    <OptionsContext.Provider value={{ ...mockOptionsContextValue, setOption: vi.fn() } as any}>
      <NavigationContext.Provider value={{ ...mockNavigationContextValue, navigate }}>
        <ConfigContext.Provider value={mockConfigContextValue}>
          <FiatContext.Provider value={mockFiatContextValue}>
            <FlowContext.Provider value={{ ...mockFlowContextValue, setSendInfo }}>
              <WalletContext.Provider value={{ ...mockWalletContextValue, txs } as any}>
                <Contacts />
              </WalletContext.Provider>
            </FlowContext.Provider>
          </FiatContext.Provider>
        </ConfigContext.Provider>
      </NavigationContext.Provider>
    </OptionsContext.Provider>,
  )

describe('Contacts', () => {
  beforeEach(() => localStorage.clear())

  it('adds a contact in a modal, opens its details, then sends to it', () => {
    const setSendInfo = vi.fn()
    const navigate = vi.fn()
    renderPage({ setSendInfo, navigate })

    expect(screen.getByText('No contacts yet')).toBeInTheDocument()
    expect(screen.queryByLabelText('Address')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'New contact' }))
    fireEvent.change(screen.getByLabelText('Address'), { target: { value: alice } })
    fireEvent.change(screen.getByLabelText('Name (optional)'), { target: { value: 'Alice' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save contact' }))

    expect(screen.getByRole('heading', { name: 'Alice' })).toBeInTheDocument()
    expect(screen.getByText('Recent payments')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Send to Alice' }))
    expect(setSendInfo).toHaveBeenCalledWith({ ...emptySendInfo, recipient: alice })
    expect(navigate).toHaveBeenCalledWith(Pages.SendForm)
  })

  it('edits and deletes a contact from its detail view, and rejects an invalid address', async () => {
    saveContact(alice, 'Alice')
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Alice' }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit contact' }))
    fireEvent.change(screen.getByLabelText('Name (optional)'), { target: { value: 'New name' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save contact' }))
    expect(screen.getByRole('heading', { name: 'New name' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete contact' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))
    expect(screen.getByText('No contacts yet')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'New contact' }))
    fireEvent.change(screen.getByLabelText('Address'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save contact' }))
    await waitFor(() => expect(screen.getByText('Enter a valid address')).toBeInTheDocument())
  })

  it('keeps the contact sheet mounted while typing a name', async () => {
    const user = userEvent.setup()
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'New contact' }))
    const input = screen.getByLabelText('Name (optional)')
    await user.type(input, 'Alice')

    expect(screen.getByLabelText('Name (optional)')).toBe(input)
    expect(input).toHaveValue('Alice')
    expect(document.activeElement).toBe(input)
    expect(screen.getByTestId('sheet-modal')).toBeInTheDocument()
  })

  it('returns from a contact to the list without leaving the contacts page', () => {
    saveContact(alice, 'Alice')
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Alice' }))
    fireEvent.click(screen.getByRole('button', { name: 'Contacts' }))
    expect(screen.getByText('1 contact')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Alice' })).toBeInTheDocument()
  })

  it('lists recent payees apart from contacts and converts one on demand', () => {
    recordSentRecent(coffee, 1_700_000_000_000)
    saveContact(alice, 'Alice')
    renderPage()

    expect(screen.getByText('Recent payees')).toBeInTheDocument()
    expect(screen.getByText('1 contact')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Save as contact' }))
    fireEvent.change(screen.getByLabelText('Name (optional)'), { target: { value: 'Coffee' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save contact' }))
    fireEvent.click(screen.getByRole('button', { name: 'Contacts' }))
    expect(screen.getByText('2 contacts')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Coffee' })).toBeInTheDocument()
  })

  it('opens the saved contact, not a blank editor, from its recent row', () => {
    recordSentRecent(alice, 1_700_000_000_000)
    saveContact(alice, 'Alice')
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Open contact' }))
    expect(screen.getByRole('heading', { name: 'Alice' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Name (optional)')).not.toBeInTheDocument()
  })

  it('keeps one contact with its stats when the destination is edited', () => {
    recordSentRecent(coffee, 1_700_000_000_000)
    saveRecentAsContact(coffee, 'Coffee')
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Coffee' }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit contact' }))
    fireEvent.change(screen.getByLabelText('Address'), { target: { value: alice } })
    fireEvent.click(screen.getByRole('button', { name: 'Save contact' }))
    fireEvent.click(screen.getByRole('button', { name: 'Contacts' }))

    expect(screen.getByText('1 contact')).toBeInTheDocument()
    expect(screen.getByText('1 send recorded locally')).toBeInTheDocument()
  })

  it('refuses to move a contact onto another contact destination', async () => {
    saveContact(alice, 'Alice')
    saveContact(coffee, 'Coffee')
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Alice' }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit contact' }))
    fireEvent.change(screen.getByLabelText('Address'), { target: { value: coffee } })
    fireEvent.click(screen.getByRole('button', { name: 'Save contact' }))
    await waitFor(() =>
      expect(screen.getAllByText('That address is already saved as another contact').length).toBeGreaterThan(0),
    )
  })

  it('shows only the selected contact payments, and rows still open the transaction', () => {
    const paid: Tx = {
      amount: 500,
      boardingTxid: '',
      createdAt: 1_700_000_100,
      destination: coffee,
      explorable: undefined,
      preconfirmed: false,
      redeemTxid: 'send-coffee',
      roundTxid: '',
      settled: true,
      type: 'sent',
    }
    const unrelated: Tx = { ...paid, destination: alice, redeemTxid: 'send-alice' }
    saveContact(coffee, 'Coffee')
    const navigate = vi.fn()
    const { container } = renderPage({ txs: [paid, unrelated], navigate })

    fireEvent.click(screen.getByRole('button', { name: 'Coffee' }))
    expect(screen.getByText('Recent payments')).toBeInTheDocument()
    expect(container.querySelectorAll('.activity-row')).toHaveLength(1)
    expect(screen.getByText('Sent to Coffee')).toBeInTheDocument()

    fireEvent.click(container.querySelector('.activity-row')!)
    expect(navigate).toHaveBeenCalledWith(Pages.Transaction)
  })
})
