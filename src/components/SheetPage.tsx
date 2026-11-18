import { ReactNode, useEffect, useRef } from 'react'

interface SheetPageProps {
  /** Accessible name of the sheet. */
  label: string
  /** A figure shown large behind the scrim, as the screen the sheet sits over. */
  backdrop?: ReactNode
  /** Called when the scrim is tapped. Omit to make the scrim inert. */
  onDismiss?: () => void
  dismissLabel?: string
  /** Work is in flight: the scrim and Escape stop dismissing until it clears. Back still leaves,
   *  which is how someone walks away from a slow payment without cancelling it. */
  busy?: boolean
  children: ReactNode
  testId?: string
}

/**
 * A screen presented as a sheet: a dimmed backdrop and a floating panel
 * anchored to the bottom edge. Review, sending and sent all use it, so a
 * payment is confirmed in one place instead of across three screens.
 */
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

  // The sheet is modal, so the chrome around the page goes inert with it. On desktop that is the
  // sidebar, which would otherwise navigate away from a payment that is being signed.
  useEffect(() => {
    const chrome = Array.from(document.querySelectorAll<HTMLElement>('.desktop-wallet-shell'))
    chrome.forEach((el) => el.setAttribute('inert', ''))
    return () => chrome.forEach((el) => el.removeAttribute('inert'))
  }, [])

  // Escape belongs to the sheet: it dismisses where dismissal is offered and does nothing while busy.
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
