import { bytesToHex } from '@noble/hashes/utils.js'

type KeepAlive = { kind: 'ARKADE_KEEP_ALIVE'; timestamp: number }

type RpcLoginRequest = {
  method: 'sign-login-challenge'
  payload: {
    challenge: string
  }
}
type RpcLoginResponse = {
  method: 'sign-login-challenge'
  payload: {
    signedChallenge: string
  }
}

type RpcXPublicKeyRequest = {
  method: 'get-x-public-key'
}
type RpcXPublicKeyResponse = {
  method: 'get-x-public-key'
  payload: {
    xOnlyPublicKey: string | null
  }
}

type RpcArkWalletAddressRequest = {
  method: 'get-ark-wallet-address'
}
type RpcArkWalletAddressResponse = {
  method: 'get-ark-wallet-address'
  payload: {
    arkAddress: string | null
  }
}

type RpcArkWalletBalanceRequest = {
  method: 'get-ark-wallet-balance'
}
type RpcArkWalletBalanceResponse = {
  method: 'get-ark-wallet-balance'
  payload: {
    available: number | null
  }
}

type RpcArkSignTransactionRequest = {
  method: 'sign-transaction'
  payload: {
    // Base64
    tx: string
    // Base64
    checkpoints: string[]
  }
}
type RpcArkSignTransactionResponse = {
  method: 'sign-transaction'
  payload: {
    // Base64
    tx: string
    // Base64
    checkpoints: string[]
  }
}

type RpcFundAddressRequest = {
  method: 'fund-address'
  payload: {
    // Ark address
    address: string
    // SAT
    amount: number
  }
}
type RpcFundAddressResponse = {
  method: 'fund-address'
  payload: {}
}

type RpcRequest = {
  kind: 'ARKADE_RPC_REQUEST'
  id: string
} & (
  | RpcXPublicKeyRequest
  | RpcLoginRequest
  | RpcArkWalletAddressRequest
  | RpcArkWalletBalanceRequest
  | RpcArkSignTransactionRequest
  | RpcFundAddressRequest
)
type RpcResponse = { kind: 'ARKADE_RPC_RESPONSE'; id: string } & (
  | RpcLoginResponse
  | RpcXPublicKeyResponse
  | RpcArkWalletAddressResponse
  | RpcArkWalletBalanceResponse
  | RpcArkSignTransactionResponse
  | RpcFundAddressResponse
)

type InboundMessage = RpcRequest | KeepAlive

type OutboundMessage = KeepAlive | RpcResponse

export type MessageHandler = (message: InboundMessage) => Promise<Result>

type Props = {
  getXOnlyPublicKey: () => Promise<Uint8Array | null>
  signLoginChallenge: (challenge: string) => Promise<string>
  getArkWalletAddress: () => Promise<string | undefined>
  getArkWalletBalance: () => Promise<{ available: number } | undefined>
  signArkTransaction: (tx: string, checkpoints: string[]) => Promise<{ signedTx: string; signedCheckpoints: string[] }>
  fundAddress: (address: string, amount: number) => Promise<string>
}
type Result = { tag: 'success'; result: OutboundMessage } | { tag: 'failure'; error: Error }
export default function makeMessageHandler(props: Props): MessageHandler {
  return async function messageHandler(message: InboundMessage): Promise<Result> {
    switch (message.kind) {
      case 'ARKADE_KEEP_ALIVE':
        return { tag: 'success', result: { kind: 'ARKADE_KEEP_ALIVE', timestamp: Date.now() } }
      case 'ARKADE_RPC_REQUEST': {
        const { id, method } = message
        switch (method) {
          case 'get-x-public-key': {
            const xOnlyPublicKey = await props.getXOnlyPublicKey().then((k) => (k ? bytesToHex(k) : null))
            return {
              tag: 'success',
              result: {
                kind: 'ARKADE_RPC_RESPONSE',
                id,
                method,
                payload: { xOnlyPublicKey },
              },
            }
          }
          case 'get-ark-wallet-address': {
            const arkAddress = (await props.getArkWalletAddress()) ?? null
            return {
              tag: 'success',
              result: {
                kind: 'ARKADE_RPC_RESPONSE',
                id,
                method,
                payload: { arkAddress },
              },
            }
          }

          case 'get-ark-wallet-balance': {
            const balance = await props.getArkWalletBalance()
            return {
              tag: 'success',
              result: {
                kind: 'ARKADE_RPC_RESPONSE',
                id,
                method,
                payload: { available: balance?.available ?? null },
              },
            }
          }

          case 'sign-login-challenge': {
            try {
              const signedChallenge = await props.signLoginChallenge(message.payload.challenge)
              return {
                tag: 'success',
                result: { kind: 'ARKADE_RPC_RESPONSE', id, method, payload: { signedChallenge } },
              }
            } catch (cause) {
              return { tag: 'failure', error: new Error(`Failed to sign login challenge: ${cause}`) }
            }
          }

          case 'sign-transaction': {
            try {
              const { signedTx, signedCheckpoints } = await props.signArkTransaction(
                message.payload.tx,
                message.payload.checkpoints,
              )
              return {
                tag: 'success',
                result: {
                  kind: 'ARKADE_RPC_RESPONSE',
                  id,
                  method,
                  payload: { tx: signedTx, checkpoints: signedCheckpoints },
                },
              }
            } catch (cause) {
              return { tag: 'failure', error: new Error(`Failed to sign transaction: ${cause}`) }
            }
          }

          case 'fund-address': {
            try {
              const txid = await props.fundAddress(message.payload.address, message.payload.amount)
              return {
                tag: 'success',
                result: { kind: 'ARKADE_RPC_RESPONSE', id, method, payload: { txid } },
              }
            } catch (cause) {
              return {
                tag: 'failure',
                error: new Error('Failed to fund', { cause }),
              }
            }
          }
        }
      }
    }
    return { tag: 'failure', error: new Error('Unknown message kind') }
  }
}
