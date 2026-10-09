import { promisify } from 'util'
import { setTimeout } from 'timers'
import { execSync } from 'child_process'

const sleep = promisify(setTimeout)

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

    const serverInfo = execSync('curl -s http://localhost:7070/v1/info').toString()
    console.log(`\narkd info: ${serverInfo}`)

    // Verify nostr relay (nak is a WebSocket server, check container is running)
    await waitForService('nak', 'docker exec nak nak --version', 10, 1000)

    // The e2e faucet is the delegator's Fulmine wallet, which arkade-regtest no longer funds
    // (arkade-regtest#66): redeem a credit note into it, as it used to.
    const balance = JSON.parse(execSync('curl -s http://localhost:7011/api/v1/balance').toString())
    if (BigInt(balance.amount ?? 0) === 0n) {
      const arkd = `${process.env.REGTEST_CONTAINER_PREFIX ?? ''}arkd`
      const note = execSync(`docker exec ${arkd} arkd note --amount 100000000`).toString().trim()
      execSync(
        `curl -sf -X POST http://localhost:7011/api/v1/note/redeem -H 'Content-Type: application/json' -d '{"note":"${note}"}'`,
      )
      console.log('  ✔ faucet funded')
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('  ✓ regtest environment verified')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  } catch (error) {
    console.error('\n✗ Setup verification failed:', error)
    process.exit(1)
  }
}

setup()
