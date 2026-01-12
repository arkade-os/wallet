#!/usr/bin/env tsx
/**
 * Ionic React → React Native Component Migration Tool
 *
 * Usage:
 *   npx tsx tools/migrate-component.ts src/components/Button.tsx
 *   npx tsx tools/migrate-component.ts "src/components/**\/*.tsx"
 *   npx tsx tools/migrate-component.ts --all
 */

import Anthropic from '@anthropic-ai/sdk'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { glob } from 'glob'
import path from 'path'
import { existsSync } from 'fs'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

const SYSTEM_PROMPT = `You are an expert at converting Ionic React components to React Native.

## Conversion Rules

### Component Mappings
- IonButton → Pressable + Text (styled)
- IonInput → TextInput
- IonText → Text
- IonContent → ScrollView
- IonPage → View (with SafeAreaView)
- IonModal → Modal from 'react-native'
- IonRefresher/IonRefresherContent → RefreshControl
- IonTabs/IonTabBar → Remove (use Expo Router instead)
- IonActionSheet → @expo/react-native-action-sheet
- IonToast → Show with custom Toast component

### Prop Mappings
- onClick → onPress
- onIonChange → onChangeText (for inputs)
- className → style (with StyleSheet)
- expand="block" → fullWidth={true}
- color="primary" → variant="primary"

### Import Conversions
- @ionic/react → react-native (Pressable, Text, View, ScrollView, etc.)
- ionicons/icons → ../icons/ (custom SVG components)
- Keep all other imports unchanged (especially from lib/, providers/, etc.)

### Critical Rules
1. **PRESERVE ALL BUSINESS LOGIC** - Don't change any functions, hooks, or logic
2. **PRESERVE ALL IMPORTS** from lib/, providers/, hooks/
3. **PRESERVE ALL PROP INTERFACES** - Keep TypeScript types exactly as-is
4. **PRESERVE ALL COMMENTS** - Keep all code comments
5. **ADD StyleSheet** at the bottom for any styles needed
6. Use proper TypeScript types for React Native components

### Styling
- Use StyleSheet.create() for all styles
- Place styles object at bottom of file
- Use flexbox for layouts
- Common patterns:
  - Button: paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8
  - Full width: width: '100%'
  - Center content: alignItems: 'center', justifyContent: 'center'

### Example

BEFORE (Ionic):
\`\`\`tsx
import { IonButton } from '@ionic/react'
import { useWallet } from '../providers/wallet'

export const SendButton = ({ amount }) => {
  const { send } = useWallet()
  return (
    <IonButton expand="block" onClick={() => send(amount)}>
      Send
    </IonButton>
  )
}
\`\`\`

AFTER (React Native):
\`\`\`tsx
import { Pressable, Text, StyleSheet } from 'react-native'
import { useWallet } from '../providers/wallet'

export const SendButton = ({ amount }) => {
  const { send } = useWallet()
  return (
    <Pressable style={styles.button} onPress={() => send(amount)}>
      <Text style={styles.text}>Send</Text>
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
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
})
\`\`\`

Return ONLY the converted TypeScript code. Do not add explanations or markdown code blocks.
`

interface MigrationResult {
  filePath: string
  success: boolean
  outputPath?: string
  error?: string
}

async function migrateFile(
  filePath: string,
  outputDir: string = './migrated'
): Promise<MigrationResult> {
  try {
    console.log(`📄 Migrating: ${filePath}`)

    // Read source file
    const sourceCode = await readFile(filePath, 'utf-8')

    // Check if file is Ionic React (skip if already React Native)
    if (!sourceCode.includes('@ionic/react') && !sourceCode.includes('Ion')) {
      console.log(`⏭️  Skipping (no Ionic components): ${filePath}`)
      return { filePath, success: false, error: 'No Ionic components found' }
    }

    // Call Claude to convert
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Convert this Ionic React component to React Native. Return ONLY the code, no explanations:\n\n${sourceCode}`,
        },
      ],
    })

    let convertedCode = response.content[0].type === 'text'
      ? response.content[0].text
      : ''

    // Clean up response (remove markdown if present)
    const codeBlockMatch = convertedCode.match(/```(?:typescript|tsx|ts)?\n([\s\S]+?)\n```/)
    if (codeBlockMatch) {
      convertedCode = codeBlockMatch[1]
    }

    // Determine output path
    const relativePath = path.relative('src', filePath)
    const outputPath = path.join(outputDir, relativePath)

    // Create output directory
    await mkdir(path.dirname(outputPath), { recursive: true })

    // Write converted file
    await writeFile(outputPath, convertedCode.trim() + '\n')

    console.log(`✅ Success: ${outputPath}`)
    return { filePath, success: true, outputPath }
  } catch (error) {
    console.error(`❌ Failed: ${filePath}`, error)
    return {
      filePath,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function migrateAll(
  pattern: string,
  outputDir: string = './migrated'
): Promise<void> {
  console.log(`🔍 Finding files matching: ${pattern}\n`)

  const files = await glob(pattern, {
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
  })

  if (files.length === 0) {
    console.log('No files found matching pattern')
    return
  }

  console.log(`Found ${files.length} files to migrate\n`)

  const results: MigrationResult[] = []

  for (const file of files) {
    const result = await migrateFile(file, outputDir)
    results.push(result)

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('MIGRATION SUMMARY')
  console.log('='.repeat(60))

  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)

  console.log(`\n✅ Successful: ${successful.length}`)
  console.log(`❌ Failed: ${failed.length}`)
  console.log(`📊 Total: ${results.length}`)

  if (failed.length > 0) {
    console.log('\nFailed files:')
    failed.forEach(f => {
      console.log(`  - ${f.filePath}: ${f.error}`)
    })
  }

  console.log(`\n📂 Output directory: ${path.resolve(outputDir)}`)
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log(`
Ionic React → React Native Migration Tool

Usage:
  npx tsx tools/migrate-component.ts <file-pattern> [output-dir]
  npx tsx tools/migrate-component.ts --all [output-dir]

Examples:
  # Migrate single file
  npx tsx tools/migrate-component.ts src/components/Button.tsx

  # Migrate all components
  npx tsx tools/migrate-component.ts "src/components/**/*.tsx"

  # Migrate all screens
  npx tsx tools/migrate-component.ts "src/screens/**/*.tsx"

  # Migrate everything
  npx tsx tools/migrate-component.ts --all

  # Specify output directory
  npx tsx tools/migrate-component.ts "src/components/**/*.tsx" ../arkade-native/src

Environment:
  ANTHROPIC_API_KEY - Required for Claude API access
    `)
    process.exit(1)
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ Error: ANTHROPIC_API_KEY environment variable not set')
    console.error('   Get your API key from: https://console.anthropic.com/')
    process.exit(1)
  }

  const pattern = args[0] === '--all' ? 'src/**/*.tsx' : args[0]
  const outputDir = args[1] || './migrated'

  await migrateAll(pattern, outputDir)
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export { migrateFile, migrateAll }
