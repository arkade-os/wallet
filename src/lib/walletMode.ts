import type { ServiceWorkerWalletMode } from '@arkade-os/sdk'

/** Resolve the SDK walletMode. Non-HD identities can never rotate. */
export const resolveWalletMode = (opts: {
  hasMnemonic: boolean
  requested?: ServiceWorkerWalletMode
  persisted?: ServiceWorkerWalletMode
}): ServiceWorkerWalletMode => {
  if (!opts.hasMnemonic) return 'static' // SingleKey is not HD-capable
  return opts.requested ?? opts.persisted ?? 'static'
}
