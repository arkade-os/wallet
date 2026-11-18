import { ReactNode } from 'react'

interface SheetPageProps {
  /** Accessible name of the sheet. */
  label: string
  /** A figure shown large behind the scrim, as the screen the sheet sits over. */
  backdrop?: ReactNode
  /** Called when the scrim is tapped. Omit to make the scrim inert. */
  onDismiss?: () => void
  dismissLabel?: string
  children: ReactNode
  testId?: string
}

/**
 * A screen presented as a sheet: a dimmed backdrop and a floating panel
 * anchored to the bottom edge. Review, sending and sent all use it, so a
 * payment is confirmed in one place instead of across three screens.
 */
export default function SheetPage({ label, backdrop, onDismiss, dismissLabel, children, testId }: SheetPageProps) {
  return (
    <div className='sheet-page' data-testid={testId}>
      {backdrop ? (
        <div className='sheet-page__backdrop' aria-hidden='true'>
          {backdrop}
        </div>
      ) : null}
      {onDismiss ? (
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
