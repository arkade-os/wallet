import { useContext, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import FlexRow from '../../../components/FlexRow'
import Header from '../../../components/Header'
import Padded from '../../../components/Padded'
import Text from '../../../components/Text'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { FlowContext, emptyBancoInfo } from '../../../providers/flow'
import { WalletContext } from '../../../providers/wallet'
import { consoleError } from '../../../lib/logs'
import { prettyNumber, prettyAgo } from '../../../lib/format'
import { BancoContext } from '../../../providers/banco'
import LoadingLogo from '../../../components/LoadingLogo'
import { ArrowRight, Check, X, Loader2, AlertTriangle } from 'lucide-react'
import { SwapCard, TokenBlock, FlipButton, CurrencyTab } from './SwapCard'

// ── Config ──

interface BancoPair {
  ticker: string
  assetId: string
  icon?: string
  decimals: number // 0 for indivisible, 8 for BTC-like
}

function parseExtraPairs(): BancoPair[] {
  const raw = import.meta.env.VITE_BANCO_PAIRS
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return parsed.map((p: Record<string, unknown>) => ({ ...p, decimals: p.decimals ?? 0 }))
  } catch {
    return []
  }
}

const EXTRA_PAIRS = parseExtraPairs()
const VERIFIED_ASSETS_URL = import.meta.env.VITE_VERIFIED_ASSETS_URL
const BTC_ICON = 'https://coin-images.coingecko.com/coins/images/1/small/bitcoin.png'

// All banco pairs use the BTC/USDT price: 1 asset unit = 1 USD-cent worth of sats
const PRICE_FEED_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=btc'
const CACHE_TTL_MS = 5 * 60 * 1000

let cachedBtcPrice: { value: number; fetchedAt: number } | null = null
let cachedRegistryPairs: { pairs: BancoPair[]; fetchedAt: number } | null = null

async function fetchBtcUsdPrice(): Promise<number> {
  if (cachedBtcPrice && Date.now() - cachedBtcPrice.fetchedAt < CACHE_TTL_MS) {
    return cachedBtcPrice.value
  }
  const res = await fetch(PRICE_FEED_URL)
  const data = await res.json()
  const btcPerUsdt = data?.tether?.btc
  if (typeof btcPerUsdt !== 'number' || btcPerUsdt <= 0) throw new Error('Invalid price data')
  // 1 BTC = (1/btcPerUsdt) USDT
  const price = 1 / btcPerUsdt
  cachedBtcPrice = { value: price, fetchedAt: Date.now() }
  return price
}

function truncateId(id: string): string {
  if (id.length <= 12) return id
  return id.slice(0, 6) + '\u2026' + id.slice(-4)
}

// ── Component ──

