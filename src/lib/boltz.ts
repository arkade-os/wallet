import * as bolt11 from './bolt11'
import { consoleLog, consoleError } from './logs'
import { NetworkName } from '@arkade-os/sdk/dist/types/networks'
import { Wallet } from './types'
import { base64, hex } from '@scure/base'
import { sha256 } from '@noble/hashes/sha2'
import { ripemd160 } from '@noble/hashes/legacy'
import { randomBytes } from '@noble/hashes/utils'
import {
  ServiceWorkerWallet,
  VHTLC,
  buildOffchainTx,
  RestArkProvider,
  RestIndexerProvider,
  CSVMultisigTapscript,
  ArkAddress,
  ConditionWitness,
  setArkPsbtField,
} from '@arkade-os/sdk'
import { AspInfo } from '../providers/asp'
import { Transaction } from '@scure/btc-signer'
import { hash160 } from '@scure/btc-signer/utils'

// Boltz swap status types
export type SwapStatus =
  | 'swap.created'
  | 'transaction.mempool'
  | 'transaction.confirmed'
  | 'invoice.set'
  | 'invoice.pending'
  | 'invoice.paid'
  | 'invoice.failedToPay'
  | 'invoice.settled'
  | 'invoice.expired'
  | 'transaction.claim.pending'
  | 'transaction.claimed'
  | 'swap.expired'
  | 'transaction.lockupFailed'
  | 'transaction.failed'
  | 'transaction.refunded'
  | null

// Callback for swap status updates
export type SwapStatusCallback = (status: SwapStatus, error?: string) => void

// Map to store active websocket connections
const activeConnections: Record<string, WebSocket> = {}

// Store websocket connection promises to avoid duplicate connection attempts
const connectionPromises: Record<string, Promise<WebSocket | null>> = {}

type SwapSubmarineGetResponse = {
  ARK: {
    BTC: {
      hash: string
      rate: number
      limits: {
        maximal: number
        minimal: number
        maximalZeroConf: number
      }
      fees: {
        percentage: number
        minerFees: number
      }
    }
  }
}

type SwapSubmarinePostResponse = {
  id: string
  address: string
  expectedAmount: number
  claimPublicKey: string
  acceptZeroConf: boolean
  timeoutBlockHeights: {
    unilateralClaim: number
    unilateralRefund: number
    unilateralRefundWithoutReceiver: number
  }
}

type SwapReversePostResponse = {
  id: string
  invoice: string
  onchainAmount: number
  lockupAddress: string
  refundPublicKey: string
  timeoutBlockHeights: {
    refund: number
    unilateralClaim: number
    unilateralRefund: number
    unilateralRefundWithoutReceiver: number
  }
}

export const getBoltzApiUrl = (network: string): string => {
  switch (network) {
    case 'bitcoin':
      return 'https://boltz.arkade.sh'
    case 'regtest':
      return 'http://localhost:9069'
    default:
      return ''
  }
}

