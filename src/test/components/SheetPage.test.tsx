import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SheetPage from '../../components/SheetPage'

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

const escape = () => fireEvent.keyDown(document, { key: 'Escape' })

describe('SheetPage', () => {
  it('is dismissed by its scrim and by Escape', () => {
    const onDismiss = vi.fn()
    render(
      <SheetPage label='Review' onDismiss={onDismiss} dismissLabel='Back'>
        <p>content</p>
      </SheetPage>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    escape()
    expect(onDismiss).toHaveBeenCalledTimes(2)
  })

  // A payment being signed: nothing on the sheet or the keyboard may take the progress away.
  it('offers no way to dismiss it while busy', () => {
    const onDismiss = vi.fn()
    const { container } = render(
      <SheetPage label='Review' onDismiss={onDismiss} dismissLabel='Back' busy>
        <p>content</p>
      </SheetPage>,
    )

    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()
    escape()
    expect(onDismiss).not.toHaveBeenCalled()
    // What the app-wide Escape handler looks for before it sends anyone Home.
    expect(container.querySelector(".sheet-page[data-busy='true']")).toBeInTheDocument()
  })

  it('becomes dismissable again once the work is done', () => {
    const onDismiss = vi.fn()
    const tree = (busy: boolean) => (
      <SheetPage label='Review' onDismiss={onDismiss} dismissLabel='Back' busy={busy}>
        <p>content</p>
      </SheetPage>
    )
    const { rerender, container } = render(tree(true))
    rerender(tree(false))

    expect(container.querySelector('[data-busy]')).not.toBeInTheDocument()
    escape()
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('leaves Escape to a sheet or dialog opened on top of it', () => {
    const onDismiss = vi.fn()
    render(
      <SheetPage label='Review' onDismiss={onDismiss}>
        <div data-modal-layer=''>a dialog</div>
      </SheetPage>,
    )

    escape()
    expect(onDismiss).not.toHaveBeenCalled()
  })

  // On desktop the sheet sits inside the content pane, next to a sidebar that navigates.
  it('makes the surrounding chrome inert for as long as it is open', () => {
    const sidebar = document.createElement('aside')
    sidebar.className = 'desktop-wallet-shell'
    document.body.append(sidebar)

    const { unmount } = render(
      <SheetPage label='Review'>
        <p>content</p>
      </SheetPage>,
    )
    expect(sidebar).toHaveAttribute('inert')

    unmount()
    expect(sidebar).not.toHaveAttribute('inert')
  })
})
