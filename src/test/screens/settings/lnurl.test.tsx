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
  namelessAddress,
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

const renderPage = (opts: Parameters<typeof fakeLnurlServer>[0], config: Partial<Config> = {}, wallet = svcWallet) => {
  const server = fakeLnurlServer(opts)
  vi.stubGlobal('fetch', server.fetch)
  const rendered = render(
    <BackupContext.Provider value={{ backupAndUpdateConfig } as never}>
      <ConfigContext.Provider
        value={{ ...mockConfigContextValue, config: { ...mockConfigContextValue.config, ...config } } as never}
      >
        <WalletContext.Provider value={{ ...mockWalletContextValue, svcWallet: wallet } as never}>
          <Lnurl />
        </WalletContext.Provider>
      </ConfigContext.Provider>
    </BackupContext.Provider>,
  )
  return { ...rendered, calls: server.calls }
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

  it('says why the lightning address could not be loaded, and offers no naming', async () => {
    renderPage({ modes: ['self'], capabilitiesFail: true })

    expect(await screen.findByText('domain lookup failed')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Choose a name')).not.toBeInTheDocument()
  })

  it('says why a nameless address cannot be named when the domain lookup fails', async () => {
    renderPage({ modes: ['self'], addresses: [namelessAddress()], capabilitiesFail: true })

    expect(await screen.findByText('domain lookup failed')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Choose a name')).not.toBeInTheDocument()
  })

  it("says why when the wallet's own addresses cannot load, rather than loading forever", async () => {
    const locked = {
      ...svcWallet,
      getAddress: async (): Promise<string> => {
        throw new Error('wallet is locked')
      },
    }
    renderPage({ modes: ['self'], addresses: [namedAddress('alice')] }, {}, locked)

    expect(await screen.findByText('wallet is locked')).toBeInTheDocument()
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })

  it('lists the wallet LNURL beside every lightning address', async () => {
    renderPage({ modes: ['self'], addresses: [namedAddress('alice'), namelessAddress()] })

    expect(await screen.findByText('alice@lnurl.test')).toBeInTheDocument()
    expect(await screen.findByText('LNURL1SESS1')).toBeInTheDocument()
    expect(screen.queryByText('LNURL1ALICE')).not.toBeInTheDocument()
  })

  it('claims a reserved name with its claim code', async () => {
    const server = renderPage({ modes: ['admin'] })

    fireEvent.change(await screen.findByPlaceholderText('Choose a name'), { target: { value: 'vip' } })
    fireEvent.change(screen.getByPlaceholderText('Claim code'), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'Claim name' }))

    expect(await screen.findByText('vip@lnurl.test')).toBeInTheDocument()
    const [, init] = server.calls('POST', '/lnurl/address')[0]
    expect(JSON.parse(init!.body as string)).toMatchObject({ username: 'vip', claimCode: 'secret' })
  })

  it('names a nameless address with a claim code, in place', async () => {
    const server = renderPage({ modes: ['admin', 'session'], addresses: [namelessAddress()] })

    fireEvent.change(await screen.findByPlaceholderText('Choose a name'), { target: { value: 'vip' } })
    fireEvent.change(screen.getByPlaceholderText('Claim code'), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'Claim name' }))

    expect(await screen.findByText('vip@lnurl.test')).toBeInTheDocument()
    expect(server.calls('PATCH', '/lnurl/address/sess1')).toHaveLength(1)
    expect(server.calls('POST', '/lnurl/address')).toHaveLength(0)
  })

  it('says so when what payers can send cannot be read', async () => {
    renderPage({ modes: ['self'], addresses: [namedAddress('alice')], payRequestFail: true })

    expect(await screen.findByText('alice@lnurl.test')).toBeInTheDocument()
    expect(await screen.findByText(/payRequest unavailable/)).toBeInTheDocument()
    expect(screen.queryByText(/ sats$/)).not.toBeInTheDocument()
  })

  it('leaves token options out of what payers can send on each rail', async () => {
    renderPage({ modes: ['self'], addresses: [namedAddress('alice')], tokens: true })

    expect(await screen.findByText('10,000 – 100,000,000 sats')).toBeInTheDocument()
    expect(screen.getAllByText(/ sats$/)).toHaveLength(3)
  })
})

describe('Lightning address settings, tokens', () => {
  const tokensServed = { modes: ['self'], addresses: [namedAddress('alice')], tokens: true }

  it('offers no token switch, nor an empty Receive section, when the server advertises no token option', async () => {
    const opts = { modes: ['self'], addresses: [namedAddress('alice')] }
    const config = {}
    renderPage(opts, config)

    await screen.findByText('10,000 – 100,000,000 sats')
    expect(screen.queryByText('Accept tokens')).not.toBeInTheDocument()
    expect(screen.queryByText('Receive', { selector: '.settings-section-label' })).not.toBeInTheDocument()
  })

  it('the explainer shows once and not again', async () => {
    const { unmount } = renderPage(tokensServed)
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
    renderPage(tokensServed, { receiveViaTokens: true, announcementsSeen: [TOKEN_EXPLAINER] })

    fireEvent.click(await screen.findByTestId('receive-via-tokens'))

    expect(screen.queryByTestId('sheet-modal')).not.toBeInTheDocument()
    expect(backupAndUpdateConfig).toHaveBeenCalledWith(expect.objectContaining({ receiveViaTokens: false }))
  })
})
