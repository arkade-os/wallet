import { isArkNote } from '../lib/arknote'
import { LinkRuntimeAdapter, NormalizedRuntimeLink, Unsubscribe } from './types'

/**
 * Link ingestion for both runtimes.
 *
 * All link shapes are the same across platforms — an app link (`app+{appId}`,
 * optionally with a query string) or a bare Ark note. Only the envelope
 * differs: the PWA gets them in `window.location.hash` (via the `web+arkade`
 * protocol handler in `public/manifest.json`), while native gets a full URL
 * from the `arkade://` scheme, either as the launch URL or as a warm
 * `appUrlOpen` event.
 *
 * Both therefore reduce to the same payload string and share one parser.
 * Dispatch stays in `src/providers/wallet.tsx`.
 */

/**
 * Parses the payload — everything after the scheme or the `#` — into a
 * normalized link. Returns `undefined` for an empty payload so callers can
 * distinguish "no link" from "a link we did not recognize".
 */
export const parseLinkPayload = (payload: string, rawUrl: string): NormalizedRuntimeLink | undefined => {
  const clean = payload.replace(/^web\+arkade:\/\//, '').replace(/^\/+/, '')
  if (!clean) return undefined

  // Expected format: app+{app_id}?{query_params}
  const [, afterApp] = clean.split('app+', 2)
  if (afterApp) {
    const [appId, query] = afterApp.split('?', 2)
    if (appId) return { type: 'app', appId, query, rawUrl }
  }

  if (isArkNote(clean)) return { type: 'note', note: clean, rawUrl }

  return { type: 'unknown', rawUrl }
}

/** Strips the scheme from a native URL (`arkade://...`) or takes an https URL's hash. */
export const parseNativeUrl = (rawUrl: string): NormalizedRuntimeLink | undefined => {
  const hashIndex = rawUrl.indexOf('#')
  const payload =
    hashIndex >= 0 ? rawUrl.slice(hashIndex + 1) : rawUrl.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '')
  return parseLinkPayload(payload, rawUrl)
}

// --- Browser / PWA ----------------------------------------------------------

export const browserLinks: LinkRuntimeAdapter = {
  getInitialLink: async () => parseLinkPayload(window.location.hash.slice(1), window.location.href),

  // The PWA has no warm-link channel: the protocol handler navigates the page,
  // which re-runs bootstrap and goes through getInitialLink again.
  subscribe: () => () => {},

  // Consumed links are cleared from the URL so a reload does not replay them.
  clearConsumedLink: () => {
    window.location.hash = ''
  },
}

// --- Native / Capacitor -----------------------------------------------------

let appModule: Promise<typeof import('@capacitor/app')> | undefined
const appPlugin = () => (appModule ??= import('@capacitor/app'))

export const nativeLinks: LinkRuntimeAdapter = {
  /** The URL the app was cold-started with, if it was launched from a link. */
  getInitialLink: async () => {
    const launch = await (await appPlugin()).App.getLaunchUrl()
    return launch?.url ? parseNativeUrl(launch.url) : undefined
  },

  /** Warm links: the app is already running and the OS hands it a URL. */
  subscribe: (handler): Unsubscribe => {
    let handle: { remove: () => void } | undefined
    let cancelled = false
    appPlugin()
      .then(({ App }) =>
        App.addListener('appUrlOpen', ({ url }) => {
          const link = parseNativeUrl(url)
          if (link) handler(link)
        }),
      )
      .then((h) => {
        if (cancelled) h.remove()
        else handle = h
      })
      .catch(() => {})
    return () => {
      cancelled = true
      handle?.remove()
    }
  },

  // Nothing to clear: native links arrive as events, not as app URL state.
}
