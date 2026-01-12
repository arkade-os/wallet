# Arkade Wallet - Expo Migration Master Plan

## Executive Summary

This document outlines a comprehensive strategy to migrate Arkade Wallet from a PWA-only architecture to a **universal codebase** supporting:
- ✅ **Mobile Apps** (iOS + Android via Expo)
- ✅ **Progressive Web App** (via Expo Web + React Native Web)
- ✅ **Browser Extension** (Chrome/Firefox/Edge - separate build, shared components)

**Current State**: 19,559 lines of TypeScript, Ionic React PWA with Service Worker architecture
**Target State**: Universal Expo monorepo with 60-70% code sharing across all platforms

---

## Table of Contents

1. [Architecture Vision](#architecture-vision)
2. [Current State Analysis](#current-state-analysis)
3. [Migration Challenges & Solutions](#migration-challenges--solutions)
4. [Proposed Architecture](#proposed-architecture)
5. [Platform Abstraction Layer](#platform-abstraction-layer)
6. [Migration Phases](#migration-phases)
7. [Browser Extension Strategy](#browser-extension-strategy)
8. [Code Sharing Matrix](#code-sharing-matrix)
9. [Technology Decisions](#technology-decisions)
10. [Risk Assessment](#risk-assessment)
11. [Success Metrics](#success-metrics)

---

## Architecture Vision

### Universal Expo Monorepo Structure

```
arkade-wallet/
├── apps/
│   ├── native/                    # Expo app (iOS + Android + Web)
│   │   ├── app/                  # Expo Router file-based routing
│   │   │   ├── (tabs)/          # Tab navigation
│   │   │   │   ├── wallet/
│   │   │   │   ├── apps/
│   │   │   │   └── settings/
│   │   │   ├── (modals)/        # Modal screens
│   │   │   │   ├── send/
│   │   │   │   ├── receive/
│   │   │   │   └── transaction/
│   │   │   ├── (onboarding)/    # Onboarding flow
│   │   │   └── _layout.tsx      # Root layout
│   │   ├── components/           # React Native components
│   │   ├── app.json             # Expo config
│   │   └── package.json
│   │
│   ├── extension/                 # Browser extension
│   │   ├── src/
│   │   │   ├── background/       # Service worker (wallet operations)
│   │   │   ├── content/          # Content scripts (dApp bridge)
│   │   │   ├── popup/            # Extension popup (React)
│   │   │   ├── options/          # Options page (React)
│   │   │   └── manifest.json    # Manifest V3
│   │   ├── webpack.config.js
│   │   └── package.json
│   │
│   └── web-legacy/                # Current PWA (for gradual migration)
│
├── packages/
│   ├── core/                      # Business logic core
│   │   ├── src/
│   │   │   ├── wallet/           # Wallet operations
│   │   │   ├── crypto/           # Cryptographic utilities
│   │   │   ├── ark/              # ARK protocol logic
│   │   │   ├── lightning/        # Lightning/Boltz logic
│   │   │   └── types/            # TypeScript types
│   │   └── package.json
│   │
│   ├── state/                     # State management
│   │   ├── src/
│   │   │   ├── providers/        # React Context providers
│   │   │   ├── hooks/            # Custom hooks
│   │   │   └── store/            # Optional: Zustand/Jotai if needed
│   │   └── package.json
│   │
│   ├── platform/                  # Platform abstraction layer
│   │   ├── src/
│   │   │   ├── storage/          # Storage (localStorage/AsyncStorage/chrome.storage)
│   │   │   ├── crypto/           # Crypto APIs (Web Crypto/Expo Crypto)
│   │   │   ├── camera/           # Camera/QR scanner
│   │   │   ├── biometrics/       # Biometric auth
│   │   │   ├── clipboard/        # Clipboard operations
│   │   │   ├── share/            # Share API
│   │   │   ├── notifications/    # Push notifications
│   │   │   └── index.ts          # Platform detection & exports
│   │   └── package.json
│   │
│   ├── ui/                        # Shared UI components
│   │   ├── src/
│   │   │   ├── primitives/       # Base components (Button, Input, etc.)
│   │   │   ├── wallet/           # Wallet-specific components
│   │   │   ├── icons/            # SVG icons (react-native-svg)
│   │   │   └── theme/            # Design tokens
│   │   └── package.json
│   │
│   └── utils/                     # Pure utilities
│       ├── src/
│       │   ├── format/           # Formatting functions
│       │   ├── validation/       # Input validation
│       │   └── constants/        # App constants
│       └── package.json
│
├── package.json                   # Root package.json (workspace)
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

### Key Principles

1. **Platform-Agnostic Core**: All business logic independent of platform
2. **Adapter Pattern**: Platform-specific implementations behind unified interfaces
3. **Composition Over Configuration**: Build features from small, reusable pieces
4. **Progressive Enhancement**: Start with mobile-first, enhance for web/extension
5. **Type Safety**: Strict TypeScript across all packages
6. **Testing First**: Unit tests for core, E2E for apps

---

## Current State Analysis

### Codebase Breakdown

| Category | Files | Lines | Migration Difficulty |
|----------|-------|-------|---------------------|
| **Screens** | 45 | ~7,000 | 🔴 Hard (Ionic → RN) |
| **Components** | 57 | ~5,000 | 🔴 Hard (Ionic → RN) |
| **Providers (State)** | 13 | ~3,000 | 🟢 Easy (Keep structure) |
| **Lib (Utils)** | 35+ | ~3,500 | 🟢 Easy (Direct reuse) |
| **Icons** | 60+ | ~1,000 | 🟡 Medium (SVG → RN SVG) |
| **Tests** | 30+ | ~1,000 | 🟡 Medium (Detox + Jest) |
| **Total** | ~240 | ~19,500 | |

### Technology Stack (Current)

#### Frontend
- **React**: 18.3.1
- **TypeScript**: 5.8.3
- **UI Framework**: **Ionic React 8.5.6** (26+ files, deeply integrated)
- **Build**: Vite 7.1.3 + dual config (app + service worker)

#### Key Dependencies
- **Crypto**: @noble/curves, @scure/bip32, @scure/bip39, @scure/btc-signer
- **Wallet SDK**: @arkade-os/sdk 0.3.10 (Service Worker architecture)
- **Lightning**: @arkade-os/boltz-swap, light-bolt11-decoder
- **Nostr**: nostr-tools 2.12.0
- **QR**: qr-scanner 1.4.2, qr 0.5.2
- **Monitoring**: @sentry/react 9.15.0

#### Platform APIs Used
1. **Service Workers** - Wallet operations, caching, messaging
2. **IndexedDB** - Contract storage, wallet state (via @arkade-os/sdk)
3. **WebAuthn** - Biometric authentication
4. **Web Crypto** - Cryptographic operations
5. **LocalStorage** - Config persistence
6. **Camera API** - QR scanning (via qr-scanner)
7. **Clipboard API** - Copy/paste operations
8. **Share API** - Native share sheet
9. **Notifications API** - Push notifications
10. **Screen Orientation API** - Portrait lock
11. **Browser History API** - Custom navigation

### Architecture Patterns (Current)

#### State Management
- **Pattern**: React Context API (13 nested providers)
- **No Redux/Zustand** - Pure Context + hooks
- **Persistence**: Manual localStorage sync

#### Navigation
- **Custom System**: Enum-based pages (60 pages), not React Router
- **Tab-Based**: Ionic tabs (Wallet, Apps, Settings)
- **History**: Manual pushState + popstate listener

#### Data Flow
```
Service Worker (Wallet SDK)
    ↓
IndexedDB (Contract storage)
    ↓
WalletContext (React state)
    ↓
Components (useContext hooks)
    ↓
LocalStorage (Config backup)
```

---

## Migration Challenges & Solutions

### Challenge 1: Service Worker Architecture 🔴 CRITICAL

**Current**: @arkade-os/sdk runs in Service Worker
- Background wallet operations
- Contract management
- Transaction signing
- VTXO/UTXO updates

**Problem**: Service Workers don't exist in React Native

**Solution Options**:

#### Option A: Refactor @arkade-os/sdk (RECOMMENDED)
Make the SDK platform-agnostic:
```typescript
// @arkade-os/sdk-universal
export class WalletClient {
  constructor(
    storage: StorageAdapter,      // IndexedDB or SQLite
    crypto: CryptoAdapter,        // Web Crypto or Expo Crypto
    worker: WorkerAdapter         // Service Worker or WorkerThread
  ) {}
}

// Platform implementations
import { WalletClient } from '@arkade-os/sdk-universal'
import { WebStorage, WebCrypto, ServiceWorkerAdapter } from '@arkade-os/sdk-web'
import { NativeStorage, NativeCrypto, WorkerThreadAdapter } from '@arkade-os/sdk-native'

// Web
const wallet = new WalletClient(
  new WebStorage(),
  new WebCrypto(),
  new ServiceWorkerAdapter()
)

// React Native
const wallet = new WalletClient(
  new NativeStorage(),
  new NativeCrypto(),
  new WorkerThreadAdapter() // or run in main thread with async queue
)
```

#### Option B: Fork SDK for Native
Create `@arkade-os/sdk-native`:
- Replace Service Worker with React Native Worker Threads
- Replace IndexedDB with SQLite (expo-sqlite)
- Use react-native-quick-crypto for crypto operations

**Recommendation**: Pursue Option A with ARK team - makes SDK universal and benefits entire ecosystem

---

### Challenge 2: Ionic React → React Native 🔴 HIGH IMPACT

**Current**: 26+ files use Ionic components extensively
- IonApp, IonPage, IonContent, IonTabs, IonButton, IonInput, IonModal, etc.
- Custom CSS (270 lines) tightly coupled to Ionic theming

**Solution**: Create Ionic-like component library in React Native

```typescript
// packages/ui/src/primitives/

// Before (Web)
<IonButton expand="block" onClick={handleClick}>
  Send Bitcoin
</IonButton>

// After (Universal)
<Button variant="primary" fullWidth onPress={handlePress}>
  Send Bitcoin
</Button>
```

**Component Mapping**:

| Ionic Component | React Native Solution |
|----------------|----------------------|
| IonApp | View with SafeAreaProvider |
| IonPage | Screen wrapper component |
| IonContent | ScrollView with padding |
| IonButton | Pressable + styled |
| IonInput | TextInput + wrapper |
| IonModal | Modal from react-native |
| IonTabs | Bottom tabs (Expo Router) |
| IonRefresher | RefreshControl |
| IonActionSheet | ActionSheet (expo) |
| IonToast | Toast (react-native-toast-notifications) |

**Styling Strategy**:
- **Option A**: NativeWind (Tailwind for React Native) - fastest migration
- **Option B**: Tamagui (universal design system) - best long-term
- **Option C**: Custom styled-components - most control

**Recommendation**: NativeWind for speed, evaluate Tamagui for long-term

---

### Challenge 3: Browser APIs → Platform APIs 🟡 MEDIUM

**Solution**: Platform Abstraction Layer (see detailed section below)

| Web API | React Native | Browser Extension | Abstraction |
|---------|--------------|-------------------|-------------|
| localStorage | AsyncStorage | chrome.storage.local | Storage API |
| IndexedDB | expo-sqlite | IndexedDB (same) | Database API |
| crypto.subtle | expo-crypto | crypto.subtle (same) | Crypto API |
| getUserMedia | expo-camera | navigator.mediaDevices | Camera API |
| navigator.clipboard | expo-clipboard | navigator.clipboard | Clipboard API |
| WebAuthn | expo-local-authentication | WebAuthn (limited) | Biometrics API |
| navigator.share | expo-sharing | (not available) | Share API |
| Service Worker | WorkerThreads | Service Worker (same) | Worker API |

---

### Challenge 4: Navigation System 🟡 MEDIUM

**Current**: Custom enum-based navigation (60 pages), manual history

**Solution**: Migrate to Expo Router (file-based routing)

```typescript
// Current
navigate(Pages.SendForm, { amount: 1000 })

// After (Expo Router)
router.push('/send/form?amount=1000')
// or
router.push({
  pathname: '/send/form',
  params: { amount: 1000 }
})
```

**Directory Structure**:
```
app/
├── (tabs)/              # Tab navigation
│   ├── wallet.tsx
│   ├── apps.tsx
│   └── settings.tsx
├── (modals)/            # Modal presentations
│   ├── send/
│   │   ├── form.tsx
│   │   ├── details.tsx
│   │   └── success.tsx
│   └── receive/
│       ├── amount.tsx
│       ├── qr.tsx
│       └── success.tsx
├── (onboarding)/        # Onboarding flow
│   ├── init.tsx
│   ├── connect.tsx
│   └── success.tsx
└── _layout.tsx          # Root layout
```

**Benefits**:
- Type-safe routing with TypeScript
- Deep linking works automatically
- Universal (web + mobile)
- Back button handling built-in

---

### Challenge 5: QR Scanner 🟡 MEDIUM

**Current**: Multiple web implementations (qr-scanner, custom canvas)

**Solution**: Expo Camera + expo-barcode-scanner

```typescript
// packages/platform/src/camera/

export interface CameraAPI {
  scanQRCode(): Promise<string>
  requestPermission(): Promise<boolean>
  hasPermission(): Promise<boolean>
}

// Web implementation (qr-scanner)
export class WebCamera implements CameraAPI {
  async scanQRCode() {
    const scanner = new QrScanner(...)
    return scanner.scan()
  }
}

// Native implementation (Expo Camera)
export class NativeCamera implements CameraAPI {
  async scanQRCode() {
    const { status } = await Camera.requestCameraPermissionsAsync()
    if (status !== 'granted') throw new Error('Permission denied')

    // Use Camera component with barcode scanning
    return new Promise((resolve) => {
      // Barcode scanned callback
    })
  }
}
```

---

### Challenge 6: iframe Apps (LendaSat, LendaSwap) 🔴 COMPLEX

**Current**: iframe + postMessage for app integration

**Problem**: React Native doesn't have iframe

**Solution**: Use react-native-webview with message bridging

```typescript
// packages/ui/src/wallet/AppContainer.tsx

import { Platform } from 'react-native'
import { WebView } from 'react-native-webview'

export const AppContainer = ({ url, provider }) => {
  if (Platform.OS === 'web') {
    return (
      <iframe
        src={url}
        ref={(ref) => provider.listen(ref)}
      />
    )
  }

  return (
    <WebView
      source={{ uri: url }}
      onMessage={(event) => {
        const message = JSON.parse(event.nativeEvent.data)
        provider.handleMessage(message)
      }}
      injectedJavaScript={`
        window.walletProvider = {
          postMessage: (msg) => {
            window.ReactNativeWebView.postMessage(JSON.stringify(msg))
          }
        }
      `}
    />
  )
}
```

---

### Challenge 7: Testing Infrastructure 🟡 MEDIUM

**Current**: Playwright (E2E) + Vitest (Unit)

**Solution**: Multi-platform testing strategy

#### Unit Tests
- **Keep**: Vitest for core logic (packages/core, packages/utils)
- **Keep**: React Testing Library for component tests
- **Add**: React Native Testing Library for RN components

#### E2E Tests
- **Replace**: Playwright → Detox (for iOS/Android)
- **Keep**: Playwright for web/extension
- **Add**: Maestro (alternative to Detox, easier setup)

```yaml
# .github/workflows/test.yml
test-unit:
  - pnpm test:core
  - pnpm test:state
  - pnpm test:platform

test-e2e-web:
  - pnpm playwright test

test-e2e-mobile:
  - pnpm detox test --configuration ios.sim.debug
  - pnpm detox test --configuration android.emu.debug

test-e2e-extension:
  - pnpm playwright test:extension
```

---

## Proposed Architecture

### Platform Abstraction Layer (Detailed)

#### Storage API

```typescript
// packages/platform/src/storage/types.ts

export interface StorageAPI {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
  clear(): Promise<void>
  getAllKeys(): Promise<string[]>
}

// Web implementation
export class WebStorage implements StorageAPI {
  async getItem(key: string) {
    return localStorage.getItem(key)
  }

  async setItem(key: string, value: string) {
    localStorage.setItem(key, value)
  }

  async removeItem(key: string) {
    localStorage.removeItem(key)
  }

  async clear() {
    localStorage.clear()
  }

  async getAllKeys() {
    return Object.keys(localStorage)
  }
}

// React Native implementation
import AsyncStorage from '@react-native-async-storage/async-storage'

export class NativeStorage implements StorageAPI {
  async getItem(key: string) {
    return AsyncStorage.getItem(key)
  }

  async setItem(key: string, value: string) {
    await AsyncStorage.setItem(key, value)
  }

  async removeItem(key: string) {
    await AsyncStorage.removeItem(key)
  }

  async clear() {
    await AsyncStorage.clear()
  }

  async getAllKeys() {
    return AsyncStorage.getAllKeys()
  }
}

// Extension implementation
export class ExtensionStorage implements StorageAPI {
  async getItem(key: string) {
    const result = await chrome.storage.local.get(key)
    return result[key] ?? null
  }

  async setItem(key: string, value: string) {
    await chrome.storage.local.set({ [key]: value })
  }

  async removeItem(key: string) {
    await chrome.storage.local.remove(key)
  }

  async clear() {
    await chrome.storage.local.clear()
  }

  async getAllKeys() {
    const all = await chrome.storage.local.get(null)
    return Object.keys(all)
  }
}
```

#### Crypto API

```typescript
// packages/platform/src/crypto/types.ts

export interface CryptoAPI {
  getRandomBytes(length: number): Uint8Array
  sha256(data: Uint8Array): Promise<Uint8Array>
  subtle: SubtleCryptoAPI
}

export interface SubtleCryptoAPI {
  encrypt(algorithm: AlgorithmIdentifier, key: CryptoKey, data: BufferSource): Promise<ArrayBuffer>
  decrypt(algorithm: AlgorithmIdentifier, key: CryptoKey, data: BufferSource): Promise<ArrayBuffer>
  sign(algorithm: AlgorithmIdentifier, key: CryptoKey, data: BufferSource): Promise<ArrayBuffer>
  verify(algorithm: AlgorithmIdentifier, key: CryptoKey, signature: BufferSource, data: BufferSource): Promise<boolean>
  digest(algorithm: AlgorithmIdentifier, data: BufferSource): Promise<ArrayBuffer>
  generateKey(algorithm: AlgorithmIdentifier, extractable: boolean, keyUsages: KeyUsage[]): Promise<CryptoKey>
  importKey(format: KeyFormat, keyData: BufferSource, algorithm: AlgorithmIdentifier, extractable: boolean, keyUsages: KeyUsage[]): Promise<CryptoKey>
  exportKey(format: KeyFormat, key: CryptoKey): Promise<ArrayBuffer | JsonWebKey>
}

// Web implementation
export class WebCrypto implements CryptoAPI {
  getRandomBytes(length: number) {
    return crypto.getRandomValues(new Uint8Array(length))
  }

  async sha256(data: Uint8Array) {
    const hash = await crypto.subtle.digest('SHA-256', data)
    return new Uint8Array(hash)
  }

  get subtle() {
    return crypto.subtle as SubtleCryptoAPI
  }
}

// React Native implementation
import * as Crypto from 'expo-crypto'
// or import { subtle } from 'react-native-quick-crypto'

export class NativeCrypto implements CryptoAPI {
  getRandomBytes(length: number) {
    return Crypto.getRandomBytes(length)
  }

  async sha256(data: Uint8Array) {
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      Buffer.from(data).toString('hex')
    )
    return new Uint8Array(Buffer.from(hash, 'hex'))
  }

  get subtle() {
    // Use react-native-quick-crypto for full SubtleCrypto API
    return subtle as SubtleCryptoAPI
  }
}
```

#### Biometrics API

```typescript
// packages/platform/src/biometrics/types.ts

export interface BiometricsAPI {
  isAvailable(): Promise<boolean>
  getSupportedTypes(): Promise<BiometricType[]>
  authenticate(options: AuthOptions): Promise<AuthResult>
  createCredential(options: CredentialOptions): Promise<Credential>
  getCredential(options: GetCredentialOptions): Promise<Credential>
}

export enum BiometricType {
  Fingerprint = 'fingerprint',
  FaceID = 'face',
  Iris = 'iris',
  None = 'none'
}

// Web implementation (WebAuthn)
export class WebBiometrics implements BiometricsAPI {
  async isAvailable() {
    return window.PublicKeyCredential !== undefined
  }

  async getSupportedTypes() {
    // WebAuthn doesn't expose specific biometric types
    return [BiometricType.Fingerprint, BiometricType.FaceID]
  }

  async authenticate(options: AuthOptions) {
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: options.challenge,
        rpId: window.location.hostname,
        userVerification: 'required'
      }
    })

    return {
      success: credential !== null,
      credential
    }
  }

  async createCredential(options: CredentialOptions) {
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: options.challenge,
        rp: { name: 'Arkade Wallet', id: window.location.hostname },
        user: {
          id: options.userId,
          name: options.username,
          displayName: options.displayName
        },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required'
        }
      }
    })

    return credential as Credential
  }
}

// React Native implementation (Expo LocalAuthentication)
import * as LocalAuthentication from 'expo-local-authentication'

export class NativeBiometrics implements BiometricsAPI {
  async isAvailable() {
    return await LocalAuthentication.hasHardwareAsync()
  }

  async getSupportedTypes() {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync()
    return types.map(type => {
      switch (type) {
        case LocalAuthentication.AuthenticationType.FINGERPRINT:
          return BiometricType.Fingerprint
        case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
          return BiometricType.FaceID
        case LocalAuthentication.AuthenticationType.IRIS:
          return BiometricType.Iris
        default:
          return BiometricType.None
      }
    })
  }

  async authenticate(options: AuthOptions) {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: options.promptMessage ?? 'Authenticate to access wallet',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false
    })

    return {
      success: result.success,
      error: result.error
    }
  }

  async createCredential(options: CredentialOptions) {
    // For native, we just verify biometrics, not create WebAuthn credentials
    // Actual credential storage would use Secure Store
    const result = await this.authenticate({
      promptMessage: 'Authenticate to create credential'
    })

    if (!result.success) {
      throw new Error('Authentication failed')
    }

    return {
      id: options.userId,
      type: 'biometric'
    }
  }
}
```

#### Camera API (QR Scanner)

```typescript
// packages/platform/src/camera/types.ts

export interface CameraAPI {
  scanQRCode(options?: ScanOptions): Promise<string>
  requestPermission(): Promise<boolean>
  hasPermission(): Promise<boolean>
}

export interface ScanOptions {
  prompt?: string
  cancelLabel?: string
}

// Web implementation
import QrScanner from 'qr-scanner'

export class WebCamera implements CameraAPI {
  async scanQRCode(options?: ScanOptions) {
    const videoElement = document.createElement('video')
    const scanner = new QrScanner(
      videoElement,
      (result) => result.data,
      {
        returnDetailedScanResult: true,
        highlightScanRegion: true
      }
    )

    await scanner.start()

    return new Promise<string>((resolve, reject) => {
      scanner.addEventListener('scan', (e) => {
        scanner.stop()
        resolve(e.detail.data)
      })
    })
  }

  async requestPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach(track => track.stop())
      return true
    } catch {
      return false
    }
  }

  async hasPermission() {
    const result = await navigator.permissions.query({ name: 'camera' as PermissionName })
    return result.state === 'granted'
  }
}

