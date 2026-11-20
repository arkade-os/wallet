import { act, cleanup, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SheetModal from '../../components/SheetModal'

vi.mock('../../lib/haptics', () => ({ hapticLight: vi.fn() }))

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

/** An element on the screen under the sheet whose bottom edge sits at `bottom` pixels. */
const elementEndingAt = (bottom: number) => {
  const element = document.createElement('div')
  element.getBoundingClientRect = () => ({ bottom }) as DOMRect
  document.body.append(element)
  const ref = createRef<HTMLDivElement>() as React.MutableRefObject<HTMLDivElement | null>
  ref.current = element
  return { element, ref }
}

const sheet = () => screen.getByText('content').closest<HTMLElement>("[data-slot='drawer-content']")!

describe('SheetModal', () => {
  // On Receive the formats sheet rose over half the code. Given the code, the sheet stops 12px
  // under it; the stylesheet turns --sheet-top into the sheet's height cap.
  it('stops just under the element it keeps in view', () => {
    const { ref } = elementEndingAt(400)
    render(
      <SheetModal isOpen onClose={() => {}} below={ref}>
        <p>content</p>
      </SheetModal>,
    )

    expect(sheet().style.getPropertyValue('--sheet-top')).toBe('412px')
  })

  it('measures again when the screen changes size', () => {
    const { element, ref } = elementEndingAt(400)
    render(
      <SheetModal isOpen onClose={() => {}} below={ref}>
        <p>content</p>
      </SheetModal>,
    )

    element.getBoundingClientRect = () => ({ bottom: 300 }) as DOMRect
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })
    expect(sheet().style.getPropertyValue('--sheet-top')).toBe('312px')
  })

  it('keeps its usual height when there is nothing to keep in view', () => {
    render(
      <SheetModal isOpen onClose={() => {}}>
        <p>content</p>
      </SheetModal>,
    )

    expect(sheet().style.getPropertyValue('--sheet-top')).toBe('')
  })
})
