import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ReactNode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { hex } from '@scure/base'
import { Transaction as BtcTransaction } from '@scure/btc-signer'
import { AspContext } from '../../../providers/asp'
import { WalletContext } from '../../../providers/wallet'
import { ToastProvider } from '../../../components/Toast'
import { mockAspContextValue, mockWalletContextValue } from '../mocks'
import fixtures from '../../fixtures.json'

const bridge = vi.hoisted(() => ({ handlers: undefined as any }))

vi.mock('@lendasat/lendasat-wallet-bridge', () => ({
  AddressType: { ARK: 'ARK', BITCOIN: 'BITCOIN', LOAN_ASSET: 'LOAN_ASSET' },
  WalletProvider: class {
    constructor(handlers: any) {
      bridge.handlers = handlers
    }
    listen() {}
    destroy() {}
  },
}))

const asp = vi.hoisted(() => ({ collaborativeExit: vi.fn(), getReceivingAddresses: vi.fn() }))

vi.mock('../../../lib/asp', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/asp')>()),
  collaborativeExit: asp.collaborativeExit,
  getReceivingAddresses: asp.getReceivingAddresses,
}))

// the drawer primitive behind SheetModal reads layout on pointer release, which jsdom cannot provide
vi.mock('../../../components/SheetModal', () => ({
  default: ({ children, isOpen }: { children?: ReactNode; isOpen: boolean }) => (isOpen ? <div>{children}</div> : null),
}))

const ARK_ADDRESS = fixtures.lib.address.ark[0].address
const BTC_ADDRESS = 'bcrt1pj7fdvrpdsn0cl6722tmcvwcw4yqpe46020g43nhgzl90qq4aqjrs33du9f'

const TXID = '11'.repeat(32)
const wpkhScript = (fill: number) => Uint8Array.from([0x00, 0x14, ...new Uint8Array(20).fill(fill)])

const signablePsbt = () => {
  const tx = new BtcTransaction()
  tx.addInput({ txid: TXID, index: 0, witnessUtxo: { script: wpkhScript(1), amount: BigInt(10_000) } })
  tx.addOutput({ script: wpkhScript(7), amount: BigInt(9_800) })
  return hex.encode(tx.toPSBT())
}

// a legacy input, which names its amount through the funding transaction rather than a witness utxo
const legacyPsbt = () => {
  const funding = new BtcTransaction({ allowUnknownInputs: true })
  funding.addInput({ txid: '22'.repeat(32), index: 0 })
  funding.addOutput({ script: wpkhScript(1), amount: BigInt(1_111) })
  funding.addOutput({ script: wpkhScript(2), amount: BigInt(10_000) })

  const tx = new BtcTransaction()
  tx.addInput({ txid: funding.id, index: 1, nonWitnessUtxo: funding.toBytes(true, false) })
  tx.addOutput({ script: wpkhScript(7), amount: BigInt(9_800) })
  return hex.encode(tx.toPSBT())
}

const undescribablePsbt = () => {
  const tx = new BtcTransaction({ allowUnknownInputs: true })
  tx.addInput({ txid: TXID, index: 0 })
  tx.addOutput({ script: wpkhScript(7), amount: BigInt(9_800) })
  return hex.encode(tx.toPSBT())
}

const svcWallet = {
  send: vi.fn(),
  identity: {
    sign: vi.fn(),
    compressedPublicKey: vi.fn().mockResolvedValue(new Uint8Array(33)),
  },
}

const renderApp = async (Screen: () => JSX.Element) => {
  render(
    <AspContext.Provider value={mockAspContextValue as any}>
      <WalletContext.Provider value={{ ...mockWalletContextValue, svcWallet } as any}>
        <ToastProvider>
          <Screen />
        </ToastProvider>
      </WalletContext.Provider>
    </AspContext.Provider>,
  )
  await waitFor(() => expect(bridge.handlers?.onSendToAddress).toBeDefined())
}

beforeEach(() => {
  bridge.handlers = undefined
  vi.clearAllMocks()
  svcWallet.send.mockResolvedValue('sent-txid')
  svcWallet.identity.sign.mockImplementation((tx: any) => Promise.resolve(tx))
  asp.collaborativeExit.mockResolvedValue('exit-txid')
  asp.getReceivingAddresses.mockResolvedValue({ offchainAddr: ARK_ADDRESS, boardingAddr: 'bcrt1qboarding' })
})

