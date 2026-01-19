#!/usr/bin/env node

/**
 * Unilateral Exit CLI
 *
 * A CLI tool to perform unilateral exit from the ARK protocol using a nsec private key.
 *
 * Usage:
 *   pnpm tsx scripts/unilateral-exit.ts --nsec <nsec> --address <btc-address> [options]
 *
 * Options:
 *   --nsec <nsec>              Nostr secret key (nsec format)
 *   --address <address>        Bitcoin address to receive funds
 *   --ark-server <url>         ARK server URL (default: https://mutinynet.arkade.sh)
 *   --esplora <url>            Esplora API URL (default: https://mutinynet.com/api)
 *   --network <network>        Bitcoin network (default: testnet)
 *   --vtxo <txid:vout>         Specific VTXO to exit (optional, exits all if not specified)
 *   --help                     Show this help message
 */

import { Wallet, SingleKey, Unroll, OnchainWallet } from '@arkade-os/sdk'
import { FileSystemStorageAdapter } from '@arkade-os/sdk/adapters/fileSystem'
import { nip19 } from 'nostr-tools'
import * as path from 'path'
import * as os from 'os'

interface CLIOptions {
  nsec: string
  address: string
  arkServer: string
  esplora: string
  network: 'mainnet' | 'testnet' | 'regtest'
  vtxo?: string
}

function parseArgs(): CLIOptions | null {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.includes('-h')) {
    printHelp()
    process.exit(0)
  }

  const options: Partial<CLIOptions> = {
    arkServer: process.env.ARK_SERVER || 'https://mutinynet.arkade.sh',
    esplora: process.env.ESPLORA_URL || 'https://mutinynet.com/api',
    network: (process.env.NETWORK as any) || 'testnet',
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--nsec':
        options.nsec = args[++i]
        break
      case '--address':
        options.address = args[++i]
        break
      case '--ark-server':
        options.arkServer = args[++i]
        break
      case '--esplora':
        options.esplora = args[++i]
        break
      case '--network':
        options.network = args[++i] as any
        break
      case '--vtxo':
        options.vtxo = args[++i]
        break
    }
  }

  if (!options.nsec) {
    console.error('Error: --nsec is required')
    printHelp()
    return null
  }

  if (!options.address) {
    console.error('Error: --address is required')
    printHelp()
    return null
  }

  return options as CLIOptions
}

function printHelp() {
  console.log(`
Unilateral Exit CLI

A CLI tool to perform unilateral exit from the ARK protocol using a nsec private key.

Usage:
  pnpm tsx scripts/unilateral-exit.ts --nsec <nsec> --address <btc-address> [options]

Options:
  --nsec <nsec>              Nostr secret key (nsec format)
  --address <address>        Bitcoin address to receive funds
  --ark-server <url>         ARK server URL (default: https://mutinynet.arkade.sh)
  --esplora <url>            Esplora API URL (default: https://mutinynet.com/api)
  --network <network>        Bitcoin network: mainnet, testnet, or regtest (default: testnet)
  --vtxo <txid:vout>         Specific VTXO to exit (optional, exits all if not specified)
  --help, -h                 Show this help message

Environment Variables:
  ARK_SERVER                 ARK server URL
  ESPLORA_URL                Esplora API URL
  NETWORK                    Bitcoin network

Examples:
  # Exit all VTXOs
  pnpm tsx scripts/unilateral-exit.ts \\
    --nsec nsec1... \\
    --address tb1q...

  # Exit specific VTXO
  pnpm tsx scripts/unilateral-exit.ts \\
    --nsec nsec1... \\
    --address tb1q... \\
    --vtxo abc123...:0
`)
}

function nsecToPrivateKey(nsec: string): Uint8Array {
  try {
    const { type, data } = nip19.decode(nsec)
    if (type !== 'nsec') {
      throw new Error('Invalid nsec format')
    }
    return data
  } catch (error) {
    throw new Error(`Failed to decode nsec: ${error}`)
  }
}

