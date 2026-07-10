import {
  decryptBackup,
  isValidMnemonic,
  keysFromPrivateKey,
  mnemonicFromPrfOutput,
  parsePasskeyDescriptor,
  recoverKeys,
} from './crypto'
import { assertPrf } from '../src/lib/passkey'
import { PASSKEY_WALLET_STORAGE_KEY } from '../src/lib/storageKeys'
// embedded at build time so the rescue server ships inside this single file
import serveScript from './serve.mjs?raw'

const $ = (id: string): HTMLElement => {
  const el = document.getElementById(id)
  if (!el) throw new Error(`Missing element #${id}`)
  return el
}

const setText = (id: string, text: string) => {
  $(id).textContent = text
}

const showKeys = (keys: { privateKeyHex: string; publicKeyHex: string; nsec: string; npub: string }) => {
  setText('priv-hex', keys.privateKeyHex)
  setText('nsec', keys.nsec)
  setText('pub-hex', keys.publicKeyHex)
  setText('npub', keys.npub)
  $('keys').classList.remove('hidden')
}

const isMainnetSelected = (): boolean => {
  const checked = document.querySelector<HTMLInputElement>('input[name="network"]:checked')
  return checked?.value !== 'testnet'
}

$('derive').addEventListener('click', () => {
  const mnemonic = ($('mnemonic') as HTMLTextAreaElement).value
  setText('mnemonic-error', '')
  $('keys').classList.add('hidden')
  try {
    if (!isValidMnemonic(mnemonic)) throw new Error('Invalid recovery phrase: check the words and try again')
    showKeys(recoverKeys(mnemonic, isMainnetSelected()))
  } catch (err) {
    setText('mnemonic-error', err instanceof Error ? err.message : 'Recovery failed')
  }
})

$('decrypt').addEventListener('click', async () => {
  const blob = ($('blob') as HTMLTextAreaElement).value
  const password = ($('password') as HTMLInputElement).value
  setText('decrypt-error', '')
  $('decrypted').classList.add('hidden')
  try {
    const result = await decryptBackup(blob, password)
    if (result.kind === 'mnemonic') {
      setText('decrypted-label', 'Recovery phrase')
      setText('decrypted-value', result.mnemonic)
      // feed the phrase into the derivation section above
      ;($('mnemonic') as HTMLTextAreaElement).value = result.mnemonic
      showKeys(recoverKeys(result.mnemonic, isMainnetSelected()))
    } else {
      setText('decrypted-label', 'Private key')
      setText('decrypted-value', keysFromPrivateKey(result.privateKey).nsec)
      showKeys(keysFromPrivateKey(result.privateKey))
    }
    $('decrypted').classList.remove('hidden')
  } catch (err) {
    setText('decrypt-error', err instanceof Error ? err.message : 'Decryption failed')
  }
})

// --- passkey recovery (seized-domain rescue) ---
// A passkey only answers to a page served under its RP ID (the wallet's
// domain). From file:// we can only offer the rescue-server instructions;
// when served (locally via serve.mjs, at the wallet's domain) we can assert
// the passkey, derive the PRF secret, and reconstruct the wallet directly.
const servedWithOrigin = window.location.protocol !== 'file:' && !!window.location.hostname && window.isSecureContext

if (servedWithOrigin) {
  $('passkey-served-mode').classList.remove('hidden')
  const storedDescriptor = localStorage.getItem(PASSKEY_WALLET_STORAGE_KEY)
  if (storedDescriptor) {
    setText('vault-status', `Passkey wallet found in this browser for ${window.location.hostname}.`)
  } else {
    setText(
      'vault-status',
      `No passkey wallet found in this browser for ${window.location.hostname}. ` +
        'Paste the descriptor below (localStorage key "passkey_wallet" of the wallet, ' +
        'or serve this page on port 443 so it shares the wallet’s origin).',
    )
    $('vault').classList.remove('hidden')
  }

  $('passkey-unlock').addEventListener('click', async () => {
    setText('passkey-error', '')
    $('passkey-result').classList.add('hidden')
    try {
      const raw = storedDescriptor ?? ($('vault') as HTMLTextAreaElement).value
      if (!raw.trim()) throw new Error('No passkey descriptor: paste it first')
      const descriptor = parsePasskeyDescriptor(raw)
      const prfOutput = await assertPrf(descriptor.credentialId)
      const mnemonic = await mnemonicFromPrfOutput(prfOutput)
      prfOutput.fill(0)
      setText('passkey-mnemonic', mnemonic)
      $('passkey-result').classList.remove('hidden')
      // feed the derivation section so the keys show up too
      ;($('mnemonic') as HTMLTextAreaElement).value = mnemonic
      showKeys(recoverKeys(mnemonic, isMainnetSelected()))
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setText('passkey-error', 'Passkey confirmation was cancelled or not allowed. Try again.')
      } else if (err instanceof DOMException && err.name === 'SecurityError') {
        setText(
          'passkey-error',
          'The browser refused the passkey for this origin — serve this page at the wallet’s exact domain (see the rescue server steps).',
        )
      } else {
        setText('passkey-error', err instanceof Error ? err.message : 'Passkey recovery failed')
      }
    }
  })
} else {
  $('passkey-file-mode').classList.remove('hidden')
  $('download-serve').addEventListener('click', () => {
    const blob = new Blob([serveScript], { type: 'text/javascript' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'arkade-rescue-server.mjs'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  })
}

// copy buttons: navigator.clipboard needs no network and works offline
document.querySelectorAll<HTMLButtonElement>('button.copy').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const target = btn.dataset.copy
    if (!target) return
    const text = $(target).textContent ?? ''
    try {
      await navigator.clipboard.writeText(text)
      btn.textContent = 'copied'
      setTimeout(() => (btn.textContent = 'copy'), 1500)
    } catch {
      btn.textContent = 'copy failed'
    }
  })
})
