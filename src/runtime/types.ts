import {
  AssetDetails,
  BurnParams,
  ExtendedCoin,
  ExtendedVirtualCoin,
  GetVtxosFilter,
  IContractManager,
  IDelegateManager,
  IVtxoManager,
  IWallet,
  Identity,
  IssuanceParams,
  IssuanceResult,
  ReissuanceParams,
  ServiceWorkerWalletMode,
  Transaction,
} from '@arkade-os/sdk'
import { ArkadeSwaps, Network } from '@arkade-os/boltz-swap'
import { RuntimeKind } from './runtime'

/**
 * Runtime service contracts provided by the active app shell.
 *
 * These mirror the proposed contracts in CAPACITOR.plan.md § Proposed Runtime
 * Contracts. The app shell (PWA or Capacitor) implements them and exposes them
 * through {@link RuntimeContextValue}; screens and providers consume the
 * interfaces rather than concrete Capacitor or browser APIs.
 *
 * Phase 2 added the wallet runtime boundary (`walletFactory`, `walletEvents`),
 * the swap factory (`swaps`), and the encrypted-secret storage adapter
 * (`secretStorage`) alongside the device/lifecycle/link/notification/security
 * adapters introduced in Phase 1.
 */

export type Unsubscribe = () => void

export interface RuntimeCapabilities {
  serviceWorker: boolean
  nativeBiometrics: boolean
  webAuthn: boolean
  localNotifications: boolean
  pushNotifications: boolean
  /** Whether system notifications can be shown at all on this runtime. */
  notificationsSupported: boolean
  nativeScanner: boolean
  browserScanner: boolean
  nativeShare: boolean
  nativeClipboard: boolean
  hardwareBackButton: boolean
  appUrlOpen: boolean
}

export type NormalizedRuntimeLink =
  | { type: 'app'; appId: string; query?: string; rawUrl: string }
  | { type: 'note'; note: string; rawUrl: string }
  | { type: 'unknown'; rawUrl: string }

export interface LinkRuntimeAdapter {
  getInitialLink(): Promise<NormalizedRuntimeLink | undefined>
  subscribe(handler: (link: NormalizedRuntimeLink) => void): Unsubscribe
  clearConsumedLink?(): void
}

export interface LifecycleRuntimeAdapter {
  onResume(handler: () => void): Unsubscribe
  onPause(handler: () => void): Unsubscribe
  onBackButton(handler: () => void): Unsubscribe
}

export type HapticKind = 'subtle' | 'warning' | 'success'

export interface DeviceRuntimeAdapter {
  scanQrCode?(): Promise<string>
  copyToClipboard(value: string): Promise<void>
  share(data: ShareData): Promise<void>
  haptic(kind: HapticKind): Promise<void>
  openExternal(url: string): Promise<void>
}

export interface SecurityRuntimeAdapter {
  isBiometricUnlockAvailable(): Promise<boolean>
  saveBiometricUnlockSecret(secret: string): Promise<void>
  getBiometricUnlockSecret(): Promise<string | undefined>
  clearBiometricUnlockSecret(): Promise<void>
}

export interface NotificationRuntimeAdapter {
  requestPermission(): Promise<boolean>
  send(title: string, body: string, options?: { icon?: string }): Promise<void>
  notifyPaymentReceived(sats: number): Promise<void>
  notifyTxSettled(): Promise<void>
  notifyNewUpdateAvailable(): Promise<void>
}

/**
 * Persists the encrypted (AES-GCM-256 + PBKDF2) mnemonic / private-key blob.
 *
 * The encryption scheme is unchanged across runtimes — only the persistence
 * substrate differs (see CAPACITOR.plan.md § Storage and Secrets): the PWA
 * keeps `localStorage`; native will use iOS Keychain / Android Keystore via a
 * secure-storage plugin (deferred — see `src/runtime/secretStorage.ts`).
 */
