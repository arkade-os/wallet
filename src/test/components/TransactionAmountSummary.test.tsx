import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TransactionAmountSummary from '../../components/TransactionAmountSummary'
import { ConfigContext } from '../../providers/config'
import { mockConfigContextValue } from '../screens/mocks'

describe('TransactionAmountSummary', () => {
  // As on Home and Receive: a large figure's minor units are drawn apart, in grey.
  it('draws the cents of the figure apart from the rest of it', () => {
    const value = { value: '$25.23', masked: '$•••••' }
    render(
      <ConfigContext.Provider value={mockConfigContextValue}>
        <TransactionAmountSummary
          amount={{ configured: value, primary: value, raw: [] } as never}
          label='Amount sent'
        />
      </ConfigContext.Provider>,
    )

    const figure = screen.getByTestId('primary-amount')
    expect(figure).toHaveTextContent('$25.23')
    expect(figure.querySelector('.figure__minor')).toHaveTextContent('.23')
  })
})
