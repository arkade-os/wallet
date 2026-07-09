import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Delegates from '../../../screens/Settings/Delegates'
import { ConfigContext } from '../../../providers/config'
import { mockAspContextValue, mockConfigContextValue } from '../mocks'
import { AspContext } from '../../../providers/asp'
import createFetchMock from 'vitest-fetch-mock'
import { getDelegateUrlForNetwork } from '../../../lib/constants'

let mockDelegatesAspContextValue = { ...mockAspContextValue }

const getMockConfigWithDelegate = (bool: boolean) => ({
  ...mockConfigContextValue,
  config: { ...mockConfigContextValue.config, delegate: bool },
})

describe('Delegates screen', () => {
  // We need values to match due to heavy delegator validation in the Delegates screen.
  beforeEach(() => {
    mockDelegatesAspContextValue.aspInfo.signerPubkey =
      '02e35799157be4b37565bb5afe4d04e6a0fa0a4b6a4f4e48b0d904685d253cdbdb'

    const fetchMocker = createFetchMock(vi)
    fetchMocker.enableMocks()
    fetchMocker.mockResponseOnce(
      JSON.stringify({
        fee: '0',
        name: 'Arkade Default',
        pubkey: '03bab0ac7577f83c5f08a616513e738fee0e45e1cda229880287d8659af3452f10',
        delegatorAddress:
          'tark1qr340xg400jtxat9hdd0ungyu6s05zjtdf85uj9smyzxshf98nda' +
          'kuvt95jprxrtpqarxd7seg9sh0n8lxh90rtg7e6hsfd9krel4cqutg9cgm',
        url: getDelegateUrlForNetwork(mockAspContextValue.aspInfo.network as any),
      }),
    )
  })

  afterEach(() => {
    const fetchMocker = createFetchMock(vi)
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

  it('renders the delegate card when toggle is on', () => {
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
    expect(screen.getByText('fee: 0 sats')).toBeInTheDocument()
    expect(screen.getByText('address:')).toBeInTheDocument()
    expect(screen.getByText('pubkey:')).toBeInTheDocument()
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
