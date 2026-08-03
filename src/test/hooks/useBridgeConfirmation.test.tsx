import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useBridgeConfirmation } from '../../hooks/useBridgeConfirmation'
import type { ConfirmationRequest } from '../../lib/appRequest'

const request: ConfirmationRequest = {
  app: 'Lendasat',
  action: 'Confirm payment',
  confirmLabel: 'Send',
  rows: [{ label: 'Amount', value: '1,000 sats' }],
}

const other: ConfirmationRequest = { ...request, action: 'Confirm signature', confirmLabel: 'Sign' }

describe('useBridgeConfirmation', () => {
  it('resolves true once approved', async () => {
    const { result } = renderHook(() => useBridgeConfirmation())

    let pending!: Promise<boolean>
    act(() => {
      pending = result.current.requestConfirmation(request)
    })
    expect(result.current.request).toEqual(request)

    act(() => result.current.approve())

    await expect(pending).resolves.toBe(true)
    expect(result.current.request).toBeNull()
  })

  it('resolves false once dismissed', async () => {
    const { result } = renderHook(() => useBridgeConfirmation())

    let pending!: Promise<boolean>
    act(() => {
      pending = result.current.requestConfirmation(request)
    })
    act(() => result.current.reject())

    await expect(pending).resolves.toBe(false)
    expect(result.current.request).toBeNull()
  })

  it('resolves false when the screen goes away', async () => {
    const { result, unmount } = renderHook(() => useBridgeConfirmation())

    let pending!: Promise<boolean>
    act(() => {
      pending = result.current.requestConfirmation(request)
    })
    unmount()

    await expect(pending).resolves.toBe(false)
  })

  it('resolves false for a second request while one is open', async () => {
    const { result } = renderHook(() => useBridgeConfirmation())

    let first!: Promise<boolean>
    let second!: Promise<boolean>
    act(() => {
      first = result.current.requestConfirmation(request)
      second = result.current.requestConfirmation(other)
    })

    await expect(second).resolves.toBe(false)
    expect(result.current.request).toEqual(request)

    act(() => result.current.approve())
    await expect(first).resolves.toBe(true)
  })

  it('accepts a new request once the previous one is settled', async () => {
    const { result } = renderHook(() => useBridgeConfirmation())

    let first!: Promise<boolean>
    act(() => {
      first = result.current.requestConfirmation(request)
    })
    act(() => result.current.reject())
    await expect(first).resolves.toBe(false)

    let second!: Promise<boolean>
    act(() => {
      second = result.current.requestConfirmation(other)
    })
    expect(result.current.request).toEqual(other)

    act(() => result.current.approve())
    await expect(second).resolves.toBe(true)
  })
})
