# Expo Migration - Quick Start Guide

## TL;DR

Migrate Arkade Wallet from PWA → Universal codebase (iOS + Android + Web + Browser Extension)

**Timeline**: 30 weeks | **Effort**: 35 eng-weeks | **Code Reuse**: 70-85%

---

## Architecture Overview

### Current (PWA Only)
```
Ionic React + Vite
    ↓
Service Worker (@arkade-os/sdk)
    ↓
IndexedDB
```

### Target (Universal)
```
┌─────────────────────────────────────────────────────────┐
│                      Platforms                          │
│  iOS  │  Android  │  Web (PWA)  │  Browser Extension   │
└───┬───────┬──────────┬──────────────────┬──────────────┘
    │       │          │                  │
    └───────┴──────────┴──────────────────┘
              │
        Expo Router
              │
    ┌─────────┴─────────┐
    │   @arkade/ui      │  React Native Components
    └─────────┬─────────┘
    ┌─────────┴─────────┐
    │  @arkade/state    │  React Context Providers
    └─────────┬─────────┘
    ┌─────────┴─────────┐
    │ @arkade/platform  │  Platform Abstraction Layer
    └─────────┬─────────┘
    ┌─────────┴─────────┐
    │  @arkade/core     │  Business Logic
    └─────────┬─────────┘
    ┌─────────┴─────────┐
    │  @arkade/utils    │  Pure Utilities
    └───────────────────┘
```

---

## Monorepo Structure

```
arkade-wallet/
├── apps/
│   ├── native/          # Expo (iOS + Android + Web)
│   ├── extension/       # Browser Extension
│   └── web-legacy/      # Current PWA (deprecate in Phase 6)
│
└── packages/
    ├── core/            # Business logic (wallet, ARK, lightning)
    ├── state/           # React Context providers
    ├── platform/        # Platform abstraction (storage, crypto, camera)
    ├── ui/              # React Native components
    └── utils/           # Pure utilities
```

---

## Code Sharing Matrix

| Package | Native | Extension | Web | Notes |
|---------|--------|-----------|-----|-------|
| @arkade/core | 100% | 100% | 100% | Pure business logic |
| @arkade/state | 100% | 90% | 100% | React contexts |
| @arkade/platform | 90% | 80% | 90% | Platform adapters |
| @arkade/ui | 100% | 50% | 100% | RN components |
| @arkade/utils | 100% | 100% | 100% | Pure functions |
| **Total** | **95%** | **85%** | **95%** | Overall sharing |

---

## Key Challenges & Solutions

### 🔴 Challenge 1: Service Worker Dependency
**Problem**: @arkade-os/sdk runs in Service Worker (not available in React Native)

**Solutions**:
- **Option A** (Preferred): Work with ARK team to make SDK universal
- **Option B**: Fork SDK for native (use WorkerThreads + SQLite)
- **Option C**: Refactor wallet logic out of SDK

**Decision Needed**: Week 1

---

### 🔴 Challenge 2: Ionic React → React Native
**Problem**: 26+ files deeply coupled to Ionic components

**Solution**: Build universal component library
- **Styling**: NativeWind (Tailwind for RN) → migrate to Tamagui later
- **Components**: Create primitives that work on web + native
- **Phase 2**: 4 weeks to build component library

---

### 🟡 Challenge 3: Browser APIs → Platform APIs
**Problem**: Web APIs don't exist in React Native

**Solution**: Platform Abstraction Layer

| Web API | React Native | Extension | Abstraction |
|---------|--------------|-----------|-------------|
| localStorage | AsyncStorage | chrome.storage | StorageAPI |
| IndexedDB | expo-sqlite | IndexedDB | DatabaseAPI |
| crypto.subtle | quick-crypto | crypto.subtle | CryptoAPI |
| getUserMedia | expo-camera | mediaDevices | CameraAPI |
| navigator.clipboard | expo-clipboard | clipboard | ClipboardAPI |
| WebAuthn | expo-local-auth | WebAuthn | BiometricsAPI |

---

### 🟡 Challenge 4: Navigation
**Problem**: Custom enum-based navigation (60 pages)

**Solution**: Migrate to Expo Router (file-based)

**Before**:
```typescript
navigate(Pages.SendForm, { amount: 1000 })
```

**After**:
```typescript
router.push('/send/form?amount=1000')
```

---

### 🟡 Challenge 5: iframe Apps (LendaSat, LendaSwap)
**Problem**: iframe + postMessage (no iframe in React Native)

**Solution**: Use react-native-webview with message bridge

```typescript
// Web
<iframe src={url} />

// Native
<WebView
  source={{ uri: url }}
  onMessage={(event) => handleMessage(event.nativeEvent.data)}
/>
```

---

## Migration Phases

### Phase 0: Preparation (Week 1-2)
- Set up monorepo (pnpm workspaces)
- Initialize Expo app
- Configure TypeScript
- Set up build pipeline

**Deliverables**: Monorepo structure, Expo app initialized

---

### Phase 1: Core Logic (Week 3-6)
- Extract utils → @arkade/utils
- Extract business logic → @arkade/core
- Build platform abstraction → @arkade/platform
- Migrate providers → @arkade/state

