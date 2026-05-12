import { AnimatePresence, motion } from 'framer-motion'
import { Liveline, type LivelinePoint, type Momentum, type ThemeMode, type WindowStyle } from 'liveline'
import { ReactNode, useContext, useEffect, useMemo, useState } from 'react'
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
import { centsToUnits } from '../../../lib/assets'
import { walletLoadInChild, walletLoadInContainer } from '../../../lib/animations'
import { formatAssetAmount, prettyFiatAmount, prettyNumber } from '../../../lib/format'
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
  { label: 'All', secs: 157_680_000 },
]

type ChartDevOptions = {
  badge: boolean
  badgeTail: boolean
  badgeVariant: 'default' | 'minimal'
  builtInWindows: boolean
  degen: boolean
  exaggerate: boolean
  fill: boolean
  grid: boolean
  lerpSpeed: number
  lineWidth: number
  momentum: 'off' | 'auto' | Momentum
  paddingBottom: number
  paddingLeft: number
  paddingRight: number
  paddingTop: number
  pulse: boolean
  scrub: boolean
  showValue: boolean
  theme: 'auto' | ThemeMode
  valueMomentumColor: boolean
  windowStyle: WindowStyle
}

const DEFAULT_CHART_DEV_OPTIONS: ChartDevOptions = {
  badge: false,
  badgeTail: true,
  badgeVariant: 'minimal',
  builtInWindows: false,
  degen: false,
  exaggerate: false,
  fill: false,
  grid: false,
  lerpSpeed: 0.1,
  lineWidth: 4,
  momentum: 'off',
  paddingBottom: 8,
  paddingLeft: 12,
  paddingRight: 12,
  paddingTop: 8,
  pulse: false,
  scrub: false,
  showValue: false,
  theme: 'auto',
  valueMomentumColor: false,
  windowStyle: 'text',
}

