import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import type { LnurlClient, VerifyStatus } from '@arkade-os/lnurl-client'
import { createPendingConfirmations } from '../../lib/lnurlConfirmations'

const settled = (over: Partial<VerifyStatus> = {}): VerifyStatus =>
  ({ kind: 'destination', settled: true, paymentOption: 'ark', ...over }) as VerifyStatus

const fakeClient = (over: Partial<LnurlClient> = {}): LnurlClient =>
  ({
    batchVerify: vi.fn().mockResolvedValue({ results: {} }),
    pollVerify: vi.fn().mockResolvedValue(settled()),
    ...over,
  }) as unknown as LnurlClient

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('pendingConfirmations', () => {
  it('sends one batchVerify per endpoint per tick covering every pending entry there', async () => {
    const batchVerify = vi.fn().mockResolvedValue({ results: {} })
    const confirmations = createPendingConfirmations(fakeClient({ batchVerify }))
    const onSettled = vi.fn()
    const onError = vi.fn()
    confirmations.add({ verifyUrl: 'https://a/verify/1', verifyBatch: 'https://a/batch', onSettled, onError })
    confirmations.add({ verifyUrl: 'https://a/verify/2', verifyBatch: 'https://a/batch', onSettled, onError })

    await vi.advanceTimersByTimeAsync(2_000)

    expect(batchVerify).toHaveBeenCalledTimes(1)
    expect(batchVerify).toHaveBeenCalledWith('https://a/batch', ['https://a/verify/1', 'https://a/verify/2'])
  })

  it('marks an entry settled from its batch answer and drops it from later ticks', async () => {
    const batchVerify = vi
      .fn()
      .mockResolvedValueOnce({ results: { 'v/1': { kind: 'verify', status: settled() } } })
      .mockResolvedValue({ results: {} })
    const confirmations = createPendingConfirmations(fakeClient({ batchVerify }))
    const onSettled = vi.fn()
    confirmations.add({ verifyUrl: 'v/1', verifyBatch: 'https://a/batch', onSettled, onError: vi.fn() })

    await vi.advanceTimersByTimeAsync(2_000)
    expect(onSettled).toHaveBeenCalledWith(settled())

    // The set emptied out, so the shared timer stopped rather than re-asking.
    await vi.advanceTimersByTimeAsync(2_000)
    expect(batchVerify).toHaveBeenCalledTimes(1)
  })

  it('fails an entry whose batch answer is a per-item error', async () => {
    const batchVerify = vi
      .fn()
      .mockResolvedValue({ results: { 'v/1': { kind: 'error', reason: 'unknown verify url' } } })
    const confirmations = createPendingConfirmations(fakeClient({ batchVerify }))
    const onError = vi.fn()
    confirmations.add({ verifyUrl: 'v/1', verifyBatch: 'https://a/batch', onSettled: vi.fn(), onError })

    await vi.advanceTimersByTimeAsync(2_000)
    expect(onError).toHaveBeenCalledWith(new Error('unknown verify url'))
  })

  it('retries an unreachable endpoint every tick and only fails at the deadline', async () => {
    const batchVerify = vi.fn().mockRejectedValue(new Error('network error'))
    const confirmations = createPendingConfirmations(fakeClient({ batchVerify }))
    const onError = vi.fn()
    confirmations.add({
      verifyUrl: 'v/1',
      verifyBatch: 'https://a/batch',
      timeoutMs: 5_000,
      onSettled: vi.fn(),
      onError,
    })

    await vi.advanceTimersByTimeAsync(4_000)
    expect(onError).not.toHaveBeenCalled()
    expect(batchVerify).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(2_000)
    expect(onError).toHaveBeenCalledWith(new Error('receiver did not confirm settlement in time'))

    // The set emptied out, so the shared timer stopped polling it further.
    const callsAtFailure = batchVerify.mock.calls.length
    await vi.advanceTimersByTimeAsync(4_000)
    expect(batchVerify).toHaveBeenCalledTimes(callsAtFailure)
  })

  it('falls back to pollVerify for an entry with no verifyBatch endpoint', async () => {
    const pollVerify = vi.fn().mockResolvedValue(settled())
    const confirmations = createPendingConfirmations(fakeClient({ pollVerify }))
    const onSettled = vi.fn()
    confirmations.add({ verifyUrl: 'v/solo', onSettled, onError: vi.fn() })

    await vi.advanceTimersByTimeAsync(2_000)
    expect(pollVerify).toHaveBeenCalledTimes(1)
    expect(pollVerify).toHaveBeenCalledWith('v/solo', expect.objectContaining({ intervalMs: 2_000 }))
    await vi.waitFor(() => expect(onSettled).toHaveBeenCalledWith(settled()))

    // A settled solo entry must not be re-polled on the next tick.
    await vi.advanceTimersByTimeAsync(2_000)
    expect(pollVerify).toHaveBeenCalledTimes(1)
  })

  it('reports a pollVerify rejection as this entry failing, not the whole tick', async () => {
    const pollVerify = vi.fn().mockRejectedValue(new Error('timed out'))
    const confirmations = createPendingConfirmations(fakeClient({ pollVerify }))
    const onError = vi.fn()
    confirmations.add({ verifyUrl: 'v/solo', onSettled: vi.fn(), onError })

    await vi.advanceTimersByTimeAsync(2_000)
    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(new Error('timed out')))
  })

  it('forget stops the shared loop and silences answers already in flight', async () => {
    const unsettled = { kind: 'destination', settled: false, paymentOption: 'ark' } as VerifyStatus
    const batchVerify = vi.fn().mockResolvedValue({ results: { 'v/1': { kind: 'verify', status: unsettled } } })
    let resolvePoll: (s: VerifyStatus) => void = () => {}
    const pollVerify = vi.fn(() => new Promise<VerifyStatus>((resolve) => (resolvePoll = resolve)))
    const confirmations = createPendingConfirmations(fakeClient({ batchVerify, pollVerify }))
    const onSettledBatch = vi.fn()
    const onSettledSolo = vi.fn()
    confirmations.add({ verifyUrl: 'v/1', verifyBatch: 'https://a/batch', onSettled: onSettledBatch, onError: vi.fn() })
    confirmations.add({ verifyUrl: 'v/solo', onSettled: onSettledSolo, onError: vi.fn() })
    // First tick: the batch entry stays pending (unsettled), the solo poll starts and stays in flight.
    await vi.advanceTimersByTimeAsync(2_000)

    confirmations.forget()
    resolvePoll(settled())
    await vi.advanceTimersByTimeAsync(10_000)

    expect(onSettledBatch).not.toHaveBeenCalled()
    expect(onSettledSolo).not.toHaveBeenCalled()
    expect(batchVerify).toHaveBeenCalledTimes(1) // only the tick before forget()
  })
})
