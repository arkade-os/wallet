import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { banco } from '@arkade-os/sdk'
import { ArrowDown, Check, X, Loader2, Copy, ExternalLink, AlertTriangle } from 'lucide-react'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Content from '../../../components/Content'
import Header from '../../../components/Header'
import Padded from '../../../components/Padded'
import Text from '../../../components/Text'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { AspContext } from '../../../providers/asp'
import { WalletContext } from '../../../providers/wallet'
import { BancoContext } from '../../../providers/banco'
import { consoleError } from '../../../lib/logs'
import { extractError } from '../../../lib/error'
import { prettyDate } from '../../../lib/format'
import type { BancoSwap } from '../../../lib/banco'
import { SwapCard } from './SwapCard'
import { getOffchainTxURL } from '../../../lib/explorers'

const INTROSPECTOR_URL = import.meta.env.VITE_INTROSPECTOR_URL
// Polling is now handled globally by BancoProvider

function statusColor(status: BancoSwap['status']): string {
  if (status === 'fulfilled') return '#4ade80'
  if (status === 'cancelled') return '#f87171'
  if (status === 'recoverable') return '#fb923c'
  return '#facc15'
}

function statusBg(status: BancoSwap['status']): string {
  if (status === 'fulfilled') return 'rgba(74, 222, 128, 0.1)'
  if (status === 'cancelled') return 'rgba(248, 113, 113, 0.1)'
  if (status === 'recoverable') return 'rgba(251, 146, 60, 0.1)'
  return 'rgba(250, 204, 21, 0.1)'
}

function StatusIcon({ status }: { status: BancoSwap['status'] }) {
  const color = statusColor(status)
  if (status === 'fulfilled') return <Check size={24} color={color} strokeWidth={3} />
  if (status === 'cancelled') return <X size={24} color={color} strokeWidth={3} />
  if (status === 'recoverable') return <AlertTriangle size={24} color={color} strokeWidth={2} />
  return <Loader2 size={24} color={color} strokeWidth={2} className='spin' />
}

function truncate(s: string, start = 12, end = 8): string {
  if (s.length <= start + end + 3) return s
  return s.slice(0, start) + '…' + s.slice(-end)
}

function formatCountdown(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function CopyableRow({ label, value, href }: { label: string; value: string; href?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  const handleLink = () => {
    if (href) window.open(href, '_blank', 'noreferrer')
  }
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.5rem 0',
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--dark50)' }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--dark70)' }}>
        {truncate(value)}
        <span onClick={handleCopy} style={{ cursor: 'pointer', display: 'flex' }}>
          {copied ? <Check size={12} color='var(--green)' /> : <Copy size={12} color='var(--dark30)' />}
        </span>
        {href ? (
          <span onClick={handleLink} style={{ cursor: 'pointer', display: 'flex' }}>
            <ExternalLink size={12} color='var(--dark30)' />
          </span>
        ) : null}
      </span>
    </div>
  )
}

