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
  method: 'get-x-publick-key'
}
type RpcXPublicKeyResponse = {
  method: 'get-x-publick-key'
  payload: {
    xOnlyPublicKey: string | null
  }
}

type RpcRequest = {
  kind: 'ARKADE_RPC_REQUEST'
  id: string
} & (RpcXPublicKeyRequest | RpcLoginRequest)
type RpcResponse = { kind: 'ARKADE_RPC_RESPONSE'; id: string } & (RpcLoginResponse | RpcXPublicKeyResponse)

type InboundMessage = RpcRequest | KeepAlive

type OutboundMessage = KeepAlive | RpcResponse

type Props = {
  getXPublicKey: () => Promise<string | null>
  signLoginChallenge: (challenge: string) => Promise<string>
}
type Result = { tag: 'success'; result: OutboundMessage } | { tag: 'failure'; error: Error }
export default function makeMessageHandler(props: Props) {
  return async function messageHandler(message: InboundMessage): Promise<Result> {
    switch (message.kind) {
      case 'ARKADE_KEEP_ALIVE':
        return { tag: 'success', result: { kind: 'ARKADE_KEEP_ALIVE', timestamp: Date.now() } }
      case 'ARKADE_RPC_REQUEST': {
        const { id, method } = message
        switch (method) {
          case 'get-x-publick-key':
            const xOnlyPublicKey = await props.getXPublicKey()
            return {
              tag: 'success',
              result: {
                kind: 'ARKADE_RPC_RESPONSE',
                id,
                method,
                payload: { xOnlyPublicKey },
              },
            }

          case 'sign-login-challenge':
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
      }
    }
    return { tag: 'failure', error: new Error('Unknown message') }
  }
}
