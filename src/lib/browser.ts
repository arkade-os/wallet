export const isMobileBrowser: boolean = 'ontouchstart' in window || Boolean(navigator.maxTouchPoints)

export const isIOS = (): boolean => {
  const userAgent = window.navigator.userAgent
  return /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream
}

export const isAndroid = (): boolean => {
  const userAgent = window.navigator.userAgent
  return /Android/.test(userAgent)
}
