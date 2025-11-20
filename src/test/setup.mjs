import { promisify } from 'util'
import { setTimeout } from 'timers'
import { execSync } from 'child_process'

const arkdExec = 'docker exec -t arkd'
const lncli = 'docker exec -i boltz-lnd lncli --network=regtest'

const sleep = promisify(setTimeout)

async function execCommand(command, silent = false) {
  return new Promise((resolve, reject) => {
    try {
      const options = silent ? { stdio: 'pipe', encoding: 'utf8' } : { encoding: 'utf8' }
      const result = execSync(command, options).toString().trim()
      resolve(result)
    } catch (error) {
      // If the error indicates the wallet is already initialized, we can continue
      if (error.stderr && error.stderr.toString().includes('wallet already initialized')) {
        console.log('Wallet already initialized, continuing...')
        resolve('')
      } else {
        reject(error)
      }
    }
  })
}

async function waitForArkServer(maxRetries = 30, retryDelay = 2000) {
  console.log('Waiting for ark server to be ready...')
  for (let i = 0; i < maxRetries; i++) {
    try {
      execSync('curl -s http://localhost:7070/v1/info', { stdio: 'pipe' })
      console.log('  ✔ Server ready')
      return true
    } catch {
      if (i < maxRetries - 1) {
        console.log(`  Waiting... (${i + 1}/${maxRetries})`)
      }
      await sleep(retryDelay)
    }
  }
  throw new Error('ark server failed to be ready after maximum retries')
}

async function checkWalletStatus(maxRetries = 30, retryDelay = 2000) {
  const cmd = `${arkdExec} arkd wallet status`
  for (let i = 0; i < maxRetries; i++) {
    try {
      const statusOutput = execSync(cmd, { stdio: 'pipe' }).toString()
      const initialized = statusOutput.includes('initialized: true')
      const unlocked = statusOutput.includes('unlocked: true')
      const synced = statusOutput.includes('synced: true')
      return { initialized, unlocked, synced }
    } catch {
      await sleep(retryDelay)
    }
  }
}

async function waitForWalletReady(maxRetries = 30, retryDelay = 2000) {
  console.log('Waiting for wallet to be ready and synced...')
  for (let i = 0; i < maxRetries; i++) {
    const status = await checkWalletStatus()
    if (status && status.initialized && status.unlocked && status.synced) {
      console.log('  ✔ Wallet ready and synced')
      return true
    }
    if (i < maxRetries - 1) {
      console.log(`  Waiting... (${i + 1}/${maxRetries})`)
    }
    await sleep(retryDelay)
  }
  throw new Error('Wallet failed to be ready after maximum retries')
}

async function waitForCmd(command, maxRetries = 10, retryDelay = 1000) {
  for (let i = 1; i <= maxRetries; i++) {
    try {
      execSync(command, { stdio: 'pipe' })
      console.log('  ✔ Ready')
      return true
    } catch {
      if (i < maxRetries) {
        console.log(`  Waiting... (${i}/${maxRetries})`)
      }
      await sleep(retryDelay)
    }
  }
  throw new Error(`Timed out waiting for command after ${(maxRetries * retryDelay) / 1000} seconds.`)
}

async function faucet(address, amount, maxRetries = 10, retryDelay = 1000) {
  const initialCountResponse = execSync(`curl -s http://localhost:3000/address/${address}`, { encoding: 'utf8' })
  const initialCount = JSON.parse(initialCountResponse).chain_stats.tx_count

  const txid = execSync(`nigiri faucet ${address} ${amount}`, { encoding: 'utf8', stdio: 'pipe' }).trim()
  console.log(`  Transaction ID: ${txid}`)

  for (let i = 1; i <= maxRetries; i++) {
    await sleep(retryDelay)
    try {
      const newCountResponse = execSync(`curl -s http://localhost:3000/address/${address}`, { encoding: 'utf8' })
      const newCount = JSON.parse(newCountResponse).chain_stats.tx_count
      if (newCount > initialCount) {
        console.log('  ✔ Confirmed')
        return txid
      }
    } catch {
      // Continue retrying
    }
    if (i < maxRetries) {
      console.log(`  Waiting for confirmation (${i}/${maxRetries})...`)
    }
  }
  throw new Error(`Timed out waiting for faucet transaction to confirm.`)
}

