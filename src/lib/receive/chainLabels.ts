// Mirrors the BTCPay LNURLVerify plugin's ChainDirectory.cs, so a payer reads the same network name in either.
const CHAINS: Record<string, string> = {
  'eip155:1': 'Ethereum',
  'eip155:11155111': 'Sepolia',
  'eip155:42161': 'Arbitrum One',
  'eip155:421614': 'Arbitrum Sepolia',
  'eip155:8453': 'Base',
  'eip155:84532': 'Base Sepolia',
  'eip155:10': 'Optimism',
  'eip155:11155420': 'OP Sepolia',
  'eip155:137': 'Polygon',
  'eip155:80002': 'Polygon Amoy',
  'eip155:56': 'BNB Smart Chain',
  'eip155:43114': 'Avalanche',
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': 'Solana',
  'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1': 'Solana Devnet',
  'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z': 'Solana Testnet',
  'tron:0x2b6653dc': 'Tron',
  'tron:0xcd8690dc': 'Tron Nile',
  'tron:0x94a9059e': 'Tron Shasta',
}

/** A CAIP-2 chain id's network name, or the id itself for a chain this table does not know. */
export const chainLabel = (chainId: string): string => CHAINS[chainId] ?? chainId
