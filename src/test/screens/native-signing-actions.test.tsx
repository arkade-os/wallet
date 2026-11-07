import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Burn from '../../screens/Apps/Assets/Burn'
import Reissue from '../../screens/Apps/Assets/Reissue'
import Mint from '../../screens/Apps/Assets/Mint'
import Vtxos from '../../screens/Settings/Vtxos'
import { WalletContext } from '../../providers/wallet'
import { FlowContext } from '../../providers/flow'
import { AspContext } from '../../providers/asp'
import { ConfigContext } from '../../providers/config'
import { LimitsContext } from '../../providers/limits'
import {
  mockWalletContextValue,
  mockFlowContextValue,
  mockAspContextValue,
  mockConfigContextValue,
  mockLimitsContextValue,
  mockSvcWallet,
} from './mocks'

const publicKey = `02${'11'.repeat(32)}`
const assetId = '22'.repeat(32)
const mocks = vi.hoisted(() => ({
  card: { status: 'disconnected', publicKey: '' },
  burn: vi.fn(),
  reissue: vi.fn(),
  issue: vi.fn(),
  settle: vi.fn(),
}))
vi.mock('../../lib/nativeBridge', async (original) => ({
  ...(await original<typeof import('../../lib/nativeBridge')>()),
  getNativeCardState: () => mocks.card,
}))
vi.mock('../../lib/asp', async (original) => ({
  ...(await original<typeof import('../../lib/asp')>()),
  getInputsToSettle: async () => ({ boardingUtxos: [], inputs: [{ value: 1000 }], vtxos: [{ value: 1000 }] }),
  settleVtxos: (...args: unknown[]) => mocks.settle(...args),
}))
vi.mock('../../lib/walletRuntime', async (original) => ({
  ...(await original<typeof import('../../lib/walletRuntime')>()),
  watchWalletPayments: (_wallet: unknown, listener: (event: { data: { type: string } }) => void) => {
    queueMicrotask(() => listener({ data: { type: 'VTXO_UPDATE' } }))
    return () => {}
  },
}))
vi.mock('../../components/NativeCardConnectSheet', () => ({
  default: ({ isOpen, onClose, onConnected }: { isOpen: boolean; onClose: () => void; onConnected: () => void }) =>
    isOpen ? (
      <div role='dialog' aria-label='Connect Satochip'>
        <button onClick={onClose}>Cancel connection</button>
        <button onClick={onConnected}>Connection complete</button>
      </div>
    ) : null,
}))
vi.mock('../../hooks/useReducedMotion', () => ({ useReducedMotion: () => true }))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.card = { status: 'disconnected', publicKey: '' }
  mocks.burn.mockResolvedValue('burn-fixture')
  mocks.reissue.mockResolvedValue('reissue-fixture')
  mocks.issue.mockResolvedValue({ assetId, arkTxId: 'issue-fixture' })
  mocks.settle.mockResolvedValue(undefined)
})

const actions = [
  { name: 'Burn', page: <Burn />, submit: mocks.burn, confirmation: 'Confirm Burn' },
  { name: 'Reissue', page: <Reissue />, submit: mocks.reissue, confirmation: 'Confirm Reissue' },
  { name: 'Mint', page: <Mint />, submit: mocks.issue, confirmation: undefined },
  { name: 'Renew', page: <Vtxos />, submit: mocks.settle, confirmation: undefined },
]

