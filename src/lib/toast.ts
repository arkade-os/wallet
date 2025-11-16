import { ToastOptions } from '@ionic/react'

const defaultToastOptions: ToastOptions = {
  duration: 1000,
  position: 'top',
}

const toastReloadButton = {
  text: 'reload',
  handler: () => window.location.reload(),
}

export const copiedToClipboard: ToastOptions = {
  ...defaultToastOptions,
  message: 'Copied to clipboard',
}

export const newVersionAvailable: ToastOptions = {
  ...defaultToastOptions,
  buttons: [toastReloadButton],
  duration: 0,
  message: 'New version available',
}

export const backupToNostr: ToastOptions = {
  ...defaultToastOptions,
  message: 'Nostr backup updated',
}
