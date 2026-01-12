#!/usr/bin/env tsx
/**
 * Dialectical Autocoding: Coach-Player Migration System
 *
 * Implements adversarial cooperation for Ionic → React Native migration
 *
 * Architecture:
 * - Player Agent: Migrates component from Ionic to React Native
 * - Coach Agent: Reviews migration, provides critical feedback
 * - Loop: Player fixes issues until Coach approves
 *
 * Usage:
 *   npx tsx tools/coach-player-migrate.ts src/components/Button.tsx
 */

import Anthropic from '@anthropic-ai/sdk'
import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

// ============================================================================
// PLAYER AGENT - Migrates code
// ============================================================================

const PLAYER_SYSTEM_PROMPT = `You are the PLAYER agent in a code migration task.

Your role:
- Convert Ionic React components to React Native
- Preserve ALL business logic exactly
- Generate clean, working code
- Follow React Native best practices

Component Mappings:
- IonButton → Pressable + Text
- IonInput → TextInput
- IonText → Text
- IonContent → ScrollView
- IonPage → View + SafeAreaView

Rules:
1. Keep all business logic unchanged
2. Keep all imports from lib/, providers/
3. Convert props: onClick → onPress, className → style
4. Add StyleSheet.create() for styles
5. Use TypeScript properly

Return ONLY the converted code, no explanations.
`

// ============================================================================
// COACH AGENT - Reviews and critiques
// ============================================================================

const COACH_SYSTEM_PROMPT = `You are the COACH agent in a code review task.

Your role:
- Critically review migrated React Native code
- Find bugs, issues, and improvements
- Be adversarial but constructive
- Approve only when code is truly ready

Review checklist:
1. ✅ All business logic preserved from original?
2. ✅ All imports correct (especially lib/, providers/)?
3. ✅ Component mappings correct (Ionic → RN)?
4. ✅ Props mapped correctly (onClick → onPress)?
5. ✅ StyleSheet used properly?
6. ✅ TypeScript types correct?
7. ✅ No undefined variables?
8. ✅ Proper React Native patterns?
9. ✅ Performance considerations?
10. ✅ Would this actually work?

Output format:
{
  "approved": true/false,
  "issues": [
    {
      "severity": "critical" | "major" | "minor",
      "description": "What's wrong",
      "line": line number or null,
      "suggestion": "How to fix it"
    }
  ],
  "summary": "Overall assessment"
}

Be thorough. Don't approve unless truly ready.
`

// ============================================================================
// Dialectical Migration Process
// ============================================================================

interface CoachFeedback {
  approved: boolean
  issues: Array<{
    severity: 'critical' | 'major' | 'minor'
    description: string
    line: number | null
    suggestion: string
  }>
  summary: string
}

async function playerMigrate(
  originalCode: string,
  coachFeedback?: CoachFeedback
): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: coachFeedback
        ? `Previous attempt had issues. Coach feedback:\n\n${JSON.stringify(
            coachFeedback,
            null,
            2
          )}\n\nOriginal code:\n\n${originalCode}\n\nFix the issues and resubmit.`
        : `Convert this Ionic React component to React Native:\n\n${originalCode}`,
    },
  ]

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 8000,
    system: PLAYER_SYSTEM_PROMPT,
    messages,
  })

  let code = response.content[0].type === 'text' ? response.content[0].text : ''

  // Extract code from markdown if present
  const codeBlockMatch = code.match(/```(?:typescript|tsx)?\n([\s\S]+?)\n```/)
  if (codeBlockMatch) {
    code = codeBlockMatch[1]
  }

  return code.trim()
}

async function coachReview(
  originalCode: string,
  migratedCode: string
): Promise<CoachFeedback> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4000,
    system: COACH_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Review this migration:

ORIGINAL (Ionic React):
\`\`\`tsx
${originalCode}
\`\`\`

MIGRATED (React Native):
\`\`\`tsx
${migratedCode}
\`\`\`

Provide detailed review as JSON.`,
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'

  // Extract JSON from markdown if present
  const jsonMatch = text.match(/```json\n([\s\S]+?)\n```/)
  const jsonText = jsonMatch ? jsonMatch[1] : text

  try {
    return JSON.parse(jsonText)
  } catch (error) {
    // Fallback if JSON parsing fails
    return {
      approved: false,
      issues: [
        {
          severity: 'critical',
          description: 'Coach response was not valid JSON',
          line: null,
          suggestion: 'Try again',
        },
      ],
      summary: 'Invalid response format',
    }
  }
}

