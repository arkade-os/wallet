import { consoleLog } from './logs'
import { NetworkName } from '@arkade-os/sdk/dist/types/networks'
import { Satoshis, Wallet } from './types'
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
  TapLeafScript,
} from '@arkade-os/sdk'
import { AspInfo } from '../providers/asp'
import { Transaction } from '@scure/btc-signer'
import { decodeInvoice } from './bolt11'
import { TransactionInput } from '@scure/btc-signer/psbt'

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

// submarine swaps

export type CreateSubmarineSwapRequest = {
  to: 'BTC'
  from: 'ARK'
  invoice: string
  refundPublicKey: string
}

type CreateSubmarineSwapResponse = {
  id: string
  address: string
  expectedAmount: number
  claimPublicKey: string
  acceptZeroConf: boolean
  timeoutBlockHeights: {
    refund: number
    unilateralClaim: number
    unilateralRefund: number
    unilateralRefundWithoutReceiver: number
  }
}

const isCreateSubmarineSwapResponse = (data: any): data is CreateSubmarineSwapResponse => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'address' in data &&
    'expectedAmount' in data &&
    'claimPublicKey' in data &&
    'acceptZeroConf' in data &&
    'timeoutBlockHeights' in data &&
    typeof data.timeoutBlockHeights === 'object' &&
    data.timeoutBlockHeights !== null &&
    'refund' in data.timeoutBlockHeights &&
    'unilateralClaim' in data.timeoutBlockHeights &&
    'unilateralRefund' in data.timeoutBlockHeights &&
    'unilateralRefundWithoutReceiver' in data.timeoutBlockHeights
  )
}

export interface PendingSubmarineSwap {
  request: CreateSubmarineSwapRequest
  response: CreateSubmarineSwapResponse
  status: SwapStatus
}

// reverse swaps

export type CreateReverseSwapRequest = {
  to: 'ARK'
  from: 'BTC'
  claimPublicKey: string
  invoiceAmount: number
  preimageHash: string
}

type CreateReverseSwapResponse = {
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

const isCreateReverseSwapResponse = (data: any): data is CreateReverseSwapResponse => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'invoice' in data &&
    'onchainAmount' in data &&
    'lockupAddress' in data &&
    'refundPublicKey' in data &&
    'timeoutBlockHeights' in data &&
    typeof data.timeoutBlockHeights === 'object' &&
    data.timeoutBlockHeights !== null &&
    'refund' in data.timeoutBlockHeights &&
    'unilateralClaim' in data.timeoutBlockHeights &&
    'unilateralRefund' in data.timeoutBlockHeights &&
    'unilateralRefundWithoutReceiver' in data.timeoutBlockHeights
  )
}

export interface PendingReverseSwap {
  preimage: string
  request: CreateReverseSwapRequest
  response: CreateReverseSwapResponse
  status: SwapStatus
}

// urls

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
  // TODO typeguard the response
  const { minimal, maximal } = json.ARK.BTC.limits
  return {
    min: minimal,
    max: maximal,
  }
}

export const getInvoiceSatoshis = (invoice: string): Satoshis => {
  return decodeInvoice(invoice).amountSats
}

const getInvoicePaymentHash = (invoice: string): string => {
  return decodeInvoice(invoice).paymentHash
}
/**
 * Makes a submarine swap using Boltz API
 * @param invoice The invoice string to swap
 * @param aspInfo The ASP information object
 * @param wallet The user's wallet object
 * @throws Will throw an error if the network or pubkey are not available, or if the invoice payment fails
 * @returns A promise that resolves when the swap is successfully initiated
 */