// React Native implementation
import { Camera, CameraView } from 'expo-camera'
import { BarCodeScanner } from 'expo-barcode-scanner'

export class NativeCamera implements CameraAPI {
  async scanQRCode(options?: ScanOptions) {
    const hasPermission = await this.requestPermission()
    if (!hasPermission) {
      throw new Error('Camera permission denied')
    }

    // This would be called from a React component that renders Camera
    // The actual scanning happens in the component, this is just the API
    return new Promise<string>((resolve) => {
      // Resolved by component when barcode is scanned
    })
  }

  async requestPermission() {
    const { status } = await Camera.requestCameraPermissionsAsync()
    return status === 'granted'
  }

  async hasPermission() {
    const { status } = await Camera.getCameraPermissionsAsync()
    return status === 'granted'
  }
}
```

#### Platform Detection & Initialization

```typescript
// packages/platform/src/index.ts

import { Platform } from 'react-native'

export enum PlatformType {
  Web = 'web',
  iOS = 'ios',
  Android = 'android',
  Extension = 'extension'
}

export function getCurrentPlatform(): PlatformType {
  // Check if running in extension first
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
    return PlatformType.Extension
  }

  // React Native Platform
  if (Platform.OS === 'ios') return PlatformType.iOS
  if (Platform.OS === 'android') return PlatformType.Android
  if (Platform.OS === 'web') return PlatformType.Web

  return PlatformType.Web
}

