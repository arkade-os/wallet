import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Delegates from '../../../screens/Settings/Delegates'
import { ConfigContext } from '../../../providers/config'
import { mockAspContextValue, mockConfigContextValue } from '../mocks'
import { AspContext } from '../../../providers/asp'
import createFetchMock from 'vitest-fetch-mock'
import { getDelegateUrlForNetwork } from '../../../lib/constants'

let fetchMocker: ReturnType<typeof createFetchMock>
let mockDelegatesAspContextValue = { ...mockAspContextValue }

const getMockConfigWithDelegate = (bool: boolean) => ({
  ...mockConfigContextValue,
  config: { ...mockConfigContextValue.config, delegate: bool },
})

describe('Delegates screen', () => {
  // The endpoint's server signer must match the configured Arkade signer.
  beforeEach(() => {
    mockDelegatesAspContextValue.aspInfo.signerPubkey =
      '02e35799157be4b37565bb5afe4d04e6a0fa0a4b6a4f4e48b0d904685d253cdbdb'

    fetchMocker = createFetchMock(vi)
    fetchMocker.enableMocks()
    fetchMocker.mockResponse(
      JSON.stringify({
        version: 'test',
        network: mockAspContextValue.aspInfo.network,
        delegatePubkey: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
        serverPubkey: mockDelegatesAspContextValue.aspInfo.signerPubkey,
        emulatorPubkey: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
        emulatorTweakedPubkey: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
        arkadeScript: '00',
        delegateTapscript: '00',
        renewalWindow: '1024',
        url: getDelegateUrlForNetwork(mockAspContextValue.aspInfo.network as any),
      }),
    )
  })

  afterEach(() => {
    fetchMocker.disableMocks()
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

  it('renders the delegate card when toggle is on and the service omits zero maxFee', async () => {
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
    expect(screen.getByText('maximum renewal fee: 0 sats')).toBeInTheDocument()
    expect(screen.getByText(/delegate key:/)).toBeInTheDocument()
    expect(screen.getByText(/emulator key:/)).toBeInTheDocument()
    expect(screen.getByText('renewal window: 1024 seconds')).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(fetchMocker).toHaveBeenCalledTimes(1)
    expect(fetchMocker.mock.calls[0][0]).toContain('/v1/info?renewalWindow=1024&maxFee=0')
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