async function main() {
  const options = parseArgs()
  if (!options) {
    process.exit(1)
  }

  console.log('🚀 Unilateral Exit CLI\n')
  console.log(`Network: ${options.network}`)
  console.log(`ARK Server: ${options.arkServer}`)
  console.log(`Esplora: ${options.esplora}`)
  console.log(`Destination: ${options.address}\n`)

  try {
    // Decode nsec to private key
    console.log('🔑 Loading private key from nsec...')
    const privateKey = nsecToPrivateKey(options.nsec)
    const identity = SingleKey.fromBytes(privateKey)
    console.log('✅ Private key loaded\n')

    // Create storage adapter
    const storagePath = path.join(os.homedir(), '.arkade-cli')
    const storage = new FileSystemStorageAdapter(storagePath)
    console.log(`💾 Using storage: ${storagePath}\n`)

    // Create wallet
    console.log('📱 Initializing ARK wallet...')
    const wallet = await Wallet.create({
      identity,
      arkServerUrl: options.arkServer,
      esploraUrl: options.esplora,
      storage,
    })
    console.log('✅ Wallet initialized\n')

    // Get wallet info
    const address = await wallet.getAddress()
    const balance = await wallet.getBalance()
    console.log(`Wallet Address: ${address}`)
    console.log(`Total Balance: ${balance.total} sats`)
    console.log(`Available: ${balance.available} sats`)
    console.log(`Settled: ${balance.settled} sats\n`)

    // Get VTXOs
    console.log('🔍 Fetching VTXOs...')
    const vtxos = await wallet.getVtxos()

    if (vtxos.length === 0) {
      console.log('ℹ️  No VTXOs found')
      process.exit(0)
    }

    console.log(`Found ${vtxos.length} VTXO(s)\n`)

    // Filter VTXOs if specific one requested
    let vtxosToExit = vtxos
    if (options.vtxo) {
      const [txid, voutStr] = options.vtxo.split(':')
      const vout = parseInt(voutStr)
      vtxosToExit = vtxos.filter(v => v.txid === txid && v.vout === vout)

      if (vtxosToExit.length === 0) {
        console.error(`❌ VTXO ${options.vtxo} not found`)
        process.exit(1)
      }
      console.log(`🎯 Exiting specific VTXO: ${txid}:${vout}\n`)
    } else {
      console.log('🎯 Exiting all VTXOs\n')
    }

    // Create onchain wallet for P2A fees
    console.log('💰 Creating onchain wallet for fees...')
    const onchainIdentity = identity // Use same key for simplicity
    const onchainWallet = await OnchainWallet.create(
      onchainIdentity,
      options.network
    )
    const onchainAddress = await onchainWallet.address
    console.log(`Onchain Address: ${onchainAddress}`)
    console.log('⚠️  Note: Onchain wallet needs funds to pay for P2A transaction fees\n')

    // Process each VTXO
    for (const vtxo of vtxosToExit) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`📤 Processing VTXO: ${vtxo.txid}:${vtxo.vout}`)
      console.log(`   Amount: ${vtxo.value} sats`)
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

      try {
        // Step 1: Unroll the VTXO
        console.log('🔄 Step 1: Unrolling VTXO...\n')

        const vtxoRef = { txid: vtxo.txid, vout: vtxo.vout }
        const session = await Unroll.Session.create(
          vtxoRef,
          onchainWallet,
          onchainWallet.provider,
          wallet.indexerProvider
        )

        let unrollComplete = false
        let lastTxid = ''

        for await (const step of session) {
          switch (step.type) {
            case Unroll.StepType.WAIT:
              console.log(`   ⏳ Waiting for transaction ${step.txid} to be confirmed...`)
              lastTxid = step.txid
              break

            case Unroll.StepType.UNROLL:
              console.log(`   📡 Broadcasting transaction ${step.tx.id}...`)
              lastTxid = step.tx.id
              break

            case Unroll.StepType.DONE:
              console.log(`   ✅ Unrolling complete for VTXO ${step.vtxoTxid}`)
              unrollComplete = true
              break
          }
        }

        if (!unrollComplete) {
          console.log('   ❌ Unrolling did not complete')
          continue
        }

        console.log('\n✅ Step 1 complete: VTXO unrolled\n')

        // Step 2: Complete the exit
        console.log('🔄 Step 2: Completing exit (waiting for timelock)...\n')

        try {
          await Unroll.completeUnroll(
            wallet,
            [vtxo.txid],
            options.address
          )
          console.log('✅ Step 2 complete: Exit completed!\n')
          console.log(`💰 Funds should arrive at ${options.address}`)
        } catch (error: any) {
          if (error.message?.includes('timelock')) {
            console.log('⏰ Timelock has not expired yet')
            console.log('ℹ️  VTXO is unrolled but you need to wait for the timelock to expire')
            console.log('   Run this command again after the timelock period')
          } else {
            throw error
          }
        }
      } catch (error: any) {
        console.error(`❌ Error processing VTXO ${vtxo.txid}:${vtxo.vout}:`, error.message)
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎉 Unilateral exit process completed!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  } catch (error: any) {
    console.error('\n❌ Error:', error.message)
    if (error.stack) {
      console.error('\nStack trace:')
      console.error(error.stack)
    }
    process.exit(1)
  }
}

main()
