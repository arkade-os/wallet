import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ExecutorContractHandler, getNetwork, type Contract } from '@arkade-os/sdk'
import { hex } from '@scure/base'
import Executor from '../../../screens/Settings/Executor'
import { AspContext } from '../../../providers/asp'
import { BackupContext } from '../../../providers/backup'
import { ConfigContext } from '../../../providers/config'
import { WalletContext } from '../../../providers/wallet'
import { ToastProvider } from '../../../components/Toast'
import { copyToClipboard } from '../../../lib/clipboard'
import { mockAspContextValue, mockConfigContextValue, mockSvcWallet, mockWalletContextValue } from '../mocks'

vi.mock('../../../lib/clipboard', () => ({ copyToClipboard: vi.fn() }))

// the toggle's click handler needs it, jsdom has none
if (!window.PointerEvent) {
  Object.defineProperty(window, 'PointerEvent', { writable: true, configurable: true, value: MouseEvent })
}

const SERVER = '02e35799157be4b37565bb5afe4d04e6a0fa0a4b6a4f4e48b0d904685d253cdbdb'
const COSIGNER = '03b7b369269133f17056e659f8f62b1a3adeb6217cabff6c216a9042d8de58eefb'
const EMULATOR = '02999413c46fa10ada5cbc4bcc79a1d09160c2ba3cfc812705d7a13e5e545fb2a9'

const info = {
  version: 'test',
  network: 'regtest',
  cosignerPubkey: COSIGNER,
  serverPubkey: SERVER,
  emulatorPubkey: EMULATOR,
}

const contractParams = (template: 'boarding' | 'renewal') =>
  ExecutorContractHandler.serializeParams({
    template,
    owner: hex.decode(EMULATOR),
    exitDelay: 4194305,
    renewalWindow: 86400,
    maxFee: 1000,
    ...(template === 'boarding' ? { boardingExitDelay: 4194305 } : {}),
    cosignerPubKey: hex.decode(COSIGNER),
    serverPubKey: hex.decode(SERVER),
    emulatorPubKey: hex.decode(EMULATOR),
  })

// the SDK records no address: the screen derives it from the contract's params
const BOARDING = ExecutorContractHandler.createScript(contractParams('boarding')).onchainAddress(getNetwork('regtest'))

const contract = (template: 'boarding' | 'renewal', metadata: Record<string, unknown>): Contract => ({
  type: 'executor',
  state: 'active',
  address: 'tark1qexecutor',
  script: `${template}-script`,
  createdAt: 1717000000000,
  params: contractParams(template),
  metadata,
})

// the boarding watch the SDK registered, and the renewal contract it boards into
const registered = [
  contract('boarding', { delegationStatus: 'active' }),
  contract('renewal', { delegationStatus: 'local' }),
]

const withContracts = (contracts: Contract[]) => ({
  ...mockSvcWallet,
  getContractManager: () => Promise.resolve({ getContracts: () => Promise.resolve(contracts) }),
})

const backupAndUpdateConfig = vi.fn()

const renderScreen = ({
  executor = true,
  network = 'regtest',
  contracts = registered,
}: { executor?: boolean; network?: string; contracts?: Contract[] } = {}) =>
  render(
    <AspContext.Provider
      value={{ ...mockAspContextValue, aspInfo: { ...mockAspContextValue.aspInfo, network, signerPubkey: SERVER } }}
    >
      <ConfigContext.Provider
        value={{ ...mockConfigContextValue, config: { ...mockConfigContextValue.config, executor } } as any}
      >
        <BackupContext.Provider value={{ backupAndUpdateConfig } as any}>
          <WalletContext.Provider value={{ ...mockWalletContextValue, svcWallet: withContracts(contracts) } as any}>
            <ToastProvider>
              <Executor />
            </ToastProvider>
          </WalletContext.Provider>
        </BackupContext.Provider>
      </ConfigContext.Provider>
    </AspContext.Provider>,
  )

const serveInfo = (body: object) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })),
  )

describe('Executor screen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // blank, not unset: a developer's .env.local may name one
    vi.stubEnv('VITE_EXECUTOR_URL', '')
    serveInfo(info)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it("shows the network's Executor and the boarding watch the wallet registered", async () => {
    renderScreen()

    expect(screen.getByText('What is the Executor?')).toBeInTheDocument()
    expect(screen.getByTestId('toggle-executor').getAttribute('data-checked')).toBe('true')
    expect(screen.getByText('http://localhost:7280')).toBeInTheDocument()
    expect(await screen.findByText('Active')).toBeInTheDocument()
    expect(screen.getByText(/^Executor key:/)).toBeInTheDocument()
    expect(await screen.findByText(/^boarding address:/)).toBeInTheDocument()
    expect(screen.getByText('watch: active')).toBeInTheDocument()
  })

  it('reads as inactive when the Executor serves another Ark server', async () => {
    serveInfo({ ...info, serverPubkey: COSIGNER })
    renderScreen()

    expect(await screen.findByText(/^Executor key:/)).toBeInTheDocument()
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('says so when the wallet has not registered yet', async () => {
    renderScreen({ contracts: [] })

    expect(await screen.findByText(/^Not registered yet/)).toBeInTheDocument()
    expect(screen.queryByText(/^boarding address:/)).not.toBeInTheDocument()
  })

  it('hides the card when the Executor is off', () => {
    renderScreen({ executor: false })

    expect(screen.getByTestId('toggle-executor').getAttribute('data-checked')).toBe('false')
    expect(screen.queryByTestId('executor-card')).not.toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('offers no toggle on a network without an Executor', () => {
    renderScreen({ network: 'signet' })

    expect(screen.getByText('No Executor found for this network.')).toBeInTheDocument()
    expect(screen.queryByTestId('toggle-executor')).not.toBeInTheDocument()
  })

  it('saves the flipped setting and reloads', () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })
    renderScreen()

    fireEvent.click(screen.getByTestId('toggle-executor'))

    expect(backupAndUpdateConfig).toHaveBeenCalledWith(expect.objectContaining({ executor: false }))
    expect(reload).toHaveBeenCalled()
  })

  it('copies the boarding address', async () => {
    vi.mocked(copyToClipboard).mockResolvedValue(true)
    renderScreen()

    fireEvent.click(await screen.findByText(/^boarding address:/))

    expect(await screen.findByText('Copied to clipboard')).toBeInTheDocument()
    expect(copyToClipboard).toHaveBeenCalledWith(BOARDING)
  })
})