export default function AppBanco() {
  const { navigate } = useContext(NavigationContext)
  const { setBancoInfo } = useContext(FlowContext)
  const { balance, assetBalances, svcWallet } = useContext(WalletContext)
  const { swaps, setSelectedSwapId } = useContext(BancoContext)

  const [selectedTab, setSelectedTab] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [receiveAmount, setReceiveAmount] = useState('')
  const [price, setPrice] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [rateInverted, setRateInverted] = useState(false)
  const [registryPairs, setRegistryPairs] = useState<BancoPair[]>(cachedRegistryPairs?.pairs ?? [])
  const [loadingRegistry, setLoadingRegistry] = useState(Boolean(VERIFIED_ASSETS_URL) && !cachedRegistryPairs)

  useEffect(() => {
    setBancoInfo(emptyBancoInfo)
  }, [])

  // Fetch verified assets from registry + their metadata from indexer (with 5-min cache)
  useEffect(() => {
    if (!VERIFIED_ASSETS_URL || !svcWallet) return

    // Use cache if fresh
    if (cachedRegistryPairs && Date.now() - cachedRegistryPairs.fetchedAt < CACHE_TTL_MS) {
      setRegistryPairs(cachedRegistryPairs.pairs)
      setLoadingRegistry(false)
      return
    }

    setLoadingRegistry(cachedRegistryPairs === null) // only show loading on first fetch
    const load = async () => {
      try {
        const res = await fetch(VERIFIED_ASSETS_URL)
        if (!res.ok) return
        const ids: string[] = await res.json()
        if (!Array.isArray(ids)) return

        const pairs: BancoPair[] = []
        const extraIds = new Set(EXTRA_PAIRS.map((p) => p.assetId))

        for (const assetId of ids) {
          if (extraIds.has(assetId)) continue
          try {
            const details = await svcWallet.assetManager.getAssetDetails(assetId)
            const ticker = details.metadata?.ticker || details.metadata?.name || truncateId(assetId)
            const decimals = details.metadata?.decimals ?? 0
            pairs.push({ ticker, assetId, icon: details.metadata?.icon, decimals })
          } catch {
            pairs.push({ ticker: truncateId(assetId), assetId, decimals: 0 })
          }
        }

        cachedRegistryPairs = { pairs, fetchedAt: Date.now() }
        setRegistryPairs(pairs)
      } catch (err) {
        consoleError(err, 'failed to load banco registry assets')
      } finally {
        setLoadingRegistry(false)
      }
    }

    load()
  }, [svcWallet])

  // All banco pairs: env var extras + registry
  const allPairs = [...EXTRA_PAIRS, ...registryPairs]

  // Also show wallet assets not already in banco pairs
  const pairIds = new Set(allPairs.map((p) => p.assetId))
  const walletExtras = assetBalances
    .filter((ab) => !pairIds.has(ab.assetId))
    .map((ab) => {
      const ticker = truncateId(ab.assetId)
      return { ticker, assetId: ab.assetId, icon: undefined as string | undefined, decimals: 0 }
    })

  // Resolve asset ID to display name
  const displayAssetName = (assetId: string): string => {
    const pair = allPairs.find((p) => p.assetId === assetId)
    if (pair) return pair.ticker
    const wa = walletExtras.find((a) => a.assetId === assetId)
    if (wa) return wa.ticker
    return truncateId(assetId)
  }

  const tabs = [...allPairs, ...walletExtras]
  const totalTabs = tabs.length
  const safeTab = totalTabs > 0 ? Math.min(selectedTab, totalTabs - 1) : -1
  const selected = safeTab >= 0 ? tabs[safeTab] : null

  const quoteLabel = selected?.ticker ?? ''
  const quoteIcon = selected?.icon
  const quoteAssetId = selected?.assetId ?? ''
  const quoteDecimals = selected?.decimals ?? 0
  const BTC_DECIMALS = 8
  const payLabel = flipped ? quoteLabel : 'BTC'
  const receiveLabel = flipped ? 'BTC' : quoteLabel
  const payIcon = flipped ? quoteIcon : BTC_ICON
  const receiveIcon = flipped ? BTC_ICON : quoteIcon
  const payDecimals = flipped ? quoteDecimals : BTC_DECIMALS
  const receiveDecimals = flipped ? BTC_DECIMALS : quoteDecimals

  // Fetch BTC/USDT price (shared across all pairs, cached 5 min)
  useEffect(() => {
    if (totalTabs === 0) return

    setLoadingPrice(true)
    setError('')

    fetchBtcUsdPrice()
      .then((p) => setPrice(p))
      .catch((err) => {
        consoleError(err, 'error fetching price feed')
        setError('Unable to fetch price')
      })
      .finally(() => setLoadingPrice(false))
  }, [totalTabs])

  const effectivePrice = price ? (flipped ? 1 / price : price) : null

  const sanitizeAmount = (value: string, decimals: number): string => {
    let s = value.replace(/[^0-9.]/g, '')
    // Only allow one decimal point
    const parts = s.split('.')
    if (parts.length > 2) s = parts[0] + '.' + parts.slice(1).join('')
    // Truncate to max decimals
    if (decimals === 0 && parts.length > 1) s = parts[0]
    else if (parts.length === 2 && parts[1].length > decimals) s = parts[0] + '.' + parts[1].slice(0, decimals)
    return s
  }

  const handlePayChange = (value: string) => {
    const sanitized = sanitizeAmount(value, payDecimals)
    setPayAmount(sanitized)
    const num = Number(sanitized)
    if (!effectivePrice || !sanitized || isNaN(num) || num <= 0) {
      setReceiveAmount('')
      return
    }
    setReceiveAmount(prettyNumber(num * effectivePrice, receiveDecimals, false))
  }

  const handleReceiveChange = (value: string) => {
    const sanitized = sanitizeAmount(value, receiveDecimals)
    setReceiveAmount(sanitized)
    const num = Number(sanitized)
    if (!effectivePrice || !sanitized || isNaN(num) || num <= 0) {
      setPayAmount('')
      return
    }
    setPayAmount(prettyNumber(num / effectivePrice, payDecimals, false))
  }

  const handleFlip = () => {
    setFlipped((f) => !f)
    setPayAmount('')
    setReceiveAmount('')
  }

  const handleSelectTab = (i: number) => {
    setSelectedTab(i)
    setFlipped(false)
    setPayAmount('')
    setReceiveAmount('')
    setRateInverted(false)
  }

  const toSmallestUnit = (amount: number, decimals: number): number => Math.round(amount * 10 ** decimals)

  const handleSwap = () => {
    const pay = Number(payAmount)
    const receive = Number(receiveAmount)
    if (pay <= 0 || receive <= 0 || !quoteAssetId) return

    // Convert display amounts to smallest units (sats for BTC, base units for assets)
    setBancoInfo({
      payAmount: toSmallestUnit(pay, payDecimals),
      payAsset: flipped ? quoteAssetId : '',
      receiveAmount: toSmallestUnit(receive, receiveDecimals),
      receiveAsset: flipped ? '' : quoteAssetId,
      pair: `${payLabel}/${receiveLabel}`,
    })

    navigate(Pages.AppBancoSwap)
  }

  const pay = Number(payAmount) || 0
  const payAssetBalance = flipped ? (assetBalances.find((ab) => ab.assetId === quoteAssetId)?.amount ?? 0) : balance

  type ButtonState = 'loading' | 'error' | 'no-pairs' | 'enter-amount' | 'insufficient' | 'ready'
  const buttonState: ButtonState =
    totalTabs === 0
      ? 'no-pairs'
      : loadingPrice
        ? 'loading'
        : error
          ? 'error'
          : !quoteAssetId
            ? 'no-pairs'
            : pay <= 0
              ? 'enter-amount'
              : pay > payAssetBalance
                ? 'insufficient'
                : 'ready'

  const buttonLabel: Record<ButtonState, string> = {
    'no-pairs': 'No swap pairs available',
    loading: 'Fetching price...',
    error: error || 'Unable to fetch price',
    'enter-amount': 'Enter an amount',
    insufficient: `Insufficient ${payLabel} balance`,
    ready: 'Swap',
  }

  const displayRate = effectivePrice
    ? rateInverted
      ? { left: receiveLabel, right: payLabel, value: 1 / effectivePrice }
      : { left: payLabel, right: receiveLabel, value: effectivePrice }
    : null

  if (loadingRegistry) {
    return <LoadingLogo text='Loading assets...' />
  }

  return (
    <>
      <Header text='Banco' back />
      <Content>
        <Padded>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          >
            <SwapCard>
              {/* Currency tabs */}
              {tabs.length > 0 ? (
                <div style={{ display: 'flex', gap: '0.25rem', padding: '0.5rem 0.5rem 0.25rem', flexWrap: 'wrap' }}>
                  {tabs.map((t) => (
                    <CurrencyTab
                      key={t.assetId}
                      label={t.ticker}
                      icon={t.icon}
                      selected={tabs.indexOf(t) === safeTab}
                      onClick={() => handleSelectTab(tabs.indexOf(t))}
                    />
                  ))}
                </div>
              ) : null}

              {/* You pay */}
              <TokenBlock
                label='You pay'
                amount={payAmount}
                onAmountChange={handlePayChange}
                tokenLabel={payLabel}
                tokenIcon={payIcon}
                balance={flipped ? payAssetBalance : balance}
                balanceUnit={flipped ? undefined : 'sats'}
                testId='banco-pay-card'
              />

              <FlipButton onClick={handleFlip} testId='banco-flip' />

              {/* You receive */}
              <TokenBlock
                label='You receive'
                amount={receiveAmount}
                onAmountChange={handleReceiveChange}
                loading={loadingPrice}
                tokenLabel={receiveLabel}
                tokenIcon={receiveIcon}
                testId='banco-receive-card'
              />

              {/* Rate */}
              {displayRate ? (
                <div
                  onClick={() => setRateInverted((r) => !r)}
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    padding: '0.5rem',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <Text small color='dark50'>
                    1 {displayRate.left} = {prettyNumber(displayRate.value, 8)} {displayRate.right}
                  </Text>
                </div>
              ) : null}
            </SwapCard>
          </motion.div>

          {/* Recent swaps */}
          {swaps.length > 0 ? (
            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ fontSize: 13, color: 'var(--dark50)', marginBottom: '0.5rem', fontWeight: 500 }}>
                Recent swaps
              </div>
              <SwapCard>
                {swaps.map((swap, i) => {
                  const payName = swap.payAsset ? displayAssetName(swap.payAsset) : 'BTC'
                  const recvName = swap.receiveAsset ? displayAssetName(swap.receiveAsset) : 'BTC'
                  const statusIcon =
                    swap.status === 'fulfilled' ? (
                      <Check size={14} color='#4ade80' strokeWidth={3} />
                    ) : swap.status === 'cancelled' ? (
                      <X size={14} color='#f87171' strokeWidth={3} />
                    ) : swap.status === 'recoverable' ? (
                      <AlertTriangle size={14} color='#fb923c' strokeWidth={2} />
                    ) : (
                      <Loader2
                        size={14}
                        color='#facc15'
                        strokeWidth={2}
                        style={{ animation: 'spin 1.5s linear infinite' }}
                      />
                    )
                  return (
                    <div
                      key={swap.id}
                      onClick={() => {
                        setSelectedSwapId(swap.id)
                        navigate(Pages.AppBancoDetail)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem 1rem',
                        cursor: 'pointer',
                        borderTop: i > 0 ? '1px solid var(--dark10)' : undefined,
                      }}
                    >
                      {/* Status dot */}
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background:
                            swap.status === 'fulfilled'
                              ? 'rgba(74,222,128,0.1)'
                              : swap.status === 'cancelled'
                                ? 'rgba(248,113,113,0.1)'
                                : swap.status === 'recoverable'
                                  ? 'rgba(251,146,60,0.1)'
                                  : 'rgba(250,204,21,0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {statusIcon}
                      </div>
                      {/* Pair + amounts */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 14,
                            fontWeight: 600,
                            color: 'var(--black)',
                          }}
                        >
                          {payName} <ArrowRight size={12} color='var(--dark30)' /> {recvName}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--dark50)', marginTop: 2 }}>
                          {swap.payAmount.toLocaleString()} → {swap.receiveAmount.toLocaleString()}
                        </div>
                      </div>
                      {/* Time */}
                      <div style={{ fontSize: 12, color: 'var(--dark30)', flexShrink: 0 }}>
                        {prettyAgo(Math.floor(swap.createdAt / 1000))}
                      </div>
                    </div>
                  )
                })}
              </SwapCard>
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          ) : null}
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button label={buttonLabel[buttonState]} onClick={handleSwap} disabled={buttonState !== 'ready'} />
      </ButtonsOnBottom>
    </>
  )
}
