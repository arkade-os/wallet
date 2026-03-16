export const isMobileBrowser: boolean = 'ontouchstart' in window || Boolean(navigator.maxTouchPoints)

export const isIOS = (): boolean => {
  const userAgent = window.navigator.userAgent
  return /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream
}

export const isAndroid = (): boolean => {
  const userAgent = window.navigator.userAgent
  return /Android/.test(userAgent)
}

export const isInAppBrowser = (): boolean => {
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || ''

  // Known in-app browser tokens (sorted by global user base)
  if (
    /FBAN|FBAV|Instagram|Twitter|Line\/|Snapchat|LinkedIn|Reddit|Pinterest|TikTok|Telegram|WhatsApp|Weibo|MicroMessenger|Barcelona|Viber|KAKAOTALK|GSA\/|musical_ly|BytedanceWebview|Bytedance|baiduboxapp|baidubrowser|MQQBrowser|\bQQ\/|Flipboard/i.test(
      ua,
    )
  )
    return true

  // Telegram iOS doesn't add a UA token, but exposes window globals
  if ('TelegramWebviewProxy' in window || 'TelegramWebviewProxyProto' in window) return true

  // Generic Android WebView marker
  if (/; wv\)/.test(ua)) return true

  // Generic iOS WebView — real browsers always include "Safari" in the UA,
  // but WKWebView inside apps omits it
  if (/iPhone|iPad|iPod/.test(ua) && /AppleWebKit/.test(ua) && !/Safari/.test(ua)) return true

  return false
}