describe.each([
  ['Lendasat', () => import('../../../screens/Apps/Lendasat/Index')],
  ['Satora', () => import('../../../screens/Apps/Satora/Index')],
])('%s payment requests', (app, load) => {
  const mount = async () => renderApp((await load()).default)

  it('sends only after the user approves', async () => {
    await mount()

    const result = bridge.handlers.onSendToAddress(ARK_ADDRESS, 1_000, 'bitcoin')

    await screen.findByTestId('bridge-confirm-sheet')
    expect(screen.getByText(`${app} is asking your wallet to do this`)).toBeInTheDocument()
    expect(screen.getByTestId('Amount').textContent).toBe('1,000 sats')
    expect(screen.getByTestId('Network').textContent).toBe('Arkade')
    expect(svcWallet.send).not.toHaveBeenCalled()

    await userEvent.click(screen.getByTestId('bridge-confirm-approve'))

    await expect(result).resolves.toBe('sent-txid')
    expect(svcWallet.send).toHaveBeenCalledWith({ amount: 1_000, address: ARK_ADDRESS })
  })

  it('does not send when the user cancels', async () => {
    await mount()

    const declined = expect(bridge.handlers.onSendToAddress(ARK_ADDRESS, 1_000, 'bitcoin')).rejects.toThrow(
      'Payment declined',
    )
    await screen.findByTestId('bridge-confirm-sheet')
    await userEvent.click(screen.getByTestId('bridge-confirm-reject'))

    await declined
    expect(svcWallet.send).not.toHaveBeenCalled()
  })

  it('names the on-chain route before leaving Arkade', async () => {
    await mount()

    const result = bridge.handlers.onSendToAddress(BTC_ADDRESS, 2_500, 'bitcoin')

    await screen.findByTestId('bridge-confirm-sheet')
    expect(screen.getByTestId('Network').textContent).toBe('Bitcoin')
    expect(asp.collaborativeExit).not.toHaveBeenCalled()

    await userEvent.click(screen.getByTestId('bridge-confirm-approve'))

    await expect(result).resolves.toBe('exit-txid')
    expect(asp.collaborativeExit).toHaveBeenCalledWith(svcWallet, 2_500, BTC_ADDRESS)
  })

  it('does not exit on-chain when the user cancels', async () => {
    await mount()

    const declined = expect(bridge.handlers.onSendToAddress(BTC_ADDRESS, 2_500, 'bitcoin')).rejects.toThrow(
      'Payment declined',
    )
    await screen.findByTestId('bridge-confirm-sheet')
    await userEvent.click(screen.getByTestId('bridge-confirm-reject'))

    await declined
    expect(asp.collaborativeExit).not.toHaveBeenCalled()
  })

  it('rejects an invalid amount without prompting', async () => {
    await mount()

    await expect(bridge.handlers.onSendToAddress(ARK_ADDRESS, 1.5, 'bitcoin')).rejects.toThrow('Invalid amount')
    expect(screen.queryByTestId('bridge-confirm-sheet')).not.toBeInTheDocument()
    expect(svcWallet.send).not.toHaveBeenCalled()
  })

  it('turns down a second request while one is open', async () => {
    await mount()

    const first = bridge.handlers.onSendToAddress(ARK_ADDRESS, 1_000, 'bitcoin')
    await screen.findByTestId('bridge-confirm-sheet')

    await expect(bridge.handlers.onSendToAddress(ARK_ADDRESS, 9_999, 'bitcoin')).rejects.toThrow('Payment declined')

    await userEvent.click(screen.getByTestId('bridge-confirm-approve'))
    await expect(first).resolves.toBe('sent-txid')
    expect(svcWallet.send).toHaveBeenCalledTimes(1)
    expect(svcWallet.send).toHaveBeenCalledWith({ amount: 1_000, address: ARK_ADDRESS })
  })
})

describe('Lendasat signing requests', () => {
  const mount = async () => renderApp((await import('../../../screens/Apps/Lendasat/Index')).default)

  it('signs only after the user approves', async () => {
    await mount()

    const result = bridge.handlers.onSignPsbt(signablePsbt())

    await screen.findByTestId('bridge-confirm-sheet')
    expect(screen.getByTestId('Input total').textContent).toBe('10,000 sats')
    expect(screen.getByTestId('Network fee').textContent).toBe('200 sats')
    expect(screen.getByTestId('Inputs in transaction').textContent).toBe('1')
    expect(svcWallet.identity.sign).not.toHaveBeenCalled()

    await userEvent.click(screen.getByTestId('bridge-confirm-approve'))

    await result
    expect(svcWallet.identity.sign).toHaveBeenCalledTimes(1)
  })

  it('prompts for a legacy input instead of turning it away', async () => {
    await mount()

    const result = bridge.handlers.onSignPsbt(legacyPsbt())

    await screen.findByTestId('bridge-confirm-sheet')
    expect(screen.getByTestId('Input total').textContent).toBe('10,000 sats')
    expect(screen.getByTestId('Network fee').textContent).toBe('200 sats')

    await userEvent.click(screen.getByTestId('bridge-confirm-approve'))

    await result
    expect(svcWallet.identity.sign).toHaveBeenCalledTimes(1)
  })

  it('does not sign when the user cancels', async () => {
    await mount()

    const declined = expect(bridge.handlers.onSignPsbt(signablePsbt())).rejects.toThrow('Signature declined')
    await screen.findByTestId('bridge-confirm-sheet')
    await userEvent.click(screen.getByTestId('bridge-confirm-reject'))

    await declined
    expect(svcWallet.identity.sign).not.toHaveBeenCalled()
  })

  it('turns down a transaction it cannot describe, without prompting', async () => {
    await mount()

    await expect(bridge.handlers.onSignPsbt(undescribablePsbt())).rejects.toThrow('Unable to describe this transaction')
    expect(screen.queryByTestId('bridge-confirm-sheet')).not.toBeInTheDocument()
    expect(svcWallet.identity.sign).not.toHaveBeenCalled()
  })
})
