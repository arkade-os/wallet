import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function faucetOffchain(address: string, amount: number): Promise<void> {
  // uses fulmine to fund wallets offchain, which is much faster
  await execAsync(`curl -X POST http://localhost:7003/api/v1/send/offchain \
        -H "Content-Type: application/json" \
        -d '{"address": "${address}", "amount": ${amount}}'`)
}