export default function AppAssetDetail() {
  const { navigate } = useContext(NavigationContext)
  const { config, updateConfig } = useContext(ConfigContext)
  const { convertFiat, fiatDecimals, toFiat } = useContext(FiatContext)
  const { assetInfo, setAssetInfo, setRecvInfo, setSendInfo } = useContext(FlowContext)
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
  const [loading, setLoading] = useState(!isBitcoin)
  const [chartWindow, setChartWindow] = useState(CHART_WINDOWS[0].secs)
  const [chartDevOpen, setChartDevOpen] = useState(false)
  const [chartDevOptions, setChartDevOptions] = useState(DEFAULT_CHART_DEV_OPTIONS)

  const cachedEntry = isBitcoin ? undefined : assetMetadataCache.get(assetId)
  const hasIcon = cachedEntry?.hasIcon ?? false

  const fetchDetails = async (forceRefresh = false) => {
    if (isBitcoin || !svcWallet || !assetId) return

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
    if (isBitcoin) {
      setLoading(false)
      return
    }
    setLoading(true)
    fetchDetails().then(() => setLoading(false))
  }, [svcWallet, assetId, isBitcoin])

  const portfolioRow = rows.find((row) => row.assetId === assetId)
  const meta = isBitcoin ? { name: 'Bitcoin', ticker: 'BTC', decimals: 8, icon: undefined } : assetInfo.metadata
  const name = displayAssetName(meta?.ticker, meta?.name, isBitcoin)
  const ticker = isBitcoin ? 'BTC' : (meta?.ticker?.trim().toUpperCase() ?? 'TKN')
  const decimals = isBitcoin ? 8 : (meta?.decimals ?? 8)
  const rawBalance = isBitcoin ? btcBalance : (assetBalances.find((a) => a.assetId === assetId)?.amount ?? 0)
  const unitBalance = centsToUnits(rawBalance, decimals)
  const fiatValue = portfolioRow?.fiatAmount ?? (isBitcoin ? toFiat(rawBalance) : 0)
  const hasFiatValue = isBitcoin || Boolean(portfolioRow?.hasFiatPrice)
  const formattedFiat = hasFiatValue
    ? prettyFiatAmount(fiatValue, config.fiat, {
        maximumFractionDigits: fiatDecimals(),
        minimumFractionDigits: fiatDecimals(),
      })
    : undefined
  const unitPrice =
    unitBalance > 0 && hasFiatValue ? fiatValue / unitBalance : estimateUnitPrice(ticker, toFiat, convertFiat)
  const chartColor = useTokenColor(chartTokenForTicker(ticker))
  const chartTheme = useResolvedChartTheme(config.theme)
  const effectiveChartTheme = chartDevOptions.theme === 'auto' ? chartTheme : chartDevOptions.theme
  const effectiveMomentum =
    chartDevOptions.momentum === 'off' ? false : chartDevOptions.momentum === 'auto' ? true : chartDevOptions.momentum
  const chartData = useMemo(
    () => buildChartData(assetId, unitPrice, chartWindow, ticker),
    [assetId, unitPrice, chartWindow, ticker],
  )
  const canRenderChart = typeof ResizeObserver !== 'undefined'
  const chartDelta = calculateDelta(chartData)
  const tokenLogoTicker = getTokenLogoTicker(ticker)
  const controlAssetId = isBitcoin ? undefined : assetInfo.controlAssetId
  const holdsControlAsset = controlAssetId
    ? assetBalances.some((a) => a.assetId === controlAssetId && a.amount > 0)
    : false
  const isImported = !isBitcoin && config.importedAssets.includes(assetId)
  const canRemove = isImported && rawBalance === 0

  const handleSend = () => {
    hapticLight()
    setSendInfo(isBitcoin ? emptySendInfo : { ...emptySendInfo, assets: [{ assetId, amount: 0 }] })
    navigate(Pages.SendForm)
  }

  const handleReceive = () => {
    hapticLight()
    setRecvInfo(isBitcoin ? emptyRecvInfo : { ...emptyRecvInfo, assetId })
    navigate(Pages.ReceiveQRCode)
  }

  const handleSwap = () => {
    hapticLight()
    navigate(Pages.WalletSwap)
  }

  const handleScan = () => {
    hapticLight()
    setSendInfo(
      isBitcoin ? { ...emptySendInfo, scan: true } : { ...emptySendInfo, scan: true, assets: [{ assetId, amount: 0 }] },
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
              <AssetAction icon={<SendIcon />} label='Send' onClick={handleSend} disabled={rawBalance === 0} />
              <AssetAction icon={<SwapIcon />} label='Swap' onClick={handleSwap} />
              <AssetAction icon={<ScanIcon />} label='Scan' onClick={handleScan} />
            </motion.div>

            <motion.section
              className='asset-detail-chart-section'
              variants={prefersReduced ? undefined : walletLoadInChild}
            >
              {import.meta.env.DEV ? (
                <ChartDevControls
                  isOpen={chartDevOpen}
                  options={chartDevOptions}
                  onOpenChange={setChartDevOpen}
                  onOptionsChange={setChartDevOptions}
                />
              ) : null}
              <div className='asset-detail-chart'>
                {canRenderChart ? (
                  <Liveline
                    data={chartData}
                    value={chartData.at(-1)?.value ?? unitPrice}
                    color={chartColor}
                    theme={effectiveChartTheme}
                    window={chartWindow}
                    windows={chartDevOptions.builtInWindows ? CHART_WINDOWS : undefined}
                    onWindowChange={
                      chartDevOptions.builtInWindows
                        ? (secs) => {
                            hapticSubtle()
                            setChartWindow(secs)
                          }
                        : undefined
                    }
                    windowStyle={chartDevOptions.windowStyle}
                    badge={chartDevOptions.badge}
                    badgeTail={chartDevOptions.badgeTail}
                    badgeVariant={chartDevOptions.badgeVariant}
                    formatValue={(value) => prettyFiatAmount(value, config.fiat)}
                    grid={chartDevOptions.grid}
                    pulse={Boolean(chartDevOptions.pulse && !prefersReduced)}
                    scrub={Boolean(chartDevOptions.scrub && !prefersReduced)}
                    momentum={effectiveMomentum}
                    fill={chartDevOptions.fill}
                    showValue={chartDevOptions.showValue}
                    valueMomentumColor={chartDevOptions.valueMomentumColor}
                    degen={Boolean(chartDevOptions.degen && !prefersReduced)}
                    exaggerate={chartDevOptions.exaggerate}
                    lineWidth={chartDevOptions.lineWidth}
                    padding={{
                      top: chartDevOptions.paddingTop,
                      right: chartDevOptions.badge
                        ? Math.max(chartDevOptions.paddingRight, 88)
                        : chartDevOptions.paddingRight,
                      bottom: chartDevOptions.paddingBottom,
                      left: chartDevOptions.paddingLeft,
                    }}
                    lerpSpeed={prefersReduced ? 1 : chartDevOptions.lerpSpeed}
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
                    {formatAssetAmount(rawBalance, decimals)} {ticker}
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
              <TransactionsList mode='static' assetIdFilter={assetId} />
            </motion.section>

            {!isBitcoin && (hasIcon || holdsControlAsset || rawBalance > 0 || canRemove) ? (
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
                {rawBalance > 0 ? <Button label='Burn' onClick={handleBurn} secondary /> : null}
                {canRemove ? <Button label='Remove' onClick={handleRemove} secondary /> : null}
              </motion.section>
            ) : null}
          </motion.div>
        </Padded>
      </Content>
    </>
  )
}

function ChartDevControls({
  isOpen,
  onOpenChange,
  onOptionsChange,
  options,
}: {
  isOpen: boolean
  onOpenChange: (value: boolean) => void
  onOptionsChange: (value: ChartDevOptions) => void
  options: ChartDevOptions
}) {
  const setBoolean = (key: keyof ChartDevOptions) => (value: boolean) => {
    hapticSubtle()
    onOptionsChange({ ...options, [key]: value })
  }
  const setNumber = (key: keyof ChartDevOptions) => (value: number) => {
    onOptionsChange({ ...options, [key]: value })
  }
  const setSelect =
    <K extends keyof ChartDevOptions>(key: K) =>
    (value: ChartDevOptions[K]) => {
      hapticSubtle()
      onOptionsChange({ ...options, [key]: value })
    }

  return (
    <div className='asset-chart-dev'>
      <button
        type='button'
        className='asset-chart-dev__trigger'
        aria-expanded={isOpen}
        onClick={() => {
          hapticLight()
          onOpenChange(!isOpen)
        }}
      >
        <span>Chart props</span>
        <span>{isOpen ? 'Hide' : 'Show'}</span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            className='asset-chart-dev__panel'
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          >
            <DevToggle label='Badge' checked={options.badge} onChange={setBoolean('badge')} />
            <DevToggle label='Badge tail' checked={options.badgeTail} onChange={setBoolean('badgeTail')} />
            <DevToggle label='Grid' checked={options.grid} onChange={setBoolean('grid')} />
            <DevToggle label='Fill' checked={options.fill} onChange={setBoolean('fill')} />
            <DevToggle label='Pulse' checked={options.pulse} onChange={setBoolean('pulse')} />
            <DevToggle label='Scrub' checked={options.scrub} onChange={setBoolean('scrub')} />
            <DevToggle label='Show value' checked={options.showValue} onChange={setBoolean('showValue')} />
            <DevToggle
              label='Value color'
              checked={options.valueMomentumColor}
              onChange={setBoolean('valueMomentumColor')}
            />
            <DevToggle label='Degen' checked={options.degen} onChange={setBoolean('degen')} />
            <DevToggle label='Exaggerate' checked={options.exaggerate} onChange={setBoolean('exaggerate')} />
            <DevToggle
              label='Built-in ranges'
              checked={options.builtInWindows}
              onChange={setBoolean('builtInWindows')}
            />

            <DevSelect
              label='Momentum'
              value={options.momentum}
              options={['off', 'auto', 'up', 'down', 'flat']}
              onChange={(value) => setSelect('momentum')(value as ChartDevOptions['momentum'])}
            />
            <DevSelect
              label='Badge'
              value={options.badgeVariant}
              options={['minimal', 'default']}
              onChange={(value) => setSelect('badgeVariant')(value as ChartDevOptions['badgeVariant'])}
            />
            <DevSelect
              label='Windows'
              value={options.windowStyle}
              options={['text', 'rounded', 'default']}
              onChange={(value) => setSelect('windowStyle')(value as WindowStyle)}
            />
            <DevSelect
              label='Theme'
              value={options.theme}
              options={['auto', 'light', 'dark']}
              onChange={(value) => setSelect('theme')(value as ChartDevOptions['theme'])}
            />

            <DevRange
              label='Line'
              min={1}
              max={8}
              step={0.5}
              value={options.lineWidth}
              onChange={setNumber('lineWidth')}
            />
            <DevRange
              label='Lerp'
              min={0.02}
              max={0.5}
              step={0.01}
              value={options.lerpSpeed}
              onChange={setNumber('lerpSpeed')}
            />
            <DevRange
              label='Pad top'
              min={0}
              max={80}
              step={1}
              value={options.paddingTop}
              onChange={setNumber('paddingTop')}
            />
            <DevRange
              label='Pad right'
              min={0}
              max={120}
              step={1}
              value={options.paddingRight}
              onChange={setNumber('paddingRight')}
            />
            <DevRange
              label='Pad bottom'
              min={0}
              max={80}
              step={1}
              value={options.paddingBottom}
              onChange={setNumber('paddingBottom')}
            />
            <DevRange
              label='Pad left'
              min={0}
              max={120}
              step={1}
              value={options.paddingLeft}
              onChange={setNumber('paddingLeft')}
            />

            <button
              type='button'
              className='asset-chart-dev__reset'
              onClick={() => {
                hapticLight()
                onOptionsChange(DEFAULT_CHART_DEV_OPTIONS)
              }}
            >
              Reset chart props
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function DevToggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: (value: boolean) => void
}) {
  return (
    <label className='asset-chart-dev-control asset-chart-dev-control--toggle'>
      <span>{label}</span>
      <input type='checkbox' checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} />
    </label>
  )
}

function DevSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string
  onChange: (value: string) => void
  options: string[]
  value: string
}) {
  return (
    <label className='asset-chart-dev-control'>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.currentTarget.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

function DevRange({
  label,
  max,
  min,
  onChange,
  step,
  value,
}: {
  label: string
  max: number
  min: number
  onChange: (value: number) => void
  step: number
  value: number
}) {
  return (
    <label className='asset-chart-dev-control asset-chart-dev-control--range'>
      <span>
        {label}
        <strong>{value}</strong>
      </span>
      <input
        type='range'
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </label>
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

function displayAssetName(ticker: string | undefined, name: string | undefined, isBitcoin: boolean): string {
  const normalizedTicker = ticker?.trim().toUpperCase()
  if (isBitcoin) return 'Bitcoin'
  if (normalizedTicker === 'USDT' || normalizedTicker === 'USDC') return normalizedTicker
  return name ?? 'Asset'
}

function getTokenLogoTicker(ticker: string | undefined): TokenLogoTicker | undefined {
  const normalized = ticker?.trim().toUpperCase()
  if (normalized === 'BTC' || normalized === 'USDT' || normalized === 'USDC') return normalized
}

function chartTokenForTicker(ticker: string): string {
  const normalized = ticker.trim().toUpperCase()
  if (normalized === 'BTC') return '--orange-500'
  if (normalized === 'USDT') return '--green-500'
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

function estimateUnitPrice(
  ticker: string,
  toFiat: (sats?: number) => number,
  convertFiat: (amount: number, from: Fiats) => number,
): number {
  const normalized = ticker.trim().toUpperCase()
  if (normalized === 'BTC') return toFiat(100_000_000)
  if (normalized === 'USDT' || normalized === 'USDC') return convertFiat(1, Fiats.USD)
  return 1
}

function buildChartData(assetId: string, latestValue: number, windowSecs: number, ticker: string): LivelinePoint[] {
  const points = 96
  const now = Math.floor(Date.now() / 1000)
  const step = windowSecs / (points - 1)
  const seed = hashString(`${assetId}-${ticker}-${windowSecs}`)
  const stable = ticker === 'USDT' || ticker === 'USDC'
  const amplitude = stable ? 0.0018 : ticker === 'BTC' ? 0.052 : 0.028
  const drift = stable ? 0.0004 : ((seed % 17) - 8) / 1000

  return Array.from({ length: points }, (_, index) => {
    const progress = index / (points - 1)
    const wave = Math.sin(progress * Math.PI * 3 + seed) * amplitude
    const smallerWave = Math.sin(progress * Math.PI * 11 + seed / 3) * amplitude * 0.32
    const value = latestValue * (1 + wave + smallerWave + drift * (progress - 0.5))
    return {
      time: Math.round(now - windowSecs + step * index),
      value: Math.max(value, latestValue * 0.0001),
    }
  })
}

function calculateDelta(data: LivelinePoint[]): number {
  const first = data[0]?.value ?? 0
  const last = data.at(-1)?.value ?? first
  if (!first) return 0
  return ((last - first) / first) * 100
}

function hashString(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}
