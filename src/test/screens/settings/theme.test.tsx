import { ConfigContext } from '../../../providers/config'
import { render, screen } from '@testing-library/react'
import Theme from '../../../screens/Settings/Theme'
import { mockConfigContextValue } from '../mocks'
import { describe, expect, it } from 'vitest'

describe('Theme screen', () => {
  it('renders the theme screen with the correct elements', () => {
    render(
      <ConfigContext.Provider value={mockConfigContextValue as any}>
        <Theme />
      </ConfigContext.Provider>,
    )
    expect(screen.getByText('Theme')).toBeInTheDocument()
    expect(screen.getByTestId('select-option-0')).toBeInTheDocument()
    expect(screen.getByTestId('select-option-0').querySelector('p')?.textContent).toBe('Auto (Dark)')
    expect(screen.getByTestId('select-option-1')).toBeInTheDocument()
    expect(screen.getByTestId('select-option-1').querySelector('p')?.textContent).toBe('Dark')
    expect(screen.getByTestId('select-option-2')).toBeInTheDocument()
    expect(screen.getByTestId('select-option-2').querySelector('p')?.textContent).toBe('Light')
  })

  it('renders the theme screen with the correct default selection', () => {
    render(
      <ConfigContext.Provider value={mockConfigContextValue as any}>
        <Theme />
      </ConfigContext.Provider>,
    )
    // mock config has theme: Dark, so option-1 (Dark) should have the checkmark
    expect(screen.getByTestId('select-option-0').querySelector('svg')).not.toBeInTheDocument()
    expect(screen.getByTestId('select-option-1').querySelector('svg')).toBeInTheDocument()
    expect(screen.getByTestId('select-option-2').querySelector('svg')).not.toBeInTheDocument()
  })
})
