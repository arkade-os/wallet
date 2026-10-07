import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { configure, render, screen } from '@testing-library/react'
import { SingleKey } from '@arkade-os/sdk'
import Lnurl from '../../../screens/Settings/Lnurl'
import { BackupContext } from '../../../providers/backup'
import { ConfigContext } from '../../../providers/config'
import { WalletContext } from '../../../providers/wallet'
import { mockConfigContextValue, mockWalletContextValue } from '../mocks'
import {
  DECODABLE_ARK,
  LNURL_BASE,
  WALLET_BOARDING_ADDRESS,
  fakeLnurlServer,
  namedAddress,
} from '../../lib/receive/fakeLnurlServer'

configure({ asyncUtilTimeout: 3_000 })

const svcWallet = {
  identity: SingleKey.fromHex('03'.repeat(32)),
  getAddress: async () => DECODABLE_ARK,
  getBoardingAddress: async () => WALLET_BOARDING_ADDRESS,
}

const renderPage = (opts: Parameters<typeof fakeLnurlServer>[0]) => {
  vi.stubGlobal('fetch', fakeLnurlServer(opts).fetch)
  render(
    <BackupContext.Provider value={{ backupAndUpdateConfig: vi.fn() } as never}>
      <ConfigContext.Provider value={mockConfigContextValue as never}>
        <WalletContext.Provider value={{ ...mockWalletContextValue, svcWallet } as never}>
          <Lnurl />
        </WalletContext.Provider>
      </ConfigContext.Provider>
    </BackupContext.Provider>,
  )
}

beforeEach(() => {
  vi.stubEnv('VITE_LNURL_SERVER', LNURL_BASE)
  vi.stubEnv('VITE_LNURL_DOMAIN', '')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('Lightning address settings', () => {
  it('shows the address, its server, and what payers can send on each rail', async () => {
    renderPage({ modes: ['self'], addresses: [namedAddress('alice')] })

    expect(await screen.findByText('alice@lnurl.test')).toBeInTheDocument()
    expect(screen.getByText('lnurl.test')).toBeInTheDocument()
    expect(await screen.findByText('10,000 – 100,000,000 sats')).toBeInTheDocument()
    expect(screen.getAllByText('1 – 100,000,000 sats')).toHaveLength(2)
  })

  it('points a wallet without an address to the Receive screen', async () => {
    renderPage({ modes: ['self'] })

    expect(await screen.findByText(/get one on the Receive screen/)).toBeInTheDocument()
  })
})
