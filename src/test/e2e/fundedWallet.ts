import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export async function faucetOffchain(address: string, amount: number): Promise<void> {
  await execFileAsync(process.execPath, [
    'regtest/regtest.mjs',
    'ark',
    '--env',
    '.env.regtest',
    'send',
    '--to',
    address,
    '--amount',
    String(amount),
    '--password',
    process.env.ARKD_PASSWORD ?? 'secret',
  ])
}
