import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Copy, Nfc, RefreshCw, Share2, TriangleAlert } from 'lucide-react'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import Padded from '../../../components/Padded'
import FlexCol from '../../../components/FlexCol'
import { TextSecondary } from '../../../components/Text'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import ErrorMessage from '../../../components/Error'
import QrCode from '../../../components/QrCode'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { CashContext } from '../../../providers/cash'
import { WalletContext } from '../../../providers/wallet'
import { cashStatusLabel } from '../../../lib/arkadeCashTransfer'
import { nfcSupported, writeCashToNfc } from '../../../lib/arkadeCashNfc'
import { canBrowserShareData, shareData } from '../../../lib/share'
import { useCopyToClipboard } from '../../../hooks/useCopyToClipboard'
import { consoleError } from '../../../lib/logs'
import { extractError } from '../../../lib/error'
import { prettyLongText } from '../../../lib/format'

const STATUS_REFRESH_MS = 12_000
const SHAREABLE_STATUSES = new Set(['available', 'unissued', 'exitable'])
const MONITORED_STATUSES = new Set(['available', 'unissued', 'expired', 'exitable', 'recovering', 'sweep-pending'])
const SELF_CLAIM_STATUSES = new Set(['available', 'expired', 'exitable', 'recovering', 'sweep-pending'])

const pillTone = (status?: string) => {
  if (status === 'claimed' || status === 'exited') return 'done'
  if (status === 'expired') return 'wait'
  if (status === 'recovering' || status === 'sweep-pending' || status === 'unissued') return 'wait'
  return 'live'
}

const stateCopy = (action: 'issued' | 'claimed', status: string | undefined) => {
  if (status === 'claimed') {
    return action === 'claimed'
      ? 'This voucher was claimed into this wallet.'
      : 'This voucher has been claimed and can no longer be shared.'
  }
  if (status === 'recovering') return 'Recovery is in progress. The funds arrive here when it settles.'
  if (status === 'sweep-pending') return 'The claim is settling. Keep this page open while it completes.'
  if (status === 'expired') return 'This voucher is past its active window. Reclaim it to move the funds back.'
  if (status === 'exitable') return 'This voucher is live and can be claimed or reclaimed.'
  if (status === 'exited') return 'This voucher was exited onchain and cannot be shared or claimed offchain.'
  return ''
}

