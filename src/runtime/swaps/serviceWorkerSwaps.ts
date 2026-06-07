import { BoltzSwapProvider, IndexedDbSwapRepository, ServiceWorkerArkadeSwaps } from '@arkade-os/boltz-swap'
import { SwapRuntimeFactory } from '../types'

const REFERRAL_ID = 'arkade-money'

/**
 * PWA swap runtime: the service-worker swap client.
 *
 * Mirrors the previous inline `ServiceWorkerArkadeSwaps.create` in
 * `src/providers/swaps.tsx`. Requires the controlling service worker, exposed by
 * the PWA wallet runtime instance.
 */
export const serviceWorkerSwapFactory: SwapRuntimeFactory = {
  create: async ({ serviceWorker, network, arkServerUrl, apiUrl, swapManager }) => {
    if (!serviceWorker) throw new Error('serviceWorker required for the PWA swap runtime')
    const swapProvider = new BoltzSwapProvider({ apiUrl, network, referralId: REFERRAL_ID })
    return ServiceWorkerArkadeSwaps.create({
      serviceWorker,
      swapRepository: new IndexedDbSwapRepository(),
      swapProvider,
      network,
      arkServerUrl,
      swapManager,
      referralId: REFERRAL_ID,
    })
  },
}