async function show(
  action: (typeof actions)[number],
  hardware = true,
  options: { setCacheEntry?: typeof mockWalletContextValue.setCacheEntry } = {},
) {
  render(
    <ConfigContext.Provider value={mockConfigContextValue}>
      <AspContext.Provider value={mockAspContextValue}>
        <LimitsContext.Provider value={mockLimitsContextValue}>
          <FlowContext.Provider
            value={{
              ...mockFlowContextValue,
              assetInfo: { assetId, supply: 1000n, metadata: { name: 'Test token', ticker: 'TST', decimals: 0 } },
            }}
          >
            <WalletContext.Provider
              value={{
                ...mockWalletContextValue,
                wallet: hardware
                  ? { nextRollover: 0, pubkey: publicKey, signer: { type: 'native', publicKey, name: 'Satochip' } }
                  : { nextRollover: 0 },
                assetBalances: [{ assetId, amount: 1000n }],
                ...options,
                svcWallet: {
                  ...mockSvcWallet,
                  assetManager: {
                    burn: mocks.burn,
                    reissue: mocks.reissue,
                    issue: mocks.issue,
                    getAssetDetails: async () => undefined,
                  },
                } as never,
              }}
            >
              {action.page}
            </WalletContext.Provider>
          </FlowContext.Provider>
        </LimitsContext.Provider>
      </AspContext.Provider>
    </ConfigContext.Provider>,
  )
  if (action.name === 'Mint') {
    fireEvent.change(screen.getByTestId('asset-name'), { target: { value: 'Test token' } })
    fireEvent.change(screen.getByTestId('asset-ticker'), { target: { value: 'TST' } })
    fireEvent.change(screen.getByTestId('asset-amount'), { target: { value: '10' } })
  } else if (action.name === 'Burn') {
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '10' } })
  } else if (action.name === 'Reissue') {
    fireEvent.change(screen.getByTestId('asset-amount'), { target: { value: '10' } })
  }
  await waitFor(() => expect(screen.getByRole('button', { name: action.name })).toBeEnabled())
}

function pressAction(action: (typeof actions)[number]) {
  fireEvent.click(screen.getByRole('button', { name: action.name }))
}

async function confirmIfNeeded(action: (typeof actions)[number]) {
  if (!action.confirmation) return
  expect(screen.getByText(action.confirmation)).toBeInTheDocument()
  fireEvent.click(screen.getAllByRole('button', { name: action.name })[0])
}