export default function CashDetail() {
  const { voucher: record, pendingToken, clearVoucher, setVoucher } = useContext(CashContext)
  const { refreshCash, cashRecords, claimCash } = useContext(WalletContext)
  const { navigate } = useContext(NavigationContext)
  const copy = useCopyToClipboard()
  const refreshCashRef = useRef(refreshCash)
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>()
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [claiming, setClaiming] = useState(false)

  refreshCashRef.current = refreshCash

  const status = record?.status ?? record?.outcome
  const canShare = Boolean(record?.token) && SHAREABLE_STATUSES.has(status ?? '')
  const canSelfClaim = Boolean(record?.token) && SELF_CLAIM_STATUSES.has(status ?? '')
  const chunks = useMemo(() => (record?.token ? (record.token.match(/.{1,48}/g) ?? []) : []), [record?.token])

  useEffect(() => {
    pendingToken.current = undefined
    return () => {
      clearTimeout(copiedTimer.current)
      clearVoucher()
    }
  }, [])

  useEffect(() => {
    const currentStatus = record?.status ?? record?.outcome
    if (!record?.token || !MONITORED_STATUSES.has(currentStatus ?? '')) return

    let active = true
    let running = false
    const refresh = async () => {
      if (!active || running || document.visibilityState === 'hidden') return
      running = true
      try {
        await refreshCashRef.current?.()
      } catch (err) {
        consoleError(err, 'Failed to refresh voucher status')
      } finally {
        running = false
      }
    }
    const refreshOnFocus = () => void refresh()
    const refreshOnVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }

    void refresh()
    const interval = window.setInterval(refresh, STATUS_REFRESH_MS)
    window.addEventListener('focus', refreshOnFocus)
    document.addEventListener('visibilitychange', refreshOnVisible)
    return () => {
      active = false
      window.clearInterval(interval)
      window.removeEventListener('focus', refreshOnFocus)
      document.removeEventListener('visibilitychange', refreshOnVisible)
    }
  }, [record?.id, record?.status, record?.token, record?.outcome])

  const onCopy = async () => {
    if (!record?.token) return
    setError('')
    try {
      const didCopy = await copy(record.token)
      setCopied(didCopy)
      clearTimeout(copiedTimer.current)
      copiedTimer.current = setTimeout(() => setCopied(false), 1600)
    } catch (err) {
      setError(extractError(err))
    }
  }

  const onRefresh = async () => {
    setError('')
    setRefreshing(true)
    try {
      await refreshCash?.()
    } catch (err) {
      setError(extractError(err))
    } finally {
      setRefreshing(false)
    }
  }

  const onShare = async () => {
    if (!record?.token) return
    setError('')
    try {
      const data = { text: record.token, title: 'Arkade Cash voucher' }
      if (!canBrowserShareData(data)) {
        await onCopy()
        return
      }
      await shareData(data)
    } catch (err) {
      setError(extractError(err))
    }
  }

  const onWriteNfc = async () => {
    if (!record?.token) return
    setError('')
    try {
      await writeCashToNfc(record.token)
    } catch (err) {
      setError(extractError(err))
    }
  }

  const onClaim = async () => {
    if (!record?.token) return
    setError('')
    setClaiming(true)
    try {
      if (!claimCash) throw new Error('Unlock the wallet first')
      const result = await claimCash(record.token)
      setVoucher(result.record.id)
    } catch (err) {
      setError(extractError(err))
    } finally {
      setClaiming(false)
    }
  }

  if (!record && cashRecords?.length === 0)
    return (
      <>
        <Header text='Cash voucher' back={() => navigate(Pages.Cash)} />
        <Content noRefresh>
          <Padded>
            <TextSecondary>Loading voucher…</TextSecondary>
          </Padded>
        </Content>
      </>
    )

  if (!record)
    return (
      <>
        <Header text='Cash voucher' back={() => navigate(Pages.Cash)} />
        <Content noRefresh>
          <Padded>
            <TextSecondary>Voucher not found</TextSecondary>
          </Padded>
        </Content>
      </>
    )

  const claimLabel = status === 'recovering' || status === 'sweep-pending' ? 'Resume claim' : 'Claim to this wallet'
  const showState = !canShare

  return (
    <>
      <Header text='Cash voucher' back={() => navigate(Pages.Cash)} />
      <Content onRefresh={onRefresh}>
        <Padded>
          <FlexCol gap='1.25rem'>
            <div className='voucher-hero'>
              <span className='voucher-amount'>{record.amount.toLocaleString()} sats</span>
              <div className='voucher-status-line'>
                <span className={`voucher-pill voucher-pill--${pillTone(status)}`}>
                  {cashStatusLabel(status, record.action)}
                </span>
                <span>{record.action === 'issued' ? 'You issued this' : 'You claimed this'}</span>
                <button
                  type='button'
                  className='voucher-refresh'
                  aria-label='Refresh status'
                  title='Refresh status'
                  disabled={refreshing}
                  aria-busy={refreshing || undefined}
                  onClick={onRefresh}
                >
                  <RefreshCw size={16} className={refreshing ? 'voucher-refresh--spinning' : ''} />
                </button>
              </div>
            </div>

            {canShare ? (
              <>
                <div className='voucher-code'>
                  <div className='voucher-qr-frame' role='img' aria-label='Voucher QR code'>
                    <QrCode value={record.token!} />
                  </div>
                  <code className='voucher-secret'>{chunks.join('\n')}</code>
                </div>
                <div className='voucher-actions'>
                  <Button
                    secondary
                    icon={<Copy size={16} />}
                    label={copied ? 'Copied' : 'Copy code'}
                    onClick={onCopy}
                  />
                  <Button secondary icon={<Share2 size={16} />} label='Share' onClick={onShare} />
                  {nfcSupported() && (
                    <Button secondary icon={<Nfc size={16} />} label='Write NFC tag' onClick={onWriteNfc} />
                  )}
                </div>
                <p className='voucher-hint'>
                  {status === 'exitable'
                    ? 'The voucher is ready to reclaim, but the code can still be shared.'
                    : status === 'unissued'
                      ? 'Funding is still being confirmed. The code becomes claimable once the voucher is funded.'
                      : 'Anyone who has this code can claim it. Showing it in public is like handing it over.'}
                </p>
              </>
            ) : null}

            {showState ? (
              <div className={`voucher-state voucher-state--${pillTone(status)}`} role='status'>
                {status === 'claimed' || status === 'exited' ? (
                  <CheckCircle2 size={20} aria-hidden='true' />
                ) : (
                  <TriangleAlert size={20} aria-hidden='true' />
                )}
                <div>
                  <strong>{cashStatusLabel(status, record.action)}</strong>
                  <span>{stateCopy(record.action, status)}</span>
                </div>
              </div>
            ) : null}

            <dl className='voucher-meta'>
              <div className='voucher-meta-row'>
                <dt>Voucher ID</dt>
                <dd className='mono'>{prettyLongText(record.id, 8)}</dd>
              </div>
              <div className='voucher-meta-row'>
                <dt>Issued</dt>
                <dd>{new Date(record.createdAt * 1000).toLocaleString()}</dd>
              </div>
              <div className='voucher-meta-row'>
                <dt>Funding</dt>
                <dd className='mono'>
                  {record.issueTxIds.length ? prettyLongText(record.issueTxIds[0], 10) : 'Pending'}
                </dd>
              </div>
              <div className='voucher-meta-row'>
                <dt>Claim</dt>
                <dd className='mono'>{record.claimTxIds.length ? prettyLongText(record.claimTxIds[0], 10) : '—'}</dd>
              </div>
            </dl>

            <ErrorMessage error={!!error} text={error} />
          </FlexCol>
        </Padded>
      </Content>
      {canSelfClaim ? (
        <ButtonsOnBottom>
          <Button label={claimLabel} loading={claiming} onClick={onClaim} />
        </ButtonsOnBottom>
      ) : null}
    </>
  )
}
