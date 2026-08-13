import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { mnemonicToEntropy } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'
import { bytesToLatin1 } from '../../lib/seedQr'
import Restore from '../../screens/Init/Restore'
import { ConfigContext } from '../../providers/config'
import { NavigationContext } from '../../providers/navigation'
import { FlowContext } from '../../providers/flow'
import { AspContext } from '../../providers/asp'
import { DevModeContext } from '../../providers/devMode'
import { BackupContext } from '../../providers/backup'
import {
  mockConfigContextValue,
  mockNavigationContextValue,
  mockFlowContextValue,
  mockAspContextValue,
  mockDevModeContextValue,
} from './mocks'

const validMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const privateKeyHex = 'aa'.repeat(32)

/** Payload the stubbed scanner emits; set per test before opening the scanner. */
let scannedPayload = ''

// The real Scanner drives getUserMedia, which jsdom has not got. Stub it down to
// the contract this screen depends on: it hands back one string, then closes.
vi.mock('../../components/Scanner', () => ({
  default: ({ close, onData }: { close: () => void; onData: (data: string) => void }) => (
    <button
      onClick={() => {
        onData(scannedPayload)
        close()
      }}
    >
      emit scan
    </button>
  ),
}))

const scanQr = (payload: string) => {
  scannedPayload = payload
  fireEvent.click(screen.getByRole('button', { name: 'Scan QR' }))
  fireEvent.click(screen.getByRole('button', { name: 'emit scan' }))
}

function renderRestore(devMode: boolean) {
  const backupContextValue = {
    restore: vi.fn().mockResolvedValue(undefined),
  }

  return render(
    <DevModeContext.Provider value={{ ...mockDevModeContextValue, devMode }}>
      <ConfigContext.Provider value={mockConfigContextValue as any}>
        <AspContext.Provider value={mockAspContextValue as any}>
          <NavigationContext.Provider value={mockNavigationContextValue as any}>
            <FlowContext.Provider value={mockFlowContextValue as any}>
              <BackupContext.Provider value={backupContextValue as any}>
                <Restore />
              </BackupContext.Provider>
            </FlowContext.Provider>
          </NavigationContext.Provider>
        </AspContext.Provider>
      </ConfigContext.Provider>
    </DevModeContext.Provider>,
  )
}

const typeKey = (value: string) => {
  fireEvent.change(screen.getByRole('textbox'), { target: { value } })
}

describe('Restore screen — rotation control gating', () => {
  it('does not show the rotation control when dev mode is off, even for a valid mnemonic', async () => {
    renderRestore(false)
    typeKey(validMnemonic)
    // give the detection effect a chance to run
    expect(await screen.findByText(/Do not\s+share any of them with anyone\./)).toBeInTheDocument()
    expect(screen.queryByText('Address rotation')).not.toBeInTheDocument()
  })

  it('shows the rotation control when dev mode is on and a valid mnemonic is detected', async () => {
    renderRestore(true)
    typeKey(validMnemonic)
    expect(await screen.findByText('Address rotation')).toBeInTheDocument()
    expect(screen.getByText('Inherit')).toBeInTheDocument()
  })

  it('does not show the rotation control for a private key, even in dev mode', async () => {
    renderRestore(true)
    typeKey(privateKeyHex)
    expect(await screen.findByText(/Do not\s+share any of them with anyone\./)).toBeInTheDocument()
    expect(screen.queryByText('Address rotation')).not.toBeInTheDocument()
  })
})

describe('Restore screen — scanning a recovery QR', () => {
  const standardSeedQr = validMnemonic
    .split(' ')
    .map((word) => String(wordlist.indexOf(word)).padStart(4, '0'))
    .join('')

  it('confirms a Standard SeedQR without putting the phrase on screen', async () => {
    renderRestore(false)
    scanQr(standardSeedQr)

    expect(await screen.findByText('Recovery phrase scanned')).toBeInTheDocument()
    expect(screen.getByText('12 words · SeedQR')).toBeInTheDocument()
    expect(screen.queryByText(validMnemonic)).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).not.toBeDisabled()
  })

  it('reads a CompactSeedQR delivered as raw bytes', async () => {
    renderRestore(false)
    scanQr(bytesToLatin1(mnemonicToEntropy(validMnemonic, wordlist)))

    expect(await screen.findByText('12 words · CompactSeedQR')).toBeInTheDocument()
  })

  it('names what was scanned when it is not a seed', async () => {
    renderRestore(false)
    scanQr('ur:crypto-hdkey/oyadgdstaslplabghydrpfmkbggufgludprfgmaotpiecffltnlpqdenos')

    expect(await screen.findByText(/holds a public key \(ur:crypto-hdkey\)/)).toBeInTheDocument()
    // The input stays, so typing the phrase by hand is still one tap away.
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('passes a scanned private key through to the existing validator', async () => {
    renderRestore(true)
    scanQr(privateKeyHex)

    expect(await screen.findByRole('textbox')).toHaveValue(privateKeyHex)
    expect(screen.queryByText('Address rotation')).not.toBeInTheDocument()
  })

  it('returns to the input when the scan is cleared', async () => {
    renderRestore(false)
    scanQr(standardSeedQr)

    fireEvent.click(await screen.findByRole('button', { name: 'Clear' }))
    expect(screen.getByRole('textbox')).toHaveValue('')
    expect(screen.queryByText('Recovery phrase scanned')).not.toBeInTheDocument()
  })
})