export interface SecretStorageAdapter {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

/**
 * Parameters required to create the runtime wallet, known only after identity,
 * config, and unlock state are resolved inside `WalletProvider`.
 */
export interface WalletRuntimeCreateParams {
  identity: Identity
  arkServerUrl: string
  esploraUrl?: string
  delegatorUrl?: string
  /** vtxoThreshold in seconds, mirroring the SDK SettlementConfig. */
  settlementConfig: { vtxoThreshold: number }
  skipMigration?: boolean
  /** HD wallets honor the resolved mode; SingleKey wallets are always 'static'. */
  walletMode?: ServiceWorkerWalletMode
  /** Restore flow: scan for rotated addresses (HD gap-scan) after setup. */
  restoring?: boolean
}

/**
 * Runtime-neutral wallet handle. Wraps the SW wallet on PWA and the in-process
 * SDK wallet on native. `wallet` (raw `IWallet`) stays internal to
 * `WalletProvider` and provider-level adapters (swaps); screens never receive it.
 */
export interface WalletRuntimeInstance {
  wallet: IWallet
  vtxoManager: IVtxoManager
  /** PWA-only: the controlling service worker, used by the PWA swap factory. */
  serviceWorker?: ServiceWorker
  getStatus(): Promise<{ walletInitialized: boolean }>
  reload(): Promise<void>
  clear(): Promise<void>
  resetStorage(): Promise<void>
  dispose(): Promise<void>
}

export interface WalletRuntimeFactory {
  create(params: WalletRuntimeCreateParams): Promise<WalletRuntimeInstance>
}

export type WalletRuntimeEvent =
  | { type: 'vtxo-update'; newVtxos?: ExtendedVirtualCoin[] }
  | { type: 'utxo-update'; coins?: ExtendedCoin[] }
  | { type: 'status'; walletInitialized: boolean }
  | { type: 'reload-needed'; reason: 'resume' | 'manual' | 'transaction' | 'subscription' }
  /** PWA-only: the service-worker wallet became unresponsive; provider re-inits. */
  | { type: 'runtime-dead' }

export interface WalletEventAdapter {
  subscribe(instance: WalletRuntimeInstance, handler: (event: WalletRuntimeEvent) => void): Unsubscribe
  waitForNextUpdate(instance: WalletRuntimeInstance, options?: { timeoutMs?: number }): Promise<WalletRuntimeEvent>
}

/**
 * Swap client surface shared by the service-worker swap client
 * (`ServiceWorkerArkadeSwaps`, PWA) and the in-process client (`ArkadeSwaps`,
 * native). Both classes `implements IArkadeSwaps`, but that interface is not
 * exported from the package root, so the surface is derived structurally from
 * `ArkadeSwaps` via `Pick` (which also preserves the overloaded `getFees`
 * signatures). `ServiceWorkerArkadeSwaps` is structurally assignable to it.
 * Covers every method consumed across providers and screens (swaps provider,
 * receive QR, Boltz settings, reset).
 */
export type SwapRuntimeClient = Pick<
  ArkadeSwaps,
  | 'arkToBtc'
  | 'btcToArk'
  | 'claimArk'
  | 'claimBtc'
  | 'refundArk'
  | 'waitAndClaim'
  | 'waitAndClaimArk'
  | 'waitAndClaimBtc'
  | 'createSubmarineSwap'
  | 'createReverseSwap'
  | 'claimVHTLC'
  | 'refundVHTLC'
  | 'waitForSwapSettlement'
  | 'waitForSwapFunded'
  | 'getFees'
  | 'getLimits'
  | 'getSwapHistory'
  | 'restoreSwaps'
  | 'scanRecoverableSubmarineSwaps'
  | 'recoverSubmarineFunds'
  | 'reset'
  | 'getSwapManager'
  | 'startSwapManager'
  | 'stopSwapManager'
  | 'swapRepository'
  | 'dispose'
>

export interface SwapRuntimeCreateParams {
  wallet: IWallet
  /** PWA-only: the controlling service worker (from the wallet runtime instance). */
  serviceWorker?: ServiceWorker
  network: Network
  arkServerUrl: string
  apiUrl: string
  swapManager: boolean
}

export interface SwapRuntimeFactory {
  create(params: SwapRuntimeCreateParams): Promise<SwapRuntimeClient>
}

/** Asset operations, routed through `WalletContext.assetManager`. */
export interface WalletAssetActions {
  getAssetDetails(assetId: string): Promise<AssetDetails | undefined>
  issue(params: IssuanceParams): Promise<IssuanceResult>
  reissue(params: ReissuanceParams): Promise<string>
  burn(params: BurnParams): Promise<string>
  /** Resolve once a wallet update lands (replaces the SW `VTXO_UPDATE` wait in minting). */
  waitForAssetUpdate(options?: { timeoutMs?: number }): Promise<void>
}

/** Advanced VTXO / contract / settlement operations, routed through `WalletContext.advanced`. */
export interface WalletAdvancedActions {
  getAllVtxos(filter?: GetVtxosFilter): Promise<ExtendedVirtualCoin[]>
  getBoardingUtxos(): Promise<ExtendedCoin[]>
  getVtxoManager(): Promise<IVtxoManager>
  getContractManager(): Promise<IContractManager>
  getDelegateManager(): Promise<IDelegateManager | undefined>
  getInputsToSettle(): Promise<{ inputs: ExtendedCoin[]; vtxos: ExtendedVirtualCoin[]; boardingUtxos: ExtendedCoin[] }>
  settleInputs(): Promise<void>
}

/** Minimal signing/address surface for embedded app bridges (`WalletContext.bridge`). */
export interface WalletBridgeActions {
  getCompressedPublicKey(): Promise<Uint8Array>
  signTransaction(tx: Transaction): Promise<Transaction>
  signMessage(messageHash: Uint8Array, type: 'ecdsa' | 'schnorr'): Promise<Uint8Array>
}

/**
 * Runtime services provided by the active app shell. Consumed via
 * `useRuntime()` from `src/runtime/RuntimeContext`.
 */
export interface RuntimeContextValue {
  kind: RuntimeKind
  capabilities: RuntimeCapabilities
  walletFactory: WalletRuntimeFactory
  walletEvents: WalletEventAdapter
  swaps: SwapRuntimeFactory
  secretStorage: SecretStorageAdapter
  links: LinkRuntimeAdapter
  lifecycle: LifecycleRuntimeAdapter
  device: DeviceRuntimeAdapter
  notifications: NotificationRuntimeAdapter
  security: SecurityRuntimeAdapter
}
