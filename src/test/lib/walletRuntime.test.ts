import { expect, it, vi } from 'vitest'
import { ForegroundWallet, watchWalletPayments } from '../../lib/walletRuntime'

it('locks the foreground runtime by disposing resources without wiping repositories', async () => {
  const runtime = Object.create(ForegroundWallet.prototype) as ForegroundWallet
  const dispose = vi.fn().mockResolvedValue(undefined)
  const walletClear = vi.fn()
  const contractClear = vi.fn()
  Object.assign(runtime, {
    dispose,
    walletRepository: { clear: walletClear },
    contractRepository: { clear: contractClear },
  })

  expect(await runtime.getStatus()).toEqual({ walletInitialized: true })
  await runtime.clear()
  await runtime.clear()

  expect(await runtime.getStatus()).toEqual({ walletInitialized: false })
  expect(dispose).toHaveBeenCalledTimes(1)
  expect(walletClear).not.toHaveBeenCalled()
  expect(contractClear).not.toHaveBeenCalled()
})

it('refreshes contract and boarding state without touching the hardware identity', async () => {
  const runtime = Object.create(ForegroundWallet.prototype) as ForegroundWallet
  const getSpendableVtxos = vi.fn().mockResolvedValue([])
  const getBoardingUtxos = vi.fn().mockResolvedValue([])
  Object.assign(runtime, { getSpendableVtxos, getBoardingUtxos })
  await runtime.reload()
  expect(getSpendableVtxos).toHaveBeenCalledWith({ maxSyncAgeMs: 0, requireSynced: true })
  expect(getBoardingUtxos).toHaveBeenCalledTimes(1)
})

it('adapts foreground payments for existing receive screens and tears down late subscriptions', async () => {
  const runtime = Object.create(ForegroundWallet.prototype) as ForegroundWallet
  let notify!: Parameters<ForegroundWallet['notifyIncomingFunds']>[0]
  let finish!: (stop: () => void) => void
  const unsubscribed = vi.fn()
  Object.assign(runtime, {
    notifyIncomingFunds: vi.fn((callback) => {
      notify = callback
      return new Promise<() => void>((resolve) => {
        finish = resolve
      })
    }),
  })
  const listener = vi.fn()
  const stop = watchWalletPayments(runtime, listener)
  notify({ type: 'vtxo', newVtxos: [], spentVtxos: [] })
  expect(listener.mock.calls[0][0].data).toEqual({
    type: 'VTXO_UPDATE',
    payload: { newVtxos: [], spentVtxos: [] },
  })
  notify({ type: 'utxo', coins: [] })
  expect(listener.mock.calls[1][0].data).toEqual({ type: 'UTXO_UPDATE', payload: { coins: [] } })
  stop()
  finish(unsubscribed)
  await Promise.resolve()
  expect(unsubscribed).toHaveBeenCalledTimes(1)
  notify({ type: 'utxo', coins: [] })
  expect(listener).toHaveBeenCalledTimes(2)
})
