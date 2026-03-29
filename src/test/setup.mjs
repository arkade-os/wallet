import { promisify } from 'util'
import { setTimeout } from 'timers'
import { execSync } from 'child_process'

const sleep = promisify(setTimeout)

function execCommand(command, silent = false) {
  try {
    const options = silent ? { stdio: 'pipe', encoding: 'utf8' } : { encoding: 'utf8' }
    return execSync(command, options).toString().trim()
  } catch (error) {
    if (error.stderr && error.stderr.toString().includes('wallet already initialized')) {
      console.log('Wallet already initialized, continuing...')
      return ''
    }
    throw error
  }
}

async function waitForService(name, checkCmd, maxRetries = 30, retryDelay = 2000) {
  console.log(`Waiting for ${name} to be ready...`)
  for (let i = 0; i < maxRetries; i++) {
    try {
      execSync(checkCmd, { stdio: 'pipe' })
      console.log(`  ✔ ${name} ready`)
      return true
    } catch {
      if (i < maxRetries - 1) {
        console.log(`  Waiting... (${i + 1}/${maxRetries})`)
      }
      await sleep(retryDelay)
    }
  }
  throw new Error(`${name} failed to be ready after maximum retries`)
}

async function setup() {
  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('  Verifying regtest environment')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // Verify arkd is serving
    await waitForService('arkd', 'curl -sf http://localhost:7070/v1/info')

    const serverInfo = JSON.parse(execSync('curl -s http://localhost:7070/v1/info').toString())
    console.log(`\narkd Public Key: ${serverInfo.signerPubkey}`)

    // Verify boltz pairs are loaded
    await waitForService('boltz', 'curl -sf http://localhost:9069/v2/swap/submarine')

    // Verify nostr relay (nak is a WebSocket server, check container is running)
    await waitForService('nak', 'docker exec nak nak --version', 10, 1000)

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('  ✓ regtest environment verified')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  } catch (error) {
    console.error('\n✗ Setup verification failed:', error)
    process.exit(1)
  }
}

setup()
