import type { ComponentType } from 'react'
import NetworkArbitrumOne from '@web3icons/react/icons/networks/NetworkArbitrumOne'
import NetworkArbitrumSepolia from '@web3icons/react/icons/networks/NetworkArbitrumSepolia'
import NetworkAvalanche from '@web3icons/react/icons/networks/NetworkAvalanche'
import NetworkBase from '@web3icons/react/icons/networks/NetworkBase'
import NetworkBaseSepolia from '@web3icons/react/icons/networks/NetworkBaseSepolia'
import NetworkBinanceSmartChain from '@web3icons/react/icons/networks/NetworkBinanceSmartChain'
import NetworkEthereum from '@web3icons/react/icons/networks/NetworkEthereum'
import NetworkOptimism from '@web3icons/react/icons/networks/NetworkOptimism'
import NetworkOptimismSepolia from '@web3icons/react/icons/networks/NetworkOptimismSepolia'
import NetworkPolygon from '@web3icons/react/icons/networks/NetworkPolygon'
import NetworkPolygonAmoy from '@web3icons/react/icons/networks/NetworkPolygonAmoy'
import NetworkSepolia from '@web3icons/react/icons/networks/NetworkSepolia'
import NetworkSolana from '@web3icons/react/icons/networks/NetworkSolana'
import NetworkTron from '@web3icons/react/icons/networks/NetworkTron'
import TokenLogo, { tokenLogoTickerForTicker, type TokenLogoTicker } from './TokenLogo'

type Icon = ComponentType<{ variant?: 'branded' | 'mono' | 'background'; className?: string }>

// Keyed like lnurl-client's chainName. Imported one by one: the package index would pull in every icon it ships.
const CHAIN_ICONS: Record<string, Icon> = {
  'eip155:1': NetworkEthereum,
  'eip155:11155111': NetworkSepolia,
  'eip155:42161': NetworkArbitrumOne,
  'eip155:421614': NetworkArbitrumSepolia,
  'eip155:8453': NetworkBase,
  'eip155:84532': NetworkBaseSepolia,
  'eip155:10': NetworkOptimism,
  'eip155:11155420': NetworkOptimismSepolia,
  'eip155:137': NetworkPolygon,
  'eip155:80002': NetworkPolygonAmoy,
  'eip155:56': NetworkBinanceSmartChain,
  'eip155:43114': NetworkAvalanche,
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': NetworkSolana,
  'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1': NetworkSolana,
  'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z': NetworkSolana,
  'tron:0x2b6653dc': NetworkTron,
  'tron:0xcd8690dc': NetworkTron,
  'tron:0x94a9059e': NetworkTron,
}

export default function ChainLogo({ chainId }: { chainId: string }) {
  const Icon = CHAIN_ICONS[chainId]
  return Icon ? <Icon variant='background' className='size-full' /> : null
}

/** A token's logo with its chain as a corner badge; `ring` is the surface it sits on, so the badge reads as cut out. */
export function TokenOnChainLogo({ ticker, chainId, ring }: { ticker: string; chainId: string; ring: string }) {
  const token = tokenLogoTickerForTicker(ticker)
  return (
    <span className='token-on-chain relative flex size-full [&>svg]:size-full'>
      {token ? <TokenLogo ticker={token} /> : null}
      {CHAIN_ICONS[chainId] ? (
        <span
          className='absolute -right-[12%] -bottom-[12%] flex size-[55%] overflow-hidden rounded-full'
          style={{ boxShadow: `0 0 0 2px ${ring}` }}
        >
          <ChainLogo chainId={chainId} />
        </span>
      ) : null}
    </span>
  )
}

/** Token logos overlapping left over right, each ringed in `ring` like the chain badge above. */
export function TokenLogoStack({ tickers, ring }: { tickers: TokenLogoTicker[]; ring: string }) {
  return (
    <span className='flex shrink-0' aria-hidden='true'>
      {tickers.map((ticker, i) => (
        <span
          key={ticker}
          className={`relative flex size-5 rounded-full [&>svg]:size-full ${i ? '-ml-1.5' : ''}`}
          style={{ boxShadow: `0 0 0 2px ${ring}`, zIndex: tickers.length - i }}
        >
          <TokenLogo ticker={ticker} />
        </span>
      ))}
    </span>
  )
}
