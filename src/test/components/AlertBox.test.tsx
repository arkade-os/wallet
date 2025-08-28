import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { InfoBox } from '../../components/AlertBox'

describe('AlertBox component', () => {
  it('renders InfoBox with the correct html', () => {
    const { container } = render(<InfoBox html='<p>Hello World</p>' />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
    expect(container.querySelector('p')).not.toBeNull()
  })

  it('sanitizes html: strips scripts and event handlers', () => {
    const { container } = render(
      <InfoBox html={`<img src="x" onerror="alert(1)"><script>alert(2)</script>`} />
    )
    // script nodes should be removed
    expect(container.querySelector('script')).toBeNull()
    // event handler attributes should be removed
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('onerror')).toBeNull()
  })
})