const getBoltzWsUrl = (network: string) => {
  const url = getBoltzApiUrl(network)
    .replace(/^http(s)?:\/\//, 'ws$1://')
    .replace('9069', '9004') // special regtest case
  return `${url}/v2/ws`
}

export const getBoltzLimits = async (network: string): Promise<{ min: number; max: number }> => {
  const url = getBoltzApiUrl(network)
  if (!url) throw new Error('Invalid network for Boltz API')
  const response = await fetch(`${url}/v2/swap/submarine`)
  if (!response.ok) {
    const errorData = await response.json()
    throw errorData.error || 'Failed to fetch limits'
  }
  const json: SwapSubmarineGetResponse = await response.json()
  const { minimal, maximal } = json.ARK.BTC.limits
  return {
    min: minimal,
    max: maximal,
  }
}

export const getInvoiceSatoshis = (invoice: string): number => {
  return bolt11.decode(invoice).satoshis ?? 0
}

export const submarineSwap = async (
  invoice: string,
  wallet: Wallet,
): Promise<{ address: string; amount: number; id: string }> => {
  const refundPublicKey = wallet.pubkey
  if (!refundPublicKey) throw 'Failed to get public key'
  if (!wallet.network) throw 'Failed to get network'

  const response = await fetch(`${getBoltzApiUrl(wallet.network)}/v2/swap/submarine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'ARK',
      to: 'BTC',
      invoice,
      refundPublicKey,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw errorData.error || 'Failed to process Lightning payment'
  }

  const { address, expectedAmount: amount, id } = (await response.json()) as SwapSubmarinePostResponse
  return { address, amount, id }
}

/**
 * Makes a reverse swap using Boltz API
 * @param invoiceAmount The amount in satoshis to swap
 * @param wallet The user's wallet object
 * @param svcWallet The service worker wallet object
 * @param aspInfo The ASP information object
 * @param onInvoiceCreated Callback to handle the created invoice
 * @param onSwapCompleted Callback to handle the completed swap
 * @throws Will throw an error if the network is not available, or if the invoice creation fails
 * @returns A promise that resolves when the swap is successfully initiated
 */
export const reverseSwap = async (
  invoiceAmount: number,
  wallet: Wallet,
  svcWallet: ServiceWorkerWallet,
  aspInfo: AspInfo,
  onInvoiceCreated: (invoice: string) => void,
  onSwapCompleted: (receivedAmount: number) => void,
): Promise<void> => {
  if (!wallet.network) throw 'Network not available for reverse swap'
  if (!wallet.pubkey) throw 'Public key not available for reverse swap'

  // get the public key to claim the VHTLC
  const claimPublicKey = wallet.pubkey
  if (!claimPublicKey) throw 'Failed to get public key'

  // create random preimage and its hash
  const preimage = randomBytes(32)
  const preimageHash = hex.encode(sha256(preimage))
  if (!preimageHash) throw 'Failed to get preimage hash'

  // create reverse swap
  const response = await fetch(`${getBoltzApiUrl(wallet.network)}/v2/swap/reverse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'BTC',
      to: 'ARK',
      invoiceAmount,
      claimPublicKey,
      preimageHash,
    }),
  })

  // check if the response is ok
  if (!response.ok) {
    const errorData = await response.json()
    throw errorData.error || 'Failed to process Lightning payment'
  }

  // parse the response and check if the invoice was created
  const swapInfo = (await response.json()) as SwapReversePostResponse
  if (!swapInfo.invoice) throw new Error('Failed to create reverse swap invoice')

  // create expected VHTLC script
  const vhtlcScript = createVHTLCScript({
    network: wallet.network,
    preimage,
    swapInfo,
    receiverPubkey: wallet.pubkey,
    senderPubkey: swapInfo.refundPublicKey,
    serverPubkey: aspInfo.signerPubkey,
  })

  if (!vhtlcScript) return

  // callback to pass invoice to the UI
  onInvoiceCreated(swapInfo.invoice)

  // wait for invoice payment and claim the VHTLC
  waitAndClaim(swapInfo, preimage, wallet, svcWallet, aspInfo, onSwapCompleted)
}

/**
 * Waits for the reverse swap invoice to be paid and claims the VHTLC
 * This function establishes a WebSocket connection to Boltz server
 * and listens for updates on the swap status.
 * It handles various swap states such as creation, payment,
 * transaction confirmation, and expiration.
 * @param swapInfo The swap information object containing details about the reverse swap
 * @param preimage The preimage used for the VHTLC claim
 * @param wallet The user's wallet object
 * @param svcWallet The service worker wallet object
 * @param aspInfo The ASP information object
 * @param onSwapCompleted Callback to handle the completed swap
 * @throws Will throw an error if the wallet network is not available
 * @returns A promise that resolves when the swap is successfully claimed
 */
