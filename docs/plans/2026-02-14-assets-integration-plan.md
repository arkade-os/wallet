# Assets Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate Arkade SDK asset support into the wallet — import, view, receive, send, mint, reissue, and burn assets.

**Architecture:** Extend existing providers (Config, Wallet, Flow) with asset state. Add 7 new screens under `src/screens/Apps/Assets/`. Modify BIP21 encoding/decoding and the existing send/receive flows to conditionally handle assets. Assets appear as an app under the Apps tab.

**Tech Stack:** React 18, TypeScript, Ionic React, @arkade-os/sdk (asset branch), Vite, vitest

---

## Task 1: Install SDK from asset branch

**Files:**
- Modify: `package.json:8`

**Step 1: Install the SDK from the git branch**

Run: `pnpm add @arkade-os/sdk@github:arkade-os/ts-sdk#asset`

This replaces `"@arkade-os/sdk": "0.3.12"` with a git reference. If the branch uses a different package structure, you may need `pnpm add @arkade-os/sdk@github:arkade-os/ts-sdk#asset --force`.

**Step 2: Verify the install succeeded**

Run: `pnpm ls @arkade-os/sdk`

Expected: Shows a git-based version, not `0.3.12`.

**Step 3: Verify the new exports exist**

Run: `node -e "const sdk = require('@arkade-os/sdk'); console.log(typeof sdk.asset)"`

If this fails (ESM-only), check `node_modules/@arkade-os/sdk/dist/index.js` for `assetManager` or `Asset` exports. The key thing is that the package installed and has the asset types.

**Step 4: Build to check for type errors**

Run: `pnpm build`

Expected: Build succeeds. If there are breaking changes in the SDK, fix type mismatches before continuing.

**Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat: install @arkade-os/sdk from asset branch"
```

---

## Task 2: Add asset types and extend Config

**Files:**
- Modify: `src/lib/types.ts:9-25` (Config type)
- Modify: `src/lib/types.ts:75-85` (Tx type)
- Modify: `src/providers/config.tsx:8-20` (defaultConfig)

**Step 1: Add AssetBalance type and extend Config**

In `src/lib/types.ts`, add the `AssetBalance` type and `importedAssets` to `Config`:

```typescript
// Add after the Addresses type (line 7)
export type AssetBalance = {
  assetId: string
  amount: number
}
```

Add `importedAssets: string[]` as the last field of the `Config` type (after `unit: Unit` on line 24):

```typescript
export type Config = {
  announcementsSeen: string[]
  apps: {
    boltz: {
      connected: boolean
    }
  }
  aspUrl: string
  currencyDisplay: CurrencyDisplay
  fiat: Fiats
  importedAssets: string[]
  nostrBackup: boolean
  notifications: boolean
  pubkey: string
  showBalance: boolean
  theme: Themes
  unit: Unit
}
```

**Step 2: Extend Tx type with assets**

Add `assets` field to the `Tx` type (after `type: string` on line 84):

```typescript
export type Tx = {
  amount: number
  assets?: AssetBalance[]
  boardingTxid: string
  createdAt: number
  explorable: string | undefined
  preconfirmed: boolean
  redeemTxid: string
  roundTxid: string
  settled: boolean
  type: string
}
```

**Step 3: Update defaultConfig**

In `src/providers/config.tsx`, add `importedAssets: []` to `defaultConfig` (after `fiat: Fiats.USD` on line 14):

```typescript
const defaultConfig: Config = {
  announcementsSeen: [],
  apps: { boltz: { connected: true } },
  aspUrl: defaultArkServer(),
  currencyDisplay: CurrencyDisplay.Both,
  fiat: Fiats.USD,
  importedAssets: [],
  nostrBackup: false,
  notifications: false,
  pubkey: '',
  showBalance: true,
  theme: Themes.Dark,
  unit: Unit.BTC,
}
```

**Step 4: Verify build**

Run: `pnpm build`

Expected: No type errors.

**Step 5: Commit**

```bash
git add src/lib/types.ts src/providers/config.tsx
git commit -m "feat: add asset types and importedAssets to config"
```

---

## Task 3: Extend FlowContext with asset flow state

**Files:**
- Modify: `src/providers/flow.tsx`

**Step 1: Add AssetInfo type and extend RecvInfo/SendInfo**

At the top of `src/providers/flow.tsx`, add the import and new type. Then extend the existing interfaces.

Add import (after line 3):
```typescript
import { AssetBalance, Tx } from '../lib/types'
import type { AssetDetails } from '@arkade-os/sdk'
```

Remove the existing `import { Tx } from '../lib/types'` on line 3.

Add `AssetInfo` interface after `DeepLinkInfo` (after line 19):
```typescript
export interface AssetInfo {
  assetId?: string
  details?: AssetDetails
}
```

Add `assetId?: string` to `RecvInfo` (after `txid?: string` on line 26):
```typescript
export interface RecvInfo {
  boardingAddr: string
  offchainAddr: string
  invoice?: string
  satoshis: number
  txid?: string
  assetId?: string
}
```

Add `assets?: AssetBalance[]` to `SendInfo` (after `txid?: string` on line 40):
```typescript
export type SendInfo = {
  address?: string
  arkAddress?: string
  assets?: AssetBalance[]
  invoice?: string
  lnUrl?: string
  pendingSwap?: PendingSubmarineSwap
  recipient?: string
  satoshis?: number
  swapId?: string
  total?: number
  text?: string
  txid?: string
}
```

Add `assetInfo`/`setAssetInfo` to `FlowContextProps` (after `setTxInfo` on line 61):
```typescript
  assetInfo: AssetInfo
  setAssetInfo: (arg0: AssetInfo) => void
```

Add empty defaults:
```typescript
export const emptyAssetInfo: AssetInfo = {}
```

Add to `FlowContext` default value:
```typescript
  assetInfo: emptyAssetInfo,
  setAssetInfo: () => {},
```

Add state in `FlowProvider`:
```typescript
  const [assetInfo, setAssetInfo] = useState<AssetInfo>(emptyAssetInfo)
```

Add to Provider value:
```typescript
  assetInfo,
  setAssetInfo,
