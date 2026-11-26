import { execFile } from 'node:child_process'
import { resolve } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

export async function faucetOffchain(address: string, amount: number): Promise<void> {
  await run(
    process.execPath,
    [
      resolve('regtest/regtest.mjs'),
      'ark',
      '--env',
      resolve(process.env.TAXI_REGTEST_ENV_FILE ?? '.env.regtest'),
      'send',
      '--to',
      address,
      '--amount',
      String(amount),
      '--password',
      process.env.ARKD_PASSWORD ?? 'secret',
    ],
    { timeout: 90_000 },
  )
}