const waitAndClaim = async (
  swapInfo: SwapReversePostResponse,
  preimage: Uint8Array,
  wallet: Wallet,
  svcWallet: ServiceWorkerWallet,
  aspInfo: AspInfo,
  onSwapCompleted: (amount: number) => void,
) => {
  if (!wallet.network) throw 'Network not available for reverse swap'

  // Create a WebSocket and subscribe to updates for the created swap
  const webSocket = new WebSocket(getBoltzWsUrl(wallet.network))

  webSocket.onopen = () => {
    webSocket.send(
      JSON.stringify({
        op: 'subscribe',
        channel: 'swap.update',
        args: [swapInfo.id],
      }),
    )
  }

  webSocket.onmessage = async (rawMsg) => {
    const msg = JSON.parse(rawMsg.data)

    if (msg.event !== 'update') return

    if (msg.args[0].id !== swapInfo.id) return

    if (msg.args[0].error) {
      webSocket.close()
      onSwapCompleted(0)
      return
    }

    switch (msg.args[0].status) {
      // "swap.created" means Boltz is waiting for the invoice to be paid
      case 'swap.created': {
        consoleLog('Waiting for invoice to be paid')
        break
      }

      // Boltz's lockup transaction is found in the mempool (or already confirmed)
      // which will only happen after the user paid the Lightning hold invoice
      case 'transaction.mempool':
      case 'transaction.confirmed': {
        // TODO: save claim to be able to retry if something fails
        consoleLog('Starting VHTLC claim process...')
        const receivedAmount = await claimVHTLC(swapInfo, preimage, wallet, svcWallet, aspInfo)
        // removeClaim(claimInfo, wallet.network)
        onSwapCompleted(receivedAmount)
        break
      }

      case 'invoice.settled': {
        consoleLog('Invoice was settled')
        webSocket.close()
        break
      }

      case 'invoice.expired':
      case 'swap.expired':
      case 'transaction.failed':
      case 'transaction.refunded': {
        consoleError('Expiration, fail or refund')
        // removeClaim(claimInfo, wallet.network)
        webSocket.close()
        break
      }
    }
  }
}

/**
 * Claims the VHTLC using the provided swap information and preimage
 * This function builds the VHTLC script, validates it,
 * retrieves the spendable VTXOs,
 * and creates a virtual transaction to claim the VHTLC.
 * @param swapInfo The swap information object containing details about the reverse swap
 * @param preimage The preimage used for the VHTLC claim
 * @param wallet The user's wallet object
 * @param svcWallet The service worker wallet object
 * @param aspInfo The ASP information object
 * @throws Will throw an error if the wallet public key is not available
 * @return A promise that resolves to the amount claimed from the VHTLC
 */
const claimVHTLC = async (
  swapInfo: SwapReversePostResponse,
  preimage: Uint8Array,
  wallet: Wallet,
  svcWallet: ServiceWorkerWallet,
  aspInfo: AspInfo,
): Promise<number> => {
  if (!wallet.network) throw 'Network not available for reverse swap'
  if (!wallet.pubkey) throw 'Pubkey not available for reverse swap'

  // prepare variables for claiming the VHTLC
  const amount = swapInfo.onchainAmount
  const address = await svcWallet.getAddress()
  if (!address) throw 'Failed to get ark address from service worker wallet'

  // validate we are using a x-only server public key
  let serverXOnlyPublicKey = hex.decode(aspInfo.signerPubkey)
  if (serverXOnlyPublicKey.length == 33) {
    serverXOnlyPublicKey = serverXOnlyPublicKey.slice(1)
  } else if (serverXOnlyPublicKey.length !== 32) {
    throw new Error(`Invalid server public key length: ${serverXOnlyPublicKey.length}`)
  }

  const vhtlcScript = createVHTLCScript({
    network: wallet.network,
    preimage,
    receiverPubkey: wallet.pubkey,
    senderPubkey: swapInfo.refundPublicKey,
    serverPubkey: aspInfo.signerPubkey,
    swapInfo,
  })

  if (!vhtlcScript) {
    throw new Error('Failed to create VHTLC script for reverse swap')
  }

  // get spendable VTXOs from the lockup address
  const arkProvider = new RestArkProvider(aspInfo.url)
  const indexerProvider = new RestIndexerProvider(aspInfo.url)
  const spendableVtxos = await indexerProvider.getVtxos({
    scripts: [hex.encode(vhtlcScript.pkScript)],
    spendableOnly: true,
  })
  if (spendableVtxos.vtxos.length === 0) {
    throw new Error('No spendable virtual coins found')
  }

  // signing a VTHLC needs an extra witness element to be added to the PSBT input
  // reveal the secret in the PSBT, thus the server can verify the claim script
  // this witness must satisfy the preimageHash condition
  const vhtlcIdentity = {
    sign: async (tx: any, inputIndexes?: number[]) => {
      const cpy = tx.clone()
      let signedTx = await svcWallet.sign(cpy, inputIndexes)
      signedTx = Transaction.fromPSBT(signedTx.toPSBT(), { allowUnknown: true })
      setArkPsbtField(signedTx, 0, ConditionWitness, [preimage])
      return signedTx
    },
    xOnlyPublicKey: svcWallet.xOnlyPublicKey,
    signerSession: svcWallet.signerSession,
  }

  // Create the server unroll script for checkpoint transactions
  const serverUnrollScript = CSVMultisigTapscript.encode({
    pubkeys: [serverXOnlyPublicKey],
    timelock: {
      type: aspInfo.unilateralExitDelay < 512 ? 'blocks' : 'seconds',
      value: aspInfo.unilateralExitDelay,
    },
  })

  // create the virtual transaction to claim the VHTLC
  const { arkTx, checkpoints } = buildOffchainTx(
    [
      {
        ...spendableVtxos.vtxos[0],
        tapLeafScript: vhtlcScript.refund(),
        tapTree: vhtlcScript.encode(),
      },
    ],
    [
      {
        amount: BigInt(amount),
        script: ArkAddress.decode(address).pkScript,
      },
    ],
    serverUnrollScript,
  )

  // sign and "broadcast" the virtual transaction
  const signedArkTx = await vhtlcIdentity.sign(arkTx)
  console.log('signedArkTx:', base64.encode(signedArkTx.toPSBT()))
  const { arkTxid, signedCheckpointTxs } = await arkProvider.submitTx(
    base64.encode(signedArkTx.toPSBT()),
    checkpoints.map((c) => base64.encode(c.toPSBT())),
  )

  const finalCheckpoints = await Promise.all(
    signedCheckpointTxs.map(async (c) => {
      const tx = Transaction.fromPSBT(base64.decode(c), {
        allowUnknown: true,
      })
      const signedCheckpoint = await vhtlcIdentity.sign(tx, [0])
      return base64.encode(signedCheckpoint.toPSBT())
    }),
  )
  await arkProvider.finalizeTx(arkTxid, finalCheckpoints)

  console.log('Successfully claimed VHTLC! Transaction ID:', arkTxid)
  return amount
}

