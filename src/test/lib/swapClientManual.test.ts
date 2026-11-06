// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import type { Quote, SwapClientConfig } from '@arkade-os/swap'
import { makeSwapClient } from '../../lib/swapClient'

const mocks = vi.hoisted(() => ({ create: vi.fn(), start: vi.fn(), accept: vi.fn(), order: [] as string[] }))
vi.mock('@arkade-os/swap', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@arkade-os/swap')>()),
  createSwapClient: mocks.create,
}))

const quote = { id: 'approved-quote' } as Quote
const wallet = { identity: {} } as SwapClientConfig['wallet']
beforeEach(() => {
  vi.clearAllMocks()
  mocks.order.length = 0
  mocks.start.mockImplementation(async () => {
    mocks.order.push('start')
  })
  mocks.accept.mockImplementation(async () => {
    mocks.order.push('accept')
    return { id: 'funded-swap' }
  })
  mocks.create.mockImplementation(() => ({ start: mocks.start, accept: mocks.accept }))
})

it('restores hardware swaps in manual mode and starts driving only on explicit acceptance', async () => {
  const client = makeSwapClient(wallet, 'mutinynet', true)
  expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ policy: { drive: 'manual' } }))
  expect(mocks.start).not.toHaveBeenCalled()
  expect(mocks.accept).not.toHaveBeenCalled()

  const options = { validUntil: 1234 }
  await client.accept(quote, options)
  expect(mocks.order).toEqual(['start', 'accept'])
  expect(mocks.accept).toHaveBeenCalledWith(quote, options)
})

it('does not fund a new swap when starting the manual drive fails', async () => {
  mocks.start.mockRejectedValueOnce(new Error('Card unavailable'))
  const client = makeSwapClient(wallet, 'mutinynet', true)
  await expect(client.accept(quote)).rejects.toThrow('Card unavailable')
  expect(mocks.accept).not.toHaveBeenCalled()
})

it('keeps the existing automatic browser client unchanged', () => {
  const client = makeSwapClient(wallet, 'mutinynet')
  expect(mocks.create.mock.calls[0][0].policy).toBeUndefined()
  expect(client.accept).toBe(mocks.accept)
  expect(mocks.start).not.toHaveBeenCalled()
})
