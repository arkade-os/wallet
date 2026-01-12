# Claude Code Agent Prompt: Expo Migration

## Mission

Migrate Arkade Wallet from Ionic React PWA to Expo (React Native) for iOS, Android, and Web support. Use the **simplified approach** since @arkade-os/sdk works in Expo out of the box.

## Context

**Current State**: 19,559 lines TypeScript, Ionic React PWA with:
- Business logic: `src/lib/*` (35+ utility modules)
- State: `src/providers/*` (13 React Context providers)
- UI: `src/components/*` (57 components) + `src/screens/*` (45 screens)
- Icons: `src/icons/*` (60+ SVG components)
- SDK: @arkade-os/sdk 0.3.10 (works in Expo!)

**Key Insight**: Since the SDK works in Expo, we **only need to migrate the UI layer**. All business logic can be reused as-is.

**Timeline**: 6-8 weeks | **Effort**: ~92 hours

## Strategy

### ✅ Keep As-Is (No Changes)
- `src/lib/*` - All utilities (format, bitcoin, validation, crypto, etc.)
- `src/providers/*` - All React Context providers (state management)
- All business logic, hooks, and data fetching
- @arkade-os/sdk integration

### 🔄 Migrate Only
- `src/components/*` → React Native components
- `src/screens/*` → React Native screens
- `src/icons/*` → react-native-svg components
- Navigation → Expo Router (file-based)

## Phase 1: Setup Expo App

### Step 1.1: Create Expo App

```bash
# Create new Expo app with TypeScript template
npx create-expo-app@latest arkade-native --template blank-typescript

cd arkade-native
```

### Step 1.2: Install Core Dependencies

```bash
# Expo essentials
npm install expo-router@~4.0.0 expo-constants@~17.0.0

# Platform APIs (matching current PWA capabilities)
npm install expo-camera@~16.0.0
npm install expo-clipboard@~7.0.0
npm install expo-local-authentication@~15.0.0
npm install expo-secure-store@~14.0.0
npm install expo-sharing@~13.0.0
npm install expo-crypto@~14.0.0
npm install @react-native-async-storage/async-storage@2.1.0

# UI libraries
npm install react-native-svg@15.8.0
npm install react-native-qrcode-svg@6.3.11
npm install react-native-webview@13.12.0
npm install @expo/react-native-action-sheet@4.2.0
npm install react-native-toast-notifications@3.4.0

# Styling (optional but recommended for rapid development)
npm install nativewind@^4.0.0
npm install --save-dev tailwindcss@^3.4.0

# Wallet dependencies (same as current PWA)
npm install @arkade-os/sdk@0.3.10
npm install @arkade-os/boltz-swap@0.2.16
npm install @lendasat/lendasat-wallet-bridge@0.0.90

# Crypto libraries (pure JS, work everywhere)
npm install @noble/curves@1.7.0
npm install @noble/hashes@1.6.1
npm install @scure/bip32@1.6.0
npm install @scure/bip39@1.5.0
npm install @scure/btc-signer@1.4.0

# Bitcoin & Lightning
npm install nostr-tools@2.12.0
npm install light-bolt11-decoder@4.0.0

# Utilities
npm install decimal.js@10.5.0
npm install dompurify@3.2.6

# Monitoring
npm install @sentry/react-native@6.1.0

# Development
npm install --save-dev @types/react-native
npm install --save-dev @testing-library/react-native
npm install --save-dev jest
```

### Step 1.3: Configure Expo

**Update `app.json`:**

```json
{
  "expo": {
    "name": "Arkade Wallet",
    "slug": "arkade-wallet",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#000000"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.arkade.wallet",
      "infoPlist": {
        "NSCameraUsageDescription": "Allow Arkade Wallet to access your camera to scan QR codes.",
        "NSFaceIDUsageDescription": "Allow Arkade Wallet to use Face ID for secure authentication."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#000000"
      },
      "package": "com.arkade.wallet",
      "permissions": [
        "CAMERA",
        "USE_BIOMETRIC",
        "USE_FINGERPRINT"
      ]
    },
    "web": {
      "bundler": "metro",
      "favicon": "./assets/favicon.png",
      "output": "static"
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      [
        "expo-camera",
        {
          "cameraPermission": "Allow Arkade Wallet to access your camera to scan QR codes."
        }
      ],
      [
        "expo-local-authentication",
        {
          "faceIDPermission": "Allow Arkade Wallet to use Face ID for secure authentication."
        }
      ]
    ],
    "scheme": "arkade",
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

### Step 1.4: Set Up Directory Structure

```bash
mkdir -p src/{lib,providers,components,screens,icons,hooks,types}
mkdir -p app/{(tabs),(modals),(onboarding)}
```

### Step 1.5: Copy Business Logic (No Changes!)

```bash
# Copy all non-UI code from current PWA
cp -r ../wallet/src/lib ./src/
cp -r ../wallet/src/providers ./src/

