import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import Delegates from '../../../screens/Settings/Delegates'
import { ConfigContext } from '../../../providers/config'
import { mockAspContextValue, mockConfigContextValue } from '../mocks'
import { AspContext } from '../../../providers/asp'

describe('Delegates screen', () => {
  it.skip('renders the delegates screen with the correct elements', () => {
    render(
      <AspContext.Provider value={mockAspContextValue as any}>
        <ConfigContext.Provider value={mockConfigContextValue as any}>
          <Delegates />
        </ConfigContext.Provider>
      </AspContext.Provider>,
    )
    expect(screen.getByText('Delegates')).toBeInTheDocument()
    expect(screen.getByText('Learn more')).toBeInTheDocument()
    expect(screen.getByText('What is a Delegate?')).toBeInTheDocument()
    expect(screen.getByText('Use default Arkade delegate')).toBeInTheDocument()
    expect(screen.getByText(/Delegates can only renew your VTXOs/)).toBeInTheDocument()
    expect(screen.getByTestId('toggle-delegates').getAttribute('checked')).toBe('false')
  })

  it('renders the delegate card when toggle is on', () => {
    const mockConfigWithDelegate = {
      ...mockConfigContextValue,
      config: { ...mockConfigContextValue.config, delegate: true },
    }
    render(
      <AspContext.Provider value={mockAspContextValue as any}>
        <ConfigContext.Provider value={mockConfigWithDelegate as any}>
          <Delegates />
        </ConfigContext.Provider>
      </AspContext.Provider>,
    )
    expect(screen.getByText('Delegates')).toBeInTheDocument()
    expect(screen.getByText('Learn more')).toBeInTheDocument()
    expect(screen.getByText('What is a Delegate?')).toBeInTheDocument()
    expect(screen.getByText('Use default Arkade delegate')).toBeInTheDocument()
    expect(screen.getByText(/Delegates can only renew your VTXOs/)).toBeInTheDocument()
    expect(screen.getByTestId('delegate-card')).toBeInTheDocument()
    expect(screen.getByTestId('toggle-delegates').getAttribute('checked')).toBe('true')
  })
})
