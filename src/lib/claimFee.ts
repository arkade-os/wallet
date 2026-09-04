const FEE_ESTIMATE_TIMEOUT_MS = 15_000

export const MIN_CLAIM_FEE_RATE = 1

const usableRate = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > MIN_CLAIM_FEE_RATE

/** sat/vB. Two blocks: an unconfirmed claim loses the fill. */
export const claimFeeRate = async (baseUrl: string, fetchImpl: typeof fetch = fetch): Promise<number> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FEE_ESTIMATE_TIMEOUT_MS)
  try {
    const response = await fetchImpl(`${baseUrl.replace(/\/+$/, '')}/fee-estimates`, { signal: controller.signal })
    if (!response.ok) return MIN_CLAIM_FEE_RATE
    const estimates = (await response.json()) as Record<string, unknown>
    // First USABLE bucket, not first present: `??` would take a bucket reported
    // as 0 and drop a deadline-racing claim to the floor beside a good one.
    const target = [estimates['2'], estimates['1'], estimates['3']].find(usableRate)
    return target === undefined ? MIN_CLAIM_FEE_RATE : Math.ceil(target)
  } catch {
    return MIN_CLAIM_FEE_RATE
  } finally {
    clearTimeout(timer)
  }
}