export interface PlatformAPIs {
  storage: StorageAPI
  crypto: CryptoAPI
  camera: CameraAPI
  biometrics: BiometricsAPI
  clipboard: ClipboardAPI
  share: ShareAPI
  notifications: NotificationsAPI
}

export function initializePlatform(): PlatformAPIs {
  const platform = getCurrentPlatform()

  switch (platform) {
    case PlatformType.Web:
      return {
        storage: new WebStorage(),
        crypto: new WebCrypto(),
        camera: new WebCamera(),
        biometrics: new WebBiometrics(),
        clipboard: new WebClipboard(),
        share: new WebShare(),
        notifications: new WebNotifications()
      }

    case PlatformType.iOS:
    case PlatformType.Android:
      return {
        storage: new NativeStorage(),
        crypto: new NativeCrypto(),
        camera: new NativeCamera(),
        biometrics: new NativeBiometrics(),
        clipboard: new NativeClipboard(),
        share: new NativeShare(),
        notifications: new NativeNotifications()
      }

    case PlatformType.Extension:
      return {
        storage: new ExtensionStorage(),
        crypto: new WebCrypto(), // Extensions use Web Crypto
        camera: new WebCamera(), // Extensions can use camera
        biometrics: new WebBiometrics(), // WebAuthn works in extensions
        clipboard: new WebClipboard(),
        share: null, // Not available in extensions
        notifications: new ExtensionNotifications()
      }
  }
}

