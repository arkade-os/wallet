import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PrivateFigure } from '../../components/Figure'
import { ConfigContext } from '../../providers/config'
import { mockConfigContextValue } from '../screens/mocks'

const renderFigure = (showBalance: boolean, masked?: string) =>
  render(
    <ConfigContext.Provider
      value={{ ...mockConfigContextValue, config: { ...mockConfigContextValue.config, showBalance } }}
    >
      <PrivateFigure value='$25.20' masked={masked} />
    </ConfigContext.Provider>,
  ).container

describe('PrivateFigure', () => {
  it('shows the amount while balances are shown', () => {
    expect(renderFigure(true)).toHaveTextContent('$25.20')
  })

  it('shows the mask, and none of the amount, while balances are hidden', () => {
    const container = renderFigure(false, '$••••')
    expect(container).toHaveTextContent('$••••')
    expect(container).not.toHaveTextContent('25')
  })

  it('has a mask of its own when none is given', () => {
    const container = renderFigure(false)
    expect(container.textContent).toMatch(/^•+$/)
  })
})
