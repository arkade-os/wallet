const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

let commitHash = 'unknown'
let isDirty = false
let success = false

try {
  // Determine commit hash using git rev-parse HEAD
  commitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim().substring(0, 8)
  // Check for uncommitted changes
  try {
    execSync('git diff-index --quiet HEAD --')
  } catch (e) {
    isDirty = true // Indicates uncommitted changes
  }
  success = true
} catch (error) {
  console.error('Failed to determine git commit information:', error.message)
  // success remains false, commitHash remains 'unknown'
}

const gitCommitValue = success ? `${commitHash}${isDirty ? '-dirty' : ''}` : 'unknown'
const output = `export const gitCommit = '${gitCommitValue}'\n`

try {
  fs.writeFileSync(path.join(__dirname, '../src/_gitCommit.ts'), output, 'utf8')
  if (success) {
    console.log(`Git commit info successfully written to _gitCommit.ts: ${gitCommitValue}`)
  } else {
    console.warn(`Wrote fallback git commit info to _gitCommit.ts: ${gitCommitValue}`)
  }
} catch (writeError) {
  console.error('Error writing _gitCommit.ts:', writeError.message)
  success = false // Mark as failure if write fails
}

if (!success) {
  process.exit(1) // Exit if we couldn't determine git info or write the file
}
