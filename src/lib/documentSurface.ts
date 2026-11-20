interface DocumentSurfaceOptions {
  className?: string
  themeColor?: string
}

interface ActiveDocumentSurface extends DocumentSurfaceOptions {
  id: symbol
}

const activeSurfaces: ActiveDocumentSurface[] = []
let baseThemeColor: string | null | undefined
let initialThemeColor: string | null | undefined

const getThemeColorMeta = () =>
  typeof document === 'undefined' ? null : document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')

const captureInitialThemeColor = () => {
  if (initialThemeColor !== undefined) return
  initialThemeColor = getThemeColorMeta()?.getAttribute('content') ?? null
}

const applyThemeColor = () => {
  const meta = getThemeColorMeta()
  if (!meta) return

  const override = [...activeSurfaces].reverse().find((surface) => surface.themeColor)?.themeColor
  const nextThemeColor = override ?? baseThemeColor ?? initialThemeColor

  if (nextThemeColor === null) meta.removeAttribute('content')
  else if (nextThemeColor !== undefined) meta.setAttribute('content', nextThemeColor)
}

export const setDocumentThemeColor = (themeColor: string) => {
  captureInitialThemeColor()
  baseThemeColor = themeColor
  applyThemeColor()
}

export const activateDocumentSurface = ({ className, themeColor }: DocumentSurfaceOptions) => {
  if (typeof document === 'undefined') return () => {}

  captureInitialThemeColor()
  const surface: ActiveDocumentSurface = { id: Symbol('document-surface'), className, themeColor }
  activeSurfaces.push(surface)

  if (className) document.documentElement.classList.add(className)
  applyThemeColor()

  let active = true
  return () => {
    if (!active) return
    active = false

    const index = activeSurfaces.findIndex(({ id }) => id === surface.id)
    if (index !== -1) activeSurfaces.splice(index, 1)

    if (className && !activeSurfaces.some((entry) => entry.className === className)) {
      document.documentElement.classList.remove(className)
    }
    applyThemeColor()
  }
}

/** How a sheet's scrim fades: its duration in milliseconds and its CSS easing. */
export interface ScrimFade {
  duration: number
  easing: string
}

/** The drawer's scrim (vaul): half a second on vaul's own curve. */
export const DRAWER_SCRIM_FADE: ScrimFade = { duration: 500, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' }

let edgeFadeTimer: ReturnType<typeof setTimeout> | undefined

/**
 * While a sheet is up: the status bar, and any edge the app does not reach, take the scrim's colour
 * (`--scrim-over-bg`), so the dimming is not cut short by white bands. The scrim cannot cover those
 * edges, so they fade with it instead, on the same timing in both directions: call this as the
 * sheet starts opening, and the returned undo as it starts closing.
 */
export const dimScreenEdges = (fade: ScrimFade = DRAWER_SCRIM_FADE) => {
  if (typeof document === 'undefined') return () => {}
  const root = document.documentElement
  const themeColor = getComputedStyle(root).getPropertyValue('--scrim-over-bg').trim()

  clearTimeout(edgeFadeTimer)
  root.style.setProperty('--edge-fade-duration', `${fade.duration}ms`)
  root.style.setProperty('--edge-fade-easing', fade.easing)
  root.classList.add('edges-fading')
  const release = activateDocumentSurface({ className: 'sheet-open', themeColor: themeColor || undefined })

  let active = true
  return () => {
    if (!active) return
    active = false
    release()
    if (root.classList.contains('sheet-open')) return
    // Keep the transition on until the edges are back, so a theme change later still snaps.
    clearTimeout(edgeFadeTimer)
    edgeFadeTimer = setTimeout(() => {
      if (root.classList.contains('sheet-open')) return
      root.classList.remove('edges-fading')
      root.style.removeProperty('--edge-fade-duration')
      root.style.removeProperty('--edge-fade-easing')
    }, fade.duration)
  }
}
