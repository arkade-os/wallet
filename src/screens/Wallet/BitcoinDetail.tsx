import { AnimatePresence, motion } from 'framer-motion'
import { Liveline, type HoverPoint, type LivelinePoint } from 'liveline'
import { ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import Content from '../../components/Content'
import Header from '../../components/Header'
import Padded from '../../components/Padded'
import { PrivacyAmount } from '../../components/PrivacyAmount'
import SwapComingSoonSheet from '../../components/SwapComingSoonSheet'
import TokenLogo from '../../components/TokenLogo'
import TransactionsList from '../../components/TransactionsList'
import ReceiveIcon from '../../icons/Receive'
import ScanIcon from '../../icons/Scan'
import SendIcon from '../../icons/Send'
import SwapIcon from '../../icons/Swap'
import { walletLoadInChild, walletLoadInContainer } from '../../lib/animations'
import {
  prettyBitcoinAmount,
  prettyBitcoinHide,
  prettyChartDateTime,
  prettyFiatAmount,
  prettyFiatHide,
  prettyNumber,
} from '../../lib/format'
import { fiatDecimalsFor } from '../../lib/fiat'
import { hapticLight, hapticSubtle } from '../../lib/haptics'
import { consoleError } from '../../lib/logs'
import { Currencies, Themes } from '../../lib/types'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { AssetSwapsContext } from '../../providers/assetSwaps'
import { ConfigContext } from '../../providers/config'
import { FiatContext } from '../../providers/fiat'
import { FlowContext, emptyRecvInfo, emptySendInfo } from '../../providers/flow'
import { NavigationContext, Pages } from '../../providers/navigation'
import { WalletContext } from '../../providers/wallet'
import { fetchHistoricalMarketData } from '../../lib/marketData'

const CHART_WINDOWS = [
  { label: '1H', secs: 3_600 },
  { label: '1D', secs: 86_400 },
  { label: '1W', secs: 604_800 },
  { label: '1M', secs: 2_592_000 },
  { label: '1Y', secs: 31_536_000 },
  { label: 'All', secs: -1 },
]

const MIN_CHART_WINDOW_SECS = 30
const bitcoinChartCache = new Map<string, LivelinePoint[]>()

export default function BitcoinDetail() {
  const { config } = useContext(ConfigContext)
  const { toFiatAmount } = useContext(FiatContext)
  const { setRecvInfo, setSendInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { balance } = useContext(WalletContext)
  const { swapAvailable, swaps } = useContext(AssetSwapsContext)
  const prefersReduced = useReducedMotion()

  const [chartWindow, setChartWindow] = useState(CHART_WINDOWS[2].secs)
  const [chartInteracting, setChartInteracting] = useState(false)
  const [swapSheetOpen, setSwapSheetOpen] = useState(false)
  const chartHapticState = useRef({ lastPointTime: 0, lastTriggerTime: 0 })

  const marketFiat = config.currency === Currencies.BTC ? Currencies.USD : config.currency
  const marketDecimals = fiatDecimalsFor(marketFiat)
  const bitcoinUnit = config.unit
  const currentUnitPrice = toFiatAmount(100_000_000, marketFiat)
  const liveChartData = useBitcoinMarketChartData(marketFiat, chartWindow)
  const chartUnitPrice = liveChartData.at(-1)?.value ?? currentUnitPrice
  const fiatValue = (balance / 100_000_000) * currentUnitPrice
  const formattedFiat = prettyFiatAmount(fiatValue, marketFiat, {
    maximumFractionDigits: marketDecimals,
    minimumFractionDigits: marketDecimals,
  })
  const chartColor = useTokenColor('--orange-500', config.theme)
  const chartTheme = useResolvedChartTheme(config.theme)
  const safeBalance = Number.isFinite(balance) ? Math.max(0, Math.floor(balance)) : 0
  const chartData = useMemo(
    () => (liveChartData.length ? liveChartData : buildFlatChartData(chartUnitPrice, chartWindow)),
    [chartWindow, chartUnitPrice, liveChartData],
  )
  const chartDisplayData = useMemo(
    () => smoothChartData(chartData, chartWindow, chartInteracting),
    [chartData, chartInteracting, chartWindow],
  )
  const chartDelta = calculateDelta(chartData)
  const livelineWindow = useMemo(
    () => getLivelineWindowSecs(chartDisplayData, chartWindow),
    [chartDisplayData, chartWindow],
  )
  const canRenderChart = typeof ResizeObserver !== 'undefined'

  const handleSend = () => {
    hapticLight()
    setSendInfo(emptySendInfo)
    navigate(Pages.SendForm)
  }

  const handleReceive = () => {
    hapticLight()
    setRecvInfo(emptyRecvInfo)
    navigate(Pages.ReceiveQRCode)
  }

  const handleScan = () => {
    hapticLight()
    setSendInfo({ ...emptySendInfo, scan: true })
    navigate(Pages.SendForm)
  }

  const handleSwap = () => {
    hapticLight()
    // existing swaps stay reachable during outages so pending funds
    // remain cancellable from the swap screen
    if (swapAvailable || swaps.length > 0) navigate(Pages.WalletSwap)
    else setSwapSheetOpen(true)
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
                  <TokenLogo ticker='BTC' />
                </span>
                <div>
                  <h1 className='asset-detail-name'>Bitcoin</h1>
                </div>
              </motion.div>

              <motion.div
                className='asset-detail-price-row'
                layout
                variants={prefersReduced ? undefined : walletLoadInChild}
              >
                <AnimatePresence mode='popLayout' initial={false}>
                  <motion.div
                    key={`${currentUnitPrice}-${marketFiat}`}
                    className='asset-detail-price'
                    initial={prefersReduced ? false : { opacity: 0, y: 8, filter: 'blur(2px)' }}
                    animate={prefersReduced ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={prefersReduced ? undefined : { opacity: 0, y: -8, filter: 'blur(2px)' }}
                    transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                  >
                    {prettyFiatAmount(currentUnitPrice, marketFiat)}
                  </motion.div>
                </AnimatePresence>
                <DeltaBadge value={chartDelta} />
              </motion.div>
            </motion.section>

            <motion.div className='asset-detail-actions' variants={prefersReduced ? undefined : walletLoadInChild}>
              <AssetAction icon={<ReceiveIcon />} label='Receive' onClick={handleReceive} />
              <AssetAction icon={<SendIcon />} label='Send' onClick={handleSend} disabled={balance === 0} />
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
                {canRenderChart ? (
                  <Liveline
                    data={chartDisplayData}
                    value={chartDisplayData.at(-1)?.value ?? chartUnitPrice}
                    color={chartColor}
                    theme={chartTheme}
                    window={livelineWindow}
                    badge={false}
                    badgeTail
                    badgeVariant='minimal'
                    formatValue={(value) => prettyFiatAmount(value, marketFiat)}
                    formatTime={prettyChartDateTime}
                    grid={false}
                    paused={chartInteracting}
                    pulse={!prefersReduced}
                    scrub={!prefersReduced}
                    momentum={false}
                    fill
                    showValue={false}
                    valueMomentumColor={false}
                    degen={false}
                    exaggerate={false}
                    lineWidth={4}
                    tooltipY={-18}
                    padding={{ top: 28, right: 32, bottom: 8, left: 12 }}
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
                  <PrivacyAmount masked={prettyBitcoinHide(safeBalance, bitcoinUnit)}>
                    <span className='asset-detail-holding-amount'>{prettyBitcoinAmount(safeBalance, bitcoinUnit)}</span>
                  </PrivacyAmount>
                </strong>
              </div>
              <div className='asset-detail-holding'>
                <span>Value</span>
                <strong>
                  <PrivacyAmount masked={prettyFiatHide(fiatValue, marketFiat)}>{formattedFiat}</PrivacyAmount>
                </strong>
              </div>
            </motion.section>

            <motion.section className='asset-detail-activity' variants={prefersReduced ? undefined : walletLoadInChild}>
              <div className='asset-detail-section-header'>
                <strong>Recent activity</strong>
              </div>
              <TransactionsList mode='static' assetIdFilter='btc' limit={5} />
            </motion.section>
          </motion.div>
        </Padded>
      </Content>
      <SwapComingSoonSheet isOpen={swapSheetOpen} onClose={() => setSwapSheetOpen(false)} />
    </>
  )
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

function useTokenColor(token: string, theme: Themes): string {
  const [color, setColor] = useState(`var(${token})`)

  useEffect(() => {
    const root = getComputedStyle(document.documentElement)
    const next = root.getPropertyValue(token).trim()
    if (next) setColor(next)
  }, [theme, token])

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

function useBitcoinMarketChartData(currency: Currencies, windowSecs: number): LivelinePoint[] {
  const [data, setData] = useState<LivelinePoint[]>([])

  useEffect(() => {
    const controller = new AbortController()
    const cacheKey = bitcoinChartCacheKey(currency, windowSecs)
    const cached = bitcoinChartCache.get(cacheKey)

    if (currency === Currencies.BTC) {
      setData([])
      return () => controller.abort()
    }

    if (cached) {
      setData(cached)
      return () => controller.abort()
    }

    fetchHistoricalMarketData(windowSecs, currency, controller.signal)
      .then((points) => {
        if (controller.signal.aborted) return
        bitcoinChartCache.set(cacheKey, points)
        setData(points)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        consoleError(err, 'error fetching bitcoin market chart')
        setData([])
      })

    return () => controller.abort()
  }, [currency, windowSecs])

  return data
}

function buildFlatChartData(latestValue: number, windowSecs: number): LivelinePoint[] {
  const now = Math.floor(Date.now() / 1000)
  const fallbackWindowSecs = isAllChartWindow(windowSecs) ? 86_400 : windowSecs
  return [
    { time: now - fallbackWindowSecs, value: latestValue },
    { time: now, value: latestValue },
  ]
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
  if (!isAllChartWindow(windowSecs)) return windowSecs

  const first = data[0]
  const last = data.at(-1)
  if (!first || !last) return 86_400

  const now = Math.floor(Date.now() / 1000)
  const rightEdge = Math.max(now, last.time)
  return Math.max(MIN_CHART_WINDOW_SECS, rightEdge - first.time)
}

function calculateDelta(data: LivelinePoint[]): number {
  const first = data[0]?.value ?? 0
  const last = data.at(-1)?.value ?? first
  if (!first) return 0
  return ((last - first) / first) * 100
}

function bitcoinChartCacheKey(currency: Currencies, windowSecs: number): string {
  return `${currency}:${windowSecs}`
}

function isAllChartWindow(windowSecs: number): boolean {
  return windowSecs < 0
}
