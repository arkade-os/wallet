import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, onTestFinished } from 'vitest'
import { Drawer, DrawerContent } from '../../components/ui/drawer'

afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('sheet-open', 'edges-fading')
})

const sheet = (open: boolean) => (
  <Drawer open={open} onOpenChange={() => {}}>
    <DrawerContent>
      <p>content</p>
    </DrawerContent>
  </Drawer>
)

describe('Drawer', () => {
  // The screen's edges fade with the scrim, so they have to start when the drawer does: as it
  // starts to open, and as it starts to close rather than once it has gone. jsdom plays no
  // animations, so the drawer would unmount the moment it closes; an exit animation that never
  // finishes keeps it on screen, on its way out, as in a browser.
  it('dims the screen edges while open and starts them back as it begins to close', () => {
    const neverFinishes = [{ finished: new Promise<Animation>(() => {}) }] as unknown as Animation[]
    Object.defineProperty(Element.prototype, 'getAnimations', { configurable: true, value: () => neverFinishes })
    onTestFinished(() => {
      Reflect.deleteProperty(Element.prototype, 'getAnimations')
    })

    const { rerender } = render(sheet(false))
    expect(document.documentElement).not.toHaveClass('sheet-open')

    rerender(sheet(true))
    expect(screen.getByText('content')).toBeInTheDocument()
    expect(document.documentElement).toHaveClass('sheet-open')

    rerender(sheet(false))
    // Still on screen, on its way out.
    expect(screen.getByText('content')).toBeInTheDocument()
    expect(document.documentElement).not.toHaveClass('sheet-open')
  })
})
