# Expo UI Migration - Simplified Approach

## TL;DR

Since @arkade-os/sdk works in Expo out of the box, we can:
- ✅ **Keep all business logic** (lib/, providers/, etc.) - no changes needed
- ✅ **Keep state management** - React Context works in React Native
- ✅ **Keep utilities** - All pure JS code works as-is
- 🔄 **Only migrate UI** - Convert Ionic React → React Native components

**Timeline**: 6-8 weeks (not 30!) | **Effort**: 8-10 eng-weeks

---

## What Actually Needs Migration?

### ✅ Keep As-Is (No Changes)
- `lib/*` - All utilities (format, bitcoin, validation, etc.)
- `providers/*` - All React Context providers
- Business logic in components (just extract it)
- State management patterns
- API calls, data fetching
- Crypto operations
- Service worker (works in Expo)

### 🔄 Need to Convert (UI Only)
- `components/*` (57 files) - Ionic → React Native
- `screens/*` (45 files) - Ionic → React Native
- `icons/*` (60 files) - SVG → react-native-svg
- `App.tsx` - IonApp → React Native App
- Navigation - Custom system → Expo Router
- CSS files → StyleSheet or NativeWind

**Total files to migrate**: ~160 UI files

---

## Simple 3-Phase Approach

### Phase 1: Setup (Week 1)
1. Initialize Expo app
2. Copy over all non-UI code (lib/, providers/)
3. Set up Expo Router
4. Install dependencies

### Phase 2: Build Component Library (Week 2-3)
5. Create React Native equivalents of Ionic components
6. Use component mapping (automated where possible)

### Phase 3: Migrate Screens (Week 4-6)
7. Convert screens one-by-one using automated tool
8. Test each screen
9. Fix edge cases

---

## Automated Migration Strategy

### Component Mapping Table

| Ionic Component | React Native Equivalent | Automated? |
|----------------|-------------------------|------------|
| `<IonButton>` | `<Pressable>` + styles | ✅ Yes |
| `<IonInput>` | `<TextInput>` | ✅ Yes |
| `<IonText>` | `<Text>` | ✅ Yes |
| `<IonContent>` | `<ScrollView>` | ✅ Yes |
| `<IonPage>` | `<View>` + SafeArea | ✅ Yes |
| `<IonModal>` | `<Modal>` | ✅ Yes |
| `<IonTabs>` | Expo Router tabs | ⚠️ Manual |
| `<IonRefresher>` | `<RefreshControl>` | ✅ Yes |
| `<IonActionSheet>` | ActionSheet library | ⚠️ Manual |
| `<IonToast>` | Toast library | ⚠️ Manual |

### Automated Conversions

```typescript
// BEFORE (Ionic)
<IonButton expand="block" onClick={handleClick}>
  Send
</IonButton>

// AFTER (React Native) - Auto-converted
<Pressable style={styles.button} onPress={handleClick}>
  <Text style={styles.buttonText}>Send</Text>
</Pressable>
```

---

## Migration Agent/Tool

### Option 1: AST-Based Code Transformer

Build a tool using:
- **@babel/parser** - Parse JSX to AST
- **@babel/traverse** - Walk the AST
- **@babel/generator** - Generate converted code

**Capabilities**:
- Convert Ionic components to React Native
- Convert `onClick` → `onPress`
- Convert `className` → `style`
- Import rewrite (ionic → react-native)
- Preserve all non-UI logic

### Option 2: LLM-Based Migration Agent

Create an AI agent that:
1. Reads each component file
2. Identifies Ionic components
3. Converts to React Native equivalents
4. Preserves all business logic
5. Writes converted file
6. Runs tests to verify

**Advantages**:
- Handles complex cases better
- Can make intelligent decisions
- Easier to iterate and improve

---

## Detailed Implementation Plan

### Week 1: Setup Expo

