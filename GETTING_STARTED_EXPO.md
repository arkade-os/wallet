# Getting Started with Expo Migration

> **Simple approach**: Reuse all JS/business logic, only migrate UI components

## Overview

Since @arkade-os/sdk works in Expo out of the box, we can:
- ✅ Keep all business logic (`lib/`, `providers/`)
- ✅ Keep all state management (React Context)
- 🔄 Only migrate UI (Ionic → React Native)

**Timeline**: 6-8 weeks | **Effort**: ~92 hours (~2.3 weeks FTE)

---

## Phase 1: Setup Expo (Week 1)

### Step 1: Create Expo App

```bash
# Create new Expo app
npx create-expo-app@latest arkade-native --template blank-typescript

cd arkade-native
```

### Step 2: Install Dependencies

```bash
# Core dependencies
npm install expo-router expo-constants

# Platform APIs
npm install expo-camera expo-clipboard expo-local-authentication
npm install expo-secure-store expo-sharing
npm install @react-native-async-storage/async-storage

# UI libraries
npm install react-native-svg react-native-qrcode-svg
npm install react-native-webview
npm install @expo/react-native-action-sheet
npm install react-native-toast-notifications

# Styling (optional but recommended)
npm install nativewind
npm install --save-dev tailwindcss

# Existing wallet dependencies
npm install @arkade-os/sdk@0.3.10
npm install @arkade-os/boltz-swap@0.2.16
npm install @noble/curves @noble/hashes
npm install @scure/bip32 @scure/bip39 @scure/btc-signer
npm install nostr-tools light-bolt11-decoder
npm install decimal.js dompurify
```

### Step 3: Configure Expo Router

```json
// app.json
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
      "bundleIdentifier": "com.arkade.wallet"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#000000"
      },
      "package": "com.arkade.wallet"
    },
    "web": {
      "bundler": "metro",
      "favicon": "./assets/favicon.png"
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
    "scheme": "arkade"
  }
}
```

### Step 4: Set Up Directory Structure

```bash
mkdir -p app
mkdir -p src/{lib,providers,components,screens,icons}
```

### Step 5: Configure Expo Router

```typescript
// app/_layout.tsx
import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(modals)" options={{ presentation: 'modal' }} />
      </Stack>
    </SafeAreaProvider>
  )
}
```

```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router'

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          // tabBarIcon: ...
        }}
      />
      <Tabs.Screen
        name="apps"
        options={{
          title: 'Apps',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
        }}
      />
    </Tabs>
  )
}
```

### Step 6: Copy Non-UI Code

```bash
# Copy all business logic (no changes needed!)
cp -r ../wallet/src/lib ./src/
cp -r ../wallet/src/providers ./src/

# Copy tests
cp -r ../wallet/src/test ./src/

# Copy package version info
cp ../wallet/package.json ./package.original.json
```

### Step 7: Verify SDK Works

```typescript
// src/test-sdk.ts
import { Worker } from '@arkade-os/sdk'

async function testSDK() {
  try {
    const worker = new Worker({
      // ... config
    })
    console.log('✅ SDK works in Expo!')
  } catch (error) {
    console.error('❌ SDK error:', error)
  }
}

testSDK()
```

---

## Phase 2: Build Component Library (Week 2-3)

### Step 1: Create Base Components

```bash
# Create base component structure
mkdir -p src/components/primitives
```

**Button Component** (`src/components/primitives/Button.tsx`):

```typescript
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native'
import { ReactNode } from 'react'

interface ButtonProps {
  children: ReactNode
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'small' | 'medium' | 'large'
  fullWidth?: boolean
  disabled?: boolean
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
  style,
  textStyle,
}: ButtonProps) => {
  return (
    <Pressable
      style={[
        styles.button,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.text, styles[`${variant}Text`], textStyle]}>
        {children}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Variants
  primary: {
    backgroundColor: '#007AFF',
  },
  secondary: {
    backgroundColor: '#5856D6',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  // Sizes
  small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  medium: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  large: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  // Text styles
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: '#FFFFFF',
  },
  outlineText: {
    color: '#007AFF',
  },
  ghostText: {
    color: '#007AFF',
  },
})
```

**TextInput Component** (`src/components/primitives/Input.tsx`):

```typescript
import { TextInput as RNTextInput, StyleSheet, View, Text } from 'react-native'

interface InputProps {
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  label?: string
  error?: string
  secureTextEntry?: boolean
  keyboardType?: 'default' | 'numeric' | 'email-address'
  disabled?: boolean
}

export const Input = ({
  value,
  onChangeText,
  placeholder,
  label,
  error,
  secureTextEntry,
  keyboardType = 'default',
  disabled,
}: InputProps) => {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <RNTextInput
        style={[styles.input, error && styles.inputError, disabled && styles.disabled]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        editable={!disabled}
        placeholderTextColor="#999"
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#FFF',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  error: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
  },
  disabled: {
    opacity: 0.5,
    backgroundColor: '#F5F5F5',
  },
})
```

Create similar components for:
- Text (Typography)
- Card
- Modal
- Screen (wrapper with SafeAreaView)
- ScrollView wrapper
- More...

