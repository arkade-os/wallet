import { act, render, waitFor } from '@testing-library/react'
import { useContext } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AspContext, AspProvider, type AspInfo } from '../../providers/asp'
import { ConfigContext } from '../../providers/config'
import { emptyAspInfo, getAspInfo } from '../../lib/asp'
import { readAspInfoSnapshot, saveAspInfoSnapshot } from '../../lib/bootCache'
import { gitCommit } from '../../_gitCommit'
import { mockConfigContextValue } from '../screens/mocks'

vi.mock('../../lib/asp', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/asp')>()),
  getAspInfo: vi.fn(),
}))

const SERVER = mockConfigContextValue.config.aspUrl
const answer = (dust: bigint): AspInfo => ({
  ...emptyAspInfo,
  url: SERVER,
  network: 'mutinynet',
  signerPubkey: '02'.repeat(33),
  dust,
})

let asp: React.ContextType<typeof AspContext>
function Capture() {
  asp = useContext(AspContext)
  return null
}
const mount = () =>
  render(
    <ConfigContext.Provider value={mockConfigContextValue}>
      <AspProvider>
        <Capture />
      </AspProvider>
    </ConfigContext.Provider>,
  )

/** A request the test answers when it chooses to. */
const pending = () => {
  let resolve: (info: AspInfo) => void = () => {}
  vi.mocked(getAspInfo).mockReturnValueOnce(new Promise<AspInfo>((r) => (resolve = r)))
  return (info: AspInfo) => act(async () => resolve(info))
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('server info at boot', () => {
  it('has nothing until the server answers on a first visit', async () => {
    const respond = pending()

    mount()
    expect(asp.aspInfo.signerPubkey).toBe('')

    await respond(answer(330n))
    expect(asp.aspInfo.dust).toBe(330n)
  })

  it("starts a returning visit from the server's last answer, then takes the live one", async () => {
    saveAspInfoSnapshot(answer(330n), gitCommit)
    const respond = pending()

    mount()

    // Before any answer: enough is known to start loading the wallet.
    expect(asp.aspInfo.network).toBe('mutinynet')
    expect(asp.aspInfo.dust).toBe(330n)

    await respond(answer(450n))
    expect(asp.aspInfo.dust).toBe(450n)
  })

  it('keeps the live answer for the next visit', async () => {
    const respond = pending()
    mount()

    await respond(answer(450n))

    expect(readAspInfoSnapshot(SERVER, gitCommit)?.dust).toBe(450n)
  })

  it('still reports an unreachable server, whatever it answered last time', async () => {
    saveAspInfoSnapshot(answer(330n), gitCommit)
    const respond = pending()
    mount()

    await respond({ ...emptyAspInfo, url: SERVER, unreachable: true })

    await waitFor(() => expect(asp.aspInfo.unreachable).toBe(true))
    expect(asp.aspInfo.signerPubkey).toBe('')
    // The last good answer stays for a later visit; an outage is not an answer.
    expect(readAspInfoSnapshot(SERVER, gitCommit)?.dust).toBe(330n)
  })

  it('keeps the cached object when the live answer says the same thing', async () => {
    saveAspInfoSnapshot(answer(330n), gitCommit)
    const respond = pending()
    mount()
    const cached = asp.aspInfo

    await respond(answer(330n))
    expect(asp.aspInfo).toBe(cached)
  })

  it('gives the wallet the live answer, not the cached one', async () => {
    saveAspInfoSnapshot(answer(330n), gitCommit)
    const respond = pending()
    mount()
    const live = asp.liveAspInfo()

    expect(asp.aspInfo.dust).toBe(330n)
    const shown = respond(answer(450n))
    await expect(live).resolves.toMatchObject({ dust: 450n, network: 'mutinynet' })
    await shown
  })

  it('takes the live answer when it differs from the cached one', async () => {
    saveAspInfoSnapshot(answer(330n), gitCommit)
    const respond = pending()
    mount()

    await respond(answer(500n))
    expect(asp.aspInfo.dust).toBe(500n)
  })
})
