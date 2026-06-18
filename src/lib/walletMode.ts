import type { ServiceWorkerWalletMode } from '@arkade-os/sdk'

export const resolveWalletMode = (opts: {
  hasMnemonic: boolean
  requested?: ServiceWorkerWalletMode
  persisted?: ServiceWorkerWalletMode
}): ServiceWorkerWalletMode => {
  if (!opts.hasMnemonic) return 'static' // SingleKey is not HD-capable
  return opts.requested ?? opts.persisted ?? 'static'
}
