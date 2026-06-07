import { ArkadeSwaps, BoltzSwapProvider, IndexedDbSwapRepository } from '@arkade-os/boltz-swap'
import { SwapRuntimeFactory } from '../types'

const REFERRAL_ID = 'arkade-money'

/**
 * Native swap runtime: the in-process swap client (no service worker).
 *
 * Uses `ArkadeSwaps.create({ wallet })` (CAPACITOR.plan.md § Native Execution
 * Model). The background `SwapManager` runs in-process while the app is
 * foregrounded; launch/resume claim sweeps are driven by the provider.
 */
export const nativeSwapFactory: SwapRuntimeFactory = {
  create: async ({ wallet, network, apiUrl, swapManager }) => {
    const swapProvider = new BoltzSwapProvider({ apiUrl, network, referralId: REFERRAL_ID })
    return ArkadeSwaps.create({
      wallet,
      swapProvider,
      swapRepository: new IndexedDbSwapRepository(),
      swapManager,
    })
  },
}
