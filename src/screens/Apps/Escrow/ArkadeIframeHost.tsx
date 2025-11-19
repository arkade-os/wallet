import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MessageHandler } from './RpcHandler'

type Props = {
  src: string
  allowedChildOrigins: string[]
  messageHandler: MessageHandler
}

export const ArkadeIframeHost: React.FC<Props> = ({ src, allowedChildOrigins, messageHandler }) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const childOrigin = useMemo(() => new URL(src).origin, [src])
  const [isAlive, setIsAlive] = useState(false)

  const poll = useCallback(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ kind: 'ARKADE_KEEP_ALIVE', timestamp: Date.now() }, childOrigin)
      setTimeout(() => poll(), isAlive ? 5000 : 2000)
    }
  }, [isAlive, iframeRef, childOrigin])

  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      if (!allowedChildOrigins.some((_) => _.startsWith(event.origin))) {
        console.error(`[wallet]: ignoring message from ${event.origin}`)
        return
      }
      if (event.source !== iframeRef.current?.contentWindow) {
        // Ignore messages not coming from our iframe
        return
      }
      const msg = event.data
      if (!msg || typeof msg !== 'object' || !('kind' in msg)) {
        console.error('[wallet]: invalid message', msg)
        return
      }

      try {
        const result = await messageHandler(msg)
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
  }, [messageHandler, isAlive, allowedChildOrigins])

  useEffect(() => {
    iframeRef.current?.addEventListener('load', () => {
      poll()
    })
  }, [iframeRef.current, poll])

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