```

**Step 2: Verify build**

Run: `pnpm build`

Expected: No errors.

**Step 3: Commit**

```bash
git add src/providers/flow.tsx
git commit -m "feat: add asset flow state to FlowContext"
```

---

## Task 4: Extend WalletContext with asset balances and metadata cache

**Files:**
- Modify: `src/providers/wallet.tsx`
- Modify: `src/lib/asp.ts:147-151`

**Step 1: Update getBalance to return asset balances**

In `src/lib/asp.ts`, modify `getBalance` (line 147) to also return assets:

```typescript
export const getBalance = async (wallet: IWallet): Promise<{ total: Satoshis; assets: AssetBalance[] }> => {
  const balance = await wallet.getBalance()
  const { total } = balance
  const assets: AssetBalance[] = (balance as any).assets ?? []
  return { total, assets }
}
```

Note: We use `(balance as any).assets` because the SDK types may not be updated yet in the installed version. Once the SDK stabilizes, replace with proper typing.

Add import of `AssetBalance` at the top of `src/lib/asp.ts`:
```typescript
import { Addresses, AssetBalance, Satoshis, Tx, Vtxo } from './types'
```

**Step 2: Update WalletProvider to track asset balances**

In `src/providers/wallet.tsx`:

Add import:
```typescript
import { AssetBalance, Tx, Vtxo, Wallet } from '../lib/types'
```

(Replace the existing import of `Tx, Vtxo, Wallet` on line 12.)

Add `assetBalances` to `WalletContextProps` (after `balance: number` on line 38):
```typescript
  assetBalances: AssetBalance[]
```

Add default to `createContext` (after `balance: 0` on line 53):
```typescript
  assetBalances: [],
```

Add state (after `const [balance, setBalance] = useState(0)` on line 66):
```typescript
  const [assetBalances, setAssetBalances] = useState<AssetBalance[]>([])
```

Add metadata cache ref (after `const listeningForServiceWorker` on line 73):
```typescript
  const assetMetadataCache = useRef<Map<string, any>>(new Map())
```

Update `reloadWallet` (line 146-159) to destructure the new getBalance return:
```typescript
  const reloadWallet = async (swWallet = svcWallet) => {
    if (!swWallet) return
    try {
      const vtxos = await getVtxos(swWallet)
      const txs = await getTxHistory(swWallet)
      const { total, assets } = await getBalance(swWallet)
      setBalance(total)
      setAssetBalances(assets)
      setVtxos(vtxos)
      setTxs(txs)
    } catch (err) {
      consoleError(err, 'Error reloading wallet')
      return
    }
  }
```

Add `assetBalances` and `assetMetadataCache` to Provider value (after `balance` on line 317):
```typescript
  assetBalances,
  assetMetadataCache: assetMetadataCache.current,
```

Also add to `WalletContextProps`:
```typescript
  assetMetadataCache: Map<string, any>
```

And to default context:
```typescript
  assetMetadataCache: new Map(),
```

**Step 3: Verify build**

Run: `pnpm build`

Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/lib/asp.ts src/providers/wallet.tsx
git commit -m "feat: add asset balances and metadata cache to WalletContext"
```

---

## Task 5: Extend BIP21 with asset support

**Files:**
- Modify: `src/lib/bip21.ts`
- Create: `src/lib/__tests__/bip21.test.ts`

**Step 1: Write tests for BIP21 asset support**

Create `src/lib/__tests__/bip21.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { decodeBip21, encodeBip21Asset } from '../bip21'

describe('encodeBip21Asset', () => {
  it('encodes asset BIP21 URI with ark address and asset ID', () => {
    const uri = encodeBip21Asset('ark1abc123', 'aabbccdd'.repeat(8) + '0000', 100)
    expect(uri).toBe(
      `bitcoin:?ark=ark1abc123&assetid=${'aabbccdd'.repeat(8)}0000&amount=100`,
    )
  })
})

describe('decodeBip21 with assetid', () => {
  it('parses assetid from BIP21 URI', () => {
    const assetId = 'aabbccdd'.repeat(8) + '0000'
    const uri = `bitcoin:?ark=ark1abc123&assetid=${assetId}&amount=0.001`
    const decoded = decodeBip21(uri)
    expect(decoded.assetId).toBe(assetId)
    expect(decoded.arkAddress).toBeUndefined() // ark1abc123 might not pass isArkAddress
  })

  it('returns undefined assetId when not present', () => {
    const uri = 'bitcoin:bc1qtest?amount=0.001'
    const decoded = decodeBip21(uri)
    expect(decoded.assetId).toBeUndefined()
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test src/lib/__tests__/bip21.test.ts`

Expected: FAIL — `encodeBip21Asset` is not exported, `assetId` not in decoded result.

**Step 3: Implement BIP21 asset support**

In `src/lib/bip21.ts`:

Add `assetId` to `Bip21Decoded` (after `lnurl?: string` on line 12):
```typescript
export interface Bip21Decoded {
  address?: string
  arkAddress?: string
  assetId?: string
  satoshis?: number
  invoice?: string
  lnurl?: string
}
```

Add `assetid` parsing in `decodeBip21` (after the `lightning` block, before `return result` on line 61):
```typescript
    if (params.has('assetid')) {
      result.assetId = params.get('assetid')!
    }
```

Add `encodeBip21Asset` function (after `encodeBip21` on line 72):
```typescript
export const encodeBip21Asset = (arkAddress: string, assetId: string, amount: number) => {
  return `bitcoin:?ark=${arkAddress}&assetid=${assetId}&amount=${amount}`
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test src/lib/__tests__/bip21.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/bip21.ts src/lib/__tests__/bip21.test.ts
git commit -m "feat: add BIP21 asset URI encoding and decoding"
```

---

## Task 6: Register asset pages in navigation

**Files:**
- Modify: `src/providers/navigation.tsx`

**Step 1: Add page imports and enum entries**

At the top of `src/providers/navigation.tsx`, add imports (after the `AppLendaswap` import on line 28):
```typescript
import AppAssets from '../screens/Apps/Assets/Index'
import AppAssetDetail from '../screens/Apps/Assets/Detail'
import AppAssetImport from '../screens/Apps/Assets/Import'
import AppAssetMint from '../screens/Apps/Assets/Mint'
import AppAssetMintSuccess from '../screens/Apps/Assets/MintSuccess'
import AppAssetReissue from '../screens/Apps/Assets/Reissue'
import AppAssetBurn from '../screens/Apps/Assets/Burn'
```

