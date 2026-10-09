import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { configure, fireEvent, render, screen, within } from '@testing-library/react'
import { SingleKey } from '@arkade-os/sdk'
import Lnurl, { TOKEN_EXPLAINER } from '../../../screens/Settings/Lnurl'
import { BackupContext } from '../../../providers/backup'
import { ConfigContext } from '../../../providers/config'
import { WalletContext } from '../../../providers/wallet'
import { mockConfigContextValue, mockWalletContextValue } from '../mocks'
import type { Config } from '../../../lib/types'
import {
  DECODABLE_ARK,
  LNURL_BASE,
  WALLET_BOARDING_ADDRESS,
  fakeLnurlServer,
  namedAddress,
} from '../../lib/receive/fakeLnurlServer'

configure({ asyncUtilTimeout: 3_000 })

if (!window.PointerEvent) {
  Object.defineProperty(window, 'PointerEvent', { writable: true, configurable: true, value: MouseEvent })
}

vi.mock('../../../components/SheetModal', () => ({
  default: ({ isOpen, children }: { isOpen: boolean; children?: React.ReactNode }) =>
    isOpen ? <div data-testid='sheet-modal'>{children}</div> : null,
}))

const svcWallet = {
  identity: SingleKey.fromHex('03'.repeat(32)),
  getAddress: async () => DECODABLE_ARK,
  getBoardingAddress: async () => WALLET_BOARDING_ADDRESS,
}
const backupAndUpdateConfig = vi.fn<(config: Config) => void>()

const renderPage = (opts: Parameters<typeof fakeLnurlServer>[0], config: Partial<Config> = {}) => {
  vi.stubGlobal('fetch', fakeLnurlServer(opts).fetch)
  return render(
    <BackupContext.Provider value={{ backupAndUpdateConfig } as never}>
      <ConfigContext.Provider
        value={{ ...mockConfigContextValue, config: { ...mockConfigContextValue.config, ...config } } as never}
      >
        <WalletContext.Provider value={{ ...mockWalletContextValue, svcWallet } as never}>
          <Lnurl />
        </WalletContext.Provider>
      </ConfigContext.Provider>
    </BackupContext.Provider>,
  )
}

beforeEach(() => {
  backupAndUpdateConfig.mockClear()
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

  it('leaves token options out of what payers can send on each rail', async () => {
    renderPage({ modes: ['self'], addresses: [namedAddress('alice')], tokens: true })

    expect(await screen.findByText('10,000 – 100,000,000 sats')).toBeInTheDocument()
    expect(screen.getAllByText(/ sats$/)).toHaveLength(3)
  })
})

describe('Lightning address settings, tokens', () => {
  const tokensServed = { modes: ['self'], addresses: [namedAddress('alice')], tokens: true }

  it.each([
    ['receiving through the address is off', tokensServed, {}],
    [
      'the server advertises no token option',
      { modes: ['self'], addresses: [namedAddress('alice')] },
      { receiveViaLnurl: true },
    ],
  ])('offers no token switch when %s', async (_, opts, config) => {
    renderPage(opts, config)

    await screen.findByText('10,000 – 100,000,000 sats')
    expect(screen.queryByText('Accept tokens')).not.toBeInTheDocument()
  })

  it('the explainer shows once and not again', async () => {
    const { unmount } = renderPage(tokensServed, { receiveViaLnurl: true })
    expect(await screen.findByText(/payers can also send USDT/)).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('receive-via-tokens'))
    const sheet = screen.getByTestId('sheet-modal')
    expect(sheet).toHaveTextContent('send tokens to FixedFloat, a third party that holds the deposit')
    expect(backupAndUpdateConfig).not.toHaveBeenCalled()
    fireEvent.click(within(sheet).getByRole('button', { name: 'Turn on' }))

    const accepted = backupAndUpdateConfig.mock.calls[0][0]
    expect(accepted).toMatchObject({ receiveViaTokens: true, announcementsSeen: [TOKEN_EXPLAINER] })
    unmount()
    backupAndUpdateConfig.mockClear()

    renderPage(tokensServed, { ...accepted, receiveViaTokens: false })
    fireEvent.click(await screen.findByTestId('receive-via-tokens'))

    expect(screen.queryByTestId('sheet-modal')).not.toBeInTheDocument()
    expect(backupAndUpdateConfig).toHaveBeenCalledWith(expect.objectContaining({ receiveViaTokens: true }))
  })

  it('turns tokens off without the explainer', async () => {
    renderPage(tokensServed, { receiveViaLnurl: true, receiveViaTokens: true, announcementsSeen: [TOKEN_EXPLAINER] })

    fireEvent.click(await screen.findByTestId('receive-via-tokens'))

    expect(screen.queryByTestId('sheet-modal')).not.toBeInTheDocument()
    expect(backupAndUpdateConfig).toHaveBeenCalledWith(expect.objectContaining({ receiveViaTokens: false }))
  })
})
