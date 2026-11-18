import { useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import Modal from '../../components/Modal'
import { backLayers } from '../../providers/navigation'

afterEach(cleanup)

function Harness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Show recovery phrase</button>
      <button>Behind the dialog</button>
      <Modal label='Recovery phrase' open={open} onOpenChange={setOpen}>
        <button>Copy</button>
        <button onClick={() => setOpen(false)}>Close</button>
      </Modal>
    </>
  )
}

const open = async () => {
  const opener = screen.getByRole('button', { name: 'Show recovery phrase' })
  opener.focus()
  fireEvent.click(opener)
  return { opener, dialog: await screen.findByRole('dialog', { name: 'Recovery phrase' }) }
}

describe('Modal', () => {
  it('is one named dialog that takes focus', async () => {
    render(<Harness />)
    const { dialog } = await open()

    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveFocus()
  })

  it('gives focus back to what opened it when Escape closes it', async () => {
    render(<Harness />)
    const { opener } = await open()

    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(opener).toHaveFocus()
  })

  it('keeps Tab inside the dialog, in both directions', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await open()
    const copy = screen.getByRole('button', { name: 'Copy' })
    const close = screen.getByRole('button', { name: 'Close' })

    await user.tab()
    expect(copy).toHaveFocus()
    await user.tab()
    expect(close).toHaveFocus()
    await user.tab()
    expect(copy).toHaveFocus()
    await user.tab({ shift: true })
    expect(close).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Behind the dialog' })).not.toHaveFocus()
  })

  it('registers with Back while open, so Back closes it instead of leaving the screen', async () => {
    render(<Harness />)
    expect(backLayers).toHaveLength(0)
    await open()
    expect(backLayers).toHaveLength(1)

    backLayers[0]()

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(backLayers).toHaveLength(0)
  })
})