Add to `Pages` enum (after `AppLendaswap` on line 36):
```typescript
  AppAssets,
  AppAssetDetail,
  AppAssetImport,
  AppAssetMint,
  AppAssetMintSuccess,
  AppAssetReissue,
  AppAssetBurn,
```

Add to `pageTab` (after `[Pages.AppLendaswap]: Tabs.Apps` on line 74):
```typescript
  [Pages.AppAssets]: Tabs.Apps,
  [Pages.AppAssetDetail]: Tabs.Apps,
  [Pages.AppAssetImport]: Tabs.Apps,
  [Pages.AppAssetMint]: Tabs.Apps,
  [Pages.AppAssetMintSuccess]: Tabs.Apps,
  [Pages.AppAssetReissue]: Tabs.Apps,
  [Pages.AppAssetBurn]: Tabs.Apps,
```

Add to `pageComponent` switch (after the `AppLendaswap` case on line 110):
```typescript
    case Pages.AppAssets:
      return <AppAssets />
    case Pages.AppAssetDetail:
      return <AppAssetDetail />
    case Pages.AppAssetImport:
      return <AppAssetImport />
    case Pages.AppAssetMint:
      return <AppAssetMint />
    case Pages.AppAssetMintSuccess:
      return <AppAssetMintSuccess />
    case Pages.AppAssetReissue:
      return <AppAssetReissue />
    case Pages.AppAssetBurn:
      return <AppAssetBurn />
```

**Step 2: Create placeholder screen files**

These will be fleshed out in later tasks. For now, create minimal components so navigation compiles.

Create all 7 files under `src/screens/Apps/Assets/`. Each should be a minimal component like:

```typescript
// src/screens/Apps/Assets/Index.tsx
export default function AppAssets() {
  return <div>Assets</div>
}
```

(Same pattern for Detail.tsx, Import.tsx, Mint.tsx, MintSuccess.tsx, Reissue.tsx, Burn.tsx — just change the function name and text.)

**Step 3: Verify build**

Run: `pnpm build`

Expected: Build succeeds with all new pages registered.

**Step 4: Commit**

```bash
git add src/providers/navigation.tsx src/screens/Apps/Assets/
git commit -m "feat: register asset pages in navigation with placeholders"
```

---

## Task 7: Add Assets entry to Apps index

**Files:**
- Modify: `src/screens/Apps/Index.tsx:97-128`

**Step 1: Add Assets app card**

In `src/screens/Apps/Index.tsx`, add an Assets `<App>` card. Add it before the Boltz card (line 98):

```tsx
            <App
              name='Assets'
              icon={<AssetsIcon />}
              desc='Issue, manage, send, and receive assets on Arkade'
              page={Pages.AppAssets}
              live
            />
```

You'll need an icon. For now, create a simple SVG icon component. Create `src/icons/Assets.tsx`:

```tsx
export default function AssetsIcon() {
  return (
    <svg width='40' height='40' viewBox='0 0 40 40' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <rect width='40' height='40' rx='8' fill='var(--purple)' />
      <text x='50%' y='54%' dominantBaseline='middle' textAnchor='middle' fill='white' fontSize='20'>A</text>
    </svg>
  )
}
```

Add imports at the top of `src/screens/Apps/Index.tsx`:
```typescript
import AssetsIcon from '../../icons/Assets'
```

**Step 2: Verify build and visual**

Run: `pnpm build`

Expected: Build succeeds. The Assets card appears in the Apps tab.

**Step 3: Commit**

```bash
git add src/screens/Apps/Index.tsx src/icons/Assets.tsx
git commit -m "feat: add Assets app card to Apps index"
```

---

## Task 8: Build Assets Index screen

**Files:**
- Modify: `src/screens/Apps/Assets/Index.tsx`

**Step 1: Implement the asset list screen**

This screen merges auto-discovered assets (from `assetBalances`) with manually imported assets (from `config.importedAssets`), fetches metadata for display, and provides Import/Mint actions.

```tsx
import { useContext, useEffect, useState } from 'react'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import FlexRow from '../../../components/FlexRow'
import Header from '../../../components/Header'
import Padded from '../../../components/Padded'
import Text from '../../../components/Text'
import Shadow from '../../../components/Shadow'
import Button from '../../../components/Button'
import Loading from '../../../components/Loading'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import { ConfigContext } from '../../../providers/config'
import { FlowContext } from '../../../providers/flow'
import { consoleError } from '../../../lib/logs'
import { AssetBalance } from '../../../lib/types'

interface AssetListItem {
  assetId: string
  balance: number
  name?: string
  ticker?: string
  icon?: string
  decimals?: number
}

export default function AppAssets() {
  const { navigate } = useContext(NavigationContext)
  const { assetBalances, svcWallet, assetMetadataCache } = useContext(WalletContext)
  const { config } = useContext(ConfigContext)
  const { setAssetInfo } = useContext(FlowContext)

  const [assets, setAssets] = useState<AssetListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAssets = async () => {
      if (!svcWallet) return

      // Merge auto-discovered + imported asset IDs
      const allIds = new Set<string>()
      for (const ab of assetBalances) allIds.add(ab.assetId)
      for (const id of config.importedAssets) allIds.add(id)

      const items: AssetListItem[] = []
      for (const assetId of allIds) {
        const bal = assetBalances.find((a) => a.assetId === assetId)
        let meta = assetMetadataCache.get(assetId)

        if (!meta) {
          try {
            meta = await (svcWallet as any).assetManager?.getAssetDetails(assetId)
            if (meta) assetMetadataCache.set(assetId, meta)
          } catch (err) {
            consoleError(err, `error fetching metadata for ${assetId}`)
          }
        }

        items.push({
          assetId,
          balance: bal?.amount ?? 0,
          name: meta?.metadata?.name,
          ticker: meta?.metadata?.ticker,
          icon: meta?.metadata?.icon,
          decimals: meta?.metadata?.decimals ?? 8,
        })
      }

      setAssets(items)
      setLoading(false)
    }

    loadAssets()
  }, [svcWallet, assetBalances, config.importedAssets])

  const handleAssetClick = (assetId: string) => {
    setAssetInfo({ assetId })
    navigate(Pages.AppAssetDetail)
  }

  const truncateId = (id: string) => `${id.slice(0, 8)}...${id.slice(-8)}`

  if (loading) return <Loading text='Loading assets...' />

  return (
    <>
      <Header text='Assets' back={() => navigate(Pages.Apps)} />
      <Content>
        <Padded>
          <FlexCol gap='0.5rem'>
            {assets.length === 0 ? (
              <Text color='dark50'>No assets yet. Import or mint one to get started.</Text>
            ) : (
              assets.map((asset) => (
                <Shadow key={asset.assetId} border onClick={() => handleAssetClick(asset.assetId)}>
                  <FlexRow between padding='0.75rem'>
                    <FlexRow>
                      {asset.icon ? (
                        <img src={asset.icon} alt='' width={32} height={32} style={{ borderRadius: '50%' }} />
                      ) : (
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: 'var(--dark20)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Text smaller>{asset.ticker?.[0] ?? 'A'}</Text>
                        </div>
                      )}
                      <FlexCol gap='0'>
                        <Text bold>{asset.name ?? truncateId(asset.assetId)}</Text>
                        {asset.ticker ? <Text color='dark50' smaller>{asset.ticker}</Text> : null}
                      </FlexCol>
                    </FlexRow>
                    <Text>{asset.balance}</Text>
                  </FlexRow>
                </Shadow>
              ))
            )}
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button label='Import' onClick={() => navigate(Pages.AppAssetImport)} />
        <Button label='Mint' onClick={() => navigate(Pages.AppAssetMint)} secondary />
      </ButtonsOnBottom>
    </>
  )
}
```

