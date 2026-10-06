import type { IWallet } from '@arkade-os/sdk'

export type RestorableWallet = IWallet & {
  restore(options?: { gapLimit?: number }): Promise<void>
}

/**
 * Recovers an imported wallet's rotated addresses. Swaps are not restored here:
 * the swap client's construction restore rebuilds offer records from history
 * into its own store. The v1 swap restore hook this used to register wrote v1
 * rows and marked their deposits scanned, which hid every settled swap from
 * that rebuild.
 */
export const restoreImportedWallet = async (wallet: RestorableWallet): Promise<void> => {
  await wallet.restore()
}
