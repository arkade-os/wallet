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
