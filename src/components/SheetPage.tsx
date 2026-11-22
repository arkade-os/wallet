import { ReactNode, useEffect, useLayoutEffect, useRef } from 'react'
import { dimScreenEdges } from '../lib/documentSurface'

interface SheetPageProps {
  label: string
  backdrop?: ReactNode
  onDismiss?: () => void
  dismissLabel?: string
  busy?: boolean
  children: ReactNode
  testId?: string
}

export default function SheetPage({
  label,
  backdrop,
  onDismiss,
  dismissLabel,
  busy,
  children,
  testId,
}: SheetPageProps) {
  const dismiss = useRef(onDismiss)
  dismiss.current = busy ? undefined : onDismiss

  useLayoutEffect(() => dimScreenEdges(), [])

  useEffect(() => {
    const chrome = Array.from(document.querySelectorAll<HTMLElement>('.desktop-wallet-shell'))
    chrome.forEach((el) => el.setAttribute('inert', ''))
    return () => chrome.forEach((el) => el.removeAttribute('inert'))
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      if (document.querySelector("[data-slot='drawer-content'], [data-modal-layer]")) return
      if (!dismiss.current) return
      event.preventDefault()
      dismiss.current()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className='sheet-page' data-testid={testId} data-busy={busy ? 'true' : undefined}>
      {backdrop ? (
        <div className='sheet-page__backdrop' aria-hidden='true'>
          {backdrop}
        </div>
      ) : null}
      {onDismiss && !busy ? (
        <button type='button' className='sheet-page__scrim' aria-label={dismissLabel} onClick={onDismiss} />
      ) : (
        <div className='sheet-page__scrim' aria-hidden='true' />
      )}
      <section className='sheet-page__sheet' role='dialog' aria-modal='true' aria-label={label}>
        <div className='sheet-page__handle' aria-hidden='true' />
        {children}
      </section>
    </div>
  )
}