**Step 2: Verify build**

Run: `pnpm build`

Expected: Compiles. Navigation to AppAssets shows the asset list.

**Step 3: Commit**

```bash
git add src/screens/Apps/Assets/Index.tsx
git commit -m "feat: implement Assets list screen"
```

---

## Task 9: Build Asset Import screen

**Files:**
- Modify: `src/screens/Apps/Assets/Import.tsx`

**Step 1: Implement import screen**

```tsx
import { useContext, useState } from 'react'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Content from '../../../components/Content'
import ErrorMessage from '../../../components/Error'
import FlexCol from '../../../components/FlexCol'
import Header from '../../../components/Header'
import InputAddress from '../../../components/InputAddress'
import Loading from '../../../components/Loading'
import Padded from '../../../components/Padded'
import Scanner from '../../../components/Scanner'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { ConfigContext } from '../../../providers/config'
import { FlowContext } from '../../../providers/flow'
import { WalletContext } from '../../../providers/wallet'
import { consoleError } from '../../../lib/logs'
import { extractError } from '../../../lib/error'

export default function AppAssetImport() {
  const { navigate } = useContext(NavigationContext)
  const { config, updateConfig } = useContext(ConfigContext)
  const { setAssetInfo } = useContext(FlowContext)
  const { svcWallet, assetMetadataCache } = useContext(WalletContext)

  const [assetId, setAssetId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [scan, setScan] = useState(false)

  const isValidAssetId = (id: string) => /^[0-9a-fA-F]{68}$/.test(id)

  const handleImport = async () => {
    if (!svcWallet) return
    if (!isValidAssetId(assetId)) {
      setError('Asset ID must be a 68-character hex string')
      return
    }

    setLoading(true)
    setError('')

    try {
      const details = await (svcWallet as any).assetManager?.getAssetDetails(assetId)
      if (!details) throw new Error('Asset not found')

      assetMetadataCache.set(assetId, details)

      // Add to imported assets if not already there
      if (!config.importedAssets.includes(assetId)) {
        updateConfig({ ...config, importedAssets: [...config.importedAssets, assetId] })
      }

      setAssetInfo({ assetId, details })
      navigate(Pages.AppAssetDetail)
    } catch (err) {
      consoleError(err, 'error importing asset')
      setError(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  if (scan) {
    return <Scanner close={() => setScan(false)} label='Asset ID' onData={setAssetId} onError={setError} />
  }

  if (loading) return <Loading text='Fetching asset details...' />

  return (
    <>
      <Header text='Import Asset' back={() => navigate(Pages.AppAssets)} />
      <Content>
        <Padded>
          <FlexCol>
            <ErrorMessage error={Boolean(error)} text={error} />
            <InputAddress
              name='asset-id'
              focus
              label='Asset ID'
              onChange={setAssetId}
              onEnter={handleImport}
              openScan={() => setScan(true)}
              value={assetId}
            />
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button label='Import' onClick={handleImport} disabled={!assetId} />
      </ButtonsOnBottom>
    </>
  )
}
```

**Step 2: Verify build**

Run: `pnpm build`

**Step 3: Commit**

```bash
git add src/screens/Apps/Assets/Import.tsx
git commit -m "feat: implement asset import screen"
```

---

## Task 10: Build Asset Detail screen

**Files:**
- Modify: `src/screens/Apps/Assets/Detail.tsx`

**Step 1: Implement detail screen**