// Usage in app
import { initializePlatform } from '@arkade/platform'

const platform = initializePlatform()

// Now use platform.storage, platform.crypto, etc.
await platform.storage.setItem('key', 'value')
const data = await platform.crypto.sha256(new Uint8Array([1, 2, 3]))
```

---

## Browser Extension Strategy

### Manifest V3 Architecture

```json
// apps/extension/src/manifest.json
{
  "manifest_version": 3,
  "name": "Arkade Wallet",
  "version": "1.0.0",
  "description": "Self-custodial Bitcoin wallet with ARK, Lightning, and Nostr support",

  "permissions": [
    "storage",
    "notifications",
    "activeTab",
    "scripting"
  ],

  "host_permissions": [
    "https://*/*"
  ],

  "background": {
    "service_worker": "background.js",
    "type": "module"
  },

  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },

  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_start"
    }
  ],

  "web_accessible_resources": [
    {
      "resources": ["injected.js"],
      "matches": ["<all_urls>"]
    }
  ],

  "options_page": "options.html"
}
```

### Extension Architecture

```
apps/extension/src/
├── background/
│   ├── index.ts                    # Service worker entry
│   ├── wallet.ts                   # Wallet operations (reuse @arkade/core)
│   ├── messaging.ts                # Message router
│   └── storage.ts                  # Storage manager
│
├── content/
│   ├── content.ts                  # Content script (injects into pages)
│   ├── bridge.ts                   # Bridge to injected script
│   └── dapp-detector.ts            # Detect dApps on page
│
├── injected/
│   ├── injected.ts                 # Injected into page (window.arkade)
│   └── provider.ts                 # Provider API for dApps
│
├── popup/
│   ├── index.tsx                   # Popup entry (React)
│   ├── App.tsx                     # Popup app (reuse components from @arkade/ui)
│   └── components/                 # Extension-specific components
│
├── options/
│   ├── index.tsx                   # Options page entry
│   └── App.tsx                     # Full settings UI
│
└── shared/
    ├── messages.ts                 # Message types
    └── constants.ts                # Extension constants
```

### Message Flow

```
dApp Page (injected.ts)
    ↓ postMessage
Content Script (content.ts)
    ↓ chrome.runtime.sendMessage
Background Service Worker (background/index.ts)
    ↓ process request
Wallet Core (@arkade/core)
    ↓ sign transaction
Background Service Worker
    ↓ chrome.runtime.sendMessage