async function waitForArkReady(maxRetries = 10, retryDelay = 1000) {
  const cmd = 'docker exec arkd arkd wallet status'
  return waitForCmd(cmd, maxRetries, retryDelay)
}

async function setupArkServer() {
  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('  Setting up ark server')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // Wait for ark server to be ready first
    await waitForArkServer()

    // nigiri already initializes arkd
    // Create and unlock arkd wallet
    console.log('Creating ark wallet...')
    await execCommand(`${arkdExec} arkd wallet create --password secret`, true)
    console.log('  ✔ Wallet created')

    console.log('Unlocking ark wallet...')
    await execCommand(`${arkdExec} arkd wallet unlock --password secret`, true)
    console.log('  ✔ Wallet unlocked')

    // Wait for wallet to be ready and synced
    await waitForWalletReady()

    // Get and log the server info
    const serverInfo = JSON.parse(execSync('curl -s http://localhost:7070/v1/info').toString())
    console.log(`\nark Server Public Key: ${serverInfo.signerPubkey}`)

    // Get arkd address and fund it with nigiri faucet
    console.log('\nFunding ark wallet...')
    const arkdAddress = await execCommand(`${arkdExec} arkd wallet address`)
    console.log(`  Address: ${arkdAddress}`)

    for (let i = 0; i < 10; i++) {
      await execCommand(`nigiri faucet ${arkdAddress}`, true)
    }
    console.log('  ✔ Funded with 10 BTC')

    // Wait for transaction to be confirmed
    await sleep(5000)

    // Initialize ark client
    console.log('\nInitializing ark client...')
    await execCommand(
      `${arkdExec} ark init --server-url http://localhost:7070 --explorer http://chopsticks:3000 --password secret`,
      true,
    )
    console.log('  ✔ Client initialized')

    // fund the ark-cli with 1 vtxo worth of 2000000
    console.log('\nCreating and redeeming notes...')
    const note = await execCommand(`${arkdExec} arkd note --amount 2000000`)
    const cmd = `${arkdExec} ark redeem-notes -n ${note} --password secret`
    await execCommand(cmd, true)
    console.log('  ✔ Notes redeemed')

    console.log('\n✔ ark server and client setup completed')
  } catch (error) {
    console.error('\n✗ Error setting up ark server:', error)
    throw error
  }
}

