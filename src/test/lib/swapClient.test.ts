// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import type { SwapClientConfig } from '@arkade-os/swap'
import { makeSwapClient } from '../../lib/swapClient'

const mocks = vi.hoisted(() => ({ create: vi.fn(), start: vi.fn(), accept: vi.fn() }))
vi.mock('@arkade-os/swap', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@arkade-os/swap')>()),
  createSwapClient: mocks.create,
}))

const wallet = { identity: {} } as SwapClientConfig['wallet']
beforeEach(() => {
  vi.clearAllMocks()
  mocks.create.mockImplementation(() => ({ start: mocks.start, accept: mocks.accept }))
})

it('keeps the existing automatic browser client unchanged', () => {
  const client = makeSwapClient(wallet, 'mutinynet')
  expect(mocks.create.mock.calls[0][0].policy).toBeUndefined()
  expect(client.accept).toBe(mocks.accept)
  expect(mocks.start).not.toHaveBeenCalled()
})
