import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Delegates from '../../../screens/Settings/Delegates'
import { ConfigContext } from '../../../providers/config'
import { mockAspContextValue, mockConfigContextValue } from '../mocks'
import { AspContext } from '../../../providers/asp'
import { getEmulatorPubkeyHexForNetwork } from '../../../lib/constants'

// jsdom's AbortSignal trips vitest-fetch-mock under the SDK's fetch, so the providers are faked
const calls = vi.hoisted(() => ({ urls: [] as string[], info: {} as Record<string, string> }))
let info: Record<string, string>

vi.mock('@arkade-os/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@arkade-os/sdk')>()),
  RestDelegateeProvider: class {
    constructor(readonly url: string) {}
    getInfo = async () => {
      calls.urls.push(`${this.url}/v1/info`)
      return calls.info
    }
    getDelegation = async (address: string) => {
      calls.urls.push(`${this.url}/v1/delegate/${address}`)
      return {
        delegation: { id: 1, address, status: 'active', templateId: 'ef', variables: {}, slots: [] },
        vtxos: [
          { outpoint: 'aa:0', amount: 1500, preconfirmed: false, assets: [], onchain: false, renewableAt: 2e9 },
          { outpoint: 'bb:0', amount: 2000, preconfirmed: false, assets: [], onchain: false },
        ],
        renewals: [],
      }
    }
  },
}))

const delegation = {
  keys: { delegatePubkey: '02', serverPubkey: '02', emulatorPubkey: '02' },
  params: { exitDelay: 0x400001, boardingExitDelay: 0x400002, renewalWindow: 256, maxFee: 100 },
  renewal: { address: 'tark1renewal', templateId: 'ef', variables: { owner: '02' } },
  boarding: { address: 'bcrt1pboarding', templateId: 'b0', variables: { owner: '02' } },
}

let mockDelegatesAspContextValue = { ...mockAspContextValue }

const getMockConfigWithDelegate = (bool: boolean) => ({
  ...mockConfigContextValue,
  config: { ...mockConfigContextValue.config, delegate: bool },
})

const renderWith = (config: object, aspContext: object = mockDelegatesAspContextValue) =>
  render(
    <AspContext.Provider value={aspContext as any}>
      <ConfigContext.Provider value={{ ...mockConfigContextValue, config } as any}>
        <Delegates />
      </ConfigContext.Provider>
    </AspContext.Provider>,
  )

