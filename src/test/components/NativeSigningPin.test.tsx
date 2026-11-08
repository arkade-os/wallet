import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import NativeSigningPin from '../../components/NativeSigningPin'
import { requestNativeSigningPin } from '../../lib/nativeSigningPin'

vi.mock('../../lib/haptics', () => ({ hapticTap: vi.fn(), hapticLight: vi.fn() }))
afterEach(cleanup)

function request() {
  let result!: Promise<string>
  act(() => {
    result = requestNativeSigningPin()
  })
  return result
}

describe('in-app signing PIN', () => {
  it('refuses to prompt while locked or paused and allows a new foreground request', async () => {
    const view = render(<NativeSigningPin unlocked={false} />)
    await expect(requestNativeSigningPin()).rejects.toMatchObject({ code: 'USER_CANCELLED' })
    view.rerender(<NativeSigningPin unlocked />)
    act(() => window.dispatchEvent(new Event('arkade-native-paused')))
    await expect(requestNativeSigningPin()).rejects.toMatchObject({ code: 'USER_CANCELLED' })
    act(() => window.dispatchEvent(new Event('arkade-native-resumed')))
    const result = request()
    const rejected = expect(result).rejects.toMatchObject({ code: 'USER_CANCELLED' })
    expect(await screen.findByLabelText('Card PIN')).toHaveValue('')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await rejected
  })

  it('masks and validates the PIN, then removes the input before completing', async () => {
    render(<NativeSigningPin unlocked />)
    const result = request()
    const pin = await screen.findByLabelText('Card PIN')
    expect(pin).toHaveAttribute('type', 'password')
    expect(pin).toHaveAttribute('inputmode', 'numeric')
    expect(pin).toHaveAttribute('autocomplete', 'off')
    expect(pin).toHaveAttribute('maxlength', '16')
    expect(pin).toHaveFocus()
    fireEvent.change(pin, { target: { value: '123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue to card' }))
    expect(pin).toHaveValue('')
    expect(screen.getByText('Use a PIN with 6 to 16 digits.')).toBeVisible()
    fireEvent.change(pin, { target: { value: '123456' } })
    fireEvent.keyDown(pin, { key: 'Enter' })
    expect(screen.queryByLabelText('Card PIN')).not.toBeInTheDocument()
    await expect(result).resolves.toBe('123456')
    expect(localStorage.getItem('native-signing-pin')).toBeNull()
  })

  it.each(['cancel', 'pause', 'hidden', 'lock', 'unmount'])(
    'cancels and clears on %s without reusing the entered PIN',
    async (reason) => {
      const view = render(<NativeSigningPin unlocked />)
      const result = request()
      const rejected = expect(result).rejects.toMatchObject({
        code: 'USER_CANCELLED',
        message: 'Card signing cancelled.',
      })
      fireEvent.change(await screen.findByLabelText('Card PIN'), { target: { value: '123456' } })
      if (reason === 'cancel') fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      if (reason === 'pause') act(() => window.dispatchEvent(new Event('arkade-native-paused')))
      if (reason === 'hidden') {
        vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
        fireEvent(document, new Event('visibilitychange'))
      }
      if (reason === 'lock') view.rerender(<NativeSigningPin unlocked={false} />)
      if (reason === 'unmount') view.unmount()
      await rejected
      expect(screen.queryByLabelText('Card PIN')).not.toBeInTheDocument()
      if (reason === 'unmount') render(<NativeSigningPin unlocked />)
      else view.rerender(<NativeSigningPin unlocked />)
      vi.restoreAllMocks()
      act(() => window.dispatchEvent(new Event('arkade-native-resumed')))
      const fresh = request()
      const cancelled = expect(fresh).rejects.toMatchObject({ code: 'USER_CANCELLED' })
      expect(await screen.findByLabelText('Card PIN')).toHaveValue('')
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      await cancelled
    },
  )
})