interface createVHTLCScriptProps {
  network: string
  preimage: Uint8Array
  swapInfo: SwapReversePostResponse
  receiverPubkey: string
  senderPubkey: string
  serverPubkey: string
}

const createVHTLCScript = ({
  network,
  preimage,
  receiverPubkey,
  senderPubkey,
  serverPubkey,
  swapInfo,
}: createVHTLCScriptProps): VHTLC.Script | undefined => {
  // validate we are using a x-only receiver public key
  let receiverXOnlyPublicKey = hex.decode(receiverPubkey)
  if (receiverXOnlyPublicKey.length == 33) {
    receiverXOnlyPublicKey = receiverXOnlyPublicKey.slice(1)
  } else if (receiverXOnlyPublicKey.length !== 32) {
    throw new Error(`Invalid receiver public key length: ${receiverXOnlyPublicKey.length}`)
  }

  // validate we are using a x-only sender public key
  let senderXOnlyPublicKey = hex.decode(senderPubkey)
  if (senderXOnlyPublicKey.length == 33) {
    senderXOnlyPublicKey = senderXOnlyPublicKey.slice(1)
  } else if (senderXOnlyPublicKey.length !== 32) {
    throw new Error(`Invalid sender public key length: ${senderXOnlyPublicKey.length}`)
  }

  // validate we are using a x-only server public key
  let serverXOnlyPublicKey = hex.decode(serverPubkey)
  if (serverXOnlyPublicKey.length == 33) {
    serverXOnlyPublicKey = serverXOnlyPublicKey.slice(1)
  } else if (serverXOnlyPublicKey.length !== 32) {
    throw new Error(`Invalid server public key length: ${serverXOnlyPublicKey.length}`)
  }

  console.log('public keys for VHTLC script:', {
    senderPubkey,
    receiverPubkey,
    serverPubkey,
  })

  console.log('creating VHTLC script', {
    preimageHash: hex.encode(ripemd160(sha256(preimage))),
    sender: hex.encode(senderXOnlyPublicKey),
    receiver: hex.encode(receiverXOnlyPublicKey),
    server: hex.encode(serverXOnlyPublicKey),
    refundLocktime: BigInt(swapInfo.timeoutBlockHeights.refund),
    unilateralClaimDelay: {
      type: 'blocks',
      value: BigInt(swapInfo.timeoutBlockHeights.unilateralClaim),
    },
    unilateralRefundDelay: {
      type: 'blocks',
      value: BigInt(swapInfo.timeoutBlockHeights.unilateralRefund),
    },
    unilateralRefundWithoutReceiverDelay: {
      type: 'blocks',
      value: BigInt(swapInfo.timeoutBlockHeights.unilateralRefundWithoutReceiver),
    },
  })

  console.log('preimage plain:', hex.encode(preimage))
  console.log('preimage hash160:', hex.encode(hash160(preimage)))
  console.log('preimage ripemd160(sha256)):', hex.encode(ripemd160(sha256(preimage))))

  const vhtlcScript = new VHTLC.Script({
    preimageHash: ripemd160(sha256(preimage)),
    sender: senderXOnlyPublicKey,
    receiver: receiverXOnlyPublicKey,
    server: serverXOnlyPublicKey,
    refundLocktime: BigInt(swapInfo.timeoutBlockHeights.refund),
    unilateralClaimDelay: {
      type: 'blocks',
      value: BigInt(swapInfo.timeoutBlockHeights.unilateralClaim),
    },
    unilateralRefundDelay: {
      type: 'blocks',
      value: BigInt(swapInfo.timeoutBlockHeights.unilateralRefund),
    },
    unilateralRefundWithoutReceiverDelay: {
      type: 'blocks',
      value: BigInt(swapInfo.timeoutBlockHeights.unilateralRefundWithoutReceiver),
    },
  })

  if (!vhtlcScript) {
    throw new Error('Failed to create VHTLC script')
  }

  // validate vhtlc script
  const hrp = network === 'bitcoin' ? 'ark' : 'tark'
  const vhtlcAddress = vhtlcScript.address(hrp, serverXOnlyPublicKey).encode()
  console.log('VHTLC address:', vhtlcAddress)
  if (vhtlcAddress !== swapInfo.lockupAddress) {
    console.log('Boltz is trying to scam us', vhtlcAddress, swapInfo.lockupAddress)
    return undefined
    // throw new Error('Boltz is trying to scam us')
  }

  return vhtlcScript
}