**Deliverables**: All @arkade/* packages working

---

### Phase 2: UI Library (Week 7-10)
- Choose styling (NativeWind)
- Build primitive components (Button, Input, Text, etc.)
- Build wallet components (BalanceCard, TransactionList, etc.)
- Convert icons to react-native-svg

**Deliverables**: @arkade/ui with 45+ components

---

### Phase 3: Mobile App (Week 11-18)
- Set up Expo Router
- Implement screens (30+ screens)
- Implement onboarding flow
- Integrate native features (camera, biometrics, etc.)
- Testing (Detox/Maestro)

**Deliverables**: Fully functional iOS + Android apps

---

### Phase 4: Expo Web (Week 19-21)
- Enable Expo Web
- Configure PWA (service worker, manifest)
- Test web compatibility
- Optimize bundle size

**Deliverables**: PWA on Expo Web

---

### Phase 5: Browser Extension (Week 22-26)
- Set up extension project (Manifest V3)
- Build background service worker
- Build content scripts
- Build popup UI
- Implement provider API for dApps

**Deliverables**: Chrome/Firefox/Edge extension

---

### Phase 6: Migration (Week 27-30)
- User migration from old PWA
- Monitoring (Sentry)
- Bug fixes
- Deprecate old PWA

**Deliverables**: All platforms live, old PWA deprecated

---

## Technology Stack

### Current
- React 18.3.1 + TypeScript 5.8.3
- Ionic React 8.5.6
- Vite 7.1.3
- @arkade-os/sdk 0.3.10

### Target

#### Expo Native
```json
{
  "expo": "~52.0.0",
  "expo-router": "~4.0.0",
  "react-native": "0.76.0",
  "react-native-svg": "15.8.0",
  "react-native-webview": "13.12.0",
  "expo-camera": "~16.0.0",
  "expo-clipboard": "~7.0.0",
  "expo-local-authentication": "~15.0.0",
  "react-native-quick-crypto": "0.7.5",
  "nativewind": "^4.0.0"
}
```

#### Extension
```json
{
  "webpack": "^5.94.0",
  "webextension-polyfill": "^0.12.0"
}
```

---

## First Sprint Tasks (Week 1-2)

### Week 1: Monorepo Setup

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

3. **TypeScript Configuration**
   - Create `tsconfig.base.json`
   - Set up path aliases
   - Configure project references

4. **Initialize Expo**
   ```bash
   cd apps/native
   npx create-expo-app@latest . --template blank-typescript
   ```

5. **Build Pipeline**
   - Set up Turborepo or Nx
   - Configure ESLint + Prettier
   - Set up CI/CD (GitHub Actions)

### Week 2: Proof of Concept

1. **Platform Abstraction Spike**
   - Build StorageAPI with 3 implementations
   - Test on web, native, and extension

2. **Component Library Spike**
   - Set up NativeWind
   - Build 3 components (Button, Input, Text)
   - Test on web and native

3. **SDK Strategy Decision**
   - Contact ARK team
   - Evaluate SDK refactor options
   - Document chosen approach

4. **Documentation**
   - Review plan with team
   - Get feedback
   - Break down Phase 1 into tasks

---

## Critical Decisions Needed

### 1. Service Worker Strategy (Week 1) 🔴
- [ ] Contact ARK team about SDK universalization
- [ ] Evaluate fork vs refactor effort
- [ ] Choose path forward
- [ ] Document decision

### 2. Styling Framework (Week 7) 🟡
- [ ] Test NativeWind setup
- [ ] Evaluate Tamagui
- [ ] Choose approach
- [ ] Document decision

### 3. State Management (Week 11) 🟢
- [ ] Keep Context API or migrate to Zustand?
- [ ] Document decision

### 4. Testing Framework (Week 18) 🟡
- [ ] Try Maestro vs Detox
- [ ] Choose E2E framework
- [ ] Document decision

---

## Risk Mitigation

### Critical Risks
1. **Service Worker Dependency** → Decide strategy in Week 1
2. **IndexedDB on Native** → Use expo-sqlite, test early
3. **Ionic Coupling** → Build component library incrementally
4. **iframe Apps** → Test WebView early, create adapter

### Buffer Time
- Built-in 20% buffer in timeline
- Extra 4-8 weeks if SDK refactor needed

---

## Success Metrics

### Technical
- **Code Sharing**: 70-80%
- **Bundle Size**: iOS < 30MB, Android < 25MB, Web < 2MB
- **Performance**: Launch < 2s, transitions < 300ms
- **Test Coverage**: Core 90%+, State 80%+

### User
- **Adoption**: 50% PWA users migrate in 3 months
- **Crash Rate**: < 0.5%
- **Rating**: 4.5+ stars
- **Feature Parity**: 100% by Phase 6

---

## Resources

- **Full Plan**: [`EXPO_MIGRATION_PLAN.md`](./EXPO_MIGRATION_PLAN.md)
- **Expo Docs**: https://docs.expo.dev
- **Expo Router**: https://docs.expo.dev/router/introduction/
- **NativeWind**: https://www.nativewind.dev
- **Tamagui**: https://tamagui.dev
- **Maestro**: https://maestro.mobile.dev

---

## Next Steps

1. **This Week**:
   - Review this plan with team
   - Make Service Worker strategy decision
   - Set up monorepo structure
   - Initialize Expo app

2. **Next Week**:
   - Build platform abstraction POC
   - Build component library POC
   - Finalize Phase 1 task breakdown
   - Start extracting @arkade/utils

3. **By End of Month**:
   - Complete Phase 0 + 1
   - All @arkade/* packages working
   - Ready to start UI library

---

**Questions?** Review the full migration plan for detailed technical specifications.