Content Script
    ↓ postMessage
dApp Page (receives result)
```

### Provider API for dApps

```typescript
// apps/extension/src/injected/provider.ts

interface ArkadeProvider {
  // Connection
  connect(): Promise<{ address: string, publicKey: string }>
  disconnect(): Promise<void>
  isConnected(): boolean

  // Bitcoin
  getAddress(type?: AddressType): Promise<string>
  signPsbt(psbt: string): Promise<string>
  sendBitcoin(to: string, amount: number): Promise<string>

  // ARK
  sendOffchain(to: string, amount: number): Promise<string>
  receiveOffchain(): Promise<string>

  // Nostr
  getPublicKey(): Promise<string>
  signEvent(event: NostrEvent): Promise<NostrEvent>

  // Events
  on(event: string, callback: Function): void
  off(event: string, callback: Function): void
}

// Inject into window
window.arkade = new ArkadeProvider()

// dApp usage
if (window.arkade) {
  const { address } = await window.arkade.connect()
  console.log('Connected:', address)

  const txid = await window.arkade.sendBitcoin('bc1q...', 10000)
  console.log('Transaction:', txid)
}
```

### Code Sharing with Extension

| Component | Shared? | Notes |
|-----------|---------|-------|
| @arkade/core | ✅ 100% | Business logic identical |
| @arkade/state | ✅ 90% | Contexts work, some hooks differ |
| @arkade/platform | ✅ 80% | Use ExtensionStorage, WebCrypto, etc. |
| @arkade/ui | ⚠️ 50% | Popup uses React, but different layout constraints |
| @arkade/utils | ✅ 100% | Pure functions, fully shared |

**Key Difference**: Extension popup is **constrained to small viewport** (400x600px), so needs different layout than full app.

### Extension-Specific Features

1. **Content Script Injection**: Detect dApps and inject provider
2. **Context Menus**: Right-click to send Bitcoin to address on page
3. **Badge**: Show pending transactions count
4. **Notifications**: Transaction confirmations
5. **Omnibox**: Quick actions (omnibox keyword: "ark")

---

## Code Sharing Matrix

### Package Dependency Graph

```
apps/native (Expo)
    ├── @arkade/core          [100% shared]
    ├── @arkade/state         [100% shared]
    ├── @arkade/platform      [90% shared, RN implementations]
    ├── @arkade/ui            [100% shared, RN components]
    └── @arkade/utils         [100% shared]

apps/extension
    ├── @arkade/core          [100% shared]
    ├── @arkade/state         [90% shared]
    ├── @arkade/platform      [80% shared, Extension implementations]
    ├── @arkade/ui            [50% shared, React components for popup]
    └── @arkade/utils         [100% shared]
```

### Shared Code Percentage by Package

| Package | LOC | Native | Extension | Web (Expo) |
|---------|-----|--------|-----------|------------|
| @arkade/core | ~4,000 | 100% | 100% | 100% |
| @arkade/state | ~3,000 | 100% | 90% | 100% |
| @arkade/platform | ~2,000 | 90% | 80% | 90% |
| @arkade/ui | ~6,000 | 100% | 50% | 100% |
| @arkade/utils | ~1,500 | 100% | 100% | 100% |
| **Total Core** | ~16,500 | **95%** | **85%** | **95%** |
| App-specific | ~3,000 | 5% | 15% | 5% |
| **Grand Total** | ~19,500 | 100% | 100% | 100% |

**Overall Code Sharing**: ~70-85% depending on platform

---

## Migration Phases

### Phase 0: Preparation (Week 1-2)

#### Goals
- Set up monorepo structure
- Create package scaffolding
- Set up build system
- Establish development workflow

#### Tasks
1. **Initialize Monorepo**
   ```bash
   pnpm init
   mkdir -p apps/{native,extension,web-legacy}
   mkdir -p packages/{core,state,platform,ui,utils}
   ```

2. **Configure Workspaces**
   ```yaml
   # pnpm-workspace.yaml
   packages:
     - 'apps/*'
     - 'packages/*'
   ```

3. **Set Up TypeScript**
   - Create `tsconfig.base.json`
   - Configure path aliases
   - Set up project references

4. **Initialize Expo App**
   ```bash
   cd apps/native
   npx create-expo-app@latest . --template blank-typescript
   ```

5. **Set Up Build Tools**
   - Configure Turborepo or Nx for monorepo builds
   - Set up changesets for versioning
   - Configure ESLint + Prettier

**Deliverables**:
- ✅ Monorepo structure with all packages
- ✅ Expo app initialized
- ✅ Build pipeline working
- ✅ Can run `pnpm build` successfully

---

### Phase 1: Extract Core Logic (Week 3-6)

#### Goals
- Extract platform-independent code
- Create platform abstraction layer
- Migrate crypto utilities
- Set up state management

#### Tasks

##### 1.1 Create @arkade/utils (Week 3)
Move pure utilities:
- `/src/lib/format.ts` → `@arkade/utils/format`
- `/src/lib/address.ts` → `@arkade/utils/address`
- `/src/lib/validation.ts` → `@arkade/utils/validation`
- `/src/lib/bitcoin.ts` → `@arkade/utils/bitcoin`
- `/src/lib/constants.ts` → `@arkade/utils/constants`

**Estimated Files**: 15-20 files, ~1,500 LOC

##### 1.2 Create @arkade/core (Week 4)
Move business logic:
- Wallet operations (sans Service Worker parts)
- ARK protocol logic
- Lightning/Boltz integration
- Transaction building
- Nostr integration

**Structure**:
```
packages/core/src/
├── wallet/
│   ├── types.ts
│   ├── operations.ts
│   └── balance.ts
├── ark/
│   ├── asp.ts
│   ├── vtxo.ts
│   └── rounds.ts
├── lightning/
│   ├── boltz.ts
│   └── invoice.ts
├── nostr/
│   └── client.ts
└── index.ts
```

**Estimated Files**: 20-25 files, ~4,000 LOC

##### 1.3 Create @arkade/platform (Week 5)
Implement platform abstraction:
- Storage API (3 implementations)
- Crypto API (2 implementations)
- Camera API (2 implementations)
- Biometrics API (2 implementations)
- Clipboard API (2 implementations)
- Share API (2 implementations)
- Notifications API (3 implementations)

**Structure**: See detailed Platform Abstraction Layer section

**Estimated Files**: 30+ files, ~2,000 LOC

##### 1.4 Create @arkade/state (Week 6)
Migrate Context providers:
- Extract provider logic
- Update to use @arkade/platform
- Keep hooks structure
- Update storage calls to use platform API

**Structure**:
```
packages/state/src/
├── providers/
│   ├── WalletProvider.tsx
│   ├── ConfigProvider.tsx
│   ├── NavigationProvider.tsx
│   └── ...
├── hooks/
│   ├── useWallet.ts
│   ├── useConfig.ts
│   └── ...
└── index.ts
```

**Estimated Files**: 13 providers + 13 hooks = ~26 files, ~3,000 LOC

**Deliverables**:
- ✅ @arkade/utils fully functional
- ✅ @arkade/core with 100% test coverage
- ✅ @arkade/platform with all 3 implementations
- ✅ @arkade/state working in web-legacy
- ✅ All unit tests passing

---

### Phase 2: UI Component Library (Week 7-10)

#### Goals
- Create universal component library
- Replace Ionic components
- Set up theming system
- Build storybook for components

#### Tasks

##### 2.1 Choose Styling Solution (Week 7)
**Decision Point**: NativeWind vs Tamagui vs Custom

**Recommendation**: Start with NativeWind, evaluate Tamagui later

**Setup**:
```bash
cd packages/ui
pnpm add nativewind
pnpm add --save-dev tailwindcss
```

##### 2.2 Create Primitive Components (Week 7-8)
Build foundational components:
- Button (6 variants)
- Input (text, password, number)
- Text (8 variants)
- View / Container
- ScrollView
- SafeArea
- Modal
- Toast
- ActionSheet
- Spinner / Loading
- Badge
- Card
- Divider
- Avatar
- Icon wrapper

**Estimated**: 20 components, ~1,500 LOC

##### 2.3 Create Wallet Components (Week 9)
Build domain-specific components:
- BalanceCard
- TransactionList / TransactionItem
- AddressDisplay
- QRCode (react-native-qrcode-svg)
- Scanner (platform-specific)
- AmountInput
- FeeSelector
- NetworkBadge
- AssetIcon
- InvoiceCard

**Estimated**: 15 components, ~2,000 LOC

##### 2.4 Create Layout Components (Week 10)
Build screen layouts:
- Screen (wrapper with SafeArea)
- Header (with back button)
- TabBar (bottom tabs)
- FlexCol / FlexRow (layout helpers)
- Padded (padding wrapper)
- Centered
- KeyboardAvoidingView wrapper

**Estimated**: 10 components, ~500 LOC

##### 2.5 Icon System (Week 10)
Migrate SVG icons to react-native-svg:
```bash
pnpm add react-native-svg
```

Convert 60+ icon components from React to React Native SVG

**Tool**: Use SVGR or create custom script to batch convert

**Deliverables**:
- ✅ @arkade/ui package with 45+ components
- ✅ Storybook running (optional but recommended)
- ✅ All components documented
- ✅ Theme system working
- ✅ Icons converted to RN SVG

---

### Phase 3: Mobile App Development (Week 11-18)

#### Goals
- Build mobile app with Expo Router
- Implement all screens
- Integrate @arkade packages
- Implement native features

#### Tasks

##### 3.1 Set Up Expo Router (Week 11)
```bash
cd apps/native
pnpm add expo-router
```

Configure routing structure:
```
app/
├── _layout.tsx               # Root layout
├── (tabs)/
│   ├── _layout.tsx          # Tabs layout
│   ├── wallet.tsx
│   ├── apps.tsx
│   └── settings.tsx
├── (modals)/
│   ├── send/
│   ├── receive/
│   └── transaction.tsx
└── (onboarding)/
    ├── _layout.tsx
    └── ...