/**
 * Establish a WebSocket connection to Boltz server ahead of time
 * This allows us to warm up the connection before we need it
 * @param network The network name (bitcoin or regtest)
 * @returns Promise that resolves to the WebSocket or null if connection fails
 */
export const preconnectBoltzWebSocket = async (network: NetworkName): Promise<WebSocket | null> => {
  // Use a unique key for each network
  const cacheKey = `preconnect-${network}`

  // If we already have a connection promise, return it
  if (cacheKey in connectionPromises) {
    return connectionPromises[cacheKey]
  }

  // Otherwise create a new connection
  connectionPromises[cacheKey] = new Promise((resolve) => {
    try {
      const wsUrl = getBoltzWsUrl(network)
      if (!wsUrl) {
        consoleLog('Invalid network for Boltz API preconnection')
        resolve(null)
        return
      }

      consoleLog(`Preconnecting to Boltz WebSocket at ${wsUrl}`)
      const ws = new WebSocket(wsUrl)

      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          consoleLog('Preconnection WebSocket timed out')
          resolve(null)
          // Cleanup the failed connection attempt
          delete connectionPromises[cacheKey]
        }
      }, 5000)

      ws.onopen = () => {
        clearTimeout(connectionTimeout)
        consoleLog('Boltz WebSocket preconnection established')
        resolve(ws)
      }

      ws.onerror = () => {
        clearTimeout(connectionTimeout)
        consoleLog('Boltz WebSocket preconnection failed')
        resolve(null)
        // Cleanup the failed connection attempt
        delete connectionPromises[cacheKey]
      }

      ws.onclose = () => {
        consoleLog('Boltz WebSocket preconnection closed')
        // Cleanup on close so we can try again next time
        delete connectionPromises[cacheKey]
      }
    } catch (err) {
      consoleError(err, 'Failed to preconnect to Boltz WebSocket')
      resolve(null)
      // Cleanup the failed connection attempt
      delete connectionPromises[cacheKey]
    }
  })

  return connectionPromises[cacheKey]
}

/**
 * Monitors a Boltz swap via WebSocket using the proper subscription protocol
 * Uses silent error handling and reconnection to avoid showing errors to users
 * @param swapId The ID of the swap to monitor
 * @param network The network name
 * @param onStatusUpdate Callback function for status updates
 * @param retryCount Optional retry counter for internal use
 * @param preconnectedWs Optional preconnected WebSocket
 */
