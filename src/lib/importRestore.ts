import type { IWallet } from '@arkade-os/sdk'
import { registerAssetSwapRestore, type RegisterAssetSwapRestoreOptions } from '@arkade-os/swap'

export type RestorableWallet = IWallet & {
  restore(options?: { gapLimit?: number }): Promise<void>
}

export const restoreImportedWallet = async (
  wallet: RestorableWallet,
  options: RegisterAssetSwapRestoreOptions,
): Promise<void> => {
  registerAssetSwapRestore(wallet, options)
  await wallet.restore()
}
