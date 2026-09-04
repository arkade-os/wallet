const FEE_ESTIMATE_TIMEOUT_MS = 15_000

export const MIN_CLAIM_FEE_RATE = 1

/** sat/vB. Two blocks: an unconfirmed claim loses the fill. */
export const claimFeeRate = async (baseUrl: string, fetchImpl: typeof fetch = fetch): Promise<number> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FEE_ESTIMATE_TIMEOUT_MS)
  try {
    const response = await fetchImpl(`${baseUrl.replace(/\/+$/, '')}/fee-estimates`, { signal: controller.signal })
    if (!response.ok) return MIN_CLAIM_FEE_RATE
    const estimates = (await response.json()) as Record<string, number>
    const target = estimates['2'] ?? estimates['1'] ?? estimates['3']
    return typeof target === 'number' && Number.isFinite(target) && target > MIN_CLAIM_FEE_RATE
      ? Math.ceil(target)
      : MIN_CLAIM_FEE_RATE
  } catch {
    return MIN_CLAIM_FEE_RATE
  } finally {
    clearTimeout(timer)
  }
}