describe('Delegates screen', () => {
  // The endpoint's server signer must match the configured Arkade signer.
  beforeEach(() => {
    mockDelegatesAspContextValue.aspInfo.signerPubkey =
      '02e35799157be4b37565bb5afe4d04e6a0fa0a4b6a4f4e48b0d904685d253cdbdb'

    info = {
      version: 'test',
      network: mockAspContextValue.aspInfo.network,
      delegatePubkey: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
      serverPubkey: mockDelegatesAspContextValue.aspInfo.signerPubkey,
      emulatorPubkey: getEmulatorPubkeyHexForNetwork('regtest')!,
    }
    calls.info = info
    calls.urls = []
  })

  it('renders the delegates screen with the correct elements when config delegate is false', () => {
    render(
      <AspContext.Provider value={mockDelegatesAspContextValue as any}>
        <ConfigContext.Provider value={getMockConfigWithDelegate(false) as any}>
          <Delegates />
        </ConfigContext.Provider>
      </AspContext.Provider>,
    )
    expect(screen.getByText('Delegates')).toBeInTheDocument()
    expect(screen.getByText('Learn more')).toBeInTheDocument()
    expect(screen.getByText('What is a Delegate?')).toBeInTheDocument()
    expect(screen.getByText('Use default Arkade delegate')).toBeInTheDocument()
    expect(screen.getByText(/Delegates can only renew your VTXOs/)).toBeInTheDocument()
    expect(screen.getByText('The wallet will reload to apply the change.')).toBeInTheDocument()
    expect(screen.getByTestId('toggle-delegates').getAttribute('checked')).toBeFalsy()
    expect(() => screen.getByTestId('delegate-card')).toThrow()
  })

  it('renders the delegate card when toggle is on and the service matches the Ark server', async () => {
    render(
      <AspContext.Provider value={mockDelegatesAspContextValue as any}>
        <ConfigContext.Provider value={getMockConfigWithDelegate(true) as any}>
          <Delegates />
        </ConfigContext.Provider>
      </AspContext.Provider>,
    )
    expect(screen.getByText('Delegates')).toBeInTheDocument()
    expect(screen.getByText('Learn more')).toBeInTheDocument()
    expect(screen.getByText('What is a Delegate?')).toBeInTheDocument()
    expect(screen.getByText('Use default Arkade delegate')).toBeInTheDocument()
    expect(screen.getByText(/Delegates can only renew your VTXOs/)).toBeInTheDocument()
    expect(screen.getByText('The wallet will reload to apply the change.')).toBeInTheDocument()
    expect(screen.getByTestId('toggle-delegates').getAttribute('data-checked')).toBe('true')
    expect(screen.getByTestId('delegate-card')).toBeInTheDocument()
    expect(screen.getByText('Arkade Default')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Active')).toBeInTheDocument())
    expect(screen.getByText(/delegate key:/)).toBeInTheDocument()
    expect(screen.getByText(/emulator key:/)).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(calls.urls).toHaveLength(1)
    expect(calls.urls[0]).toMatch(/\/v1\/info$/)
  })

  it('stays inactive when the service has another emulator key', async () => {
    info.emulatorPubkey = '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
    renderWith({ ...mockConfigContextValue.config, delegate: true })
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('stays inactive when the service has another server key', async () => {
    info.serverPubkey = '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
    renderWith({ ...mockConfigContextValue.config, delegate: true })
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('shows the renewal address, the delegated balance and the next renewal of a delegation', async () => {
    renderWith({ ...mockConfigContextValue.config, delegate: true, delegation })
    await waitFor(() => expect(screen.getByText('delegation: active')).toBeInTheDocument())
    expect(screen.getByText(/delegated balance: 3,?500 sats/)).toBeInTheDocument()
    expect(screen.getByText(/renewal address:/)).toBeInTheDocument()
    expect(screen.getByText(/boarding address:/)).toBeInTheDocument()
    expect(screen.getByText(/next renewal/)).toBeInTheDocument()
    expect(calls.urls.some((u) => u.endsWith('/v1/delegate/tark1renewal'))).toBe(true)
  })

  it('ignores a delegation stored under the retired templates', async () => {
    const old = { boarding: delegation.boarding, watch: delegation.renewal }
    renderWith({ ...mockConfigContextValue.config, delegate: true, delegation: old })
    await waitFor(() => expect(screen.getByText('Active')).toBeInTheDocument())
    expect(() => screen.getByText(/renewal address:/)).toThrow()
  })

  it('renders warning when delegate is not found for the network', () => {
    const mockAspContextValueWithUnknownNetwork = {
      ...mockDelegatesAspContextValue,
      aspInfo: {
        ...mockDelegatesAspContextValue.aspInfo,
        network: 'unknown' as any,
      },
    }

    render(
      <AspContext.Provider value={mockAspContextValueWithUnknownNetwork as any}>
        <ConfigContext.Provider value={getMockConfigWithDelegate(true) as any}>
          <Delegates />
        </ConfigContext.Provider>
      </AspContext.Provider>,
    )

    expect(screen.getByText('Delegates')).toBeInTheDocument()
    expect(screen.getByText('Learn more')).toBeInTheDocument()
    expect(screen.getByText('What is a Delegate?')).toBeInTheDocument()
    expect(screen.getByText('No delegate found for this network.')).toBeInTheDocument()
    expect(() => screen.getByTestId('delegate-card')).toThrow()
  })
})
