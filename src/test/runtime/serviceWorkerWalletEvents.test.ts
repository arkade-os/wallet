import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { serviceWorkerWalletEvents } from '../../runtime/wallet/serviceWorkerWallet'
import type { WalletRuntimeEvent, WalletRuntimeInstance } from '../../runtime/types'

// Minimal service-worker mock that records listeners and lets the test dispatch
// message events synchronously.
function installServiceWorkerMock() {
  const listeners = new Set<(e: MessageEvent) => void>()
  const sw = {
    addEventListener: (_type: string, cb: (e: MessageEvent) => void) => listeners.add(cb),
    removeEventListener: (_type: string, cb: (e: MessageEvent) => void) => listeners.delete(cb),
  }
  Object.defineProperty(navigator, 'serviceWorker', { value: sw, writable: true, configurable: true })
  return {
    dispatch: (data: unknown) => listeners.forEach((cb) => cb({ data } as MessageEvent)),
    listenerCount: () => listeners.size,
  }
}

const fakeInstance = {
  getStatus: async () => ({ walletInitialized: true }),
} as unknown as WalletRuntimeInstance

describe('serviceWorkerWalletEvents.subscribe', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('maps VTXO_UPDATE / UTXO_UPDATE messages to runtime events with payloads', () => {
    const sw = installServiceWorkerMock()
    const events: WalletRuntimeEvent[] = []
    const unsubscribe = serviceWorkerWalletEvents.subscribe(fakeInstance, (e) => events.push(e))

    sw.dispatch({ type: 'VTXO_UPDATE', payload: { newVtxos: [{ value: 7 }] } })
    sw.dispatch({ type: 'UTXO_UPDATE', payload: { coins: [{ value: 3 }] } })
    sw.dispatch({ type: 'SOMETHING_ELSE' })

    const updates = events.filter((e) => e.type === 'vtxo-update' || e.type === 'utxo-update')
    expect(updates).toEqual([
      { type: 'vtxo-update', newVtxos: [{ value: 7 }] },
      { type: 'utxo-update', coins: [{ value: 3 }] },
    ])

    unsubscribe()
    expect(sw.listenerCount()).toBe(0)
  })
})
