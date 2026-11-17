import type { IssuanceParams, IssuanceResult, KnownMetadata, ServiceWorkerWallet } from '@arkade-os/sdk'

const KEY = 'pendingAssetMint'
const WAIT_MS = 60_000
const POLL_MS = 2_000

export class ControlAssetTimeoutError extends Error {
  constructor() {
    super('Timed out waiting for the control asset to become spendable. Retry to resume this mint.')
  }
}

type Wallet = Pick<ServiceWorkerWallet, 'assetManager' | 'getAddress' | 'getSpendableVtxos'>

export type PendingAssetMint = {
  walletAddress: string
  server: string
  amount: string
  metadata: KnownMetadata
  controlAmount: string
  controlMetadata: KnownMetadata
  stage: 'issuing-control' | 'control-ready' | 'issuing-asset' | 'asset-ready'
  control?: IssuanceResult
  asset?: IssuanceResult
}

export function readPendingAssetMint(): PendingAssetMint | null {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  const pending: PendingAssetMint = JSON.parse(raw)
  if (
    !pending ||
    typeof pending.walletAddress !== 'string' ||
    typeof pending.server !== 'string' ||
    typeof pending.amount !== 'string' ||
    !/^\d+$/.test(pending.amount) ||
    typeof pending.controlAmount !== 'string' ||
    !/^\d+$/.test(pending.controlAmount) ||
    !pending.metadata ||
    !pending.controlMetadata ||
    !['issuing-control', 'control-ready', 'issuing-asset', 'asset-ready'].includes(pending.stage) ||
    (pending.stage !== 'issuing-control' && (!pending.control?.assetId || !pending.control.arkTxId)) ||
    (pending.stage === 'asset-ready' && (!pending.asset?.assetId || !pending.asset.arkTxId))
  ) {
    throw new Error('Invalid pending asset mint record. Do not retry until it has been investigated.')
  }
  return pending
}

export function savePendingAssetMint(pending: PendingAssetMint): void {
  localStorage.setItem(KEY, JSON.stringify(pending))
}

export function clearPendingAssetMint(): void {
  localStorage.removeItem(KEY)
}

export async function withAssetMintLock<T>(run: () => Promise<T>): Promise<T> {
  if (!navigator.locks) throw new Error('Asset mint recovery requires browser Web Locks support.')
  return navigator.locks.request('asset-mint', { ifAvailable: true }, async (lock) => {
    if (!lock) throw new Error('An asset mint is already in progress in another tab.')
    return run()
  })
}

export async function waitForControlAsset(wallet: Wallet, assetId: string, timeoutMs = WAIT_MS): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined
  let pollTimer: ReturnType<typeof setTimeout> | undefined
  let releasePoll: (() => void) | undefined
  let cancelled = false
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      cancelled = true
      reject(new ControlAssetTimeoutError())
    }, timeoutMs)
  })
  const poll = async () => {
    while (!cancelled) {
      const coins = await wallet.getSpendableVtxos({
        withRecoverable: false,
        genericallySpendableOnly: true,
        requireSynced: true,
      })
      if (cancelled) return
      if (coins.some((coin) => coin.assets?.some((asset) => asset.assetId === assetId && asset.amount > 0n))) return
      await new Promise<void>((resolve) => {
        releasePoll = resolve
        pollTimer = setTimeout(resolve, POLL_MS)
      })
      releasePoll = undefined
    }
  }
  try {
    await Promise.race([poll(), timeout])
  } finally {
    cancelled = true
    clearTimeout(timer)
    clearTimeout(pollTimer)
    releasePoll?.()
  }
}

export async function runNewAssetMint(
  wallet: Wallet,
  server: string,
  create: { amount: bigint; metadata: KnownMetadata; controlAmount: bigint; controlMetadata: KnownMetadata } | null,
  onChange: (pending: PendingAssetMint) => void,
  onControl: (pending: PendingAssetMint) => void,
  onComplete: (pending: PendingAssetMint) => void,
): Promise<PendingAssetMint> {
  return withAssetMintLock(async () => {
    const walletAddress = await wallet.getAddress()
    let pending = readPendingAssetMint()
    if (pending && (pending.walletAddress !== walletAddress || pending.server !== server)) {
      throw new Error('A pending asset mint belongs to another wallet or server. Restore it before minting.')
    }
    if (pending && create) {
      onChange(pending)
      throw new Error('A previous asset mint needs recovery before starting a new mint.')
    }
    const save = (next: PendingAssetMint) => {
      savePendingAssetMint(next)
      pending = next
      onChange(next)
    }
    if (!pending) {
      if (!create) throw new Error('No pending asset mint was found.')
      pending = {
        walletAddress,
        server,
        amount: create.amount.toString(),
        metadata: create.metadata,
        controlAmount: create.controlAmount.toString(),
        controlMetadata: create.controlMetadata,
        stage: 'issuing-control',
      }
      save(pending)
      const control = await wallet.assetManager.issue({
        amount: create.controlAmount,
        metadata: create.controlMetadata,
      })
      save({ ...pending, stage: 'control-ready', control })
    }
    if (pending.stage === 'issuing-control' || pending.stage === 'issuing-asset') {
      throw new Error(
        'The issuance outcome is unknown. Check wallet activity and contact support before starting again.',
      )
    }
    if (!pending.control) throw new Error('Missing control asset in pending mint.')
    onControl(pending)
    if (pending.stage === 'control-ready') {
      await waitForControlAsset(wallet, pending.control.assetId)
      const params: IssuanceParams = {
        amount: BigInt(pending.amount),
        metadata: pending.metadata,
        controlAssetId: pending.control.assetId,
      }
      save({ ...pending, stage: 'issuing-asset' })
      const asset = await wallet.assetManager.issue(params)
      save({ ...pending, stage: 'asset-ready', asset })
    }
    onComplete(pending)
    clearPendingAssetMint()
    return pending
  })
}
