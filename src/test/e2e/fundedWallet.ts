export async function faucetOffchain(address: string, amount: number): Promise<void> {
  // uses fulmine to fund wallets offchain, which is much faster
  const response = await fetch('http://localhost:7011/api/v1/send/offchain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, amount }),
  })
  if (!response.ok) throw new Error(`faucet refused ${amount} sats to ${address}: ${await response.text()}`)
}