```

##### 3.2 Implement Core Screens (Week 12-14)

**Week 12: Wallet Tab**
- Wallet index (balance, transactions)
- Transaction detail screen
- VTXO list screen

**Week 13: Send/Receive Flows**
- Send: Form → Details → Success
- Receive: Amount → QR → Success
- Notes: Redeem → Form → Success

**Week 14: Settings & Apps**
- Settings menu
- Apps list
- App detail screens (WebView integration)

**Estimated**: 30+ screens, ~4,000 LOC

##### 3.3 Implement Onboarding (Week 15)
- Init screen
- Connect/Restore flow
- Password setup
- Success screen
- Biometric setup

**Estimated**: 8 screens, ~1,200 LOC

##### 3.4 Integrate Native Features (Week 16)
- Camera/QR scanner
- Biometric authentication
- Push notifications
- Deep linking (arkade://)
- Secure storage (expo-secure-store)
- Haptics feedback

##### 3.5 Polish & UX (Week 17)
- Animations (react-native-reanimated)
- Gestures (react-native-gesture-handler)
- Loading states
- Error handling
- Empty states
- Pull-to-refresh

##### 3.6 Testing (Week 18)
- Write E2E tests (Detox or Maestro)
- Test on real devices (iOS + Android)
- Fix platform-specific issues
- Performance optimization

**Deliverables**:
- ✅ Fully functional mobile app (iOS + Android)
- ✅ All screens implemented
- ✅ Native features working
- ✅ E2E tests passing
- ✅ TestFlight / Internal testing build ready

---

### Phase 4: Expo Web / PWA (Week 19-21)

#### Goals
- Enable Expo Web
- Ensure PWA features work
- Test web compatibility
- Deploy web version

#### Tasks

##### 4.1 Configure Expo Web (Week 19)
```bash
cd apps/native
pnpm add @expo/webpack-config
```

Update `app.json`:
```json
{
  "expo": {
    "web": {
      "bundler": "metro",
      "favicon": "./assets/favicon.png"
    }
  }
}
```

##### 4.2 Implement Web-Specific Features (Week 19-20)
- Service Worker (via Workbox)
- Web manifest
- Responsive design adjustments
- Desktop-specific UI tweaks

##### 4.3 Test Web Compatibility (Week 20)
- Test all screens on web
- Fix web-specific bugs
- Test on different browsers (Chrome, Safari, Firefox)
- Test PWA installation

##### 4.4 Optimize Web Build (Week 21)
- Code splitting
- Bundle size optimization
- Lighthouse audit
- Performance testing

**Deliverables**:
- ✅ Expo web build working
- ✅ PWA features functional
- ✅ All screens work on web
- ✅ Lighthouse score > 90

---

### Phase 5: Browser Extension (Week 22-26)

#### Goals
- Build browser extension
- Implement provider API
- Test with dApps
- Publish to stores

#### Tasks

##### 5.1 Set Up Extension Project (Week 22)
- Create Webpack config for extension
- Set up Manifest V3
- Configure build for multiple browsers

##### 5.2 Implement Background Service Worker (Week 22-23)
- Port wallet operations from @arkade/core
- Implement message router
- Set up storage (chrome.storage)
- Test background operations

##### 5.3 Implement Content Scripts (Week 23)
- Inject provider into pages
- Bridge messages to background
- Detect dApps on page

##### 5.4 Build Extension Popup (Week 24)
- Reuse components from @arkade/ui (React versions)
- Implement mini wallet UI
- Transaction approval flow

##### 5.5 Build Provider API (Week 24-25)
- Implement dApp provider interface
- Test with example dApps
- Write documentation

##### 5.6 Testing & Publishing (Week 26)
- Test on Chrome, Firefox, Edge
- Submit to Chrome Web Store
- Submit to Firefox Add-ons
- Create Edge listing

**Deliverables**:
- ✅ Browser extension working on Chrome/Firefox/Edge
- ✅ Provider API functional
- ✅ Tested with dApps
- ✅ Published to stores (pending review)

---

### Phase 6: Migration & Deprecation (Week 27-30)

#### Goals
- Migrate users from old PWA
- Deprecate Ionic version
- Monitor stability
- Fix critical bugs

#### Tasks

##### 6.1 User Migration (Week 27-28)
- Add migration banner to old PWA
- Guide users to install new app
- Provide data export/import
- Monitor migration rate

##### 6.2 Monitoring & Bug Fixes (Week 28-29)
- Set up Sentry for all platforms
- Monitor crash reports
- Fix critical bugs
- Performance monitoring

##### 6.3 Feature Parity Check (Week 29)
- Verify all old features work in new app
- Update documentation
- Create user guides

##### 6.4 Deprecation (Week 30)
- Redirect old PWA to new
- Archive old codebase
- Update domains/hosting

**Deliverables**:
- ✅ User migration complete
- ✅ Old PWA deprecated
- ✅ Monitoring in place
- ✅ Documentation updated

---

## Technology Decisions

### UI Framework: NativeWind vs Tamagui vs Custom

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **NativeWind** | - Tailwind CSS for RN<br>- Fast development<br>- Good docs<br>- Easy for web devs | - Performance overhead<br>- Not truly universal (web needs separate setup) | ✅ **Start here** |
| **Tamagui** | - Universal (web + native)<br>- Excellent performance<br>- Built-in animations<br>- Design system | - Learning curve<br>- Opinionated<br>- Larger bundle | ⭐ **Evaluate after Phase 2** |
| **Custom** | - Full control<br>- No dependencies<br>- Optimized for needs | - Time consuming<br>- Maintenance burden<br>- Reinventing wheel | ❌ **Avoid** |

**Recommendation**: Start with NativeWind for speed, migrate to Tamagui in Phase 4+ if needed.

---

### State Management: Context API vs Zustand vs Jotai

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **Keep Context API** | - Already implemented<br>- No new deps<br>- Works fine for app size | - Re-renders can be inefficient<br>- Boilerplate | ✅ **Keep for now** |
| **Zustand** | - Minimal boilerplate<br>- Better performance<br>- DevTools support | - Migration effort<br>- Different mental model | ⭐ **Consider in Phase 6** |
| **Jotai** | - Atomic state<br>- Better performance<br>- Less boilerplate | - Different patterns<br>- Learning curve | ❌ **Overkill** |

**Recommendation**: Keep Context API, optimize selectively with React.memo/useMemo. Consider Zustand if performance issues arise.

---

### Navigation: Expo Router vs React Navigation

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **Expo Router** | - File-based routing<br>- Universal (web + native)<br>- Type-safe<br>- Deep linking built-in<br>- Modern approach | - Newer (less mature)<br>- Different from current custom system | ✅ **Use this** |
| **React Navigation** | - Mature<br>- Flexible<br>- Popular | - Imperative API<br>- Not file-based<br>- More boilerplate | ❌ **Skip** |

**Recommendation**: Use Expo Router - it's the future of Expo navigation and provides the best DX.

---

### Testing: Detox vs Maestro

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **Detox** | - Mature<br>- React Native focused<br>- Good docs | - Complex setup<br>- Slow CI times<br>- Flaky tests | ⚠️ **Stable but slow** |
| **Maestro** | - Simple setup<br>- Fast<br>- Great DX<br>- Cross-platform | - Newer<br>- Smaller community | ✅ **Try this first** |

**Recommendation**: Try Maestro first. Fall back to Detox if needed. Keep Playwright for web/extension.

---

### Crypto Library: Web Crypto vs Expo Crypto vs react-native-quick-crypto

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **Web Crypto (web)** | - Native browser support<br>- No deps<br>- Standard API | - Only on web | ✅ **Use on web** |
| **Expo Crypto** | - Official Expo package<br>- Simple API<br>- Cross-platform | - Limited API (no SubtleCrypto)<br>- Basic operations only | ⚠️ **Too limited** |
| **react-native-quick-crypto** | - Full SubtleCrypto API<br>- Fast (JSI)<br>- Compatible with Node crypto | - Native module<br>- More complex | ✅ **Use on native** |

**Recommendation**:
- Web: Use Web Crypto API (built-in)
- Native: Use react-native-quick-crypto for full SubtleCrypto compatibility
- Keep @noble/* and @scure/* libraries (pure JS, universal)

---

## Risk Assessment

### Critical Risks

#### 1. Service Worker Dependency 🔴 CRITICAL
**Risk**: @arkade-os/sdk depends on Service Worker architecture
**Impact**: Cannot run wallet on React Native without refactor
**Mitigation**:
- Collaborate with ARK team to make SDK universal
- Or: Fork SDK and create native version
- Or: Refactor wallet logic out of SDK
**Timeline Impact**: +4-8 weeks if SDK refactor needed

#### 2. IndexedDB Storage 🟡 HIGH
**Risk**: SDK uses IndexedDB extensively
**Impact**: Need SQLite or other storage on React Native
**Mitigation**:
- Use expo-sqlite as IndexedDB replacement
- Create adapter layer in @arkade/platform
- Test data migration thoroughly
**Timeline Impact**: +2-3 weeks

#### 3. Ionic Component Coupling 🟡 HIGH
**Risk**: 26+ files deeply integrated with Ionic React
**Impact**: Large refactor effort
**Mitigation**:
- Build component library incrementally
- Use Storybook to verify UI parity
- Migrate screen-by-screen
**Timeline Impact**: Already accounted in Phase 2

#### 4. iframe App Integration 🟡 MEDIUM
**Risk**: LendaSat/LendaSwap use iframe + postMessage
**Impact**: Need WebView on native with message bridging
**Mitigation**:
- Use react-native-webview
- Create unified API for iframe/WebView
- Test thoroughly on both platforms
**Timeline Impact**: +1-2 weeks

### Medium Risks

#### 5. Testing Infrastructure 🟡 MEDIUM
**Risk**: Need to rebuild E2E tests for mobile
**Impact**: Playwright tests won't work for native
**Mitigation**:
- Use Maestro or Detox
- Port test scenarios from Playwright
- Set up CI/CD for mobile testing
**Timeline Impact**: +2 weeks

#### 6. Platform-Specific Bugs 🟡 MEDIUM
**Risk**: Subtle differences between platforms
**Impact**: Unexpected bugs on iOS/Android
**Mitigation**:
- Test on real devices early and often
- Use feature flags for platform-specific code
- Monitor Sentry for crash reports
**Timeline Impact**: +1-2 weeks buffer

#### 7. Performance on Lower-End Devices 🟡 MEDIUM
**Risk**: React Native may be slower than native
**Impact**: Poor UX on older devices
**Mitigation**:
- Profile early with React DevTools
- Use React.memo strategically
- Optimize list rendering (FlashList)
- Test on low-end devices
**Timeline Impact**: +1 week optimization

### Low Risks

#### 8. Build Complexity 🟢 LOW
**Risk**: Managing multi-platform builds
**Impact**: Slower development workflow
**Mitigation**:
- Use Turborepo for build caching
- Set up proper CI/CD pipelines
- Document build process
**Timeline Impact**: Minimal

#### 9. App Store Review 🟢 LOW
**Risk**: iOS/Android app rejection
**Impact**: Delayed launch
**Mitigation**:
- Follow platform guidelines
- Prepare compliance documentation
- Have legal review crypto compliance
**Timeline Impact**: +1-2 weeks buffer

---

## Success Metrics

### Technical Metrics

#### Code Sharing
- **Target**: 70-80% code shared across platforms
- **Measurement**: Count LOC in shared packages vs app-specific

#### Performance
- **Target**:
  - App launch: < 2s (native)
  - Screen transitions: < 300ms
  - Transaction signing: < 500ms
- **Measurement**: Use React DevTools Profiler + Metro bundler

#### Bundle Size
- **Target**:
  - iOS: < 30 MB
  - Android: < 25 MB
  - Web: < 2 MB initial bundle
- **Measurement**: Build output analysis

#### Test Coverage
- **Target**:
  - @arkade/core: 90%+
  - @arkade/state: 80%+
  - @arkade/platform: 85%+
  - @arkade/ui: 70%+
- **Measurement**: Jest coverage reports

### User Metrics

#### Adoption
- **Target**: 50% of PWA users migrate within 3 months
- **Measurement**: Analytics + install tracking

#### Crash Rate
- **Target**: < 0.5% crash-free sessions
- **Measurement**: Sentry

#### Performance Satisfaction
- **Target**: 4.5+ star rating in app stores
- **Measurement**: App Store + Google Play reviews

#### Feature Parity
- **Target**: 100% feature parity by Phase 6 completion
- **Measurement**: Feature checklist

---

## Timeline Summary

| Phase | Duration | Effort (eng-weeks) | Key Deliverable |
|-------|----------|-------------------|----------------|
| **Phase 0: Preparation** | 2 weeks | 2 weeks | Monorepo setup |
| **Phase 1: Core Logic** | 4 weeks | 6 weeks | @arkade/* packages |
| **Phase 2: UI Library** | 4 weeks | 5 weeks | @arkade/ui complete |
| **Phase 3: Mobile App** | 8 weeks | 10 weeks | Native apps working |
| **Phase 4: Expo Web** | 3 weeks | 3 weeks | PWA on Expo Web |
| **Phase 5: Extension** | 5 weeks | 6 weeks | Browser extension |
| **Phase 6: Migration** | 4 weeks | 3 weeks | Old PWA deprecated |
| **Total** | **30 weeks** | **35 eng-weeks** | All platforms live |

**Assumptions**:
- 1-2 full-time engineers
- No major SDK refactor needed (see Risk #1)
- Parallel work where possible
- 20% buffer included

**If SDK refactor needed**: Add 4-8 weeks to timeline

---

## Next Steps

### Immediate Actions (This Week)

1. **Decision: Service Worker Strategy**
   - Contact ARK team about SDK universalization
   - Evaluate effort for SDK fork vs refactor
   - Choose path forward

2. **Spike: Monorepo Setup**
   - Set up pnpm workspaces
   - Initialize Expo app
   - Verify build pipeline

3. **Spike: Component Library**
   - Test NativeWind setup
   - Build 3-5 proof-of-concept components
   - Verify styling approach works

4. **Documentation**
   - Review this plan with team
   - Get feedback and adjust
   - Break down Phase 1 into detailed tasks

### First Sprint (Week 1-2)

- [ ] Complete Phase 0: Preparation
- [ ] Create all package scaffolding
- [ ] Set up CI/CD pipeline
- [ ] Initialize Expo app
- [ ] Document development workflow
- [ ] Get SDK strategy decision

---

## Appendices

### A. File Migration Checklist

**Status Key**: ✅ Easy | ⚠️ Needs Adaptation | 🔴 Complex

| File | Category | Destination | Status |
|------|----------|-------------|--------|
| lib/format.ts | Utils | @arkade/utils | ✅ |
| lib/address.ts | Utils | @arkade/utils | ✅ |
| lib/bitcoin.ts | Utils | @arkade/utils | ✅ |
| lib/validation.ts | Utils | @arkade/utils | ✅ |
| lib/wallet.ts | Core | @arkade/core | ⚠️ |
| lib/ark.ts | Core | @arkade/core | ⚠️ |
| lib/storage.ts | Platform | @arkade/platform | ⚠️ |
| lib/biometrics.ts | Platform | @arkade/platform | 🔴 |
| lib/clipboard.ts | Platform | @arkade/platform | ⚠️ |
| lib/camera.ts | Platform | @arkade/platform | 🔴 |
| providers/* | State | @arkade/state | ⚠️ |
| components/* | UI | @arkade/ui | 🔴 |
| screens/* | App | apps/native | 🔴 |

### B. Dependencies to Add

#### Expo Native
```json
{
  "expo": "~52.0.0",
  "expo-router": "~4.0.0",
  "react-native": "0.76.0",
  "react-native-web": "~0.19.13",
  "react-native-svg": "15.8.0",
  "react-native-webview": "13.12.0",
  "react-native-qrcode-svg": "6.3.11",
  "@react-native-async-storage/async-storage": "2.1.0",
  "expo-camera": "~16.0.0",
  "expo-barcode-scanner": "~14.0.0",
  "expo-clipboard": "~7.0.0",
  "expo-crypto": "~14.0.0",
  "expo-local-authentication": "~15.0.0",
  "expo-secure-store": "~14.0.0",
  "expo-sharing": "~13.0.0",
  "expo-sqlite": "~15.0.0",
  "react-native-quick-crypto": "0.7.5",
  "nativewind": "^4.0.0",
  "tailwindcss": "^3.4.0"
}
```

#### Extension
```json
{
  "@types/chrome": "^0.0.268",
  "webextension-polyfill": "^0.12.0",
  "webpack": "^5.94.0",
  "webpack-cli": "^5.1.4",
  "copy-webpack-plugin": "^12.0.2",
  "html-webpack-plugin": "^5.6.0"
}
```

### C. Architecture Diagrams

#### Current Architecture
```
Browser
    ↓