```tsx
import { useContext, useEffect, useState } from 'react'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import FlexRow from '../../../components/FlexRow'
import Header from '../../../components/Header'
import Loading from '../../../components/Loading'
import Padded from '../../../components/Padded'
import Text, { TextSecondary } from '../../../components/Text'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { ConfigContext } from '../../../providers/config'
import { FlowContext, emptyRecvInfo, emptySendInfo } from '../../../providers/flow'
import { WalletContext } from '../../../providers/wallet'
import { consoleError } from '../../../lib/logs'
import { copyToClipboard } from '../../../lib/clipboard'
import { NotificationsContext } from '../../../providers/notifications'

export default function AppAssetDetail() {
  const { navigate } = useContext(NavigationContext)
  const { config, updateConfig } = useContext(ConfigContext)
  const { assetInfo, setAssetInfo, setRecvInfo, setSendInfo } = useContext(FlowContext)
  const { assetBalances, svcWallet, assetMetadataCache } = useContext(WalletContext)
  const { notifySuccess } = useContext(NotificationsContext)

  const [loading, setLoading] = useState(true)
  const [details, setDetails] = useState<any>(null)

  const assetId = assetInfo.assetId ?? ''
  const balance = assetBalances.find((a) => a.assetId === assetId)?.amount ?? 0

  useEffect(() => {
    const load = async () => {
      if (!svcWallet || !assetId) return

      let cached = assetMetadataCache.get(assetId)
      if (!cached) {
        try {
          cached = await (svcWallet as any).assetManager?.getAssetDetails(assetId)
          if (cached) assetMetadataCache.set(assetId, cached)
        } catch (err) {
          consoleError(err, 'error loading asset details')
        }
      }

      setDetails(cached)
      setAssetInfo({ ...assetInfo, details: cached })
      setLoading(false)
    }
    load()
  }, [svcWallet, assetId])

  if (loading) return <Loading text='Loading asset...' />

  const meta = details?.metadata
  const name = meta?.name ?? 'Unknown Asset'
  const ticker = meta?.ticker ?? ''
  const decimals = meta?.decimals ?? 8
  const supply = details?.supply ?? 'Unknown'
  const controlAssetId = details?.controlAssetId
  const truncateId = (id: string) => `${id.slice(0, 12)}...${id.slice(-12)}`

  // Check if user holds control asset
  const holdsControlAsset = controlAssetId
    ? assetBalances.some((a) => a.assetId === controlAssetId && a.amount > 0)
    : false

  const isImported = config.importedAssets.includes(assetId)
  const canRemove = isImported && balance === 0

  const handleCopyId = () => {
    copyToClipboard(assetId)
    notifySuccess('Asset ID copied')
  }

  const handleSend = () => {
    setSendInfo({ ...emptySendInfo, assets: [{ assetId, amount: 0 }] })
    navigate(Pages.SendForm)
  }

  const handleReceive = () => {
    setRecvInfo({ ...emptyRecvInfo, assetId })
    navigate(Pages.ReceiveAmount)
  }

  const handleReissue = () => {
    navigate(Pages.AppAssetReissue)
  }

  const handleBurn = () => {
    navigate(Pages.AppAssetBurn)
  }

  const handleRemove = () => {
    const updated = config.importedAssets.filter((id) => id !== assetId)
    updateConfig({ ...config, importedAssets: updated })
    navigate(Pages.AppAssets)
  }

  return (
    <>
      <Header text={name} back={() => navigate(Pages.AppAssets)} />
      <Content>
        <Padded>
          <FlexCol gap='1rem'>
            {meta?.icon ? (
              <img src={meta.icon} alt='' width={64} height={64} style={{ borderRadius: '50%', alignSelf: 'center' }} />
            ) : null}

            <FlexCol gap='0.25rem'>
              <Text bold large>{balance} {ticker}</Text>
              <TextSecondary>Balance</TextSecondary>
            </FlexCol>

            <FlexCol gap='0.25rem'>
              <div onClick={handleCopyId} style={{ cursor: 'pointer' }}>
                <Text color='dark50' smaller>{truncateId(assetId)}</Text>
              </div>
              <TextSecondary>Asset ID (tap to copy)</TextSecondary>
            </FlexCol>

            <FlexRow between>
              <TextSecondary>Supply</TextSecondary>
              <Text>{supply}</Text>
            </FlexRow>

            <FlexRow between>
              <TextSecondary>Decimals</TextSecondary>
              <Text>{decimals}</Text>
            </FlexRow>

            {ticker ? (
              <FlexRow between>
                <TextSecondary>Ticker</TextSecondary>
                <Text>{ticker}</Text>
              </FlexRow>
            ) : null}
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <FlexRow gap='0.5rem'>
          <Button label='Send' onClick={handleSend} disabled={balance === 0} />
          <Button label='Receive' onClick={handleReceive} />
        </FlexRow>
        {holdsControlAsset ? <Button label='Reissue' onClick={handleReissue} secondary /> : null}
        {balance > 0 ? <Button label='Burn' onClick={handleBurn} secondary /> : null}
        {canRemove ? <Button label='Remove' onClick={handleRemove} secondary /> : null}
      </ButtonsOnBottom>
    </>
  )
}
```

**Step 2: Verify build**

Run: `pnpm build`

**Step 3: Commit**

```bash
git add src/screens/Apps/Assets/Detail.tsx
git commit -m "feat: implement asset detail screen"
```

---

## Task 11: Build Mint and MintSuccess screens

**Files:**
- Modify: `src/screens/Apps/Assets/Mint.tsx`
- Modify: `src/screens/Apps/Assets/MintSuccess.tsx`

**Step 1: Implement Mint screen**

