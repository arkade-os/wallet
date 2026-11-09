import { extractError } from './error'
import { invokeWalletHost, isNativeMobile } from './nativePlatform'

export function canBrowserShareData(data: any): boolean {
  if (isNativeMobile()) return !data.files && Boolean(data.text || data.url)
  if (!navigator.share || !navigator.canShare) return false
  return navigator.canShare(data)
}

export async function shareData(data: any) {
  try {
    if (isNativeMobile()) {
      if (!canBrowserShareData(data)) throw new Error('This content cannot be shared')
      await invokeWalletHost('share_text', {
        text: [data.text, data.url].filter(Boolean).join('\n'),
        title: data.title,
      })
      return
    }
    await navigator.share(data)
  } catch (err) {
    throw `Error sharing data: ${extractError(err)}`
  }
}