export const monitorSwap = (
  swapId: string,
  network: NetworkName,
  onStatusUpdate: SwapStatusCallback,
  retryCount: number = 0,
  preconnectedWs?: WebSocket,
): void => {
  // Maximum immediate retries for initial connection
  const MAX_IMMEDIATE_RETRIES = 3
  // Stop any existing connection for this swap
  stopMonitoring(swapId)

  try {
    const baseUrl = getBoltzApiUrl(network)
    if (!baseUrl) {
      // Silently handle error - just log it but don't update UI
      consoleLog('Invalid network for Boltz API')
      return
    }

    // Use preconnected WebSocket if available, otherwise create a new one
    let ws: WebSocket | null = null
    if (preconnectedWs && preconnectedWs.readyState === WebSocket.OPEN) {
      consoleLog('Using preconnected WebSocket for swap monitoring')
      ws = preconnectedWs
    } else {
      const wsUrl = getBoltzWsUrl(network)

      consoleLog(`Connecting to Boltz WebSocket at ${wsUrl} (attempt ${retryCount + 1})`)
      ws = new WebSocket(wsUrl)
    }

    // Set connection timeout to detect stalled connection attempts
    const connectionTimeoutMs = 5000 // 5 seconds
    const connectionTimeout = setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        consoleLog(`WebSocket connection timed out after ${connectionTimeoutMs}ms`)
        ws.close()

        // Try REST API fallback while retrying WebSocket
        // IMPORTANT: We don't pass error to UI - silently handle connection issues
        if (retryCount === 0) {
          consoleLog('Attempting to fetch initial status via REST API')
          fetchSwapStatus(swapId, network).then((status) => {
            if (status) {
              consoleLog(`Got initial status via REST API: ${status}`)
              onStatusUpdate(status)
            }
          })
        }

        // Retry connection if under max retries
        if (retryCount < MAX_IMMEDIATE_RETRIES) {
          consoleLog(`Immediately retrying connection (${retryCount + 1}/${MAX_IMMEDIATE_RETRIES})`)
          setTimeout(() => {
            monitorSwap(swapId, network, onStatusUpdate, retryCount + 1)
          }, 1000) // Wait 1 second before retry
        }
      }
    }, connectionTimeoutMs)

    // Reconnection variables
    const MAX_RECONNECT_ATTEMPTS = 10 // Increased from 5 to 10 for more resilience
    const RECONNECT_INTERVAL = 3000 // 3 seconds
    let reconnectAttempts = 0

    // Function to attempt reconnection - all errors silently handled
    const attemptReconnect = () => {
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++
        consoleLog(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`)

        // Clear existing connection
        delete activeConnections[swapId]

        // Try to reconnect after delay
        setTimeout(() => {
          monitorSwap(swapId, network, onStatusUpdate)
        }, RECONNECT_INTERVAL)
      } else {
        consoleLog('Max reconnection attempts reached, falling back to REST API polling')
        // Check status via REST API as last resort
        fetchSwapStatus(swapId, network).then((status) => {
          if (status) {
            consoleLog(`Got status via REST API after WebSocket failed: ${status}`)
            onStatusUpdate(status)
          } else {
            // Don't show error message to user - silently fall back to polling
            consoleLog('Failed to get payment status after multiple attempts')
          }
        })
      }
    }

    ws.onopen = () => {
      // Clear the connection timeout since we're connected
      clearTimeout(connectionTimeout)

      consoleLog(`Boltz WebSocket connection established for swap ${swapId}`)

      // After connection is established, subscribe to swap updates using proper protocol
      const subscriptionMessage = JSON.stringify({
        op: 'subscribe',
        channel: 'swap.update',
        args: [swapId],
      })

      ws.send(subscriptionMessage)
      consoleLog(`Subscribed to updates for swap ${swapId}`)

      // Also fetch initial status via REST API to ensure we have the most current state
      // This helps if the WebSocket connected but we missed earlier messages
      fetchSwapStatus(swapId, network).then((status) => {
        if (status) {
          consoleLog(`Got initial status via REST API after WebSocket connected: ${status}`)
          onStatusUpdate(status)
        }
      })
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        consoleLog('Boltz WebSocket message received:', data)

        // Handle subscription acknowledgment
        if (data.event === 'subscribed' && data.channel === 'swap.update') {
          consoleLog('Successfully subscribed to swap updates')
          return
        }

        // Handle swap update events - support multiple possible message formats
        if (
          // Format: {channel: 'swap.update', data: {id: '...', status: '...'}}
          (data.channel === 'swap.update' && data.data?.id && data.data?.status) ||
          // Format: {event: 'swap.update', data: {id: '...', status: '...'}}
          (data.event === 'swap.update' && data.data?.id && data.data?.status) ||
          // Format: {id: '...', status: '...'}
          (data.id && data.status)
        ) {
          // Extract id and status from the appropriate location in the data
          const id = data.data?.id || data.id
          const status = data.data?.status || data.status

          // Only process updates for our swap ID
          if (id === swapId) {
            consoleLog(`Received status update for swap ${id}: ${status}`)
            onStatusUpdate(status)
          }
        }
        // If we get a message we don't understand but it might be related to our swap
        else if (data.id === swapId || (data.data && data.data.id === swapId)) {
          consoleLog('Received unrecognized message format for our swap:', data)

          // Try to extract a status if possible
          const status = data.status || data.data?.status || null
          if (status) {
            consoleLog(`Extracted status from unrecognized message: ${status}`)
            onStatusUpdate(status)
          }
        }
      } catch (err) {
        consoleError(err, 'Error parsing Boltz WebSocket message')
        // Don't pass error to UI - silently handle JSON parsing errors
      }
    }

    ws.onerror = (err) => {
      consoleError(err, 'Boltz WebSocket error')
      // Don't show error to user - silently handle WebSocket errors
      attemptReconnect()
    }

    ws.onclose = (event) => {
      consoleLog(
        `Boltz WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}`,
      )

      // If this wasn't a normal closure, attempt to reconnect
      if (event.code !== 1000) {
        attemptReconnect()
      }

      delete activeConnections[swapId]
    }

    activeConnections[swapId] = ws
  } catch (err) {
    consoleError(err, 'Failed to connect to Boltz WebSocket')
    // Don't show error to user - silently handle connection errors

    // Attempt to connect again after a delay
    if (retryCount < MAX_IMMEDIATE_RETRIES) {
      setTimeout(() => {
        monitorSwap(swapId, network, onStatusUpdate, retryCount + 1)
      }, 1000)
    }
  }
}

/**
 * Stops monitoring a specific swap by properly unsubscribing and closing the WebSocket connection
 * @param swapId The ID of the swap to stop monitoring
 */
export const stopMonitoring = (swapId: string): void => {
  if (activeConnections[swapId]) {
    const ws = activeConnections[swapId]

    // Only send unsubscribe message if the connection is still open
    if (ws.readyState === WebSocket.OPEN) {
      try {
        // Send unsubscribe message before closing
        const unsubscribeMessage = JSON.stringify({
          op: 'unsubscribe',
          channel: 'swap.update',
          args: [swapId],
        })

        ws.send(unsubscribeMessage)
        consoleLog(`Unsubscribed from swap ${swapId} updates`)

        // Close the connection after a small delay to ensure the message is sent
        setTimeout(() => {
          ws.close()
        }, 100)
      } catch (err) {
        consoleError(err, 'Error sending unsubscribe message')
        // Close the connection anyway
        ws.close()
      }
    } else {
      // Just close if not in OPEN state
      ws.close()
    }

    delete activeConnections[swapId]
  }
}

/**
 * Stops monitoring all swaps by properly unsubscribing and closing all WebSocket connections
 */
export const stopAllMonitoring = (): void => {
  Object.keys(activeConnections).forEach((swapId) => {
    // Use the individual stopMonitoring function for consistent behavior
    stopMonitoring(swapId)
  })
}

/**
 * Fetch swap status directly via REST API as a fallback mechanism
 * @param swapId The ID of the swap to check
 * @param network The network name
 * @returns Promise resolving to the swap status
 */
export const fetchSwapStatus = async (swapId: string, network: NetworkName): Promise<SwapStatus> => {
  try {
    const baseUrl = getBoltzApiUrl(network)
    if (!baseUrl) {
      throw new Error('Invalid network for Boltz API')
    }

    const response = await fetch(`${baseUrl}/v2/swap/${swapId}`)
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to fetch swap status')
    }

    const data = await response.json()
    consoleLog('Fetched swap status via REST API:', data)

    return data.status || null
  } catch (err) {
    consoleError(err, 'Error fetching swap status via REST API')
    return null
  }
}
