import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
    expect(screen.queryByText('Primary address')).not.toBeInTheDocument()
  })

  it('uses the primary address the user chose, among several', async () => {
    renderPage({ modes: ['self'], addresses: [namedAddress('alice'), namedAddress('bob')] }, { lnurlPrimary: 'bob' })

    await waitFor(() => expect(screen.getByTestId('select-option-1')).toHaveClass('settings-select-row--selected'))
    expect(screen.getByTestId('select-option-0')).toHaveTextContent('alice@lnurl.test')
  })

  it('saves the address the user picks as primary', async () => {
    renderPage({ modes: ['self'], addresses: [namedAddress('alice'), namedAddress('bob')] })
    await waitFor(() => expect(screen.getByTestId('select-option-0')).toHaveClass('settings-select-row--selected'))

    fireEvent.click(screen.getByTestId('select-option-1'))

    expect(backupAndUpdateConfig).toHaveBeenCalledWith(expect.objectContaining({ lnurlPrimary: 'bob' }))
  })

  it('says why the lightning address could not be loaded, and offers no naming', async () => {
    renderPage({ modes: ['self'], capabilitiesFail: true })

    expect(await screen.findByText('domain lookup failed')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Claim name' })).not.toBeInTheDocument()
  })

  it('says why a nameless address cannot be named when the domain lookup fails', async () => {
    renderPage({ modes: ['self'], addresses: [namelessAddress()], capabilitiesFail: true })

    expect(await screen.findByText('domain lookup failed')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Claim name' })).not.toBeInTheDocument()
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

    expect((await screen.findAllByText('alice@lnurl.test')).length).toBeGreaterThan(0)
    expect(await screen.findByText('LNURL1SESS1')).toBeInTheDocument()
    expect(screen.queryByText('LNURL1ALICE')).not.toBeInTheDocument()
  })

  // These servers have no `self` mode, so a chosen name needs a code: the sheet asks for it first.
  const claimInSheet = async (username: string, claimCode: string) => {
    fireEvent.click(await screen.findByRole('button', { name: 'Claim name' }))
    const sheet = within(screen.getByTestId('sheet-modal'))
    const [codeField, nameField] = sheet.getAllByRole('textbox')
    expect(codeField).toHaveAttribute('placeholder', 'Claim code')
    expect(nameField).toHaveAttribute('placeholder', 'Choose a name (optional)')
    expect(sheet.queryByRole('link', { name: 'I have a claim code' })).not.toBeInTheDocument()
    fireEvent.change(codeField, { target: { value: claimCode } })
    if (username) fireEvent.change(nameField, { target: { value: username } })
    fireEvent.click(sheet.getByRole('button', { name: 'Claim name' }))
  }

  it('claims a reserved name with its code alone, leaving the name to the code', async () => {
    const server = renderPage({ modes: ['admin', 'random'] })

    await claimInSheet('', 'secret')

    expect(await screen.findByText('brave-otter@lnurl.test')).toBeInTheDocument()
    const [, init] = server.calls('POST', '/lnurl/address')[0]
    expect(JSON.parse(init!.body as string)).toMatchObject({ claimCode: 'secret' })
    expect(JSON.parse(init!.body as string)).not.toHaveProperty('username')
  })

  it('asks for a name when the code is one for any free name, then claims with it', async () => {
    renderPage({
      modes: ['admin'],
      reject: { code: 'username_required', error: 'this claim code needs a username' },
      rejectTimes: 1,
    })

    await claimInSheet('', 'free-code')

    const sheet = within(screen.getByTestId('sheet-modal'))
    expect(await sheet.findByText('This code is for a name you choose. Add one and claim again.')).toBeInTheDocument()
    fireEvent.change(sheet.getAllByRole('textbox')[1], { target: { value: 'chosen' } })
    fireEvent.click(sheet.getByRole('button', { name: 'Claim name' }))
    expect(await screen.findByText('chosen@lnurl.test')).toBeInTheDocument()
  })

  it('claims another address with a claim code when the wallet already has one', async () => {
    const server = renderPage({ modes: ['self'], addresses: [namedAddress('alice')] })
    expect(await screen.findByText('alice@lnurl.test')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'I have a claim code' }))
    const sheet = within(screen.getByTestId('sheet-modal'))
    const [codeField, nameField] = sheet.getAllByRole('textbox')
    expect(codeField).toHaveAttribute('placeholder', 'Claim code')
    expect(nameField).toHaveAttribute('placeholder', 'Choose a name (optional)')
    fireEvent.change(codeField, { target: { value: 'secret' } })
    fireEvent.click(sheet.getByRole('button', { name: 'Claim name' }))

    await waitFor(() =>
      expect(backupAndUpdateConfig).toHaveBeenCalledWith(expect.objectContaining({ lnurlPrimary: 'brave-otter' })),
    )
    expect(screen.getAllByText('brave-otter@lnurl.test').length).toBeGreaterThan(0)
    expect(screen.getAllByText('alice@lnurl.test').length).toBeGreaterThan(0)
    expect(screen.queryByTestId('sheet-modal')).not.toBeInTheDocument()
    const [, init] = server.calls('POST', '/lnurl/address')[0]
    expect(JSON.parse(init!.body as string)).toMatchObject({ claimCode: 'secret' })
  })

  it('claims a reserved name with its claim code, from a sheet that closes once named', async () => {
    const server = renderPage({ modes: ['admin', 'random'] })
    expect(await screen.findByRole('button', { name: 'Pick one for me' })).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Choose a name')).not.toBeInTheDocument()

    await claimInSheet('vip', 'secret')

    expect(await screen.findByText('vip@lnurl.test')).toBeInTheDocument()
    expect(screen.queryByTestId('sheet-modal')).not.toBeInTheDocument()
    const [, init] = server.calls('POST', '/lnurl/address')[0]
    expect(JSON.parse(init!.body as string)).toMatchObject({ username: 'vip', claimCode: 'secret' })
  })

  it('names a nameless address with a claim code, in place', async () => {
    const server = renderPage({ modes: ['admin', 'session'], addresses: [namelessAddress()] })

    await claimInSheet('vip', 'secret')

    expect(await screen.findByText('vip@lnurl.test')).toBeInTheDocument()
    expect(server.calls('PATCH', '/lnurl/address/sess1')).toHaveLength(1)
    expect(server.calls('POST', '/lnurl/address')).toHaveLength(0)
  })

  it('hides the claim code again from the same link, and sends no hidden code', async () => {
    const server = renderPage({ modes: ['self', 'admin'] })
    fireEvent.click(await screen.findByRole('button', { name: 'Claim name' }))
    const sheet = within(screen.getByTestId('sheet-modal'))
    fireEvent.change(sheet.getByPlaceholderText('Choose a name'), { target: { value: 'vip' } })
    const link = sheet.getByRole('link', { name: 'I have a claim code' })

    fireEvent.click(link)
    fireEvent.change(sheet.getByPlaceholderText('Claim code'), { target: { value: 'secret' } })
    expect(link).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(link)
    expect(sheet.queryByPlaceholderText('Claim code')).not.toBeInTheDocument()
    expect(link).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(sheet.getByRole('button', { name: 'Claim name' }))

    expect(await screen.findByText('vip@lnurl.test')).toBeInTheDocument()
    const [, init] = server.calls('POST', '/lnurl/address')[0]
    expect(JSON.parse(init!.body as string)).not.toHaveProperty('claimCode')
  })

  it('keeps the sheet open with the reason when a claim is refused', async () => {
    renderPage({ modes: ['admin'], reject: { code: 'invalid_claim', error: 'bad code' } })

    await claimInSheet('vip', 'wrong')

    const sheet = within(screen.getByTestId('sheet-modal'))
    expect(await sheet.findByText('That claim code is not valid.')).toBeInTheDocument()
    expect(sheet.getByPlaceholderText('Claim code')).toHaveValue('wrong')
  })

  it('never offers a random name to a wallet that already holds one, though it may still choose one', async () => {
    renderPage({ modes: ['self', 'random', 'session'], addresses: [namedAddress('alice'), namelessAddress()] })

    expect(await screen.findByRole('button', { name: 'Claim name' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pick one for me' })).not.toBeInTheDocument()
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
