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

function dumpEnvironmentInfo() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Dumping environment information')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // get vars from env
  console.log('NIGIRI_BRANCH:', process.env.NIGIRI_BRANCH)
  console.log('NIGIRI_REPO_URL:', process.env.NIGIRI_REPO_URL)
  console.log('# Arkd image overrides (empty when using nigiri defaults)')
  console.log('ARKD_IMAGE:', process.env.ARKD_IMAGE)
  console.log('ARKD_WALLET_IMAGE:', process.env.ARKD_WALLET_IMAGE)
  console.log('# Image versions')
  console.log('BOLTZ_LND_IMAGE:', process.env.BOLTZ_LND_IMAGE)
  console.log('FULMINE_IMAGE:', process.env.FULMINE_IMAGE)
  console.log('BOLTZ_IMAGE:', process.env.BOLTZ_IMAGE)
  console.log('NGINX_IMAGE:', process.env.NGINX_IMAGE)
  console.log('LNURL_IMAGE:', process.env.LNURL_IMAGE)
  console.log('WALLET_IMAGE:', process.env.WALLET_IMAGE)
  console.log('# Ports')
  console.log('BOLTZ_LND_P2P_PORT:', process.env.BOLTZ_LND_P2P_PORT)
  console.log('BOLTZ_LND_RPC_PORT:', process.env.BOLTZ_LND_RPC_PORT)
  console.log('FULMINE_GRPC_PORT:', process.env.FULMINE_GRPC_PORT)
  console.log('FULMINE_API_PORT:', process.env.FULMINE_API_PORT)
  console.log('FULMINE_HTTP_PORT:', process.env.FULMINE_HTTP_PORT)
  console.log('DELEGATOR_GRPC_PORT:', process.env.DELEGATOR_GRPC_PORT)
  console.log('DELEGATOR_API_PORT:', process.env.DELEGATOR_API_PORT)
  console.log('DELEGATOR_HTTP_PORT:', process.env.DELEGATOR_HTTP_PORT)
  console.log('BOLTZ_GRPC_PORT:', process.env.BOLTZ_GRPC_PORT)
  console.log('BOLTZ_API_PORT:', process.env.BOLTZ_API_PORT)
  console.log('BOLTZ_WS_PORT:', process.env.BOLTZ_WS_PORT)
  console.log('NGINX_PORT:', process.env.NGINX_PORT)
  console.log('LNURL_PORT:', process.env.LNURL_PORT)
  console.log('WALLET_PORT:', process.env.WALLET_PORT)
  console.log('# Arkd wallet configuration (only used when ARKD_IMAGE is set)')
  console.log('ARKD_WALLET_SIGNER_KEY:', process.env.ARKD_WALLET_SIGNER_KEY)
  console.log('# Arkd configuration (only used when ARKD_IMAGE is set)')
  console.log('ARKD_SCHEDULER_TYPE:', process.env.ARKD_SCHEDULER_TYPE)
  console.log('ARKD_ALLOW_CSV_BLOCK_TYPE:', process.env.ARKD_ALLOW_CSV_BLOCK_TYPE)
  console.log('ARKD_VTXO_TREE_EXPIRY:', process.env.ARKD_VTXO_TREE_EXPIRY)
  console.log('ARKD_UNILATERAL_EXIT_DELAY:', process.env.ARKD_UNILATERAL_EXIT_DELAY)
  console.log('ARKD_BOARDING_EXIT_DELAY:', process.env.ARKD_BOARDING_EXIT_DELAY)
  console.log('ARKD_LIVE_STORE_TYPE:', process.env.ARKD_LIVE_STORE_TYPE)
  console.log('ARKD_LOG_LEVEL:', process.env.ARKD_LOG_LEVEL)
  console.log('ARKD_SESSION_DURATION:', process.env.ARKD_SESSION_DURATION)
  console.log('ARKD_ROUND_INTERVAL:', process.env.ARKD_ROUND_INTERVAL)
  console.log('# Wallet setup')
  console.log('ARKD_PASSWORD:', process.env.ARKD_PASSWORD)
  console.log('ARKD_FAUCET_AMOUNT:', process.env.ARKD_FAUCET_AMOUNT)
  console.log('FULMINE_FAUCET_AMOUNT:', process.env.FULMINE_FAUCET_AMOUNT)
  console.log('LND_FAUCET_AMOUNT:', process.env.LND_FAUCET_AMOUNT)
  console.log('LND_CHANNEL_SIZE:', process.env.LND_CHANNEL_SIZE)
  console.log('# Bitcoin Core low-fee config (requires restart — may break nbxplorer connection)')
  console.log("# Set to false in your .env if your tests don't need very-low-fee transactions.")
  console.log('BITCOIN_LOW_FEE:', process.env.BITCOIN_LOW_FEE)
  console.log('# Ark fees')
  console.log('ARK_OFFCHAIN_INPUT_FEE:', process.env.ARK_OFFCHAIN_INPUT_FEE)
  console.log('ARK_ONCHAIN_INPUT_FEE:', process.env.ARK_ONCHAIN_INPUT_FEE)
  console.log('ARK_OFFCHAIN_OUTPUT_FEE:', process.env.ARK_OFFCHAIN_OUTPUT_FEE)
  console.log('ARK_ONCHAIN_OUTPUT_FEE:', process.env.ARK_ONCHAIN_OUTPUT_FEE)
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

dumpEnvironmentInfo()
setup()