export default function AppBancoDetail() {
  const { navigate } = useContext(NavigationContext)
  const { aspInfo } = useContext(AspContext)
  const { svcWallet, assetMetadataCache, wallet } = useContext(WalletContext)
  const { swaps, updateSwap, selectedSwapId } = useContext(BancoContext)

  function displayAsset(assetId: string): string {
    if (!assetId) return 'sats'
    const cached = assetMetadataCache.get(assetId)
    return cached?.metadata?.ticker || cached?.metadata?.name || truncate(assetId)
  }

  const swap = swaps.find((s) => s.id === selectedSwapId)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  const tickRef = useRef<ReturnType<typeof setInterval>>()

  // Tick every second for countdown
  useEffect(() => {
    tickRef.current = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(tickRef.current)
  }, [])

  // Polling is handled globally by BancoProvider

  const canCancel = swap && swap.status === 'pending' && swap.cancelAt > 0 && now >= swap.cancelAt
  const cancelCountdown = swap && swap.cancelAt > 0 ? Math.max(0, swap.cancelAt - now) : 0

  const handleCancel = useCallback(async () => {
    if (!swap || !svcWallet || !aspInfo.url || !INTROSPECTOR_URL) return
    setCancelling(true)
    setCancelError('')
    try {
      const serverUrl = aspInfo.url.startsWith('http') ? aspInfo.url : 'http://' + aspInfo.url
      const maker = new banco.Maker(svcWallet, serverUrl, INTROSPECTOR_URL)
      await maker.cancelOffer(swap.offerHex)
      updateSwap(swap.id, { status: 'cancelled' })
    } catch (err) {
      consoleError(err, 'error cancelling banco swap')
      setCancelError(extractError(err))
    } finally {
      setCancelling(false)
    }
  }, [swap, svcWallet, aspInfo.url])

  if (!swap) {
    return (
      <>
        <Header text='Swap Detail' back={() => navigate(Pages.AppBanco)} />
        <Content>
          <Padded>
            <Text>Swap not found</Text>
          </Padded>
        </Content>
      </>
    )
  }

  const isPending = swap.status === 'pending'

  return (
    <>
      <Header text='Swap Detail' back={() => navigate(Pages.AppBanco)} />
      <Content>
        <Padded>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
          >
            {/* Status badge */}
            <SwapCard>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem' }}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: statusBg(swap.status),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <StatusIcon status={swap.status} />
                </motion.div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: statusColor(swap.status) }}>
                    {swap.status.charAt(0).toUpperCase() + swap.status.slice(1)}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--dark50)' }}>
                    {isPending
                      ? 'Waiting for taker to fulfill'
                      : swap.status === 'fulfilled'
                        ? 'Swap completed'
                        : swap.status === 'recoverable'
                          ? 'Funds can be recovered on-chain'
                          : 'Swap cancelled'}
                  </div>
                </div>
              </div>
            </SwapCard>

            {/* Swap amounts — reuse the layered card look */}
            <SwapCard>
              {/* Pay block */}
              <div style={{ background: 'var(--dark10)', borderRadius: '0.75rem', padding: '0.75rem 1rem' }}>
                <div style={{ fontSize: 13, color: 'var(--dark50)', marginBottom: 4 }}>
                  {isPending ? 'You pay' : 'You paid'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--black)' }}>
                    {swap.payAmount.toLocaleString()}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--dark50)' }}>
                    {displayAsset(swap.payAsset)}
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  margin: '-14px 0',
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    border: '4px solid var(--dark05)',
                    background: 'var(--dark10)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ArrowDown size={18} strokeWidth={2.5} color='var(--dark50)' />
                </div>
              </div>

              {/* Receive block */}
              <div style={{ background: 'var(--dark10)', borderRadius: '0.75rem', padding: '0.75rem 1rem' }}>
                <div style={{ fontSize: 13, color: 'var(--dark50)', marginBottom: 4 }}>
                  {isPending ? 'You receive' : 'You received'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span
                    style={{
                      fontSize: 28,
                      fontWeight: 700,
                      color: swap.status === 'fulfilled' ? '#4ade80' : 'var(--black)',
                    }}
                  >
                    {swap.receiveAmount.toLocaleString()}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--dark50)' }}>
                    {displayAsset(swap.receiveAsset)}
                  </span>
                </div>
              </div>

              {/* Info rows */}
              <div style={{ padding: '0.25rem 1rem 0.75rem' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.375rem 0',
                    borderBottom: '1px solid var(--dark10)',
                  }}
                >
                  <span style={{ fontSize: 13, color: 'var(--dark50)' }}>Pair</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--black)' }}>{swap.pair}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.375rem 0',
                    borderBottom: '1px solid var(--dark10)',
                  }}
                >
                  <span style={{ fontSize: 13, color: 'var(--dark50)' }}>Created</span>
                  <span style={{ fontSize: 13, color: 'var(--black)' }}>
                    {prettyDate(Math.floor(swap.createdAt / 1000))}
                  </span>
                </div>
                {isPending && swap.cancelAt > 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.375rem 0' }}>
                    <span style={{ fontSize: 13, color: 'var(--dark50)' }}>Cancel available</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: canCancel ? '#4ade80' : '#facc15' }}>
                      {canCancel ? 'Now' : `in ${formatCountdown(cancelCountdown)}`}
                    </span>
                  </div>
                ) : null}
              </div>
            </SwapCard>

            {/* Transaction details */}
            <SwapCard>
              <div style={{ padding: '0.25rem 1rem' }}>
                <CopyableRow
                  label='Funding tx'
                  value={swap.fundingTxid}
                  href={getOffchainTxURL(swap.fundingTxid, wallet)}
                />
                <div style={{ borderBottom: '1px solid var(--dark10)' }} />
                <CopyableRow label='Swap address' value={swap.swapAddress} />
              </div>
            </SwapCard>

            {cancelError ? (
              <div style={{ background: 'rgba(248, 113, 113, 0.1)', borderRadius: '0.75rem', padding: '0.75rem 1rem' }}>
                <Text smaller color='red'>
                  {cancelError}
                </Text>
              </div>
            ) : null}
          </motion.div>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        {isPending ? (
          canCancel ? (
            <Button label='Cancel Swap' onClick={handleCancel} disabled={cancelling} loading={cancelling} red />
          ) : (
            <Button label={`Cancel Swap (${formatCountdown(cancelCountdown)})`} onClick={() => {}} disabled secondary />
          )
        ) : (
          <Button label='Done' onClick={() => navigate(Pages.AppBanco)} />
        )}
      </ButtonsOnBottom>
      <style>{`.spin { animation: spin 1.5s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