---

## Phase 3: Automated Migration (Week 4-6)

### Step 1: Set Up Migration Tool

```bash
cd tools
npm install

# Set your API key
export ANTHROPIC_API_KEY="your_api_key_here"
```

### Step 2: Run Migration

```bash
# Test with a single component first
npm run migrate ../src/components/Button.tsx

# Review the output in ./migrated/

# If looks good, migrate all components
npm run migrate:components

# Then migrate all screens
npm run migrate:screens
```

### Step 3: Copy Migrated Files

```bash
# Review migrated files
ls -la tools/migrated/

# Copy to Expo app
cp -r tools/migrated/components ../arkade-native/src/
cp -r tools/migrated/screens ../arkade-native/src/
```

### Step 4: Manual Review & Fixes

For each migrated file:
1. Check TypeScript errors: `npm run typecheck`
2. Test component renders: `npm run ios` or `npm run android`
3. Fix any issues manually
4. Test user interactions work

### Step 5: Convert Icons

```bash
# Install SVGR
npm install --save-dev @svgr/cli

# Convert SVG icons
npx @svgr/cli --native --typescript ../wallet/src/icons --out-dir src/icons
```

---

## Testing

### Unit Tests

```bash
npm install --save-dev jest @testing-library/react-native
```

```typescript
// src/components/__tests__/Button.test.tsx
import { render, fireEvent } from '@testing-library/react-native'
import { Button } from '../primitives/Button'

describe('Button', () => {
  it('calls onPress when pressed', () => {
    const onPress = jest.fn()
    const { getByText } = render(
      <Button onPress={onPress}>Click Me</Button>
    )

    fireEvent.press(getByText('Click Me'))
    expect(onPress).toHaveBeenCalled()
  })
})
```

### E2E Tests

```bash
# Install Maestro
curl -Ls https://get.maestro.mobile.dev | bash

# Create test flow
# .maestro/wallet-flow.yaml
appId: com.arkade.wallet
---
- launchApp
- tapOn: "Wallet"
- assertVisible: "Balance"
- tapOn: "Send"
- inputText: "0.001"
- tapOn: "Continue"
```

```bash
# Run tests
maestro test .maestro/wallet-flow.yaml
```

---

## Running the App

### Development

```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Web
npm run web
```

### Production Build

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure
eas build:configure

# Build iOS
eas build --platform ios

# Build Android
eas build --platform android
```

---

## Deployment

### TestFlight (iOS)

```bash
eas submit --platform ios
```

### Google Play (Android)

```bash
eas submit --platform android
```

### Web (PWA)

```bash
npm run build:web
# Deploy to hosting (Vercel, Netlify, etc.)
```

---

## Migration Checklist

### Phase 1: Setup ✅
- [ ] Create Expo app
- [ ] Install dependencies
- [ ] Configure Expo Router
- [ ] Copy lib/ and providers/
- [ ] Verify SDK works

### Phase 2: Components ✅
- [ ] Create base components (Button, Input, Text, etc.)
- [ ] Create layout components (Screen, Card, etc.)
- [ ] Create wallet components (Balance, Transaction, etc.)
- [ ] Set up theme/design tokens

### Phase 3: Migration ✅
- [ ] Set up migration tool
- [ ] Migrate all components (57 files)
- [ ] Migrate all screens (45 files)
- [ ] Convert icons (60 files)
- [ ] Manual review and fixes

### Phase 4: Testing ✅
- [ ] Unit tests for components
- [ ] E2E tests for main flows
- [ ] Test on iOS simulator
- [ ] Test on Android emulator
- [ ] Test on real devices

### Phase 5: Polish ✅
- [ ] Animations (react-native-reanimated)
- [ ] Haptics feedback
- [ ] Loading states
- [ ] Error handling
- [ ] Performance optimization

### Phase 6: Launch ✅
- [ ] TestFlight beta
- [ ] Google Play beta
- [ ] User feedback
- [ ] Bug fixes
- [ ] Production release

---

## Timeline

| Week | Tasks | Hours |
|------|-------|-------|
| 1 | Setup Expo, copy code | 8h |
| 2-3 | Build component library | 32h |
| 4-5 | Automated migration + review | 36h |
| 6 | Testing & polish | 16h |
| **Total** | | **92h (~2.3 weeks FTE)** |

---

## Success Metrics

- ✅ All screens render correctly
- ✅ All business logic works unchanged
- ✅ App runs on iOS and Android
- ✅ Performance is smooth (60fps)
- ✅ All user flows work
- ✅ Tests pass

---

## Next Steps

1. **This Week**: Set up Expo app, copy non-UI code
2. **Next Week**: Build component library
3. **Week 3**: Start automated migration
4. **Week 4**: Complete migration, testing
5. **Week 5**: Polish and beta release

---

## Questions?

- Check the [migration tool README](./tools/README.md)
- Review the [simple migration plan](./EXPO_UI_MIGRATION_SIMPLE.md)
- Open an issue if you need help

**Let's ship Arkade Wallet on mobile! 🚀**
