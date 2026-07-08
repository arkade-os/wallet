import { decryptBackup, isValidMnemonic, keysFromPrivateKey, recoverKeys } from './crypto'

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