```tsx
import { useContext, useState } from 'react'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Content from '../../../components/Content'
import ErrorMessage from '../../../components/Error'
import FlexCol from '../../../components/FlexCol'
import Header from '../../../components/Header'
import Loading from '../../../components/Loading'
import Padded from '../../../components/Padded'
import Text from '../../../components/Text'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { ConfigContext } from '../../../providers/config'
import { FlowContext } from '../../../providers/flow'
import { WalletContext } from '../../../providers/wallet'
import { consoleError } from '../../../lib/logs'
import { extractError } from '../../../lib/error'

export default function AppAssetMint() {
  const { navigate } = useContext(NavigationContext)
  const { config, updateConfig } = useContext(ConfigContext)
  const { setAssetInfo } = useContext(FlowContext)
  const { svcWallet } = useContext(WalletContext)

  const [amount, setAmount] = useState('')
  const [name, setName] = useState('')
  const [ticker, setTicker] = useState('')
  const [decimals, setDecimals] = useState('8')
  const [iconUrl, setIconUrl] = useState('')
  const [withControl, setWithControl] = useState(false)
  const [error, setError] = useState('')
  const [minting, setMinting] = useState(false)

  const inputStyle: React.CSSProperties = {
    background: 'var(--dark10)',
    border: '1px solid var(--dark20)',
    borderRadius: '0.25rem',
    color: 'var(--white)',
    fontSize: '16px',
    padding: '0.75rem',
    width: '100%',
  }

  const handleMint = async () => {
    if (!svcWallet) return
    const parsedAmount = parseInt(amount)
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Amount must be a positive number')
      return
    }

    setMinting(true)
    setError('')

    try {
      const metadata: Record<string, any> = {}
      if (name) metadata.name = name
      if (ticker) metadata.ticker = ticker
      if (decimals) metadata.decimals = parseInt(decimals)
      if (iconUrl) metadata.icon = iconUrl

      const params: any = { amount: parsedAmount, metadata }
      if (withControl) params.controlAssetId = '' // SDK creates a new control asset

      const result = await (svcWallet as any).assetManager.issue(params)
      const newAssetId = result.assetId

      // Auto-import
      if (!config.importedAssets.includes(newAssetId)) {
        updateConfig({ ...config, importedAssets: [...config.importedAssets, newAssetId] })
      }

      setAssetInfo({ assetId: newAssetId })
      navigate(Pages.AppAssetMintSuccess)
    } catch (err) {
      consoleError(err, 'error minting asset')
      setError(extractError(err))
    } finally {
      setMinting(false)
    }
  }

  if (minting) return <Loading text='Minting asset...' />

  return (
    <>
      <Header text='Mint Asset' back={() => navigate(Pages.AppAssets)} />
      <Content>
        <Padded>
          <FlexCol gap='1rem'>
            <ErrorMessage error={Boolean(error)} text={error} />

            <FlexCol gap='0.25rem'>
              <Text smaller color='dark50'>Amount *</Text>
              <input style={inputStyle} type='number' value={amount} onChange={(e) => setAmount(e.target.value)} placeholder='1000' />
            </FlexCol>

            <FlexCol gap='0.25rem'>
              <Text smaller color='dark50'>Name</Text>
              <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder='My Token' />
            </FlexCol>

            <FlexCol gap='0.25rem'>
              <Text smaller color='dark50'>Ticker</Text>
              <input style={inputStyle} value={ticker} onChange={(e) => setTicker(e.target.value.slice(0, 5))} placeholder='TKN' />
            </FlexCol>

            <FlexCol gap='0.25rem'>
              <Text smaller color='dark50'>Decimals</Text>
              <input style={inputStyle} type='number' value={decimals} onChange={(e) => setDecimals(e.target.value)} placeholder='8' />
            </FlexCol>

            <FlexCol gap='0.25rem'>
              <Text smaller color='dark50'>Icon URL</Text>
              <input style={inputStyle} value={iconUrl} onChange={(e) => setIconUrl(e.target.value)} placeholder='https://...' />
            </FlexCol>

            <div onClick={() => setWithControl(!withControl)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type='checkbox' checked={withControl} readOnly />
              <Text smaller>Create control asset (allows future reissuance)</Text>
            </div>
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button label='Mint' onClick={handleMint} disabled={!amount} />
      </ButtonsOnBottom>
    </>
  )
}
```

**Step 2: Implement MintSuccess screen**

```tsx
import { useContext } from 'react'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import Success from '../../../components/Success'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { FlowContext } from '../../../providers/flow'

export default function AppAssetMintSuccess() {
  const { navigate } = useContext(NavigationContext)
  const { assetInfo } = useContext(FlowContext)

  const handleViewAsset = () => {
    navigate(Pages.AppAssetDetail)
  }

  return (
    <>
      <Header text='Asset Created' />
      <Content>
        <Success headline='Asset minted!' text={`Asset ID: ${assetInfo.assetId?.slice(0, 16)}...`} />
      </Content>
      <ButtonsOnBottom>
        <Button label='View Asset' onClick={handleViewAsset} />
        <Button label='Back to Assets' onClick={() => navigate(Pages.AppAssets)} secondary />
      </ButtonsOnBottom>
    </>
  )
}
```

**Step 3: Verify build**

Run: `pnpm build`

**Step 4: Commit**

```bash
git add src/screens/Apps/Assets/Mint.tsx src/screens/Apps/Assets/MintSuccess.tsx
git commit -m "feat: implement mint and mint success screens"
```

---

## Task 12: Build Reissue and Burn screens

**Files:**
- Modify: `src/screens/Apps/Assets/Reissue.tsx`
- Modify: `src/screens/Apps/Assets/Burn.tsx`

**Step 1: Implement Reissue screen**

```tsx
import { useContext, useState } from 'react'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Content from '../../../components/Content'
import ErrorMessage from '../../../components/Error'
import FlexCol from '../../../components/FlexCol'
import Header from '../../../components/Header'
import Loading from '../../../components/Loading'
import Padded from '../../../components/Padded'
import Text from '../../../components/Text'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { FlowContext } from '../../../providers/flow'
import { WalletContext } from '../../../providers/wallet'
import { consoleError } from '../../../lib/logs'
import { extractError } from '../../../lib/error'

export default function AppAssetReissue() {
  const { navigate } = useContext(NavigationContext)
  const { assetInfo } = useContext(FlowContext)
  const { svcWallet, reloadWallet } = useContext(WalletContext)

  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)

  const assetId = assetInfo.assetId ?? ''
  const name = assetInfo.details?.metadata?.name ?? 'Asset'
  const ticker = assetInfo.details?.metadata?.ticker ?? ''

  const inputStyle: React.CSSProperties = {
    background: 'var(--dark10)',
    border: '1px solid var(--dark20)',
    borderRadius: '0.25rem',
    color: 'var(--white)',
    fontSize: '16px',
    padding: '0.75rem',
    width: '100%',
  }

  const handleReissue = async () => {
    if (!svcWallet) return
    const parsedAmount = parseInt(amount)
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Amount must be a positive number')
      return
    }

    setProcessing(true)
    setError('')

    try {
      await (svcWallet as any).assetManager.reissue({ assetId, amount: parsedAmount })
      await reloadWallet()
      navigate(Pages.AppAssetDetail)
    } catch (err) {
      consoleError(err, 'error reissuing asset')
      setError(extractError(err))
    } finally {
      setProcessing(false)
    }
  }

  if (processing) return <Loading text='Reissuing...' />

  return (
    <>
      <Header text={`Reissue ${name}`} back={() => navigate(Pages.AppAssetDetail)} />
      <Content>
        <Padded>
          <FlexCol gap='1rem'>
            <ErrorMessage error={Boolean(error)} text={error} />
            <Text color='dark50'>Mint additional supply of {name}{ticker ? ` (${ticker})` : ''}</Text>
            <FlexCol gap='0.25rem'>
              <Text smaller color='dark50'>Additional Amount</Text>
              <input style={inputStyle} type='number' value={amount} onChange={(e) => setAmount(e.target.value)} placeholder='1000' />
            </FlexCol>
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button label='Reissue' onClick={handleReissue} disabled={!amount} />
      </ButtonsOnBottom>
    </>
  )
}
```