describe.each(actions)('$name hardware signing guidance', (action) => {
  it('offers reconnect and preserves the form when cancelled without submitting', async () => {
    await show(action)
    pressAction(action)
    expect(screen.getByRole('dialog', { name: 'Connect Satochip' })).toBeInTheDocument()
    fireEvent.click(screen.getByText('Cancel connection'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(action.submit).not.toHaveBeenCalled()
    if (action.name !== 'Renew') {
      expect(screen.getByDisplayValue('10')).toBeInTheDocument()
    }
  })

  it('requires a new explicit action after reconnect and retains entered details', async () => {
    await show(action)
    pressAction(action)
    mocks.card = { status: 'connected', publicKey }
    fireEvent.click(screen.getByText('Connection complete'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('Review')
    expect(action.submit).not.toHaveBeenCalled()
    pressAction(action)
    await confirmIfNeeded(action)
    await waitFor(() => expect(action.submit).toHaveBeenCalledOnce())
    if (action.name !== 'Renew') expect(action.submit).toHaveBeenCalledWith(expect.objectContaining({ amount: 10n }))
  })

  it('requires the wallet card when a different card is connected', async () => {
    mocks.card = { status: 'connected', publicKey: `02${'33'.repeat(32)}` }
    await show(action)
    pressAction(action)
    expect(screen.getByRole('dialog', { name: 'Connect Satochip' })).toBeInTheDocument()
    expect(action.submit).not.toHaveBeenCalled()
  })

  it('keeps software wallet actions available without a card', async () => {
    await show(action, false)
    pressAction(action)
    await confirmIfNeeded(action)
    await waitFor(() => expect(action.submit).toHaveBeenCalledOnce())
    expect(screen.queryByRole('dialog', { name: 'Connect Satochip' })).toBeNull()
  })

  it('clears the prior signing error after reconnect without retrying the action', async () => {
    mocks.card = { status: 'connected', publicKey }
    action.submit.mockRejectedValueOnce(new Error('Card removed during signing'))
    await show(action)
    pressAction(action)
    await confirmIfNeeded(action)
    expect(await screen.findByText('Card removed during signing')).toBeInTheDocument()
    mocks.card = { status: 'disconnected', publicKey: '' }
    pressAction(action)
    mocks.card = { status: 'connected', publicKey }
    fireEvent.click(screen.getByText('Connection complete'))
    expect(screen.queryByText('Card removed during signing')).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent(`press ${action.name} again`)
    expect(action.submit).toHaveBeenCalledOnce()
  })
})

it.each(actions.filter((action) => action.confirmation))(
  'rechecks the card after $name confirmation and does not submit after reconnect',
  async (action) => {
    mocks.card = { status: 'connected', publicKey }
    await show(action)
    pressAction(action)
    mocks.card = { status: 'disconnected', publicKey: '' }
    await confirmIfNeeded(action)
    expect(await screen.findByRole('dialog', { name: 'Connect Satochip' })).toBeInTheDocument()
    expect(screen.queryByText(action.confirmation!)).toBeNull()
    expect(action.submit).not.toHaveBeenCalled()
    mocks.card = { status: 'connected', publicKey }
    fireEvent.click(screen.getByText('Connection complete'))
    expect(action.submit).not.toHaveBeenCalled()
  },
)

describe('two-step native asset mint recovery', () => {
  it('reuses the issued control asset after a failed mint and explicit reconnect', async () => {
    const action = actions[2]
    const controlAssetId = '44'.repeat(32)
    mocks.card = { status: 'connected', publicKey }
    mocks.issue
      .mockResolvedValueOnce({ assetId: controlAssetId, arkTxId: 'control-fixture' })
      .mockRejectedValueOnce(new Error('Card removed before asset issuance'))
    await show(action)
    fireEvent.click(screen.getByRole('tab', { name: 'New' }))
    fireEvent.change(screen.getByTestId('control-asset-amount'), { target: { value: '2' } })
    pressAction(action)
    expect(await screen.findByText('Card removed before asset issuance')).toBeInTheDocument()
    expect(screen.getByTestId('control-asset-id')).toHaveValue(controlAssetId)
    expect(screen.getByTestId('asset-name')).toHaveValue('Test token')
    expect(screen.getByTestId('asset-ticker')).toHaveValue('TST')
    expect(screen.getByTestId('asset-amount')).toHaveValue('10')
    expect(mocks.issue).toHaveBeenNthCalledWith(1, {
      amount: 2n,
      metadata: { name: 'ctrl-Test token', ticker: 'ctrl-TST', decimals: 0 },
    })
    expect(mocks.issue).toHaveBeenNthCalledWith(2, {
      amount: 10n,
      metadata: { name: 'Test token', ticker: 'TST', decimals: 0 },
      controlAssetId,
    })
    mocks.card = { status: 'disconnected', publicKey: '' }
    pressAction(action)
    mocks.card = { status: 'connected', publicKey }
    fireEvent.click(screen.getByText('Connection complete'))
    expect(mocks.issue).toHaveBeenCalledTimes(2)
    pressAction(action)
    await waitFor(() => expect(mocks.issue).toHaveBeenCalledTimes(3))
    expect(mocks.issue).toHaveBeenNthCalledWith(3, {
      amount: 10n,
      metadata: { name: 'Test token', ticker: 'TST', decimals: 0 },
      controlAssetId,
    })
  })

  it('does not offer another mint after issuance succeeds but local metadata storage fails', async () => {
    mocks.card = { status: 'connected', publicKey }
    const setCacheEntry = vi.fn(() => {
      throw new Error('Fixture metadata cache unavailable')
    })
    await show(actions[2], true, { setCacheEntry })
    pressAction(actions[2])
    await waitFor(() => expect(setCacheEntry).toHaveBeenCalledOnce())
    expect(screen.queryByRole('button', { name: 'Mint' })).toBeNull()
    expect(mocks.issue).toHaveBeenCalledOnce()
  })
})