export const submarineSwap = async (
  invoice: string,
  aspInfo: AspInfo,
  wallet: Wallet,
): Promise<PendingSubmarineSwap> => {
  if (!wallet.network) throw new Error('Network not available for reverse swap')
  if (!wallet.pubkey) throw new Error('Public key not available for reverse swap')

  const swapRequest: CreateSubmarineSwapRequest = {
    to: 'BTC',
    from: 'ARK',
    invoice,
    refundPublicKey: wallet.pubkey,
  }

  const response = await fetch(`${getBoltzApiUrl(wallet.network)}/v2/swap/submarine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(swapRequest),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw errorData.error || 'Failed to process Lightning payment'
  }

  // parse the response and check if the invoice was created
  const swapInfo = (await response.json()) as CreateSubmarineSwapResponse
  if (!isCreateSubmarineSwapResponse(swapInfo)) throw new Error('Invalid swap response format')

  // create expected VHTLC script
  const { vhtlcScript, vhtlcAddress } = createVHTLCScript({
    network: wallet.network,
    preimageHash: hex.decode(getInvoicePaymentHash(invoice)),
    receiverPubkey: swapInfo.claimPublicKey,
    senderPubkey: wallet.pubkey!,
    serverPubkey: aspInfo.signerPubkey,
    timeoutBlockHeights: swapInfo.timeoutBlockHeights,
  })

  if (!vhtlcScript) throw new Error('Failed to create VHTLC script to validate submarine swap')
  if (vhtlcAddress !== swapInfo.address) throw new Error('Boltz is trying to scam us')

  return {
    request: swapRequest,
    response: swapInfo,
    status: 'swap.created',
  }
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
  aspInfo: AspInfo,
): Promise<PendingReverseSwap> => {
  if (!wallet.network) throw 'Network not available for reverse swap'
  if (!wallet.pubkey) throw 'Public key not available for reverse swap'

  // get the public key to claim the VHTLC
  const claimPublicKey = wallet.pubkey
  if (!claimPublicKey) throw 'Failed to get public key'

  // create random preimage and its hash
  const preimage = randomBytes(32)
  const preimageHash = hex.encode(sha256(preimage))
  if (!preimageHash) throw 'Failed to get preimage hash'

  const swapRequest: CreateReverseSwapRequest = {
    to: 'ARK',
    from: 'BTC',
    claimPublicKey,
    invoiceAmount,
    preimageHash,
  }

  // create reverse swap
  const response = await fetch(`${getBoltzApiUrl(wallet.network)}/v2/swap/reverse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(swapRequest),
  })

  // check if the response is ok
  if (!response.ok) {
    const errorData = await response.json()
    throw errorData.error || 'Failed to process Lightning payment'
  }

  // parse the response and check if the invoice was created
  const swapResponse = (await response.json()) as CreateReverseSwapResponse
  if (!isCreateReverseSwapResponse(swapResponse)) throw new Error('Invalid swap response format')

  // create expected VHTLC script
  const { vhtlcScript, vhtlcAddress } = createVHTLCScript({
    network: wallet.network,
    preimageHash: hex.decode(preimageHash),
    receiverPubkey: wallet.pubkey,
    senderPubkey: swapResponse.refundPublicKey,
    serverPubkey: aspInfo.signerPubkey,
    timeoutBlockHeights: swapResponse.timeoutBlockHeights,
  })

  if (!vhtlcScript) throw new Error('Failed to create VHTLC script for reverse swap')
  if (vhtlcAddress !== swapResponse.lockupAddress) throw new Error('Boltz is trying to scam us')

  return {
    preimage: hex.encode(preimage),
    request: swapRequest,
    response: swapResponse,
    status: 'swap.created',
  }
}

/**
 * Waits for the submarine swap invoice to be paid (i.e. VHTLC to be claimed).
 * If something fails, refunds the VHTLC back to the user.
 * This function listens for updates on the swap status.
 * It handles various swap states such as creation, payment, confirmation, and expiration.
 * @param swapInfo The swap information object containing details about the reverse swap
 * @param invoice The invoice to be paid by the swap provider
 * @param wallet The user's wallet object
 * @param svcWallet The service worker wallet object
 * @param aspInfo The ASP information object
 * @throws Will throw an error if the wallet network is not available
 * @returns A promise that resolves when the swap is successfully claimed
 */
