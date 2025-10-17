import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import makeMessageHandler from './RpcHandler'
import { Transaction } from '@scure/btc-signer'
import { base64 } from '@scure/base'

export type ArkadeIdentityHandlers = {
  getXOnlyPublicKey: () => Promise<Uint8Array | null>
  sign(tx: Transaction, inputIndexes?: number[]): Promise<Transaction>
  signerSession: () => Promise<unknown>
  signin: (challenge: string) => Promise<string>
  signout: () => Promise<unknown>
  getArkWalletAddress: () => Promise<string | undefined>
  fundAddress: (address: string, amount: number) => Promise<unknown>
}

type Props = {
  src: string
  allowedChildOrigins: string[]
  handlers: ArkadeIdentityHandlers
}

export const ArkadeIframeHost: React.FC<Props> = ({ src, allowedChildOrigins, handlers }) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const allowed = useMemo(() => new Set(allowedChildOrigins), [allowedChildOrigins])
  const [isAlive, setIsAlive] = useState(false)
  const handleMessage = useMemo(
    () =>
      makeMessageHandler({
        getXOnlyPublicKey: () => handlers.getXOnlyPublicKey(),
        signLoginChallenge: (challenge: string) => handlers.signin(challenge),
        getArkWalletAddress: () => handlers.getArkWalletAddress(),
        signArkTransaction: async (base64Tx: string, base64Checkpoints: string[]) => {
          const tx = Transaction.fromPSBT(base64.decode(base64Tx), { allowUnknown: true })
          const checkpoints = base64Checkpoints.map((_) => base64.decode(_))
          const signedTx = await handlers.sign(tx)
          const signedCheckpoints = await Promise.all(
            checkpoints.map(async (cp) => {
              const signed = await handlers.sign(Transaction.fromPSBT(cp, { allowUnknown: true }), [0])
              return base64.encode(signed.toPSBT())
            }),
          )
          return {
            signedTx: base64.encode(signedTx.toPSBT()),
            signedCheckpoints,
          }
        },
        fundAddress: async (address, amount) => {
          await handlers.fundAddress(address, amount)
          return {
            address,
            requestedAmount: amount,
            fundedAmount: amount,
          }
        },
      }),
    [handlers],
  )

  const poll = useCallback(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ kind: 'ARKADE_KEEP_ALIVE', timestamp: Date.now() }, src)
      setTimeout(() => poll(), 5000)
    }
  }, [isAlive, iframeRef])

  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      if (!allowed.has(event.origin)) {
        console.error(`[wallet]: ignoring message from ${event.origin}`)
        return
      }
      const msg = event.data
      if (!msg || typeof msg !== 'object' || !('kind' in msg)) {
        console.error('[wallet]: invalid message', msg)
        return
      }

      try {
        const result = await handleMessage(msg)
        if (result.tag === 'failure') {
          console.error(result.error)
        } else {
          if (!isAlive) {
            setIsAlive(true)
          }
          if (
            iframeRef.current?.contentWindow &&
            // we don't answer to keep alive messages because we send every 5s
            result.result.kind !== 'ARKADE_KEEP_ALIVE'
          ) {
            iframeRef.current.contentWindow.postMessage(result.result, event.origin)
          }
        }
      } catch (err) {
        console.error('[wallet]: error handling message', err)
        return
      }
    }

    window.addEventListener('message', onMessage)

    return () => {
      window.removeEventListener('message', onMessage)
    }
  }, [allowed, handlers, isAlive])

  useEffect(() => {
    poll()
  }, [])

  return (
    <iframe
      ref={iframeRef}
      title='Ark Escrow'
      src={src}
      style={{ width: '100%', height: `100%`, border: 0, display: 'flex' }}
      sandbox='allow-scripts allow-forms allow-same-origin'
      allow='clipboard-read; clipboard-write'
    />
  )
}