```bash
# 1. Create Expo app
npx create-expo-app arkade-native --template blank-typescript

# 2. Install dependencies
cd arkade-native
npm install expo-router expo-camera expo-local-authentication
npm install @react-native-async-storage/async-storage
npm install react-native-svg react-native-qrcode-svg
npm install nativewind  # For styling

# 3. Copy non-UI code
cp -r ../wallet/src/lib ./src/
cp -r ../wallet/src/providers ./src/
```

### Week 2-3: Component Library

Create base components:

```typescript
// src/components/Button.tsx
import { Pressable, Text, StyleSheet } from 'react-native'

interface ButtonProps {
  children: React.ReactNode
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'outline'
  fullWidth?: boolean
  disabled?: boolean
}

export const Button = ({
  children,
  onPress,
  variant = 'primary',
  fullWidth = false,
  disabled = false
}: ButtonProps) => {
  return (
    <Pressable
      style={[
        styles.button,
        styles[variant],
        fullWidth && styles.fullWidth,
        disabled && styles.disabled
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.text, styles[`${variant}Text`]]}>
        {children}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
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
})
```

### Week 4-6: Automated Migration

#### Migration Agent Code

```typescript
// tools/migrate-component.ts

import { readFile, writeFile } from 'fs/promises'
import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import generate from '@babel/generator'
import * as t from '@babel/types'

interface ComponentMapping {
  from: string
  to: string
  propMapping?: Record<string, string>
  styleMapping?: Record<string, any>
}

const COMPONENT_MAP: ComponentMapping[] = [
  {
    from: 'IonButton',
    to: 'Button',
    propMapping: {
      onClick: 'onPress',
      expand: 'fullWidth', // expand="block" → fullWidth={true}
    }
  },
  {
    from: 'IonInput',
    to: 'TextInput',
    propMapping: {
      value: 'value',
      onIonChange: 'onChangeText',
      placeholder: 'placeholder',
    }
  },
  {
    from: 'IonText',
    to: 'Text',
  },
  {
    from: 'IonContent',
    to: 'ScrollView',
  },
  // Add more mappings...
]

export async function migrateComponent(filePath: string): Promise<string> {
  const code = await readFile(filePath, 'utf-8')

  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  })

  traverse(ast, {
    // Convert imports
    ImportDeclaration(path) {
      if (path.node.source.value === '@ionic/react') {
        // Convert to React Native imports
        path.node.source.value = 'react-native'

        path.node.specifiers = path.node.specifiers.map(spec => {
          if (t.isImportSpecifier(spec) && t.isIdentifier(spec.imported)) {
            const mapping = COMPONENT_MAP.find(m => m.from === spec.imported.name)
            if (mapping) {
              return t.importSpecifier(
                t.identifier(mapping.to),
                t.identifier(mapping.to)
              )
            }
          }
          return spec
        })
      }
    },

    // Convert JSX elements
    JSXElement(path) {
      const openingElement = path.node.openingElement
      if (t.isJSXIdentifier(openingElement.name)) {
        const componentName = openingElement.name.name
        const mapping = COMPONENT_MAP.find(m => m.from === componentName)

        if (mapping) {
          // Change component name
          openingElement.name.name = mapping.to
          if (path.node.closingElement) {
            path.node.closingElement.name.name = mapping.to
          }

          // Convert props
          if (mapping.propMapping) {
            openingElement.attributes = openingElement.attributes.map(attr => {
              if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
                const propName = attr.name.name
                const newPropName = mapping.propMapping![propName]
                if (newPropName) {
                  attr.name.name = newPropName
                }
              }
              return attr
            })
          }
        }
      }
    },
  })

  const output = generate(ast, {
    retainLines: true,
    comments: true,
  })

  return output.code
}

// Usage
const migratedCode = await migrateComponent('./src/components/SendButton.tsx')
await writeFile('./arkade-native/src/components/SendButton.tsx', migratedCode)
```

---

## Migration Checklist

### Phase 1: Setup ✅
- [ ] Initialize Expo app
- [ ] Install dependencies (expo-router, expo-camera, etc.)
- [ ] Copy `lib/` folder (all utilities)
- [ ] Copy `providers/` folder (all contexts)
- [ ] Set up Expo Router structure
- [ ] Configure TypeScript

