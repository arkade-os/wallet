import ReactDOM from 'react-dom/client'
import './tokens.css'
import './app.css'
import './index.css'
import * as Sentry from '@sentry/react'
import { shouldInitializeSentry } from './lib/sentry'
import AppProviders from './AppProviders'
import { RUNTIME_KIND } from './runtime/runtime'
import { PwaAppShell } from './runtime/PwaAppShell'
import { CapacitorAppShell } from './runtime/CapacitorAppShell'

// Initialize Sentry only in production and when DSN is provided
const sentryDsn = import.meta.env.VITE_SENTRY_DSN
if (shouldInitializeSentry(sentryDsn)) {
  Sentry.init({
    dsn: sentryDsn,
    sendDefaultPii: false,
    enableLogs: true,
    ignoreErrors: [/null is not an object.*a\[je\]/i, /translate\.googleapis\.com.*translate_http/],
    denyUrls: [/translate\.google\.com\/translate_a\/element\.js/, /translate\.googleapis\.com/],
    beforeSend(event, hint) {
      const error = hint.originalException
      const isTranslateOrigin =
        (error instanceof Error && error.stack?.includes('translate.google.com')) ||
        event.exception?.values?.some((v) =>
          v.stacktrace?.frames?.some((f) => f.filename?.includes('translate.googleapis.com')),
        )
      if (isTranslateOrigin) {
        return null
      }
      return event
    },
  })
}

// The top-level shell is selected at build time, not by user-agent or runtime
// guessing (see CAPACITOR.plan.md § Architecture). The PWA shell owns service
// worker registration and other browser-only startup; the Capacitor shell boots
// the native runtime without touching `navigator.serviceWorker`. Both render the
// same shared app tree (`AppProviders`).
const AppShell = RUNTIME_KIND === 'native-capacitor' ? CapacitorAppShell : PwaAppShell

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)

root.render(
  <AppShell>
    <AppProviders />
  </AppShell>,
)