# Copy types and utilities
cp -r ../wallet/src/test ./src/ 2>/dev/null || true

# Create index files for clean imports
echo "export * from './lib'" > src/lib/index.ts
echo "export * from './providers'" > src/providers/index.ts
```

### Step 1.6: Configure TypeScript

**Update `tsconfig.json`:**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/providers/*": ["./src/providers/*"],
      "@/components/*": ["./src/components/*"],
      "@/screens/*": ["./src/screens/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

### Step 1.7: Set Up Expo Router

**Create `app/_layout.tsx`:**

```typescript
import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ActionSheetProvider } from '@expo/react-native-action-sheet'
import { ToastProvider } from 'react-native-toast-notifications'

// Import all context providers (reused from PWA!)
import {
  NavigationProvider,
  ConfigProvider,
  WalletProvider,
  // ... all other providers
} from '@/providers'

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <ActionSheetProvider>
          {/* Wrap with all Context providers (same as PWA!) */}
          <NavigationProvider>
            <ConfigProvider>
              <WalletProvider>
                {/* ... nest all 13 providers ... */}
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen
                    name="(modals)"
                    options={{ presentation: 'modal' }}
                  />
                  <Stack.Screen
                    name="(onboarding)"
                    options={{ headerShown: false }}
                  />
                </Stack>
                {/* ... close all providers ... */}
              </WalletProvider>
            </ConfigProvider>
          </NavigationProvider>
        </ActionSheetProvider>
      </ToastProvider>
    </SafeAreaProvider>
  )
}
```

**Create `app/(tabs)/_layout.tsx`:**

```typescript
import { Tabs } from 'expo-router'
import { WalletIcon, AppsIcon, SettingsIcon } from '@/icons'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopColor: '#333',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color, size }) => (
            <WalletIcon width={size} height={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="apps"
        options={{
          title: 'Apps',
          tabBarIcon: ({ color, size }) => (
            <AppsIcon width={size} height={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <SettingsIcon width={size} height={size} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
```

## Phase 2: Build Base Component Library

### Step 2.1: Create Design Tokens

**Create `src/theme/tokens.ts`:**

```typescript
export const colors = {
  // Primary
  primary: '#007AFF',
  primaryDark: '#0051D5',

  // Background
  background: '#000000',
  backgroundSecondary: '#1C1C1E',

  // Text
  text: '#FFFFFF',
  textSecondary: '#999999',

  // Border
  border: '#333333',

  // Status
  success: '#34C759',
  error: '#FF3B30',
  warning: '#FF9500',

  // Bitcoin
  bitcoin: '#F7931A',
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
}

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 16,
  full: 9999,
}

export const typography = {
  h1: { fontSize: 32, fontWeight: '700' as const },
  h2: { fontSize: 24, fontWeight: '600' as const },
  h3: { fontSize: 20, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  bodyBold: { fontSize: 16, fontWeight: '600' as const },
  caption: { fontSize: 14, fontWeight: '400' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
}
```

### Step 2.2: Create Base Components

**Button** (`src/components/primitives/Button.tsx`):

```typescript
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native'
import { ReactNode } from 'react'
import { colors, spacing, borderRadius } from '@/theme/tokens'

interface ButtonProps {
  children: ReactNode
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'small' | 'medium' | 'large'
  fullWidth?: boolean
  disabled?: boolean
  loading?: boolean
  style?: ViewStyle
  textStyle?: TextStyle
}

export const Button = ({
  children,
  onPress,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  disabled = false,
  loading = false,
  style,
  textStyle,
}: ButtonProps) => {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? colors.primary : '#fff'} />
      ) : (
        <Text style={[styles.text, styles[`${variant}Text`], textStyle]}>
          {children}
        </Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.backgroundSecondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  small: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  medium: {
    paddingVertical: spacing.md - 4,
    paddingHorizontal: spacing.lg,
  },
  large: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryText: {
    color: colors.text,
  },
  secondaryText: {
    color: colors.text,
  },
  outlineText: {
    color: colors.text,
  },
  ghostText: {
    color: colors.primary,
  },
})
```

**Input** (`src/components/primitives/Input.tsx`):

```typescript
import {
  TextInput as RNTextInput,
  StyleSheet,
  View,
  Text,
  TextInputProps as RNTextInputProps
} from 'react-native'
import { colors, spacing, borderRadius } from '@/theme/tokens'

interface InputProps extends RNTextInputProps {
  label?: string
  error?: string
  disabled?: boolean
}

export const Input = ({
  label,
  error,
  disabled,
  style,
  ...props
}: InputProps) => {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <RNTextInput
        style={[
          styles.input,
          error && styles.inputError,
          disabled && styles.disabled,
          style,
        ]}
        editable={!disabled}
        placeholderTextColor={colors.textSecondary}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.sm,
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md - 4,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    backgroundColor: colors.backgroundSecondary,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.error,
  },
  error: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
  },
  disabled: {
    opacity: 0.5,
  },
})
```

**Create similar components for:**
- `Card.tsx` - Card container
- `Screen.tsx` - Screen wrapper with SafeAreaView
- `Typography.tsx` - Text variants (H1, H2, Body, Caption)

### Step 2.3: Create Wallet-Specific Components

**BalanceCard** (`src/components/wallet/BalanceCard.tsx`):

```typescript
import { View, Text, StyleSheet } from 'react-native'
import { Card } from '@/components/primitives/Card'
import { formatBitcoin } from '@/lib/format' // Reused from PWA!
import { colors, spacing } from '@/theme/tokens'

interface BalanceCardProps {
  balance: number
  fiatValue?: number
  currency?: string
}

export const BalanceCard = ({ balance, fiatValue, currency = 'USD' }: BalanceCardProps) => {
  return (
    <Card style={styles.card}>
      <Text style={styles.label}>Total Balance</Text>
      <Text style={styles.balance}>{formatBitcoin(balance)} BTC</Text>
      {fiatValue !== undefined && (
        <Text style={styles.fiat}>
          ≈ ${fiatValue.toFixed(2)} {currency}
        </Text>
      )}
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  balance: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  fiat: {
    fontSize: 16,
    color: colors.textSecondary,
  },
})
```

**Create additional wallet components:**
- `TransactionList.tsx`
- `TransactionItem.tsx`
- `AddressDisplay.tsx`
- `QRCodeDisplay.tsx` (using react-native-qrcode-svg)
- `AmountInput.tsx`

## Phase 3: Automated Component Migration

### Step 3.1: Set Up Migration Tool

```bash
cd ../wallet/tools
npm install

# Set your Anthropic API key
export ANTHROPIC_API_KEY="sk-ant-..."
```

### Step 3.2: Run Automated Migration

**Important**: The migration tool preserves ALL business logic. It only converts UI.

```bash
# Migrate all components (57 files)
npm run migrate:components

# Migrate all screens (45 files)
npm run migrate:screens

# Review output
ls -la migrated/components/
ls -la migrated/screens/
```

### Step 3.3: Manual Review Process

For each migrated file:

1. **Check TypeScript errors:**
   ```bash
   cd ../arkade-native
   npx tsc --noEmit
   ```

2. **Review the conversion:**
   - Verify business logic unchanged
   - Check component mappings correct
   - Verify imports updated properly
   - Check styles look reasonable

3. **Copy to Expo app:**
   ```bash
   cp ../wallet/tools/migrated/components/Button.tsx src/components/
   # Review, test, then continue with more files
   ```

4. **Test rendering:**
   ```bash
   npm run ios  # or npm run android
   ```

### Step 3.4: Handle Special Cases

**Components requiring manual attention:**

1. **QR Scanner** - Uses camera, needs expo-camera
2. **WebView integrations** (LendaSat, LendaSwap) - Use react-native-webview
3. **Biometric auth** - Uses expo-local-authentication
4. **Action sheets** - Use @expo/react-native-action-sheet

**Example: QR Scanner**

```typescript
// src/components/QRScanner.tsx
import { Camera, CameraView } from 'expo-camera'
import { useState } from 'react'
import { StyleSheet, View, Button } from 'react-native'

export const QRScanner = ({ onScan }: { onScan: (data: string) => void }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  const requestPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync()
    setHasPermission(status === 'granted')
  }

  if (hasPermission === null) {
    return <Button title="Enable Camera" onPress={requestPermission} />
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        onBarcodeScanned={({ data }) => onScan(data)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
})
```

## Phase 4: Migrate Screens & Navigation

### Step 4.1: Create Tab Screens

**Wallet Tab** (`app/(tabs)/wallet.tsx`):

```typescript
import { ScrollView, RefreshControl, StyleSheet } from 'react-native'
import { useState } from 'react'
import { Screen } from '@/components/primitives/Screen'
import { BalanceCard } from '@/components/wallet/BalanceCard'
import { TransactionList } from '@/components/wallet/TransactionList'
import { useWallet } from '@/providers/wallet' // Reused from PWA!
import { spacing } from '@/theme/tokens'

export default function WalletScreen() {
  const { balance, transactions, refresh } = useWallet()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }

  return (
    <Screen>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <BalanceCard balance={balance} />
        <TransactionList transactions={transactions} />
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
})
```

**Apps Tab** (`app/(tabs)/apps.tsx`):
**Settings Tab** (`app/(tabs)/settings.tsx`):

### Step 4.2: Create Modal Screens

**Send Flow** (`app/(modals)/send/`):
- `form.tsx` - Amount and recipient
- `details.tsx` - Review transaction
- `success.tsx` - Transaction sent

**Example:**

```typescript
// app/(modals)/send/form.tsx
import { router } from 'expo-router'
import { Screen } from '@/components/primitives/Screen'
import { Button } from '@/components/primitives/Button'
import { AmountInput } from '@/components/wallet/AmountInput'
import { useFlow } from '@/providers/flow' // Reused from PWA!

export default function SendFormScreen() {
  const { amount, setAmount, recipient, setRecipient } = useFlow()

  const handleContinue = () => {
    router.push('/send/details')
  }

  return (
    <Screen>
      <AmountInput value={amount} onChange={setAmount} />
      <Input
        label="Recipient"
        value={recipient}
        onChangeText={setRecipient}
      />
      <Button onPress={handleContinue}>Continue</Button>
    </Screen>
  )
}
```

### Step 4.3: Convert Icons

```bash
# Install SVGR for batch conversion
npm install --save-dev @svgr/cli

# Convert all SVG icons to React Native
npx @svgr/cli --native --typescript \
  ../wallet/src/icons \
  --out-dir src/icons

# This creates react-native-svg components
```

## Phase 5: Testing & Polish

### Step 5.1: Unit Tests

```typescript
// src/components/__tests__/Button.test.tsx
import { render, fireEvent } from '@testing-library/react-native'
import { Button } from '@/components/primitives/Button'

describe('Button', () => {
  it('calls onPress when pressed', () => {
    const onPress = jest.fn()
    const { getByText } = render(
      <Button onPress={onPress}>Send</Button>
    )

    fireEvent.press(getByText('Send'))
    expect(onPress).toHaveBeenCalled()
  })

  it('shows loading state', () => {
    const { getByTestId } = render(
      <Button onPress={() => {}} loading>Send</Button>
    )

    expect(getByTestId('activity-indicator')).toBeTruthy()
  })
})
```

### Step 5.2: E2E Tests with Maestro

```yaml
# .maestro/send-flow.yaml
appId: com.arkade.wallet
---
- launchApp
- tapOn: "Wallet"
- assertVisible: "Total Balance"
- tapOn: "Send"
- inputText: "0.001"
- tapOn: "Continue"
- assertVisible: "Review Transaction"
- tapOn: "Confirm"
- assertVisible: "Transaction Sent"
```

**Run tests:**

```bash
# Install Maestro
curl -Ls https://get.maestro.mobile.dev | bash

# Run test
maestro test .maestro/send-flow.yaml
```

### Step 5.3: Platform Testing

```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Web
npm run web
```

**Test on real devices:**
- Install Expo Go app
- Scan QR code from terminal
- Test all flows

## Phase 6: Production Build & Deployment

### Step 6.1: Configure EAS

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure build
eas build:configure
```

### Step 6.2: Build Apps

```bash
# iOS build
eas build --platform ios --profile production

# Android build
eas build --platform android --profile production

# Both platforms
eas build --platform all --profile production
```

### Step 6.3: Submit to Stores

```bash
# iOS (TestFlight then App Store)
eas submit --platform ios

# Android (Internal testing then Production)
eas submit --platform android
```

### Step 6.4: Deploy Web

```bash
# Build web version
npm run build:web

# Output is in dist/
# Deploy to Vercel, Netlify, or your hosting
```

## Success Criteria

- [ ] All screens render correctly on iOS, Android, and Web
- [ ] All business logic works unchanged (lib/, providers/)
- [ ] Navigation flows work with Expo Router
- [ ] Biometric authentication works
- [ ] QR scanning works
- [ ] Camera permissions handled properly
- [ ] Send/receive flows work end-to-end
- [ ] App integrations (LendaSat, Boltz) work in WebView
- [ ] Performance is smooth (60fps)
- [ ] All unit tests pass
- [ ] E2E tests pass
- [ ] Builds successfully for iOS, Android, and Web
- [ ] Submitted to TestFlight and Google Play for beta

## Execution Plan

### Week 1: Setup
- [ ] Create Expo app
- [ ] Install dependencies
- [ ] Copy lib/ and providers/
- [ ] Configure Expo Router
- [ ] Verify SDK works

### Week 2: Components
- [ ] Create design tokens
- [ ] Build base components (Button, Input, Text, Card)
- [ ] Build wallet components (BalanceCard, TransactionList)
- [ ] Create Screen and layout components

### Week 3: Migration
- [ ] Set up migration tool
- [ ] Run automated migration on components
- [ ] Review and copy migrated components
- [ ] Fix TypeScript errors

### Week 4: Screens
- [ ] Run automated migration on screens
- [ ] Create tab screens (Wallet, Apps, Settings)
- [ ] Create modal screens (Send, Receive)
- [ ] Convert icons to react-native-svg

### Week 5: Testing
- [ ] Write unit tests for components
- [ ] Create E2E tests with Maestro
- [ ] Test on iOS simulator
- [ ] Test on Android emulator
- [ ] Test on real devices

### Week 6: Polish
- [ ] Add animations (react-native-reanimated)
- [ ] Add haptic feedback
- [ ] Improve loading states
- [ ] Error handling
- [ ] Performance optimization

### Week 7: Beta
- [ ] Configure EAS
- [ ] Build iOS and Android
- [ ] Submit to TestFlight
- [ ] Submit to Google Play Internal Testing
- [ ] Invite beta testers

### Week 8: Launch
- [ ] Gather feedback
- [ ] Fix critical bugs
- [ ] Performance improvements
- [ ] Submit for App Store review
- [ ] Submit for Google Play production

## Key Files Reference

- **Simple Migration Plan**: `/home/user/wallet/EXPO_UI_MIGRATION_SIMPLE.md`
- **Getting Started Guide**: `/home/user/wallet/GETTING_STARTED_EXPO.md`
- **Migration Tool**: `/home/user/wallet/tools/migrate-component.ts`
- **Tool README**: `/home/user/wallet/tools/README.md`
- **Comparison**: `/home/user/wallet/MIGRATION_COMPARISON.md`

## Important Notes

1. **SDK Works**: @arkade-os/sdk works in Expo, confirmed by other teams
2. **Reuse Everything**: All business logic (lib/, providers/) works as-is
3. **Only UI Changes**: Focus migration on Ionic → React Native UI
4. **Automated Tool**: Use LLM-powered tool to save 30+ hours
5. **Incremental**: Migrate and test one screen at a time
6. **Low Risk**: Can always fall back to PWA if needed

## Estimated Timeline

- **Setup**: 1 week
- **Components**: 2 weeks
- **Migration**: 2 weeks
- **Testing**: 1 week
- **Polish**: 1 week
- **Beta**: 1 week

**Total**: 8 weeks to production-ready app

## Go!

Execute this plan step-by-step. Start with Phase 1 (Setup), verify SDK works, then proceed to Phase 2 (Components), and use the automated migration tool in Phase 3 to speed up the conversion.

**Remember**: All business logic stays the same. Only UI changes. This is why it's fast!
