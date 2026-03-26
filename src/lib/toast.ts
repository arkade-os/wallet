import { toast } from 'sonner'

export function copiedToClipboard() {
  toast('Copied to clipboard', { duration: 1000 })
}

export function newVersionAvailable() {
  toast('New version available', {
    duration: Infinity,
    action: {
      label: 'Reload',
      onClick: () => window.location.reload(),
    },
  })
}

export function backupToNostr() {
  toast('Nostr backup updated', { duration: 1000 })
}