**Step 2: Implement Burn screen**

```tsx
import { useContext, useState } from 'react'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Content from '../../../components/Content'
import ErrorMessage from '../../../components/Error'
import FlexCol from '../../../components/FlexCol'
import Header from '../../../components/Header'
import Loading from '../../../components/Loading'
import Padded from '../../../components/Padded'
import Text from '../../../components/Text'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { FlowContext } from '../../../providers/flow'
import { WalletContext } from '../../../providers/wallet'
import { consoleError } from '../../../lib/logs'
import { extractError } from '../../../lib/error'

export default function AppAssetBurn() {
  const { navigate } = useContext(NavigationContext)
  const { assetInfo } = useContext(FlowContext)
  const { assetBalances, svcWallet, reloadWallet } = useContext(WalletContext)

  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)

  const assetId = assetInfo.assetId ?? ''
  const name = assetInfo.details?.metadata?.name ?? 'Asset'
  const ticker = assetInfo.details?.metadata?.ticker ?? ''
  const balance = assetBalances.find((a) => a.assetId === assetId)?.amount ?? 0

  const inputStyle: React.CSSProperties = {
    background: 'var(--dark10)',
    border: '1px solid var(--dark20)',
    borderRadius: '0.25rem',
    color: 'var(--white)',
    fontSize: '16px',
    padding: '0.75rem',
    width: '100%',
  }

  const handleBurn = async () => {
    if (!svcWallet) return
    const parsedAmount = parseInt(amount)
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Amount must be a positive number')
      return
    }
    if (parsedAmount > balance) {
      setError(`Cannot burn more than your balance (${balance})`)
      return
    }

    setProcessing(true)
    setError('')

    try {
      await (svcWallet as any).assetManager.burn({ assetId, amount: parsedAmount })
      await reloadWallet()
      navigate(Pages.AppAssetDetail)
    } catch (err) {
      consoleError(err, 'error burning asset')
      setError(extractError(err))
    } finally {
      setProcessing(false)
    }
  }

  if (processing) return <Loading text='Burning...' />

  return (
    <>
      <Header text={`Burn ${name}`} back={() => navigate(Pages.AppAssetDetail)} />
      <Content>
        <Padded>
          <FlexCol gap='1rem'>
            <ErrorMessage error={Boolean(error)} text={error} />
            <Text color='dark50'>Current balance: {balance} {ticker}</Text>
            <FlexCol gap='0.25rem'>
              <Text smaller color='dark50'>Amount to Burn</Text>
              <input style={inputStyle} type='number' value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(balance)} />
            </FlexCol>
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button label='Burn' onClick={handleBurn} disabled={!amount} />
      </ButtonsOnBottom>
    </>
  )
}
```

**Step 3: Verify build**

Run: `pnpm build`

**Step 4: Commit**

```bash
git add src/screens/Apps/Assets/Reissue.tsx src/screens/Apps/Assets/Burn.tsx
git commit -m "feat: implement reissue and burn screens"
```

---

## Task 13: Modify receive flow for assets

**Files:**
- Modify: `src/screens/Wallet/Receive/Amount.tsx`
- Modify: `src/screens/Wallet/Receive/QrCode.tsx`

**Step 1: Add asset awareness to ReceiveAmount**

In `src/screens/Wallet/Receive/Amount.tsx`:

Add imports:
```typescript
import { WalletContext } from '../../../providers/wallet'
```

(Already imported. Add `assetMetadataCache` to destructuring if needed.)

In the component, check `recvInfo.assetId`. If set, adjust the header and hide irrelevant UI:

After `const { recvInfo, setRecvInfo } = useContext(FlowContext)` (line 33), add:
```typescript
  const isAssetReceive = Boolean(recvInfo.assetId)
```

Change header text based on asset mode:
```typescript
  <Header text={isAssetReceive ? 'Receive Asset' : 'Receive'} back={() => navigate(Pages.Wallet)} />
```