async function setupBoltz() {
  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('  Setting up Boltz')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    console.log('Waiting for LND to be ready...')
    await waitForCmd('docker exec lnd lncli --network=regtest getinfo')

    await sleep(2000)

    console.log('\nFunding LND...')
    await execCommand('nigiri faucet lnd 1', true)
    console.log('  ✔ Funded')

    console.log('\nStarting Boltz LND container...')
    await execCommand('docker compose -f test.docker-compose.yml up -d boltz-lnd', true)
    console.log('  ✔ Container started')

    console.log('\nWaiting for Boltz LND to be ready...')
    await waitForCmd('docker exec boltz-lnd lncli --network=regtest getinfo')

    console.log('\nFunding Boltz LND...')
    const addressResponse = execSync(`${lncli} newaddress p2wkh`, { encoding: 'utf8' })
    const address = JSON.parse(addressResponse).address
    console.log(`  Address: ${address}`)
    await faucet(address, 1)

    console.log('\nConnecting LND instances...')
    const nigiriInfoResponse = execSync('docker exec lnd lncli --network=regtest getinfo', { encoding: 'utf8' })
    const nigiriPubkey = JSON.parse(nigiriInfoResponse).identity_pubkey
    await execCommand(`${lncli} connect ${nigiriPubkey}@lnd:9735`, true)

    // Check if peers are connected
    const boltzPeersResponse = execSync(`${lncli} listpeers`, { encoding: 'utf8' })
    const nigiriPeersResponse = execSync('docker exec lnd lncli --network=regtest listpeers', { encoding: 'utf8' })
    const boltzPeersCount = JSON.parse(boltzPeersResponse).peers?.length || 0
    const nigiriPeersCount = JSON.parse(nigiriPeersResponse).peers?.length || 0

    if (boltzPeersCount === 1 && nigiriPeersCount === 1) {
      console.log('  ✔ Instances connected')
    } else {
      console.error('  ✗ Error connecting instances')
      process.exit(1)
    }

    console.log('\nOpening channel between LND instances...')
    await execCommand(`${lncli} openchannel --node_key="${nigiriPubkey}" --local_amt=100000`, true)
    console.log('  ✔ Channel opened (100k sats)')

    console.log('\nMining blocks to mature channel...')
    await execCommand('nigiri rpc --generate 10', true)
    console.log('  ✔ 10 blocks mined')
    await sleep(5000)

    console.log('\nBalancing channel...')
    const invoiceResponse = execSync('docker exec lnd lncli --network=regtest addinvoice --amt 50000', {
      encoding: 'utf8',
    })
    const invoice = JSON.parse(invoiceResponse).payment_request
    await execCommand(`${lncli} payinvoice --force ${invoice}`, true)
    console.log('  ✔ Channel balanced (50k sats each side)')

    console.log('\nWaiting for ark to be ready...')
    await waitForArkReady()

    console.log('\nStarting Fulmine container...')
    await execCommand('docker compose -f test.docker-compose.yml up -d boltz-fulmine', true)
    console.log('  ✔ Container started')
    await sleep(5000)

    console.log('\nCreating Fulmine wallet...')
    await execCommand(
      `curl -s -X POST http://localhost:7003/api/v1/wallet/create -H "Content-Type: application/json" -d '{"private_key": "5b9902c1098cc0f4c7e91066ef3227e292d994a50ebc33961ac6daa656fd242e", "password": "password", "server_url": "http://arkd:7070"}'`,
      true,
    )
    console.log('  ✔ Wallet created')

    await sleep(5000)

    console.log('\nUnlocking Fulmine wallet...')
    await execCommand(
      `curl -s -X POST http://localhost:7003/api/v1/wallet/unlock -H "Content-Type: application/json" -d '{"password": "password"}'`,
      true,
    )
    console.log('  ✔ Wallet unlocked')

    await sleep(2000)

    console.log('\nGetting Fulmine address...')
    const fulmineAddressResponse = execSync('curl -s -X GET http://localhost:7003/api/v1/address', { encoding: 'utf8' })
    const fulmineAddress = JSON.parse(fulmineAddressResponse).address.split('?')[0].split(':')[1]
    console.log(`  Address: ${fulmineAddress}`)

    console.log('\nFunding Fulmine address...')
    await faucet(fulmineAddress, 1)

    console.log('\nSettling funds in Fulmine...')
    await execCommand('curl -s -X GET http://localhost:7003/api/v1/settle', true)
    console.log('  ✔ Funds settled')

    console.log('\nStarting Boltz backend and PostgreSQL...')
    await execCommand('docker compose -f test.docker-compose.yml up -d boltz-postgres boltz', true)
    console.log('  ✔ Containers started')

    console.log('\nStarting CORS proxy...')
    await execCommand('docker compose -f test.docker-compose.yml up -d cors', true)
    console.log('  ✔ Container started')

    console.log('\n✔ Boltz setup completed')
  } catch (error) {
    console.error('\n✗ Error setting up Boltz:', error)
    throw error
  }
}

// Run setup
async function setup() {
  try {
    await setupArkServer()
    await setupBoltz()
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('  ✓ regtest setup completed successfully')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  } catch (error) {
    console.error('\n✗ Setup failed:', error)
    process.exit(1)
  }
}

setup()
