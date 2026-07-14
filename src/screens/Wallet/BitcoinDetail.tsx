import { AnimatePresence, motion } from 'framer-motion'
import { Liveline, type HoverPoint, type LivelinePoint } from 'liveline'
import { ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import AssetAvatar from '../../components/AssetAvatar'
import Content from '../../components/Content'
import Header from '../../components/Header'
import Padded from '../../components/Padded'
import { PrivacyAmount } from '../../components/PrivacyAmount'
import TokenLogo, { accountTickerForAssetTicker, tokenLogoTickerForTicker } from '../../components/TokenLogo'
import TransactionsList from '../../components/TransactionsList'
import { usePortfolioFiat, type PortfolioRow } from '../../hooks/usePortfolioFiat'
import ReceiveIcon from '../../icons/Receive'
import ScanIcon from '../../icons/Scan'
import SendIcon from '../../icons/Send'
import SwapIcon from '../../icons/Swap'
import { walletLoadInChild, walletLoadInContainer } from '../../lib/animations'
import {
  prettyBitcoinAmount,
  prettyBitcoinHide,
  prettyCurrencyAssetAmount,
  prettyFiatAmount,
  prettyFiatHide,
  prettyNumber,
} from '../../lib/format'
import { fiatDecimalsFor } from '../../lib/fiat'
import { hapticLight, hapticSubtle } from '../../lib/haptics'
import { consoleError } from '../../lib/logs'
import { Currencies, Themes, Unit } from '../../lib/types'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { ConfigContext } from '../../providers/config'
import { FiatContext } from '../../providers/fiat'
import { FlowContext, emptyRecvInfo, emptySendInfo } from '../../providers/flow'
import { NavigationContext, Pages } from '../../providers/navigation'
import { buildCrossRatePoints, fetchHistoricalMarketData } from '../../lib/marketData'
import { accountChartColorToken, primaryFiatAccountSource } from '../../lib/accountAssets'

const CHART_WINDOWS = [
  { label: '1H', secs: 3_600 },
  { label: '1D', secs: 86_400 },
  { label: '1W', secs: 604_800 },
  { label: '1M', secs: 2_592_000 },
  { label: '1Y', secs: 31_536_000 },
  { label: 'All', secs: -1 },
]

const MIN_CHART_WINDOW_SECS = 30
const marketChartCache = new Map<string, LivelinePoint[]>()

type MarketChartStatus = 'loading' | 'ready' | 'unavailable'

const unavailableRow: PortfolioRow = {
  assetId: '',
  name: 'Account unavailable',
  ticker: 'TKN',
  decimals: 0,
  balance: BigInt(0),
  fiatAmount: 0,
  satsEquivalent: 0,
  hasFiatPrice: false,
}

export default function BitcoinDetail({ assetId = 'btc' }: { assetId?: string }) {
  const { config } = useContext(ConfigContext)
  const { fromFiatAmount, toFiatAmount } = useContext(FiatContext)
  const { setRecvInfo, setSendInfo, setSwapFromAssetId } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { rows } = usePortfolioFiat()
  const prefersReduced = useReducedMotion()

  const [chartWindow, setChartWindow] = useState(CHART_WINDOWS[2].secs)
  const [chartInteracting, setChartInteracting] = useState(false)
  const chartHapticState = useRef({ lastPointTime: 0, lastTriggerTime: 0 })

  const selectedRow = rows.find((candidate) => candidate.assetId === assetId)
  const row = selectedRow ?? unavailableRow
  const isBitcoin = row.assetId === 'btc'
  const sourceFiat = isBitcoin ? Currencies.BTC : row.fiatCurrency
  const marketFiat = isBitcoin && config.currency === Currencies.BTC ? Currencies.USD : config.currency
  const bitcoinUnit = config.unit
  const marketDecimals = fiatDecimalsFor(marketFiat, bitcoinUnit)
  const currentUnitPrice = currentPriceForRow(isBitcoin, sourceFiat, marketFiat, fromFiatAmount, toFiatAmount)
  const marketChart = useAccountMarketChartData(sourceFiat, marketFiat, chartWindow, bitcoinUnit)
  const chartUnitPrice = marketChart.data.at(-1)?.value ?? currentUnitPrice ?? 0
  const safeBitcoinBalance =
    isBitcoin && typeof row.balance === 'number' && Number.isFinite(row.balance)
      ? Math.max(0, Math.floor(row.balance))
      : 0
  const fiatValue = isBitcoin
    ? currentUnitPrice === undefined
      ? undefined
      : (safeBitcoinBalance / 100_000_000) * currentUnitPrice
    : row.hasFiatPrice
      ? row.fiatAmount
      : undefined
  const formattedFiat =
    fiatValue === undefined
      ? undefined
      : prettyFiatAmount(fiatValue, marketFiat, {
          bitcoinUnit,
          maximumFractionDigits: marketDecimals,
          minimumFractionDigits: marketDecimals,
        })
  const rawBalance = typeof row.balance === 'bigint' ? row.balance : BigInt(Math.max(0, Math.floor(row.balance)))
  const formattedBalance = isBitcoin
    ? prettyBitcoinAmount(safeBitcoinBalance, bitcoinUnit)
    : `${prettyCurrencyAssetAmount(rawBalance, row.decimals, row.ticker)} ${row.ticker}`
  const maskedBalance = isBitcoin ? prettyBitcoinHide(safeBitcoinBalance, bitcoinUnit) : `•••• ${row.ticker}`
  const chartColor = useTokenColor(accountChartColorToken(row.ticker), config.theme)
  const chartTheme = useResolvedChartTheme(config.theme)
  const chartDisplayData = useMemo(
    () => smoothChartData(marketChart.data, chartWindow, chartInteracting),
    [chartInteracting, chartWindow, marketChart.data],
  )
  const chartDelta = calculateDelta(marketChart.data)
  const livelineWindow = useMemo(
    () => getLivelineWindowSecs(chartDisplayData, chartWindow),
    [chartDisplayData, chartWindow],
  )
  const canRenderChart =
    marketChart.status === 'ready' && marketChart.data.length >= 2 && typeof ResizeObserver !== 'undefined'
  const accountTicker = accountTickerForAssetTicker(row.ticker)
  const primarySource = primaryFiatAccountSource(row.sourceAssets, row.decimals)
  const sourceAssetId = primarySource?.assetId ?? walletSourceAssetId(row)
  const sendAccount =
    !isBitcoin && accountTicker && accountTicker !== 'BTC' && row.sourceAssets?.length
      ? {
          assetId: row.assetId,
          ticker: accountTicker,
          balance: rawBalance,
          decimals: row.decimals,
          amount: BigInt(0),
          sources: row.sourceAssets,
        }
      : undefined
  const tokenLogoTicker = tokenLogoTickerForTicker(accountTicker ?? row.ticker)
  const activityAssetFilter = isBitcoin
    ? 'btc'
    : Array.from(new Set([row.assetId, ...(row.sourceAssetIds ?? [])].filter(Boolean)))
  const priceText =
    currentUnitPrice === undefined
      ? 'Price unavailable'
      : prettyFiatAmount(currentUnitPrice, marketFiat, {
          bitcoinUnit,
          maximumFractionDigits: marketDecimals,
          minimumFractionDigits: marketDecimals,
        })

  const handleSend = () => {
    hapticLight()
    setSendInfo(
      sendAccount
        ? { ...emptySendInfo, account: sendAccount }
        : isBitcoin || !sourceAssetId
          ? emptySendInfo
          : { ...emptySendInfo, assets: [{ assetId: sourceAssetId, amount: BigInt(0) }] },
    )
    navigate(Pages.SendForm)
  }

  const handleReceive = () => {
    hapticLight()
    setRecvInfo(
      isBitcoin || !sourceAssetId
        ? emptyRecvInfo
        : { ...emptyRecvInfo, assetId: sourceAssetId, assetAmount: BigInt(0) },
    )
    navigate(Pages.ReceiveQRCode)
  }

  const handleScan = () => {
    hapticLight()
    setSendInfo(
      sendAccount
        ? { ...emptySendInfo, account: sendAccount, scan: true }
        : isBitcoin || !sourceAssetId
          ? { ...emptySendInfo, scan: true }
          : { ...emptySendInfo, assets: [{ assetId: sourceAssetId, amount: BigInt(0) }], scan: true },
    )
    navigate(Pages.SendForm)
  }

  const handleSwap = () => {
    hapticLight()
    setSwapFromAssetId(row.assetId)
    navigate(Pages.WalletSwap)
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

  if (!selectedRow) {
    return (
      <>
        <Header text='' back />
        <Content>
          <Padded>
            <div className='asset-detail-page'>Account unavailable</div>
          </Padded>
        </Content>
      </>
    )
  }

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
                    <AssetAvatar icon={row.icon} name={row.name} ticker={row.ticker} size={60} />
                  )}
                </span>
                <div>
                  <h1 className='asset-detail-name'>{row.name}</h1>
                </div>
              </motion.div>

              <motion.div
                className='asset-detail-price-row'
                layout
                variants={prefersReduced ? undefined : walletLoadInChild}
              >
                <AnimatePresence mode='popLayout' initial={false}>
                  <motion.div
                    key={`${priceText}-${marketFiat}`}
                    className={`asset-detail-price${currentUnitPrice === undefined ? ' asset-detail-price--unavailable' : ''}`}
                    initial={prefersReduced ? false : { opacity: 0, y: 8, filter: 'blur(2px)' }}
                    animate={prefersReduced ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={prefersReduced ? undefined : { opacity: 0, y: -8, filter: 'blur(2px)' }}
                    transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                  >
                    {priceText}
                  </motion.div>
                </AnimatePresence>
                {marketChart.status === 'ready' && marketChart.data.length >= 2 ? (
                  <DeltaBadge value={chartDelta} />
                ) : null}
              </motion.div>
            </motion.section>

            <motion.div className='asset-detail-actions' variants={prefersReduced ? undefined : walletLoadInChild}>
              <AssetAction
                icon={<ReceiveIcon />}
                label='Receive'
                onClick={handleReceive}
                disabled={!isBitcoin && !sourceAssetId}
              />
              <AssetAction
                icon={<SendIcon />}
                label='Send'
                onClick={handleSend}
                disabled={rawBalance === BigInt(0) || (!isBitcoin && !sendAccount && !sourceAssetId)}
              />
              <AssetAction icon={<SwapIcon />} label='Swap' onClick={handleSwap} />
              <AssetAction
                icon={<ScanIcon />}
                label='Scan'
                onClick={handleScan}
                disabled={!isBitcoin && !sourceAssetId}
              />
            </motion.div>

            <motion.section
              className='asset-detail-chart-section'
              variants={prefersReduced ? undefined : walletLoadInChild}
            >
              <div
                className='asset-detail-chart'
                onPointerDown={() => {
                  if (!canRenderChart) return
                  setChartScrubbing(true)
                  handleChartPress()
                }}
                onPointerEnter={() => {
                  if (canRenderChart) setChartScrubbing(true)
                }}
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
                    formatValue={(value) => prettyFiatAmount(value, marketFiat, { bitcoinUnit })}
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
                    padding={{ top: 8, right: 32, bottom: 8, left: 12 }}
                    lerpSpeed={prefersReduced ? 1 : 0.1}
                    onHover={(point) => {
                      setChartScrubbing(Boolean(point))
                      handleChartHover(point)
                    }}
                    cursor='default'
                  />
                ) : (
                  <div className='asset-detail-chart-fallback' role='status'>
                    {marketChart.status === 'loading' ? 'Loading price history…' : 'Price history unavailable'}
                  </div>
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
                  <PrivacyAmount masked={maskedBalance}>
                    <span className='asset-detail-holding-amount'>{formattedBalance}</span>
                  </PrivacyAmount>
                </strong>
              </div>
              <div className='asset-detail-holding'>
                <span>Value</span>
                <strong>
                  {formattedFiat === undefined || fiatValue === undefined ? (
                    'Unavailable'
                  ) : (
                    <PrivacyAmount masked={prettyFiatHide(fiatValue, marketFiat, { bitcoinUnit })}>
                      {formattedFiat}
                    </PrivacyAmount>
                  )}
                </strong>
              </div>
            </motion.section>

            <motion.section className='asset-detail-activity' variants={prefersReduced ? undefined : walletLoadInChild}>
              <div className='asset-detail-section-header'>
                <strong>Recent activity</strong>
              </div>
              <TransactionsList mode='static' assetIdFilter={activityAssetFilter} limit={5} />
            </motion.section>
          </motion.div>
        </Padded>
      </Content>
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

function currentPriceForRow(
  isBitcoin: boolean,
  sourceFiat: Currencies | undefined,
  marketFiat: Currencies,
  fromFiatAmount: (amount: number, currency: Currencies) => number,
  toFiatAmount: (satoshis: number, currency: Currencies) => number,
): number | undefined {
  if (isBitcoin) return toFiatAmount(100_000_000, marketFiat)
  if (!sourceFiat) return undefined
  if (sourceFiat === marketFiat) return 1

  const converted = toFiatAmount(fromFiatAmount(1, sourceFiat), marketFiat)
  return Number.isFinite(converted) && converted > 0 ? converted : undefined
}

function walletSourceAssetId(row: PortfolioRow): string | undefined {
  const sourceAssetId = row.sourceAssetIds?.[0]
  if (sourceAssetId) return sourceAssetId
  return row.assetId && !row.assetId.startsWith('account:') ? row.assetId : undefined
}

function useAccountMarketChartData(
  sourceFiat: Currencies | undefined,
  marketFiat: Currencies,
  windowSecs: number,
  bitcoinUnit: Unit,
): { data: LivelinePoint[]; status: MarketChartStatus } {
  const [chart, setChart] = useState<{ data: LivelinePoint[]; status: MarketChartStatus }>({
    data: [],
    status: sourceFiat ? 'loading' : 'unavailable',
  })

  useEffect(() => {
    const controller = new AbortController()
    const cacheKey = marketChartCacheKey(sourceFiat, marketFiat, windowSecs, bitcoinUnit)
    const cached = marketChartCache.get(cacheKey)

    if (!sourceFiat) {
      setChart({ data: [], status: 'unavailable' })
      return () => controller.abort()
    }

    if (cached) {
      setChart({ data: cached, status: 'ready' })
      return () => controller.abort()
    }

    if (sourceFiat === marketFiat) {
      const points = buildConstantChartData(1, windowSecs)
      marketChartCache.set(cacheKey, points)
      setChart({ data: points, status: 'ready' })
      return () => controller.abort()
    }

    setChart({ data: [], status: 'loading' })
    fetchAccountMarketData(sourceFiat, marketFiat, windowSecs, bitcoinUnit, controller.signal)
      .then((points) => {
        if (controller.signal.aborted) return
        if (points.length < 2) {
          setChart({ data: [], status: 'unavailable' })
          return
        }
        marketChartCache.set(cacheKey, points)
        setChart({ data: points, status: 'ready' })
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        consoleError(err, 'error fetching account market chart')
        setChart({ data: [], status: 'unavailable' })
      })

    return () => controller.abort()
  }, [bitcoinUnit, marketFiat, sourceFiat, windowSecs])

  return chart
}

async function fetchAccountMarketData(
  sourceFiat: Currencies,
  marketFiat: Currencies,
  windowSecs: number,
  bitcoinUnit: Unit,
  signal: AbortSignal,
): Promise<LivelinePoint[]> {
  if (sourceFiat === Currencies.BTC) return fetchHistoricalMarketData(windowSecs, marketFiat, signal)

  if (marketFiat === Currencies.BTC) {
    const sourcePoints = await fetchHistoricalMarketData(windowSecs, sourceFiat, signal)
    const bitcoinUnitScale = bitcoinUnit === Unit.BTC ? 1 : 100_000_000
    return sourcePoints
      .filter((point) => Number.isFinite(point.value) && point.value > 0)
      .map((point) => ({ time: point.time, value: bitcoinUnitScale / point.value }))
  }

  const [sourcePoints, marketPoints] = await Promise.all([
    fetchHistoricalMarketData(windowSecs, sourceFiat, signal),
    fetchHistoricalMarketData(windowSecs, marketFiat, signal),
  ])
  return buildCrossRatePoints(sourcePoints, marketPoints)
}

function buildConstantChartData(latestValue: number, windowSecs: number): LivelinePoint[] {
  const now = Math.floor(Date.now() / 1000)
  const exactWindowSecs = isAllChartWindow(windowSecs) ? 86_400 : windowSecs
  return [
    { time: now - exactWindowSecs, value: latestValue },
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

function marketChartCacheKey(
  sourceFiat: Currencies | undefined,
  marketFiat: Currencies,
  windowSecs: number,
  bitcoinUnit: Unit,
): string {
  return `${sourceFiat ?? 'unpriced'}:${marketFiat}:${windowSecs}:${bitcoinUnit}`
}

function isAllChartWindow(windowSecs: number): boolean {
  return windowSecs < 0
}
