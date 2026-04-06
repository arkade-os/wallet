import { ArkNote, InMemoryContractRepository, InMemoryWalletRepository, SingleKey, Wallet } from '@arkade-os/sdk'
import { exec } from 'child_process'
import { EventSource } from 'eventsource'
import { promisify } from 'util'

const execAsync = promisify(exec)

const waitForBalance = async (
  getBalance: () => Promise<{ available: number }>,
  minAmount = 100,
  timeout = 5_000,
): Promise<void> => {
  await new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      clearInterval(intervalId)
      reject(new Error('Timed out waiting for balance'))
    }, timeout)
    const intervalId = setInterval(async () => {
      try {
        const balance = await getBalance()
        if (balance.available >= minAmount) {
          clearTimeout(timeoutId)
          clearInterval(intervalId)
          resolve(true)
        }
      } catch (err) {
        clearTimeout(timeoutId)
        clearInterval(intervalId)
        reject(err)
      }
    }, 500)
  })
}

const createNote = async (amount: number): Promise<string> => {
  const { stdout } = await execAsync(`docker exec -t ark arkd note --amount ${amount}`)
  return stdout.trim()
}

const getFundedWallet = async (arkUrl: string): Promise<Wallet> => {
  const amount = 1_000_000

  globalThis.EventSource ??= EventSource as typeof globalThis.EventSource

  const wallet = await Wallet.create({
    identity: SingleKey.fromRandomBytes(),
    arkServerUrl: arkUrl,
    storage: {
      walletRepository: new InMemoryWalletRepository(),
      contractRepository: new InMemoryContractRepository(),
    },
  })

  await wallet.settle({
    inputs: [ArkNote.fromString(await createNote(amount))],
    outputs: [
      {
        address: await wallet.getAddress(),
        amount: BigInt(amount),
      },
    ],
  })

  await waitForBalance(() => wallet.getBalance())
  return wallet
}

export async function faucetOffchain(address: string, amount: number): Promise<void> {
  const fundedWallet = await getFundedWallet('http://localhost:7070')
  await fundedWallet.send({ address, amount })
}