export const waitForClaim = async (
  pendingSwap: PendingSubmarineSwap,
  network: NetworkName | undefined | '',
): Promise<number> => {
  if (!network) throw new Error('Network not available for submarine swap')
  return new Promise<number>((resolve, reject) => {
    // https://api.docs.boltz.exchange/lifecycle.html#swap-states
    const onStatusUpdate = async (status: SwapStatus) => {
      switch (status) {
        case 'swap.expired':
        case 'invoice.failedToPay':
        case 'transaction.lockupFailed':
          reject({ isRefundable: true })
          break
        case 'transaction.claimed':
          resolve(pendingSwap.response.expectedAmount)
          break
        default:
          break
      }
    }

    watchSwap(pendingSwap.response.id, network, onStatusUpdate)
  })
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
export const waitAndClaim = async (
  pendingSwap: PendingReverseSwap,
  wallet: Wallet,
  svcWallet: ServiceWorkerWallet,
  aspInfo: AspInfo,
) => {
  return new Promise<number>((resolve, reject) => {
    if (!wallet.network) {
      const err = 'Network not available for submarine swap'
      reject(err)
      return
    }

    // https://api.docs.boltz.exchange/lifecycle.html#swap-states
    const onStatusUpdate = (status: SwapStatus) => {
      switch (status) {
        case 'transaction.mempool':
        case 'transaction.confirmed':
          consoleLog('Starting VHTLC claim process...')
          claimVHTLC(pendingSwap, wallet, svcWallet, aspInfo)
          break
        case 'invoice.settled':
          consoleLog('Invoice settled')
          resolve(pendingSwap.response.onchainAmount)
          break
        case 'invoice.expired':
          consoleLog('Invoice expired')
          reject('Invoice expired')
          break
        case 'swap.expired':
          consoleLog('Swap expired')
          reject('Swap expired')
          break
        case 'transaction.failed':
          consoleLog('Transaction failed')
          reject('Transaction failed')
          break
        case 'transaction.refunded':
          consoleLog('Transaction refunded')
          reject('Transaction refunded')
          break
        default:
          break
      }
    }

    watchSwap(pendingSwap.response.id, wallet.network, onStatusUpdate)
  })
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
  pendingSwap: PendingReverseSwap,
  wallet: Wallet,
  svcWallet: ServiceWorkerWallet,
  aspInfo: AspInfo,
): Promise<void> => {
  if (!wallet.network) throw 'Network not available for reverse swap'
  if (!wallet.pubkey) throw 'Pubkey not available for reverse swap'

  // prepare variables for claiming the VHTLC
  const preimage = hex.decode(pendingSwap.preimage)
  const amount = pendingSwap.response.onchainAmount
  const address = await svcWallet.getAddress()
  if (!address) throw 'Failed to get ark address from service worker wallet'

  // validate we are using a x-only server public key
  let serverXOnlyPublicKey = hex.decode(aspInfo.signerPubkey)
  if (serverXOnlyPublicKey.length == 33) {
    serverXOnlyPublicKey = serverXOnlyPublicKey.slice(1)
  } else if (serverXOnlyPublicKey.length !== 32) {
    throw new Error(`Invalid server public key length: ${serverXOnlyPublicKey.length}`)
  }

  const { vhtlcScript, vhtlcAddress } = createVHTLCScript({
    network: wallet.network,
    preimageHash: sha256(preimage),
    receiverPubkey: wallet.pubkey,
    serverPubkey: aspInfo.signerPubkey,
    senderPubkey: pendingSwap.response.refundPublicKey,
    timeoutBlockHeights: pendingSwap.response.timeoutBlockHeights,
  })

  if (!vhtlcScript) throw new Error('Failed to create VHTLC script for reverse swap')
  if (vhtlcAddress !== pendingSwap.response.lockupAddress) throw new Error('Boltz is trying to scam us')

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
        tapLeafScript: vhtlcScript.claim(),
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

  // sign and submit the virtual transaction
  const signedArkTx = await vhtlcIdentity.sign(arkTx)
  const { arkTxid, finalArkTx, signedCheckpointTxs } = await arkProvider.submitTx(
    base64.encode(signedArkTx.toPSBT()),
    checkpoints.map((c) => base64.encode(c.toPSBT())),
  )

  // verify the server signed the transaction with correct key
  if (!validFinalArkTx(finalArkTx, serverXOnlyPublicKey, vhtlcScript.leaves)) {
    throw new Error('Invalid final Ark transaction')
  }

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
}

export const refundVHTLC = async (
  pendingSwap: PendingSubmarineSwap,
  wallet: Wallet,
  svcWallet: ServiceWorkerWallet,
  aspInfo: AspInfo,
): Promise<void> => {
  if (!wallet.network) throw 'Network not available for reverse swap'
  if (!wallet.pubkey) throw 'Pubkey not available for reverse swap'

  // prepare variables for claiming the VHTLC
  const amount = pendingSwap.response.expectedAmount
  const address = await svcWallet.getAddress()
  if (!address) throw 'Failed to get ark address from service worker wallet'

  // validate we are using a x-only server public key
  let serverXOnlyPublicKey = hex.decode(aspInfo.signerPubkey)
  if (serverXOnlyPublicKey.length == 33) {
    serverXOnlyPublicKey = serverXOnlyPublicKey.slice(1)
  } else if (serverXOnlyPublicKey.length !== 32) {
    throw new Error(`Invalid server public key length: ${serverXOnlyPublicKey.length}`)
  }

  const { vhtlcScript, vhtlcAddress } = createVHTLCScript({
    network: wallet.network,
    preimageHash: hex.decode(getInvoicePaymentHash(pendingSwap.request.invoice)),
    receiverPubkey: pendingSwap.response.claimPublicKey,
    senderPubkey: wallet.pubkey!,
    serverPubkey: aspInfo.signerPubkey,
    timeoutBlockHeights: pendingSwap.response.timeoutBlockHeights,
  })

  if (!vhtlcScript) throw new Error('Failed to create VHTLC script for reverse swap')
  if (vhtlcAddress !== pendingSwap.response.address) throw new Error('Boltz is trying to scam us')

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
      return Transaction.fromPSBT(signedTx.toPSBT(), { allowUnknown: true })
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

  // sign and submit the virtual transaction
  const signedArkTx = await vhtlcIdentity.sign(arkTx)
  const { arkTxid, finalArkTx, signedCheckpointTxs } = await arkProvider.submitTx(
    base64.encode(signedArkTx.toPSBT()),
    checkpoints.map((c) => base64.encode(c.toPSBT())),
  )

  // verify the server signed the transaction with correct key
  if (!validFinalArkTx(finalArkTx, serverXOnlyPublicKey, vhtlcScript.leaves)) {
    throw new Error('Invalid final Ark transaction')
  }

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
}

// validFinalArkTx checks that all inputs have a signature for the given pubkey
// and the signature is correct for the given tapscript leaf
// TODO: This is a simplified check, we should verify the actual signatures
const validFinalArkTx = (finalArkTx: string, pubkey: Uint8Array, tapLeaves: TapLeafScript[]): boolean => {
  console.log('Validating final Ark transaction:', {
    finalArkTx,
    pubkey: hex.encode(pubkey),
    tapLeaves: JSON.stringify(tapLeaves),
  })

  const tx = Transaction.fromPSBT(base64.decode(finalArkTx), {
    allowUnknown: true,
  })

  if (!tx) return false

  const inputs: TransactionInput[] = []

  for (let i = 0; i < tx.inputsLength; i++) {
    inputs.push(tx.getInput(i))
  }

  return inputs.every((input) => input.witnessUtxo)
}

interface createVHTLCScriptProps {
  network: string
  preimageHash: Uint8Array
  receiverPubkey: string
  senderPubkey: string
  serverPubkey: string
  timeoutBlockHeights: {
    refund: number
    unilateralClaim: number
    unilateralRefund: number
    unilateralRefundWithoutReceiver: number
  }
}

const createVHTLCScript = ({
  network,
  preimageHash,
  receiverPubkey,
  senderPubkey,
  serverPubkey,
  timeoutBlockHeights,
}: createVHTLCScriptProps): { vhtlcScript: VHTLC.Script; vhtlcAddress: string } => {
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

  const vhtlcScript = new VHTLC.Script({
    preimageHash: ripemd160(preimageHash),
    sender: senderXOnlyPublicKey,
    receiver: receiverXOnlyPublicKey,
    server: serverXOnlyPublicKey,
    refundLocktime: BigInt(timeoutBlockHeights.refund),
    unilateralClaimDelay: {
      type: 'blocks',
      value: BigInt(timeoutBlockHeights.unilateralClaim),
    },
    unilateralRefundDelay: {
      type: 'blocks',
      value: BigInt(timeoutBlockHeights.unilateralRefund),
    },
    unilateralRefundWithoutReceiverDelay: {
      type: 'blocks',
      value: BigInt(timeoutBlockHeights.unilateralRefundWithoutReceiver),
    },
  })

  if (!vhtlcScript) throw new Error('Failed to create VHTLC script')

  // validate vhtlc script
  const hrp = network === 'bitcoin' ? 'ark' : 'tark'
  const vhtlcAddress = vhtlcScript.address(hrp, serverXOnlyPublicKey).encode()

  return { vhtlcScript, vhtlcAddress }
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
const watchSwap = async (
  swapId: string,
  network: NetworkName,
  onStatusUpdate: (status: SwapStatus) => void,
): Promise<void> => {
  // if you receive one of this statuses, we should close the websocket
  const isFinalStatus = (status: SwapStatus): boolean => {
    const finalStatuses: SwapStatus[] = [
      'invoice.settled',
      'invoice.expired',
      'swap.expired',
      'transaction.claimed',
      'transaction.refunded',
      'transaction.failed',
      'transaction.lockupFailed',
    ]
    return finalStatuses.includes(status)
  }

  return new Promise((resolve, reject) => {
    const webSocket = new WebSocket(getBoltzWsUrl(network))

    // subscribe to the swap updates
    webSocket.onopen = () => {
      webSocket.send(
        JSON.stringify({
          op: 'subscribe',
          channel: 'swap.update',
          args: [swapId],
        }),
      )
    }

    webSocket.onmessage = async (rawMsg) => {
      const msg = JSON.parse(rawMsg.data)

      // only handle updates for the specific swap ID
      if (msg.event !== 'update' || msg.args[0].id !== swapId) return

      // something went wrong, reject the promise
      if (msg.args[0].error) {
        webSocket.close()
        reject(msg.args[0].error)
      }

      // update the status based on the message
      const status = msg.args[0].status as SwapStatus
      onStatusUpdate(status)

      if (isFinalStatus(status)) {
        webSocket.close()
        resolve()
      }
    }
  })
}