Hide faucet button and lightning fees when receiving assets (they don't apply):
- Wrap `showFaucetButton` and `showLightningFees` in `&& !isAssetReceive`

**Step 2: Add asset awareness to ReceiveQRCode**

In `src/screens/Wallet/Receive/QrCode.tsx`:

Add imports:
```typescript
import { encodeBip21Asset } from '../../../lib/bip21'
```

After destructuring `recvInfo` (line 34), add:
```typescript
  const isAssetReceive = Boolean(recvInfo.assetId)
```

When `isAssetReceive` is true:
- Use `encodeBip21Asset(offchainAddr, recvInfo.assetId!, satoshis)` instead of `encodeBip21(address, arkAddress, '', satoshis)` for the QR value
- Skip the Lightning swap creation (the `useEffect` on line 53 should check `!isAssetReceive`)
- Set `address` to `''` and only use `arkAddress = offchainAddr` (assets are Ark-only)
- In the `ExpandAddresses`, hide boarding address and lightning when asset mode

Wrap the Lightning swap useEffect condition (line 55):
```typescript
  if (!isAssetReceive && validLnSwap(satoshis) && wallet && svcWallet && arkadeLightning) {
```

For the BIP21 generation, before the existing `defaultBip21uri` (line 38), add a conditional:
```typescript
  const defaultBip21uri = isAssetReceive
    ? encodeBip21Asset(offchainAddr, recvInfo.assetId!, satoshis)
    : encodeBip21(address, arkAddress, '', satoshis)
```

And update the `useEffect` for invoice (line 46) similarly:
```typescript
  useEffect(() => {
    const bip21uri = isAssetReceive
      ? encodeBip21Asset(offchainAddr, recvInfo.assetId!, satoshis)
      : encodeBip21(address, arkAddress, invoice, satoshis)
    setBip21uri(bip21uri)
    setQrValue(bip21uri)
    if (invoice || isAssetReceive) setShowQrCode(true)
  }, [invoice])
```

**Step 3: Verify build**

Run: `pnpm build`

**Step 4: Commit**

```bash
git add src/screens/Wallet/Receive/Amount.tsx src/screens/Wallet/Receive/QrCode.tsx
git commit -m "feat: add asset support to receive flow"
```

---

## Task 14: Modify send flow for assets

**Files:**
- Modify: `src/screens/Wallet/Send/Form.tsx`
- Modify: `src/screens/Wallet/Send/Details.tsx`

**Step 1: Add asset awareness to SendForm**

In `src/screens/Wallet/Send/Form.tsx`:

After destructuring `sendInfo` (line 50), add:
```typescript
  const isAssetSend = Boolean(sendInfo.assets?.length)
```

In the recipient parsing `useEffect` (line 115), when an asset is being sent and a BTC address or Lightning invoice is detected, show an error:

After the `isBTCAddress` check (line 145), add validation:
```typescript
      if (isBTCAddress(recipient) && isAssetSend) {
        return setError('Assets can only be sent to Ark addresses')
      }
```

After the `isLightningInvoice` check (line 133), add:
```typescript
      if (isLightningInvoice(lowerCaseData) && isAssetSend) {
        return setError('Assets can only be sent to Ark addresses')
      }
```

In the BIP21 parsing (line 126), if `assetid` is present, set `sendInfo.assets`:
```typescript
      if (isBip21(lowerCaseData)) {
        const { address, arkAddress, invoice, satoshis, assetId } = decodeBip21(lowerCaseData)
        if (!address && !arkAddress && !invoice) return setError('Unable to parse bip21')
        const assets = assetId ? [{ assetId, amount: satoshis ?? 0 }] : sendInfo.assets
        return setState({ address, arkAddress, invoice, recipient, satoshis, assets })
      }
```

**Step 2: Add asset display to SendDetails**

In `src/screens/Wallet/Send/Details.tsx`:

After destructuring `sendInfo` (line 37), add:
```typescript
  const isAssetSend = Boolean(sendInfo.assets?.length)
```

When `isAssetSend && arkAddress`, use `wallet.send()` instead of `sendOffChain()`:

In `handleContinue` (line 98), add an asset-specific branch:
```typescript
  const handleContinue = async () => {
    if (!details?.total || !details.satoshis || !svcWallet) return
    setSending(true)
    if (isAssetSend && arkAddress) {
      // Asset send via wallet.send()
      const recipients = [{ address: arkAddress, amount: details.satoshis, assets: sendInfo.assets }]
      ;(svcWallet as any).send(...recipients).then(handleTxid).catch(handleError)
    } else if (arkAddress) {
      sendOffChain(svcWallet, details.total, arkAddress).then(handleTxid).catch(handleError)
    } else if (invoice) {
      // ... existing lightning logic
    } else if (address) {
      // ... existing onchain logic
    }
  }
```

**Step 3: Verify build**

Run: `pnpm build`

**Step 4: Commit**

```bash
git add src/screens/Wallet/Send/Form.tsx src/screens/Wallet/Send/Details.tsx
git commit -m "feat: add asset support to send flow"
```

---

## Task 15: Update transaction history and VTXO display for assets

**Files:**
- Modify: `src/lib/asp.ts:153-187` (getTxHistory)
- Modify: `src/components/TransactionsList.tsx:18-103` (TransactionLine)
- Modify: `src/screens/Settings/Vtxos.tsx:206-223` (VtxoLine)

**Step 1: Map asset data in getTxHistory**

In `src/lib/asp.ts`, inside the `getTxHistory` function (line 158), add asset mapping if the SDK provides it:

```typescript
      const assets = (tx as any).assets?.map((a: any) => ({ assetId: a.assetId, amount: a.amount }))
      txs.push({
        amount: Math.abs(amount),
        assets,
        boardingTxid: key.boardingTxid,
        // ... rest stays the same
      })
```

**Step 2: Show asset info in TransactionLine**

In `src/components/TransactionsList.tsx`, inside `TransactionLine` (line 18):

After the `Sats` component (line 58), add an asset display:
```typescript
  const AssetInfo = () => {
    if (!tx.assets?.length) return null
    return (
      <>
        {tx.assets.map((a) => (
          <Text key={a.assetId} color='dark50' smaller>
            {a.amount} {a.assetId.slice(0, 8)}...
          </Text>
        ))}
      </>
    )
  }
```

Add `<AssetInfo />` in the `Right` component after `<Sats />` and `<Fiat />`.

**Step 3: Show asset info in VtxoLine**

In `src/screens/Settings/Vtxos.tsx`, inside `VtxoLine` (line 206):

After `const amount = ...` (line 207), add asset display:
```typescript
    const vtxoAssets = (vtxo as any).assets as { assetId: string; amount: string }[] | undefined
    const assetText = vtxoAssets?.length
      ? vtxoAssets.map((a) => `+ ${a.amount} ${a.assetId.slice(0, 8)}...`).join(', ')
      : ''
```

Update the `CoinLine` call (line 222) to include assets:
```typescript
    return <CoinLine amount={`${amount} SATS${assetText ? ' ' + assetText : ''}`} tags={tags} expiry={expiry} />
```

**Step 4: Verify build**

Run: `pnpm build`

**Step 5: Commit**

```bash
git add src/lib/asp.ts src/components/TransactionsList.tsx src/screens/Settings/Vtxos.tsx
git commit -m "feat: show asset info in transaction history and coin control"
```

---

## Task 16: Final build and integration test

**Step 1: Full build**

Run: `pnpm build`

Expected: Clean build, no errors.

**Step 2: Run existing tests**

Run: `pnpm test`

Expected: All existing tests pass. New BIP21 tests pass.

**Step 3: Lint check**

Run: `pnpm lint`

Fix any lint issues.

**Step 4: Manual smoke test checklist**

Run the dev server: `pnpm start`

Verify:
- [ ] Apps tab shows "Assets" card
- [ ] Tapping Assets card opens the asset list (empty state)
- [ ] Import button opens import form
- [ ] Mint button opens mint form
- [ ] Build compiles without errors

(Full functional testing requires a running Ark server with asset support.)

**Step 5: Commit any remaining fixes**

```bash
git add -A
git commit -m "fix: lint and build fixes for assets integration"
```
