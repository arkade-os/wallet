export const FUNDING_CAP = 5_000

export function reserveFunding(total: number, sats: number): number {
  if (
    !Number.isSafeInteger(total) ||
    total < 0 ||
    !Number.isSafeInteger(sats) ||
    sats <= 0 ||
    total + sats > FUNDING_CAP
  )
    throw new Error('Live funding would exceed the 5,000-sat run budget')
  return total + sats
}

export function assertNoSecrets(value: unknown, secrets?: string[]): void {
  const user = process.env.TAXI_ADMIN_USER
  const pass = process.env.TAXI_ADMIN_PASS
  const forbidden = [
    process.env.TAXI_LIVE_FUNDER_MNEMONIC,
    pass,
    user && pass ? `${user}:${pass}` : undefined,
    user && pass ? Buffer.from(`${user}:${pass}`).toString('base64') : undefined,
    ...(secrets ?? []),
  ].filter((secret): secret is string => Boolean(secret))
  const text = JSON.stringify(value)
  if (
    !text ||
    forbidden.some(
      (secret) =>
        text.includes(secret) ||
        text.includes(encodeURIComponent(secret)) ||
        text.includes(JSON.stringify(secret).slice(1, -1)),
    ) ||
    /nsec1[023456789acdefghjklmnpqrstuvwxyz]+|"(?:mnemonic|password|privateKey|authorization|secret)"\s*:/i.test(text)
  )
    throw new Error('Refusing to write evidence containing secrets')
}