### Phase 2: Component Library ✅
- [ ] Create `<Button>` component (maps to IonButton)
- [ ] Create `<TextInput>` component (maps to IonInput)
- [ ] Create `<Text>` component (maps to IonText)
- [ ] Create `<Screen>` component (maps to IonPage)
- [ ] Create `<ScrollView>` wrapper (maps to IonContent)
- [ ] Create `<Modal>` component (maps to IonModal)
- [ ] Create `<Card>` component
- [ ] Set up theme/design tokens
- [ ] Test components render correctly

### Phase 3: Migrate Screens (Week 4-6)
- [ ] Write migration script (AST-based or LLM-based)
- [ ] Migrate `screens/Wallet/Index.tsx` (main screen)
- [ ] Migrate `screens/Wallet/Send/*` (3 screens)
- [ ] Migrate `screens/Wallet/Receive/*` (3 screens)
- [ ] Migrate `screens/Settings/Index.tsx`
- [ ] Migrate `screens/Init/*` (5 screens)
- [ ] Migrate `screens/Apps/*` (4 screens)
- [ ] Migrate remaining screens (30+ screens)
- [ ] Convert icons to react-native-svg
- [ ] Test on iOS simulator
- [ ] Test on Android emulator
- [ ] Fix platform-specific issues

---

## Automation Script

### LLM-Powered Migration Agent

```typescript
// tools/llm-migrate.ts

import Anthropic from '@anthropic-ai/sdk'
import { readFile, writeFile } from 'fs/promises'
import { glob } from 'glob'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `You are a code migration expert. Convert Ionic React components to React Native.

Rules:
1. Convert Ionic components to React Native equivalents
2. Convert onClick → onPress
3. Convert className → style prop with StyleSheet
4. Preserve ALL business logic exactly as-is
5. Keep all imports except Ionic ones
6. Use react-native-svg for SVG components
7. Add proper TypeScript types

Component Mappings:
- IonButton → Pressable (with Text child)
- IonInput → TextInput
- IonText → Text
- IonContent → ScrollView
- IonPage → View with SafeAreaView
- IonModal → Modal
- IonTabs → Remove (use Expo Router)
- IonRefresher → RefreshControl

DO NOT:
- Change variable names
- Change function logic
- Remove comments
- Change business logic
`

async function migrateFile(filePath: string) {
  console.log(`Migrating ${filePath}...`)

  const originalCode = await readFile(filePath, 'utf-8')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Convert this Ionic React component to React Native:\n\n${originalCode}`
    }]
  })

  const migratedCode = response.content[0].text

  // Extract code from markdown if present
  const codeMatch = migratedCode.match(/```(?:typescript|tsx)?\n([\s\S]+?)\n```/)
  const cleanedCode = codeMatch ? codeMatch[1] : migratedCode

  // Write to new location
  const newPath = filePath.replace('/wallet/src/', '/arkade-native/src/')
  await writeFile(newPath, cleanedCode)

  console.log(`✅ Migrated to ${newPath}`)
}

async function migrateAll() {
  const componentFiles = await glob('./src/components/**/*.tsx')
  const screenFiles = await glob('./src/screens/**/*.tsx')

  const allFiles = [...componentFiles, ...screenFiles]

  for (const file of allFiles) {
    try {
      await migrateFile(file)
    } catch (error) {
      console.error(`❌ Failed to migrate ${file}:`, error)
    }
  }

  console.log(`\n✅ Migrated ${allFiles.length} files!`)
}

// Run migration
migrateAll()
```

**Usage**:
```bash
# Migrate all components
ANTHROPIC_API_KEY=your_key npx tsx tools/llm-migrate.ts

# Or migrate one file at a time
npx tsx tools/llm-migrate.ts src/components/Button.tsx
```

---

## Example Migration

### Before (Ionic React)

```typescript
// src/components/SendButton.tsx
import { IonButton, IonIcon } from '@ionic/react'
import { sendOutline } from 'ionicons/icons'
import { useWallet } from '../providers/wallet'
import { formatBitcoin } from '../lib/format'

