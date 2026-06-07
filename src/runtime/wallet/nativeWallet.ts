import { Wallet, IndexedDBWalletRepository, IndexedDBContractRepository, RestDelegateProvider } from '@arkade-os/sdk'
import { setLoadingStatus } from '../../lib/loadingStatus'
import {
  Unsubscribe,
  WalletEventAdapter,
  WalletRuntimeCreateParams,
  WalletRuntimeEvent,
  WalletRuntimeFactory,
  WalletRuntimeInstance,
} from '../types'

/**
 * Native wallet runtime: the in-process SDK wallet path (no service worker).
 *
 * Uses the SDK's `Wallet` (`implements IWallet`) directly, matching the
 * decision in CAPACITOR.plan.md § Native Execution Model. Identity derivation,
 * config selection, and data loading stay in `src/providers/wallet.tsx`; this
 * factory only constructs the wallet and exposes the runtime-neutral instance.
 */
const createNativeWallet = async (params: WalletRuntimeCreateParams): Promise<WalletRuntimeInstance> => {
  const { identity, arkServerUrl, esploraUrl, delegatorUrl, settlementConfig } = params

  setLoadingStatus('Starting wallet...')
  const walletRepository = new IndexedDBWalletRepository()
  const contractRepository = new IndexedDBContractRepository()

  const wallet = await Wallet.create({
    identity,
    // URL-based config is accepted by the SDK; provider instances can replace
    // these later if richer native providers are wired in.
    arkServerUrl,
    esploraUrl,
    delegateProvider: delegatorUrl ? new RestDelegateProvider(delegatorUrl) : undefined,
    walletMode: 'static',
    storage: { walletRepository, contractRepository },
    settlementConfig,
  })

  const vtxoManager = await wallet.getVtxoManager()

  return {
    wallet,
    vtxoManager,
    // An in-process wallet is initialized as soon as `Wallet.create` resolves;
    // there is no separate worker to query for readiness.
    getStatus: async () => ({ walletInitialized: true }),
    reload: async () => {},
    clear: () => wallet.dispose(),
    resetStorage: async () => {
      await walletRepository.clear()
      await contractRepository.clear()
    },
    dispose: () => wallet.dispose(),
  }
}

export const nativeWalletFactory: WalletRuntimeFactory = {
  create: (params) => createNativeWallet(params),
}

/**
 * Native wallet events: claim-on-resume baseline (CAPACITOR.plan.md § Native
 * Execution Model). No WebView JS runs while the app is suspended, so updates
 * are driven by app-resume/manual reloads rather than a push channel. SDK
 * subscriptions can be layered in here later; `runtime-dead` never fires because
 * there is no separate worker to lose.
 */
export const nativeWalletEvents: WalletEventAdapter = {
  // Resume-driven reloads are emitted by the provider via the lifecycle adapter;
  // nothing to attach here in the boundary pass.
  subscribe: (): Unsubscribe => () => {},
  waitForNextUpdate: (_instance, options): Promise<WalletRuntimeEvent> => {
    // Without a push channel, fall back to a bounded timeout so callers
    // (e.g. asset minting) resolve and then re-pull via reloadWallet.
    const timeoutMs = options?.timeoutMs ?? 15_000
    return new Promise((resolve) => {
      setTimeout(() => resolve({ type: 'reload-needed', reason: 'manual' }), timeoutMs)
    })
  },
}