PWA (Ionic React + Vite)
    ↓
Service Worker (@arkade-os/sdk)
    ↓
IndexedDB
```

#### Target Architecture
```
Platform (iOS / Android / Web / Extension)
    ↓
Expo App / Extension
    ↓
@arkade/ui (React Native Components)
    ↓
@arkade/state (React Context)
    ↓
@arkade/platform (Platform Abstraction)
    ↓
@arkade/core (Business Logic)
    ↓
Storage (AsyncStorage / SQLite / chrome.storage)
```

### D. Research Links

- **Expo Documentation**: https://docs.expo.dev
- **Expo Router**: https://docs.expo.dev/router/introduction/
- **React Native**: https://reactnative.dev
- **NativeWind**: https://www.nativewind.dev
- **Tamagui**: https://tamagui.dev
- **Maestro**: https://maestro.mobile.dev
- **Detox**: https://wix.github.io/Detox/
- **Manifest V3**: https://developer.chrome.com/docs/extensions/mv3/
- **WebExtension**: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions

---

## Conclusion

This migration to Expo will transform Arkade Wallet from a PWA-only application to a truly universal platform. The architecture prioritizes:

1. **Code Reuse**: 70-85% shared code across platforms
2. **Platform Native Feel**: Each platform gets optimized UX
3. **Maintainability**: Clean separation of concerns
4. **Extensibility**: Easy to add new platforms or features
5. **Performance**: Native performance where it matters

The key challenges are:
- Service Worker → Universal wallet architecture
- Ionic React → React Native components
- Browser APIs → Platform abstraction

With proper planning and execution, this migration will position Arkade Wallet as a best-in-class multi-platform Bitcoin wallet with ARK protocol support.

**Estimated Timeline**: 30 weeks (7.5 months)
**Estimated Effort**: 35 engineer-weeks

Let's build the future of Bitcoin wallets! 🚀
