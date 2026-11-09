import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import {
  invokeWalletHost,
  isNativeAndroid,
  isNativeIOS,
  isNativeMobile,
  nativeAppIntent,
  listenWalletHost,
} from '../../lib/nativePlatform'
import { copyToClipboard, pasteFromClipboard } from '../../lib/clipboard'
import { canBrowserShareData, shareData } from '../../lib/share'
import { configureNativeBackground } from '../../lib/nativeBackground'
import { pwaCanInstall } from '../../lib/pwa'

const host = window as any
const invoke = vi.fn()
beforeEach(() => {
  invoke.mockReset().mockResolvedValue(undefined)
  host.__ARKADE_NATIVE__ = { version: 1, platform: 'android' }
  host.__TAURI__ = { core: { invoke } }
})
afterEach(() => {
  delete host.__ARKADE_NATIVE__
  delete host.__TAURI__
})

describe('native wallet adapters', () => {
  it('uses native clipboard and reports failures without false success', async () => {
    expect(await copyToClipboard('payment request')).toBe(true)
    expect(invoke).toHaveBeenCalledWith('plugin:wallet|clipboard_write', { text: 'payment request' })
    invoke.mockResolvedValueOnce('pasted request')
    expect(await pasteFromClipboard()).toBe('pasted request')
    invoke.mockRejectedValueOnce(new Error('permission denied'))
    expect(await copyToClipboard('not copied')).toBe(false)
  })
  it('uses native text sharing and refuses unsupported file shares', async () => {
    expect(canBrowserShareData({ text: 'invoice' })).toBe(true)
    expect(canBrowserShareData({ files: [new File(['a'], 'a.txt')] })).toBe(false)
    await shareData({ text: 'invoice', title: 'Arkade' })
    expect(invoke).toHaveBeenCalledWith('plugin:wallet|share_text', { text: 'invoice', title: 'Arkade' })
  })
  it('uses iOS mobile services without scheduling Android background work', async () => {
    host.__ARKADE_NATIVE__.platform = 'ios'
    expect(isNativeIOS()).toBe(true)
    expect(isNativeMobile()).toBe(true)
    expect(isNativeAndroid()).toBe(false)
    expect(canBrowserShareData({ url: 'bitcoin:tb1qtest' })).toBe(true)
    await shareData({ text: 'invoice', url: 'bitcoin:tb1qtest' })
    expect(invoke).toHaveBeenCalledExactlyOnceWith('plugin:wallet|share_text', {
      text: 'invoice\nbitcoin:tb1qtest',
      title: undefined,
    })
    invoke.mockClear()
    await configureNativeBackground(true, 1800000000)
    expect(invoke).not.toHaveBeenCalled()
    host.__ARKADE_NATIVE__.platform = 'desktop'
    expect(isNativeMobile()).toBe(false)
  })
  it('schedules only public expiry in milliseconds and cancels explicitly', async () => {
    await configureNativeBackground(true, 1800000000)
    expect(invoke).toHaveBeenCalledWith('plugin:wallet|configure_background', {
      enabled: true,
      nextExpiryMs: 1800000000000,
    })
    await configureNativeBackground(false, NaN)
    expect(invoke).toHaveBeenLastCalledWith('plugin:wallet|configure_background', {
      enabled: false,
      nextExpiryMs: null,
    })
  })
  it('keeps ordinary browsers outside native IPC and hides native install prompts', async () => {
    expect(isNativeAndroid()).toBe(true)
    expect(pwaCanInstall()).toBe(false)
    delete host.__ARKADE_NATIVE__
    expect(isNativeAndroid()).toBe(false)
    await expect(invokeWalletHost('secret_get')).rejects.toThrow('unavailable')
    expect(invoke).not.toHaveBeenCalled()
  })
})

describe('native payment links', () => {
  it('uses desktop local core events and releases the listener without a mobile plugin channel', async () => {
    host.__ARKADE_NATIVE__.platform = 'desktop'
    let signal!: (event: { payload: unknown }) => void
    const unlisten = vi.fn()
    host.__TAURI__.event = {
      listen: vi.fn(async (_name: string, callback: (event: { payload: unknown }) => void) => {
        signal = callback
        return unlisten
      }),
    }
    const received = vi.fn()
    const dispose = await listenWalletHost('intent', received)
    expect(host.__TAURI__.event.listen).toHaveBeenCalledWith('wallet:intent', expect.any(Function))
    signal({ payload: null })
    expect(received).toHaveBeenCalledWith(null)
    dispose()
    expect(unlisten).toHaveBeenCalledOnce()
    expect(invoke).not.toHaveBeenCalled()
  })
  const payment = 'bitcoin:tb1qtest?amount=0.0001'
  it('keeps BIP21 requests behind the existing consent/send flow', () => {
    expect(nativeAppIntent(payment)).toEqual({ status: 'send', request: payment, callback: undefined })
    expect(nativeAppIntent(`arkade://send?request=${encodeURIComponent(payment)}`)).toEqual(nativeAppIntent(payment))
    expect(nativeAppIntent('web+arkade://connect?callback=https%3A%2F%2Fexample.com')).toEqual({
      status: 'connect',
      callback: 'https://example.com/',
    })
  })
  it('accepts the wallet HTTPS host without accepting arbitrary pages or privileged origins', () => {
    const query = `?action=send&request=${encodeURIComponent(payment)}`
    for (const root of [
      'https://arkade.money',
      'https://arkade.money/',
      'https://ARKADE.MONEY/',
      'https://arkade.money:443/',
    ]) {
      expect(nativeAppIntent(`${root}${query}`)).toEqual({ status: 'send', request: payment, callback: undefined })
      expect(nativeAppIntent(`${root}?action=connect&callback=https%3A%2F%2Fexample.com`)).toEqual({
        status: 'connect',
        callback: 'https://example.com/',
      })
    }
    for (const origin of [
      'https://evil.example/',
      'https://wallet.arkade.money/',
      'https://arkade.money.evil.test/',
      'http://arkade.money/',
      'https://arkade.money:444/',
      'https://user@arkade.money/',
      'https://arkade.money/elsewhere',
      'https://arkade.money/%2F',
      'tauri://localhost/',
    ])
      expect(nativeAppIntent(`${origin}${query}`)).toBeUndefined()
    expect(nativeAppIntent('javascript:alert(1)')).toBeUndefined()
    expect(nativeAppIntent(`web+arkade://send?request=${'x'.repeat(6001)}`)).toBeUndefined()
  })
  it('uses the existing validation for malformed requests and unsafe callbacks', () => {
    expect(nativeAppIntent('arkade://send?request=wrong')?.status).toBe('invalid')
    expect(nativeAppIntent('arkade://connect?callback=javascript%3Aalert(1)')?.status).toBe('invalid')
  })
})
