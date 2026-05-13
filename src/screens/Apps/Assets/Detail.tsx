import { AnimatePresence, motion } from 'framer-motion'
import { Liveline, type HoverPoint, type LivelinePoint } from 'liveline'
import { ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import AssetAvatar from '../../../components/AssetAvatar'
import Button from '../../../components/Button'
import Content from '../../../components/Content'
import Header from '../../../components/Header'
import LoadingLogo from '../../../components/LoadingLogo'
import Padded from '../../../components/Padded'
import TokenLogo, { type TokenLogoTicker } from '../../../components/TokenLogo'
import TransactionsList from '../../../components/TransactionsList'
import ReceiveIcon from '../../../icons/Receive'
import ScanIcon from '../../../icons/Scan'
import SendIcon from '../../../icons/Send'
import SwapIcon from '../../../icons/Swap'
import { PrivacyAmount, maskedFiat } from '../../../components/PrivacyAmount'
import { walletLoadInChild, walletLoadInContainer } from '../../../lib/animations'
import { prettyCurrencyAssetAmount, prettyFiatAmount, prettyNumber } from '../../../lib/format'
import { hapticLight, hapticSubtle } from '../../../lib/haptics'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { FlowContext, emptyRecvInfo, emptySendInfo } from '../../../providers/flow'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import { consoleError } from '../../../lib/logs'
import { usePortfolioFiat } from '../../../hooks/usePortfolioFiat'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import type { AssetDetails } from '@arkade-os/sdk'
import { Fiats, Themes } from '../../../lib/types'

const CHART_WINDOWS = [
  { label: '1H', secs: 3_600 },
  { label: '1D', secs: 86_400 },
  { label: '1W', secs: 604_800 },
  { label: '1M', secs: 2_592_000 },
  { label: '1Y', secs: 31_536_000 },
  { label: 'All', secs: -1 },
]

const MIN_CHART_WINDOW_SECS = 30
const ALL_CHART_START_TIME = Math.floor(Date.UTC(2015, 0, 1) / 1000)
const COINBASE_CANDLE_CHUNK_DAYS = 300

export default function AppAssetDetail() {
  const { navigate } = useContext(NavigationContext)
  const { config, updateConfig } = useContext(ConfigContext)
  const { convertFiat, fiatDecimals, toFiat } = useContext(FiatContext)
  const { assetInfo, setAssetInfo, setRecvInfo, setSendInfo, setSwapFromAssetId } = useContext(FlowContext)
  const {
    assetBalances,
    balance: btcBalance,
    svcWallet,
    assetMetadataCache,
    setCacheEntry,
    iconApprovalManager,
  } = useContext(WalletContext)
  const { rows } = usePortfolioFiat()
  const prefersReduced = useReducedMotion()

  const assetId = assetInfo.assetId || 'btc'
  const isBitcoin = assetId === 'btc'
  const isMoneyAccount = assetId.startsWith('account:')
  const [loading, setLoading] = useState(!isBitcoin && !isMoneyAccount)
  const [chartWindow, setChartWindow] = useState(CHART_WINDOWS[0].secs)
  const [chartInteracting, setChartInteracting] = useState(false)
  const chartHapticState = useRef({ lastPointTime: 0, lastTriggerTime: 0 })

  const cachedEntry = isBitcoin || isMoneyAccount ? undefined : assetMetadataCache.get(assetId)
  const hasIcon = cachedEntry?.hasIcon ?? false

  const fetchDetails = async (forceRefresh = false) => {
    if (isBitcoin || isMoneyAccount || !svcWallet || !assetId) return

    let cached: AssetDetails | undefined = forceRefresh ? undefined : assetMetadataCache.get(assetId)
    if (!cached) {
      try {
        const fetched = await svcWallet.assetManager.getAssetDetails(assetId)
        if (fetched) cached = setCacheEntry(assetId, fetched)
      } catch (err) {
        consoleError(err, 'error loading asset details')
      }
    }

    if (cached) setAssetInfo(cached)
  }

  useEffect(() => {
    if (isBitcoin || isMoneyAccount) {
      setLoading(false)
      return
    }
    setLoading(true)
    fetchDetails().then(() => setLoading(false))
  }, [svcWallet, assetId, isBitcoin, isMoneyAccount])

  const portfolioRow = rows.find((row) => row.assetId === assetId)
  const meta =
    isBitcoin || isMoneyAccount
      ? {
          name: portfolioRow?.name ?? (isBitcoin ? 'Bitcoin' : 'Account'),
          ticker: portfolioRow?.ticker ?? (isBitcoin ? 'BTC' : 'USD'),
          decimals: portfolioRow?.decimals ?? (isBitcoin ? 8 : 2),
          icon: portfolioRow?.icon,
        }
      : assetInfo.metadata
  const name = displayAssetName(meta?.ticker, meta?.name, isBitcoin)
  const ticker = isBitcoin ? 'BTC' : (meta?.ticker?.trim().toUpperCase() ?? 'TKN')
  const decimals = isBitcoin ? 8 : (meta?.decimals ?? 8)
  const assetRawBalance = isMoneyAccount
    ? (portfolioRow?.balance ?? BigInt(0))
    : (assetBalances.find((a) => a.assetId === assetId)?.amount ?? BigInt(0))
  const rawBalance = isBitcoin
    ? BigInt(btcBalance)
    : typeof assetRawBalance === 'bigint'
      ? assetRawBalance
      : BigInt(assetRawBalance)
  const unitBalance = rawAmountToUnits(rawBalance, decimals)
  const fallbackHasFiatValue = isBitcoin || isMoneyAccount || Boolean(portfolioRow?.hasFiatPrice)
  const btcFiatAmount = isBitcoin ? toFiat(Number(rawBalance)) : 0
  const stablecoinPegValue = stablecoinPegForTicker(ticker, convertFiat)
  const fallbackUnitPrice =
    stablecoinPegValue ??
    (unitBalance > 0 && fallbackHasFiatValue
      ? (portfolioRow?.fiatAmount ?? btcFiatAmount) / unitBalance
      : estimateUnitPrice(ticker, toFiat, convertFiat))
  const liveChartData = useMarketChartData(ticker, config.fiat, chartWindow, convertFiat)
  const usesPortfolioUnitPrice = isBitcoin || isMoneyAccount || Boolean(stablecoinPegValue)
  const unitPrice = usesPortfolioUnitPrice ? fallbackUnitPrice : (liveChartData.at(-1)?.value ?? fallbackUnitPrice)
  const hasFiatValue = Boolean(liveChartData.length) || fallbackHasFiatValue
  const fiatValue =
    unitBalance > 0 && hasFiatValue ? unitBalance * unitPrice : (portfolioRow?.fiatAmount ?? btcFiatAmount)
  const formattedFiat = hasFiatValue
    ? prettyFiatAmount(fiatValue, config.fiat, {
        maximumFractionDigits: fiatDecimals(),
        minimumFractionDigits: fiatDecimals(),
      })
    : undefined
  const chartColor = useTokenColor(chartTokenForTicker(ticker))
  const chartTheme = useResolvedChartTheme(config.theme)
  const chartData = useMemo(
    () =>
      liveChartData.length
        ? alignChartDataToLatest(liveChartData, unitPrice)
        : buildFlatChartData(unitPrice, chartWindow),
    [liveChartData, unitPrice, chartWindow],
  )
  const chartDisplayData = useMemo(
    () =>
      stablecoinPegValue
        ? buildStablecoinPegChartData(chartData, stablecoinPegValue, chartWindow)
        : smoothChartData(chartData, chartWindow, chartInteracting),
    [chartData, chartInteracting, chartWindow, stablecoinPegValue],
  )
  const livelineWindow = useMemo(
    () => getLivelineWindowSecs(chartDisplayData, chartWindow),
    [chartDisplayData, chartWindow],
  )
  const canRenderChart = typeof ResizeObserver !== 'undefined'
  const chartDelta = calculateDelta(chartData, stablecoinPegValue)
  const tokenLogoTicker = getTokenLogoTicker(ticker)
  const controlAssetId = isBitcoin || isMoneyAccount ? undefined : assetInfo.controlAssetId
  const holdsControlAsset = controlAssetId
    ? assetBalances.some((a) => a.assetId === controlAssetId && a.amount > 0)
    : false
  const isImported = !isBitcoin && !isMoneyAccount && config.importedAssets.includes(assetId)
  const canRemove = isImported && rawBalance === BigInt(0)
  const accountRailAssetId = isMoneyAccount ? portfolioRow?.sourceAssetIds?.[0] : undefined
  const sendAssetId = isMoneyAccount ? accountRailAssetId : assetId
  const activityAssetFilter = isMoneyAccount ? (portfolioRow?.sourceAssetIds ?? []) : assetId

  const handleSend = () => {
    hapticLight()
    setSendInfo(
      isBitcoin || !sendAssetId
        ? emptySendInfo
        : { ...emptySendInfo, assets: [{ assetId: sendAssetId, amount: BigInt(0) }] },
    )
    navigate(Pages.SendForm)
  }

  const handleReceive = () => {
    hapticLight()
    setRecvInfo({
      ...emptyRecvInfo,
      assetId: isBitcoin ? 'btc' : (accountRailAssetId ?? (isMoneyAccount ? undefined : assetId)),
    })
    navigate(Pages.ReceiveQRCode)
  }

  const handleSwap = () => {
    hapticLight()
    setSwapFromAssetId(assetId)
    navigate(Pages.WalletSwap)
  }

  const handleScan = () => {
    hapticLight()
    setSendInfo(
      isBitcoin || !sendAssetId
        ? { ...emptySendInfo, scan: true }
        : { ...emptySendInfo, scan: true, assets: [{ assetId: sendAssetId, amount: BigInt(0) }] },
    )
    navigate(Pages.SendForm)
  }

  const handleReissue = () => {
    hapticLight()
    navigate(Pages.AppAssetReissue)
  }

  const handleBurn = () => {
    hapticLight()
    navigate(Pages.AppAssetBurn)
  }

  const handleRemove = () => {
    hapticLight()
    const updated = config.importedAssets.filter((id) => id !== assetId)
    updateConfig({ ...config, importedAssets: updated })
    navigate(Pages.Wallet)
  }

  const handleChartPress = useCallback(() => {
    if (prefersReduced) return
    hapticSubtle()
  }, [prefersReduced])

  const setChartScrubbing = useCallback((value: boolean) => {
    setChartInteracting((current) => (current === value ? current : value))
  }, [])

  const handleChartHover = useCallback(
    (point: HoverPoint | null) => {
      if (!point || prefersReduced) return

      const pointTime = Math.round(point.time)
      const now = performance.now()
      const state = chartHapticState.current

      if (!pointTime || pointTime === state.lastPointTime) return
      if (now - state.lastTriggerTime < 120) return

      chartHapticState.current = {
        lastPointTime: pointTime,
        lastTriggerTime: now,
      }
      hapticSubtle()
    },
    [prefersReduced],
  )

  if (loading) return <LoadingLogo text='Loading asset...' />

  return (
    <>
      <Header text='' back />
      <Content>
        <Padded>
          <motion.div
            className='asset-detail-page'
            variants={prefersReduced ? undefined : walletLoadInContainer}
            initial={prefersReduced ? false : 'initial'}
            animate='animate'
          >
            <motion.section className='asset-detail-hero' variants={prefersReduced ? undefined : walletLoadInChild}>
              <motion.div className='asset-detail-identity' variants={prefersReduced ? undefined : walletLoadInChild}>
                <span className='asset-detail-logo' aria-hidden='true'>
                  {tokenLogoTicker ? (
                    <TokenLogo ticker={tokenLogoTicker} />
                  ) : (
                    <AssetAvatar icon={meta?.icon} ticker={ticker} name={name} size={52} assetId={assetId} />
                  )}
                </span>
                <div>
                  <h1 className='asset-detail-name'>{name}</h1>
                </div>
              </motion.div>

              <motion.div
                className='asset-detail-price-row'
                layout
                variants={prefersReduced ? undefined : walletLoadInChild}
              >
                <AnimatePresence mode='popLayout' initial={false}>
                  <motion.div
                    key={`${ticker}-${unitPrice}-${config.fiat}`}
                    className='asset-detail-price'
                    initial={prefersReduced ? false : { opacity: 0, y: 8, filter: 'blur(2px)' }}
                    animate={prefersReduced ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={prefersReduced ? undefined : { opacity: 0, y: -8, filter: 'blur(2px)' }}
                    transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                  >
                    {prettyFiatAmount(unitPrice, config.fiat)}
                  </motion.div>
                </AnimatePresence>
                <DeltaBadge value={chartDelta} />
              </motion.div>
            </motion.section>

            <motion.div className='asset-detail-actions' variants={prefersReduced ? undefined : walletLoadInChild}>
              <AssetAction icon={<ReceiveIcon />} label='Receive' onClick={handleReceive} />
              <AssetAction icon={<SendIcon />} label='Send' onClick={handleSend} disabled={rawBalance === BigInt(0)} />
              <AssetAction icon={<SwapIcon />} label='Swap' onClick={handleSwap} />
              <AssetAction icon={<ScanIcon />} label='Scan' onClick={handleScan} />
            </motion.div>

            <motion.section
              className='asset-detail-chart-section'
              variants={prefersReduced ? undefined : walletLoadInChild}
            >
              <div
                className='asset-detail-chart'
                onPointerDown={() => {
                  setChartScrubbing(true)
                  handleChartPress()
                }}
                onPointerEnter={() => setChartScrubbing(true)}
                onPointerLeave={() => setChartScrubbing(false)}
                onPointerUp={() => setChartScrubbing(false)}
                onPointerCancel={() => setChartScrubbing(false)}
              >
                {stablecoinPegValue ? (
                  <StableAccountChart color={chartColor} />
                ) : canRenderChart ? (
                  <Liveline
                    data={chartDisplayData}
                    value={chartDisplayData.at(-1)?.value ?? unitPrice}
                    color={chartColor}
                    theme={chartTheme}
                    window={livelineWindow}
                    badge={false}
                    badgeTail
                    badgeVariant='minimal'
                    formatValue={(value) => prettyFiatAmount(value, config.fiat)}
                    grid={false}
                    pulse={!prefersReduced}
                    scrub={!prefersReduced}
                    momentum={false}
                    fill
                    showValue={false}
                    valueMomentumColor={false}
                    degen={false}
                    exaggerate={false}
                    lineWidth={4}
                    padding={{
                      top: 8,
                      right: 32,
                      bottom: 8,
                      left: 12,
                    }}
                    lerpSpeed={prefersReduced ? 1 : 0.1}
                    onHover={(point) => {
                      setChartScrubbing(Boolean(point))
                      handleChartHover(point)
                    }}
                    cursor='default'
                  />
                ) : (
                  <div className='asset-detail-chart-fallback' aria-hidden='true' />
                )}
              </div>
              <div className='asset-detail-range-tabs' role='tablist' aria-label='Price chart range'>
                {CHART_WINDOWS.map((option) => (
                  <motion.button
                    key={option.label}
                    type='button'
                    role='tab'
                    aria-selected={chartWindow === option.secs}
                    className='asset-detail-range-tab'
                    onClick={() => {
                      hapticSubtle()
                      setChartWindow(option.secs)
                    }}
                    whileTap={prefersReduced ? undefined : { scale: 0.96 }}
                    transition={{ duration: 0.14 }}
                  >
                    {option.label}
                  </motion.button>
                ))}
              </div>
            </motion.section>

            <motion.section className='asset-detail-holdings' variants={prefersReduced ? undefined : walletLoadInChild}>
              <div className='asset-detail-holding'>
                <span>Balance</span>
                <strong>
                  {tokenLogoTicker ? (
                    <span className='asset-detail-holding-logo'>
                      <TokenLogo ticker={tokenLogoTicker} />
                    </span>
                  ) : null}
                  <PrivacyAmount masked={`•••• ${ticker}`}>
                    <span className='asset-detail-holding-amount'>
                      {prettyCurrencyAssetAmount(rawBalance, decimals, ticker)}
                    </span>
                    <span className='asset-detail-holding-unit'>{ticker}</span>
                  </PrivacyAmount>
                </strong>
              </div>
              <div className='asset-detail-holding'>
                <span>Value</span>
                <strong>
                  <PrivacyAmount masked={maskedFiat()}>
                    {formattedFiat ?? prettyFiatAmount(0, config.fiat)}
                  </PrivacyAmount>
                </strong>
              </div>
            </motion.section>

            <motion.section className='asset-detail-activity' variants={prefersReduced ? undefined : walletLoadInChild}>
              <div className='asset-detail-section-header'>
                <div>
                  <strong>Recent activity</strong>
                </div>
              </div>
              <TransactionsList mode='static' assetIdFilter={activityAssetFilter} />
            </motion.section>

            {!isBitcoin && !isMoneyAccount && (hasIcon || holdsControlAsset || rawBalance > BigInt(0) || canRemove) ? (
              <motion.section
                className='asset-detail-management'
                variants={prefersReduced ? undefined : walletLoadInChild}
              >
                <span className='asset-detail-management__label'>Asset controls</span>
                {hasIcon && !iconApprovalManager.isVerified(assetId) ? (
                  <Button
                    label={iconApprovalManager.isApproved(assetId) ? 'Hide icon' : 'Show icon'}
                    onClick={async () => {
                      hapticLight()
                      if (iconApprovalManager.isApproved(assetId)) {
                        iconApprovalManager.revoke(assetId)
                      } else {
                        iconApprovalManager.approve(assetId)
                      }
                      await fetchDetails(true)
                    }}
                    secondary
                  />
                ) : null}
                {holdsControlAsset ? <Button label='Reissue' onClick={handleReissue} secondary /> : null}
                {rawBalance > BigInt(0) ? <Button label='Burn' onClick={handleBurn} secondary /> : null}
                {canRemove ? <Button label='Remove' onClick={handleRemove} secondary /> : null}
              </motion.section>
            ) : null}
          </motion.div>
        </Padded>
      </Content>
    </>
  )
}

function StableAccountChart({ color }: { color: string }) {
  return (
    <div className='asset-detail-stable-chart' style={{ '--asset-detail-chart-color': color }}>
      <span />
    </div>
  )
}

function rawAmountToUnits(rawAmount: bigint, decimals: number): number {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) return Number(rawAmount)
  return Number(rawAmount) / 10 ** decimals
}

function AssetAction({
  disabled,
  icon,
  label,
  onClick,
}: {
  disabled?: boolean
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  const prefersReduced = useReducedMotion()
  const props = {
    type: 'button' as const,
    className: 'asset-detail-action',
    disabled,
    onClick,
  }

  if (prefersReduced) {
    return (
      <button {...props}>
        <span>{icon}</span>
        <small>{label}</small>
      </button>
    )
  }

  return (
    <motion.button {...props} whileTap={{ scale: disabled ? 1 : 0.97 }} transition={{ duration: 0.16 }}>
      <span>{icon}</span>
      <small>{label}</small>
    </motion.button>
  )
}

function DeltaBadge({ value }: { value: number }) {
  const prefersReduced = useReducedMotion()
  const isUp = value >= 0
  const directionKey = isUp ? 'up' : 'down'
  const arrowRotation = isUp ? 0 : 180
  return (
    <motion.span
      key={directionKey}
      className={`asset-detail-delta ${isUp ? 'asset-detail-delta--up' : 'asset-detail-delta--down'}`}
      initial={prefersReduced ? false : { opacity: 0, y: 8, scale: 0.96 }}
      animate={prefersReduced ? undefined : { opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
    >
      <motion.span
        key={`${directionKey}-arrow`}
        className='asset-detail-delta__arrow'
        initial={prefersReduced ? false : { rotate: isUp ? 180 : 0, scale: 0.9 }}
        animate={prefersReduced ? undefined : { rotate: arrowRotation, scale: 1 }}
        transition={{ duration: 0.26, ease: [0.86, 0, 0.07, 1] }}
      >
        ↑
      </motion.span>
      <span>
        {isUp ? '+' : ''}
        {prettyNumber(value, 2)}%
      </span>
    </motion.span>
  )
}

function displayAssetName(ticker: string | undefined, name: string | undefined, isBitcoin: boolean): string {
  const normalizedTicker = ticker?.trim().toUpperCase()
  if (isBitcoin) return 'Bitcoin'
  if (normalizedTicker === 'USD') return 'US Dollars'
  if (normalizedTicker === 'CHF') return 'Swiss Franc'
  if (normalizedTicker === 'BRL') return 'Brazilian Real'
  if (normalizedTicker === 'USDT' || normalizedTicker === 'USDC') return 'US Dollars'
  return name ?? 'Asset'
}

function getTokenLogoTicker(ticker: string | undefined): TokenLogoTicker | undefined {
  const normalized = ticker?.trim().toUpperCase()
  if (
    normalized === 'BTC' ||
    normalized === 'USD' ||
    normalized === 'USDT' ||
    normalized === 'USDC' ||
    normalized === 'CHF' ||
    normalized === 'BRL'
  )
    return normalized
}

function chartTokenForTicker(ticker: string): string {
  const normalized = ticker.trim().toUpperCase()
  if (normalized === 'BTC') return '--orange-500'
  if (normalized === 'USD' || normalized === 'USDT' || normalized === 'USDC' || normalized === 'BRL')
    return '--green-500'
  if (normalized === 'CHF') return '--red-600'
  return '--purple-500'
}

function useTokenColor(token: string): string {
  const [color, setColor] = useState(`var(${token})`)

  useEffect(() => {
    const root = getComputedStyle(document.documentElement)
    const next = root.getPropertyValue(token).trim()
    if (next) setColor(next)
  }, [token])

  return color
}

function useResolvedChartTheme(theme: Themes): 'light' | 'dark' {
  const [resolved, setResolved] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => {
      setResolved(theme === Themes.Dark || (theme === Themes.Auto && query.matches) ? 'dark' : 'light')
    }
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [theme])

  return resolved
}

function useMarketChartData(
  ticker: string,
  fiat: Fiats,
  windowSecs: number,
  convertFiat: (amount: number, from: Fiats) => number,
): LivelinePoint[] {
  const [data, setData] = useState<LivelinePoint[]>([])

  useEffect(() => {
    const coinId = coinGeckoIdForTicker(ticker)
    const fxBase = fxBaseForTicker(ticker)
    if (!coinId && !fxBase) {
      setData([])
      return
    }

    const controller = new AbortController()

    fetchMarketChart(coinId, fxBase, ticker, fiat, windowSecs, convertFiat, controller.signal)
      .then((json) => {
        if (controller.signal.aborted) return
        const prices = Array.isArray(json.prices) ? json.prices : []
        const points = prices
          .map(([timeMs, value]) => ({ time: Math.round(timeMs / 1000), value }))
          .filter((point) => Number.isFinite(point.time) && Number.isFinite(point.value) && point.value > 0)
        if (isAllChartWindow(windowSecs)) {
          setData(points)
          return
        }

        const cutoff = Math.floor(Date.now() / 1000) - windowSecs
        const windowedPoints = points.filter((point) => point.time >= cutoff)
        setData(windowedPoints.length >= 2 ? windowedPoints : points)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        consoleError(err, 'error fetching asset market chart')
        setData([])
      })

    return () => controller.abort()
  }, [ticker, fiat, windowSecs, convertFiat])

  return data
}

async function fetchMarketChart(
  coinId: string | undefined,
  fxBase: Fiats | undefined,
  ticker: string,
  fiat: Fiats,
  windowSecs: number,
  convertFiat: (amount: number, from: Fiats) => number,
  signal: AbortSignal,
): Promise<{ prices?: [number, number][] }> {
  if (fxBase) return { prices: await fetchFiatFxChart(fxBase, fiat, windowSecs, signal) }

  if (!coinId) return {}

  if (isAllChartWindow(windowSecs) && ticker.trim().toUpperCase() === 'BTC') {
    const prices = await fetchCoinbaseBitcoinAllChart(fiat, convertFiat, signal)
    if (prices.length >= 2) return { prices }
  }

  return fetchCoinGeckoMarketChart(coinId, fiat, windowSecs, signal)
}

async function fetchFiatFxChart(
  base: Fiats,
  fiat: Fiats,
  windowSecs: number,
  signal: AbortSignal,
): Promise<[number, number][]> {
  if (base === fiat) return []

  const now = new Date()
  const end = formatIsoDate(now)
  const start = formatIsoDate(startDateForFxWindow(now, windowSecs))
  const params = new URLSearchParams({
    base,
    symbols: fiat,
  })
  const response = await fetch(`https://api.frankfurter.dev/v1/${start}..${end}?${params.toString()}`, { signal })

  if (!response.ok) throw new Error(`Frankfurter FX chart failed: ${response.status}`)

  const json = (await response.json()) as { rates?: Record<string, Record<string, number>> }
  const rates = json.rates ?? {}

  return Object.entries(rates)
    .map(([date, values]) => [new Date(`${date}T12:00:00Z`).getTime(), values[fiat]] as [number, number])
    .filter(([, value]) => Number.isFinite(value) && value > 0)
    .sort(([a], [b]) => a - b)
}

function startDateForFxWindow(now: Date, windowSecs: number): Date {
  const minimumDays = windowSecs <= 86_400 ? 14 : 0
  const windowDays = isAllChartWindow(windowSecs) ? 3650 : Math.ceil(windowSecs / 86_400)
  const days = Math.max(minimumDays, windowDays)
  return new Date(now.getTime() - days * 86_400 * 1000)
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

async function fetchCoinbaseBitcoinAllChart(
  fiat: Fiats,
  convertFiat: (amount: number, from: Fiats) => number,
  signal: AbortSignal,
): Promise<[number, number][]> {
  const now = Math.floor(Date.now() / 1000)
  const chunkSecs = COINBASE_CANDLE_CHUNK_DAYS * 86_400
  const requests: Promise<[number, number][]>[] = []

  for (let start = ALL_CHART_START_TIME; start < now; start += chunkSecs) {
    const end = Math.min(start + chunkSecs, now)
    requests.push(fetchCoinbaseBitcoinCandles(start, end, fiat, convertFiat, signal))
  }

  const chunks = await Promise.all(requests)
  return chunks
    .flat()
    .sort(([a], [b]) => a - b)
    .filter((point, index, points) => index === 0 || point[0] !== points[index - 1][0])
}

async function fetchCoinbaseBitcoinCandles(
  start: number,
  end: number,
  fiat: Fiats,
  convertFiat: (amount: number, from: Fiats) => number,
  signal: AbortSignal,
): Promise<[number, number][]> {
  const params = new URLSearchParams({
    granularity: '86400',
    start: new Date(start * 1000).toISOString(),
    end: new Date(end * 1000).toISOString(),
  })
  const response = await fetch(`https://api.exchange.coinbase.com/products/BTC-USD/candles?${params.toString()}`, {
    signal,
  })

  if (!response.ok) throw new Error(`Coinbase bitcoin chart failed: ${response.status}`)
  const candles = (await response.json()) as [number, number, number, number, number, number][]

  return candles
    .map(
      ([time, , , , close]) =>
        [time * 1000, fiat === Fiats.USD ? close : convertFiat(close, Fiats.USD)] as [number, number],
    )
    .filter(([, value]) => Number.isFinite(value) && value > 0)
}

async function fetchCoinGeckoMarketChart(
  coinId: string,
  fiat: Fiats,
  windowSecs: number,
  signal: AbortSignal,
): Promise<{ prices?: [number, number][] }> {
  const requests = coinGeckoDaysForWindow(windowSecs)

  for (const days of requests) {
    const params = new URLSearchParams({
      vs_currency: fiat.toLowerCase(),
      days,
      precision: 'full',
    })
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?${params.toString()}`, {
      signal,
    })

    if (response.ok) return response.json() as Promise<{ prices?: [number, number][] }>
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
  }

  throw new Error(`CoinGecko market chart failed for ${coinId}`)
}

function estimateUnitPrice(
  ticker: string,
  toFiat: (sats?: number) => number,
  convertFiat: (amount: number, from: Fiats) => number,
): number {
  const normalized = ticker.trim().toUpperCase()
  if (normalized === 'BTC') return toFiat(100_000_000)
  if (normalized === 'USD' || normalized === 'USDT' || normalized === 'USDC') return convertFiat(1, Fiats.USD)
  if (normalized === 'CHF') return convertFiat(1, Fiats.CHF)
  if (normalized === 'BRL') return convertFiat(1, Fiats.BRL)
  return 1
}

function buildFlatChartData(latestValue: number, windowSecs: number): LivelinePoint[] {
  const now = Math.floor(Date.now() / 1000)
  const fallbackWindowSecs = isAllChartWindow(windowSecs) ? 86_400 : windowSecs
  return [
    { time: now - fallbackWindowSecs, value: latestValue },
    { time: now, value: latestValue },
  ]
}

function alignChartDataToLatest(data: LivelinePoint[], latestValue: number): LivelinePoint[] {
  if (!Number.isFinite(latestValue) || data.length === 0) return data

  const latestChartValue = data.at(-1)?.value
  if (!latestChartValue || !Number.isFinite(latestChartValue)) return data

  const ratio = latestValue / latestChartValue
  if (!Number.isFinite(ratio) || ratio <= 0) return data

  return data.map((point) => ({ ...point, value: point.value * ratio }))
}

function buildStablecoinPegChartData(data: LivelinePoint[], pegValue: number, windowSecs: number): LivelinePoint[] {
  const source = data.length >= 8 ? data : buildCalmPegChartData(pegValue, windowSecs)
  return source.map((point) => ({
    time: point.time,
    value: point.value,
  }))
}

function buildCalmPegChartData(pegValue: number, windowSecs: number): LivelinePoint[] {
  const now = Math.floor(Date.now() / 1000)
  const fallbackWindowSecs = isAllChartWindow(windowSecs) ? 86_400 : windowSecs
  const start = now - fallbackWindowSecs
  const amplitude = pegValue * 0.0015

  return Array.from({ length: 10 }, (_, index) => {
    const progress = index / 9
    const value = index === 9 ? pegValue : pegValue + Math.sin(progress * Math.PI * 2) * amplitude
    return {
      time: Math.floor(start + fallbackWindowSecs * progress),
      value,
    }
  })
}

function smoothChartData(data: LivelinePoint[], windowSecs: number, isInteracting: boolean): LivelinePoint[] {
  if (isInteracting || data.length < 8 || (!isAllChartWindow(windowSecs) && windowSecs <= 3_600)) return data

  const targetPoints = chartTargetPointCount(windowSecs)
  const bucketed = bucketAveragePoints(data, targetPoints)
  const radius = chartSmoothingRadius(windowSecs)
  if (radius <= 0) return bucketed

  return bucketed.map((point, index) => {
    if (index === 0 || index === bucketed.length - 1) return point

    const start = Math.max(0, index - radius)
    const end = Math.min(bucketed.length - 1, index + radius)
    let totalWeight = 0
    let totalValue = 0

    for (let cursor = start; cursor <= end; cursor += 1) {
      const distance = Math.abs(cursor - index)
      const weight = radius + 1 - distance
      totalWeight += weight
      totalValue += bucketed[cursor].value * weight
    }

    return {
      time: point.time,
      value: totalValue / totalWeight,
    }
  })
}

function bucketAveragePoints(data: LivelinePoint[], targetPoints: number): LivelinePoint[] {
  if (data.length <= targetPoints) return data

  const bucketSize = Math.ceil(data.length / targetPoints)
  const points: LivelinePoint[] = [data[0]]

  for (let index = 1; index < data.length - 1; index += bucketSize) {
    const bucket = data.slice(index, index + bucketSize)
    if (!bucket.length) continue

    const time = bucket[Math.floor(bucket.length / 2)].time
    const value = bucket.reduce((sum, point) => sum + point.value, 0) / bucket.length
    points.push({ time, value })
  }

  const last = data.at(-1)
  if (last && points.at(-1)?.time !== last.time) points.push(last)

  return points
}

function chartTargetPointCount(windowSecs: number): number {
  if (isAllChartWindow(windowSecs)) return 120
  if (windowSecs >= 31_536_000) return 116
  if (windowSecs >= 2_592_000) return 96
  if (windowSecs >= 86_400) return 72
  return 84
}

function chartSmoothingRadius(windowSecs: number): number {
  if (isAllChartWindow(windowSecs)) return 5
  if (windowSecs >= 31_536_000) return 4
  if (windowSecs >= 2_592_000) return 3
  if (windowSecs >= 86_400) return 2
  return 2
}

function getLivelineWindowSecs(data: LivelinePoint[], windowSecs: number): number {
  const first = data[0]
  const last = data.at(-1)
  if (!first || !last) return 86_400

  if (!isAllChartWindow(windowSecs)) {
    const cutoff = last.time - windowSecs
    const visiblePoints = data.filter((point) => point.time >= cutoff)
    if (visiblePoints.length >= 2) return windowSecs
  }

  const now = Math.floor(Date.now() / 1000)
  const rightEdge = Math.max(now, last.time)
  return Math.max(MIN_CHART_WINDOW_SECS, rightEdge - first.time)
}

function calculateDelta(data: LivelinePoint[], stablecoinPegValue?: number): number {
  if (stablecoinPegValue) {
    const last = data.at(-1)?.value ?? stablecoinPegValue
    const deviation = ((last - stablecoinPegValue) / stablecoinPegValue) * 100
    return Math.abs(deviation) < 0.05 ? 0 : deviation
  }

  const first = data[0]?.value ?? 0
  const last = data.at(-1)?.value ?? first
  if (!first) return 0
  return ((last - first) / first) * 100
}

function stablecoinPegForTicker(
  ticker: string,
  convertFiat: (amount: number, from: Fiats) => number,
): number | undefined {
  const normalized = ticker.trim().toUpperCase()
  if (normalized === 'USD' || normalized === 'USDT' || normalized === 'USDC') return convertFiat(1, Fiats.USD)
}

function coinGeckoIdForTicker(ticker: string): string | undefined {
  const normalized = ticker.trim().toUpperCase()
  if (normalized === 'BTC') return 'bitcoin'
  if (normalized === 'USD' || normalized === 'USDT' || normalized === 'USDC') return undefined
}

function fxBaseForTicker(ticker: string): Fiats | undefined {
  const normalized = ticker.trim().toUpperCase()
  if (normalized === 'CHF') return Fiats.CHF
  if (normalized === 'BRL' || normalized === 'DPIX' || normalized === 'DEPIX') return Fiats.BRL
}

function coinGeckoDaysForWindow(windowSecs: number): string[] {
  if (isAllChartWindow(windowSecs)) return ['365']
  if (windowSecs <= 3_600) return ['1']
  if (windowSecs <= 86_400) return ['1']
  if (windowSecs <= 604_800) return ['7']
  if (windowSecs <= 2_592_000) return ['30']
  if (windowSecs <= 31_536_000) return ['365']
  return ['365']
}

function isAllChartWindow(windowSecs: number): boolean {
  return windowSecs < 0
}
