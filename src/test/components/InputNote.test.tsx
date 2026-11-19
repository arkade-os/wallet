import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const touch = vi.hoisted(() => ({ isMobileBrowser: true }))
vi.mock('../../lib/browser', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/browser')>()),
  get isMobileBrowser() {
    return touch.isMobileBrowser
  },
}))

import InputNote from '../../components/InputNote'

const renderNote = () => render(<InputNote label='Ark note' onChange={() => {}} openScan={() => {}} value='' />)

describe('InputNote', () => {
  // The system keyboard would cover the screen before the user chose between paste and scan.
  it('does not take focus on a phone', () => {
    touch.isMobileBrowser = true
    const { container } = renderNote()

    expect(container.querySelector('input')).not.toHaveFocus()
  })

  it('takes focus on a desktop, ready to type or paste into', () => {
    touch.isMobileBrowser = false
    const { container } = renderNote()

    expect(container.querySelector('input')).toHaveFocus()
  })
})