interface SendButtonProps {
  amount: number
  disabled?: boolean
}

export const SendButton = ({ amount, disabled }: SendButtonProps) => {
  const { send } = useWallet()

  const handleSend = async () => {
    await send(amount)
  }

  return (
    <IonButton
      expand="block"
      onClick={handleSend}
      disabled={disabled}
    >
      <IonIcon slot="start" icon={sendOutline} />
      Send {formatBitcoin(amount)} BTC
    </IonButton>
  )
}
```

### After (React Native) - Auto-Converted

```typescript
// arkade-native/src/components/SendButton.tsx
import { Pressable, Text, StyleSheet, View } from 'react-native'
import { SendIcon } from '../icons/Send'
import { useWallet } from '../providers/wallet'
import { formatBitcoin } from '../lib/format'

interface SendButtonProps {
  amount: number
  disabled?: boolean
}

export const SendButton = ({ amount, disabled }: SendButtonProps) => {
  const { send } = useWallet()

  const handleSend = async () => {
    await send(amount)
  }

  return (
    <Pressable
      style={[styles.button, disabled && styles.disabled]}
      onPress={handleSend}
      disabled={disabled}
    >
      <View style={styles.content}>
        <SendIcon width={20} height={20} color="#fff" />
        <Text style={styles.text}>
          Send {formatBitcoin(amount)} BTC
        </Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
})
```

**Notice**:
- ✅ Business logic (`handleSend`, `formatBitcoin`) **unchanged**
- ✅ Imports from `providers/` and `lib/` **unchanged**
- ✅ Props interface **unchanged**
- 🔄 Only UI layer converted

---

## Timeline & Effort

### Realistic Timeline

| Week | Task | Hours |
|------|------|-------|
| **Week 1** | Setup Expo, copy non-UI code | 8h |
| **Week 2** | Build base component library (10 components) | 16h |
| **Week 3** | Build wallet-specific components (15 components) | 16h |
| **Week 4** | Write migration script, test on 5 screens | 16h |
| **Week 5** | Migrate remaining screens (40 screens) | 20h |
| **Week 6** | Testing, bug fixes, polish | 16h |
| **Total** | | **92 hours (~2.3 weeks FTE)** |

### With Automation

- **Manual migration**: ~20-30 minutes per component = 80+ hours
- **Automated migration**: ~5 minutes per component = 13 hours
- **Time saved**: ~67 hours (4+ days)

---

## Risk Mitigation

### Potential Issues

1. **Custom Ionic CSS** - Some Ionic-specific styles need manual conversion
2. **Complex components** - Some components may need manual tweaking
3. **Testing gaps** - Need to test each screen manually
4. **Icon conversion** - SVG icons need react-native-svg

### Solutions

1. **CSS**: Use NativeWind (Tailwind for RN) for rapid styling
2. **Complex components**: Migration script flags them for manual review
3. **Testing**: Write E2E tests with Maestro
4. **Icons**: Batch convert with SVGR for React Native

---

## Success Criteria

- ✅ All screens render correctly on iOS and Android
- ✅ All business logic works unchanged
- ✅ Navigation works with Expo Router
- ✅ Performance is smooth (60fps)
- ✅ All user flows work (send, receive, settings, etc.)
- ✅ Tests pass

---

## Next Steps

### This Week
1. Initialize Expo app
2. Copy `lib/` and `providers/` folders
3. Test that SDK works in Expo
4. Build 3 base components (Button, TextInput, Text)

### Next Week
1. Build full component library (20 components)
2. Write migration script (LLM-based)
3. Migrate first 5 screens as proof-of-concept

### Week 3+
1. Run migration script on all remaining screens
2. Test each screen
3. Fix edge cases
4. Polish and ship

---

**This is much simpler!** Just UI migration, reuse everything else. 6-8 weeks instead of 30 weeks! 🚀
