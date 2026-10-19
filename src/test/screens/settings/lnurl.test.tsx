import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { act, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
  LNURL_DESTINATIONS,
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

const renderPage = (
  opts: Parameters<typeof fakeLnurlServer>[0],
  config: Partial<Config> = {},
  initialWallet = svcWallet,
) => {
  const server = fakeLnurlServer(opts)
  vi.stubGlobal('fetch', server.fetch)
  const tree = (wallet: typeof svcWallet) => (
    <BackupContext.Provider value={{ backupAndUpdateConfig } as never}>
      <ConfigContext.Provider
        value={{ ...mockConfigContextValue, config: { ...mockConfigContextValue.config, ...config } } as never}
      >
        <WalletContext.Provider value={{ ...mockWalletContextValue, svcWallet: wallet } as never}>
          <Lnurl />
        </WalletContext.Provider>
      </ConfigContext.Provider>
    </BackupContext.Provider>
  )
  const rendered = render(tree(initialWallet))
  return {
    ...rendered,
    calls: server.calls,
    rerenderWallet: (wallet: typeof svcWallet) => rendered.rerender(tree(wallet)),
  }
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
  it('waits for a replacement wallet destination instead of rebinding its receiver to the previous wallet', async () => {
    const page = renderPage({ modes: ['self'], addresses: [namedAddress('alice')] })
    await screen.findByText('alice@lnurl.test')
    const writesBefore = page.calls('POST', '/lnurl/address/alice/arkade').length
    let release!: (address: string) => void
    const nextWallet = {
      identity: SingleKey.fromHex('04'.repeat(32)),
      getAddress: vi.fn(() => new Promise<string>((resolve) => (release = resolve))),
      getBoardingAddress: async () => 'bc1newwallet',
    }
    const signing = vi.spyOn(nextWallet.identity, 'signMessage')
    onTestFinished(() => signing.mockRestore())

    page.rerenderWallet(nextWallet)
    await act(async () => {})

    expect(nextWallet.getAddress).toHaveBeenCalledOnce()
    expect(signing).not.toHaveBeenCalled()
    expect(page.calls('POST', '/lnurl/address/alice/arkade')).toHaveLength(writesBefore)
    await act(async () => release(LNURL_DESTINATIONS.arkade))
    await waitFor(() => expect(page.calls('POST', '/lnurl/address/alice/arkade')).toHaveLength(writesBefore + 1))

    const [, init] = page.calls('POST', '/lnurl/address/alice/arkade').at(-1)!
    expect(JSON.parse(init!.body as string)).toMatchObject({
      arkadeAddress: LNURL_DESTINATIONS.arkade,
      boardingAddress: 'bc1newwallet',
    })
  })

  it('ignores an old wallet address read that completes after the replacement wallet is ready', async () => {
    let releaseOld!: (address: string) => void
    const previousWallet = {
      ...svcWallet,
      getAddress: () => new Promise<string>((resolve) => (releaseOld = resolve)),
    }
    const page = renderPage({ modes: ['self'], addresses: [namedAddress('alice')] }, {}, previousWallet)
    const nextWallet = {
      identity: SingleKey.fromHex('04'.repeat(32)),
      getAddress: async () => LNURL_DESTINATIONS.arkade,
      getBoardingAddress: async () => 'bc1newwallet',
    }
    const signing = vi.spyOn(nextWallet.identity, 'signMessage')
    onTestFinished(() => signing.mockRestore())
    page.rerenderWallet(nextWallet)
    await screen.findByText('alice@lnurl.test')
    expect(page.calls('POST', '/lnurl/address/alice/arkade')).toHaveLength(1)
    const signedBefore = signing.mock.calls.length

    await act(async () => releaseOld(DECODABLE_ARK))

    expect(signing).toHaveBeenCalledTimes(signedBefore)
    expect(page.calls('POST', '/lnurl/address/alice/arkade')).toHaveLength(1)
    const [, init] = page.calls('POST', '/lnurl/address/alice/arkade')[0]
    expect(JSON.parse(init!.body as string)).toMatchObject({
      arkadeAddress: LNURL_DESTINATIONS.arkade,
      boardingAddress: 'bc1newwallet',
    })
  })

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

  it('turns Arkade and Bitcoin routing on and off', async () => {
    renderPage(tokensServed, { receiveViaLnurl: false })

    fireEvent.click(await screen.findByTestId('receive-via-lnurl'))

    expect(backupAndUpdateConfig).toHaveBeenCalledWith(expect.objectContaining({ receiveViaLnurl: true }))
  })

  it('keeps token consent independent of routing every receive through the address', async () => {
    renderPage(tokensServed, { receiveViaLnurl: false })

    fireEvent.click(await screen.findByTestId('receive-via-tokens'))
    const sheet = screen.getByTestId('sheet-modal')
    expect(sheet).toHaveTextContent('send tokens to FixedFloat, a third party that holds the deposit')
    expect(backupAndUpdateConfig).not.toHaveBeenCalled()
    fireEvent.click(within(sheet).getByRole('button', { name: 'Turn on' }))

    expect(backupAndUpdateConfig).toHaveBeenCalledWith(
      expect.objectContaining({ receiveViaLnurl: false, receiveViaTokens: true }),
    )
  })

  it('offers no token switch when the server advertises no token option', async () => {
    renderPage({ modes: ['self'], addresses: [namedAddress('alice')] }, { receiveViaLnurl: true })

    await screen.findByText('10,000 – 100,000,000 sats')
    expect(screen.queryByText('Accept tokens')).not.toBeInTheDocument()
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
