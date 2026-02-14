# Assets Integration Design

Integrate the Arkade SDK asset system (PR arkade-os/ts-sdk#279) into the wallet. Users can import, receive, send, mint, reissue, and burn assets. Assets appear as an app under the Apps tab, with send/receive also accessible from the main wallet flow.

## SDK Dependency

Install `@arkade-os/sdk` from the `asset` branch of `arkade-os/ts-sdk` until PR #279 is merged and published.

### New SDK APIs Used

- `wallet.assetManager.issue(params)` — create a new asset
- `wallet.assetManager.reissue(params)` — mint more supply (requires control asset)
- `wallet.assetManager.burn(params)` — destroy asset units
- `wallet.assetManager.getAssetDetails(assetId)` — fetch metadata and supply
- `wallet.send(...recipients)` — send BTC and/or assets to Ark addresses
- `wallet.getBalance()` — now returns `assets: Asset[]` alongside BTC balance

### Key SDK Types

```typescript
interface Asset { assetId: string; amount: number }
interface Recipient { address: string; amount?: number; assets?: Asset[] }
interface AssetDetails { assetId: string; supply: number; metadata?: AssetMetadata; controlAssetId?: string }
interface AssetMetadata { name?: string; ticker?: string; decimals?: number; icon?: string }
interface IssuanceParams { amount: number; controlAssetId?: string; metadata?: AssetMetadata }
interface IssuanceResult { arkTxId: string; assetId: string }
interface ReissuanceParams { assetId: string; amount: number }
interface BurnParams { assetId: string; amount: number }
```

Asset IDs are 68-character hex strings (32-byte genesis txid + 2-byte group index).

## Navigation & Screens

### New Pages

| Page | Tab | Purpose |
|------|-----|---------|
| `AppAssets` | `Tabs.Apps` | Asset list (imported + auto-discovered) |
| `AppAssetDetail` | `Tabs.Apps` | Single asset: metadata, balance, actions |
| `AppAssetImport` | `Tabs.Apps` | Import asset by ID or QR scan |
| `AppAssetMint` | `Tabs.Apps` | Issue new asset form |
| `AppAssetMintSuccess` | `Tabs.Apps` | Mint confirmation |
| `AppAssetReissue` | `Tabs.Apps` | Reissue more supply |
| `AppAssetBurn` | `Tabs.Apps` | Burn asset units |

### New Screen Files

```
src/screens/Apps/Assets/
  Index.tsx        — asset list
  Detail.tsx       — single asset detail + actions
  Import.tsx       — import by asset ID
  Mint.tsx         — issue new asset
  MintSuccess.tsx  — confirmation after mint
  Reissue.tsx      — mint more supply
  Burn.tsx         — burn units
```

### Entry Point

Add an "Assets" card to `src/screens/Apps/Index.tsx` that navigates to `Pages.AppAssets`.

### Existing Screen Modifications

The existing `ReceiveAmount`, `ReceiveQRCode`, `SendForm`, and `SendDetails` screens gain conditional logic when an asset is selected. No new pages needed for the main wallet send/receive flow.

## State Management

### Approach

Extend existing providers (Approach A). No new providers needed.

### Config Changes (`src/lib/types.ts`)

Add `importedAssets: string[]` to the `Config` type. Default: `[]`. Persisted to localStorage. Stores manually imported asset IDs.

### WalletContext Changes (`src/providers/wallet.tsx`)

Add to `WalletContextProps`:
- `assetBalances: Asset[]` — from `getBalance().assets`, updated on every `reloadWallet()`
- In-memory `Map<string, AssetDetails>` for metadata caching. Populated lazily when an asset is viewed. Avoids redundant `getAssetDetails()` calls.

### FlowContext Changes (`src/providers/flow.tsx`)

Extend `RecvInfo`:
```typescript
interface RecvInfo {
  // existing fields...
  assetId?: string  // when receiving a specific asset
}
```

Extend `SendInfo`:
```typescript
interface SendInfo {
  // existing fields...
  assets?: Asset[]  // assets to send
}
```

Add `AssetInfo` for asset app flows:
```typescript
interface AssetInfo {
  assetId?: string
  details?: AssetDetails
}
```

Add `assetInfo` / `setAssetInfo` to `FlowContextProps`.

## BIP21 Modifications

### Asset Receive URI Format

```
bitcoin:?ark={arkAddr}&assetid={assetId}&amount={amount}
```

- No Bitcoin address (assets are Ark-only)
- No `lightning` param (no swap path for assets)
- New `assetid` param with 68-char hex asset ID
- `amount` uses the asset's decimal precision from metadata

### Code Changes to `src/lib/bip21.ts`

New function:
```typescript
export const encodeBip21Asset = (arkAddress: string, assetId: string, amount: number) => {
  return `bitcoin:?ark=${arkAddress}&assetid=${assetId}&amount=${amount}`
}
```

Extend `Bip21Decoded` with `assetId?: string`. Update `decodeBip21()` to parse the `assetid` query param.

### Receive Flow Behavior When Asset Selected

1. **ReceiveAmount**: show asset name/ticker, use asset decimals for amount input
2. **ReceiveQRCode**: use `encodeBip21Asset()`, skip Lightning swap, hide Bitcoin/Lightning addresses, only show Ark address + asset BIP21. Still listen for `VTXO_UPDATE` for payment detection.

### How User Enters Asset Receive

- From Assets app: tap asset > "Receive" > sets `recvInfo.assetId` > navigates to `ReceiveAmount`
- From main wallet: on `ReceiveAmount`, optional "Select Asset" picker. Choosing an asset sets `recvInfo.assetId`

## Send Flow for Assets

### Entry Points

- From Assets app: tap asset > "Send" > sets `sendInfo.assets` > navigates to `SendForm`
- From main wallet: on `SendForm`, "Attach Asset" button opens asset picker (assets with non-zero balance)

### SendForm Changes

- When `sendInfo.assets` is pre-set, show asset name/ticker and amount input using asset decimals
- Destination validation: assets can only be sent to Ark addresses. Show error for BTC addresses or Lightning invoices when assets are selected.
- QR scan / BIP21 decode: if scanned URI contains `assetid`, auto-populate the asset

### SendDetails Changes

- Show asset info (icon, name, amount) alongside BTC details
- Fees displayed in BTC
- On confirm: `wallet.send({ address: arkAddress, amount: btcAmount, assets: [{ assetId, amount }] })`
- V1: one asset to one recipient. Multi-recipient is future work.

## Assets App Screens

### Assets Index (`AppAssets`)

List merging two sources:
1. Auto-discovered: assets from `assetBalances` (wallet has balance)
2. Manually imported: asset IDs from `config.importedAssets` (may have 0 balance)

Each item shows: icon (or placeholder), name + ticker (or truncated ID), balance.

Top actions: "Import" button > `AppAssetImport`, "Mint" button > `AppAssetMint`.

Tap asset > `AppAssetDetail` with `assetInfo.assetId` set.

### Asset Detail (`AppAssetDetail`)

Displays: icon, name, ticker, asset ID (truncated, tap to copy), balance, total supply, decimals.

Actions:
- **Send** — sets `sendInfo.assets`, navigates to `SendForm`
- **Receive** — sets `recvInfo.assetId`, navigates to `ReceiveAmount`
- **Reissue** — shown only if user holds the control asset. Navigates to `AppAssetReissue`
- **Burn** — shown only if balance > 0. Navigates to `AppAssetBurn`
- **Remove** — removes from `config.importedAssets` (only for manually imported with 0 balance)

### Asset Import (`AppAssetImport`)

Text input for 68-char hex asset ID with QR scan button. On submit: `getAssetDetails(assetId)` to validate. If valid: add to `config.importedAssets`, navigate to detail. If invalid: show error. Duplicates handled silently (navigate to detail).

### Mint (`AppAssetMint`)

Form fields:
- **Amount** (required)
- **Name** (optional)
- **Ticker** (optional, max ~5 chars)
- **Decimals** (optional, default 8)
- **Icon URL** (optional)
- **Create control asset** (optional toggle) — enables future reissuance

On submit: `wallet.assetManager.issue({ amount, metadata: { name, ticker, decimals, icon }, controlAssetId })`.

On success: auto-import returned `assetId`, navigate to `AppAssetMintSuccess`.

### Reissue (`AppAssetReissue`)

Shows asset name/ticker. Amount input for additional supply. On submit: `wallet.assetManager.reissue({ assetId, amount })`. On success: navigate back to detail.

### Burn (`AppAssetBurn`)

Shows asset name/ticker and current balance. Amount input (max = balance). On submit: `wallet.assetManager.burn({ assetId, amount })`. On success: navigate back to detail.

## Transaction History

### Tx Type Extension

```typescript
type Tx = {
  // existing fields...
  assets?: { assetId: string; amount: number }[]
}
```

In `getTxHistory()`: if SDK transaction history includes per-tx asset info, map it to `assets`. If not yet available in SDK, leave `assets` undefined.

### TransactionsList Display

When a transaction has `assets`, show asset name/ticker + amount as a secondary line below the BTC amount (e.g. "+100 USDT"). Tapping through to `Transaction` detail shows asset info in the `Details` component.

## VTXO/Coin Control Screen

### VtxoLine Changes

The SDK PR adds `assets?: VtxoAsset[]` to `ExtendedVirtualCoin`. When `vtxo.assets` is present and non-empty:
- Show asset info below or alongside the SATS amount: `{amount} SATS + {assetAmount} {assetTicker}`
- Multiple assets on one VTXO: show each on its own line within the coin box
- Use the in-memory metadata cache for name resolution. Show truncated asset ID if metadata not cached yet.

No changes to `UtxoLine` (onchain UTXOs don't carry assets) or renewal/settlement logic (SDK handles asset preservation internally).

## Error Handling

| Scenario | Behavior |
|----------|----------|
| SDK not ready | Asset screens check `svcWallet` availability, show loading state |
| Invalid asset ID on import | `getAssetDetails()` fails > show "Asset not found" |
| Metadata unavailable | Fallback: truncated asset ID as label, no icon, decimals default to 8 |
| Insufficient balance (send/burn) | Disable confirm button with message |
| Control asset not held (reissue) | Reissue button hidden; if lost between navigation, show error on failure |
| Network errors | Try/catch on all SDK calls, errors shown via `NotificationsContext` toasts |
| Duplicate import | Skip silently, navigate to existing asset detail |
| Asset receive detection | Same `VTXO_UPDATE` mechanism as BTC, no special polling needed |