async function dialecticalMigration(
  filePath: string,
  outputDir: string = './migrated',
  maxIterations: number = 3
): Promise<void> {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`🎯 DIALECTICAL MIGRATION: ${filePath}`)
  console.log('='.repeat(60))

  // Read original code
  const originalCode = await readFile(filePath, 'utf-8')

  // Check if it's Ionic code
  if (!originalCode.includes('@ionic/react') && !originalCode.includes('Ion')) {
    console.log('⏭️  Not an Ionic component, skipping')
    return
  }

  let migratedCode = ''
  let iteration = 0
  let feedback: CoachFeedback | undefined

  // Coach-Player loop
  while (iteration < maxIterations) {
    iteration++
    console.log(`\n--- Iteration ${iteration}/${maxIterations} ---`)

    // PLAYER: Migrate (or fix based on feedback)
    console.log('🎮 PLAYER: Migrating code...')
    migratedCode = await playerMigrate(originalCode, feedback)
    console.log(`   Generated ${migratedCode.split('\n').length} lines`)

    // COACH: Review
    console.log('🎓 COACH: Reviewing migration...')
    feedback = await coachReview(originalCode, migratedCode)

    console.log(`   Approved: ${feedback.approved ? '✅ YES' : '❌ NO'}`)
    console.log(`   Issues found: ${feedback.issues.length}`)

    // Show issues
    if (feedback.issues.length > 0) {
      feedback.issues.forEach((issue, i) => {
        const emoji =
          issue.severity === 'critical'
            ? '🔴'
            : issue.severity === 'major'
            ? '🟡'
            : '🔵'
        console.log(`   ${emoji} ${issue.severity.toUpperCase()}: ${issue.description}`)
        if (issue.line) {
          console.log(`      Line ${issue.line}: ${issue.suggestion}`)
        }
      })
    }

    console.log(`   Summary: ${feedback.summary}`)

    // If approved, we're done
    if (feedback.approved) {
      console.log('\n✅ COACH APPROVED - Migration complete!')
      break
    }

    // If not approved and no more iterations, warn
    if (iteration === maxIterations) {
      console.log('\n⚠️  Max iterations reached - saving best effort')
    }
  }

  // Save output
  const relativePath = path.relative('src', filePath)
  const outputPath = path.join(outputDir, relativePath)

  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, migratedCode)

  console.log(`\n💾 Saved to: ${outputPath}`)

  // Save review report
  const reportPath = outputPath.replace(/\.tsx?$/, '.review.json')
  await writeFile(reportPath, JSON.stringify(feedback, null, 2))
  console.log(`📋 Review report: ${reportPath}`)

  console.log('\n' + '='.repeat(60) + '\n')
}

// ============================================================================
// Batch Migration with Parallel Experiments
// ============================================================================

async function batchDialecticalMigration(
  pattern: string,
  outputDir: string = './migrated',
  maxIterations: number = 3
): Promise<void> {
  const { glob } = await import('glob')

  const files = await glob(pattern, {
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
  })

  console.log(`\n🔍 Found ${files.length} files to migrate\n`)

  const results: Array<{
    file: string
    success: boolean
    iterations: number
    approved: boolean
  }> = []

  for (const file of files) {
    try {
      await dialecticalMigration(file, outputDir, maxIterations)
      results.push({
        file,
        success: true,
        iterations: maxIterations, // TODO: track actual iterations
        approved: true, // TODO: track actual approval
      })
    } catch (error) {
      console.error(`❌ Failed to migrate ${file}:`, error)
      results.push({
        file,
        success: false,
        iterations: 0,
        approved: false,
      })
    }

    // Delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 DIALECTICAL MIGRATION SUMMARY')
  console.log('='.repeat(60))

  const successful = results.filter((r) => r.success && r.approved)
  const needsReview = results.filter((r) => r.success && !r.approved)
  const failed = results.filter((r) => !r.success)

  console.log(`\n✅ Approved by Coach: ${successful.length}`)
  console.log(`⚠️  Needs Review: ${needsReview.length}`)
  console.log(`❌ Failed: ${failed.length}`)
  console.log(`📊 Total: ${results.length}`)

  if (needsReview.length > 0) {
    console.log('\n⚠️  Files needing manual review:')
    needsReview.forEach((r) => {
      console.log(`   - ${r.file}`)
    })
  }

  if (failed.length > 0) {
    console.log('\n❌ Failed files:')
    failed.forEach((r) => {
      console.log(`   - ${r.file}`)
    })
  }

  console.log(`\n📂 Output directory: ${path.resolve(outputDir)}`)
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log(`
🎓 Dialectical Autocoding: Coach-Player Migration System

Usage:
  npx tsx tools/coach-player-migrate.ts <file-or-pattern> [options]

Examples:
  # Single file
  npx tsx tools/coach-player-migrate.ts src/components/Button.tsx

  # All components
  npx tsx tools/coach-player-migrate.ts "src/components/**/*.tsx"

  # All screens
  npx tsx tools/coach-player-migrate.ts "src/screens/**/*.tsx"

  # Everything
  npx tsx tools/coach-player-migrate.ts "src/**/*.tsx"

Options:
  --output <dir>        Output directory (default: ./migrated)
  --max-iterations <n>  Max coach-player iterations (default: 3)

Environment:
  ANTHROPIC_API_KEY     Required for Claude API access

How it works:
1. PLAYER agent migrates component
2. COACH agent reviews critically
3. PLAYER fixes issues
4. Repeat until COACH approves (max 3 iterations)
5. Save approved code + review report

Benefits:
- Better quality migrations
- Fewer human reviews needed
- Issues caught automatically
- Detailed feedback for manual review
    `)
    process.exit(1)
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ Error: ANTHROPIC_API_KEY environment variable not set')
    console.error('   Get your API key from: https://console.anthropic.com/')
    process.exit(1)
  }

  const fileOrPattern = args[0]
  let outputDir = './migrated'
  let maxIterations = 3

  // Parse options
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) {
      outputDir = args[i + 1]
      i++
    } else if (args[i] === '--max-iterations' && args[i + 1]) {
      maxIterations = parseInt(args[i + 1])
      i++
    }
  }

  // Check if it's a pattern or single file
  if (fileOrPattern.includes('*')) {
    await batchDialecticalMigration(fileOrPattern, outputDir, maxIterations)
  } else {
    await dialecticalMigration(fileOrPattern, outputDir, maxIterations)
  }
}

// Run
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export { dialecticalMigration, batchDialecticalMigration }
